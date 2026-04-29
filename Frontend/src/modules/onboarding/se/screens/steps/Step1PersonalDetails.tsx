import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Controller } from 'react-hook-form';
import { Input, SelectField, TextArea, CheckboxItem, DatePickerField } from '../../../../../design-system/components';
import { useTranslation } from 'react-i18next';
import { colors, spacing, radius } from '../../../../../design-system/tokens';

export const Step1PersonalDetails = ({ form }: { form: any }) => {
  const { control, watch } = form;
  const { t } = useTranslation();

  const maxDobDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d; 
  }, []);

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("Personal Details")}</Text>
      
      <Controller control={control} name="firstName" render={({field}) => <Input label={t("First Name *")} value={field.value} onChangeText={field.onChange} placeholder={t("e.g. Ramesh")} error={form.formState.errors.firstName?.message} />} />
      <Controller control={control} name="middleName" render={({field}) => <Input label={t("Middle Name")} value={field.value} onChangeText={field.onChange} placeholder={t("e.g. Bhai")} />} />
      <Controller control={control} name="lastName" render={({field}) => <Input label={t("Last Name *")} value={field.value} onChangeText={field.onChange} placeholder={t("e.g. Patel")} error={form.formState.errors.lastName?.message} />} />
      
      <Controller control={control} name="dob" render={({field}) => <DatePickerField label={t("Date of Birth *")} value={field.value} onChange={field.onChange} maximumDate={maxDobDate} error={form.formState.errors.dob?.message} />} />
      
      <Controller control={control} name="bloodGroup" render={({field}) => <SelectField label={t("Blood Group *")} value={field.value || ''} options={['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']} onChange={field.onChange} error={form.formState.errors.bloodGroup?.message} />} />
      <Controller control={control} name="maritalStatus" render={({field}) => <SelectField label={t("Marital Status *")} value={field.value || ''} options={['Single', 'Married', 'Divorced', 'Widowed']} onChange={field.onChange} error={form.formState.errors.maritalStatus?.message} />} />
      
      {watch('maritalStatus') === 'Married' && (
        <View style={{ backgroundColor: colors.primarySoft, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.lg }}>
          <Controller control={control} name="spouseName" render={({field}) => <Input label={t("Spouse Name *")} value={field.value} onChangeText={field.onChange} placeholder={t("e.g. Sita Patel")} error={form.formState.errors.spouseName?.message} />} />
          <Controller control={control} name="spouseMobile" render={({field}) => <Input label={t("Spouse Mobile *")} value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" maxLength={10} prefix="+91" placeholder={t("9876543210")} error={form.formState.errors.spouseMobile?.message} />} />
        </View>
      )}

      <Controller control={control} name="mobileNumber" render={({field}) => <Input label={t("Mobile Number *")} value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" prefix="+91" maxLength={10} placeholder={t("9876543210")} error={form.formState.errors.mobileNumber?.message} />} />
      <Controller control={control} name="emergencyContact" render={({field}) => <Input label={t("Emergency Contact Number *")} value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" prefix="+91" maxLength={10} placeholder={t("9876543210")} error={form.formState.errors.emergencyContact?.message} />} />
      
      <Controller control={control} name="emailId" render={({field}) => <Input label={t("Email ID *")} value={field.value} onChangeText={(val) => field.onChange(val.toLowerCase())} keyboardType="email-address" autoCapitalize="none" placeholder={t("e.g. ramesh@gls.com")} error={form.formState.errors.emailId?.message} />} />      
      
      <Controller control={control} name="permanentAddress" render={({field}) => <TextArea label={t("Permanent Address *")} value={field.value} onChangeText={field.onChange} placeholder={t("Enter full permanent address...")} error={form.formState.errors.permanentAddress?.message} />} />
      <Controller control={control} name="permanentPincode" render={({field}) => <Input label={t("Permanent Pincode / Zip Code *")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" maxLength={6} placeholder={t("e.g. 390001")} error={form.formState.errors.permanentPincode?.message} />} />
      
      <Controller control={control} name="sameAsPermanent" render={({field}) => <CheckboxItem label={t("Current Address is same as Permanent")} checked={field.value} onChange={field.onChange} />} />
      
      {!watch('sameAsPermanent') && (
        <>
          <Controller control={control} name="currentAddress" render={({field}) => <TextArea label={t("Current Address *")} value={field.value} onChangeText={field.onChange} placeholder={t("Enter current living address...")} error={form.formState.errors.currentAddress?.message} />} />
          <Controller control={control} name="currentPincode" render={({field}) => <Input label={t("Current Pincode / Zip Code *")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" maxLength={6} placeholder={t("e.g. 390001")} error={form.formState.errors.currentPincode?.message} />} />
        </>
      )}
    </View>
  );
};