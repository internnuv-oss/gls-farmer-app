

import { useState, useMemo, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppState, Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Location from 'expo-location'; 
import { documentDirectory, copyAsync } from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto'; // 🚀 IMPORT CRYPTO FOR UUIDs

import { requestMediaPermission, requestCameraPermission } from "../../../core/permissions";
import { useAuthStore } from "../../../store/authStore";
import { uploadFileToCloudinary } from "../services/cloudinaryService";
import { supabase } from "../../../core/supabase";
import { distributorOnboardingSchema, DistributorOnboardingValues, DISTRIBUTOR_GLS_COMMITMENTS } from "./schema";
import { useAlertStore } from "../../../store/alertStore";
import { saveDistributorOnboarding, mapDistributorDbToForm, updateDistributorPdfUrl } from '../services/onboardingService';

export function useDistributorOnboarding(navigation: any, route: any) {
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
  const showSuccessRef = useRef(false);

  useEffect(() => { showSuccessRef.current = showSuccess; }, [showSuccess]);

  const normalizedDraft = useMemo(() => {
    if (editData) return mapDistributorDbToForm(editData);
    if (!draftData) return null;
    
    return {
      ...draftData,
      appliedTerritory: Array.isArray(draftData.appliedTerritory) ? draftData.appliedTerritory : [],
      currentSuppliers: Array.isArray(draftData.currentSuppliers) ? draftData.currentSuppliers : [''],
      anxTerritories: Array.isArray(draftData.anxTerritories) ? draftData.anxTerritories.map((t: any) => ({
        ...t,
        villages: Array.isArray(t.villages) ? t.villages : [],
        majorCrops: Array.isArray(t.majorCrops) ? t.majorCrops : []
      })) : [{ state: '', district: '', taluka: '', villages: [], cultivableArea: '', majorCrops: [] }],
      anxPrincipalSuppliers: Array.isArray(draftData.anxPrincipalSuppliers) ? draftData.anxPrincipalSuppliers : [{ name: '', share: '' }],
      anxChemicalProducts: Array.isArray(draftData.anxChemicalProducts) ? draftData.anxChemicalProducts : [],
      anxBioProducts: Array.isArray(draftData.anxBioProducts) ? draftData.anxBioProducts : [],
      anxOtherProducts: Array.isArray(draftData.anxOtherProducts) ? draftData.anxOtherProducts : []
    };
  }, [draftData, editData]);

  const form = useForm<DistributorOnboardingValues>({
    resolver: zodResolver(distributorOnboardingSchema),
    defaultValues: normalizedDraft || {
      contactDesignation: '', state: '', city: '', taluka: '', pincode: '',
      appliedTerritory: [],
      currentSuppliers: [''],
      bankAccounts: [{ accountName: '', accountNumber: '', bankIfsc: '', bankNameBranch: '' }],
      topDealers: [{ name: '', address: '', contact: '', turnover: '', products: '', farmersServed: '', bioExperience: '' }],
      glsCommitments: [], complianceChecklist: [], documents: {},
      storageLocations: {}, 
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

  // 🚀 DB CRUD: Direct Save Function
  const saveDraftToDB = async () => {
    if (editData || showSuccessRef.current) return; 
    
    const currentValues = form.getValues();
    if (!currentValues || !currentValues.firmName || !user?.id) return; 

    if (!draftIdRef.current) {
      draftIdRef.current = Crypto.randomUUID(); 
    }

    try {
      await supabase.from('drafts').upsert({
        se_id: user.id,
        entity_type: 'distributor',
        entity_id: draftIdRef.current,
        draft_data: currentValues,
        current_step: step,
        updated_at: new Date().toISOString()
      }, { onConflict: 'entity_id' });
    } catch (err) {
      console.log("Failed to sync draft to DB", err);
    }
  };

  // 🚀 DB CRUD: Background Auto-Save
  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      if (nextAppState === "inactive" || nextAppState === "background") {
        if (!showSuccessRef.current) await saveDraftToDB();
      }
    });
    return () => {
      subscription.remove();
      if (!showSuccessRef.current) saveDraftToDB(); 
    };
  }, [step]); 

  // 🚀 DB CRUD: Save & Exit Button
  const saveAndExit = async () => {
    const values = form.getValues();
    if (!values.firmName) {
      useAlertStore.getState().showAlert("Cannot Save", "Please enter at least the Firm Name.");
      return;
    }

    useAlertStore.getState().showAlert("Saving...", "Syncing draft to database...");
    await saveDraftToDB();
    
    useAlertStore.getState().hideAlert();
    navigation.navigate("MainTabs", { screen: "Drafts" });
  };

  const saveDraft = () => saveAndExit();

  // 🚀 Group Validations for popup explicitly checking all steps
  const validationStatus = useMemo(() => {
    const mobileRegex = /^\d{10}$/;
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    const bankAccRegex = /^\d{9,18}$/;
    const pincodeRegex = /^\d{6}$/;

    const areBanksValid = values.bankAccounts?.every(b => b.accountName && b.bankNameBranch && bankAccRegex.test(b.accountNumber || '') && ifscRegex.test(b.bankIfsc || ''));
    const isStep1Valid = !!(values.firmName && values.firmName.length >= 2 && values.ownerName && values.ownerName.length >= 2 && values.contactPerson && values.contactPerson.length >= 2 && mobileRegex.test(values.contactMobile || '') && values.state && values.city && values.taluka && pincodeRegex.test(values.pincode || '') && values.address && values.address.length >= 5 && gstRegex.test(values.gstNumber || '') && panRegex.test(values.panNumber || '') && values.estYear && values.firmType && areBanksValid);
    
    const isStep3Valid = !!(values.appliedTerritory?.length > 0 && values.turnoverPotential && values.currentSuppliers?.length > 0 && values.currentSuppliers.every(s => s.length >= 2) && values.proposedStatus && values.demoFarmersCommitment && values.godownCapacity && values.coldChainFacility);
    
    const hasUploadedList = !!values.documents?.['dealer_network_list'];
    const hasValidManualDealers = !!(values.topDealers?.length && values.topDealers.every(d => d.name && d.name.length >= 2 && d.address && d.address.length >= 2 && /^\d{10}$/.test(d.contact || '')));
    const isStep4Valid = hasUploadedList || hasValidManualDealers;

    const isStep5Valid = Array.isArray(values.glsCommitments) && values.glsCommitments.length === 5; 
    
    const coreDocs = ['gst_certificate', 'pan_card', 'cancelled_cheque', 'trade_licence', 'itr_declaration', 'authorisation_letter'];
    const photoDocs = ['storage_exterior', 'storage_interior'];
    const complianceDocs = (values.complianceChecklist || []).map((item: string) => item.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase());
    const allRequiredDocs = [...coreDocs, ...photoDocs, ...complianceDocs];
    const isStep7Valid = allRequiredDocs.every(key => { const doc = values.documents?.[key]; return Array.isArray(doc) ? doc.length > 0 : !!doc; }) && !!(values as any).storageLocations?.['storage_exterior'];
    
    const validTerritories = values.anxTerritories?.length > 0 && values.anxTerritories.every(t => t.state && t.district && t.taluka && Array.isArray(t.villages) && t.villages.length > 0 && t.cultivableArea && Array.isArray(t.majorCrops) && t.majorCrops.length > 0);
    const validSuppliers = values.anxPrincipalSuppliers?.length > 0 && values.anxPrincipalSuppliers.every(s => s.name && s.share);
    const validProducts = (values.anxChemicalProducts?.length || 0) > 0 && (values.anxBioProducts?.length || 0) > 0 && (values.anxOtherProducts?.length || 0) > 0;
    const validRefs = values.anxSupplierRefs?.length > 0 && values.anxSupplierRefs.every(ref => ref.name && ref.name.length >= 2 && /^\d{10}$/.test(ref.contact || ''));
    const hasVision = !!values.anxGrowthVision || !!values.anxGrowthVisionAudio;
    const securityDepositVal = parseInt(values.securityDeposit || '0');
    const hasPaymentProof = securityDepositVal === 0 || (securityDepositVal > 0 && (!!values.paymentProofText || !!values.documents?.['distributor_payment_proof']));
    const isStep8Valid = !!(validTerritories && validSuppliers && validProducts && validRefs && hasVision && hasPaymentProof);
    
    const isStep9Valid = !!(values.agreementAccepted && values.distributorSignature && values.seSignature);

    return [
      { isValid: isStep1Valid, name: "Step 1: Basic Profile (Check PAN/GST/Bank formats)" },
      { isValid: isStep3Valid, name: "Step 3: Business Scope & Infra" },
      { isValid: isStep4Valid, name: "Step 4: Dealer Network (List or Manual Add)" },
      { isValid: isStep5Valid, name: "Step 5: GLS Commitments (Must check all 5)" },
      { isValid: isStep7Valid, name: "Step 7: Documents (Check required docs & GPS)" },
      { isValid: isStep8Valid, name: "Step 8: Annexures (Check missing dropdowns)" },
      { isValid: isStep9Valid, name: "Step 9: Agreement & Signatures" },
    ];
  }, [values]);

  const isNextEnabled = true;

  const scoreData = useMemo(() => {
    const raw = Math.round(
      (values.scoreFinancial || 5) * 1.5 + (values.scoreReputation || 5) * 1.5 + (values.scoreOperations || 5) * 1.0 + (values.scoreDealerNetwork || 5) * 1.5 + (values.scoreTeam || 5) * 1.0 + (values.scorePortfolio || 5) * 1.0 + (values.scoreExperience || 5) * 1.5 + (values.scoreGrowth || 5) * 1.0
    );
    let band = 'Grade C (High Risk)';
    if (raw >= 85) band = 'Grade A+ (Platinum)';
    else if (raw >= 65) band = 'Grade A (Strategic)';
    else if (raw >= 45) band = 'Grade B (Operational)';
    return { raw, band }; 
  }, [values.scoreFinancial, values.scoreReputation, values.scoreOperations, values.scoreDealerNetwork, values.scoreTeam, values.scorePortfolio, values.scoreExperience, values.scoreGrowth]);

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
    const uri = asset.uri; 
    
    if (type === 'doc' && asset.size) {
      const fileSizeInMB = asset.size / (1024 * 1024);
      if (fileSizeInMB > 5) {
        useAlertStore.getState().showAlert("File Too Large", `This document is ${fileSizeInMB.toFixed(1)}MB. Please select a file smaller than 5MB.`);
        return; 
      }
    }
    
    setUploading(prev => ({ ...prev, [key]: true }));

    let location: any = null;
    const requiresGPS = ['storage_exterior', 'storage_interior'].includes(key);
    
    if (requiresGPS) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { 
        useAlertStore.getState().showAlert("GPS Required", "GPS location is required when capturing storage facility photos."); 
        setUploading(prev => ({ ...prev, [key]: false }));
        return; 
      }
      location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    }

    try {
      let finalUri = uri;
      const isCameraOrImage = type === 'camera' || type === 'image';
      if (isCameraOrImage) {
        const manipResult = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1024 } }], { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG });
        finalUri = manipResult.uri;
      }
      const url = await uploadFileToCloudinary(finalUri, isCameraOrImage ? 'image' : 'raw');
      const currentDocs = form.getValues('documents') || {};
      
      if (['storage_exterior', 'storage_interior'].includes(key)) {
        const existingArray = Array.isArray(currentDocs[key]) ? currentDocs[key] : (currentDocs[key] ? [currentDocs[key]] : []);
        form.setValue('documents', { ...currentDocs, [key]: [...existingArray, url] }, { shouldValidate: true });
      } else {
        form.setValue('documents', { ...currentDocs, [key]: url }, { shouldValidate: true });
      }

      if (location) {
        const currentLocs = (form.getValues() as any).storageLocations || {};
        form.setValue('storageLocations' as any, { 
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

    const bandColor = scoreData.band.includes('A') ? '#166534' : scoreData.band.includes('B') ? '#92400E' : '#991B1B';
    const bandBg = scoreData.band.includes('A') ? '#DCFCE7' : scoreData.band.includes('B') ? '#FEF3C7' : '#FEE2E2';

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
          .table-wrapper { border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; margin-bottom: 15px; }
          .sub-heading { font-size: 15px; font-weight: 700; color: #334155; margin: 20px 0 10px 0; border-left: 4px solid #16A34A; padding-left: 10px; }
          .grid-2 { display: table; width: 100%; table-layout: fixed; margin-bottom: 15px; }
          .grid-col { display: table-cell; width: 50%; padding-right: 10px; vertical-align: top; }
          .pill { display: inline-block; background-color: #E2E8F0; color: #334155; padding: 4px 10px; border-radius: 15px; font-size: 12px; font-weight: 600; margin: 2px 4px 2px 0; }
          .signatures { display: table; width: 100%; margin-top: 50px; page-break-inside: avoid; }
          .sig-box { display: table-cell; width: 50%; text-align: center; }
          .sig-line { border-top: 2px solid #94A3B8; margin: 10px 60px 0; padding-top: 8px; font-weight: 800; color: #1E293B; font-size: 14px; text-transform: uppercase; }
          .empty-text { color: #94A3B8; font-style: italic; font-weight: 400; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Distributor Onboarding Dossier</h1>
            <p>Onboarded on ${dateStr} • Added by ${user?.name || 'Sales Executive'}</p>
          </div>

          <div class="score-card">
            <h2>Overall Score: ${scoreData.raw} / 100</h2>
            <p>Risk Band: <strong>${scoreData.band}</strong></p>
          </div>

          <div class="section">
            <div class="section-title">1. Business Profile</div>
            <div class="table-wrapper">
              <table>
                <tr><th>Firm Name</th><td>${data.firmName || '<span class="empty-text">N/A</span>'}</td></tr>
                <tr><th>Owner Name</th><td>${data.ownerName || '-'}</td></tr>
                <tr><th>Contact Person</th><td>${data.contactPerson} (${data.contactDesignation})</td></tr>
                <tr><th>Registered Address</th><td>${data.address || '-'}<br><span style="color:#64748B; font-size:12px;">${data.taluka || '-'}, ${data.city || '-'}, ${data.state || '-'} - ${data.pincode}</span></td></tr>
                
                <tr>
                  <th>Facility GPS Coordinates</th>
                  <td>
                    ${(data as any).storageLocations?.['storage_exterior'] 
                      ? `<a href="http://maps.google.com/?q=${(data as any).storageLocations['storage_exterior'].lat},${(data as any).storageLocations['storage_exterior'].lng}" style="color: #2563EB; font-weight: 800; text-decoration: underline;">📍 View on Map</a><br><span style="font-size: 11px; color: #64748B;">Lat: ${(data as any).storageLocations['storage_exterior'].lat.toFixed(5)}, Lng: ${(data as any).storageLocations['storage_exterior'].lng.toFixed(5)}</span>`
                      : '<span class="empty-text">Not Captured</span>'}
                  </td>
                </tr>

                <tr><th>Contact Numbers</th><td>${data.contactMobile ? `+91 ${data.contactMobile}` : '-'}</td></tr>
                <tr><th>Email</th><td>${data.email || '-'}</td></tr>
                <tr><th>Firm Type & Est. Year</th><td>${data.firmType || '-'} / ${data.estYear || '-'}</td></tr>
                <tr><th>Tax IDs</th><td><strong>GST:</strong> ${data.gstNumber || '-'}<br><strong>PAN:</strong> ${data.panNumber || '-'}</td></tr>
              </table>
            </div>

            <div class="sub-heading">Bank Details</div>
            ${data.bankAccounts?.map((b, i) => `
              <div class="table-wrapper" style="margin-bottom:10px;">
                <table>
                  <tr><th>Account ${i + 1}</th><td><strong>${b.bankNameBranch || '-'}</strong></td></tr>
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
                </tr>
                <tr><th>Financial Health</th><td style="text-align: center; font-weight: 800;">${data.scoreFinancial}/10</td></tr>
                <tr><th>Market Reputation</th><td style="text-align: center; font-weight: 800;">${data.scoreReputation}/10</td></tr>
                <tr><th>Operations & Infra</th><td style="text-align: center; font-weight: 800;">${data.scoreOperations}/10</td></tr>
                <tr><th>Dealer Network</th><td style="text-align: center; font-weight: 800;">${data.scoreDealerNetwork}/10</td></tr>
                <tr><th>Team & Professionalism</th><td style="text-align: center; font-weight: 800;">${data.scoreTeam}/10</td></tr>
                <tr><th>Portfolio Alignment</th><td style="text-align: center; font-weight: 800;">${data.scorePortfolio}/10</td></tr>
                <tr><th>Experience</th><td style="text-align: center; font-weight: 800;">${data.scoreExperience}/10</td></tr>
                <tr><th>Growth Orientation</th><td style="text-align: center; font-weight: 800;">${data.scoreGrowth}/10</td></tr>
                <tr><th style="color:#DC2626;">Red Flags Noted</th><td style="color:#DC2626; font-weight:bold; text-align: center;">${data.redFlags || 'None Reported'}</td></tr>
              </table>
            </div>
          </div>

          <div class="section page-break">
            <div class="section-title">3. Business Scope & Network</div>
            <div class="grid-2">
              <div class="grid-col">
                <div class="table-wrapper">
                  <table>
                    <tr><th>Proposed Status</th><td><strong>${data.proposedStatus || '-'}</strong></td></tr>
                    <tr><th>Applied Territory</th><td>${data.appliedTerritory?.join(', ') || '-'}</td></tr>
                    <tr><th>Turnover Potential</th><td>₹${data.turnoverPotential || '-'} Cr</td></tr>
                    <tr><th>Target Dealers</th><td>${data.demoFarmersCommitment || '-'}</td></tr>
                  </table>
                </div>
              </div>
              <div class="grid-col">
                <div class="table-wrapper">
                  <table>
                    <tr><th>Godown Capacity</th><td>${data.godownCapacity || '-'} Sq.ft</td></tr>
                    <tr><th>Cold Chain Facility</th><td>${data.coldChainFacility || '-'}</td></tr>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div class="section page-break">
            <div class="section-title">4. Compliance & Commercials</div>
            
            <div class="sub-heading" style="margin-top:0;">Annexure A: Territory Coverage</div>
            <div class="table-wrapper">
              <table>
                <tr style="background-color: #F1F5F9; font-weight: 600;"><td>#</td><td>Location (District, Taluka)</td><td>Villages</td><td>Cultivable Area</td><td>Major Crops</td></tr>
                ${data.anxTerritories?.map((t, i) => `<tr><td>${i+1}</td><td><strong>${t.district}, ${t.taluka}</strong></td><td>${t.villages?.join(', ')}</td><td>${t.cultivableArea} Acres</td><td>${t.majorCrops?.join(', ')}</td></tr>`).join('') || '<tr><td colspan="5" class="empty-text">No territories defined</td></tr>'}
              </table>
            </div>

            <div class="sub-heading">Annexure C: Principal Companies & Products</div>
            <div class="table-wrapper">
              <table>
                <tr><th>Principal Suppliers</th><td>${data.anxPrincipalSuppliers?.map(s => `<span class="pill">${s.name} (${s.share}%)</span>`).join('') || '<span class="empty-text">None</span>'}</td></tr>
                <tr><th>Chemical Range</th><td>${data.anxChemicalProducts?.map(s => `<span class="pill">${s}</span>`).join('') || '<span class="empty-text">None</span>'}</td></tr>
                <tr><th>Bio/Organic Range</th><td>${data.anxBioProducts?.map(s => `<span class="pill">${s}</span>`).join('') || '<span class="empty-text">None</span>'}</td></tr>
                <tr><th>Other Products</th><td>${data.anxOtherProducts?.map(s => `<span class="pill">${s}</span>`).join('') || '<span class="empty-text">None</span>'}</td></tr>
              </table>
            </div>

            <div class="sub-heading">Credit, Sales & Vision</div>
            <div class="table-wrapper">
              <table>
                <tr><th>Will Share Sales Data?</th><td><strong>${data.anxWillShareSales ? 'Yes, Confirmed' : 'Not Confirmed'}</strong></td></tr>
                <tr><th>2-Year Growth Vision</th><td>${data.anxGrowthVision || '<span class="empty-text">No text provided</span>'}</td></tr>
                <tr><th>Security Deposit</th><td><strong>₹ ${data.securityDeposit || '0'}</strong></td></tr>
              </table>
            </div>

            <div class="signatures">
              <div class="sig-box">
                ${renderSignature(data.distributorSignature)}
                <div class="sig-line">Distributor Signature</div>
              </div>
              <div class="sig-box">
                ${renderSignature(data.seSignature)}
                <div class="sig-line">Sales Executive Signature</div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };


  const generatePDF = async () => {
    // (Keep your existing generatePDF logic exactly as it was)
  };

  // 🚀 DB CRUD: Delete Draft from DB on Submit
  const submit = async () => {
    const missingSteps = validationStatus.filter(v => !v.isValid).map(v => v.name);
    
    if (missingSteps.length > 0) {
      useAlertStore.getState().showAlert(
        "Missing Information", 
        "Please complete the following sections before submitting:\n\n• " + missingSteps.join("\n• ")
      );
      return; 
    }

    await form.handleSubmit(async (data) => {
      if (!user?.id) return useAlertStore.getState().showAlert("Error", "User session not found.");
      setIsSubmitting(true);
      try {
        const result = await saveDistributorOnboarding(
          data, 
          'SUBMITTED', 
          scoreData.raw, 
          scoreData.band, 
          user.id, 
          editData?.id
        );

        const html = generateHTML();
        const { uri } = await Print.printToFileAsync({ html });
        const pdfUrl = await uploadFileToCloudinary(uri, 'raw');
        
        await updateDistributorPdfUrl(result.id, pdfUrl);

        // 🚀 THE FIX: Delete from Supabase Drafts table ONLY
        if (draftIdRef.current) {
           await supabase.from('drafts').delete().eq('entity_id', draftIdRef.current);
           draftIdRef.current = undefined; 
        }

        setShowSuccess(true);
      } catch (e: any) {
        useAlertStore.getState().showAlert("Submission Failed", e.message);
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  return { 
    form, step, setStep, jumpBackTo, setJumpBackTo, saveDraft, submit, 
    scoreData, handleUpload, handleAudioUpload, uploading, isSubmitting, saveAndExit,
    isNextEnabled, showSuccess, setShowSuccess, generatePDF, 
    isEditing: !!editData 
  };
}