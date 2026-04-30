import React from 'react';
import { View, Text } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { CheckboxItem } from '../../../../../design-system/components';
import { colors, spacing } from '../../../../../design-system/tokens';
import { DealerOnboardingValues, GLS_COMMITMENTS } from '../../schema';

interface Props {
  form: UseFormReturn<DealerOnboardingValues>;
}

export const Step4Commitments = ({ form }: Props) => {
  const { control } = form;
  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>GLS Commitments</Text>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.lg }}>Tick to confirm acceptance from the dealer.</Text>
      <Controller control={control} name="glsCommitments" render={({field}) => (
        <View>{GLS_COMMITMENTS.map((item) => <CheckboxItem key={item} label={item} checked={field.value?.includes(item)} onChange={(checked) => { const curr = new Set(field.value); checked ? curr.add(item) : curr.delete(item); field.onChange(Array.from(curr)); }}/>)}</View>
      )} />
    </View>
  );
};