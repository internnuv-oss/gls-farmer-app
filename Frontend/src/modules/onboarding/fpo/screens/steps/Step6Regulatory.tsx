// Frontend/src/modules/onboarding/fpo/screens/steps/Step6Regulatory.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { CheckboxItem } from '../../../../../design-system/components';
import { spacing, colors, radius, shadows } from '../../../../../design-system/tokens';
import { FPOOnboardingValues, FPO_COMPLIANCE_ITEMS } from '../../schema';

interface Props { form: UseFormReturn<FPOOnboardingValues>; t: any; isLocked?: boolean; }

export const Step6Regulatory = ({ form, t, isLocked }: Props) => {
  const { control, watch, setValue } = form;
  const selectedItems = watch('complianceChecklist') || [];

  const toggleCompliance = (item: string) => {
    if (selectedItems.includes(item)) {
      setValue('complianceChecklist', selectedItems.filter((c: string) => c !== item), { shouldValidate: true });
    } else {
      setValue('complianceChecklist', [...selectedItems, item], { shouldValidate: true });
    }
  };

  return (
    <View pointerEvents={isLocked ? "none" : "auto"} style={{ opacity: isLocked ? 0.6 : 1 }}>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>{t("Regulatory Checklist")}</Text>
      <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg }}>
        {t("Verify the availability of the following mandatory documents. You will be required to upload them in the next step.")}
      </Text>

      <View style={{ backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadows.soft }}>
        {FPO_COMPLIANCE_ITEMS.map((item: string, index: number) => (
          <Controller
            key={index}
            control={control}
            name="complianceChecklist"
            render={() => (
              <CheckboxItem 
                label={t(item)} 
                checked={selectedItems.includes(item)} 
                onChange={() => toggleCompliance(item)} 
              />
            )}
          />
        ))}
      </View>
    </View>
  );
};