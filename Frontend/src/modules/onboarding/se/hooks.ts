// modules/onboarding/se/hooks.ts
import { useState, useMemo, useEffect, useRef } from "react";
import { AppState } from "react-native"; // <-- IMPORT ADDED
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRoute } from "@react-navigation/native";
import * as ImageManipulator from 'expo-image-manipulator';

import { requestMediaPermission, requestCameraPermission } from "../../../core/permissions";
import { useAuthStore } from "../../../store/authStore";
import { useDraftStore } from "../../../store/draftStore"; // <-- IMPORT ADDED
import { uploadFileToCloudinary } from "../services/cloudinaryService";
import { supabase } from "../../../core/supabase";
import { useAlertStore } from "../../../store/alertStore";

import { seOnboardingSchema, SEOnboardingValues } from "./schema";

export function useSEOnboarding(navigation: any) {
  const route = useRoute<any>();
  const editData = route.params?.editData || {};

  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  // --- NEW: Access Draft Store ---
  const seDraftState = useDraftStore((s) => s.seDraft);
  const setSEDraft = useDraftStore((s) => s.setSEDraft);
  const clearSEDraft = useDraftStore((s) => s.clearSEDraft);

  // Determine if we are editing an already submitted profile
  const isEditing = Object.keys(editData).length > 0;
  
  // Priority: 1. Edit Data (if passed) -> 2. Saved Draft -> 3. Empty Object
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
      documents: defaultData.documents || {}
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

  // --- NEW: Background Auto-Save Logic ---
  const stepRef = useRef(step);
  useEffect(() => { stepRef.current = step; }, [step]);

  const showSuccessRef = useRef(showSuccess);
  useEffect(() => { showSuccessRef.current = showSuccess; }, [showSuccess]);

  const autoSave = () => {
    // Only save drafts for new onboarding (not if editing an old approved profile)
    if (isEditing) return;
    const currentValues = form.getValues();
    setSEDraft(stepRef.current, currentValues);
  };

  useEffect(() => {
    // Save data automatically every time the user transitions to a new step
    if (!showSuccessRef.current) autoSave();
  }, [step]);

  useEffect(() => {
    // Save data if the phone locks, an incoming call arrives, or the app minimizes
    const subscription = AppState.addEventListener("change", nextAppState => {
      if (nextAppState === "inactive" || nextAppState === "background") {
        if (!showSuccessRef.current) autoSave();
      }
    });

    // Save data if they forcefully use the back arrow to exit the screen
    return () => {
      subscription.remove();
      if (!showSuccessRef.current) autoSave();
    };
  }, []);
  // ---------------------------------------

  const isNextEnabled = useMemo(() => {
    // ... [KEEP YOUR EXISTING isNextEnabled LOGIC EXACTLY THE SAME] ...
    if (step === 1) {
      const basicValid = !!(
        values.firstName && values.lastName && values.dob && 
        values.bloodGroup && values.maritalStatus && 
        values.mobileNumber?.length === 10 && 
        values.emergencyContact?.length === 10 && 
        values.emailId && 
        values.permanentAddress && values.permanentPincode?.length === 6 && 
        values.currentAddress && values.currentPincode?.length === 6
      );
      if (values.maritalStatus === "Married") {
        return basicValid && !!(values.spouseName && values.spouseMobile && values.spouseMobile.length >= 10);
      }
      return basicValid;
    }
    if (step === 2) return !!(values.employeeId && values.designation && values.reportingTo && values.joiningDate && values.headquarter && values.territory && values.area);
    if (step === 3) return !!(values.panNumber && values.bankName && values.bankAccountNumber && values.bankIfsc);
    if (step === 4) return !!(values.vehicleType && values.vehicleNumber && values.drivingLicenseNo && values.dlExpiryDate); 
    if (step === 5) return !!(values.documents?.profilePhoto && values.documents?.aadharCard && values.documents?.panCard && values.documents?.addressProof);
    return true; 
  }, [step, values]);

  const handleUpload = async (key: keyof NonNullable<SEOnboardingValues['documents']>, type: 'camera' | 'image' | 'doc' = 'doc') => {
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
    
    // ---> NEW: FAIL-FAST FILE SIZE LIMIT (5MB) <---
    if (type === 'doc' && asset.size) {
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
    
    try {
      let finalUri = uri;

      // ---> NEW: COMPRESSION LOGIC <---
      if (isCameraOrImage) {
        const manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1024 } }], // Shrinks to 1024px width, maintains aspect ratio
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG } // 60% compression
        );
        finalUri = manipResult.uri;
      }

      const url = await uploadFileToCloudinary(finalUri, isCameraOrImage ? 'image' : 'raw');
      const currentDocs = form.getValues('documents') || {};
      
      if (key === 'educationalCertificates') {
        const existingArray = Array.isArray(currentDocs[key]) ? currentDocs[key] : [];
        form.setValue('documents', { ...currentDocs, [key]: [...existingArray, url] }, { shouldValidate: true });
      } else {
        form.setValue('documents', { ...currentDocs, [key]: url }, { shouldValidate: true });
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
              pfPensionNumber: data.pfPensionNumber
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
        clearSEDraft(); // <-- NEW: Clean up the local storage draft upon success!
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