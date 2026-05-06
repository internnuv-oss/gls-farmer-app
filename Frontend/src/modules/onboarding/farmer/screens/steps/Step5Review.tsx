import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { UseFormReturn } from 'react-hook-form';
import { colors, radius, spacing, shadows } from '../../../../../design-system/tokens';
import { FarmerOnboardingValues } from '../../schema';

interface Props {
  form: UseFormReturn<FarmerOnboardingValues>;
  setStep: (step: number) => void;
  setJumpBackTo: (step: number) => void;
  dealers: { label: string; value: string }[];
  t: any;
}

export const Step5Review = ({ form, setStep, setJumpBackTo, dealers, t }: Props) => {
  const { watch } = form;

  const renderEditBtn = (targetStep: number) => (
    <Pressable 
      onPress={() => { setJumpBackTo(5); setStep(targetStep); }} 
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
      hitSlop={15}
    >
      <MaterialIcons name="edit" size={16} color={colors.primary} />
      <Text style={{ color: colors.primary, fontWeight: '700' }}>{t("Edit")}</Text>
    </Pressable>
  );

  const getDealerName = (id: string) => {
    const dealer = dealers.find(d => d.value === id);
    return dealer ? dealer.label : id;
  };

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("Final Review")}</Text>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.md, fontSize: 13 }}>
        {t("Please verify all the details carefully before submitting the profile.")}
      </Text>

      {/* 1. Personal Details */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>1. {t("Personal Details")}</Text>
           {renderEditBtn(1)}
        </View>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Full Name")}: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('fullName')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Father's Name")}: <Text style={{ color: colors.text }}>{watch('fatherName')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Mobile Number")}: <Text style={{ color: colors.text }}>+91 {watch('mobile')}</Text></Text>
        {watch('alternateMobile') ? <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Alternate Mobile")}: <Text style={{ color: colors.text }}>+91 {watch('alternateMobile')}</Text></Text> : null}
        <Text style={{ color: colors.textMuted, marginBottom: 4, marginTop: 8 }}>{t("Location")}: <Text style={{ color: colors.text }}>{watch('village')}, {watch('taluka')}, {watch('city')}, {watch('state')}</Text></Text>
      </View>

      {/* 2. Farm Details */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>2. {t("Farm Details")}</Text>
           {renderEditBtn(2)}
        </View>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Total Land")}: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('totalLand')} {t("Acres")}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Irrigated Land")}: <Text style={{ color: colors.text }}>{watch('irrigatedLand') || 0} {t("Acres")}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Rain-Fed Land")}: <Text style={{ color: colors.text }}>{watch('rainFedLand') || 0} {t("Acres")}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 8, marginTop: 8 }}>{t("Major Crops")}: <Text style={{ color: colors.text }}>{watch('majorCrops')?.join(', ') || t("None")}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Soil Type")}: <Text style={{ color: colors.text }}>{watch('soilType')?.map(s => s === 'Others' ? watch('otherSoilType') : s).join(', ') || t("None")}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Water Source")}: <Text style={{ color: colors.text }}>{watch('waterSource')?.map(w => w === 'Others' ? watch('otherWaterSource') : w).join(', ') || t("None")}</Text></Text>
      </View>

      {/* 3. History & Linking */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>3. {t("History & Linking")}</Text>
           {renderEditBtn(3)}
        </View>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Last Crop Grown")}: <Text style={{ color: colors.text }}>{watch('lastCropGrown') || t("None")}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Previous Yield")}: <Text style={{ color: colors.text }}>{watch('yield') ? `${watch('yield')} Quintals/Acre` : t("None")}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 8 }}>{t("Major Problems")}: <Text style={{ color: colors.danger, fontWeight: '600' }}>{watch('majorProblems')?.map(p => p === 'Others' ? watch('otherProblem') : p).join(', ') || t("None")}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4, marginTop: 4 }}>{t("Linked Dealer")}: <Text style={{ color: colors.text, fontWeight: '700' }}>{getDealerName(watch('dealerId'))}</Text></Text>
      </View>

      {/* 4. Signatures */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>4. {t("Signatures")}</Text>
           {renderEditBtn(4)}
        </View>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Consent & Agreement")}: <Text style={{ color: watch('agreementAccepted') ? colors.success : colors.danger, fontWeight: '700' }}>{watch('agreementAccepted') ? t('Accepted') : t('Not Accepted')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Farmer Signature")}: <Text style={{ color: watch('farmerSignature') ? colors.success : colors.danger, fontWeight: '700' }}>{watch('farmerSignature') ? t('Captured') : t('Missing')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("SE Signature")}: <Text style={{ color: watch('seSignature') ? colors.success : colors.danger, fontWeight: '700' }}>{watch('seSignature') ? t('Captured') : t('Missing')}</Text></Text>
      </View>

    </View>
  );
};