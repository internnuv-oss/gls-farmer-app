import { useState, useMemo, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppState, Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Location from 'expo-location';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { documentDirectory, copyAsync } from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto'; // 🚀 IMPORT CRYPTO FOR UUIDs

import { supabase } from '../../../core/supabase';
import { requestMediaPermission, requestCameraPermission } from "../../../core/permissions";
import { useAuthStore } from "../../../store/authStore";
import { uploadFileToCloudinary } from "../services/cloudinaryService";
import { saveDealerOnboarding, mapDealerDbToForm, fetchProfileByMobile } from "../services/onboardingService";
import { dealerOnboardingSchema, DealerOnboardingValues, GLS_COMMITMENTS } from "./schema";
import { useAlertStore } from "../../../store/alertStore";
import { useShiftStore } from "../../../store/shiftStore";
import { useDraftStore } from "../../../store/draftStore";

export function useDealerOnboarding(navigation: any, route: any) {
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
  const showSuccessRef = useRef(showSuccess);

  useEffect(() => { showSuccessRef.current = showSuccess; }, [showSuccess]);

  const defaultFormValues = editData 
    ? mapDealerDbToForm(editData)
    : (draftData ? draftData : {
        shopName: '', firmType: '', estYear: '', state: '', city: '', taluka: '', village: [], address: '', landmark: '',
        contactMobile: '', landlineNumber: '', gstNumber: '', panNumber: '',
        owners: [{ name: '' }], 
        bankAccounts: [{ isActive: true, accountType: '', bankName: '', bankBranch: '', accountName: '', accountNumber: '', bankIfsc: '' }],
        scoreFinancial: 5, scoreReputation: 5, scoreOperations: 5, scoreFarmerNetwork: 5,
        scoreTeam: 5, scorePortfolio: 5, scoreExperience: 5, scoreGrowth: 5,
        hasAdditionalLocations: undefined, additionalShops: [], godowns: [], 
        isLinkedToDistributor: undefined, linkedDistributors: [{ name: '', contact: '' }],
        proposedStatus: '', willingDemoFarmers: undefined, demoFarmers: Array(5).fill({ name: '', contact: '', address: '' }),
        glsCommitments: [], complianceChecklist: [], documents: {}, shopLocations: {},
        seTerritories: [{ taluka: '', village: [], cultivableArea: '', majorCrops: [] }], 
        sePrincipalSuppliers: [], seChemicalProducts: [], seBioProducts: [], seOtherProducts: [], 
        seHasCreditReferences: undefined, seCreditReferences: [{ name: '', contact: '', behavior: '', behaviorAudio: '' }],
        seWillShareSales: false, seGrowthVision: '', seGrowthVisionAudio: '', seSecurityDeposit: '', sePaymentProofText: '',
        agreementAccepted: false, dealerSignature: '', seSignature: ''
      });

  const form = useForm<DealerOnboardingValues>({
    resolver: zodResolver(dealerOnboardingSchema),
    defaultValues: defaultFormValues as DealerOnboardingValues,
    mode: 'onChange'
  });

  const { watch, reset } = form;
  const values = watch();

  // 🚀 NEW: Auto-Fetch tracking states
  const mobileNumber = watch('contactMobile');
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [fetchedRecordId, setFetchedRecordId] = useState<string | undefined>(undefined);
  const [isLocked, setIsLocked] = useState(editData?.status === 'SUBMITTED');

  useEffect(() => {
    const fetchExistingProfile = async () => {
      if (editData || draftData || mobileNumber?.length !== 10) return;

      setIsFetchingProfile(true);
      try {
        const existingProfile = await fetchProfileByMobile('dealer', mobileNumber); 
        
        if (existingProfile) {
          useAlertStore.getState().showAlert("Profile Found", "An existing profile was found and has been loaded.");
          
          if (existingProfile.source === 'draft') {
            reset(existingProfile.data.draft_data);
            draftIdRef.current = existingProfile.data.entity_id;
            setStep(existingProfile.data.current_step || 1);
            setIsLocked(false);
          } else {
            const mappedData = mapDealerDbToForm(existingProfile.data);
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

  const saveDraftToDB = async (isManualSave = false) => {
    if (editData || showSuccessRef.current) return; 

    const dirtyKeys = Object.keys(form.formState.dirtyFields);
    if (dirtyKeys.length === 0) return; // 🚀 Prevent unmount duplication

    if (fetchedRecordId) { // 🚀 Prevent drafting completed profiles
      if (isManualSave) useAlertStore.getState().showAlert("Cannot Save Draft", "This profile is already complete. Click 'Next' to the last step and click 'Save Changes' to update it directly.");
      return;
    }
    
    const currentValues = form.getValues();
    if (!currentValues || !currentValues.shopName || !currentValues.contactMobile || !user?.id) return; 

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
        entity_type: 'dealer',
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
        useDraftStore.getState().addDraft(fallbackData, 'DEALER', draftIdRef.current);
      }
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      if (nextAppState === "inactive" || nextAppState === "background") {
        if (!showSuccessRef.current) await saveDraftToDB(false);
      }
    });
    return () => {
      subscription.remove();
      if (!showSuccessRef.current) saveDraftToDB(false); 
    };
  }, [step]);

  const checkRestrictions = () => {
    const dirtyKeys = Object.keys(form.formState.dirtyFields);
    // 🚀 FIX: Prevent blocking users if they hit submit without modifying anything
    if (dirtyKeys.length === 0) return { pass: true, error: "", dirtyKeys: [] };

    if ((editData || fetchedRecordId) && isLocked) { 
      const allowedEdits = [
        'owners', 'contactMobile', 'bankAccounts', 'scoreFinancial', 'scoreReputation', 'scoreOperations', 'scoreFarmerNetwork', 'scoreTeam', 'scorePortfolio', 'scoreExperience', 'scoreGrowth', 'remFinancial', 'remReputation', 'remOperations', 'remFarmerNetwork', 'remTeam', 'remPortfolio', 'remExperience', 'remGrowth', 'audioFinancial', 'audioReputation', 'audioOperations', 'audioFarmerNetwork', 'audioTeam', 'audioPortfolio', 'audioExperience', 'audioGrowth', 'redFlags', 'audioRedFlags', 'proposedStatus', 'hasAdditionalLocations', 'additionalShops', 'godowns', 'isLinkedToDistributor', 'linkedDistributors', 'willingDemoFarmers', 'demoFarmers', 'seTerritories', 'sePrincipalSuppliers', 'seChemicalProducts', 'seBioProducts', 'seOtherProducts', 'seHasCreditReferences', 'seCreditReferences', 'seWillShareSales', 'seGrowthVision', 'seGrowthVisionAudio', 'seSecurityDeposit', 'sePaymentProofText', 'documents', 'dealerSignature', 'seSignature'
      ];
      const illegalEdits = dirtyKeys.filter(k => !allowedEdits.includes(k.split('.')[0]));
      if (illegalEdits.length > 0) return { pass: false, error: "You are only authorized to edit Contact Person, Mobile, Banks, Scoring, Business Area, and Annexures for completed profiles.", dirtyKeys: [] };
    }
    return { pass: true, error: "", dirtyKeys };
  };

  // 🚀 DB CRUD: Save & Exit Button
  const saveAndExit = async () => {
    const check = checkRestrictions();
    if (!check.pass) return useAlertStore.getState().showAlert("Cannot Save", check.error);

    if (fetchedRecordId) {
      return useAlertStore.getState().showAlert("Cannot Save Draft", "This profile is already complete. Click 'Next' to the last step and click 'Save Changes' to update it directly.");
    }

    const values = form.getValues();
    if (!values.shopName || !values.contactMobile) return useAlertStore.getState().showAlert("Cannot Save", "Please enter both the Shop Name and Mobile Number to save a draft.");

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

    await useShiftStore.getState().logShiftEvent('activity', 'Saved Dealer Draft', eventDesc);
    useAlertStore.getState().hideAlert();
    navigation.navigate("MainTabs");
  };

  const saveDraft = () => saveAndExit();

  const validationStatus = useMemo(() => {
    const mobileRegex = /^\d{10}$/;
    const landlineRegex = /^[0-9]{3,5}[- ]?[0-9]{6,8}$/;
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    const bankAccRegex = /^\d{9,18}$/;
    
    // 🚀 CRITICAL FIX: Prepended Array.isArray checks
    const areOwnersValid = Array.isArray(values.owners) && values.owners.every(o => o.name && o.name.length >= 2);
    const areBanksValid = Array.isArray(values.bankAccounts) && values.bankAccounts.every(b => b.accountType && b.bankName && b.bankBranch && b.accountName && bankAccRegex.test(b.accountNumber || '') && ifscRegex.test(b.bankIfsc || ''));
    
    const isLandlineValid = !values.landlineNumber || landlineRegex.test(values.landlineNumber);
    const isStep1Valid = !!(values.shopName && values.shopName.length >= 2 && values.firmType && values.estYear && values.estYear.length === 4 && areOwnersValid && mobileRegex.test(values.contactMobile || '') && isLandlineValid && values.state && values.city && values.taluka && values.village && values.address && values.address.length >= 5 && gstRegex.test(values.gstNumber || '') && panRegex.test(values.panNumber || '') && areBanksValid);
    
    const distValid = values.isLinkedToDistributor === 'No' || (values.isLinkedToDistributor === 'Yes' && Array.isArray(values.linkedDistributors) && values.linkedDistributors?.[0]?.name && /^\d{10}$/.test(values.linkedDistributors?.[0]?.contact || ''));
    
    const hasAtLeastOneLocation = (Array.isArray(values.additionalShops) && values.additionalShops.length > 0) || (Array.isArray(values.godowns) && values.godowns.length > 0);
    const additionalShopsValid = Array.isArray(values.additionalShops) && values.additionalShops.every(s => s.shopName && s.estYear && s.state && s.city && s.taluka && s.village && s.address);
    const godownsValid = Array.isArray(values.godowns) && values.godowns.every(g => g.address && g.capacity && g.capacityUnit);
    const addLocValid = values.hasAdditionalLocations === 'No' || (values.hasAdditionalLocations === 'Yes' && hasAtLeastOneLocation && additionalShopsValid && godownsValid);
    
    const hasFarmerFile = !!values.documents?.['demo_farmers_list'];
    const manualFarmersValid = Array.isArray(values.demoFarmers) && values.demoFarmers.some(f => f.name && f.contact && f.address);
    const demoFarmersValid = values.willingDemoFarmers === 'No' || (values.willingDemoFarmers === 'Yes' && (hasFarmerFile || manualFarmersValid));
    
    const isStep3Valid = !!(values.isLinkedToDistributor && distValid && values.hasAdditionalLocations && addLocValid && values.proposedStatus && values.willingDemoFarmers && demoFarmersValid);
    
    const isStep4Valid = Array.isArray(values.glsCommitments) && values.glsCommitments.length === GLS_COMMITMENTS.length; 
    
    const requiredKeys = ['gst certificate / shop establishment license', 'pan card', 'cancelled cheque', 'shop_exterior', 'selfie_with_owner'];
    const dynamicKeys = Array.isArray(values.complianceChecklist) ? values.complianceChecklist.map((item: string) => item.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()) : [];
    const allRequired = [...requiredKeys, ...dynamicKeys];
    const isStep6Valid = allRequired.every(key => { const doc = values.documents?.[key]; return Array.isArray(doc) ? doc.length > 0 : !!doc; }) && !!values.shopLocations?.['shop_exterior']; 
    
    const validCreditRefs = values.seHasCreditReferences !== 'Yes' || (values.seHasCreditReferences === 'Yes' && Array.isArray(values.seCreditReferences) && values.seCreditReferences.length > 0 && values.seCreditReferences.every(ref => (ref.name?.length ?? 0) >= 2 && (ref.contact?.length ?? 0) === 10));
    const validTerritories = Array.isArray(values.seTerritories) && values.seTerritories.length > 0 && values.seTerritories.every(t => t.taluka && Array.isArray(t.village) && t.village.length > 0 && t.cultivableArea && Array.isArray(t.majorCrops) && t.majorCrops.length > 0);
    const securityDepositVal = parseInt(values.seSecurityDeposit || '0');
    const hasPaymentProof = securityDepositVal === 0 || (securityDepositVal > 0 && (!!values.sePaymentProofText || !!values.documents?.['se_payment_proof']));
    
    const isStep7Valid = !!(validTerritories && Array.isArray(values.sePrincipalSuppliers) && values.sePrincipalSuppliers.length > 0 && Array.isArray(values.seChemicalProducts) && values.seChemicalProducts.length > 0 && Array.isArray(values.seBioProducts) && values.seBioProducts.length > 0 && Array.isArray(values.seOtherProducts) && values.seOtherProducts.length > 0 && validCreditRefs && hasPaymentProof && (values.seWillShareSales !== undefined));
    
    const isStep8Valid = !!(values.agreementAccepted && values.dealerSignature && values.seSignature);
  
    return [
      { isValid: isStep1Valid, name: "Step 1: Basic Profile (Check PAN/GST/Bank formats)" },
      { isValid: isStep3Valid, name: "Step 3: Business Area (Check dropdown options)" },
      { isValid: isStep4Valid, name: "Step 4: GLS Commitments (Must check all)" },
      { isValid: isStep6Valid, name: "Step 6: Documents & Location (Check GPS & Required files)" },
      { isValid: isStep7Valid, name: "Step 7: Annexures (Check required fields & references)" },
      { isValid: isStep8Valid, name: "Step 8: Agreement & Signatures" },
    ];
  }, [values]);

  const isNextEnabled = true;

  const scores = watch(['scoreFinancial', 'scoreReputation', 'scoreOperations', 'scoreFarmerNetwork', 'scoreTeam', 'scorePortfolio', 'scoreExperience', 'scoreGrowth']);
  const scoreData = useMemo(() => {
    const raw = scores.reduce((a, b) => (a || 0) + (b || 0), 0);
    let band = 'C-Category';
    if (raw > 60) band = 'Elite'; else if (raw >= 46) band = 'A-Category'; else if (raw >= 26) band = 'B-Category'; else band = 'C-Category';
    return { raw, percentage: raw, band }; 
  }, [scores]);

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

  const generateHTML = () => {
    const data = form.getValues();
    const dateValue = editData?.created_at || new Date().toISOString();
    const dateObj = new Date(dateValue);
    const dateStr = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    // Helper to render signature SVGs
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

    const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#166534" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    const flagIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>`;

    const bandColor = scoreData.band === 'Elite' ? '#166534' : scoreData.band === 'A-Category' ? '#15803D' : scoreData.band === 'B-Category' ? '#92400E' : '#991B1B';
    const bandBg = scoreData.band === 'Elite' ? '#DCFCE7' : scoreData.band === 'A-Category' ? '#BBF7D0' : scoreData.band === 'B-Category' ? '#FEF3C7' : '#FEE2E2';

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
            <h1>Dealer Onboarding Dossier</h1>
            <p>Onboarded on ${dateStr} • Added by ${user?.name || 'Sales Executive'}</p>
          </div>

          <div class="score-card">
            <h2>Overall Score: ${scoreData.percentage} / 100</h2>
            <p>Risk Band: <strong>${scoreData.band}</strong></p>
          </div>

          <div class="section">
            <div class="section-title">1. Business Profile</div>
            <div class="table-wrapper">
              <table>
                <tr><th>Primary Shop Name</th><td>${data.shopName || '<span class="empty-text">N/A</span>'}</td></tr>
                <tr><th>Firm Type & Est. Year</th><td>${data.firmType || '-'} / ${data.estYear || '-'}</td></tr>
                <tr><th>Primary Address</th><td>${data.address || '-'}<br><span style="color:#64748B; font-size:12px;">${data.village || '-'}, ${data.taluka || '-'}, ${data.city || '-'}, ${data.state || '-'}</span></td></tr>
                <tr><th>Landmark</th><td>${data.landmark || '<span class="empty-text">N/A</span>'}</td></tr>
                <tr><th>Owner(s) / Partner(s)</th><td>${data.owners?.map(o => `<span class="pill">${o.name}</span>`).join('') || '-'}</td></tr>
                
                <tr><th>Contact Numbers</th><td>
                  ${data.contactMobile ? `<span class="action-link">+91 ${data.contactMobile}</span>` : '-'} 
                  ${data.landlineNumber ? `<br><span style="color:#64748B; font-size:12px;">Landline: <span class="action-link">${data.landlineNumber}</span></span>` : ''}
                </td></tr>
                
                <tr><th>Tax IDs</th><td><strong>GST:</strong> ${data.gstNumber || '-'}<br><strong>PAN:</strong> ${data.panNumber || '-'}</td></tr>
              </table>
            </div>

            <div class="sub-heading">Bank Details</div>
            ${data.bankAccounts?.map((b, i) => `
              <div class="table-wrapper" style="margin-bottom:10px;">
                <table>
                  <tr><th>Account ${i + 1} (${b.accountType})</th><td><strong>${b.bankName || '-'}</strong> - ${b.bankBranch || '-'}</td></tr>
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
                  <td>Remarks & Audio Evidence</td>
                </tr>
                
                <tr><th>Financial Health</th><td style="text-align: center; font-weight: 800;">${data.scoreFinancial}/10</td><td>${data.remFinancial || '<span class="empty-text">No text remarks</span>'} ${data.audioFinancial ? `<br><span class="success-badge">${checkIcon} Audio Recorded</span>` : ''}</td></tr>
                <tr><th>Market Reputation</th><td style="text-align: center; font-weight: 800;">${data.scoreReputation}/10</td><td>${data.remReputation || '<span class="empty-text">No text remarks</span>'} ${data.audioReputation ? `<br><span class="success-badge">${checkIcon} Audio Recorded</span>` : ''}</td></tr>
                <tr><th>Operations & Infra</th><td style="text-align: center; font-weight: 800;">${data.scoreOperations}/10</td><td>${data.remOperations || '<span class="empty-text">No text remarks</span>'} ${data.audioOperations ? `<br><span class="success-badge">${checkIcon} Audio Recorded</span>` : ''}</td></tr>
                <tr><th>Farmer Network</th><td style="text-align: center; font-weight: 800;">${data.scoreFarmerNetwork}/10</td><td>${data.remFarmerNetwork || '<span class="empty-text">No text remarks</span>'} ${data.audioFarmerNetwork ? `<br><span class="success-badge">${checkIcon} Audio Recorded</span>` : ''}</td></tr>
                <tr><th>Team & Professionalism</th><td style="text-align: center; font-weight: 800;">${data.scoreTeam}/10</td><td>${data.remTeam || '<span class="empty-text">No text remarks</span>'} ${data.audioTeam ? `<br><span class="success-badge">${checkIcon} Audio Recorded</span>` : ''}</td></tr>
                <tr><th>Portfolio Alignment</th><td style="text-align: center; font-weight: 800;">${data.scorePortfolio}/10</td><td>${data.remPortfolio || '<span class="empty-text">No text remarks</span>'} ${data.audioPortfolio ? `<br><span class="success-badge">${checkIcon} Audio Recorded</span>` : ''}</td></tr>
                <tr><th>Experience</th><td style="text-align: center; font-weight: 800;">${data.scoreExperience}/10</td><td>${data.remExperience || '<span class="empty-text">No text remarks</span>'} ${data.audioExperience ? `<br><span class="success-badge">${checkIcon} Audio Recorded</span>` : ''}</td></tr>
                <tr><th>Growth Orientation</th><td style="text-align: center; font-weight: 800;">${data.scoreGrowth}/10</td><td>${data.remGrowth || '<span class="empty-text">No text remarks</span>'} ${data.audioGrowth ? `<br><span class="success-badge">${checkIcon} Audio Recorded</span>` : ''}</td></tr>
                <tr>
                  <th style="color:#DC2626;">Red Flags Noted</th>
                  <td colspan="2" style="color:#DC2626; font-weight:bold;">${data.redFlags || 'None Reported'} ${data.audioRedFlags ? `<br><span class="danger-badge">${flagIcon} Audio Alert Recorded</span>` : ''}</td>
                </tr>
              </table>
            </div>
          </div>

          <div class="section page-break">
            <div class="section-title">3. Business Infrastructure & Status</div>
            
            <div class="grid-2">
              <div class="grid-col">
                <div class="table-wrapper">
                  <table>
                    <tr><th>Proposed Status</th><td><strong>${data.proposedStatus || '-'}</strong></td></tr>
                    <tr><th>Demo Farmers</th><td>${data.willingDemoFarmers || '-'}</td></tr>
                    
                    <tr><th>Linked Distributor</th><td>${data.isLinkedToDistributor === 'Yes' ? data.linkedDistributors?.map(d => `${d.name} (<span class="action-link">${d.contact}</span>)`).join('<br>') : 'No'}</td></tr>
                  </table>
                </div>
              </div>
              <div class="grid-col">
                <div class="table-wrapper">
                  <table>
                    <tr><th>Additional Shops</th><td>${data.additionalShops?.length || '0'} Recorded</td></tr>
                    <tr><th>Godowns</th><td>${data.godowns?.length || '0'} Recorded</td></tr>
                    
                    <tr>
                      <th>GPS Coordinates</th>
                      <td>
                        ${data.shopLocations?.['shop_exterior'] 
                           ? `<a href="https://maps.google.com/?q=$${data.shopLocations['shop_exterior'].lat},${data.shopLocations['shop_exterior'].lng}" class="action-link">📍 View on Map</a><br><span style="font-size: 11px; color: #64748B;">${data.shopLocations['shop_exterior'].lat.toFixed(5)}, ${data.shopLocations['shop_exterior'].lng.toFixed(5)}</span>` 
                           : '<span class="empty-text">Missing</span>'}
                      </td>
                    </tr>
                  </table>
                </div>
              </div>
            </div>

            ${data.additionalShops?.length ? `
              <div class="sub-heading">Additional Shops</div>
              ${data.additionalShops.map((s, i) => `
                <div class="table-wrapper" style="margin-bottom:10px;">
                  <table>
                    <tr><th>Shop ${i + 1} (${s.estYear})</th><td><strong>${s.shopName || '-'}</strong></td></tr>
                    <tr><th>Address</th><td>${s.address || '-'}<br><span style="color:#64748B; font-size:12px;">${s.village || '-'}, ${s.taluka || '-'}, ${s.city || '-'}, ${s.state || '-'}</span></td></tr>
                  </table>
                </div>
              `).join('')}
            ` : ''}

            ${data.godowns?.length ? `
              <div class="sub-heading">Storage / Godowns</div>
              ${data.godowns.map((g, i) => `
                <div class="table-wrapper" style="margin-bottom:10px;">
                  <table>
                    <tr><th>Godown ${i + 1}</th><td>Capacity: <strong>${g.capacity || '-'} ${g.capacityUnit || ''}</strong></td></tr>
                    <tr><th>Address</th><td>${g.address || '-'}</td></tr>
                  </table>
                </div>
              `).join('')}
            ` : ''}

            ${data.willingDemoFarmers === 'Yes' ? `
              <div class="sub-heading">Demo Farmers List</div>
              ${data.documents?.demo_farmers_list ? `
                <p style="margin:0 0 10px 0;"><span class="success-badge">${checkIcon} Media Uploaded (Available in digital records)</span></p>
              ` : `
                <div class="table-wrapper">
                  <table>
                    <tr style="background-color: #F1F5F9; font-weight: 600;"><td>Name</td><td>Contact</td><td>Address</td></tr>
                    ${data.demoFarmers?.filter(f => f.name).map(f => `<tr><td>${f.name}</td><td><span class="action-link">${f.contact}</span></td><td>${f.address}</td></tr>`).join('') || '<tr><td colspan="3" class="empty-text">No manual entries</td></tr>'}
                  </table>
                </div>
              `}
            ` : ''}
          </div>

          <div class="section page-break">
            <div class="section-title">4. Compliance & Media Attachments</div>
            
            <div class="grid-2">
              <div class="grid-col">
                <div class="sub-heading" style="margin-top:0;">GLS Commitments Accepted</div>
                <ul class="list">
                  ${data.glsCommitments?.map(c => `<li>${c}</li>`).join('') || '<li class="empty-text">None selected</li>'}
                </ul>
              </div>
              <div class="grid-col">
                <div class="sub-heading" style="margin-top:0;">Regulatory Documents Checked</div>
                <ul class="list">
                  ${data.complianceChecklist?.map(c => `<li>${c}</li>`).join('') || '<li class="empty-text">None selected</li>'}
                </ul>
              </div>
            </div>

            <div class="sub-heading">Uploaded Documents & Photos Status</div>
            <div class="table-wrapper">
              <table>
                ${Object.entries(data.documents || {}).filter(([k]) => k !== 'demo_farmers_list' && k !== 'se_payment_proof').map(([k, v]) => {
                  const title = k.toUpperCase().replace(/_/g, ' ');
                  if (Array.isArray(v)) {
                    return `<tr><th>${title}</th><td><span class="success-badge">${checkIcon} ${v.length} File(s) Uploaded</span></td></tr>`;
                  }
                  return `<tr><th>${title}</th><td><span class="success-badge">${checkIcon} Uploaded</span></td></tr>`;
                }).join('') || '<tr><td colspan="2" class="empty-text">No documents uploaded.</td></tr>'}
              </table>
            </div>
          </div>

          <div class="section page-break">
            <div class="section-title">5. Commercial Annexures (SE Evaluated)</div>
            
            <div class="sub-heading" style="margin-top:0;">Territory Coverage</div>
            <div class="table-wrapper">
              <table>
                <tr style="background-color: #F1F5F9; font-weight: 600;"><td>#</td><td>Location (Taluka, Village)</td><td>Cultivable Area</td><td>Major Crops</td></tr>
                ${data.seTerritories?.map((t, i) => `<tr><td>${i+1}</td><td><strong>${t.taluka}, ${t.village?.join(', ')}</strong></td><td>${t.cultivableArea} Acres</td><td>${t.majorCrops?.join(', ')}</td></tr>`).join('') || '<tr><td colspan="4" class="empty-text">No territories defined</td></tr>'}
              </table>
            </div>

            <div class="sub-heading">Business Portfolio & Expansion</div>
            <div class="table-wrapper">
              <table>
                <tr><th>Principal Suppliers</th><td>${data.sePrincipalSuppliers?.map(s => `<span class="pill">${s}</span>`).join('') || '<span class="empty-text">None</span>'}</td></tr>
                <tr><th>Chemical Range</th><td>${data.seChemicalProducts?.map(s => `<span class="pill">${s}</span>`).join('') || '<span class="empty-text">None</span>'}</td></tr>
                <tr><th>Bio/Organic Range</th><td>${data.seBioProducts?.map(s => `<span class="pill">${s}</span>`).join('') || '<span class="empty-text">None</span>'}</td></tr>
                <tr><th>Other Products</th><td>${data.seOtherProducts?.map(s => `<span class="pill">${s}</span>`).join('') || '<span class="empty-text">None</span>'}</td></tr>
                <tr><th>Will Share Sales Data?</th><td><strong>${data.seWillShareSales ? 'Yes, Confirmed' : 'Not Confirmed'}</strong></td></tr>
                <tr><th>2-Year Growth Vision</th><td>${data.seGrowthVision || '<span class="empty-text">No text provided</span>'} ${data.seGrowthVisionAudio ? `<br><span class="success-badge">${checkIcon} Audio Recorded</span>` : ''}</td></tr>
              </table>
            </div>

            <div class="sub-heading">Credit References & Security</div>
            <div class="table-wrapper">
              <table>
                <tr>
                  <th>Credit References</th>
                  <td>
                    ${data.seHasCreditReferences === 'Yes' ? data.seCreditReferences?.map((r, i) => `
                      <div style="margin-bottom:8px; border-bottom:1px solid #E2E8F0; padding-bottom:8px;">
                        <strong>${i+1}. ${r.name} (<span class="action-link">${r.contact}</span>)</strong><br>
                        <span style="color:#64748B; font-size:13px;">${r.behavior || 'No text behavior'} ${r.behaviorAudio ? `| <span class="success-badge">${checkIcon} Audio Recorded</span>` : ''}</span>
                      </div>
                    `).join('') : '<span class="empty-text">No references provided</span>'}
                  </td>
                </tr>
                <tr><th>Security Deposit</th><td><strong>₹ ${data.seSecurityDeposit || '0'}</strong></td></tr>
                
                ${data.seSecurityDeposit && parseInt(data.seSecurityDeposit || '0') > 0 ? `
                  <tr><th>Payment Txn/Cheque No.</th><td>${data.sePaymentProofText || '<span class="empty-text">Not Provided</span>'}</td></tr>
                  <tr><th>Payment Media Proof</th><td>${data.documents?.se_payment_proof ? `<span class="success-badge">${checkIcon} Uploaded</span>` : '<span class="empty-text">Not Provided</span>'}</td></tr>
                ` : ''}
              </table>
            </div>
          </div>

          <div class="page-break" style="page-break-inside: avoid;">
            <div style="background-color: #F8FAFC; padding: 20px; border-radius: 8px; border: 1px solid #E2E8F0;">
              <h3 style="font-size: 16px; font-weight: 900; color: #16A34A; margin-top: 0; margin-bottom: 16px; text-align: center; text-decoration: underline;">General Terms & Conditions</h3>
              
              <p style="font-size: 13px; line-height: 22px; color: #64748B; margin: 0 0 12px 0;">
                <strong style="font-weight: 800; color: #1E293B;">1. Territory: </strong>The Dealer shall operate primarily in the area mentioned in Annexure A and agrees not to actively sell GLS products outside the agreed area without prior approval.
              </p>
              
              <p style="font-size: 13px; line-height: 22px; color: #64748B; margin: 0 0 12px 0;">
                <strong style="font-weight: 800; color: #1E293B;">2. Status & Focus: </strong>As an Authorised Dealer, the Dealer can directly honour GLS farmer schemes and Farm Card discounts. As an Exclusive Dealer, the Dealer shall focus primarily on GLS biological products.
              </p>
              
              <p style="font-size: 13px; line-height: 22px; color: #64748B; margin: 0 0 12px 0;">
                <strong style="font-weight: 800; color: #1E293B;">3. Payment Terms: </strong>Payment to be made to the linked Distributor as per mutually agreed terms. Delayed payments may result in temporary suspension of supplies.
              </p>
              
              <p style="font-size: 13px; line-height: 22px; color: #64748B; margin: 0 0 12px 0;">
                <strong style="font-weight: 800; color: #1E293B;">4. Security Deposit: </strong>
                ${data.seSecurityDeposit && parseInt(data.seSecurityDeposit || '0') > 0 
                  ? `A refundable security deposit of ₹ ${data.seSecurityDeposit} has been agreed upon. Payment Reference: ${data.sePaymentProofText || (data.documents?.se_payment_proof ? '[Media Uploaded]' : 'Pending')}.` 
                  : 'No security deposit is required at this time.'}
              </p>

              <p style="font-size: 13px; line-height: 22px; color: #64748B; margin: 0 0 12px 0;">
                <strong style="font-weight: 800; color: #1E293B;">5. Support & Obligations: </strong>GLS will provide technical support, Farm Cards, and promotional material. The Dealer must promote GLS products, allow Field Executives to engage with farmers, and maintain valid FCO/Insecticide licenses.
              </p>

              <p style="font-size: 13px; line-height: 22px; color: #64748B; margin: 0 0 12px 0;">
                <strong style="font-weight: 800; color: #1E293B;">6. Data Sharing & Confidentiality: </strong>The Dealer agrees to share farmer details, crop history, and sales records strictly for the purpose of technical support and loyalty programs. Both parties shall keep all shared information confidential.
              </p>

              <p style="font-size: 13px; line-height: 22px; color: #64748B; margin: 0 0 12px 0;">
                <strong style="font-weight: 800; color: #1E293B;">7. Termination & Jurisdiction: </strong>Either party may terminate with 30 days' written notice. Disputes shall be subject to the exclusive jurisdiction of courts in Vadodara, Gujarat.
              </p>

              <div style="background-color: #E2E8F0; padding: 12px; border-radius: 6px; margin-top: 16px; border-left: 3px solid #16A34A;">
                <div style="font-weight: 900; color: #16A34A; margin-bottom: 6px; font-size: 14px;">I/We formally agree to:</div>
                <div style="font-size: 13px; line-height: 22px; color: #1E293B; font-weight: 600;">
                  • Promote GLS biological inputs following recommended packages.<br>
                  • Allow GLS field team to engage with my farmers for support.<br>
                  • Honour loyalty program and Farm Card benefits.<br>
                  • Maintain proper storage and display for GLS products.
                </div>
              </div>
            </div>

            <div class="signatures">
              <div class="sig-box">
                ${renderSignature(data.dealerSignature)}
                <div class="sig-line">Authorised Dealer Signature</div>
              </div>
              <div class="sig-box">
                ${renderSignature(data.seSignature)}
                <div class="sig-line">Sales Executive Signature</div>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 40px; color: #94A3B8; font-size: 12px; border-top: 1px solid #E2E8F0;">
              This document and its annexures constitute a formal record of the dealer evaluation and initial MoU.<br>
              <strong>Agreement Acceptance:</strong> ${data.agreementAccepted ? 'Digitally accepted by Dealer' : 'Pending Acceptance'}
            </div>

          </div>
        </div>
      </body>
      </html>
    `;
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
        useAlertStore.getState().showAlert(
          "File Too Large", 
          `This document is ${fileSizeInMB.toFixed(1)}MB. Please select a file smaller than 5MB.`
        );
        return; 
      }
    }
    
    const uri = asset.uri;
    const isCameraOrImage = type === 'camera' || type === 'image';
    setUploading(prev => ({ ...prev, [key]: true }));
    
    let location: any = null;
    const requiresGPS = ['shop_interior', 'shop_exterior', 'shop_godown'].includes(key);
    
    if (requiresGPS) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { 
        useAlertStore.getState().showAlert("GPS Required", "GPS location is required when capturing shop photos."); 
        setUploading(prev => ({ ...prev, [key]: false }));
        return; 
      }
      location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    }
  
    try {
      let finalUri = uri;

      if (isCameraOrImage) {
        const manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1024 } }], 
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG } 
        );
        finalUri = manipResult.uri;
      }

      const url = await uploadFileToCloudinary(finalUri, isCameraOrImage ? 'image' : 'raw');
      const currentDocs = form.getValues('documents') || {};
      
      if (['shop_interior', 'shop_exterior', 'shop_godown'].includes(key)) {
        const existingArray = Array.isArray(currentDocs[key]) ? currentDocs[key] : (currentDocs[key] ? [currentDocs[key]] : []);
        form.setValue('documents', { ...currentDocs, [key]: [...existingArray, url] }, { shouldValidate: true });
      } else {
        form.setValue('documents', { ...currentDocs, [key]: url }, { shouldValidate: true });
      }
      
      if (location) {
        const currentLocs = form.getValues('shopLocations') || {};
        form.setValue('shopLocations', { 
          ...currentLocs, 
          [key]: { lat: location.coords.latitude, lng: location.coords.longitude } 
        }, { shouldValidate: true });
      }
    } catch(e) {
      useAlertStore.getState().showAlert("Error", "Upload failed.");
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }));
    }
  };

  const generatePDF = async () => {
    const html = generateHTML();
    const data = form.getValues();
    
    const rawShopName = data.shopName ? data.shopName.replace(/[^a-zA-Z0-9]/g, '_') : 'Dealer';
    const finalFileName = `${rawShopName}_Dossier.pdf`;

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

  // 🚀 HARD LOCK REFERENCE TO PREVENT DOUBLE TAPS
  const submitLockedRef = useRef(false);

  const submit = async () => {
    if (submitLockedRef.current) return;
    
    const check = checkRestrictions();
    if (!check.pass) return useAlertStore.getState().showAlert("Restricted Action", check.error);
    const missingSteps = validationStatus.filter(v => !v.isValid).map(v => v.name);
    
    if (missingSteps.length > 0) {
      useAlertStore.getState().showAlert("Missing Information", "Please complete the following sections before submitting:\n\n• " + missingSteps.join("\n• "));
      return; 
    }

    await form.handleSubmit(async (data) => {
      if (!user?.id) return useAlertStore.getState().showAlert("Error", "User session not found.");
      
      if (submitLockedRef.current) return;
      submitLockedRef.current = true;
      setIsSubmitting(true);

      try {
        // 🚀 1. GENERATE PDF FIRST
        useAlertStore.getState().showAlert("Processing", "Generating and securing PDF dossier...");
        const html = generateHTML();
        const { uri } = await Print.printToFileAsync({ html });
        const pdfUrl = await uploadFileToCloudinary(uri, 'raw');

        // 🚀 2. SAVE ATOMICALLY
        useAlertStore.getState().showAlert("Saving", "Uploading complete profile to database...");
        const dbResult = await saveDealerOnboarding(data, "SUBMITTED", scoreData.percentage, scoreData.band, user.id, editData?.id || fetchedRecordId, check.dirtyKeys, pdfUrl);
        
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

        await useShiftStore.getState().logShiftEvent('activity', (editData || fetchedRecordId) ? 'Updated Dealer Profile' : 'Onboarded Dealer', eventDesc);
        
        // 🚀 3. DELETE DRAFT
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
        submitLockedRef.current = false;
        setIsSubmitting(false);
      }
    })();
  };

  return { form, step, setStep, jumpBackTo, setJumpBackTo, saveDraft, submit, scoreData, handleUpload, handleAudioUpload, uploading, isSubmitting, isNextEnabled, showSuccess, setShowSuccess, generatePDF, isEditing: !!editData || !!fetchedRecordId, saveAndExit, isLocked };
}