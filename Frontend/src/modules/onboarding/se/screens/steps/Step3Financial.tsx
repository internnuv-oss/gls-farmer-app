import React from 'react';
import { View, Text } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { Input } from '../../../../../design-system/components';
import { spacing } from '../../../../../design-system/tokens';
import { SEOnboardingValues } from '../../../dealer/schema';

export const Step3Financial = ({ form }: { form: UseFormReturn<SEOnboardingValues> }) => {
  const { control } = form;

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>Statutory & Financial</Text>
      <Controller control={control} name="panNumber" render={({field}) => <Input label="PAN / National ID *" value={field.value} onChangeText={(val) => field.onChange(val.toUpperCase())} maxLength={10} error={form.formState.errors.panNumber?.message} />} />
      <Controller control={control} name="bankName" render={({field}) => <Input label="Bank Name *" value={field.value} onChangeText={field.onChange} error={form.formState.errors.bankName?.message} />} />
      <Controller control={control} name="bankAccountNumber" render={({field}) => <Input label="Account Number *" value={field.value} onChangeText={field.onChange} keyboardType="numeric" maxLength={18} error={form.formState.errors.bankAccountNumber?.message} />} />
      <Controller control={control} name="bankIfsc" render={({field}) => <Input label="IFSC / Swift Code *" value={field.value} onChangeText={(val) => field.onChange(val.toUpperCase())} maxLength={11} error={form.formState.errors.bankIfsc?.message} />} />
      <Controller control={control} name="pfPensionNumber" render={({field}) => <Input label="PF / Pension Number (Optional)" value={field.value} onChangeText={field.onChange} />} />
    </View>
  );
};