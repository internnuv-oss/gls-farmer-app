import React from 'react';
import { View, Text } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { CheckboxItem } from '../../../../../design-system/components';
import { colors, spacing } from '../../../../../design-system/tokens';
import { DealerOnboardingValues, GLS_COMMITMENTS } from '../../schema';
import { useTranslation } from 'react-i18next';

interface Props {
  form: UseFormReturn<DealerOnboardingValues>;
  isLocked: boolean;
}

export const Step4Commitments = ({ form, isLocked }: Props) => {
  const { control } = form;
  const { t } = useTranslation();
  return (
    <View pointerEvents={isLocked ? "none" : "auto"} style={{ opacity: isLocked ? 0.5 : 1 }}>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>{t("GLS Commitments")}</Text>
        <Text style={{ color: colors.textMuted, marginBottom: spacing.lg }}>{t("Tick to confirm acceptance from the dealer.")}</Text>
        <Controller control={control} name="glsCommitments" render={({field}) => (
        <View>{GLS_COMMITMENTS.map((item) => <CheckboxItem key={item} label={item} checked={field.value?.includes(item)} onChange={(checked) => { const curr = new Set(field.value); checked ? curr.add(item) : curr.delete(item); field.onChange(Array.from(curr)); }}/>)}</View>
      )} />
    </View>
  );
};