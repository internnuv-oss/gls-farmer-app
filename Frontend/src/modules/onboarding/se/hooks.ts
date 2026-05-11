import { useState, useMemo, useEffect, useRef } from "react";
import { AppState } from "react-native"; 
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRoute } from "@react-navigation/native";
import * as ImageManipulator from 'expo-image-manipulator';

import { requestMediaPermission, requestCameraPermission } from "../../../core/permissions";
import { useAuthStore } from "../../../store/authStore";
import { useDraftStore } from "../../../store/draftStore"; 
import { uploadFileToCloudinary } from "../services/cloudinaryService";
import { supabase } from "../../../core/supabase";
import { useAlertStore } from "../../../store/alertStore";

import { seOnboardingSchema, SEOnboardingValues } from "./schema";

export function useSEOnboarding(navigation: any) {
  const route = useRoute<any>();
  const editData = route.params?.editData || {};

  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const seDraftState = useDraftStore((s) => s.seDraft);
  const setSEDraft = useDraftStore((s) => s.setSEDraft);
  const clearSEDraft = useDraftStore((s) => s.clearSEDraft);

  const isEditing = Object.keys(editData).length > 0;
  
  const defaultData = isEditing ? editData : (seDraftState?.data || {});
  const initialStep = isEditing ? 1 : (seDraftState?.step || 1);

  const [step, setStep] = useState(initialStep);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [jumpBackTo, setJumpBackTo] = useState<number | null>(null);

  const form = useForm<SEOnboardingValues>({
    resolver: zodResolver(seOnboardingSchema) as any,
    defaultValues: {
      firstName: defaultData.firstName || user?.firstName || "",
      middleName: defaultData.middleName || "",
      lastName: defaultData.lastName || user?.lastName || "",
      dob: defaultData.dob || user?.dob || "",
      mobileNumber: defaultData.mobileNumber || user?.mobile || "",
      emailId: defaultData.emailId || user?.email || "",
      bloodGroup: defaultData.bloodGroup || undefined,
      maritalStatus: defaultData.maritalStatus || undefined,
      spouseName: defaultData.spouseName || "",
      spouseMobile: defaultData.spouseMobile || "",
      emergencyContact: defaultData.emergencyContact || "",
      permanentAddress: defaultData.permanentAddress || "",
      permanentPincode: defaultData.permanentPincode || "",
      sameAsPermanent: defaultData.sameAsPermanent || false,
      currentAddress: defaultData.currentAddress || "",
      currentPincode: defaultData.currentPincode || "",
      employeeId: defaultData.employeeId || "",
      designation: defaultData.designation || "",
      reportingTo: defaultData.reportingTo || "",
      joiningDate: defaultData.joiningDate || "",
      headquarter: defaultData.headquarter || "",
      territory: defaultData.territory || "",
      area: defaultData.area || "",
      panNumber: defaultData.panNumber || "",
      bankName: defaultData.bankName || "",
      bankAccountNumber: defaultData.bankAccountNumber || "",
      bankIfsc: defaultData.bankIfsc || "",
      pfPensionNumber: defaultData.pfPensionNumber || "",
      vehicleType: defaultData.vehicleType || undefined,
      vehicleNumber: defaultData.vehicleNumber || "",
      drivingLicenseNo: defaultData.drivingLicenseNo || "",
      dlExpiryDate: defaultData.dlExpiryDate || "",
      companyAssets: defaultData.companyAssets || [],
      fuelAllowance: defaultData.fuelAllowance || "",
      documents: defaultData.documents || {},
      
      // 🚀 Safely map insurances from the database financial_details object or fallback
      insurances: (defaultData.financial_details?.insurances?.length > 0) 
        ? defaultData.financial_details.insurances 
        : (defaultData.insurances || [{ type: '', provider: '', insuranceId: '', documentUrl: '' }]),
    } as any,
    mode: 'onChange'
  });

  const { watch, setValue } = form;
  const values = watch();

  useEffect(() => {
    if (values.sameAsPermanent) {
      setValue("currentAddress", values.permanentAddress, { shouldValidate: true });
      setValue("currentPincode", values.permanentPincode, { shouldValidate: true });
    }
  }, [values.sameAsPermanent, values.permanentAddress, values.permanentPincode]);

  const stepRef = useRef(step);
  useEffect(() => { stepRef.current = step; }, [step]);

  const showSuccessRef = useRef(showSuccess);
  useEffect(() => { showSuccessRef.current = showSuccess; }, [showSuccess]);

  const autoSave = () => {
    if (isEditing) return;
    const currentValues = form.getValues();
    setSEDraft(stepRef.current, currentValues);
  };

  useEffect(() => {
    if (!showSuccessRef.current) autoSave();
  }, [step]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", nextAppState => {
      if (nextAppState === "inactive" || nextAppState === "background") {
        if (!showSuccessRef.current) autoSave();
      }
    });
    return () => {
      subscription.remove();
      if (!showSuccessRef.current) autoSave();
    };
  }, []);

  const isNextEnabled = useMemo(() => {
    // 🚀 Allow free navigation up to the new Review Step (Step 7)
    if (step < 7) return true; 

    // Step 1 Validation
    const basicValid = !!(
      values.firstName && values.lastName && values.dob && 
      values.bloodGroup && values.maritalStatus && 
      values.mobileNumber?.length === 10 && 
      values.emergencyContact?.length === 10 && 
      values.emailId && 
      values.permanentAddress && values.permanentPincode?.length === 6 && 
      values.currentAddress && values.currentPincode?.length === 6
    );
    const isStep1Valid = values.maritalStatus === "Married" 
      ? basicValid && !!(values.spouseName && values.spouseMobile && values.spouseMobile.length >= 10)
      : basicValid;
      
    // Step 2, 3, 4 Validation
    const isStep2Valid = !!(values.employeeId && values.designation && values.reportingTo && values.joiningDate && values.headquarter && values.territory && values.area);
    const isStep3Valid = !!(values.panNumber && values.bankName && values.bankAccountNumber && values.bankIfsc);
    const isStep4Valid = !!(values.vehicleType && values.vehicleNumber && values.drivingLicenseNo && values.dlExpiryDate); 
    
    // 🚀 NEW Step 5 Validation (Insurances)
    const isStep5Valid = (values.insurances || []).every(ins => {
      // If it's completely empty, allow it (since it's optional)
      if (!ins.type && !ins.provider && !ins.insuranceId) return true;
      // If partially filled, demand the required fields
      return !!(ins.type && ins.provider && ins.insuranceId);
    });

    // 🚀 Step 6 Validation (Documents - Shifted from 5)
    const isStep6Valid = !!(values.documents?.profilePhoto && values.documents?.aadharCard && values.documents?.panCard && values.documents?.addressProof);
    
    return isStep1Valid && isStep2Valid && isStep3Valid && isStep4Valid && isStep5Valid && isStep6Valid; 
  }, [step, values]);

  // Handle nested string paths properly for insurance document uploads
  const handleUpload = async (key: string, type: 'camera' | 'image' | 'doc' = 'doc') => {
    let result;
    
    if (type === 'camera') {
      const perm = await requestCameraPermission();
      if (!perm.granted) return useAlertStore.getState().showAlert("Permission Denied", perm.fallbackMessage);
      result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    } else if (type === 'image') {
      const perm = await requestMediaPermission();
      if (!perm.granted) return useAlertStore.getState().showAlert("Permission Denied", perm.fallbackMessage);
      result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 }); 
    } else {
      const perm = await requestMediaPermission();
      if (!perm.granted) return useAlertStore.getState().showAlert("Permission Denied", perm.fallbackMessage);
      result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    }
    
    if (result.canceled) return;
    const asset: any = result.assets[0];
    
    if (type === 'doc' && asset.size) {
      const fileSizeInMB = asset.size / (1024 * 1024);
      if (fileSizeInMB > 5) {
        useAlertStore.getState().showAlert("File Too Large", `This document is ${fileSizeInMB.toFixed(1)}MB. Please select a file smaller than 5MB.`);
        return; 
      }
    }
    
    const uri = asset.uri;
    const isCameraOrImage = type === 'camera' || type === 'image';
    setUploading(prev => ({ ...prev, [key]: true }));
    
    try {
      let finalUri = uri;
      if (isCameraOrImage) {
        const manipResult = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1024 } }], { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG });
        finalUri = manipResult.uri;
      }

      const url = await uploadFileToCloudinary(finalUri, isCameraOrImage ? 'image' : 'raw');
      
      // 🚀 Handle Insurance array nested keys (e.g. "insurances.0.documentUrl")
      if (key.startsWith('insurances.')) {
        const parts = key.split('.');
        const index = parseInt(parts[1], 10);
        const fieldName = parts[2];
        const currentInsurances = [...(form.getValues('insurances') || [])];
        if (currentInsurances[index]) {
          currentInsurances[index] = { ...currentInsurances[index], [fieldName]: url };
          form.setValue('insurances', currentInsurances, { shouldValidate: true });
        }
      } else {
        // Standard Documents Logic
        const currentDocs = form.getValues('documents') || {};
        if (key === 'educationalCertificates') {
          const existingArray = Array.isArray(currentDocs[key as keyof typeof currentDocs]) ? currentDocs[key as keyof typeof currentDocs] as string[] : [];
          form.setValue('documents', { ...currentDocs, [key]: [...existingArray, url] }, { shouldValidate: true });
        } else {
          form.setValue('documents', { ...currentDocs, [key]: url }, { shouldValidate: true });
        }
      }
    } catch(e) {
      useAlertStore.getState().showAlert("Error", "Upload failed.");
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }));
    }
  };

  const submit = form.handleSubmit(
    async (data) => {
      if (!user?.id) return useAlertStore.getState().showAlert("Error", "User session not found.");
      setIsSubmitting(true);
      try {
        const { error } = await supabase.from('sales_executive').upsert({
            profile_id: user.id, 
            is_profile_complete: true,
            personal_details: {
              firstName: data.firstName,
              middleName: data.middleName,
              lastName: data.lastName,
              dob: data.dob,
              bloodGroup: data.bloodGroup,
              maritalStatus: data.maritalStatus,
              spouseName: data.spouseName,
              spouseMobile: data.spouseMobile,
              mobileNumber: data.mobileNumber,
              emergencyContact: data.emergencyContact,
              emailId: data.emailId,
              permanentAddress: data.permanentAddress,
              permanentPincode: data.permanentPincode,
              sameAsPermanent: data.sameAsPermanent,
              currentAddress: data.currentAddress,
              currentPincode: data.currentPincode
            },
            organization_details: {
              employeeId: data.employeeId,
              designation: data.designation,
              reportingTo: data.reportingTo,
              joiningDate: data.joiningDate,
              headquarter: data.headquarter,
              territory: data.territory,
              area: data.area
            },
            financial_details: {
              panNumber: data.panNumber,
              bankName: data.bankName,
              bankAccountNumber: data.bankAccountNumber,
              bankIfsc: data.bankIfsc,
              pfPensionNumber: data.pfPensionNumber,
              insurances: data.insurances // 🚀 Tucked safely into JSONB, no DB changes needed!
            },
            assets_details: {
              vehicleType: data.vehicleType,
              vehicleNumber: data.vehicleNumber,
              drivingLicenseNo: data.drivingLicenseNo,
              dlExpiryDate: data.dlExpiryDate,
              companyAssets: data.companyAssets,
              fuelAllowance: data.fuelAllowance
            },
            documents: data.documents || {}
        });

        if (error) throw error;
        
        setUser({ ...user, isProfileComplete: true });
        clearSEDraft(); 
        setShowSuccess(true);
      } catch (error: any) {
        useAlertStore.getState().showAlert("Submission Failed", error.message);
      } finally {
        setIsSubmitting(false);
      }
    },
    (errors) => {
      console.log("Validation Errors: ", errors);
      useAlertStore.getState().showAlert("Validation Error", "Please check all required fields in the previous steps.");
    }
  );

  const saveAndExit = () => {
    autoSave();
    navigation.navigate("MainTabs", { screen: "Profile" });
  };

  return { form, step, setStep, jumpBackTo, setJumpBackTo, submit, handleUpload, uploading, isSubmitting, isNextEnabled, showSuccess, setShowSuccess, saveAndExit, isEditing };
}
