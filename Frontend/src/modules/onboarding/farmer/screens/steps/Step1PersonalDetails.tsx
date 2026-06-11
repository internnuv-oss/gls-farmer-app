// Frontend/src/modules/onboarding/farmer/screens/steps/Step1PersonalDetails.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, Image } from 'react-native';
import { Controller } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, SelectField } from '../../../../../design-system/components';
import { colors, radius, spacing, shadows } from '../../../../../design-system/tokens';
import { useTranslation } from 'react-i18next';

// Hardcoded state list so we always have the top-level dropdown available
export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli", "Daman and Diu", "Delhi", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", 
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", 
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

// Emergency fallback just in case GitHub goes down
const GUJARAT_DISTRICTS = [
  "Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar", "Botad", 
  "Chhota Udaipur", "Dahod", "Dang", "Devbhoomi Dwarka", "Gandhinagar", "Gir Somnath", "Jamnagar", 
  "Junagadh", "Kutch", "Kheda", "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal", 
  "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar", "Tapi", "Vadodara", "Valsad"
];

export const Step1PersonalDetails = ({ control, errors, t, watch, setValue, uploading, handleUpload, isLocked }: any) => {
  const profilePhoto = watch('profilePhoto');
  
  // 🚀 Watch all three levels to trigger cascading effects
  const selectedState = watch('state');
  const selectedDistrict = watch('city');
  const selectedTaluka = watch('taluka');
  
  const [stateData, setStateData] = useState<any>(null);
  const [districtsList, setDistrictsList] = useState<string[]>([]);
  const [talukasList, setTalukasList] = useState<string[]>([]);
  const [villagesList, setVillagesList] = useState<string[]>([]); // 🚀 NEW: Village State
  const [loadingLoc, setLoadingLoc] = useState(false);

  // 1. Fetch the entire State Object from GitHub
  useEffect(() => {
    if (!selectedState) { 
      setStateData(null);
      setDistrictsList([]); 
      setTalukasList([]);
      setVillagesList([]);
      return; 
    }
    
    const fetchStateData = async () => {
      setLoadingLoc(true);
      try {
        const res = await fetch(`https://raw.githubusercontent.com/internnuv-oss/indian-cities-and-villages/master/By%20States/${encodeURIComponent(selectedState)}.json`);
        if (!res.ok) throw new Error("State file not found.");
        
        const data = await res.json();
        setStateData(data);
      } catch (e) {
        console.log("GitHub fetch failed, using fallback for: ", selectedState);
        setStateData(null);
        if (selectedState === 'Gujarat') setDistrictsList(GUJARAT_DISTRICTS);
        else setDistrictsList([]);
      } finally { 
        setLoadingLoc(false); 
      }
    };

    fetchStateData();
  }, [selectedState]);

  // 2. Extract Districts whenever the State Data loads
  useEffect(() => {
    if (!stateData || !stateData.districts) return;
    setDistrictsList(stateData.districts.map((d: any) => d.district).sort());
  }, [stateData]);

  // 3. Extract Talukas (subDistricts) whenever the District changes
  useEffect(() => {
    if (!selectedDistrict || !stateData || !stateData.districts) {
      setTalukasList([]);
      return;
    }
    const dist = stateData.districts.find((d: any) => d.district === selectedDistrict);
    if (dist && dist.subDistricts) {
      setTalukasList(dist.subDistricts.map((sd: any) => sd.subDistrict).sort());
    } else {
      setTalukasList([]);
    }
  }, [selectedDistrict, stateData]);

  // 🚀 4. NEW: Extract Villages whenever the Taluka changes!
  useEffect(() => {
    if (!selectedDistrict || !selectedTaluka || !stateData || !stateData.districts) {
      setVillagesList([]);
      return;
    }
    
    // Find the district first
    const dist = stateData.districts.find((d: any) => d.district === selectedDistrict);
    if (dist && dist.subDistricts) {
      // Then find the taluka inside that district
      const subDist = dist.subDistricts.find((sd: any) => sd.subDistrict === selectedTaluka);
      // If it has villages, map and sort them!
      if (subDist && subDist.villages) {
        setVillagesList(subDist.villages.sort());
      } else {
        setVillagesList([]);
      }
    } else {
      setVillagesList([]);
    }
  }, [selectedDistrict, selectedTaluka, stateData]);


  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("Personal Details")}</Text>

      {/* Profile Photo Capture */}
      <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
        <Pressable 
          onPress={() => handleUpload('profilePhoto')}
          style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: profilePhoto ? colors.success : colors.border, overflow: 'hidden', ...shadows.soft }}
        >
          {uploading?.['profilePhoto'] ? (
            <ActivityIndicator color={colors.primary} />
          ) : profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <MaterialIcons name="camera-alt" size={32} color={colors.textMuted} />
          )}
        </Pressable>
        <Text style={{ color: colors.primary, fontWeight: '700', marginTop: spacing.sm }}>
          {profilePhoto ? t("Tap to Retake Photo") : t("Capture Profile Photo")}
        </Text>
      </View>

      <Controller control={control} name="mobile" render={({field}) => <Input label={t("Mobile Number *")} placeholder="9876543210" value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" maxLength={10} prefix="+91" error={errors.mobile?.message} />} />
      <Controller control={control} name="alternateMobile" render={({field}) => <Input label={t("Alternate Mobile Number (Optional)")} placeholder="9876543210" value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" maxLength={10} prefix="+91" />} />
      <View pointerEvents={isLocked ? "none" : "auto"} style={{ opacity: isLocked ? 0.5 : 1 }}>
        <Controller control={control} name="fullName" render={({field}) => <Input label={t("Farmer Full Name *")} placeholder={t("e.g., Ramesh Patel")} value={field.value} onChangeText={field.onChange} error={errors.fullName?.message} />} />
        <Controller control={control} name="fatherName" render={({field}) => <Input label={t("Father/Husband Name *")} placeholder={t("e.g., Suresh Patel")} value={field.value} onChangeText={field.onChange} error={errors.fatherName?.message} />} />
        {/* 🚀 Dynamic Cascading Dropdowns */}
      <Controller 
        control={control} 
        name="state" 
        render={({field}) => (
          <SelectField 
            label={t("State *")} 
            options={INDIAN_STATES} 
            value={field.value} 
            searchable
            onChange={(val: string) => { 
              field.onChange(val); 
              // Clear everything downstream when state changes
              setValue('city', '', { shouldValidate: true }); 
              setValue('taluka', '', { shouldValidate: true }); 
              setValue('village', '', { shouldValidate: true }); 
            }} 
            error={errors.state?.message} 
          />
        )} 
      />
      
      <Controller 
        control={control} 
        name="city" 
        render={({field}) => (
          districtsList.length > 0 ? (
            <SelectField 
              label={loadingLoc ? t("District (Loading...) *") : t("District *")} 
              options={districtsList} 
              value={field.value} 
              searchable
              onChange={(val: string) => { 
                field.onChange(val); 
                setValue('taluka', '', { shouldValidate: true }); 
                setValue('village', '', { shouldValidate: true }); 
              }} 
              error={errors.city?.message} 
            />
          ) : (
            // 🚀 FALLBACK: If GitHub fails, let them type it manually!
             <Input 
               label={t("District *")} 
               value={field.value} 
               onChangeText={(val) => {
                  field.onChange(val);
                  setValue('taluka', '', { shouldValidate: true }); 
                  setValue('village', '', { shouldValidate: true }); 
               }} 
               error={errors.city?.message} 
             />
          )
        )} 
      />
      
      {talukasList.length > 0 ? (
        <Controller 
          control={control} 
          name="taluka" 
          render={({field}) => (
            <SelectField 
              label={t("Taluka *")} 
              options={talukasList} 
              value={field.value} 
              searchable
              onChange={(val: string) => {
                field.onChange(val);
                // Clear village when taluka changes
                setValue('village', '', { shouldValidate: true });
              }} 
              error={errors.taluka?.message} 
            />
          )} 
        />
      ) : (
        <Controller control={control} name="taluka" render={({field}) => <Input label={t("Taluka *")} value={field.value} onChangeText={field.onChange} error={errors.taluka?.message} />} />
      )}

      {/* 🚀 NEW: Village is now a dropdown populated from the selected Taluka */}
      {villagesList.length > 0 ? (
        <Controller 
          control={control} 
          name="village" 
          render={({field}) => (
            <SelectField 
              label={t("Village *")} 
              options={villagesList} 
              value={field.value} 
              searchable
              onChange={field.onChange} 
              error={errors.village?.message} 
            />
          )} 
        />
      ) : (
        <Controller control={control} name="village" render={({field}) => <Input label={t("Village *")} value={field.value} onChangeText={field.onChange} error={errors.village?.message} />} />
      )}

      <Controller control={control} name="pincode" render={({field}) => <Input label={t("Pincode (Optional)")} placeholder="e.g., 390001" value={field.value} onChangeText={field.onChange} keyboardType="numeric" maxLength={6} error={errors.pincode?.message} />} />
      </View>
    </View>
  );
};