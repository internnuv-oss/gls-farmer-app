import { useState, useMemo, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppState, Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { documentDirectory, copyAsync } from 'expo-file-system/legacy';

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
  
  const editData = route?.params?.editData;
  const draftData = route?.params?.draftData;
  const draftId = route?.params?.draftId;

  const [step, setStep] = useState(1);
  const [jumpBackTo, setJumpBackTo] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const draftIdRef = useRef(draftId);

  // 🚀 THE FIX: We use a ref to track success silently so it doesn't trigger cleanup loops!
  const showSuccessRef = useRef(false);
  useEffect(() => {
    showSuccessRef.current = showSuccess;
  }, [showSuccess]);

  const normalizedDraft = useMemo(() => {
    const sourceData = editData ? editData.raw_data : draftData;
    if (!sourceData) return null;
    
    return {
      ...sourceData,
      appliedTerritory: Array.isArray(sourceData.appliedTerritory) ? sourceData.appliedTerritory : (sourceData.appliedTerritory ? [sourceData.appliedTerritory] : []),
      currentSuppliers: Array.isArray(sourceData.currentSuppliers) ? sourceData.currentSuppliers : (sourceData.currentSuppliers ? [sourceData.currentSuppliers] : ['']),
      anxTerritories: Array.isArray(sourceData.anxTerritories) ? sourceData.anxTerritories.map((t: any) => ({
        ...t,
        villages: Array.isArray(t.villages) ? t.villages : (t.villages ? [t.villages] : []),
        majorCrops: Array.isArray(t.majorCrops) ? t.majorCrops : (t.majorCrops ? [t.majorCrops] : [])
      })) : [{ state: '', district: '', taluka: '', villages: [], cultivableArea: '', majorCrops: [] }],
      anxPrincipalSuppliers: Array.isArray(sourceData.anxPrincipalSuppliers) ? sourceData.anxPrincipalSuppliers : [{ name: '', share: '' }],
      anxChemicalProducts: Array.isArray(sourceData.anxChemicalProducts) ? sourceData.anxChemicalProducts : (sourceData.anxChemicalProducts ? [sourceData.anxChemicalProducts] : []),
      anxBioProducts: Array.isArray(sourceData.anxBioProducts) ? sourceData.anxBioProducts : (sourceData.anxBioProducts ? [sourceData.anxBioProducts] : []),
      anxOtherProducts: Array.isArray(sourceData.anxOtherProducts) ? sourceData.anxOtherProducts : (sourceData.anxOtherProducts ? [sourceData.anxOtherProducts] : [])
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

  const autoSave = () => {
    if (editData) return; 
    const currentValues = form.getValues(); 
    if (!currentValues || !currentValues.firmName) return; 

    if (draftIdRef.current) {
      updateDraft(draftIdRef.current, currentValues);
    } else {
      const newId = addDraft(currentValues, 'DISTRIBUTOR');
      draftIdRef.current = newId;
    }
  };

  // 🚀 THE FIX: Changed dependency array to [] so the cleanup function only runs on UNMOUNT!
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
  }, []); // <--- Empty dependency array is the crucial fix here!

  const saveDraft = () => {
    autoSave();
    useAlertStore.getState().showAlert("Saved", "Distributor onboarding saved as draft.");
    navigation.goBack();
  };

  const isNextEnabled = useMemo(() => {
    if (step === 1) {
        const mobileRegex = /^\d{10}$/;
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        const bankAccRegex = /^\d{9,18}$/;
        const pincodeRegex = /^\d{6}$/;
        const areBanksValid = values.bankAccounts?.every(b => b.accountName && b.bankNameBranch && bankAccRegex.test(b.accountNumber || '') && ifscRegex.test(b.bankIfsc || ''));
        return !!(values.firmName && values.firmName.length >= 2 && values.ownerName && values.ownerName.length >= 2 && values.contactPerson && values.contactPerson.length >= 2 && mobileRegex.test(values.contactMobile || '') && values.state && values.city && values.taluka && pincodeRegex.test(values.pincode || '') && values.address && values.address.length >= 5 && gstRegex.test(values.gstNumber || '') && panRegex.test(values.panNumber || '') && values.estYear && values.firmType && areBanksValid);
    }
    if (step === 2) return true;
    if (step === 3) return !!(values.appliedTerritory?.length > 0 && values.turnoverPotential && values.currentSuppliers?.length > 0 && values.currentSuppliers.every(s => s.length >= 2) && values.proposedStatus && values.demoFarmersCommitment && values.godownCapacity && values.coldChainFacility);
    if (step === 4) {
      const hasUploadedList = !!values.documents?.['dealer_network_list'];
      const hasValidManualDealers = !!(values.topDealers?.length && values.topDealers.every(d => d.name && d.name.length >= 2 && d.address && d.address.length >= 2 && /^\d{10}$/.test(d.contact || '')));
      return hasUploadedList || hasValidManualDealers;
    }
    if (step === 5) return Array.isArray(values.glsCommitments) && values.glsCommitments.length === DISTRIBUTOR_GLS_COMMITMENTS.length;
    if (step === 6) return true; 
    if (step === 7) {
      const coreDocs = ['gst_certificate', 'pan_card', 'cancelled_cheque', 'trade_licence', 'itr_declaration', 'authorisation_letter'];
      const photoDocs = ['storage_exterior', 'storage_interior'];
      const complianceDocs = (values.complianceChecklist || []).map((item: string) => item.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase());
      const allRequired = [...coreDocs, ...photoDocs, ...complianceDocs];
      return allRequired.every(key => { const doc = values.documents?.[key]; return Array.isArray(doc) ? doc.length > 0 : !!doc; });
    }
    if (step === 8) {
      const validTerritories = values.anxTerritories?.length > 0 && values.anxTerritories.every(t => t.state && t.district && t.taluka && Array.isArray(t.villages) && t.villages.length > 0 && t.cultivableArea && Array.isArray(t.majorCrops) && t.majorCrops.length > 0);
      const validSuppliers = values.anxPrincipalSuppliers?.length > 0 && values.anxPrincipalSuppliers.every(s => s.name && s.share);
      const validProducts = (values.anxChemicalProducts?.length || 0) > 0 && (values.anxBioProducts?.length || 0) > 0 && (values.anxOtherProducts?.length || 0) > 0;
      const validRefs = values.anxSupplierRefs?.length > 0 && values.anxSupplierRefs.every(ref => ref.name && ref.name.length >= 2 && /^\d{10}$/.test(ref.contact || ''));
      const hasVision = !!values.anxGrowthVision || !!values.anxGrowthVisionAudio;
      const securityDepositVal = parseInt(values.securityDeposit || '0');
      const hasPaymentProof = securityDepositVal === 0 || (securityDepositVal > 0 && (!!values.paymentProofText || !!values.documents?.['distributor_payment_proof']));
      return !!(validTerritories && validSuppliers && validProducts && validRefs && hasVision && hasPaymentProof);
    }
    if (step === 9) return !!(values.agreementAccepted && values.distributorSignature && values.seSignature);
    return true; 
  }, [step, values]);

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

    const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#166534" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

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
          .list { margin: 0; padding-left: 20px; font-size: 14px; }
          .list li { margin-bottom: 6px; color: #334155; }
          .pill { display: inline-block; background-color: #E2E8F0; color: #334155; padding: 4px 10px; border-radius: 15px; font-size: 12px; font-weight: 600; margin: 2px 4px 2px 0; }
          .signatures { display: table; width: 100%; margin-top: 50px; page-break-inside: avoid; }
          .sig-box { display: table-cell; width: 50%; text-align: center; }
          .sig-line { border-top: 2px solid #94A3B8; margin: 10px 60px 0; padding-top: 8px; font-weight: 800; color: #1E293B; font-size: 14px; text-transform: uppercase; }
          .empty-text { color: #94A3B8; font-style: italic; font-weight: 400; }
          .success-badge { color: #166534; font-weight: 800; font-size: 13px; }
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
    const html = generateHTML();
    const rawName = form.getValues('firmName') ? form.getValues('firmName').replace(/[^a-zA-Z0-9]/g, '_') : 'Distributor';
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
    setIsSubmitting(true);
    try {
      const dbPayload = {
        se_id: user?.id,
        firm_name: data.firmName,
        owner_name: data.ownerName,
        contact_person: data.contactPerson,
        contact_designation: data.contactDesignation,
        contact_mobile: data.contactMobile,
        email: data.email,
        address: data.address,
        city: data.city,
        state: data.state,
        taluka: data.taluka,
        pincode: data.pincode,
        gst_number: data.gstNumber,
        pan_number: data.panNumber,
        est_year: data.estYear,
        firm_type: data.firmType,
        total_score: scoreData.raw,
        band: scoreData.band,
        status: "SUBMITTED",
        distributor_signature: data.distributorSignature,
        se_signature: data.seSignature,
        raw_data: data 
      };

      let dbResultId = editData?.id;

      if (editData) {
        const { error } = await supabase.from('distributors').update(dbPayload).eq('id', editData.id);
        if (error) throw error;
      } else {
        const { data: dbResult, error } = await supabase.from('distributors').insert([dbPayload]).select('id').single();
        if (error) throw error;
        dbResultId = dbResult.id;
      }

      const html = generateHTML();
      const { uri } = await Print.printToFileAsync({ html });
      const pdfUrl = await uploadFileToCloudinary(uri, 'raw');
      
      await supabase.from('distributors').update({ pdf_url: pdfUrl }).eq('id', dbResultId);

      if (draftIdRef.current) {
         removeDraft(draftIdRef.current);
         draftIdRef.current = undefined; 
      }
      setShowSuccess(true);
    } catch (e: any) {
      useAlertStore.getState().showAlert("Error", e.message);
    } finally {
      setIsSubmitting(false);
    }
  });

  return { 
    form, step, setStep, jumpBackTo, setJumpBackTo, saveDraft, submit, 
    scoreData, handleUpload, handleAudioUpload, uploading, isSubmitting, 
    isNextEnabled, showSuccess, setShowSuccess, generatePDF, 
    isEditing: !!editData 
  };
}