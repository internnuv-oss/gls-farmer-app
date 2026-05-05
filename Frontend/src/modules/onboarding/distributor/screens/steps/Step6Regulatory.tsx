import React from 'react';
import { View, Text } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { CheckboxItem } from '../../../../../design-system/components';
import { colors, spacing, radius } from '../../../../../design-system/tokens';
import { DistributorOnboardingValues, DISTRIBUTOR_COMPLIANCE_ITEMS } from '../../schema';

interface Props {
  form: UseFormReturn<DistributorOnboardingValues>;
  t: any;
}

export const Step6Regulatory = ({ form, t }: Props) => {
  const { control } = form;

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>
        {t("Regulatory Compliance")}
      </Text>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.lg, fontSize: 13 }}>
        {t("Check the documents the distributor currently has available. You will be prompted to upload these in the next step.")}
      </Text>

      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border }}>
        <Text style={{ fontWeight: '800', fontSize: 16, color: colors.primary, marginBottom: spacing.xs }}>
          {t("Checklist")}
        </Text>

        <Controller 
          control={control} 
          name="complianceChecklist" 
          render={({field}) => (
            <View>
              {(DISTRIBUTOR_COMPLIANCE_ITEMS || []).map((item) => (
                <CheckboxItem 
                  key={item} 
                  label={t(item)} 
                  checked={field.value?.includes(item) || false} 
                  onChange={(checked) => { 
                    const curr = new Set(field.value || []); 
                    checked ? curr.add(item) : curr.delete(item); 
                    field.onChange(Array.from(curr)); 
                  }}
                />
              ))}
            </View>
          )} 
        />
      </View>
    </View>
  );
};