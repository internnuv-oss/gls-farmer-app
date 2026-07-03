// Frontend/src/modules/onboarding/fpo/hooks.ts
import { useState, useMemo, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppState, Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location'; 
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { documentDirectory, copyAsync } from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';

import { requestMediaPermission, requestCameraPermission } from "../../../core/permissions";
import { useAuthStore } from "../../../store/authStore";
import { uploadFileToCloudinary } from "../services/cloudinaryService";
import { supabase } from "../../../core/supabase";
import { useAlertStore } from "../../../store/alertStore";
import { fpoOnboardingSchema, FPOOnboardingValues, FPO_GLS_COMMITMENTS } from "./schema";
import { fetchProfileByMobile, saveFPOOnboarding, updateFPOPdfUrl, mapFPODbToForm } from '../services/onboardingService';
import { useShiftStore } from "../../../store/shiftStore";
import { useDraftStore } from "../../../store/draftStore";

export function useFPOOnboarding(navigation: any, route: any) {
  const user = useAuthStore((s) => s.user);
  
  const editData = route?.params?.editData;
  const draftData = route?.params?.draftData;
  const draftId = route?.params?.draftId;

  const [step, setStep] = useState(route?.params?.initialStep || 1);
  const [jumpBackTo, setJumpBackTo] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  
  const draftIdRef = useRef<string | undefined>(draftId);
  const showSuccessRef = useRef(false);

  useEffect(() => { showSuccessRef.current = showSuccess; }, [showSuccess]);

  const defaultValues = editData ? mapFPODbToForm(editData) : (draftData || {
    fpoName: '', registrationNumber: '', incorporationYear: '', address: '', state: '', city: '', taluka: '', pincode: '', commandArea: '',
    ceoName: '', bodPresidentName: '', contactMobile: '', email: '', gstNumber: '', panNumber: '', promotingAgency: '',
    bankAccounts: [{ isActive: true, accountName: '', accountNumber: '', bankIfsc: '', bankNameBranch: '' }],
    scoreMemberBase: 5, scoreFinancial: 5, scoreGovernance: 5, scoreInfra: 5, scoreDistribution: 5, scoreAggregation: 5, scoreBiologicals: 5, scoreExtension: 5, scoreDigital: 5, scoreAlignment: 5,
    allottedTerritories: [{ district: '', taluka: '', villages: [] }], expectedOfftake: '', currentSuppliers: [], partnershipTier: '', demoFarmersCommitment: '',
    totalMembers: '', activeMembers: '', majorCrops: [{ name: '', acreage: '' }],
    glsCommitments: [], complianceChecklist: [], documents: {}, storageLocations: {},
    agreementAccepted: false, fpoSignature: '', seSignature: ''
  });

  const form = useForm<FPOOnboardingValues>({
    resolver: zodResolver(fpoOnboardingSchema),
    defaultValues: defaultValues as FPOOnboardingValues,
    mode: 'onChange'
  });

  const { watch, reset, setValue } = form;
  const values = watch();

  const mobileNumber = watch('contactMobile');
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [fetchedRecordId, setFetchedRecordId] = useState<string | undefined>(undefined);
  const [isLocked, setIsLocked] = useState(editData?.status === 'SUBMITTED');

  useEffect(() => {
    const fetchExistingProfile = async () => {
      if (editData || draftData || mobileNumber?.length !== 10) return;
      setIsFetchingProfile(true);
      try {
        const existingProfile = await fetchProfileByMobile('fpo', mobileNumber); 
        if (existingProfile) {
          useAlertStore.getState().showAlert("Profile Found", "An existing profile was found and has been loaded.");
          if (existingProfile.source === 'draft') {
            reset(existingProfile.data.draft_data);
            draftIdRef.current = existingProfile.data.entity_id;
            setStep(existingProfile.data.current_step || 1);
            setIsLocked(false);
          } else {
            const mappedData = mapFPODbToForm(existingProfile.data);
            reset(mappedData);
            setFetchedRecordId(existingProfile.data.id);
            if (existingProfile.data.status === 'SUBMITTED') setIsLocked(true);
          }
        }
      } catch (error) {
        console.error("Failed to check existing profiles:", error);
      } finally {
        setIsFetchingProfile(false);
      }
    };
    const timeout = setTimeout(fetchExistingProfile, 600);
    return () => clearTimeout(timeout);
  }, [mobileNumber, editData, draftData]);

  const scoreData = useMemo(() => {
    const raw = (values.scoreMemberBase||5) + (values.scoreFinancial||5) + (values.scoreGovernance||5) + (values.scoreInfra||5) + (values.scoreDistribution||5) + (values.scoreAggregation||5) + (values.scoreBiologicals||5) + (values.scoreExtension||5) + (values.scoreDigital||5) + (values.scoreAlignment||5);
    let band = 'Red (Stop)';
    if (raw >= 75) band = 'Green (Proceed)';
    else if (raw >= 60) band = 'Yellow (Conditional)';
    return { raw, band };
  }, [values]);

  const saveDraftToDB = async (isManualSave = false) => {
    if (editData || showSuccessRef.current) return; 
    const dirtyKeys = Object.keys(form.formState.dirtyFields);
    if (dirtyKeys.length === 0) return;

    if (fetchedRecordId) {
      if (isManualSave) useAlertStore.getState().showAlert("Cannot Save Draft", "This profile is already complete. Click 'Next' to the last step and click 'Save Changes' to update it directly.");
      return;
    }

    const currentValues = form.getValues();
    if (!currentValues || !currentValues.fpoName || !currentValues.contactMobile || !user?.id) return; 

    if (!draftIdRef.current) draftIdRef.current = Crypto.randomUUID(); 

    try {
      const { data: existingDraft } = await supabase.from('drafts').select('update_history').eq('entity_id', draftIdRef.current).maybeSingle();
      const history = existingDraft?.update_history || [];
      
      if (isManualSave && dirtyKeys.length > 0) {
        history.push({ updated_by: user.id, updated_at: new Date().toISOString(), modified_fields: dirtyKeys });
        form.reset(currentValues, { keepValues: true }); 
      }

      const { error } = await supabase.from('drafts').upsert({
        se_id: user.id,
        entity_type: 'fpo',
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
        useDraftStore.getState().addDraft(fallbackData, 'FPO', draftIdRef.current);
      }
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      if (nextAppState === "inactive" || nextAppState === "background") {
        if (!showSuccessRef.current) await saveDraftToDB(false);
      }
    });
    return () => { subscription.remove(); if (!showSuccessRef.current) saveDraftToDB(false); };
  }, [step]);

  const checkRestrictions = () => {
    const dirtyKeys = Object.keys(form.formState.dirtyFields);
    if (dirtyKeys.length === 0) return { pass: true, error: "", dirtyKeys: [] };

    if ((editData || fetchedRecordId) && isLocked) { 
      const allowedEdits = [
        'ceoName', 'bodPresidentName', 'contactMobile', 'email', 'bankAccounts',
        'scoreMemberBase', 'scoreFinancial', 'scoreGovernance', 'scoreInfra', 'scoreDistribution', 'scoreAggregation', 'scoreBiologicals', 'scoreExtension', 'scoreDigital', 'scoreAlignment',
        'remMemberBase', 'remFinancial', 'remGovernance', 'remInfra', 'remDistribution', 'remAggregation', 'remBiologicals', 'remExtension', 'remDigital', 'remAlignment',
        'audioMemberBase', 'audioFinancial', 'audioGovernance', 'audioInfra', 'audioDistribution', 'audioAggregation', 'audioBiologicals', 'audioExtension', 'audioDigital', 'audioAlignment', 'redFlags', 'audioRedFlags',
        'allottedTerritories', 'expectedOfftake', 'currentSuppliers', 'partnershipTier', 'demoFarmersCommitment', 'warehouseSpace', 'storageConditions', 'customMachinery',
        'totalMembers', 'activeMembers', 'majorCrops', 'kharifDemand', 'rabiDemand',
        'documents', 'storageLocations', 'fpoSignature', 'seSignature'
      ];
      const illegalEdits = dirtyKeys.filter(k => !allowedEdits.includes(k.split('.')[0]));
      if (illegalEdits.length > 0) return { pass: false, error: "You are only authorized to edit Leadership, Banks, Scoring, Scope, Network, and Annexures for completed profiles.", dirtyKeys: [] };
    }
    return { pass: true, error: "", dirtyKeys };
  };

  const saveAndExit = async () => {
    const check = checkRestrictions();
    if (!check.pass) return useAlertStore.getState().showAlert("Cannot Save", check.error);

    if (fetchedRecordId) {
      return useAlertStore.getState().showAlert("Cannot Save Draft", "This profile is already complete. Click 'Next' to the last step and click 'Save Changes' to update it directly.");
    }

    const values = form.getValues();
    if (!values.fpoName || !values.contactMobile) return useAlertStore.getState().showAlert("Cannot Save", "Please enter FPO Name and Mobile to save a draft.");
    
    useAlertStore.getState().showAlert("Saving...", "Syncing draft...");
    await saveDraftToDB(true);
    await useShiftStore.getState().incrementActivity(); // 🚀 NEW: Log valid activity!
    // 🚀 FORMAT TIMELINE DESCRIPTION (Route & Taluka)
    let routeName = "";
    const shiftId = useShiftStore.getState().activeShiftId;
    if (shiftId) {
      const { data: sData } = await supabase.from('shifts').select('assigned_route_id').eq('id', shiftId).single();
      if (sData?.assigned_route_id) {
        const { data: rData } = await supabase.from('routes').select('name').eq('id', sData.assigned_route_id).single();
        if (rData?.name) routeName = rData.name;
      }
    }
    const locName = form.getValues().taluka || form.getValues().city || "Unknown Location";
    const eventDesc = routeName ? `${routeName} (${locName})` : locName;

    await useShiftStore.getState().logShiftEvent('activity', 'Saved FPO Draft', eventDesc);
    useAlertStore.getState().hideAlert();
    navigation.navigate("MainTabs");
  };

  const saveDraft = () => saveAndExit();

  const validationStatus = useMemo(() => {
    const mobileRegex = /^\d{10}$/;
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    
    const areBanksValid = Array.isArray(values.bankAccounts) && values.bankAccounts.every(b => b.accountName && b.bankNameBranch && b.accountNumber && ifscRegex.test(b.bankIfsc || ''));
    const isStep1Valid = !!(values.fpoName && values.contactMobile && mobileRegex.test(values.contactMobile) && values.state && values.city && values.address && areBanksValid);
    
    const isStep3Valid = !!(Array.isArray(values.allottedTerritories) && values.allottedTerritories.length > 0 && values.allottedTerritories[0].district && values.expectedOfftake && values.partnershipTier && values.demoFarmersCommitment);
    const isStep4Valid = !!(values.totalMembers && values.activeMembers && Array.isArray(values.majorCrops) && values.majorCrops[0]?.name);
    const isStep5Valid = Array.isArray(values.glsCommitments) && values.glsCommitments.length === FPO_GLS_COMMITMENTS.length;
    
    const isStep7Valid = !!(values.documents?.['incorporation_certificate'] && values.documents?.['pan_card'] && values.documents?.['board_resolution'] && values.documents?.['storage_exterior'] && values.storageLocations?.['storage_exterior']);
    
    const isStep8Valid = !!(values.agreementAccepted && values.fpoSignature && values.seSignature);

    return [
      { isValid: isStep1Valid, name: "Step 1: Basic Info (Check Mobile/Bank/Location)" },
      { isValid: isStep3Valid, name: "Step 3: Business & Infra" },
      { isValid: isStep4Valid, name: "Step 4: Member Base & Crops" },
      { isValid: isStep5Valid, name: "Step 5: GLS Commitments" },
      { isValid: isStep7Valid, name: "Step 7: Documents (Check required files & GPS)" },
      { isValid: isStep8Valid, name: "Step 8: Agreement & Signatures" },
    ];
  }, [values]);

  const handleAudioUpload = async (key: string, uri: string) => {
    setUploading(prev => ({ ...prev, [key]: true }));
    try {
      const url = await uploadFileToCloudinary(uri, 'audio');
      form.setValue(key as any, url, { shouldValidate: true });
    } catch(e) {
      useAlertStore.getState().showAlert("Error", "Audio upload failed.");
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleUpload = async (key: string, type: 'camera' | 'image' | 'doc' = 'doc') => {
    const useCamera = type === 'camera' || type === 'image';
    const perm = useCamera ? await requestCameraPermission() : await requestMediaPermission();
    if (!perm.granted) return useAlertStore.getState().showAlert("Permission Denied", perm.fallbackMessage);
  
    let result = useCamera ? await ImagePicker.launchCameraAsync({ quality: 0.7 }) : await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (result.canceled) return;

    const asset: any = result.assets[0];

    if (!useCamera && asset.size) {
      const fileSizeInMB = asset.size / (1024 * 1024);
      if (fileSizeInMB > 5) {
        useAlertStore.getState().showAlert("File Too Large", `This document is ${fileSizeInMB.toFixed(1)}MB. Please select a file smaller than 5MB.`);
        return; 
      }
    }
    
    const uri = asset.uri;
    const isCameraOrImage = type === 'camera' || type === 'image';
    setUploading(prev => ({ ...prev, [key]: true }));
    
    let location: any = null;
    const requiresGPS = ['storage_exterior', 'storage_interior'].includes(key); 
    
    if (requiresGPS) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { 
        useAlertStore.getState().showAlert("GPS Required", "GPS location is required when capturing storage facility photos."); 
        setUploading(prev => ({ ...prev, [key]: false }));
        return; 
      }
      location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    }
  
    try {
      let finalUri = uri;
      if (isCameraOrImage) {
        const manipResult = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1024 } }], { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG });
        finalUri = manipResult.uri;
      }

      const url = await uploadFileToCloudinary(finalUri, isCameraOrImage ? 'image' : 'raw');
      const currentDocs = form.getValues('documents') || {};
      
      form.setValue('documents', { ...currentDocs, [key]: url }, { shouldValidate: true });
      
      if (location) {
        const currentLocs = form.getValues('storageLocations') || {};
        form.setValue('storageLocations', { 
          ...currentLocs, 
          [key]: { lat: location.coords.latitude, lng: location.coords.longitude } 
        }, { shouldValidate: true });
      }
    } catch(e) {
      useAlertStore.getState().showAlert("Error", "Upload failed. Please check your internet connection.");
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }));
    }
  };

  const generateHTML = () => {
    const data = form.getValues();
    const dateValue = editData?.created_at || new Date().toISOString();
    const dateObj = new Date(dateValue);
    const dateStr = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const renderSignature = (sigData?: string) => {
      if (!sigData) return '<span style="color:red">No Signature</span>';
      try {
        const strokes = JSON.parse(sigData);
        const toPath = (points: any[]) => {
          if (points.length === 0) return '';
          return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
        };
        const paths = strokes.map((pts: any[]) => `<path d="${toPath(pts)}" stroke="#16A34A" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round" />`).join('');
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" style="width: 100%; max-width: 250px; height: 80px;">${paths}</svg>`;
      } catch (e) {
        return '<span style="color:red">Invalid Signature Format</span>';
      }
    };

    const bandColor = scoreData.band.includes('Red') ? '#991B1B' : scoreData.band.includes('Yellow') ? '#92400E' : '#166534';
    const bandBg = scoreData.band.includes('Red') ? '#FEE2E2' : scoreData.band.includes('Yellow') ? '#FEF3C7' : '#DCFCE7';

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
          .score-card { background: ${bandBg}; color: ${bandColor}; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px; border: 1px solid ${bandColor}; }
          .score-card h2 { margin: 0 0 5px 0; font-size: 24px; font-weight: 800; }
          .score-card p { margin: 0; font-size: 14px; opacity: 0.9; }
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
          .signatures { display: table; width: 100%; margin-top: 50px; page-break-inside: avoid; }
          .sig-box { display: table-cell; width: 50%; text-align: center; }
          .sig-line { border-top: 2px solid #94A3B8; margin: 10px 60px 0; padding-top: 8px; font-weight: 800; color: #1E293B; font-size: 14px; text-transform: uppercase; }
          .empty-text { color: #94A3B8; font-style: italic; font-weight: 400; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>FPO Onboarding Dossier</h1>
            <p>Onboarded on ${dateStr} • Added by ${user?.name || 'Sales Executive'}</p>
          </div>

          <div class="score-card">
            <h2>Overall Score: ${scoreData.raw} / 100</h2>
            <p>Recommendation: <strong>${scoreData.band}</strong></p>
          </div>

          <div class="section">
            <div class="section-title">1. FPO Basic Information</div>
            <div class="table-wrapper">
              <table>
                <tr><th>FPO Name</th><td>${data.fpoName || '<span class="empty-text">N/A</span>'}</td></tr>
                <tr><th>Promoting Agency</th><td>${data.promotingAgency || '-'}</td></tr>
                <tr><th>Leadership</th><td>CEO: ${data.ceoName || '-'}<br>President: ${data.bodPresidentName || '-'}</td></tr>
                <tr><th>Contact Details</th><td>Phone: +91 ${data.contactMobile || '-'}<br>Email: ${data.email || '-'}</td></tr>
                <tr><th>Registered Address</th><td>${data.address || '-'}<br><span style="color:#64748B; font-size:12px;">${data.taluka || '-'}, ${data.city || '-'}, ${data.state || '-'} - ${data.pincode}</span></td></tr>
                <tr><th>Registration No.</th><td>${data.registrationNumber || '-'} (Est. ${data.incorporationYear || '-'})</td></tr>
                <tr><th>Tax IDs</th><td><strong>GST:</strong> ${data.gstNumber || '-'}<br><strong>PAN:</strong> ${data.panNumber || '-'}</td></tr>
              </table>
            </div>

            <div class="sub-heading">Bank Details</div>
            ${data.bankAccounts?.map((b, i) => `
              <div class="table-wrapper" style="margin-bottom:10px;">
                <table>
                  <tr><th>Account ${i + 1}</th><td><strong>${b.bankNameBranch || '-'}</strong></td></tr>
                  <tr><th>Account Details</th><td>A/C Name: ${b.accountName || '-'}<br>A/C No: <strong>${b.accountNumber || '-'}</strong><br>IFSC: <strong>${b.bankIfsc || '-'}</strong></td></tr>
                </table>
              </div>
            `).join('')}
          </div>

          <div class="section page-break">
            <div class="section-title">2. Profiling & Evaluation</div>
            <div class="table-wrapper">
              <table>
                <tr style="background-color: #E2E8F0; color: #334155; font-weight: 800; font-size: 12px; text-transform: uppercase;">
                  <td style="padding: 10px 16px;">Assessment Aspect</td>
                  <td style="text-align: center; width: 15%;">Score</td>
                </tr>
                <tr><th>Member Base & Reach</th><td style="text-align: center; font-weight: 800;">${data.scoreMemberBase || 0}/10</td></tr>
                <tr><th>Financial Health & Equity</th><td style="text-align: center; font-weight: 800;">${data.scoreFinancial || 0}/10</td></tr>
                <tr><th>Governance & Mgmt</th><td style="text-align: center; font-weight: 800;">${data.scoreGovernance || 0}/10</td></tr>
                <tr><th>Infrastructure Capabilities</th><td style="text-align: center; font-weight: 800;">${data.scoreInfra || 0}/10</td></tr>
                <tr><th>Input Distribution Exp</th><td style="text-align: center; font-weight: 800;">${data.scoreDistribution || 0}/10</td></tr>
                <tr><th>Output Aggregation</th><td style="text-align: center; font-weight: 800;">${data.scoreAggregation || 0}/10</td></tr>
                <tr><th>Adoption of Biologicals</th><td style="text-align: center; font-weight: 800;">${data.scoreBiologicals || 0}/10</td></tr>
                <tr><th>Extension & Field Reach</th><td style="text-align: center; font-weight: 800;">${data.scoreExtension || 0}/10</td></tr>
                <tr><th>Digital Literacy</th><td style="text-align: center; font-weight: 800;">${data.scoreDigital || 0}/10</td></tr>
                <tr><th>Strategic Alignment</th><td style="text-align: center; font-weight: 800;">${data.scoreAlignment || 0}/10</td></tr>
                <tr><th style="color:#DC2626;">Red Flags Noted</th><td style="color:#DC2626; font-weight:bold; text-align: center;">${data.redFlags || 'None Reported'}</td></tr>
              </table>
            </div>
          </div>

          <div class="section page-break">
            <div class="section-title">3. Business Scope & Infrastructure</div>
            <div class="grid-2">
              <div class="grid-col">
                <div class="table-wrapper">
                  <table>
                    <tr><th>Allotted Territories</th><td>${data.allottedTerritories?.map(t => `${t.district} (${t.taluka})`).join(', ') || '-'}</td></tr>
                    <tr><th>Expected Off-take</th><td>₹ ${data.expectedOfftake || '-'}</td></tr>
                    <tr><th>Partnership Tier</th><td><strong>${data.partnershipTier || '-'}</strong></td></tr>
                    <tr><th>Demo Commitments</th><td>${data.demoFarmersCommitment || '-'}</td></tr>
                  </table>
                </div>
              </div>
              <div class="grid-col">
                <div class="table-wrapper">
                  <table>
                    <tr><th>Warehouse Space</th><td>${data.warehouseSpace || '-'} sq.ft</td></tr>
                    <tr><th>Storage Conditions</th><td>${data.storageConditions || '-'}</td></tr>
                    <tr><th>Custom Machinery</th><td>${data.customMachinery || '-'}</td></tr>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div class="section page-break">
            <div class="section-title">4. Member Base Annexures</div>
            
            <div class="sub-heading" style="margin-top:0;">Annexure A: Member Base & Crop Profile</div>
            <div class="table-wrapper">
              <table>
                <tr><th>Total Members</th><td>${data.totalMembers || '-'}</td></tr>
                <tr><th>Active Members</th><td>${data.activeMembers || '-'}</td></tr>
                <tr><th>Major Crops Grown</th><td>${data.majorCrops?.map(c => `${c.name} (${c.acreage} Acres)`).join(', ') || '-'}</td></tr>
                <tr><th>Kharif Demand</th><td>${data.kharifDemand || '-'}</td></tr>
                <tr><th>Rabi Demand</th><td>${data.rabiDemand || '-'}</td></tr>
              </table>
            </div>

            <div class="signatures">
              <div class="sig-box">
                ${renderSignature(data.fpoSignature)}
                <div class="sig-line">Authorized FPO Signature</div>
              </div>
              <div class="sig-box">
                ${renderSignature(data.seSignature)}
                <div class="sig-line">Sales Executive Signature</div>
              </div>
            </div>
          </div>

        </div>
      </body>
      </html>
    `;
  };

  const generatePDF = async () => {
    const html = generateHTML();
    const data = form.getValues();
    const rawFpoName = data.fpoName ? data.fpoName.replace(/[^a-zA-Z0-9]/g, '_') : 'FPO';
    const finalFileName = `${rawFpoName}_Dossier.pdf`;

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
      console.error("Error renaming or sharing PDF:", error);
      useAlertStore.getState().showAlert("Error", "Could not generate or share the PDF file.");
    }
  };

  const submit = async () => {
    const check = checkRestrictions();
    if (!check.pass) return useAlertStore.getState().showAlert("Restricted Action", check.error);
    
    const missingSteps = validationStatus.filter(v => !v.isValid).map(v => v.name);
    if (missingSteps.length > 0) {
      return useAlertStore.getState().showAlert(
        "Missing Information", 
        "Please complete the following sections before submitting:\n\n• " + missingSteps.join("\n• ")
      );
    }

    await form.handleSubmit(async (data) => {
      if (!user?.id) return useAlertStore.getState().showAlert("Error", "User session not found.");
      setIsSubmitting(true);
      try {
        const dbResult = await saveFPOOnboarding(data, "SUBMITTED", scoreData.raw, scoreData.band, user.id, editData?.id || fetchedRecordId, check.dirtyKeys);
        
        await useShiftStore.getState().incrementActivity(); // 🚀 NEW: Log valid activity!
        // 🚀 FORMAT TIMELINE DESCRIPTION (Route & Taluka)
        let routeName = "";
        const shiftId = useShiftStore.getState().activeShiftId;
        if (shiftId) {
          const { data: sData } = await supabase.from('shifts').select('assigned_route_id').eq('id', shiftId).single();
          if (sData?.assigned_route_id) {
            const { data: rData } = await supabase.from('routes').select('name').eq('id', sData.assigned_route_id).single();
            if (rData?.name) routeName = rData.name;
          }
        }
        const locName = data.taluka || data.city || "Unknown Location";
        const eventDesc = routeName ? `${routeName} (${locName})` : locName;

        await useShiftStore.getState().logShiftEvent('activity', (editData || fetchedRecordId) ? 'Updated FPO' : 'Onboarded FPO', eventDesc);
        
        if (draftIdRef.current) {
          await supabase.from('drafts').delete().eq('entity_id', draftIdRef.current);
          draftIdRef.current = undefined; 
        }
        showSuccessRef.current = true;
        
        try {
            const html = generateHTML();
            const { uri } = await Print.printToFileAsync({ html });
            const pdfUrl = await uploadFileToCloudinary(uri, 'raw');
            await updateFPOPdfUrl(dbResult.id, pdfUrl);
        } catch(pdfErr) {
            console.log("PDF Generation/Upload Failed", pdfErr);
        }

        setShowSuccess(true);
      } catch (error: any) {
        useAlertStore.getState().showAlert("Submission Failed", error.message);
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  return { form, step, setStep, jumpBackTo, setJumpBackTo, saveDraft, submit, scoreData, handleUpload, handleAudioUpload, uploading, isSubmitting, isNextEnabled: true, showSuccess, setShowSuccess, generatePDF, isEditing: !!editData || !!fetchedRecordId, saveAndExit, isLocked };
}