import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { UseFormReturn } from 'react-hook-form';
import { colors, radius, spacing } from '../../../../design-system/tokens';
import { FSPPFormData } from '../../hooks';
import { BIO_OPTIONS, GLS_OPTIONS } from '../../constants';

export const Step2Awareness = ({ form }: { form: UseFormReturn<FSPPFormData> }) => {
  const { t } = useTranslation();
  const { watch, setValue } = form;
  const bio = watch('bioAwareness');
  const gls = watch('glsKnowledge');



  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: spacing.md }}>{t("3. Prior Awareness of Biological Agricultural Inputs")}</Text>
      <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
        {BIO_OPTIONS.map((opt: any, i: number) => (
          <Pressable key={i} onPress={() => setValue('bioAwareness', opt.label, { shouldValidate: true })} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: bio === opt.label ? colors.primarySoft : colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: bio === opt.label ? colors.primary : colors.border }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: bio === opt.label ? colors.primary : colors.border, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md }}>
              {bio === opt.label && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }} />}
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 }}>{t(opt.label)}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: spacing.md }}>{t("4. Prior Knowledge of GLS Organization")}</Text>
      <View style={{ gap: spacing.md }}>
        {GLS_OPTIONS.map((opt: any, i: number) => (
          <Pressable key={i} onPress={() => setValue('glsKnowledge', opt.label, { shouldValidate: true })} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: gls === opt.label ? colors.primarySoft : colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: gls === opt.label ? colors.primary : colors.border }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: gls === opt.label ? colors.primary : colors.border, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md }}>
              {gls === opt.label && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }} />}
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 }}>{t(opt.label)}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
};
