import React from 'react';
import { View, Text } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { CheckboxItem } from '../../../../../design-system/components';
import { colors, spacing } from '../../../../../design-system/tokens';
import { DealerOnboardingValues } from '../../schema';

export const COMPLIANCE_ITEMS = ["Valid FCO Authorization / Fertilizer Dealer Registration", "Valid Insecticide Selling License", "Educational Qualification Certificate", "Any state-specific approvals"];

interface Props {
  form: UseFormReturn<DealerOnboardingValues>;
}

export const Step5Compliance = ({ form }: Props) => {
  const { control } = form;
  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>Regulatory Compliance</Text>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.lg }}>Verify dealer documentation availability.</Text>
      <Controller control={control} name="complianceChecklist" render={({field}) => (
        <View>{COMPLIANCE_ITEMS.map((item) => <CheckboxItem key={item} label={item} checked={field.value?.includes(item)} onChange={(checked) => { const curr = new Set(field.value); checked ? curr.add(item) : curr.delete(item); field.onChange(Array.from(curr)); }}/>)}</View>
      )} />
    </View>
  );
};