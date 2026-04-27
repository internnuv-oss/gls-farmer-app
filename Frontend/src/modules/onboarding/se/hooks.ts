import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import { requestMediaPermission, requestCameraPermission } from "../../../core/permissions";
import { useAuthStore } from "../../../store/authStore";
import { uploadFileToCloudinary } from "../services/cloudinaryService";
import { supabase } from "../../../core/supabase"; 
import { seOnboardingSchema, SEOnboardingValues } from "./schema";

export function useSEOnboarding(navigation: any) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [jumpBackTo, setJumpBackTo] = useState<number | null>(null);

  const form = useForm<SEOnboardingValues>({
    resolver: zodResolver(seOnboardingSchema) as any, // <-- ADDED 'as any' HERE
    defaultValues: {
      firstName: "", middleName: "", lastName: "", dob: "", bloodGroup: undefined, maritalStatus: undefined,
      mobileNumber: user?.mobile || "", emailId: "", permanentAddress: "", sameAsPermanent: false, currentAddress: "",
      employeeId: "", designation: "", reportingTo: "", joiningDate: "", headquarter: "", territory: "", area: "",
      panNumber: "", bankName: "", bankAccountNumber: "", bankIfsc: "", pfPensionNumber: "",
      vehicleType: undefined, drivingLicenseNo: "", dlExpiryDate: "", companyAssets: [], fuelAllowance: "",
      documents: {}
    } as any, // <-- ADDED 'as any' HERE
    mode: 'onChange'
  });

  const { watch, setValue } = form;
  const values = watch();

  // Auto-fill current address if checkbox is ticked
  useEffect(() => {
    if (values.sameAsPermanent) {
      setValue("currentAddress", values.permanentAddress, { shouldValidate: true });
    }
  }, [values.sameAsPermanent, values.permanentAddress]);

  // Step validation logic
  const isNextEnabled = useMemo(() => {
    if (step === 1) {
      const basicValid = !!(values.firstName && values.lastName && values.dob && values.bloodGroup && values.maritalStatus && values.mobileNumber?.length === 10 && values.emailId && values.permanentAddress && values.currentAddress);
      if (values.maritalStatus === "Married") {
        return basicValid && !!(values.spouseName && values.spouseMobile && values.spouseMobile.length >= 10);
      }
      return basicValid;
    }
    if (step === 2) return !!(values.employeeId && values.designation && values.reportingTo && values.joiningDate && values.headquarter && values.territory && values.area);
    if (step === 3) return !!(values.panNumber && values.bankName && values.bankAccountNumber && values.bankIfsc);
    if (step === 4) return !!(values.vehicleType && values.drivingLicenseNo && values.dlExpiryDate);
    if (step === 5) return !!(values.documents?.profilePhoto && values.documents?.identityProof && values.documents?.addressProof);
    return true; // Step 6 (Review)
  }, [step, values]);

  const handleUpload = async (key: keyof NonNullable<SEOnboardingValues['documents']>, type: 'camera' | 'image' | 'doc' = 'doc') => {
    const useCamera = type === 'camera' || type === 'image';
    const perm = useCamera ? await requestCameraPermission() : await requestMediaPermission();
    if (!perm.granted) return Alert.alert("Permission Denied", perm.fallbackMessage);

    let result = useCamera ? await ImagePicker.launchCameraAsync({ quality: 0.7 }) : await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (result.canceled) return;
    
    const uri = result.assets[0].uri;
    setUploading(prev => ({ ...prev, [key]: true }));

    try {
      const url = await uploadFileToCloudinary(uri, useCamera ? 'image' : 'raw');
      const currentDocs = form.getValues('documents') || {};
      
      if (key === 'educationalCertificates') {
        const existingArray = Array.isArray(currentDocs[key]) ? currentDocs[key] : [];
        form.setValue('documents', { ...currentDocs, [key]: [...existingArray, url] }, { shouldValidate: true });
      } else {
        form.setValue('documents', { ...currentDocs, [key]: url }, { shouldValidate: true });
      }
    } catch(e) {
      Alert.alert("Error", "Upload failed.");
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }));
    }
  };

  const submit = form.handleSubmit(
    async (data) => {
      if (!user?.id) return Alert.alert("Error", "User session not found.");
      setIsSubmitting(true);
      try {
        // Update the profiles table
        const { error } = await supabase.from('profiles').update({
           first_name: data.firstName,
           last_name: data.lastName,
           dob: data.dob,
           mobile: data.mobileNumber,
           is_profile_complete: true,
           metadata: data // Store all other fields in a JSONB column
        }).eq('id', user.id);

        if (error) throw error;
        
        // Update local auth store to unlock the dashboard
        setUser({ ...user, isProfileComplete: true });
        
        setShowSuccess(true);
      } catch (error: any) {
        Alert.alert("Submission Failed", error.message);
      } finally {
        setIsSubmitting(false);
      }
    },
    (errors) => {
      console.log("Validation Errors: ", errors);
      Alert.alert("Validation Error", "Please check all required fields.");
    }
  );

  return { form, step, setStep, jumpBackTo, setJumpBackTo, submit, handleUpload, uploading, isSubmitting, isNextEnabled, showSuccess, setShowSuccess };
}