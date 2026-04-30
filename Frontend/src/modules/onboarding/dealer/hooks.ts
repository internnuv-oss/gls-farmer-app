import { useState, useMemo , useRef , useEffect} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Location from 'expo-location';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { AppState } from "react-native";


import { requestMediaPermission, requestCameraPermission } from "../../../core/permissions";
import { useDraftStore } from "../../../store/draftStore";
import { useAuthStore } from "../../../store/authStore";
import { uploadFileToCloudinary } from "../services/cloudinaryService";
import { saveDealerOnboarding, mapDealerDbToForm, updateDealerPdfUrl } from "../services/onboardingService";
import { dealerOnboardingSchema, DealerOnboardingValues, GLS_COMMITMENTS } from "./schema";

export function useDealerOnboarding(navigation: any, route: any) {
  const user = useAuthStore((s) => s.user);
  const addDraft = useDraftStore((s) => s.addDraft);
  const updateDraft = useDraftStore((s) => s.updateDraft);
  const removeDraft = useDraftStore((s) => s.removeDraft);

  const editData = route?.params?.editData; 
  const draftData = route?.params?.draftData;
  const draftId = route?.params?.draftId;

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const draftIdRef = useRef(draftId);


  const autoSave = () => {
    const currentValues = form.getValues();
    if (!currentValues.shopName) return;
    if (editData) return; // Don't auto-save if we are editing a SUBMITTED profile

    if (draftIdRef.current) {
      updateDraft(draftIdRef.current, currentValues);
    } else {
      const newId = Date.now().toString();
      draftIdRef.current = newId;
      addDraft(currentValues, newId);
    }
  };

  useEffect(() => {
    // Save when app is pushed to the background
    const subscription = AppState.addEventListener("change", nextAppState => {
      if (nextAppState === "inactive" || nextAppState === "background") {
        autoSave();
      }
    });

    // Save when user abruptly navigates away
    return () => {
      subscription.remove();
      if (!showSuccess) autoSave(); // Don't save a draft if they just successfully submitted it
    };
  }, [showSuccess, editData]);

  const saveDraft = () => {
    autoSave();
    Alert.alert("Saved", "Dealer onboarding saved as draft.");
    navigation.goBack();
  };
  


  const defaultFormValues = editData 
    ? mapDealerDbToForm(editData)
    : (draftData ? draftData : {
        // Step 1: Basic Info
        shopName: '', firmType: '', estYear: '', state: '', city: '', taluka: '', village: [], address: '', landmark: '',
        contactMobile: '', landlineNumber: '', gstNumber: '', panNumber: '',
        owners: [{ name: '' }], 
        bankAccounts: [{ accountType: '', bankName: '', bankBranch: '', accountName: '', accountNumber: '', bankIfsc: '' }],
        
        // Step 2: Scoring
        scoreFinancial: 5, scoreReputation: 5, scoreOperations: 5, scoreFarmerNetwork: 5,
        scoreTeam: 5, scorePortfolio: 5, scoreExperience: 5, scoreGrowth: 5,
        
        // Step 3: Business Details & Additional Locations
        hasAdditionalLocations: undefined, 
        additionalShops: [], 
        godowns: [], 
        isLinkedToDistributor: undefined, 
        linkedDistributors: [{ name: '', contact: '' }],
        proposedStatus: '', 
        willingDemoFarmers: undefined,
        demoFarmers: Array(5).fill({ name: '', contact: '', address: '' }),
        
        // Steps 4, 5, 6: Checklists & Media
        glsCommitments: [], 
        complianceChecklist: [], 
        documents: {}, 
        shopLocations: {}, // UPDATED: Changed from shopLocation: undefined
        
        // Step 7: Annexures
        seTerritories: [{ taluka: '', village: [], cultivableArea: '', majorCrops: [] }], 
        sePrincipalSuppliers: [], 
        seChemicalProducts: [], 
        seBioProducts: [], 
        seOtherProducts: [], 
        seHasCreditReferences: undefined,
        seCreditReferences: [{ name: '', contact: '', behavior: '', behaviorAudio: '' }],
        seWillShareSales: false, 
        seGrowthVision: '', 
        seGrowthVisionAudio: '', 
        seSecurityDeposit: '', 
        sePaymentProofText: '',
        
        // Step 8: Agreement
        agreementAccepted: false,
        dealerSignature: '', 
        seSignature: ''
      });

  const form = useForm<DealerOnboardingValues>({
    resolver: zodResolver(dealerOnboardingSchema),
    defaultValues: defaultFormValues as DealerOnboardingValues,
    mode: 'onChange'
  });

  const { watch } = form;
  const values = watch();

  const isNextEnabled = useMemo(() => {
    if (step === 1) {
      // 1. Basic Regex Patterns (Matches schema.ts)
      const mobileRegex = /^\d{10}$/;
      const landlineRegex = /^[0-9]{3,5}[- ]?[0-9]{6,8}$/;
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      const bankAccRegex = /^\d{9,18}$/;

      // 2. Validate Arrays (Owners and Bank Accounts)
      const areOwnersValid = values.owners?.every(o => o.name && o.name.length >= 2);
      
      const areBanksValid = values.bankAccounts?.every(b => 
        b.accountType && 
        b.bankName && 
        b.bankBranch && 
        b.accountName && 
        bankAccRegex.test(b.accountNumber || '') && 
        ifscRegex.test(b.bankIfsc || '')
      );

      // 3. Optional Landline Check
      const isLandlineValid = !values.landlineNumber || landlineRegex.test(values.landlineNumber);

      // 4. Combined Validation
      return !!(
        values.shopName && values.shopName.length >= 2 &&
        values.firmType &&
        values.estYear && values.estYear.length === 4 &&
        areOwnersValid &&
        mobileRegex.test(values.contactMobile || '') &&
        isLandlineValid &&
        values.state && values.city && values.taluka && values.village &&
        values.address && values.address.length >= 5 &&
        gstRegex.test(values.gstNumber || '') &&
        panRegex.test(values.panNumber || '') &&
        areBanksValid
      );
    }
    if (step === 2) return true; 
    if (step === 3) {
      // 1. Distributor Validation
      const distValid = values.isLinkedToDistributor === 'No' || (
        values.isLinkedToDistributor === 'Yes' && 
        values.linkedDistributors?.[0]?.name && 
        /^\d{10}$/.test(values.linkedDistributors?.[0]?.contact || '')
      );

      // 2. Additional Locations Validation
      // If "Yes", at least one shop OR one godown must exist, and all provided must be valid.
      const hasAtLeastOneLocation = (values.additionalShops?.length || 0) > 0 || (values.godowns?.length || 0) > 0;
      
      const additionalShopsValid = (values.additionalShops || []).every(s => 
        s.shopName && s.estYear && s.state && s.city && s.taluka && s.village && s.address
      );
      
      const godownsValid = (values.godowns || []).every(g => 
        g.address && g.capacity && g.capacityUnit
      );

      const addLocValid = values.hasAdditionalLocations === 'No' || (
        values.hasAdditionalLocations === 'Yes' && 
        hasAtLeastOneLocation && 
        additionalShopsValid && 
        godownsValid
      );

      // 3. Demo Farmers Validation
      // If "Yes", must either have an uploaded list OR at least one manual entry filled correctly.
      const hasFarmerFile = !!values.documents?.['demo_farmers_list'];
      const manualFarmersValid = (values.demoFarmers || []).some(f => 
        f.name && f.contact && f.address
      );

      const demoFarmersValid = values.willingDemoFarmers === 'No' || (
        values.willingDemoFarmers === 'Yes' && 
        (hasFarmerFile || manualFarmersValid)
      );

      // 4. Combined Step 3 Check
      return !!(
        values.isLinkedToDistributor && 
        distValid && 
        values.hasAdditionalLocations &&
        addLocValid && 
        values.proposedStatus && 
        values.willingDemoFarmers && 
        demoFarmersValid
      );
    }
    if (step === 4) return Array.isArray(values.glsCommitments) && values.glsCommitments.length === GLS_COMMITMENTS.length; 
    if (step === 5) return true; 
    if (step === 6) {
      const requiredKeys = ['gst certificate / shop establishment license', 'pan card', 'cancelled cheque', 'shop_exterior', 'selfie_with_owner'];
      const dynamicKeys = (values.complianceChecklist || []).map((item: string) => item.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase());
      const allRequired = [...requiredKeys, ...dynamicKeys];
      
      // UPDATED: Check for specific exterior GPS coordinates instead of a single object
      return allRequired.every(key => { 
        const doc = values.documents?.[key]; 
        return Array.isArray(doc) ? doc.length > 0 : !!doc; 
      }) && !!values.shopLocations?.['shop_exterior']; 
    }
    
    // ---> NEW STEP 7 (SE ANNEXURE) VALIDATION <---
    if (step === 7) {
      const validCreditRefs = values.seHasCreditReferences !== 'Yes' || (
        values.seHasCreditReferences === 'Yes' && 
        values.seCreditReferences && values.seCreditReferences.length > 0 && 
        values.seCreditReferences.every(ref => 
          (ref.name?.length ?? 0) >= 2 && (ref.contact?.length ?? 0) === 10
        )
      );
      
      const validTerritories = values.seTerritories?.length > 0 && values.seTerritories.every(t => t.taluka && t.village?.length > 0 && t.cultivableArea && t.majorCrops?.length > 0);

      // ---> NEW: Check if payment proof is valid <---
      const securityDepositVal = parseInt(values.seSecurityDeposit || '0');
      const hasPaymentProof = securityDepositVal === 0 || (
        securityDepositVal > 0 && 
        (!!values.sePaymentProofText || !!values.documents?.['se_payment_proof'])
      );

      return !!(
        validTerritories && 
        values.sePrincipalSuppliers?.length > 0 && 
        values.seChemicalProducts?.length > 0 && 
        values.seBioProducts?.length > 0 && 
        values.seOtherProducts?.length > 0 && 
        validCreditRefs &&
        hasPaymentProof // <-- Block 'Next' button if false
      );
    }
    if (step === 8) return !!(values.agreementAccepted && values.dealerSignature && values.seSignature);
    
    return true; // Step 9
  }, [step, values]);

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
      Alert.alert("Error", "Audio upload failed.");
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }));
    }
  };

  const generateHTML = () => {
    const data = form.getValues();
    const dateValue = editData?.created_at || new Date().toISOString();
    const dateObj = new Date(dateValue);
    const dateStr = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    // Helper to open documents in a native-like viewer instead of raw Cloudinary downloads
    const getNativeViewerUrl = (url?: string) => {
      if (!url) return '#';
      // Route documents (PDF, Excel, Word) through Google Docs Viewer for an in-built reading experience
      if (url.match(/\.(pdf|doc|docx|xls|xlsx|csv)$/i)) {
        return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
      }
      // Return raw URL for images/audio as mobile browsers already use native media viewers for these
      return url;
    };

    const renderSignature = (sigData?: string) => {
      if (!sigData) return '<span style="color:red">No Signature</span>';
      try {
        const strokes = JSON.parse(sigData);
        const toPath = (points: any[]) => {
          if (points.length === 0) return '';
          return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
        };
        const paths = strokes.map((pts: any[]) => `<path d="${toPath(pts)}" stroke="#16A34A" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round" />`).join('');
        return `<svg viewBox="0 0 400 250" style="width: 100%; max-width: 250px; height: 80px;">${paths}</svg>`;
      } catch (e) {
        return '<span style="color:red">Invalid Signature Format</span>';
      }
    };

    const bandColor = scoreData.band === 'Elite' ? '#166534' : scoreData.band === 'A-Category' ? '#15803D' : scoreData.band === 'B-Category' ? '#92400E' : '#991B1B';
    const bandBg = scoreData.band === 'Elite' ? '#DCFCE7' : scoreData.band === 'A-Category' ? '#BBF7D0' : scoreData.band === 'B-Category' ? '#FEF3C7' : '#FEE2E2';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
          
          /* Set consistent margins for print layout */
          @page {
            margin: 20mm; 
            size: A4;
          }

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
          .sig-img { max-height: 80px; max-width: 200px; margin-bottom: 10px; }
          
          a { color: #2563EB; text-decoration: none; font-weight: 600; }
          .empty-text { color: #94A3B8; font-style: italic; font-weight: 400; }
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
                <tr><th>Contact Numbers</th><td>+91 ${data.contactMobile || '-'} ${data.landlineNumber ? `<br><span style="color:#64748B; font-size:12px;">Landline: ${data.landlineNumber}</span>` : ''}</td></tr>
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
                <tr><th>Financial Health</th><td style="text-align: center; font-weight: 800;">${data.scoreFinancial}/10</td><td>${data.remFinancial || '<span class="empty-text">No text remarks</span>'} ${data.audioFinancial ? `<br><a href="${data.audioFinancial}">▶ Play Audio</a>` : ''}</td></tr>
                <tr><th>Market Reputation</th><td style="text-align: center; font-weight: 800;">${data.scoreReputation}/10</td><td>${data.remReputation || '<span class="empty-text">No text remarks</span>'} ${data.audioReputation ? `<br><a href="${data.audioReputation}">▶ Play Audio</a>` : ''}</td></tr>
                <tr><th>Operations & Infra</th><td style="text-align: center; font-weight: 800;">${data.scoreOperations}/10</td><td>${data.remOperations || '<span class="empty-text">No text remarks</span>'} ${data.audioOperations ? `<br><a href="${data.audioOperations}">▶ Play Audio</a>` : ''}</td></tr>
                <tr><th>Farmer Network</th><td style="text-align: center; font-weight: 800;">${data.scoreFarmerNetwork}/10</td><td>${data.remFarmerNetwork || '<span class="empty-text">No text remarks</span>'} ${data.audioFarmerNetwork ? `<br><a href="${data.audioFarmerNetwork}">▶ Play Audio</a>` : ''}</td></tr>
                <tr><th>Team & Professionalism</th><td style="text-align: center; font-weight: 800;">${data.scoreTeam}/10</td><td>${data.remTeam || '<span class="empty-text">No text remarks</span>'} ${data.audioTeam ? `<br><a href="${data.audioTeam}">▶ Play Audio</a>` : ''}</td></tr>
                <tr><th>Portfolio Alignment</th><td style="text-align: center; font-weight: 800;">${data.scorePortfolio}/10</td><td>${data.remPortfolio || '<span class="empty-text">No text remarks</span>'} ${data.audioPortfolio ? `<br><a href="${data.audioPortfolio}">▶ Play Audio</a>` : ''}</td></tr>
                <tr><th>Experience</th><td style="text-align: center; font-weight: 800;">${data.scoreExperience}/10</td><td>${data.remExperience || '<span class="empty-text">No text remarks</span>'} ${data.audioExperience ? `<br><a href="${data.audioExperience}">▶ Play Audio</a>` : ''}</td></tr>
                <tr><th>Growth Orientation</th><td style="text-align: center; font-weight: 800;">${data.scoreGrowth}/10</td><td>${data.remGrowth || '<span class="empty-text">No text remarks</span>'} ${data.audioGrowth ? `<br><a href="${data.audioGrowth}">▶ Play Audio</a>` : ''}</td></tr>
                <tr>
                  <th style="color:#DC2626;">Red Flags Noted</th>
                  <td colspan="2" style="color:#DC2626; font-weight:bold;">${data.redFlags || 'None Reported'} ${data.audioRedFlags ? `<br><a style="color:#DC2626;" href="${data.audioRedFlags}">▶ Play Audio Alert</a>` : ''}</td>
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
                    <tr><th>Linked Distributor</th><td>${data.isLinkedToDistributor === 'Yes' ? data.linkedDistributors?.map(d => `${d.name} (${d.contact})`).join('<br>') : 'No'}</td></tr>
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
                          ? `${data.shopLocations['shop_exterior'].lat.toFixed(5)}, ${data.shopLocations['shop_exterior'].lng.toFixed(5)}` 
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
                <p style="margin:0 0 10px 0;"><a href="${getNativeViewerUrl(data.documents.demo_farmers_list)}" target="_blank">📄 View Uploaded Farmer List</a></p>
              ` : `
                <div class="table-wrapper">
                  <table>
                    <tr style="background-color: #F1F5F9; font-weight: 600;"><td>Name</td><td>Contact</td><td>Address</td></tr>
                    ${data.demoFarmers?.filter(f => f.name).map(f => `<tr><td>${f.name}</td><td>${f.contact}</td><td>${f.address}</td></tr>`).join('') || '<tr><td colspan="3" class="empty-text">No manual entries</td></tr>'}
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

            <div class="sub-heading">Uploaded Documents & Photos</div>
            <div class="table-wrapper">
              <table>
                ${Object.entries(data.documents || {}).filter(([k]) => k !== 'demo_farmers_list' && k !== 'se_payment_proof').map(([k, v]) => {
                  const title = k.toUpperCase().replace(/_/g, ' ');
                  if (Array.isArray(v)) {
                    return `<tr><th>${title}</th><td>${v.map((url, i) => `<a href="${getNativeViewerUrl(url)}" target="_blank" style="margin-right:15px;">File ${i + 1}</a>`).join('')}</td></tr>`;
                  }
                  return `<tr><th>${title}</th><td><a href="${getNativeViewerUrl(v)}" target="_blank">View File</a></td></tr>`;
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
                <tr><th>2-Year Growth Vision</th><td>${data.seGrowthVision || '<span class="empty-text">No text provided</span>'} ${data.seGrowthVisionAudio ? `<br><a href="${data.seGrowthVisionAudio}">▶ Play Audio</a>` : ''}</td></tr>
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
                        <strong>${i+1}. ${r.name} (${r.contact})</strong><br>
                        <span style="color:#64748B; font-size:13px;">${r.behavior || 'No text behavior'} ${r.behaviorAudio ? `| <a href="${r.behaviorAudio}">▶ Audio</a>` : ''}</span>
                      </div>
                    `).join('') : '<span class="empty-text">No references provided</span>'}
                  </td>
                </tr>
                <tr><th>Security Deposit</th><td><strong>₹ ${data.seSecurityDeposit || '0'}</strong></td></tr>
                ${data.seSecurityDeposit && parseInt(data.seSecurityDeposit || '0') > 0 ? `
                  <tr><th>Payment Txn/Cheque No.</th><td>${data.sePaymentProofText || '<span class="empty-text">Not Provided</span>'}</td></tr>
                  <tr><th>Payment Media Proof</th><td>${data.documents?.se_payment_proof ? `<a href="${getNativeViewerUrl(data.documents.se_payment_proof)}" target="_blank">View Uploaded Proof</a>` : '<span class="empty-text">Not Provided</span>'}</td></tr>
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
                  ? `A refundable security deposit of ₹${data.seSecurityDeposit} has been agreed upon. Payment Reference: ${data.sePaymentProofText || (data.documents?.se_payment_proof ? '[Media Uploaded]' : 'Pending')}.`
                  : 'No security deposit is required at this time.'}
              </p>

              <p style="font-size: 13px; line-height: 22px; color: #64748B; margin: 0 0 12px 0;">
                <strong style="font-weight: 800; color: #1E293B;">5. Support & Obligations: </strong>GLS will provide technical support, Farm Cards, and promotional material. The Dealer must promote GLS products, allow Field Executives to engage with farmers, and maintain valid FCO/Insecticide licenses.
              </p>

              <p style="font-size: 13px; line-height: 22px; color: #64748B; margin: 0 0 12px 0;">
                <strong style="font-weight: 800; color: #1E293B;">6. Data Sharing & Confidentiality: </strong>The Dealer agrees to share farmer details, crop history, and sales records strictly for the purpose of technical support and loyalty programs. Both parties shall keep all shared information confidential.
              </p>

              <p style="font-size: 13px; line-height: 22px; color: #64748B; margin: 0 0 12px 0;">
                <strong style="font-weight: 800; color: #1E293B;">7. Termination & Jurisdiction: </strong>Either party may terminate with 30 days’ written notice. Disputes shall be subject to the exclusive jurisdiction of courts in Vadodara, Gujarat.
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

  const submit = form.handleSubmit(
    async (data) => {
      if (!user?.id) return Alert.alert("Error", "User session not found.");
      setIsSubmitting(true);
      try {
        const dbResult = await saveDealerOnboarding(data, "SUBMITTED", scoreData.percentage, scoreData.band, user.id, editData?.id);
        const html = generateHTML();
        const { uri } = await Print.printToFileAsync({ html });
        const pdfUrl = await uploadFileToCloudinary(uri, 'raw');
        await updateDealerPdfUrl(dbResult.id, pdfUrl);

        if (draftId) removeDraft(draftId);
        setShowSuccess(true);
      } catch (error: any) {
        Alert.alert("Submission Failed", error.message);
      } finally {
        setIsSubmitting(false);
      }
    },
    (errors) => {
      // ---> NEW: THIS CATCHES THE SILENT VALIDATION FAILURES! <---
      console.log("Validation Errors: ", errors);
      const messages = new Set<string>();
      
      const extractErrors = (obj: any) => {
        for (const key in obj) {
          if (obj[key]?.message) {
            messages.add(obj[key].message);
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            extractErrors(obj[key]);
          }
        }
      };
      
      extractErrors(errors);
      
      Alert.alert(
        "Validation Error", 
        "The form has invalid formatting. Please go back and fix the following:\n\n" + 
        Array.from(messages).map(m => `• ${m}`).join('\n')
      );
    }
  );

  const handleUpload = async (key: string, type: 'camera' | 'image' | 'doc' = 'doc') => {
    const useCamera = type === 'camera' || type === 'image';
    const perm = useCamera ? await requestCameraPermission() : await requestMediaPermission();
    if (!perm.granted) return Alert.alert("Permission Denied", perm.fallbackMessage);
  
    let result = useCamera ? await ImagePicker.launchCameraAsync({ quality: 0.7 }) : await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (result.canceled) return;
    
    const uri = result.assets[0].uri;
    setUploading(prev => ({ ...prev, [key]: true }));
    
    let location: any = null;
    const requiresGPS = ['shop_interior', 'shop_exterior', 'shop_godown'].includes(key);
    
    if (requiresGPS) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { 
        Alert.alert("GPS Required", "GPS location is required when capturing shop photos."); 
        setUploading(prev => ({ ...prev, [key]: false }));
        return; 
      }
      location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    }
  
    try {
      const url = await uploadFileToCloudinary(uri, useCamera ? 'image' : 'raw');
      const currentDocs = form.getValues('documents') || {};
      
      if (['shop_interior', 'shop_exterior', 'shop_godown'].includes(key)) {
        const existingArray = Array.isArray(currentDocs[key]) ? currentDocs[key] : (currentDocs[key] ? [currentDocs[key]] : []);
        form.setValue('documents', { ...currentDocs, [key]: [...existingArray, url] }, { shouldValidate: true });
      } else {
        form.setValue('documents', { ...currentDocs, [key]: url }, { shouldValidate: true });
      }
      
      // UPDATED: Store GPS by its specific key (exterior, interior, or godown)
      if (location) {
        const currentLocs = form.getValues('shopLocations') || {};
        form.setValue('shopLocations', { 
          ...currentLocs, 
          [key]: { lat: location.coords.latitude, lng: location.coords.longitude } 
        }, { shouldValidate: true });
      }
    } catch(e) {
      Alert.alert("Error", "Upload failed.");
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }));
    }
  };

  const generatePDF = async () => {
    const html = generateHTML();
    const data = form.getValues();
    
    // Create a safe, standardized file name from the shop name
    const rawShopName = data.shopName ? data.shopName.replace(/[^a-zA-Z0-9]/g, '_') : 'Dealer';
    const finalFileName = `${rawShopName}_Dossier.pdf`;

    try {
      // Print HTML into a temporary default PDF URI
      const { uri } = await Print.printToFileAsync({ html });
      
      const fs: any = FileSystem;
      const baseDir = fs.cacheDirectory || fs.documentDirectory;
      
      // If we are on Native (iOS/Android) and have a valid directory, rename it
      if (baseDir && Platform.OS !== 'web') {
        const renamedUri = `${baseDir}${finalFileName}`;
        
        await fs.copyAsync({
          from: uri,
          to: renamedUri
        });
        
        // Share the freshly named file
        await Sharing.shareAsync(renamedUri, { 
          UTI: '.pdf', 
          mimeType: 'application/pdf',
          dialogTitle: `Share ${finalFileName}`
        });
      } else {
        // FALLBACK: If FileSystem is unavailable (e.g., Web browser), 
        // just share/download the original URI directly.
        await Sharing.shareAsync(uri, { 
          UTI: '.pdf', 
          mimeType: 'application/pdf',
          dialogTitle: `Share Dealer Dossier`
        });
      }

    } catch (error) {
      console.error("Error renaming or sharing PDF:", error);
      Alert.alert("Error", "Could not generate or share the PDF file.");
    }
  };

  return { form, step, setStep, saveDraft, submit, scoreData, handleUpload, handleAudioUpload, uploading, isSubmitting, isNextEnabled, showSuccess, setShowSuccess, generatePDF, isEditing: !!editData };
}