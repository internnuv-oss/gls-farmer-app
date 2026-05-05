import React from 'react';
import { View, Text } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { CheckboxItem } from '../../../../../design-system/components';
import { colors, spacing, radius } from '../../../../../design-system/tokens';
import { DistributorOnboardingValues, DISTRIBUTOR_GLS_COMMITMENTS } from '../../schema';

interface Props {
  form: UseFormReturn<DistributorOnboardingValues>;
  t: any;
}

export const Step5Commitments = ({ form, t }: Props) => {
  const { control } = form;

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>
        {t("GLS Commitments")}
      </Text>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.lg, fontSize: 13 }}>
        {t("The distributor must explicitly agree to all of the following GLS conditions.")}
      </Text>

      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl }}>
        <Text style={{ fontWeight: '800', fontSize: 16, color: colors.primary, marginBottom: spacing.xs }}>
          {t("Commitments to Accept *")}
        </Text>

        <Controller 
          control={control} 
          name="glsCommitments" 
          render={({field}) => (
            <View>
              {(DISTRIBUTOR_GLS_COMMITMENTS || []).map((item) => (
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