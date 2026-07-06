import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { UseFormReturn } from 'react-hook-form';
import { colors, radius, spacing } from '../../../../design-system/tokens';
import { FSPPFormData } from '../../hooks';

export const Step3Mindset = ({ form }: { form: UseFormReturn<FSPPFormData> }) => {
  const { t } = useTranslation();
  const { watch, setValue } = form;

  const STATEMENTS = [
    { key: 'mindsetA', label: "A. The farmer recognizes that chemical over-use harms long-term soil structure." },
    { key: 'mindsetB', label: "B. The farmer observes diminished returns / ill effects of chemical over-dosing on plants." },
    { key: 'mindsetC', label: "C. The farmer expresses genuine concern over impact of chemical residuals on human health." },
    { key: 'mindsetD', label: "D. The farmer is actively looking for immediate options to transition to biological products." },
  ];

  const OPTIONS = [
    { label: "Disagree", value: "0", color: '#991B1B' },
    { label: "Neutral", value: "2", color: '#B45309' },
    { label: "Agree", value: "5", color: '#166534' }
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={{ fontSize: 15, color: colors.textMuted, marginBottom: spacing.lg }}>
        {t('Assess the farmer\'s intrinsic drive to transition away from pure chemicals.')}
      </Text>

      {STATEMENTS.map((stmt, index) => {
        const val = watch(stmt.key as keyof FSPPFormData);
        return (
          <View key={index} style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: spacing.md }}>{t(stmt.label)}</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {OPTIONS.map((opt, i) => (
                <Pressable
                  key={i}
                  onPress={() => setValue(stmt.key as keyof FSPPFormData, opt.value, { shouldValidate: true })}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 10,
                    borderRadius: radius.sm,
                    borderWidth: 1,
                    borderColor: val === opt.value ? opt.color : colors.border,
                    backgroundColor: val === opt.value ? `${opt.color}10` : colors.surface
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: val === opt.value ? opt.color : colors.textMuted }}>{t(opt.label)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};
