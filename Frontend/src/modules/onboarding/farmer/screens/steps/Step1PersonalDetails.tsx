import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { Controller } from 'react-hook-form';
import { Input, SelectField } from '../../../../../design-system/components';
import { spacing } from '../../../../../design-system/tokens';

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli", "Daman and Diu", "Delhi", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", 
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", 
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

export const Step1PersonalDetails = ({ control, errors, t, watch, setValue }: any) => {
  // 1. Watch the values to trigger the cascades
  const selectedState = watch('state');
  const selectedDistrict = watch('city');
  const selectedTaluka = watch('taluka');

  // 2. State to hold the fetched data
  const [stateData, setStateData] = useState<any>(null);
  const [districtsList, setDistrictsList] = useState<string[]>([]);
  const [talukasList, setTalukasList] = useState<string[]>([]);
  const [villagesList, setVillagesList] = useState<string[]>([]);
  const [loadingLoc, setLoadingLoc] = useState(false);

  // 3. Mirroring your exact Dealer Onboarding Fetch Logic
  useEffect(() => {
    if (!selectedState) { setStateData(null); setDistrictsList([]); return; }
    
    const fetchStateData = async () => {
      setLoadingLoc(true);
      try {
        const res = await fetch(`https://raw.githubusercontent.com/internnuv-oss/indian-cities-and-villages/master/By%20States/${encodeURIComponent(selectedState)}.json`);
        if (!res.ok) throw new Error("State file not found.");
        setStateData(await res.json());
      } catch (e) {
        setDistrictsList([]); 
        setStateData(null);
      } finally { 
        setLoadingLoc(false); 
      }
    };
    
    fetchStateData();
  }, [selectedState]);

  // Extract Districts
  useEffect(() => {
    if (!stateData || !stateData.districts) return setDistrictsList([]);
    setDistrictsList(stateData.districts.map((d: any) => d.district).sort());
  }, [stateData]);

  // Extract Talukas
  useEffect(() => {
    if (!selectedDistrict || !stateData || !stateData.districts) return setTalukasList([]);
    const dist = stateData.districts.find((d: any) => d.district === selectedDistrict);
    if (dist && dist.subDistricts) {
      setTalukasList(dist.subDistricts.map((sd: any) => sd.subDistrict).sort());
    } else {
      setTalukasList([]);
    }
  }, [selectedDistrict, stateData]);

  // Extract Villages
  useEffect(() => {
    if (!selectedTaluka || !selectedDistrict || !stateData || !stateData.districts) return setVillagesList([]);
    const dist = stateData.districts.find((d: any) => d.district === selectedDistrict);
    if (dist && dist.subDistricts) {
      const sub = dist.subDistricts.find((sd: any) => sd.subDistrict === selectedTaluka);
      if (sub && sub.villages) {
        setVillagesList([...sub.villages].sort());
      } else {
        setVillagesList([]);
      }
    } else {
      setVillagesList([]);
    }
  }, [selectedTaluka, selectedDistrict, stateData]);

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("Farmer Details")}</Text>
      
      {/* Name Fields */}
      <Controller control={control} name="fullName" render={({field}) => (
        <Input label={t("Farmer's Full Name *")} value={field.value} onChangeText={field.onChange} error={errors.fullName?.message} />
      )} />
      <Controller control={control} name="fatherName" render={({field}) => (
        <Input label={t("Father's / Husband's Name *")} value={field.value} onChangeText={field.onChange} error={errors.fatherName?.message} />
      )} />
      
      {/* Mobile Fields on Separate Lines */}
      <Controller control={control} name="mobile" render={({field}) => (
        <Input label={t("Mobile No *")} value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" maxLength={10} prefix="+91" error={errors.mobile?.message} />
      )} />
      <Controller control={control} name="alternateMobile" render={({field}) => (
        <Input label={t("Alternate No (Optional)")} value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" maxLength={10} prefix="+91" error={errors.alternateMobile?.message} />
      )} />
      
      {/* Cascading Location Dropdowns */}
      <Controller control={control} name="state" render={({field}) => (
        <SelectField 
          label={t("State *")} 
          value={field.value ?? ''} 
          options={INDIAN_STATES} 
          searchable 
          onChange={(val) => { 
            field.onChange(val); 
            setValue('city', '', { shouldValidate: true }); 
            setValue('taluka', '', { shouldValidate: true }); 
            setValue('village', '', { shouldValidate: true }); 
          }} 
          error={errors.state?.message} 
        />
      )} />
      
      <Controller control={control} name="city" render={({field}) => (
        <SelectField 
          label={loadingLoc ? t("District (Loading...) *") : t("District *")} 
          value={field.value ?? ''} 
          options={districtsList} 
          searchable 
          onChange={(val) => { 
            field.onChange(val); 
            setValue('taluka', '', { shouldValidate: true }); 
            setValue('village', '', { shouldValidate: true }); 
          }} 
          error={errors.city?.message} 
        />
      )} />
      
      <Controller control={control} name="taluka" render={({field}) => (
        <SelectField 
          label={t("Taluka *")} 
          value={field.value ?? ''} 
          options={talukasList} 
          searchable 
          onChange={(val) => { 
            field.onChange(val); 
            setValue('village', '', { shouldValidate: true }); 
          }} 
          error={errors.taluka?.message} 
        />
      )} />
      
      <Controller control={control} name="village" render={({field}) => (
        <SelectField 
          label={t("Village *")} 
          value={field.value ?? ''} 
          options={villagesList} 
          searchable 
          onChange={field.onChange} 
          error={errors.village?.message} 
        />
      )} />
    </View>
  );
};