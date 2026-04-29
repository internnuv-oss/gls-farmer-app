import React from 'react';
import { View, Text } from 'react-native';
import { Controller } from 'react-hook-form';
import { Input, SelectField, DatePickerField } from '../../../../../design-system/components';
import { spacing } from '../../../../../design-system/tokens';
import { useTranslation } from 'react-i18next';

const MANAGERS_LIST = ['Rajesh Kumar', 'Suresh Patel', 'Amit Shah', 'Vikram Singh'];
const HEADQUARTERS_LIST = ['Ahmedabad', 'Vadodara', 'Surat', 'Rajkot', 'Pune', 'Nashik', 'Mumbai', 'Indore'];
const AREAS_LIST = ['Beat 1 (Urban)', 'Beat 2 (Rural North)', 'Beat 3 (Rural South)', 'Beat 4 (Industrial)'];

export const Step2Organization = ({ form }: { form: any }) => {
  const { control } = form;
  const { t } = useTranslation();

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("Organization & Hierarchy")}</Text>
      
      <Controller control={control} name="employeeId" render={({field}) => <Input label={t("Employee ID *")} value={field.value} onChangeText={(val) => field.onChange(val.toUpperCase())} placeholder={t("e.g. GLS1042")} error={form.formState.errors.employeeId?.message} />} />
      
      <Controller control={control} name="designation" render={({field}) => <SelectField label={t("Designation *")} value={field.value || ''} options={['Jr. Sales Executive', 'Sales Executive', 'Sr. Sales Executive', 'Area Manager']} onChange={field.onChange} error={form.formState.errors.designation?.message} />} />
      
      <Controller control={control} name="reportingTo" render={({field}) => <SelectField label={t("Reporting To (Manager) *")} value={field.value || ''} options={MANAGERS_LIST} searchable placeholder={t("Search Manager...")} onChange={field.onChange} error={form.formState.errors.reportingTo?.message} />} />
      
      <Controller control={control} name="joiningDate" render={({field}) => <DatePickerField label={t("Joining Date *")} value={field.value} onChange={field.onChange} maximumDate={new Date()} error={form.formState.errors.joiningDate?.message} />} />
      
      <Controller control={control} name="headquarter" render={({field}) => <SelectField label={t("Headquarter (HQ) City *")} value={field.value || ''} options={HEADQUARTERS_LIST} searchable placeholder={t("Search HQ...")} onChange={field.onChange} error={form.formState.errors.headquarter?.message} />} />
      
      <Controller control={control} name="territory" render={({field}) => <SelectField label={t("Territory *")} value={field.value || ''} options={['North', 'South', 'East', 'West', 'Central']} onChange={field.onChange} error={form.formState.errors.territory?.message} />} />
      
      <Controller control={control} name="area" render={({field}) => <SelectField label={t("Specific Area / Beat *")} value={field.value || ''} options={AREAS_LIST} searchable placeholder={t("Search Area...")} onChange={field.onChange} error={form.formState.errors.area?.message} />} />
    </View>
  );
};