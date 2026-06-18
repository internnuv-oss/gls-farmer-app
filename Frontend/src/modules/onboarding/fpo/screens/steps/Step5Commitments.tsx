// Frontend/src/modules/onboarding/fpo/screens/steps/Step5Commitments.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { CheckboxItem } from '../../../../../design-system/components';
import { spacing, colors } from '../../../../../design-system/tokens';
import { FPOOnboardingValues, FPO_GLS_COMMITMENTS } from '../../schema';

interface Props { form: UseFormReturn<FPOOnboardingValues>; t: any; isLocked?: boolean; }

export const Step5Commitments = ({ form, t, isLocked }: Props) => {
  const { control, watch, setValue } = form;
  const selectedCommitments = watch('glsCommitments') || [];

  const toggleCommitment = (item: string) => {
    if (selectedCommitments.includes(item)) {
      setValue('glsCommitments', selectedCommitments.filter((c: string) => c !== item), { shouldValidate: true });
    } else {
      setValue('glsCommitments', [...selectedCommitments, item], { shouldValidate: true });
    }
  };

  return (
    <View pointerEvents={isLocked ? "none" : "auto"} style={{ opacity: isLocked ? 0.6 : 1 }}>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>{t("GLS Commitments")}</Text>
      <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg }}>
        {t("Tick to confirm mutual alignment on the following GLS offerings.")}
      </Text>
      
      {form.formState.errors.glsCommitments && (
        <Text style={{ color: colors.danger, marginBottom: spacing.sm, fontWeight: '700' }}>
          {form.formState.errors.glsCommitments.message || "All commitments must be reviewed."}
        </Text>
      )}

      {FPO_GLS_COMMITMENTS.map((item: string, index: number) => (
        <Controller
          key={index}
          control={control}
          name="glsCommitments"
          render={() => (
            <CheckboxItem 
              label={t(item)} 
              checked={selectedCommitments.includes(item)} 
              onChange={() => toggleCommitment(item)} 
            />
          )}
        />
      ))}
    </View>
  );
};