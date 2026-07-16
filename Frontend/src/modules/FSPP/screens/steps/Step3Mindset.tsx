import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { UseFormReturn } from 'react-hook-form';
import { colors, radius, spacing } from '../../../../design-system/tokens';
import { FSPPFormData } from '../../hooks';
import { MINDSET_OPTIONS, MINDSET_STATEMENTS } from '../../constants';

export const Step3Mindset = ({ form }: { form: UseFormReturn<FSPPFormData> }) => {
  const { t } = useTranslation();
  const { watch, setValue } = form;


  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={{ fontSize: 15, color: colors.textMuted, marginBottom: spacing.lg }}>
        {t('Assess the farmer\'s intrinsic drive to transition away from pure chemicals.')}
      </Text>

      {MINDSET_STATEMENTS.map((stmt: any, index: number) => {
        const val = watch(stmt.key as keyof FSPPFormData);
        return (
          <View key={index} style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: spacing.md }}>{t(stmt.label)}</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {MINDSET_OPTIONS.map((opt: any, i: number) => (
                <Pressable
                  key={i}
                  onPress={() => setValue(stmt.key as keyof FSPPFormData, opt.label, { shouldValidate: true })}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 10,
                    borderRadius: radius.sm,
                    borderWidth: 1,
                    borderColor: val === opt.label ? opt.color : colors.border,
                    backgroundColor: val === opt.label ? `${opt.color}10` : colors.surface
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: val === opt.label ? opt.color : colors.textMuted }}>{t(opt.label)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};
