// src/modules/FarmCard/hooks.ts
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location'; 
import { requestCameraPermission } from '../../core/permissions';
import { uploadFileToCloudinary } from '../onboarding/services/cloudinaryService';
import { farmCardSchema, FarmCardValues } from './schema';
import { useAuthStore } from '../../store/authStore';
import { useAlertStore } from '../../store/alertStore';
import { saveFarmCard } from './services/farmCardService';
import { useShiftStore } from '../../store/shiftStore';
import { Alert } from 'react-native';

export function useFarmCardOnboarding(navigation: any, route: any) {
  const user = useAuthStore((s) => s.user);
  
  // 🚀 Extract draftCard from route params
  const { farmer, draftCard } = route.params;

  const [step, setStep] = useState(1);
  const [jumpBackTo, setJumpBackTo] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const rawData = farmer?.raw || {};
  const personalDetails = rawData.personal_details || {};
  const farmDetails = rawData.farm_details || {};
  const historyCrops = rawData.history_details?.pastCrops || [];

  const inheritedSoil = Array.isArray(farmDetails.soilType) && farmDetails.soilType.length > 0 ? farmDetails.soilType[0] : '';
  const inheritedWater = Array.isArray(farmDetails.waterSource) && farmDetails.waterSource.length > 0 ? farmDetails.waterSource[0] : '';
  const inheritedIrrigation = Array.isArray(farmDetails.irrigationType) && farmDetails.irrigationType.length > 0 ? farmDetails.irrigationType[0] : '';

  const cattleList = Array.isArray(farmDetails.cattles) ? farmDetails.cattles : [];
  const cowQty = cattleList.find((c: any) => c.type === 'Cow')?.quantity || '';
  const buffaloQty = cattleList.find((c: any) => c.type === 'Buffalo')?.quantity || '';
  const draftQty = cattleList.find((c: any) => c.type === 'Ox / Bull')?.quantity || '';
  const goatQty = parseInt(cattleList.find((c: any) => c.type === 'Goats / Sheep' || c.type === 'Goat / Sheep')?.quantity || '0', 10);
  const poultryQty = parseInt(cattleList.find((c: any) => c.type === 'Poultry')?.quantity || '0', 10);
  const combinedGoatPoultry = (goatQty + poultryQty) > 0 ? String(goatQty + poultryQty) : '';

  const farmerEquip = Array.isArray(farmDetails.farmEquipments) ? farmDetails.farmEquipments : [];
  const initialTractorSelection = (farmerEquip.includes('Tractor') || farmerEquip.includes('Mini Tractor')) ? ['Own Tractor'] : [];

  const initialHistory = historyCrops.length > 0 
    ? historyCrops.map((c: any) => {
        const parts = (c.yearSeason || '').split('-');
        const y = parts[0]?.trim() || '';
        const s = parts[1]?.trim() || '';
        return { year: y, season: s, cropGrown: c.cropName || '', area: c.area || '', areaUnit: c.areaUnit || 'Acres', inputCost: c.inputCost || '', total20kg: c.yield || '', yieldQtl: '', priceQtl: '' };
      })
    : [{ year: '', season: '', cropGrown: '', area: '', areaUnit: 'Acres', inputCost: '', total20kg: '', yieldQtl: '', priceQtl: '' }];

  // 🚀 Extract the defaults into a fallback object to prevent missing keys in drafts
  const fallbackDefaults = {
    farmerId: farmer.id,
    farmerName: rawData.full_name || farmer.name || '',
    mobileNumber: rawData.mobile || '',
    primaryWhatsapp: personalDetails.alternateMobile || rawData.mobile || '',
    state: personalDetails.state || farmer.state || '',
    district: personalDetails.city || farmer.city || '', 
    taluka: personalDetails.taluka || '',
    village: rawData.village || personalDetails.village || '',
    educationLevel: '', farmingExperience: '', familyMembers: '', labourType: '',
    fieldNumber: '', plotNumber: '', surveyNo: '',
    totalLandArea: farmDetails.totalLand || '', totalLandAreaUnit: farmDetails.landUnit || 'Acres', 
    cultivatedArea: '', cultivatedAreaUnit: 'Acres', 
    fsppCommittedArea: '', fsppCommittedAreaUnit: 'Acres',
    legalOwnerName: '', landStatus: farmDetails.irrigatedLand ? 'Irrigated' : 'Rainfed',
    soilType: inheritedSoil, soilPh: '', soilEc: '', organicMatter: '', nitrogen: '', phosphorus: '', potassium: '', drainageCondition: '', 
    soilTestStatus: '', soilTestDate: '',
    waterSource: inheritedWater, irrigationMethod: inheritedIrrigation, waterAvailability: '', irrigationFrequency: '', waterTds: '', pumpHp: '', dripArea: '', dripAreaUnit: 'Acres', waterPh: '',
    yieldHistory: initialHistory,
    preferredChemFert: [''], preferredChemCrop: [''], currentBioBrands: [''], decisionFactor: '',
    primarySalesChannel: [], distanceToMarket: '', transportMethod: [], paymentCycle: [],
    tractorOwnership: initialTractorSelection, sowingEquipment: [], sprayEquipment: [], tillageMachinery: [],
    milchCows: cowQty, buffaloes: buffaloQty, draftAnimals: draftQty, goatsSheepPoultry: combinedGoatPoultry,
    fymGenerated: '', fymHandlingMethod: '', cropResidueManagement: '', compostEnrichmentWillingness: '',
    waterBorneRunoffRisk: '', airborneSprayDriftRisk: '', edgePlantationPresent: '', biologicalCropBarrier: '', dominantPestVector: '',
    boundary_polygon: [],
    digitalAdoption: [], documents: { field_boundary: '', soil_squeeze: '', lab_report: '' }, media_gps: {}
  };

  const form = useForm<FarmCardValues>({
    resolver: zodResolver(farmCardSchema),
    // 🚀 Safely merge the draft data OVER the fallback defaults
    defaultValues: draftCard?.card_data ? { ...fallbackDefaults, ...draftCard.card_data } : fallbackDefaults,
    mode: 'onChange'
  });

  const { isDirty } = form.formState;

  // 🚀 FIXED: Added uploading state triggers while processing media and GPS
  const handleCameraUpload = async (key: string, allowVideo: boolean = false) => {
    const perm = await requestCameraPermission();
    if (!perm.granted) return useAlertStore.getState().showAlert("Permission Denied", perm.fallbackMessage);

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return useAlertStore.getState().showAlert("GPS Required", "GPS is strictly required."); 
    
    let selectedMediaTypes = ['images'];
    
    if (allowVideo) {
      const userChoice = await new Promise<string | null>((resolve) => {
        Alert.alert(
          "Select Capture Mode",
          "What would you like to capture?",
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
            { text: "Take Photo", onPress: () => resolve("photo") },
            { text: "Record Video", onPress: () => resolve("video") }
          ]
        );
      });

      if (!userChoice) return; 
      if (userChoice === "video") selectedMediaTypes = ['videos'];
    }

    const result = await ImagePicker.launchCameraAsync({ 
      mediaTypes: selectedMediaTypes as any, 
      quality: 0.6,
      videoMaxDuration: 15,
    });
    
    if (result.canceled) return;

    // 🚀 START LOADER (Fetching precise GPS takes a few seconds)
    setUploading(prev => ({ ...prev, [key]: true }));

    try {
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      
      const localUri = result.assets[0].uri; 
      
      const currentDocs = form.getValues('documents') || {};
      const currentGps = form.getValues('media_gps') || {};

      // 🚀 NEW: Generate an accurate IST Timestamp exactly when the media is captured
      const timestampIST = new Date().toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true 
      });
      
      form.setValue('documents', { ...currentDocs, [key]: localUri }, { shouldValidate: true });
      
      // 🚀 INJECT timestamp into the media_gps payload along with lat and lng
      form.setValue('media_gps', { 
        ...currentGps, 
        [key]: { 
          lat: location.coords.latitude, 
          lng: location.coords.longitude,
          timestamp: timestampIST // Will look like: "25 Oct 2023, 04:30:15 PM"
        },
      }, { shouldDirty: true });
    } catch(e) {
      useAlertStore.getState().showAlert("Error", "Capture failed.");
    } finally {
      // 🚀 STOP LOADER
      setUploading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleBoundaryCapture = async (localUri: string, polygon: any[]) => {
    // 🚀 START LOADER
    setUploading(prev => ({ ...prev, field_boundary: true }));
    try {
      const currentDocs = form.getValues('documents') || {};
      
      form.setValue('documents', { ...currentDocs, field_boundary: localUri }, { shouldValidate: true, shouldDirty: true });
      form.setValue('boundary_polygon', polygon, { shouldValidate: true });
    } catch (e) {
      useAlertStore.getState().showAlert("Error", "Failed to capture boundary snapshot.");
    } finally {
      // 🚀 STOP LOADER
      setUploading(prev => ({ ...prev, field_boundary: false }));
    }
  };

  const submit = form.handleSubmit(async (data) => {
    if (!user?.id) return;

    // 🚀 RULE 1: Strict Validation - Cannot submit until ALL required fields are inputted
    const missingKeys: string[] = [];
    const optionalFields = ['digitalAdoption', 'media_gps']; // Fields that are allowed to be completely empty

    for (const [key, val] of Object.entries(data)) {
      if (optionalFields.includes(key)) continue;
      if (key === 'soilTestDate' && data.soilTestStatus !== 'Yes') continue;
      if (key === 'biologicalCropBarrier' && data.edgePlantationPresent !== 'Yes') continue;
      
      // Check Boundary Polygon
      if (key === 'boundary_polygon' && (!val || (val as any[]).length === 0)) { missingKeys.push(key); continue; }
      
      // Check Documents
      if (key === 'documents') {
        const docs = val as any;
        if (!docs.field_boundary || !docs.soil_squeeze || !docs.lab_report) missingKeys.push(key);
        continue;
      }

      // Check standard strings
      if (typeof val === 'string' && val.trim() === '') { missingKeys.push(key); continue; }
      
      // Check dynamic arrays (Brands, Yield History)
      if (Array.isArray(val)) {
        if (val.length === 0) { missingKeys.push(key); continue; }
        // Block arrays that just have an empty string inside them like ['']
        if (val.some(item => typeof item === 'string' && item.trim() === '')) { missingKeys.push(key); continue; }
        
        // Block empty properties inside the yield history objects
        if (key === 'yieldHistory') {
          let yhMissing = false;
          val.forEach((yh: any) => {
            if (Object.values(yh).some(v => typeof v === 'string' && v.trim() === '')) yhMissing = true;
          });
          if (yhMissing) missingKeys.push(key);
        }
      }
    }

    if (missingKeys.length > 0) {
      useAlertStore.getState().showAlert(
        "Incomplete Farm Card", 
        "You cannot submit until ALL fields are filled (put 'N/A' if not applicable) and all photographic evidence is captured."
      );
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 🚀 CRITICAL FIX: Upload local images to Cloudinary BEFORE saving to DB
      const finalDocuments: Record<string, string> = {};
      const currentDocs = data.documents || {};

      for (const [key, uri] of Object.entries(currentDocs)) {
        if (uri) {
          if (uri.startsWith('file://')) {
            // 🚀 Dynamically detect if the captured file is a video (.mp4 or .mov)
            const isVideo = uri.toLowerCase().endsWith('.mp4') || uri.toLowerCase().endsWith('.mov');
            
            // Pass the correct resource_type to your Cloudinary uploader ('video' or 'image')
            const cloudUrl = await uploadFileToCloudinary(uri, isVideo ? 'video' : 'image');
            finalDocuments[key] = cloudUrl;
          } else {
            finalDocuments[key] = uri as string;
          }
        }
      }

      // 🚀 Inject the newly uploaded Cloudinary URLs back into the payload
      const finalData = {
        ...data,
        documents: finalDocuments
      };

      // 🚀 Pass the draft ID as the 4th parameter so the database Updates instead of Inserts
      await saveFarmCard(finalData, user.id, 'SUBMITTED', draftCard?.id);
      
      await useShiftStore.getState().incrementActivity();
      await useShiftStore.getState().logShiftEvent('activity', 'Generated Farm Card', `${data.farmerName} (${data.village}, ${data.taluka})`);
      
      useAlertStore.getState().showAlert("Success", "Farm Card generated and secured.");
      navigation.navigate("MainTabs");
    } catch (e: any) {
      useAlertStore.getState().showAlert("Error", e.message || "Failed to upload images or save Farm Card.");
    } finally {
      setIsSubmitting(false);
    }
  });

  // 🚀 Save Draft Function
  const saveDraft = async () => {
    if (!user?.id) return;
    setIsSavingDraft(true); // 🚀 USE DEDICATED LOADER STATE
    
    try {
      const currentData = form.getValues(); 
      
      const finalDocuments: Record<string, string> = {};
      const currentDocs = currentData.documents || {};

      for (const [key, uri] of Object.entries(currentDocs)) {
        if (uri) {
          if (uri.startsWith('file://')) {
            const isVideo = uri.toLowerCase().endsWith('.mp4') || uri.toLowerCase().endsWith('.mov');
            const cloudUrl = await uploadFileToCloudinary(uri, isVideo ? 'video' : 'image');
            finalDocuments[key] = cloudUrl;
          } else {
            finalDocuments[key] = uri as string;
          }
        }
      }

      const draftPayload = {
        ...currentData,
        documents: finalDocuments
      };

      await saveFarmCard(draftPayload, user.id, 'DRAFT', draftCard?.id);
      
      useAlertStore.getState().showAlert("Draft Saved", "Farm Card progress has been saved.");
      navigation.goBack();
    } catch (e: any) {
      useAlertStore.getState().showAlert("Error", e.message || "Failed to save draft.");
    } finally {
      setIsSavingDraft(false); // 🚀 STOP LOADER
    }
  };

  // 🚀 Added saveDraft to the returned variables
  return { form, step, setStep, jumpBackTo, setJumpBackTo, submit, saveDraft, handleCameraUpload, handleBoundaryCapture, uploading, isSubmitting, isDirty, isSavingDraft };
}