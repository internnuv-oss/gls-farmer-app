import { useState, useMemo, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppState, Platform } from "react-native";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from 'expo-image-manipulator';
import { documentDirectory, copyAsync } from 'expo-file-system/legacy';

import { requestCameraPermission } from "../../../core/permissions";
import { useAuthStore } from "../../../store/authStore";
import { useDraftStore } from "../../../store/draftStore";
import { supabase } from "../../../core/supabase"; 
import { uploadFileToCloudinary } from "../services/cloudinaryService";
import { farmerOnboardingSchema, FarmerOnboardingValues } from "./schema";
import { useAlertStore } from "../../../store/alertStore";

const PREDEFINED_SOILS = ["Black", "Sandy", "Red", "Loamy"];
const PREDEFINED_WATER = ["Canal", "Borewell", "Rain", "Tube-well" ,"Well", "Tank", "Pond","River"];
const PREDEFINED_EQUIPMENTS = ["Mini Tractor", "Tractor", "Cultivation Equipments"];
// 🚀 NEW CONSTANT for mapping existing data to the dropdown
const PREDEFINED_INPUTS = ["DAP", "Urea", "NPK", "SSP", "MOP", "Compost", "Others"];

export function mapFarmerDbToForm(db: any): FarmerOnboardingValues {
  const dbSoil = db.farm_details?.soilType || [];
  const knownSoil = dbSoil.filter((s: string) => PREDEFINED_SOILS.includes(s));
  const otherSoil = dbSoil.find((s: string) => !PREDEFINED_SOILS.includes(s));
  if (otherSoil) knownSoil.push("Others");

  const dbWater = db.farm_details?.waterSource || [];
  const knownWater = dbWater.filter((w: string) => PREDEFINED_WATER.includes(w));
  const otherWater = dbWater.find((w: string) => !PREDEFINED_WATER.includes(w));
  if (otherWater) knownWater.push("Others");

  const dbEquip = db.farm_details?.farmEquipments || [];
  const knownEquip = dbEquip.filter((e: string) => PREDEFINED_EQUIPMENTS.includes(e));
  const otherEquip = dbEquip.find((e: string) => !PREDEFINED_EQUIPMENTS.includes(e));
  if (otherEquip) knownEquip.push("Others");

  return {
    profilePhoto: db.personal_details?.profilePhoto || "", 
    fullName: db.full_name || "",
    fatherName: db.personal_details?.fatherName || "",
    mobile: db.mobile || "",
    alternateMobile: db.personal_details?.alternateMobile || "",
    state: db.personal_details?.state || "",
    city: db.personal_details?.city || "",
    taluka: db.personal_details?.taluka || "",
    village: db.village || "",
    totalLand: db.farm_details?.totalLand || "",
    irrigatedLand: db.farm_details?.irrigatedLand || "",
    rainFedLand: db.farm_details?.rainFedLand || "",
    majorCrops: db.farm_details?.majorCrops || [],
    soilType: knownSoil,
    otherSoilType: otherSoil || "",
    waterSource: knownWater,
    otherWaterSource: otherWater || "",
    landUnit: db.farm_details?.landUnit || "Acres",
    irrigationType: Array.isArray(db.farm_details?.irrigationType) ? db.farm_details.irrigationType : [],
    farmEquipments: knownEquip,
    otherFarmEquipment: otherEquip || "",
    biofertilizer: db.farm_details?.biofertilizer || "",
    isIntercropping: db.farm_details?.isIntercropping || undefined,
    sideTrees: db.farm_details?.sideTrees || [],
    cattles: db.farm_details?.cattles || [],
    
    // 🚀 NEW MAPPING: Past Crops logic for Inputs & Units
    pastCrops: (db.history_details?.pastCrops || []).length > 0 
      ? db.history_details.pastCrops.map((c: any) => {
          const isKnownInput = PREDEFINED_INPUTS.includes(c.inputUsed);
          return {
            ...c,
            inputUsed: isKnownInput ? c.inputUsed : (c.inputUsed ? "Others" : ""),
            otherInputUsed: !isKnownInput && c.inputUsed ? c.inputUsed : "",
            yieldUnit: c.yieldUnit || "Quintals"
          };
        })
      : [{ cropName: '', area: '', areaUnit: 'Acres', inputUsed: '', otherInputUsed: '', yield: '', yieldUnit: 'Quintals', problemsFaced: '' }],
    
    dealerId: db.dealer_id || "", 
    agreementAccepted: true,
    farmerSignature: db.farmer_signature || "",
    seSignature: db.se_signature || ""
  };
}

