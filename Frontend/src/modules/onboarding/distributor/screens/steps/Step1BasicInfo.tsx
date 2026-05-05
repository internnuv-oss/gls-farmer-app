import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, SelectField, TextArea, YearPickerField } from '../../../../../design-system/components';
import { colors, radius, spacing } from '../../../../../design-system/tokens';
import { DistributorOnboardingValues } from '../../schema';

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli", "Daman and Diu", "Delhi", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", 
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", 
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

interface Props {
  form: UseFormReturn<DistributorOnboardingValues>;
  t: any;
}

export const Step1BasicInfo = ({ form, t }: Props) => {
  const { control, watch, setValue } = form;

  const banks = watch('bankAccounts') || [{ accountName: '', accountNumber: '', bankIfsc: '', bankNameBranch: '' }];

  // --- Location Cascading Logic ---
  const selectedState = watch('state');
  const selectedDistrict = watch('city');
  const [stateData, setStateData] = useState<any>(null);
  const [districtsList, setDistrictsList] = useState<string[]>([]);
  const [talukasList, setTalukasList] = useState<string[]>([]);
  const [loadingLoc, setLoadingLoc] = useState(false);

  useEffect(() => {
    if (!selectedState) { setStateData(null); setDistrictsList([]); return; }
    const fetchStateData = async () => {
      setLoadingLoc(true);
      try {
        const res = await fetch(`https://raw.githubusercontent.com/internnuv-oss/indian-cities-and-villages/master/By%20States/${encodeURIComponent(selectedState)}.json`);
        if (!res.ok) throw new Error("State file not found.");
        setStateData(await res.json());
      } catch (e) {
        setDistrictsList([]); setStateData(null);
      } finally { setLoadingLoc(false); }
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
      
      <Controller control={control} name="firmName" render={({field}) => <Input label={t("Full Name of Firm / Company *")} value={field.value} onChangeText={field.onChange} placeholder={t("e.g. Ramesh Agro Distributors")} error={form.formState.errors.firmName?.message} />} />
      <Controller control={control} name="ownerName" render={({field}) => <Input label={t("Owner / Proprietor Name *")} value={field.value} onChangeText={field.onChange} placeholder={t("e.g. Ramesh Patel")} error={form.formState.errors.ownerName?.message} />} />
      
      {/* GROUP: Point of Contact */}
      <View style={{ backgroundColor: '#F8FAFC', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.sm }}>{t("Point of Contact")}</Text>
        <Controller control={control} name="contactPerson" render={({field}) => <Input label={t("Contact Person Name *")} value={field.value} onChangeText={field.onChange} placeholder={t("e.g. Suresh Patel")} error={form.formState.errors.contactPerson?.message} />} />
        <Controller control={control} name="contactDesignation" render={({field}) => <Input label={t("Designation *")} value={field.value} onChangeText={field.onChange} placeholder={t("e.g. Manager")} error={form.formState.errors.contactDesignation?.message} />} />
      </View>
      
      <Controller control={control} name="contactMobile" render={({field}) => <Input label={t("Phone / Mobile / WhatsApp *")} value={field.value} onChangeText={field.onChange} prefix="+91" keyboardType="phone-pad" maxLength={10} placeholder="9876543210" error={form.formState.errors.contactMobile?.message} />} />
      <Controller control={control} name="email" render={({field}) => <Input label={t("Email (Optional)")} value={field.value} onChangeText={(val) => field.onChange(val.toLowerCase())} keyboardType="email-address" autoCapitalize="none" placeholder={t("e.g. contact@rameshagro.com")} error={form.formState.errors.email?.message} />} />
      
      {/* GROUP: Registered Address */}
      <View style={{ backgroundColor: '#F8FAFC', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.sm }}>{t("Registered Office Address")}</Text>
        <Controller control={control} name="address" render={({field}) => <TextArea label={t("Street / Building / Area *")} value={field.value} onChangeText={field.onChange} placeholder={t("Enter street address...")} error={form.formState.errors.address?.message} />} />
        <Controller control={control} name="state" render={({field}) => (
          <SelectField label={t("State *")} value={field.value ?? ''} options={INDIAN_STATES} searchable onChange={(val) => { field.onChange(val); setValue('city', '', { shouldValidate: true }); setValue('taluka', '', { shouldValidate: true }); }} error={form.formState.errors.state?.message} />
        )} />
        <Controller control={control} name="city" render={({field}) => (
          <SelectField label={loadingLoc ? t("District (Loading...) *") : t("District *")} value={field.value ?? ''} options={districtsList} searchable onChange={(val) => { field.onChange(val); setValue('taluka', '', { shouldValidate: true }); }} error={form.formState.errors.city?.message} />
        )} />
        <Controller control={control} name="taluka" render={({field}) => (
          <SelectField label={t("Taluka *")} value={field.value ?? ''} options={talukasList} searchable onChange={field.onChange} error={form.formState.errors.taluka?.message} />
        )} />
        <Controller control={control} name="pincode" render={({field}) => <Input label={t("Pincode / Zip Code *")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" maxLength={6} placeholder={t("e.g. 390001")} error={form.formState.errors.pincode?.message} />} />
      </View>

      <Controller control={control} name="gstNumber" render={({field}) => <Input label={t("GST Number *")} value={field.value} onChangeText={(val) => field.onChange(val.toUpperCase())} placeholder="eg. 22AAAAA0000A1Z5" maxLength={15} error={form.formState.errors.gstNumber?.message} />} />
      <Controller control={control} name="panNumber" render={({field}) => <Input label={t("PAN Number *")} value={field.value} onChangeText={(val) => field.onChange(val.toUpperCase())} placeholder="eg. ABCDE1234F" maxLength={10} error={form.formState.errors.panNumber?.message} />} />
      <Controller control={control} name="estYear" render={({field}) => <YearPickerField label={t("Establishment Year *")} value={field.value ?? ''} onChange={field.onChange} placeholder={t("Select Year")} error={form.formState.errors.estYear?.message} />} />
      <Controller control={control} name="firmType" render={({field}) => <SelectField label={t("Type of Firm *")} value={field.value ?? ''} options={['Proprietorship', 'Partnership', 'Pvt Ltd', 'Other']} onChange={field.onChange} error={form.formState.errors.firmType?.message} />} />

      {/* --- BANK DETAILS --- */}
      <Text style={{ fontSize: 16, fontWeight: '800', marginTop: spacing.md, marginBottom: spacing.md }}>{t("Bank Details")}</Text>
      
      {banks.map((bank, index) => (
        <View key={index} style={{ backgroundColor: '#F8FAFC', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
            <Text style={{ fontWeight: '700', color: colors.text }}>{t("Bank Account")} {index + 1}</Text>
            {/* SAFELY rendered with ternary operator */}
            {index > 0 ? (
              <Pressable onPress={() => { const newBanks = banks.filter((_, i) => i !== index); setValue('bankAccounts', newBanks, {shouldValidate: true}); }}>
                <MaterialIcons name="close" size={20} color={colors.danger} />
              </Pressable>
            ) : null}
          </View>

          <Controller control={control} name={`bankAccounts.${index}.accountName`} render={({field}) => <Input label={t("Account Name *")} value={field.value} onChangeText={field.onChange} placeholder={t("e.g. Ramesh Agro")} error={form.formState.errors.bankAccounts?.[index]?.accountName?.message} />} />
          <Controller control={control} name={`bankAccounts.${index}.bankNameBranch`} render={({field}) => <Input label={t("Bank Name & Branch *")} value={field.value} onChangeText={field.onChange} placeholder={t("e.g. HDFC Bank, MG Road")} error={form.formState.errors.bankAccounts?.[index]?.bankNameBranch?.message} />} />
          <Controller control={control} name={`bankAccounts.${index}.accountNumber`} render={({field}) => <Input label={t("Account Number *")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" maxLength={18} placeholder={t("Enter exact account no.")} error={form.formState.errors.bankAccounts?.[index]?.accountNumber?.message} />} />
          <Controller control={control} name={`bankAccounts.${index}.bankIfsc`} render={({field}) => <Input label={t("IFSC Code *")} value={field.value} onChangeText={(val) => field.onChange(val.toUpperCase())} placeholder="e.g. HDFC0001234" maxLength={11} error={form.formState.errors.bankAccounts?.[index]?.bankIfsc?.message} />} />
        </View>
      ))}

      <Pressable onPress={() => setValue('bankAccounts', [...banks, { accountName: '', accountNumber: '', bankIfsc: '', bankNameBranch: '' }])} style={{ padding: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md, alignItems: 'center' }}>
        <Text style={{ color: colors.primary, fontWeight: '800' }}>+ {t("Add Another Bank Account")}</Text>
      </Pressable>
    </View>
  );
};