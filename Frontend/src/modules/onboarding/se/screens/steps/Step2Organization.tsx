import React from 'react';
import { View, Text } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { Input, SelectField } from '../../../../../design-system/components';
import { spacing } from '../../../../../design-system/tokens';
import { SEOnboardingValues } from '../../../se/schema';

export const Step2Organization = ({ form }: { form: UseFormReturn<SEOnboardingValues> }) => {
  const { control } = form;

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>Organization & Hierarchy</Text>
      <Controller control={control} name="employeeId" render={({field}) => <Input label="Employee ID *" value={field.value} onChangeText={field.onChange} error={form.formState.errors.employeeId?.message} />} />
      <Controller control={control} name="designation" render={({field}) => <SelectField label="Designation *" value={field.value || ''} options={['Jr. Sales Executive', 'Sales Executive', 'Sr. Sales Executive', 'Area Manager']} onChange={field.onChange} error={form.formState.errors.designation?.message} />} />
      <Controller control={control} name="reportingTo" render={({field}) => <Input label="Reporting To (Manager) *" value={field.value} onChangeText={field.onChange} error={form.formState.errors.reportingTo?.message} />} />
      <Controller control={control} name="joiningDate" render={({field}) => <Input label="Joining Date (YYYY-MM-DD) *" value={field.value} onChangeText={field.onChange} error={form.formState.errors.joiningDate?.message} />} />
      <Controller control={control} name="headquarter" render={({field}) => <Input label="Headquarter (HQ) City *" value={field.value} onChangeText={field.onChange} error={form.formState.errors.headquarter?.message} />} />
      <Controller control={control} name="territory" render={({field}) => <SelectField label="Territory *" value={field.value || ''} options={['North', 'South', 'East', 'West', 'Central']} onChange={field.onChange} error={form.formState.errors.territory?.message} />} />
      <Controller control={control} name="area" render={({field}) => <Input label="Specific Area / Beat *" value={field.value} onChangeText={field.onChange} error={form.formState.errors.area?.message} />} />
    </View>
  );
};