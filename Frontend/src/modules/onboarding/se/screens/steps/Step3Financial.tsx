import React from 'react';
import { View, Text } from 'react-native';
import { Controller } from 'react-hook-form';
import { Input, SelectField } from '../../../../../design-system/components';
import { spacing } from '../../../../../design-system/tokens';
import { useTranslation } from 'react-i18next';

const INDIAN_BANKS = [
  "State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank", 
  "Punjab National Bank", "Bank of Baroda", "Bank of India", "Union Bank of India", 
  "Canara Bank", "IDFC First Bank", "IndusInd Bank", "Yes Bank", "Federal Bank",
  "Central Bank of India", "Indian Bank", "Indian Overseas Bank", "UCO Bank", "Bank of Maharashtra"
];

export const Step3Financial = ({ form }: { form: any }) => {
  const { control } = form;
  const { t } = useTranslation();

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("Statutory & Financial")}</Text>
      
      <Controller control={control} name="panNumber" render={({field}) => <Input label={t("PAN / National ID *")} value={field.value} onChangeText={(val) => field.onChange(val.toUpperCase())} maxLength={10} placeholder={t("e.g. ABCDE1234F")} error={form.formState.errors.panNumber?.message} />} />
      
      <Controller control={control} name="bankName" render={({field}) => <SelectField label={t("Bank Name *")} value={field.value || ''} options={INDIAN_BANKS.sort()} searchable placeholder={t("Search Bank...")} onChange={field.onChange} error={form.formState.errors.bankName?.message} />} />
      
      <Controller control={control} name="bankAccountNumber" render={({field}) => <Input label={t("Account Number *")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" maxLength={18} placeholder={t("e.g. 50100123456789")} error={form.formState.errors.bankAccountNumber?.message} />} />
      
      <Controller control={control} name="bankIfsc" render={({field}) => <Input label={t("IFSC / Swift Code *")} value={field.value} onChangeText={(val) => field.onChange(val.toUpperCase())} maxLength={11} placeholder={t("e.g. HDFC0001234")} error={form.formState.errors.bankIfsc?.message} />} />
      
      <Controller control={control} name="pfPensionNumber" render={({field}) => <Input label={t("PF / Pension Number (Optional)")} value={field.value} onChangeText={field.onChange} placeholder={t("e.g. GJ/VAD/1234567/000/1234567")} />} />
    </View>
  );
};