import { useState, useMemo, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppState } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from 'expo-image-manipulator';

import { requestMediaPermission, requestCameraPermission } from "../../../core/permissions";
import { useDraftStore } from "../../../store/draftStore";
import { useAuthStore } from "../../../store/authStore";
import { uploadFileToCloudinary } from "../services/cloudinaryService";
import { supabase } from "../../../core/supabase";
import { distributorOnboardingSchema, DistributorOnboardingValues, DISTRIBUTOR_GLS_COMMITMENTS } from "./schema";
import { useAlertStore } from "../../../store/alertStore";

export function useDistributorOnboarding(navigation: any, route: any) {
  const user = useAuthStore((s) => s.user);
  const { addDraft, updateDraft, removeDraft } = useDraftStore();
  const draftData = route?.params?.draftData;
  const draftId = route?.params?.draftId;
  const [jumpBackTo, setJumpBackTo] = useState<number | null>(null);

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const draftIdRef = useRef(draftId);

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

  const form = useForm<DistributorOnboardingValues>({
    resolver: zodResolver(distributorOnboardingSchema),
    defaultValues: draftData || {
        contactDesignation: '', state: '', city: '', taluka: '', pincode: '',
        appliedTerritory: [], // <-- NEW DEFAULT
      currentSuppliers: [''],
      bankAccounts: [{ accountName: '', accountNumber: '', bankIfsc: '', bankNameBranch: '' }],
      topDealers: [{ name: '', address: '', contact: '', turnover: '', products: '', farmersServed: '', bioExperience: '' }],
      glsCommitments: [], complianceChecklist: [], documents: {},
      anxTerritories: [{ state: '', district: '', taluka: '', villages: [], cultivableArea: '', majorCrops: [] }],
      anxPrincipalSuppliers: [{ name: '', share: '' }],
      anxChemicalProducts: [],
      anxBioProducts: [],
      anxOtherProducts: [],
      anxSupplierRefs: [{ name: '', contact: '', behavior: '' }],
      agreementAccepted: false,
      scoreFinancial: 5, scoreReputation: 5, scoreOperations: 5, scoreDealerNetwork: 5,
      scoreTeam: 5, scorePortfolio: 5, scoreExperience: 5, scoreGrowth: 5,
      coldChainFacility: 'No'
      
    },
    mode: 'onChange'
  });

  const { watch } = form;
  const values = watch();

  // Background Auto-Save
  const autoSave = () => {
    const currentValues = form.getValues(); 
    if (!currentValues || !currentValues.firmName) return; 

    if (draftIdRef.current) {
      updateDraft(draftIdRef.current, currentValues);
    } else {
      const newId = addDraft(currentValues, 'DISTRIBUTOR'); // Use new Type
      draftIdRef.current = newId;
    }
  };

  useEffect(() => {
    const sub = AppState.addEventListener("change", state => {
      if (state === "inactive" || state === "background") {
        if (!showSuccess) autoSave();
      }
    });
    return () => { sub.remove(); if (!showSuccess) autoSave(); };
  }, [showSuccess]);

  const saveDraft = () => {
    autoSave();
    useAlertStore.getState().showAlert("Saved", "Distributor onboarding saved as draft.");
    navigation.goBack();
  };

  // Basic Validation Checkers
  const isNextEnabled = useMemo(() => {
    if (step === 1) {
        const mobileRegex = /^\d{10}$/;
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        const bankAccRegex = /^\d{9,18}$/;
        const pincodeRegex = /^\d{6}$/;
  
        const areBanksValid = values.bankAccounts?.every(b => 
          b.accountName && 
          b.bankNameBranch && 
          bankAccRegex.test(b.accountNumber || '') && 
          ifscRegex.test(b.bankIfsc || '')
        );
  
        return !!(
          values.firmName && values.firmName.length >= 2 &&
          values.ownerName && values.ownerName.length >= 2 &&
          values.contactPerson && values.contactPerson.length >= 2 &&
          mobileRegex.test(values.contactMobile || '') &&
          values.state && values.city && values.taluka && // <-- NEW
          pincodeRegex.test(values.pincode || '') &&
          values.address && values.address.length >= 5 &&
          gstRegex.test(values.gstNumber || '') &&
          panRegex.test(values.panNumber || '') &&
          values.estYear && values.firmType &&
          areBanksValid
        );
      }

      if (step === 2) {
        return !!(
          values.scoreFinancial && values.scoreFinancial >= 1 && values.scoreFinancial <= 10 &&
          values.scoreReputation && values.scoreReputation >= 1 && values.scoreReputation <= 10 &&
          values.scoreOperations && values.scoreOperations >= 1 && values.scoreOperations <= 10 &&
          values.scoreDealerNetwork && values.scoreDealerNetwork >= 1 && values.scoreDealerNetwork <= 10 &&
          values.scoreTeam && values.scoreTeam >= 1 && values.scoreTeam <= 10 &&
          values.scorePortfolio && values.scorePortfolio >= 1 && values.scorePortfolio <= 10 &&
          values.scoreExperience && values.scoreExperience >= 1 && values.scoreExperience <= 10 &&
          values.scoreGrowth && values.scoreGrowth >= 1 && values.scoreGrowth <= 10
        );
      }

      if (step === 3) {
        return !!(
          values.appliedTerritory && values.appliedTerritory.length > 0 &&
          values.turnoverPotential && 
          values.currentSuppliers && values.currentSuppliers.length > 0 && values.currentSuppliers.every(s => s.length >= 2) &&
          values.proposedStatus &&
          values.demoFarmersCommitment &&
          values.godownCapacity &&
          values.coldChainFacility
        );
      }

      if (step === 4) {
        // 1. Check if they uploaded a media file
        const hasUploadedList = !!values.documents?.['dealer_network_list'];
        
        // 2. Check if manual entries are valid
        const hasValidManualDealers = !!(
          values.topDealers && 
          values.topDealers.length > 0 && 
          values.topDealers.every(d => 
            d.name && d.name.length >= 2 &&
            d.address && d.address.length >= 2 &&
            /^\d{10}$/.test(d.contact || '')
          )
        );

        // Allow proceeding if EITHER is true
        return hasUploadedList || hasValidManualDealers;
      }
      if (step === 5) {
        // GLS Commitments
        return Array.isArray(values.glsCommitments) && values.glsCommitments.length === DISTRIBUTOR_GLS_COMMITMENTS.length;
      }

      if (step === 6) {
        // Regulatory Compliance (Checklist only, doesn't block "Next")
        return true; 
      }

      if (step === 7) {
        // Documents
        const coreDocs = ['gst_certificate', 'pan_card', 'cancelled_cheque', 'trade_licence', 'itr_declaration', 'authorisation_letter'];
        const photoDocs = ['storage_exterior', 'storage_interior'];
        const complianceDocs = (values.complianceChecklist || []).map((item: string) => item.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase());
        const allRequired = [...coreDocs, ...photoDocs, ...complianceDocs];
  
        return allRequired.every(key => {
          const doc = values.documents?.[key];
          return Array.isArray(doc) ? doc.length > 0 : !!doc;
        });
      }

      if (step === 8) {
        // SE Annexures
        const validTerritories = values.anxTerritories?.length > 0 && values.anxTerritories.every(t => 
          t.state && t.district && t.taluka && Array.isArray(t.villages) && t.villages.length > 0 && t.cultivableArea && Array.isArray(t.majorCrops) && t.majorCrops.length > 0
        );
        const validSuppliers = values.anxPrincipalSuppliers?.length > 0 && values.anxPrincipalSuppliers.every(s => s.name && s.share);
        const validProducts = (values.anxChemicalProducts?.length || 0) > 0 && (values.anxBioProducts?.length || 0) > 0 && (values.anxOtherProducts?.length || 0) > 0;
        
        const validRefs = values.anxSupplierRefs?.length > 0 && values.anxSupplierRefs.every(ref => 
          ref.name && ref.name.length >= 2 && /^\d{10}$/.test(ref.contact || '')
        );
        const hasVision = !!values.anxGrowthVision || !!values.anxGrowthVisionAudio;
        const securityDepositVal = parseInt(values.securityDeposit || '0');
        const hasPaymentProof = securityDepositVal === 0 || (securityDepositVal > 0 && (!!values.paymentProofText || !!values.documents?.['distributor_payment_proof']));
  
        return !!(validTerritories && validSuppliers && validProducts && validRefs && hasVision && hasPaymentProof);
      }

      if (step === 9) {
        // Agreement
        return !!(values.agreementAccepted && values.distributorSignature && values.seSignature);
      }

      if (step === 10) {
        // Review
        return true; 
      }

    return true; 
  }, [step, values]);

  // Calculate 100 Point Score
  // Calculate 100 Point Weighted Score
  const scoreData = useMemo(() => {
    // Apply weights exactly as per the Distributor Profiling Document
    const raw = Math.round(
      (values.scoreFinancial || 5) * 1.5 +
      (values.scoreReputation || 5) * 1.5 +
      (values.scoreOperations || 5) * 1.0 +
      (values.scoreDealerNetwork || 5) * 1.5 +
      (values.scoreTeam || 5) * 1.0 +
      (values.scorePortfolio || 5) * 1.0 +
      (values.scoreExperience || 5) * 1.5 +
      (values.scoreGrowth || 5) * 1.0
    );
    
    // Business Action Classification
    let band = 'Grade C (High Risk)';
    if (raw >= 85) band = 'Grade A+ (Platinum)';
    else if (raw >= 65) band = 'Grade A (Strategic)';
    else if (raw >= 45) band = 'Grade B (Operational)';
    
    return { raw, band }; 
  }, [values.scoreFinancial, values.scoreReputation, values.scoreOperations, values.scoreDealerNetwork, values.scoreTeam, values.scorePortfolio, values.scoreExperience, values.scoreGrowth]);

  const handleUpload = async (key: string, type: 'camera' | 'image' | 'doc' = 'doc') => {
    let result;
    
    // 1. Request Permissions & Launch Picker
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
    const uri = asset.uri; // 🚀 Fixed Error 2304: uri is now defined
    
    // 2. Validate File Size (Limit to 5MB for documents)
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
    
    setUploading(prev => ({ ...prev, [key]: true }));
    
    try {
      let finalUri = uri;
      const isCameraOrImage = type === 'camera' || type === 'image';

      // 3. Compress Image for Performance
      if (isCameraOrImage) {
        const manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1024 } }], 
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
        );
        finalUri = manipResult.uri;
      }

      // 4. Upload to Cloudinary with Type Mapping
      // 🚀 Fixed Error 2345: Mapping "camera"/"image" to "image" and "doc" to "raw"
      const cloudinaryType = isCameraOrImage ? 'image' : 'raw';
      const url = await uploadFileToCloudinary(finalUri, cloudinaryType);
      
      // 5. Update Form State
      const currentDocs = form.getValues('documents') || {};
      
      // Handle multiple photos for storage facility, otherwise store single URL
      if (['storage_exterior', 'storage_interior'].includes(key)) {
        const existingArray = Array.isArray(currentDocs[key]) ? currentDocs[key] : (currentDocs[key] ? [currentDocs[key]] : []);
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

  const submit = form.handleSubmit(async (data) => {
    setIsSubmitting(true);
    try {
      // 1. Map data to DB Payload
      const dbPayload = {
        se_id: user?.id,
        firm_name: data.firmName,
        total_score: scoreData.raw,
        status: "SUBMITTED",
        raw_data: data // Can store the entire JSON payload in a JSONB column to save mapping time for complex nested fields
      };

      // 2. Insert into Supabase
      const { error } = await supabase.from('distributors').insert([dbPayload]);
      if (error) throw error;

      if (draftIdRef.current) removeDraft(draftIdRef.current);
      setShowSuccess(true);
    } catch (e: any) {
      useAlertStore.getState().showAlert("Error", e.message);
    } finally {
      setIsSubmitting(false);
    }
  });

  return { form, step, setStep, jumpBackTo, setJumpBackTo, saveDraft, submit, scoreData, handleUpload, handleAudioUpload, uploading, isSubmitting, isNextEnabled, showSuccess, setShowSuccess };
}