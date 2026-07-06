import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { UseFormReturn } from 'react-hook-form';
import { colors, radius, spacing } from '../../../../design-system/tokens';
import { FSPPFormData } from '../../hooks';

export const Step2Awareness = ({ form }: { form: UseFormReturn<FSPPFormData> }) => {
  const { t } = useTranslation();
  const { watch, setValue } = form;
  const bio = watch('bioAwareness');
  const gls = watch('glsKnowledge');

  const BIO_OPTIONS = [
    { label: "No awareness - Purely chemical dependency", value: "0" },
    { label: "Heard of it, but never used", value: "5" },
    { label: "Modest awareness / Has experimented with basic bio-fertilizers", value: "10" },
    { label: "High awareness / Actively using biologicals", value: "15" }
  ];

  const GLS_OPTIONS = [
    { label: "No prior knowledge", value: "0" },
    { label: "Knows GLS only as a local brand name", value: "5" },
    { label: "Aware of GLS's extensive research legacy and product lines", value: "10" }
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: spacing.md }}>3. Prior Awareness of Biological Agricultural Inputs</Text>
      <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
        {BIO_OPTIONS.map((opt, i) => (
          <Pressable key={i} onPress={() => setValue('bioAwareness', opt.value, { shouldValidate: true })} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: bio === opt.value ? colors.primarySoft : colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: bio === opt.value ? colors.primary : colors.border }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: bio === opt.value ? colors.primary : colors.border, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md }}>
              {bio === opt.value && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }} />}
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 }}>{t(opt.label)}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: spacing.md }}>4. Prior Knowledge of GLS Organization</Text>
      <View style={{ gap: spacing.md }}>
        {GLS_OPTIONS.map((opt, i) => (
          <Pressable key={i} onPress={() => setValue('glsKnowledge', opt.value, { shouldValidate: true })} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: gls === opt.value ? colors.primarySoft : colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: gls === opt.value ? colors.primary : colors.border }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: gls === opt.value ? colors.primary : colors.border, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md }}>
              {gls === opt.value && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }} />}
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 }}>{t(opt.label)}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
};