export function useFarmerOnboarding(navigation: any, route: any) {
  const user = useAuthStore((s) => s.user);
  const { addDraft, updateDraft, removeDraft } = useDraftStore();
  
  const editData = route?.params?.editData;
  const draftData = route?.params?.draftData;
  const draftId = route?.params?.draftId;

  const [step, setStep] = useState(1);
  const [jumpBackTo, setJumpBackTo] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dealers, setDealers] = useState<{label: string, value: string}[]>([]);
  const [uploading, setUploading] = useState<Record<string, boolean>>({}); 
  
  const draftIdRef = useRef<string | undefined>(draftId);
  const showSuccessRef = useRef(false);

  useEffect(() => { showSuccessRef.current = showSuccess; }, [showSuccess]);

  const defaultValues = editData ? mapFarmerDbToForm(editData) : (draftData || {
    profilePhoto: "",
    majorCrops: [], soilType: [], waterSource: [], sideTrees: [], cattles: [], irrigationType: [], farmEquipments: [], 
    pastCrops: [{ cropName: '', area: '', areaUnit: 'Acres', inputUsed: '', otherInputUsed: '', yield: '', yieldUnit: 'Quintals', problemsFaced: '' }],
    landUnit: 'Acres', agreementAccepted: false
  });

  const form = useForm<FarmerOnboardingValues>({
    resolver: zodResolver(farmerOnboardingSchema),
    defaultValues,
    mode: 'onChange'
  });

  const { watch } = form;
  const values = watch();

  useEffect(() => {
    if (!user?.id) return;
    const fetchDealers = async () => {
      const { data } = await supabase.from('dealers').select('id, shop_name, city').eq('se_id', user.id).eq('status', 'SUBMITTED');
      if (data) setDealers(data.map(d => ({ label: `${d.shop_name} (${d.city})`, value: d.id })));
    };
    fetchDealers();
  }, [user?.id]);

  const autoSave = () => {
    if (editData) return; 
    const currentValues = form.getValues();
    if (!currentValues || !currentValues.fullName) return; 
    if (draftIdRef.current) updateDraft(draftIdRef.current, currentValues);
    else draftIdRef.current = addDraft(currentValues, 'FARMER'); 
  };

  useEffect(() => {
    const sub = AppState.addEventListener("change", state => { if (state === "inactive" || state === "background") { if (!showSuccessRef.current) autoSave(); } });
    return () => { sub.remove(); if (!showSuccessRef.current) autoSave(); };
  }, []);

  const saveDraft = () => { autoSave(); useAlertStore.getState().showAlert("Saved", "Farmer onboarding saved as draft."); navigation.goBack(); };

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

  const isNextEnabled = useMemo(() => {
    if (step === 1) return !!(values.fullName && values.fatherName && values.mobile?.length === 10 && values.state && values.city && values.taluka && values.village);
    if (step === 2) {
        const baseValid = !!(values.totalLand && values.majorCrops?.length > 0 && values.soilType?.length > 0 && values.waterSource?.length > 0);
        if (values.soilType?.includes('Others') && !values.otherSoilType) return false;
        if (values.waterSource?.includes('Others') && !values.otherWaterSource) return false;
        if (values.farmEquipments?.includes('Others') && !values.otherFarmEquipment) return false;
        return baseValid;
    }
    if (step === 3) return true; 
    if (step === 4) return !!(values.agreementAccepted && values.farmerSignature && values.seSignature);
    if (step === 5) return true; 
    return true; 
  }, [step, values]);

  const generateHTML = () => {
    const data = form.getValues();
    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const unit = data.landUnit || 'Acres'; 

    const renderSignature = (sigData?: string) => {
      if (!sigData) return '<span style="color:red">No Signature</span>';
      try {
        const strokes = JSON.parse(sigData);
        const toPath = (points: any[]) => `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p: any) => `L ${p.x} ${p.y}`).join(' ');
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
          body { font-family: 'Inter', Helvetica, Arial, sans-serif; color: #1E293B; margin: 0; padding: 0; line-height: 1.6; }
          .header { border-bottom: 3px solid #16A34A; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
          .header-text h1 { margin: 0; color: #16A34A; font-size: 32px; text-transform: uppercase; font-weight: 800; }
          .profile-img { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #16A34A; }
          .section-title { font-size: 18px; color: #16A34A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 20px; text-transform: uppercase; font-weight: 800; }
          table { width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #E2E8F0; }
          th { width: 35%; background-color: #F8FAFC; font-weight: 600; }
          .signatures { display: table; width: 100%; margin-top: 50px; page-break-inside: avoid; }
          .sig-box { display: table-cell; width: 50%; text-align: center; }
          .sig-line { border-top: 2px solid #94A3B8; margin: 10px 60px 0; padding-top: 8px; font-weight: 800; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-text">
            <h1>Farmer Dossier</h1>
            <p>Enrolled on ${dateStr} • Added by ${user?.name || 'SE'}</p>
          </div>
          ${data.profilePhoto ? `<img src="${data.profilePhoto}" class="profile-img" />` : ''}
        </div>
        <div class="section-title">1. Personal Details</div>
        <table>
          <tr><th>Full Name</th><td>${data.fullName || '-'}</td></tr>
          <tr><th>Father's Name</th><td>${data.fatherName || '-'}</td></tr>
          <tr><th>Mobile</th><td>+91 ${data.mobile || '-'}</td></tr>
          <tr><th>Location</th><td>${data.village}, ${data.taluka}, ${data.state}</td></tr>
        </table>
        <div class="section-title">2. Farm Details</div>
        <table>
          <tr><th>Total Land</th><td>${data.totalLand || '0'} ${unit}</td></tr>
          <tr><th>Irrigated Land</th><td>${data.irrigatedLand || '0'} ${unit}</td></tr>
          <tr><th>Rain-Fed Land</th><td>${data.rainFedLand || '0'} ${unit}</td></tr>
          <tr><th>Major Crops</th><td>${data.majorCrops?.join(', ') || '-'}</td></tr>
          <tr><th>Soil Type</th><td>${data.soilType?.map(s => s === 'Others' ? data.otherSoilType : s).join(', ') || '-'}</td></tr>
          <tr><th>Water Source</th><td>${data.waterSource?.map(w => w === 'Others' ? data.otherWaterSource : w).join(', ') || '-'}</td></tr>
          <tr><th>Irrigation Types</th><td>${data.irrigationType?.join(', ') || '-'}</td></tr>
          <tr><th>Farm Equipments</th><td>${data.farmEquipments?.map(e => e === 'Others' ? data.otherFarmEquipment : e).join(', ') || '-'}</td></tr>
          <tr><th>Biofertilizer</th><td>${data.biofertilizer || '-'}</td></tr>
        </table>

        <div class="section-title">3. History of Cultivation</div>
        <table>
          <tr style="background-color: #F8FAFC; font-weight: 600;"><td>Crop Name</td><td>Area</td><td>Input Used</td><td>Yield</td><td>Problems Faced</td></tr>
          ${data.pastCrops?.map(c => `<tr>
            <td>${c.cropName || '-'}</td>
            <td>${c.area ? `${c.area} ${c.areaUnit || ''}` : '-'}</td>
            <td>${c.inputUsed === 'Others' ? c.otherInputUsed : c.inputUsed || '-'}</td>
            <td>${c.yield ? `${c.yield} ${c.yieldUnit || ''}` : '-'}</td>
            <td>${c.problemsFaced || '-'}</td>
          </tr>`).join('') || '<tr><td colspan="5">No history recorded</td></tr>'}
        </table>

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

  const submit = form.handleSubmit(async (data) => {
    if (!user?.id) return useAlertStore.getState().showAlert("Error", "User session not found.");
    setIsSubmitting(true);
    
    try {
      // 🚀 Format pastCrops to combine "Others" back into the main inputUsed string
      const formattedPastCrops = (data.pastCrops || []).map(c => ({
        cropName: c.cropName,
        area: c.area,
        areaUnit: c.areaUnit,
        inputUsed: c.inputUsed === 'Others' ? c.otherInputUsed : c.inputUsed,
        yield: c.yield,
        yieldUnit: c.yieldUnit,
        problemsFaced: c.problemsFaced
      }));

      const dbPayload = {
        se_id: user.id,
        dealer_id: data.dealerId || null, 
        full_name: data.fullName,
        mobile: data.mobile,
        village: data.village,
        personal_details: { 
          profilePhoto: data.profilePhoto, 
          fatherName: data.fatherName, 
          alternateMobile: data.alternateMobile, 
          state: data.state, 
          city: data.city, 
          taluka: data.taluka 
        },
        farm_details: { 
          totalLand: data.totalLand, 
          irrigatedLand: data.irrigatedLand, 
          rainFedLand: data.rainFedLand, 
          majorCrops: data.majorCrops, 
          soilType: data.soilType.map(st => st === 'Others' ? data.otherSoilType : st), 
          waterSource: data.waterSource.map(ws => ws === 'Others' ? data.otherWaterSource : ws),
          landUnit: data.landUnit || 'Acres', 
          irrigationType: data.irrigationType || [], 
          farmEquipments: (data.farmEquipments || []).map(e => e === 'Others' ? data.otherFarmEquipment : e),
          biofertilizer: data.biofertilizer,
          isIntercropping: data.isIntercropping, 
          sideTrees: data.sideTrees, 
          cattles: data.cattles 
        },
        history_details: { pastCrops: formattedPastCrops }, // 🚀 Save formatted array
        farmer_signature: data.farmerSignature,
        se_signature: data.seSignature,
        status: 'SUBMITTED',
        updated_at: new Date().toISOString()
      };

      let insertedId = editData?.id;

      if (editData?.id) {
        const { error } = await supabase.from('farmers').update(dbPayload).eq('id', editData.id);
        if (error) throw error;
      } else {
        const { data: result, error } = await supabase.from('farmers').insert([dbPayload]).select('id').single();
        if (error) throw error;
        insertedId = result.id;
      }
      
      const html = generateHTML();
      const { uri } = await Print.printToFileAsync({ html });
      const pdfUrl = await uploadFileToCloudinary(uri, 'raw');
      
      await supabase.from('farmers').update({ pdf_url: pdfUrl }).eq('id', insertedId);

      if (draftIdRef.current) removeDraft(draftIdRef.current);
      setShowSuccess(true);
    } catch (error: any) {
      useAlertStore.getState().showAlert("Submission Failed", error.message);
    } finally {
      setIsSubmitting(false);
    }
  });

  return { form, step, setStep, jumpBackTo, setJumpBackTo, saveDraft, submit, isSubmitting, isNextEnabled, showSuccess, setShowSuccess, dealers, generatePDF, uploading, handleUpload, isEditing: !!editData };
}