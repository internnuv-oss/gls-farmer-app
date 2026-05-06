import { useState, useMemo, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, AppState, Platform } from "react-native";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { documentDirectory, copyAsync } from 'expo-file-system/legacy';

import { useAuthStore } from "../../../store/authStore";
import { useDraftStore } from "../../../store/draftStore";
import { supabase } from "../../../core/supabase"; 
import { uploadFileToCloudinary } from "../services/cloudinaryService";
import { farmerOnboardingSchema, FarmerOnboardingValues } from "./schema";
import { useAlertStore } from "../../../store/alertStore";

const PREDEFINED_SOILS = ["Black", "Sandy", "Red", "Loamy"];
const PREDEFINED_WATER = ["Canal", "Borewell", "Rain"];
const PREDEFINED_PROBLEMS = ["Low Yield", "Pest/Disease", "Soil Fertility"];

export function mapFarmerDbToForm(db: any): FarmerOnboardingValues {
  const dbSoil = db.farm_details?.soilType || [];
  const knownSoil = dbSoil.filter((s: string) => PREDEFINED_SOILS.includes(s));
  const otherSoil = dbSoil.find((s: string) => !PREDEFINED_SOILS.includes(s));
  if (otherSoil) knownSoil.push("Others");

  const dbWater = db.farm_details?.waterSource || [];
  const knownWater = dbWater.filter((w: string) => PREDEFINED_WATER.includes(w));
  const otherWater = dbWater.find((w: string) => !PREDEFINED_WATER.includes(w));
  if (otherWater) knownWater.push("Others");

  const dbProb = db.history_details?.majorProblems || [];
  const knownProb = dbProb.filter((p: string) => PREDEFINED_PROBLEMS.includes(p));
  const otherProb = dbProb.find((p: string) => !PREDEFINED_PROBLEMS.includes(p));
  if (otherProb) knownProb.push("Others");

  return {
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
    lastCropGrown: db.history_details?.lastCropGrown || "",
    yield: db.history_details?.yield || "",
    majorProblems: knownProb,
    otherProblem: otherProb || "",
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
  const [jumpBackTo, setJumpBackTo] = useState<number | null>(null); // 🚀 ADDED jumpBackTo
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dealers, setDealers] = useState<{label: string, value: string}[]>([]);
  
  const draftIdRef = useRef<string | undefined>(draftId);
  const showSuccessRef = useRef(false);

  useEffect(() => { showSuccessRef.current = showSuccess; }, [showSuccess]);

  const defaultValues = editData ? mapFarmerDbToForm(editData) : (draftData || {
    majorCrops: [], soilType: [], waterSource: [], majorProblems: [], agreementAccepted: false
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

  const isNextEnabled = useMemo(() => {
    if (step === 1) return !!(values.fullName && values.fatherName && values.mobile?.length === 10 && values.state && values.city && values.taluka && values.village);
    if (step === 2) {
        const baseValid = !!(values.totalLand && values.majorCrops?.length > 0 && values.soilType?.length > 0 && values.waterSource?.length > 0);
        if (values.soilType?.includes('Others') && !values.otherSoilType) return false;
        if (values.waterSource?.includes('Others') && !values.otherWaterSource) return false;
        return baseValid;
    }
    if (step === 3) {
      const baseValid = !!values.dealerId;
      if (values.majorProblems?.includes('Others') && !values.otherProblem) return false; 
      return baseValid;
    }
    if (step === 4) return !!(values.agreementAccepted && values.farmerSignature && values.seSignature);
    if (step === 5) return true; // Review step
    return true; 
  }, [step, values]);

  const generateHTML = () => {
    const data = form.getValues();
    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const renderSignature = (sigData?: string) => {
      if (!sigData) return '<span style="color:red">No Signature</span>';
      try {
        const strokes = JSON.parse(sigData);
        const toPath = (points: any[]) => {
          if (points.length === 0) return '';
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
          body { font-family: 'Inter', Helvetica, Arial, sans-serif; color: #1E293B; margin: 0; padding: 0; line-height: 1.6; }
          .header { border-bottom: 3px solid #16A34A; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }
          .header h1 { margin: 0; color: #16A34A; font-size: 32px; text-transform: uppercase; font-weight: 800; }
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
          <h1>Farmer Enrolment Dossier</h1>
          <p>Enrolled on ${dateStr} • Added by ${user?.name || 'Sales Executive'}</p>
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
          <tr><th>Total Land</th><td>${data.totalLand || '0'} Acres</td></tr>
          <tr><th>Major Crops</th><td>${data.majorCrops?.join(', ') || '-'}</td></tr>
          <tr><th>Soil Type</th><td>${data.soilType?.map(s => s === 'Others' ? data.otherSoilType : s).join(', ') || '-'}</td></tr>
          <tr><th>Water Source</th><td>${data.waterSource?.map(w => w === 'Others' ? data.otherWaterSource : w).join(', ') || '-'}</td></tr>
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
      const dbPayload = {
        se_id: user.id,
        dealer_id: data.dealerId,
        full_name: data.fullName,
        mobile: data.mobile,
        village: data.village,
        personal_details: { fatherName: data.fatherName, alternateMobile: data.alternateMobile, state: data.state, city: data.city, taluka: data.taluka },
        farm_details: { totalLand: data.totalLand, irrigatedLand: data.irrigatedLand, rainFedLand: data.rainFedLand, majorCrops: data.majorCrops, soilType: data.soilType.map(st => st === 'Others' ? data.otherSoilType : st), waterSource: data.waterSource.map(ws => ws === 'Others' ? data.otherWaterSource : ws) },
        history_details: { lastCropGrown: data.lastCropGrown, yield: data.yield, majorProblems: data.majorProblems?.map(p => p === 'Others' ? data.otherProblem : p) || [] },
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

  return { form, step, setStep, jumpBackTo, setJumpBackTo, saveDraft, submit, isSubmitting, isNextEnabled, showSuccess, setShowSuccess, dealers, generatePDF, isEditing: !!editData };
}