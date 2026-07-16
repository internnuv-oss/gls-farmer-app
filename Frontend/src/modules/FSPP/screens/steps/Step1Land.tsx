import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { UseFormReturn } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, shadows } from '../../../../design-system/tokens';
import { FSPPFormData } from '../../hooks';
import { EXPENSE_OPTIONS_ACRES, EXPENSE_OPTIONS_BIGHA } from '../../constants';

export const Step1Land = ({ form, totalLand }: { form: UseFormReturn<FSPPFormData>, totalLand: number }) => {
  const { t } = useTranslation();
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const { watch, setValue } = form;
  const committed = watch('committedLand');
  const committedUnit = watch('committedLandUnit') || 'Acres';
  const expense = watch('seasonalExpense');

  const isBigha = committedUnit === 'Bigha';

  const EXPENSE_OPTIONS = isBigha ? EXPENSE_OPTIONS_BIGHA : EXPENSE_OPTIONS_ACRES;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ backgroundColor: '#F8FAFC', padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.xl, borderWidth: 1, borderColor: '#E2E8F0' }}>
        <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '700' }}>{t('BASELINE DEMOGRAPHICS')}</Text>
        <Text style={{ fontSize: 16, color: colors.text, fontWeight: '800', marginTop: 4 }}>{t("Total Land Holding :")}  {totalLand} {t("Acres")}</Text>
      </View>

      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: spacing.sm }}>{t("1. Committed Land for Hybrid Farming")}</Text>
      <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: spacing.md }}>{t("Specific portion of land dedicated 100% to GLS hybrid/biological schedule")}</Text>
      
      <View style={{ marginBottom: spacing.xl, zIndex: 10 }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
          <View style={{ flex: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
              <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>{t("Area")}</Text>
              <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>{t("Max:")} {committedUnit === 'Bigha' ? totalLand * 2.5 : totalLand} {committedUnit}</Text>
            </View>
            <TextInput
              style={{ backgroundColor: colors.surface, paddingHorizontal: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, fontSize: 16, color: colors.text, fontWeight: '600', height: 56 }}
              placeholder="e.g., 2.5"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={committed}
              onChangeText={(val) => {
                let cleanVal = val.replace(/[^0-9.]/g, '');
                const parts = cleanVal.split('.');
                if (parts.length > 2) {
                  cleanVal = parts[0] + '.' + parts.slice(1).join('').replace(/\./g, '');
                }
                const maxAllowed = committedUnit === 'Bigha' ? totalLand * 2.5 : totalLand;
                if (cleanVal && parseFloat(cleanVal) > maxAllowed) {
                  setValue('committedLand', maxAllowed.toString(), { shouldValidate: true });
                } else {
                  setValue('committedLand', cleanVal, { shouldValidate: true });
                }
              }}
            />
          </View>
          <View style={{ flex: 1, position: 'relative', zIndex: 20 }}>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: spacing.xs, fontWeight: '600' }}>{t("Unit")}</Text>
            <Pressable 
              onPress={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, height: 56 }}
            >
              <Text style={{ flex: 1, fontSize: 16, color: colors.text, fontWeight: '600' }}>{committedUnit}</Text>
              <MaterialIcons name={isUnitDropdownOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={24} color={colors.textMuted} />
            </Pressable>
            {isUnitDropdownOpen && (
              <View style={{ position: 'absolute', top: 76, left: 0, right: 0, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadows.soft }}>
                {['Acres', 'Bigha'].map(unit => (
                  <Pressable 
                    key={unit} 
                    onPress={() => { 
                      setValue('committedLandUnit', unit); 
                      setIsUnitDropdownOpen(false); 
                      const maxAllowed = unit === 'Bigha' ? totalLand * 2.5 : totalLand;
                      if (committed && parseFloat(committed) > maxAllowed) {
                        setValue('committedLand', maxAllowed.toString(), { shouldValidate: true });
                      }
                    }}
                    style={{ padding: spacing.md, borderBottomWidth: unit === 'Acres' ? 1 : 0, borderBottomColor: colors.border, backgroundColor: unit === committedUnit ? colors.primarySoft : colors.surface }}
                  >
                    <Text style={{ fontSize: 15, color: unit === committedUnit ? colors.primary : colors.text, fontWeight: unit === committedUnit ? '800' : '500' }}>{unit}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
        {((parseFloat(committed) < 1 && committedUnit === 'Acres') || (parseFloat(committed) < 2.5 && committedUnit === 'Bigha')) && committed !== '' && (
          <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '700', marginTop: 4 }}>* Less than 1 Acre (2.5 Bigha) will result in disqualification.</Text>
        )}
      </View>

      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: spacing.sm }}>
  {t("2. Current Average Seasonal Expenditure per {{unit}}", { unit: isBigha ? 'Bigha' : 'Acre' })}
</Text>  
    <View style={{ gap: spacing.md }}>
        {EXPENSE_OPTIONS.map((opt: any, i: number) => (
          <Pressable key={i} onPress={() => setValue('seasonalExpense', opt.label, { shouldValidate: true })} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: expense === opt.label ? colors.primarySoft : colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: expense === opt.label ? colors.primary : colors.border }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: expense === opt.label ? colors.primary : colors.border, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md }}>
              {expense === opt.label && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{t(opt.label)}</Text>
            </View>
            {opt.tag && (
              <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill }}>
                <Text style={{ color: '#166534', fontSize: 10, fontWeight: '800' }}>{opt.tag}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
};
