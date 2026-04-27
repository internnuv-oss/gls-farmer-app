import React from 'react';
import { View, Text } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { Input, SelectField, TextArea, CheckboxItem } from '../../../../../design-system/components';
import { colors, spacing, radius } from '../../../../../design-system/tokens';
import { SEOnboardingValues } from '../../../se/schema';

export const Step1PersonalDetails = ({ form }: { form: UseFormReturn<SEOnboardingValues> }) => {
  const { control, watch } = form;

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>Personal Details</Text>
      
      <Controller control={control} name="firstName" render={({field}) => <Input label="First Name *" value={field.value} onChangeText={field.onChange} error={form.formState.errors.firstName?.message} />} />
      <Controller control={control} name="middleName" render={({field}) => <Input label="Middle Name" value={field.value} onChangeText={field.onChange} />} />
      <Controller control={control} name="lastName" render={({field}) => <Input label="Last Name *" value={field.value} onChangeText={field.onChange} error={form.formState.errors.lastName?.message} />} />
      
      <Controller control={control} name="dob" render={({field}) => <Input label="Date of Birth (YYYY-MM-DD) *" value={field.value} onChangeText={field.onChange} placeholder="e.g. 1990-05-24" error={form.formState.errors.dob?.message} />} />
      
      <Controller control={control} name="bloodGroup" render={({field}) => <SelectField label="Blood Group *" value={field.value || ''} options={['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']} onChange={field.onChange} error={form.formState.errors.bloodGroup?.message} />} />
      <Controller control={control} name="maritalStatus" render={({field}) => <SelectField label="Marital Status *" value={field.value || ''} options={['Single', 'Married', 'Divorced', 'Widowed']} onChange={field.onChange} error={form.formState.errors.maritalStatus?.message} />} />
      
      {watch('maritalStatus') === 'Married' && (
        <View style={{ backgroundColor: colors.primarySoft, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.lg }}>
          <Controller control={control} name="spouseName" render={({field}) => <Input label="Spouse Name *" value={field.value} onChangeText={field.onChange} error={form.formState.errors.spouseName?.message} />} />
          <Controller control={control} name="spouseMobile" render={({field}) => <Input label="Spouse Mobile *" value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" maxLength={10} prefix="+91" error={form.formState.errors.spouseMobile?.message} />} />
        </View>
      )}

      <Controller control={control} name="mobileNumber" render={({field}) => <Input label="Mobile Number *" value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" prefix="+91" maxLength={10} error={form.formState.errors.mobileNumber?.message} />} />
      <Controller control={control} name="emailId" render={({field}) => <Input label="Email ID *" value={field.value} onChangeText={field.onChange} keyboardType="email-address" error={form.formState.errors.emailId?.message} />} />
      
      <Controller control={control} name="permanentAddress" render={({field}) => <TextArea label="Permanent Address (with Zip Code) *" value={field.value} onChangeText={field.onChange} error={form.formState.errors.permanentAddress?.message} />} />
      <Controller control={control} name="sameAsPermanent" render={({field}) => <CheckboxItem label="Current Address is same as Permanent" checked={field.value} onChange={field.onChange} />} />
      
      {!watch('sameAsPermanent') && (
        <Controller control={control} name="currentAddress" render={({field}) => <TextArea label="Current Address *" value={field.value} onChangeText={field.onChange} error={form.formState.errors.currentAddress?.message} />} />
      )}
    </View>
  );
};