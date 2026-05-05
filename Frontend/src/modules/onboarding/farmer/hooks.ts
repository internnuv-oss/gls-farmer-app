import { useState, useMemo, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, AppState } from "react-native";
import { useAuthStore } from "../../../store/authStore";
import { useDraftStore } from "../../../store/draftStore";
import { supabase } from "../../../core/supabase"; 
import { farmerOnboardingSchema, FarmerOnboardingValues } from "./schema";

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

  // 1. Initialize State
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dealers, setDealers] = useState<{label: string, value: string}[]>([]);
  
  // Refs to track state safely across async unmounts
  const draftIdRef = useRef<string | undefined>(draftId);
  const showSuccessRef = useRef(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    showSuccessRef.current = showSuccess;
  }, [showSuccess]);

  // 2. Initialize Form
  const defaultValues = editData ? mapFarmerDbToForm(editData) : (draftData || {
    majorCrops: [], 
    soilType: [], 
    waterSource: [], 
    majorProblems: [], 
    agreementAccepted: false
  });

  const form = useForm<FarmerOnboardingValues>({
    resolver: zodResolver(farmerOnboardingSchema),
    defaultValues,
    mode: 'onChange'
  });

  const { watch } = form;
  const values = watch();

  // 3. Fetch SE's Dealers
  useEffect(() => {
    if (!user?.id) return;
    const fetchDealers = async () => {
      const { data } = await supabase
        .from('dealers')
        .select('id, shop_name, city')
        .eq('se_id', user.id)
        .eq('status', 'SUBMITTED');
        
      if (data) {
        setDealers(data.map(d => ({ label: `${d.shop_name} (${d.city})`, value: d.id })));
      }
    };
    fetchDealers();
  }, [user?.id]);

  // 4. Auto-Save Logic
  const autoSave = () => {
    if (editData) return; // Do not auto-save if editing an existing profile
    const currentValues = form.getValues();

    if (!currentValues || !currentValues.fullName) return; 

    if (draftIdRef.current) {
      updateDraft(draftIdRef.current, currentValues);
    } else {
      const newId = addDraft(currentValues, 'FARMER'); 
      draftIdRef.current = newId;
    }
  };

  // 5. Handle App Backgrounding safely using Ref
  useEffect(() => {
    const sub = AppState.addEventListener("change", state => { 
      if (state === "inactive" || state === "background") {
        if (!showSuccessRef.current) autoSave(); 
      }
    });
    return () => { 
      sub.remove(); 
      if (!showSuccessRef.current) autoSave(); 
    };
  }, []);

  const saveDraft = () => { 
    autoSave(); 
    Alert.alert("Saved", "Farmer onboarding saved as draft."); 
    navigation.goBack(); 
  };

  // 6. Step Validation
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
    
    return true; 
  }, [step, values]);

  // 7. Final Submission
  const submit = form.handleSubmit(async (data) => {
    if (isSubmittingRef.current) return; // Block rapid double-taps immediately
    if (!user?.id) return Alert.alert("Error", "User session not found.");
    
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    
    try {
      const dbPayload = {
        se_id: user.id,
        dealer_id: data.dealerId,
        full_name: data.fullName,
        mobile: data.mobile,
        village: data.village,
        personal_details: {
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
            waterSource: data.waterSource.map(ws => ws === 'Others' ? data.otherWaterSource : ws)
        },
        history_details: {
            lastCropGrown: data.lastCropGrown,
            yield: data.yield,
            majorProblems: data.majorProblems?.map(p => p === 'Others' ? data.otherProblem : p) || []
        },
        farmer_signature: data.farmerSignature,
        se_signature: data.seSignature,
        status: 'SUBMITTED',
        updated_at: new Date().toISOString()
      };

      if (editData?.id) {
        const { error } = await supabase.from('farmers').update(dbPayload).eq('id', editData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('farmers').insert([dbPayload]);
        if (error) throw error;
      }
      
      // Clean up the draft once submitted and clear the ref so autoSave ignores it on unmount
      if (draftIdRef.current) {
        removeDraft(draftIdRef.current);
        draftIdRef.current = undefined; 
      }
      setShowSuccess(true);
    } catch (error: any) {
      Alert.alert("Submission Failed", error.message);
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  });

  return { form, step, setStep, saveDraft, submit, isSubmitting, isNextEnabled, showSuccess, setShowSuccess, dealers, isEditing: !!editData };
}