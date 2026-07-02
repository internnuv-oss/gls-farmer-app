// Frontend/src/modules/onboarding/fpo/screens/steps/Step1BasicInfo.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, SelectField, TextArea, YearPickerField } from '../../../../../design-system/components';
import { colors, radius, spacing } from '../../../../../design-system/tokens';
import { FPOOnboardingValues } from '../../schema';
import { supabase } from '../../../../../core/supabase';

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli", "Daman and Diu", "Delhi", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", 
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", 
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

interface Props {
  form: UseFormReturn<FPOOnboardingValues>;
  t: any;
  isEditing?: boolean;
  isLocked?: boolean;
}

export const Step1BasicInfo = ({ form, t, isEditing, isLocked }: Props) => {
  const { control, watch, setValue } = form;

  const banks = watch('bankAccounts') || [{ isActive: true, accountName: '', accountNumber: '', bankIfsc: '', bankNameBranch: '' }];

  // --- Location Cascading Logic ---
  const selectedState = watch('state');
  const selectedDistrict = watch('city');
  const [stateData, setStateData] = useState<any>(null);
  const [districtsList, setDistrictsList] = useState<string[]>([]);
  const [talukasList, setTalukasList] = useState<string[]>([]);
  const [loadingLoc, setLoadingLoc] = useState(false);

  useEffect(() => {
    if (!selectedState) { 
      setStateData(null);
      setDistrictsList([]); 
      setTalukasList([]);
      return; 
    }
    
    const fetchStateData = async () => {
      setLoadingLoc(true);
      try {
        // 🚀 Fetch directly from Supabase RPC
        const { data, error } = await supabase.rpc('get_gujarat_location_tree');
        if (error || !data) throw new Error("Location data not found.");
        
        setStateData(data);
      } catch (e) {
        console.log("Supabase fetch failed: ", e);
        setStateData(null);
        setDistrictsList([]);
      } finally { 
        setLoadingLoc(false); 
      }
    };

    fetchStateData();
  }, [selectedState]);

  useEffect(() => {
    if (!stateData || !stateData.districts) return setDistrictsList([]);
    setDistrictsList(stateData.districts.map((d: any) => d.district).sort());
  }, [stateData]);

  useEffect(() => {
    if (!selectedDistrict || !stateData || !stateData.districts) return setTalukasList([]);
    const dist = stateData.districts.find((d: any) => d.district === selectedDistrict);
    if (dist && dist.subDistricts) {
      setTalukasList(dist.subDistricts.map((sd: any) => sd.subDistrict).sort());
    } else {
      setTalukasList([]);
    }
  }, [selectedDistrict, stateData]);

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("Basic Information")}</Text>
      
      {/* 🚀 MOVED TO TOP: FPO Name (Locked if submitted) */}
      <View pointerEvents={isLocked ? "none" : "auto"} style={{ opacity: isLocked ? 0.5 : 1, marginBottom: spacing.sm }}>
        <Controller 
          control={control} 
          name="fpoName" 
          render={({field}) => (
            <Input 
              label={t("Full Name of FPO (Must be Unique) *")} 
              value={field.value} 
              onChangeText={field.onChange} 
              placeholder={t("e.g. Kisan Samridhi FPO")} 
              error={form.formState.errors.fpoName?.message} 
            />
          )} 
        />
      </View>

      {/* Contact Info */}
      <Controller control={control} name="contactMobile" render={({field}) => <Input label={t("Phone / Mobile / WhatsApp *")} value={field.value} onChangeText={field.onChange} prefix="+91" keyboardType="phone-pad" maxLength={10} placeholder="9876543210" error={form.formState.errors.contactMobile?.message} />} />
      <Controller control={control} name="email" render={({field}) => <Input label={t("Email Address")} value={field.value} onChangeText={(val) => field.onChange(val.toLowerCase())} keyboardType="email-address" autoCapitalize="none" placeholder={t("e.g. contact@fpo.com")} error={form.formState.errors.email?.message} />} />
      
      <View style={{ backgroundColor: '#F8FAFC', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.sm }}>{t("Leadership Details")}</Text>
        <Controller control={control} name="ceoName" render={({field}) => <Input label={t("CEO / Managing Director Name *")} value={field.value} onChangeText={field.onChange} placeholder={t("e.g. Suresh Patel")} error={form.formState.errors.ceoName?.message} />} />
        <Controller control={control} name="bodPresidentName" render={({field}) => <Input label={t("Board of Directors (BoD) President Name *")} value={field.value} onChangeText={field.onChange} placeholder={t("e.g. Ramesh Bhai")} error={form.formState.errors.bodPresidentName?.message} />} />
      </View>

      {/* Other Locked Fields */}
      <View pointerEvents={isLocked ? "none" : "auto"} style={{ opacity: isLocked ? 0.5 : 1 }}>
        <Controller control={control} name="promotingAgency" render={({field}) => <SelectField label={t("Promoting Agency *")} value={field.value ?? ''} options={['SFAC', 'NABARD', 'NGO', 'Misc / Other']} onChange={field.onChange} error={form.formState.errors.promotingAgency?.message} />} />
        
        <View style={{ backgroundColor: '#F8FAFC', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
          <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.sm }}>{t("Registration Details")}</Text>
          <Controller control={control} name="registrationNumber" render={({field}) => <Input label={t("Registration No (ROC / Cooperative Act) *")} value={field.value} onChangeText={field.onChange} placeholder={t("Enter Reg No.")} error={form.formState.errors.registrationNumber?.message} />} />
          <Controller control={control} name="incorporationYear" render={({field}) => <YearPickerField label={t("Year of Incorporation *")} value={field.value ?? ''} onChange={field.onChange} placeholder={t("Select Year")} error={form.formState.errors.incorporationYear?.message} />} />
          <Controller control={control} name="gstNumber" render={({field}) => <Input label={t("GST Number")} value={field.value} onChangeText={(val) => field.onChange(val.toUpperCase())} placeholder="eg. 22AAAAA0000A1Z5" maxLength={15} error={form.formState.errors.gstNumber?.message} />} />
          <Controller control={control} name="panNumber" render={({field}) => <Input label={t("PAN Number")} value={field.value} onChangeText={(val) => field.onChange(val.toUpperCase())} placeholder="eg. ABCDE1234F" maxLength={10} error={form.formState.errors.panNumber?.message} />} />
        </View>

        <View style={{ backgroundColor: '#F8FAFC', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
          <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.sm }}>{t("Registered Office Address")}</Text>
          <Controller control={control} name="address" render={({field}) => <TextArea label={t("Street / Building / Area *")} value={field.value} onChangeText={field.onChange} placeholder={t("Enter street address...")} error={form.formState.errors.address?.message} />} />
          <Controller control={control} name="state" render={({field}) => <SelectField label={t("State *")} value={field.value ?? ''} options={INDIAN_STATES} searchable onChange={(val) => { field.onChange(val); setValue('city', '', { shouldValidate: true }); setValue('taluka', '', { shouldValidate: true }); }} error={form.formState.errors.state?.message} />} />
          <Controller control={control} name="city" render={({field}) => <SelectField label={loadingLoc ? t("District (Loading...) *") : t("District *")} value={field.value ?? ''} options={districtsList} searchable onChange={(val) => { field.onChange(val); setValue('taluka', '', { shouldValidate: true }); }} error={form.formState.errors.city?.message} />} />
          <Controller control={control} name="taluka" render={({field}) => <SelectField label={t("Taluka *")} value={field.value ?? ''} options={talukasList} searchable onChange={field.onChange} error={form.formState.errors.taluka?.message} />} />
          <Controller control={control} name="pincode" render={({field}) => <Input label={t("Pincode / Zip Code *")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" maxLength={6} placeholder={t("e.g. 390001")} error={form.formState.errors.pincode?.message} />} />
        </View>
        
        <Controller control={control} name="commandArea" render={({field}) => <Input label={t("Operational Command Area (Districts/Blocks) *")} value={field.value} onChangeText={field.onChange} placeholder={t("e.g. Vadodara, Padra Block")} error={form.formState.errors.commandArea?.message} />} />
      </View>

      <Text style={{ fontSize: 16, fontWeight: '800', marginTop: spacing.md, marginBottom: spacing.md }}>{t("Bank Details")}</Text>
      
      {banks.map((bank: any, index: number) => (
        <View key={index} style={{ backgroundColor: '#F8FAFC', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
            <Text style={{ fontWeight: '700', color: colors.text }}>{t("Bank Account")} {index + 1}</Text>
            
            {isEditing ? (
              <Controller control={control} name={`bankAccounts.${index}.isActive`} render={({field}) => (
                <Pressable onPress={() => field.onChange(field.value === false ? true : false)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ marginRight: 6, fontWeight: '700', color: colors.textMuted, fontSize: 14 }}>{t("Active")}</Text>
                  <MaterialIcons name={field.value !== false ? "check-box" : "check-box-outline-blank"} size={22} color={field.value !== false ? colors.primary : colors.textMuted} />
                </Pressable>
              )} />
            ) : index > 0 ? (
              <Pressable onPress={() => { const newBanks = banks.filter((_: any, i: number) => i !== index); setValue('bankAccounts', newBanks, {shouldValidate: true}); }}>
                <MaterialIcons name="close" size={20} color={colors.danger} />
              </Pressable>
            ) : null}
          </View>

          <Controller control={control} name={`bankAccounts.${index}.accountName`} render={({field}) => <Input label={t("Account Name *")} value={field.value} onChangeText={field.onChange} placeholder={t("e.g. Kisan Samridhi FPO")} error={form.formState.errors.bankAccounts?.[index]?.accountName?.message} />} />
          <Controller control={control} name={`bankAccounts.${index}.bankNameBranch`} render={({field}) => <Input label={t("Bank Name & Branch *")} value={field.value} onChangeText={field.onChange} placeholder={t("e.g. MG Road")} error={form.formState.errors.bankAccounts?.[index]?.bankNameBranch?.message} />} />
          <Controller control={control} name={`bankAccounts.${index}.accountNumber`} render={({field}) => <Input label={t("Account Number *")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" maxLength={18} placeholder={t("Enter exact account no.")} error={form.formState.errors.bankAccounts?.[index]?.accountNumber?.message} />} />
          <Controller control={control} name={`bankAccounts.${index}.bankIfsc`} render={({field}) => <Input label={t("IFSC Code *")} value={field.value} onChangeText={(val) => field.onChange(val.toUpperCase())} placeholder="e.g. HDFC0001234" maxLength={11} error={form.formState.errors.bankAccounts?.[index]?.bankIfsc?.message} />} />
        </View>
      ))}

      <Pressable onPress={() => setValue('bankAccounts', [...banks, { isActive: true, accountName: '', accountNumber: '', bankIfsc: '', bankNameBranch: '' }])} style={{ padding: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md, alignItems: 'center' }}>
        <Text style={{ color: colors.primary, fontWeight: '800' }}>+ {t("Add Another Bank Account")}</Text>
      </Pressable>
    </View>
  );
};