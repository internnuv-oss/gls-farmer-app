import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRoute } from "@react-navigation/native"; 

import { requestMediaPermission, requestCameraPermission } from "../../../core/permissions";
import { useAuthStore } from "../../../store/authStore";
import { uploadFileToCloudinary } from "../services/cloudinaryService";
import { supabase } from "../../../core/supabase"; 
import { seOnboardingSchema, SEOnboardingValues } from "./schema";

export function useSEOnboarding(navigation: any) {
  const route = useRoute<any>(); 
  const editData = route.params?.editData || {}; 

  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [jumpBackTo, setJumpBackTo] = useState<number | null>(null);

  const form = useForm<SEOnboardingValues>({
    resolver: zodResolver(seOnboardingSchema) as any,
    defaultValues: {
      // 🚀 Step 6: Automatically injects data from Auth Store!
      firstName: editData.firstName || user?.firstName || "", 
      middleName: editData.middleName || "", 
      lastName: editData.lastName || user?.lastName || "", 
      dob: editData.dob || user?.dob || "", 
      mobileNumber: editData.mobileNumber || user?.mobile || "", 
      emailId: editData.emailId || user?.email || "",
      
      bloodGroup: editData.bloodGroup || undefined, 
      maritalStatus: editData.maritalStatus || undefined,
      spouseName: editData.spouseName || "",
      spouseMobile: editData.spouseMobile || "",
      emergencyContact: editData.emergencyContact || "", 
      permanentAddress: editData.permanentAddress || "", 
      permanentPincode: editData.permanentPincode || "", 
      sameAsPermanent: editData.sameAsPermanent || false, 
      currentAddress: editData.currentAddress || "", 
      currentPincode: editData.currentPincode || "",
      employeeId: editData.employeeId || "", 
      designation: editData.designation || "", 
      reportingTo: editData.reportingTo || "", 
      joiningDate: editData.joiningDate || "", 
      headquarter: editData.headquarter || "", 
      territory: editData.territory || "", 
      area: editData.area || "",
      panNumber: editData.panNumber || "", 
      bankName: editData.bankName || "", 
      bankAccountNumber: editData.bankAccountNumber || "", 
      bankIfsc: editData.bankIfsc || "", 
      pfPensionNumber: editData.pfPensionNumber || "",
      vehicleType: editData.vehicleType || undefined, 
      vehicleNumber: editData.vehicleNumber || "", 
      drivingLicenseNo: editData.drivingLicenseNo || "", 
      dlExpiryDate: editData.dlExpiryDate || "", 
      companyAssets: editData.companyAssets || [], 
      fuelAllowance: editData.fuelAllowance || "",
      documents: editData.documents || {}
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

  const isNextEnabled = useMemo(() => {
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
      if (!perm.granted) return Alert.alert("Permission Denied", perm.fallbackMessage);
      result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    } else if (type === 'image') {
      const perm = await requestMediaPermission();
      if (!perm.granted) return Alert.alert("Permission Denied", perm.fallbackMessage);
      result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 }); 
    } else {
      const perm = await requestMediaPermission();
      if (!perm.granted) return Alert.alert("Permission Denied", perm.fallbackMessage);
      result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    }

    if (result.canceled) return;
    
    const uri = result.assets[0].uri;
    setUploading(prev => ({ ...prev, [key]: true }));

    try {
      const isCloudinaryImage = type === 'camera' || type === 'image';
      const url = await uploadFileToCloudinary(uri, isCloudinaryImage ? 'image' : 'raw');
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
        const { error } = await supabase.from('sales_executive').upsert({
           profile_id: user.id, 
           first_name: data.firstName,
           last_name: data.lastName,
           dob: data.dob,
           is_profile_complete: true,
           metadata: data 
        });

        if (error) throw error;
        
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
      Alert.alert("Validation Error", "Please check all required fields in the previous steps.");
    }
  );

  return { form, step, setStep, jumpBackTo, setJumpBackTo, submit, handleUpload, uploading, isSubmitting, isNextEnabled, showSuccess, setShowSuccess };
}