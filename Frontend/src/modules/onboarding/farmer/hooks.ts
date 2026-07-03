import { useState, useMemo, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppState, Platform } from "react-native";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from 'expo-image-manipulator';
import { documentDirectory, copyAsync } from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto'; // 🚀 IMPORT CRYPTO FOR UUIDs

import { requestCameraPermission } from "../../../core/permissions";
import { useAuthStore } from "../../../store/authStore";
import { supabase } from "../../../core/supabase"; 
import { uploadFileToCloudinary } from "../services/cloudinaryService";
import { farmerOnboardingSchema, FarmerOnboardingValues } from "./schema";
import { useAlertStore } from "../../../store/alertStore";
import { saveFarmerOnboarding, mapFarmerDbToForm, fetchProfileByMobile } from '../services/onboardingService';
import { useShiftStore } from "../../../store/shiftStore";
import { useDraftStore } from "../../../store/draftStore";

export function useFarmerOnboarding(navigation: any, route: any) {
  const user = useAuthStore((s) => s.user);
  
  const editData = route?.params?.editData;
  const draftData = route?.params?.draftData;
  const draftId = route?.params?.draftId;

  const [step, setStep] = useState(route?.params?.initialStep || 1);
  const [jumpBackTo, setJumpBackTo] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dealers, setDealers] = useState<{label: string, value: string}[]>([]);
  const [uploading, setUploading] = useState<Record<string, boolean>>({}); 
  
  const draftIdRef = useRef<string | undefined>(draftId);
  const showSuccessRef = useRef(showSuccess);

  useEffect(() => { showSuccessRef.current = showSuccess; }, [showSuccess]);

  const defaultValues = editData ? mapFarmerDbToForm(editData) : (draftData || {
    profilePhoto: "",state: "Gujarat", // 🚀 DEFAULT TO GUJARAT
    pincode: "",
    majorCrops: [], soilType: [], waterSource: [], sideTrees: [], cattles: [], irrigationType: [], farmEquipments: [], 
    pastCrops: [{ cropName: '', area: '', areaUnit: 'Acres', inputUsed: [], otherInputUsed: '', yield: '', yieldUnit: 'Kg', problemsFaced: '' }],
    landUnit: 'Acres', irrigatedLandUnit: 'Acres', rainFedLandUnit: 'Acres', agreementAccepted: false
  });

  const form = useForm<FarmerOnboardingValues>({
    resolver: zodResolver(farmerOnboardingSchema),
    defaultValues,
    mode: 'onChange'
  });

  const { watch, reset } = form;
  const values = watch();

  // 🚀 NEW: Auto-Fetch tracking states
  const mobileNumber = watch('mobile');
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [fetchedRecordId, setFetchedRecordId] = useState<string | undefined>(undefined);
  const [isLocked, setIsLocked] = useState(editData?.status === 'SUBMITTED');

  useEffect(() => {
    const fetchExistingProfile = async () => {
      // Do not auto-fetch if we explicitly opened a draft or edit profile from the dashboard
      if (editData || draftData || mobileNumber?.length !== 10) return;

      setIsFetchingProfile(true);
      try {
        const existingProfile = await fetchProfileByMobile('farmer', mobileNumber); 
        
        if (existingProfile) {
          useAlertStore.getState().showAlert("Profile Found", "An existing profile was found and has been loaded.");
          
          if (existingProfile.source === 'draft') {
            reset(existingProfile.data.draft_data);
            draftIdRef.current = existingProfile.data.entity_id;
            setStep(existingProfile.data.current_step || 1);
            setIsLocked(false); // 🚀 Drafts are never locked
          } else {
            const mappedData = mapFarmerDbToForm(existingProfile.data);
            reset(mappedData);
            setFetchedRecordId(existingProfile.data.id);
            // 🚀 LOCK if submitted
            if (existingProfile.data.status === 'SUBMITTED') setIsLocked(true);
          }
        }
      } catch (error) {
        console.error("Failed to check existing profiles:", error);
      } finally {
        setIsFetchingProfile(false);
      }
    };

    // Debounce slightly to ensure they finished typing
    const timeout = setTimeout(fetchExistingProfile, 600);
    return () => clearTimeout(timeout);
  }, [mobileNumber, editData, draftData]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchDealers = async () => {
      const { data } = await supabase.from('dealers').select('id, shop_name, city').eq('se_id', user.id).eq('status', 'SUBMITTED');
      if (data) setDealers(data.map(d => ({ label: `${d.shop_name} (${d.city})`, value: d.id })));
    };
    fetchDealers();
  }, [user?.id]);

  // 🚀 DB CRUD: Direct Save Function (With Draft Auditing & Anti-Duplication)
  const saveDraftToDB = async (isManualSave = false) => {
    if (editData || showSuccessRef.current) return; 
    
    const dirtyKeys = Object.keys(form.formState.dirtyFields);
    
    // 🚀 FIX 1: Absolutely abort if nothing was changed (prevents unmount duplicates)
    if (dirtyKeys.length === 0) return;

    // 🚀 FIX 2: Do not save a DRAFT if they loaded a COMPLETED profile
    if (fetchedRecordId) {
      if (isManualSave) {
        useAlertStore.getState().showAlert("Cannot Save Draft", "This profile is already complete. Click 'Next' to the last step and click 'Save Changes' to update it directly.");
      }
      return;
    }

    const currentValues = form.getValues();
    if (!currentValues || !currentValues.fullName || !currentValues.mobile || !user?.id) return; 

    if (!draftIdRef.current) {
      draftIdRef.current = Crypto.randomUUID(); 
    }

    try {
      const { data: existingDraft } = await supabase.from('drafts').select('update_history').eq('entity_id', draftIdRef.current).maybeSingle();
      const history = existingDraft?.update_history || [];
      
      if (isManualSave && dirtyKeys.length > 0) {
        history.push({ updated_by: user.id, updated_at: new Date().toISOString(), modified_fields: dirtyKeys });
        form.reset(currentValues, { keepValues: true }); 
      }

      const { error } = await supabase.from('drafts').upsert({
        se_id: user.id,
        entity_type: 'farmer',
        entity_id: draftIdRef.current,
        draft_data: currentValues,
        current_step: step,
        update_history: history,
        updated_at: new Date().toISOString()
      }, { onConflict: 'entity_id' });

      if (error) throw error;

      // 🚀 Remove from local offline drafts if sync is successful
      useDraftStore.getState().removeDraft(draftIdRef.current);

    } catch (err) {
      console.log("Failed to sync draft to DB, saving locally", err);
      // 🚀 OFFLINE / CRASH FALLBACK: Save locally with the current step
      const fallbackData = { ...currentValues, _step: step };
      const localDrafts = useDraftStore.getState().drafts;
      
      if (localDrafts.some(d => d.id === draftIdRef.current!)) {
        useDraftStore.getState().updateDraft(draftIdRef.current!, fallbackData);
      } else {
        useDraftStore.getState().addDraft(fallbackData, 'FARMER', draftIdRef.current);
      }
    }
  };

  // 🚀 RESTRICTION CHECK ENGINE
  const checkRestrictions = () => {
    const dirtyKeys = Object.keys(form.formState.dirtyFields);
    // 🚀 FIX: Prevent blocking users if they hit submit without modifying anything
    if (dirtyKeys.length === 0) return { pass: true, error: "", dirtyKeys: [] };

    if ((editData || fetchedRecordId) && isLocked) { 
      const allowedEdits = [
        'mobile', 'alternateMobile', 'totalLand', 'irrigatedLand', 'rainFedLand', 
        'majorCrops', 'soilType', 'otherSoilType', 'waterSource', 'otherWaterSource', 
        'irrigationType', 'farmEquipments', 'otherFarmEquipment', 'biofertilizer', 
        'isIntercropping', 'sideTrees', 'cattles', 'dealerId', 'documents', 'farmerSignature', 'seSignature',
        'landUnit', 'irrigatedLandUnit', 'rainFedLandUnit', 'pastCrops', 'profilePhoto'
      ];
      
      const illegalEdits = dirtyKeys.filter(k => !allowedEdits.includes(k.split('.')[0]));
      
      if (illegalEdits.length > 0) {
        return { pass: false, error: "You are only authorized to edit Mobile, Farm Details, Livestock, and Dealer Linkage for completed profiles.", dirtyKeys: [] };
      }
    }
    return { pass: true, error: "", dirtyKeys };
  };

  // 🚀 DB CRUD: Save & Exit Button
  const saveAndExit = async () => {
    const check = checkRestrictions();
    if (!check.pass) return useAlertStore.getState().showAlert("Cannot Save", check.error);

    // 🚀 Prevent manual draft saving of completed profiles
    if (fetchedRecordId) {
      return useAlertStore.getState().showAlert("Cannot Save Draft", "This profile is already complete. Click 'Next' to the last step and click 'Save Changes' to update it directly.");
    }

    const values = form.getValues();
    if (!values.fullName || !values.mobile) return useAlertStore.getState().showAlert("Cannot Save", "Please enter both the Farmer's Full Name and Mobile Number to save a draft.");

    useAlertStore.getState().showAlert("Saving...", "Syncing draft to database...");
    await saveDraftToDB(true);
    await useShiftStore.getState().incrementActivity(); // 🚀 NEW: Log valid activity!
    // 🚀 FORMAT TIMELINE DESCRIPTION (Route & Village)
    let routeName = "";
    const shiftId = useShiftStore.getState().activeShiftId;
    if (shiftId) {
      const { data: sData } = await supabase.from('shifts').select('assigned_route_id').eq('id', shiftId).single();
      if (sData?.assigned_route_id) {
        const { data: rData } = await supabase.from('routes').select('name').eq('id', sData.assigned_route_id).single();
        if (rData?.name) routeName = rData.name;
      }
    }
    const locName = form.getValues().village || "Unknown Village";
    const eventDesc = routeName ? `${routeName} (${locName})` : locName;
    
    await useShiftStore.getState().logShiftEvent('activity', 'Saved Farmer Draft', eventDesc);
    useAlertStore.getState().hideAlert();
    navigation.navigate("MainTabs");
  };
  
  // 🚀 DB CRUD: Background Auto-Save
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (nextAppState) => {
      if (nextAppState === "inactive" || nextAppState === "background") {
        if (!showSuccessRef.current) await saveDraftToDB(false);
      }
    });
    return () => {
      sub.remove();
      if (!showSuccessRef.current) saveDraftToDB(false); 
    };
  }, [step]);

  const saveDraft = () => saveAndExit();

  const handleUpload = async (key: string) => {
    const perm = await requestCameraPermission();
    if (!perm.granted) return useAlertStore.getState().showAlert("Permission Denied", perm.fallbackMessage);
    
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled) return;

    setUploading(prev => ({ ...prev, [key]: true }));
    try {
      const manipResult = await ImageManipulator.manipulateAsync(result.assets[0].uri, [{ resize: { width: 500 } }], { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG });
      const url = await uploadFileToCloudinary(manipResult.uri, 'image');
      form.setValue(key as any, url, { shouldValidate: true });
    } catch (e) {
      useAlertStore.getState().showAlert("Error", "Photo upload failed.");
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }));
    }
  };

  const validationStatus = useMemo(() => {
    const isStep1Valid = !!(values.fullName && values.fatherName && values.mobile?.length === 10 && values.state && values.city && values.taluka && values.village);
    
    const isStep2Valid = !!(values.totalLand && Array.isArray(values.majorCrops) && values.majorCrops.length > 0 && Array.isArray(values.soilType) && values.soilType.length > 0 && Array.isArray(values.waterSource) && values.waterSource.length > 0) &&
                         !(Array.isArray(values.soilType) && values.soilType.includes('Others') && !values.otherSoilType) &&
                         !(Array.isArray(values.waterSource) && values.waterSource.includes('Others') && !values.otherWaterSource) &&
                         !(Array.isArray(values.farmEquipments) && values.farmEquipments.includes('Others') && !values.otherFarmEquipment);
                         
    // 🚀 CRITICAL FIX: Prepend Array.isArray checks
    const isStep3Valid = Array.isArray(values.pastCrops) && values.pastCrops.every(crop => {
       if (Array.isArray(crop.inputUsed) && crop.inputUsed.includes('Others') && !crop.otherInputUsed) return false;
       return true;
    });
    
    const isStep4Valid = !!(values.agreementAccepted && values.farmerSignature && values.seSignature);
  
    return [
      { isValid: isStep1Valid, name: "Step 1: Personal Details (Check Mobile/Location)" },
      { isValid: isStep2Valid, name: "Step 2: Farm Details (Check 'Others' text)" },
      { isValid: isStep3Valid, name: "Step 3: History & Linking (Check 'Others' text)" },
      { isValid: isStep4Valid, name: "Step 4: Agreement & Signatures" },
    ];
  }, [values]);

  // 🚀 Always allow navigation
  const isNextEnabled = true;

  const generateHTML = () => {
    const data = form.getValues();
    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const unit = data.landUnit || 'Acres'; 

    const renderSignature = (sigData?: string) => {
      if (!sigData) return '<span style="color:red">No Signature</span>';
      try {
        const strokes = JSON.parse(sigData);
        const toPath = (points: any[]) => {
          if (!points || points.length === 0) return '';
          return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p: any) => `L ${p.x} ${p.y}`).join(' ');
        };
        const paths = strokes.map((pts: any[]) => `<path d="${toPath(pts)}" stroke="#16A34A" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round" />`).join('');
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" style="width: 100%; max-width: 250px; height: 80px;">${paths}</svg>`;
      } catch (e) {
        return '<span style="color:red">Invalid Signature Format</span>';
      }
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
          
          @page { margin: 20mm; size: A4; }
          body { font-family: 'Inter', Helvetica, Arial, sans-serif; color: #1E293B; margin: 0; padding: 0; line-height: 1.6; background-color: #FFFFFF; }
          .container { background-color: #FFFFFF; width: 100%; padding: 0; }
          .header { border-bottom: 3px solid #16A34A; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }
          .header h1 { margin: 0; color: #16A34A; font-size: 32px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; }
          .header p { margin: 8px 0 0; color: #64748B; font-size: 15px; }
          .profile-img { width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 3px solid #16A34A; margin-top: 15px; display: inline-block; }
          .section { margin-bottom: 35px; }
          .page-break { page-break-before: always; }
          .section-title { font-size: 18px; color: #16A34A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 20px; text-transform: uppercase; font-weight: 800; }
          table { width: 100%; border-collapse: collapse; font-size: 14px; background-color: #FFFFFF; }
          table, tr, td, th { page-break-inside: avoid; } 
          th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #E2E8F0; vertical-align: top; }
          th { width: 35%; color: #475569; font-weight: 600; background-color: #F1F5F9; border-right: 1px solid #E2E8F0; }
          td { color: #0F172A; font-weight: 500; }
          tr:last-child th, tr:last-child td { border-bottom: none; }
          .table-wrapper { border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; margin-bottom: 15px; }
          .sub-heading { font-size: 15px; font-weight: 700; color: #334155; margin: 20px 0 10px 0; border-left: 4px solid #16A34A; padding-left: 10px; }
          .grid-2 { display: table; width: 100%; table-layout: fixed; margin-bottom: 15px; }
          .grid-col { display: table-cell; width: 50%; padding-right: 10px; vertical-align: top; }
          .grid-col:last-child { padding-right: 0; padding-left: 10px; }
          .list { margin: 0; padding-left: 20px; font-size: 14px; }
          .list li { margin-bottom: 6px; color: #334155; }
          .pill { display: inline-block; background-color: #E2E8F0; color: #334155; padding: 4px 10px; border-radius: 15px; font-size: 12px; font-weight: 600; margin: 2px 4px 2px 0; }
          .signatures { display: table; width: 100%; margin-top: 50px; page-break-inside: avoid; }
          .sig-box { display: table-cell; width: 50%; text-align: center; }
          .sig-line { border-top: 2px solid #94A3B8; margin: 10px 60px 0; padding-top: 8px; font-weight: 800; color: #1E293B; font-size: 14px; text-transform: uppercase; }
          .empty-text { color: #94A3B8; font-style: italic; font-weight: 400; }
          .success-badge { color: #166534; font-weight: 800; font-size: 13px; }
          .danger-badge { color: #DC2626; font-weight: 800; font-size: 13px; }
          .action-link { color: #2563EB; text-decoration: none; font-weight: 700; border-bottom: 1px dashed #2563EB; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Farmer Dossier</h1>
            <p>Enrolled on ${dateStr} • Added by ${user?.name || 'Sales Executive'}</p>
            ${data.profilePhoto ? `<img src="${data.profilePhoto}" class="profile-img" />` : ''}
          </div>

          <div class="section">
            <div class="section-title">1. Personal Details</div>
            <div class="table-wrapper">
              <table>
                <tr><th>Full Name</th><td>${data.fullName || '<span class="empty-text">N/A</span>'}</td></tr>
                <tr><th>Father's Name</th><td>${data.fatherName || '-'}</td></tr>
                <tr><th>Mobile</th><td>${data.mobile ? `<span class="action-link">+91 ${data.mobile}</span>` : '-'}</td></tr>
                <tr><th>Location</th><td>${data.village || '-'}, ${data.taluka || '-'}, ${data.state || '-'}</td></tr>
              </table>
            </div>
          </div>

          <div class="section">
            <div class="section-title">2. Farm Details</div>
            <div class="table-wrapper">
              <table>
                <tr><th>Total Land</th><td>${data.totalLand || '0'} ${data.landUnit || 'Acres'}</td></tr>
                <tr><th>Irrigated Land</th><td>${data.irrigatedLand || '0'} ${data.irrigatedLandUnit || 'Acres'}</td></tr>
                <tr><th>Rain-Fed Land</th><td>${data.rainFedLand || '0'} ${data.rainFedLandUnit || 'Acres'}</td></tr>
                <tr><th>Major Crops</th><td>${data.majorCrops?.join(', ') || '-'}</td></tr>
                <tr><th>Soil Type</th><td>${data.soilType?.map(s => s === 'Others' ? data.otherSoilType : s).join(', ') || '-'}</td></tr>
                <tr><th>Water Source</th><td>${data.waterSource?.map(w => w === 'Others' ? data.otherWaterSource : w).join(', ') || '-'}</td></tr>
                <tr><th>Irrigation Types</th><td>${data.irrigationType?.join(', ') || '-'}</td></tr>
                <tr><th>Farm Equipments</th><td>${data.farmEquipments?.map(e => e === 'Others' ? data.otherFarmEquipment : e).join(', ') || '-'}</td></tr>
                <tr><th>Biofertilizer</th><td>${data.biofertilizer || '-'}</td></tr>
              </table>
            </div>
          </div>

          <div class="section page-break">
            <div class="section-title">3. History of Cultivation</div>
            <div class="table-wrapper">
              <table>
                <tr style="background-color: #F1F5F9; font-weight: 600; color: #475569;">
                  <td style="padding: 10px 16px;">Crop Name</td>
                  <td>Area</td>
                  <td>Inputs Used</td>
                  <td>Yield</td>
                  <td>Problems Faced</td>
                </tr>
                ${data.pastCrops?.map(c => `<tr>
                  <td><strong>${c.cropName || '-'}</strong></td>
                  <td>${c.area ? `${c.area} ${c.areaUnit || ''}` : '-'}</td>
                  <td>${(c.inputUsed || []).map(i => i === 'Others' ? c.otherInputUsed : i).join(', ') || '-'}</td>
                  <td>${c.yield ? `${c.yield} ${c.yieldUnit || ''}` : '-'}</td>
                  <td>${c.problemsFaced || '-'}</td>
                </tr>`).join('') || '<tr><td colspan="5" class="empty-text">No history recorded</td></tr>'}
              </table>
            </div>
          </div>

          <div class="signatures">
            <div class="sig-box">
              ${renderSignature(data.farmerSignature)}
              <div class="sig-line">Farmer Signature</div>
            </div>
            <div class="sig-box">
              ${renderSignature(data.seSignature)}
              <div class="sig-line">Sales Executive Signature</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const generatePDF = async () => {
    const html = generateHTML();
    const rawName = form.getValues('fullName') ? form.getValues('fullName').replace(/[^a-zA-Z0-9]/g, '_') : 'Farmer';
    const finalFileName = `${rawName}_Dossier.pdf`;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (Platform.OS !== 'web') {
        const renamedUri = `${documentDirectory}${finalFileName}`;
        await copyAsync({ from: uri, to: renamedUri });
        await Sharing.shareAsync(renamedUri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: 'Share PDF' });
      } else {
        await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: 'Share PDF' });
      }
    } catch (error) {
      useAlertStore.getState().showAlert("Error", "Could not generate or share the PDF file.");
    }
  };

  // 🚀 HARD LOCK REFERENCE TO PREVENT DOUBLE TAPS
  const submitLockedRef = useRef(false);

  const submit = async () => {
    if (submitLockedRef.current) return; // Prevent double trigger
    
    const missingSteps = validationStatus.filter(v => !v.isValid).map(v => v.name);
    if (missingSteps.length > 0) {
      useAlertStore.getState().showAlert("Missing Information", "Please complete the following sections before submitting:\n\n• " + missingSteps.join("\n• "));
      return; 
    }

    await form.handleSubmit(async (data) => {
      if (!user?.id) return useAlertStore.getState().showAlert("Error", "User session not found.");
      
      const check = checkRestrictions();
      if (!check.pass) return useAlertStore.getState().showAlert("Restricted Action", check.error);

      if (submitLockedRef.current) return; // Secondary guard
      submitLockedRef.current = true;
      setIsSubmitting(true);

      try {
        // 🚀 1. GENERATE PDF FIRST
        useAlertStore.getState().showAlert("Processing", "Generating and securing PDF dossier...");
        const html = generateHTML();
        const { uri } = await Print.printToFileAsync({ html });
        const pdfUrl = await uploadFileToCloudinary(uri, 'raw');

        // 🚀 2. SAVE TO DATABASE ATOMICALLY (Passing PDF URL)
        useAlertStore.getState().showAlert("Saving", "Uploading complete profile to database...");
        const result = await saveFarmerOnboarding(data, user.id, editData?.id || fetchedRecordId, check.dirtyKeys, pdfUrl);
        
        await useShiftStore.getState().incrementActivity(); // 🚀 NEW: Log valid activity!
        // 🚀 FORMAT TIMELINE DESCRIPTION (Route & Village)
        let routeName = "";
        const shiftId = useShiftStore.getState().activeShiftId;
        if (shiftId) {
          const { data: sData } = await supabase.from('shifts').select('assigned_route_id').eq('id', shiftId).single();
          if (sData?.assigned_route_id) {
            const { data: rData } = await supabase.from('routes').select('name').eq('id', sData.assigned_route_id).single();
            if (rData?.name) routeName = rData.name;
          }
        }
        const locName = data.village || "Unknown Village";
        const eventDesc = routeName ? `${routeName} (${locName})` : locName;

        await useShiftStore.getState().logShiftEvent('activity', (editData || fetchedRecordId) ? 'Updated Farmer' : 'Enrolled Farmer', eventDesc);
        
        // 🚀 3. DELETE DRAFT IF EXISTS
        if (draftIdRef.current) {
           await supabase.from('drafts').delete().eq('entity_id', draftIdRef.current);
           draftIdRef.current = undefined; 
        }
        
        showSuccessRef.current = true;
        useAlertStore.getState().hideAlert();
        setShowSuccess(true);
      } catch (error: any) {
        console.error("Submission Error:", error);
        useAlertStore.getState().showAlert("Submission Failed", error.message || "An error occurred during submission. Please check your connection and try again.");
      } finally {
        // Release locks
        submitLockedRef.current = false;
        setIsSubmitting(false);
      }
    })();
  };

  return { form, step, setStep, jumpBackTo, setJumpBackTo,saveAndExit, saveDraft, submit, isSubmitting, isNextEnabled, showSuccess, setShowSuccess, dealers, generatePDF, uploading, handleUpload, isEditing: !!editData, isLocked };
}