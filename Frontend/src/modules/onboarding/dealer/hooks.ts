import { useState, useMemo , useRef , useEffect} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Location from 'expo-location';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
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
    if (!currentValues.shopName) return; // Don't save if form is basically empty
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
        scoreFinancial: 5, scoreReputation: 5, scoreOperations: 5, scoreFarmerNetwork: 5,
        scoreTeam: 5, scorePortfolio: 5, scoreExperience: 5, scoreGrowth: 5,
        glsCommitments: [], complianceChecklist: [], agreementAccepted: false,
        documents: {}, linkedDistributors: [{ name: '', contact: '' }], majorCrops: [],
        seTalukasCovered: [], seVillagesCovered: [], seMajorCrops: [], sePrincipalSuppliers: [], 
        seChemicalProducts: [], seBioProducts: [], seOtherProducts: [], seWillShareSales: false,
        seTotalCultivableAreaUnit: 'Acres', seGodownCapacityUnit: 'Sq.ft',
      });

  const form = useForm<DealerOnboardingValues>({
    resolver: zodResolver(dealerOnboardingSchema),
    defaultValues: defaultFormValues as DealerOnboardingValues,
    mode: 'onChange'
  });

  const { watch } = form;
  const values = watch();

  const isNextEnabled = useMemo(() => {
    if (step === 1) return !!(values.shopName && values.ownerName && values.contactMobile?.length === 10 && values.address && values.state && values.city && values.taluka && values.village && values.gstNumber && values.panNumber && values.estYear && values.firmType && values.bankAccountName && values.bankAccountNumber && values.bankIfsc && values.bankName && values.bankBranch);
    if (step === 2) return true; 
    if (step === 3) {
      const distValid = values.isLinkedToDistributor === 'No' || (values.isLinkedToDistributor === 'Yes' && values.linkedDistributors?.[0]?.name && values.linkedDistributors?.[0]?.contact?.length === 10);
      return !!(values.isLinkedToDistributor && distValid && values.majorCrops?.length > 0 && values.proposedStatus && values.willingDemoFarmers);
    }
    if (step === 4) return Array.isArray(values.glsCommitments) && values.glsCommitments.length === GLS_COMMITMENTS.length; 
    if (step === 5) return true; 
    if (step === 6) {
      const requiredKeys = ['gst certificate / shop establishment license', 'pan card', 'cancelled cheque', 'shop_exterior', 'selfie_with_owner'];
      const dynamicKeys = (values.complianceChecklist || []).map((item: string) => item.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase());
      const allRequired = [...requiredKeys, ...dynamicKeys];
      return allRequired.every(key => { const doc = values.documents?.[key]; return Array.isArray(doc) ? doc.length > 0 : !!doc; }) && !!values.shopLocation;
    }
    
    // ---> NEW STEP 7 (SE ANNEXURE) VALIDATION <---
    if (step === 7) {
      const validCreditRefs = values.seHasCreditReferences !== 'Yes' || (
        values.seHasCreditReferences === 'Yes' && 
        values.seCreditReferences && values.seCreditReferences.length > 0 && 
        values.seCreditReferences.every(ref => 
          (ref.name?.length ?? 0) >= 2 && 
          (ref.contact?.length ?? 0) === 10 && 
          ((ref.behavior?.length ?? 0) > 2 || !!ref.behaviorAudio)
        )
      );
      
      // Removed validVision from the required list since it's now optional
      return !!(
        values.seTalukasCovered?.length > 0 && 
        values.seVillagesCovered?.length > 0 && 
        values.seTotalCultivableArea && 
        values.seMajorCrops?.length > 0 && 
        values.sePrincipalSuppliers?.length > 0 && 
        values.seChemicalProducts?.length > 0 && 
        values.seBioProducts?.length > 0 && 
        values.seOtherProducts?.length > 0 && 
        validCreditRefs && 
        values.seWillShareSales
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
    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const renderSignature = (sigData?: string) => {
      if (!sigData) return '<span style="color:red">No Signature</span>';
      try {
        const strokes = JSON.parse(sigData);
        const toPath = (points: any[]) => {
          if (points.length === 0) return '';
          return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
        };
        const paths = strokes.map((pts: any[]) => `<path d="${toPath(pts)}" stroke="#16A34A" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round" />`).join('');
        return `<svg viewBox="0 0 400 250" style="width: 100%; max-width: 250px; height: 100px; margin-top: 10px;">${paths}</svg>`;
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
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 40px; line-height: 1.5; }
          .header { border-bottom: 3px solid #16A34A; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }
          .header h1 { margin: 0; color: #16A34A; font-size: 28px; text-transform: uppercase; letter-spacing: 1px; }
          .header p { margin: 5px 0 0; color: #64748B; font-size: 14px; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 16px; color: #16A34A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 15px; text-transform: uppercase; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 13px; }
          th, td { padding: 10px 12px; text-align: left; border: 1px solid #E2E8F0; }
          th { width: 30%; background-color: #F8FAFC; color: #475569; font-weight: bold; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 14px; background: ${bandBg}; color: ${bandColor}; }
          .list { margin: 0; padding-left: 20px; font-size: 13px; }
          .list li { margin-bottom: 5px; }
          .signatures { display: table; width: 100%; margin-top: 40px; }
          .sig-box { display: table-cell; width: 50%; text-align: center; }
          .sig-line { border-top: 1px solid #94A3B8; margin: 10px 40px 0; padding-top: 5px; font-weight: bold; color: #333; }
          a { color: #2563EB; text-decoration: none; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Dealer Onboarding Dossier</h1>
          <p>Generated on ${dateStr} • Recommended by ${user?.name || 'Sales Executive'}</p>
        </div>

        <div class="section">
          <div class="section-title">Profile Score</div>
          <div style="text-align: center; margin-bottom: 15px;">
            <span class="badge">${scoreData.percentage} (${scoreData.band})</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">1. Basic Information</div>
          <table>
            <tr><th>Shop / Firm Name</th><td>${data.shopName || '-'}</td></tr>
            <tr><th>Contact Person</th><td>${data.ownerName || '-'}</td></tr>
            <tr><th>Contact Mobile</th><td>+91 ${data.contactMobile || '-'}</td></tr>
            <tr><th>Address</th><td>${data.address || '-'} ${data.landmark ? `(Near ${data.landmark})` : ''}</td></tr>
            <tr><th>GST Number</th><td>${data.gstNumber || '-'}</td></tr>
            <tr><th>PAN Number</th><td>${data.panNumber || '-'}</td></tr>
            <tr><th>Firm Type & Est. Year</th><td>${data.firmType || '-'} / ${data.estYear || '-'}</td></tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">2. Bank Details</div>
          <table>
            <tr><th>Bank Name & Branch</th><td>${data.bankName || '-'} - ${data.bankBranch || '-'}</td></tr>
            <tr><th>Account Name</th><td>${data.bankAccountName || '-'}</td></tr>
            <tr><th>Account Number</th><td>${data.bankAccountNumber || '-'}</td></tr>
            <tr><th>IFSC Code</th><td>${data.bankIfsc || '-'}</td></tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">3. Business Area & Status</div>
          <table>
            <tr><th>Major Crops</th><td>${data.majorCrops?.join(', ') || '-'}</td></tr>
            <tr><th>Average Acres/Farmer</th><td>${data.acresServed || '-'} Acres</td></tr>
            <tr><th>Proposed Status</th><td>${data.proposedStatus || '-'}</td></tr>
            <tr><th>Willing for Demo Farmers?</th><td>${data.willingDemoFarmers || '-'}</td></tr>
            <tr><th>Linked Distributors</th>
              <td>
                <ul class="list" style="padding-left:15px; margin:0;">
                  ${data.linkedDistributors?.map(d => `<li>${d.name} (${d.contact})</li>`).join('') || '-'}
                </ul>
              </td>
            </tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">4. Profiling & Scoring Breakdown</div>
          <table>
            <tr style="background-color: #E2E8F0; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 11px;">
              <td style="padding: 10px 12px; border: 1px solid #CBD5E1;">Aspect</td>
              <td style="padding: 10px 12px; border: 1px solid #CBD5E1; text-align: center; width: 12%;">Score</td>
              <td style="padding: 10px 12px; border: 1px solid #CBD5E1;">Remarks / Evidence</td>
            </tr>
            <tr><th>Financial Health</th><td style="text-align: center; font-weight: bold;">${data.scoreFinancial} / 10</td><td>${data.remFinancial || '-'}</td></tr>
            <tr><th>Market Reputation</th><td style="text-align: center; font-weight: bold;">${data.scoreReputation} / 10</td><td>${data.remReputation || '-'}</td></tr>
            <tr><th>Operations & Infra</th><td style="text-align: center; font-weight: bold;">${data.scoreOperations} / 10</td><td>${data.remOperations || '-'}</td></tr>
            <tr><th>Farmer Network</th><td style="text-align: center; font-weight: bold;">${data.scoreFarmerNetwork} / 10</td><td>${data.remFarmerNetwork || '-'}</td></tr>
            <tr><th>Team & Prof.</th><td style="text-align: center; font-weight: bold;">${data.scoreTeam} / 10</td><td>${data.remTeam || '-'}</td></tr>
            <tr><th>Portfolio</th><td style="text-align: center; font-weight: bold;">${data.scorePortfolio} / 10</td><td>${data.remPortfolio || '-'}</td></tr>
            <tr><th>Experience</th><td style="text-align: center; font-weight: bold;">${data.scoreExperience} / 10</td><td>${data.remExperience || '-'}</td></tr>
            <tr><th>Growth Orientation</th><td style="text-align: center; font-weight: bold;">${data.scoreGrowth} / 10</td><td>${data.remGrowth || '-'}</td></tr>
            <tr>
              <th colspan="2" style="color:#991B1B; text-align: right; padding-right: 15px;">Red Flags Noted</th>
              <td style="color:#991B1B; font-weight:bold;">${data.redFlags || 'None'}</td>
            </tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">5. Commitments & Checklists</div>
          <p><strong>GLS Commitments Accepted:</strong></p>
          <ul class="list">
            ${data.glsCommitments?.map(c => `<li>&#10003; ${c}</li>`).join('') || '<li>None selected</li>'}
          </ul>
          <p style="margin-top:15px;"><strong>Regulatory Documents Verified:</strong></p>
          <ul class="list">
            ${data.complianceChecklist?.map(c => `<li>&#10003; ${c}</li>`).join('') || '<li>None selected</li>'}
          </ul>
        </div>

        <div class="section">
          <div class="section-title">6. Uploaded Documents</div>
          <ul class="list">
            ${Object.entries(data.documents || {}).map(([k, v]) => {
              if (Array.isArray(v)) {
                return v.map((url, i) => `<li><a href="${url}" target="_blank">View ${k.toUpperCase().replace(/_/g, ' ')} (${i + 1})</a></li>`).join('');
              }
              return `<li><a href="${v}" target="_blank">View ${k.toUpperCase().replace(/_/g, ' ')}</a></li>`;
            }).join('') || '<li>No documents uploaded.</li>'}
          </ul>
          ${data.shopLocation ? `<p style="margin-top:10px; font-size:13px;"><strong>Captured GPS Location:</strong> Lat ${data.shopLocation.lat.toFixed(6)}, Lng ${data.shopLocation.lng.toFixed(6)}</p>` : ''}
        </div>

        <div class="section" style="page-break-before: always;">
          <div class="section-title">7. Annexure Details (SE Evaluation)</div>
          <table>
            <tr><th>Territory (Talukas)</th><td>${data.seTalukasCovered?.join(', ') || '-'}</td></tr>
            <tr><th>Villages Covered</th><td>${data.seVillagesCovered?.join(', ') || '-'}</td></tr>
            <tr><th>Cultivable Area</th><td>${data.seTotalCultivableArea || '-'} ${data.seTotalCultivableAreaUnit}</td></tr>
            <tr><th>Major Crops</th><td>${data.seMajorCrops?.join(', ') || '-'}</td></tr>
            <tr><th>Principal Suppliers</th><td>${data.sePrincipalSuppliers?.join(', ') || '-'}</td></tr>
            <tr><th>Chemical Products</th><td>${data.seChemicalProducts?.join(', ') || '-'}</td></tr>
            <tr><th>Bio Products</th><td>${data.seBioProducts?.join(', ') || '-'}</td></tr>
            <tr><th>Other Products</th><td>${data.seOtherProducts?.join(', ') || '-'}</td></tr>
            <tr><th>Godown Capacity</th><td>${data.seGodownCapacity ? `${data.seGodownCapacity} ${data.seGodownCapacityUnit}` : '-'}</td></tr>
            <tr><th>Growth Vision</th><td>
              ${data.seGrowthVision || '-'} 
              ${data.seGrowthVisionAudio ? `<br><a href="${data.seGrowthVisionAudio}" target="_blank">Listen to Audio Recording</a>` : ''}
            </td></tr>
            <tr><th>Supplier References</th><td>
              ${data.seHasCreditReferences === 'Yes' ? data.seCreditReferences?.map((r, i) => `<b>${i+1}. ${r.name} (${r.contact})</b>: ${r.behavior || ''} ${r.behaviorAudio ? `<a href="${r.behaviorAudio}">[Audio]</a>` : ''}`).join('<br>') : 'None provided'}
            </td></tr>
            <tr><th>Monthly Sales Sharing</th><td>${data.seWillShareSales ? 'Confirmed' : 'Not Confirmed'}</td></tr>
            <tr><th>Security Deposit</th><td>₹ ${data.seSecurityDeposit || '0'}</td></tr>
          </table>
        </div>

        <div class="signatures">
          <div class="sig-box">
            ${renderSignature(data.dealerSignature)}
            <div class="sig-line">Dealer Signature</div>
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

    // 🔥 Launch Camera BEFORE asking for GPS so it feels instant
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
      // Fetch GPS while the image is processing
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
      
      if (location) form.setValue('shopLocation', { lat: location.coords.latitude, lng: location.coords.longitude }, { shouldValidate: true });
    } catch(e) {
      Alert.alert("Error", "Upload failed.");
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }));
    }
  };

  const generatePDF = async () => {
    const html = generateHTML();
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };

  return { form, step, setStep, saveDraft, submit, scoreData, handleUpload, handleAudioUpload, uploading, isSubmitting, isNextEnabled, showSuccess, setShowSuccess, generatePDF, isEditing: !!editData };
}