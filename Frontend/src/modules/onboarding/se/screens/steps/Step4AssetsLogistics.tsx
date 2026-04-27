import React from 'react';
import { View, Text } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { Input, RadioGroup, TagsInput } from '../../../../../design-system/components';
import { spacing } from '../../../../../design-system/tokens';
import { SEOnboardingValues } from '../../../se/schema';

export const Step4AssetsLogistics = ({ form }: { form: UseFormReturn<SEOnboardingValues> }) => {
  const { control } = form;

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>Assets & Logistics</Text>
      <Controller control={control} name="vehicleType" render={({field}) => <RadioGroup label="Vehicle Type *" options={['Two-Wheeler', 'Four-Wheeler']} value={field.value} onChange={field.onChange} error={form.formState.errors.vehicleType?.message} />} />
      <Controller control={control} name="drivingLicenseNo" render={({field}) => <Input label="Driving License No *" value={field.value} onChangeText={(val) => field.onChange(val.toUpperCase())} error={form.formState.errors.drivingLicenseNo?.message} />} />
      <Controller control={control} name="dlExpiryDate" render={({field}) => <Input label="DL Expiry Date (YYYY-MM-DD) *" value={field.value} onChangeText={field.onChange} error={form.formState.errors.dlExpiryDate?.message} />} />
      <Controller control={control} name="companyAssets" render={({field}) => <TagsInput label="Company Assets (Serial Nos for Laptop/SIM)" value={field.value || []} onChange={field.onChange} placeholder="Type asset serial and hit Enter" />} />
      <Controller control={control} name="fuelAllowance" render={({field}) => <Input label="Fuel Allowance Limit (Optional)" value={field.value} onChangeText={field.onChange} placeholder="e.g. ₹3/km" />} />
    </View>
  );
};