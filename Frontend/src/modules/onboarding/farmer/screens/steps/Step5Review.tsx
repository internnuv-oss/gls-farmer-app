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

// 🚀 HELPER: Automatically renders Red "Missing" text AND turns the label Red for empty required fields
const RenderField = ({ label, value, t, isRequired = true, isMissingOverride = null, prefix = "", suffix = "" }: any) => {
  let isMissing = false;
  
  if (isMissingOverride !== null) {
    isMissing = isMissingOverride;
  } else if (isRequired) {
    if (value === undefined || value === null || value === false) {
      isMissing = true;
    } else if (typeof value === 'string' && value.trim() === '') {
      isMissing = true;
    } else if (Array.isArray(value)) {
      const cleaned = value.filter((v: any) => v !== null && v !== undefined && String(v).trim() !== '');
      if (cleaned.length === 0) isMissing = true;
    }
  }

  return (
    <Text 
      style={{ 
        color: isMissing ? colors.danger : colors.textMuted,
        fontWeight: isMissing ? '800' : '400',
        marginBottom: 4 
      }}
    >
      {label}: {' '}
      {isMissing ? (
        <Text style={{ color: colors.danger, fontWeight: '800' }}>{t("Missing")}</Text>
      ) : (
        <Text style={{ color: colors.text, fontWeight: '700' }}>
          {prefix}{Array.isArray(value) ? value.join(', ') : value}{suffix}
        </Text>
      )}
    </Text>
  );
};

export const Step5Review = ({ form, setStep, setJumpBackTo, dealers, t }: Props) => {
  const { watch } = form;

  const renderEditBtn = (targetStep: number) => (
    <Pressable onPress={() => { setJumpBackTo(5); setStep(targetStep); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} hitSlop={15}>
      <MaterialIcons name="edit" size={16} color={colors.primary} />
      <Text style={{ color: colors.primary, fontWeight: '700' }}>{t("Edit")}</Text>
    </Pressable>
  );

  const getDealerName = (id?: string) => {
    if (!id) return t("None Linked");
    const dealer = dealers.find(d => d.value === id);
    return dealer ? dealer.label : id;
  };

  const unit = watch('landUnit') || 'Acres';

  // Dynamic conditional checks based on "Others" selections
  const soilType = watch('soilType') || [];
  const isOtherSoilMissing = soilType.includes('Others') && !watch('otherSoilType');

  const waterSource = watch('waterSource') || [];
  const isOtherWaterMissing = waterSource.includes('Others') && !watch('otherWaterSource');

  const farmEquipments = watch('farmEquipments') || [];
  const isOtherEquipMissing = farmEquipments.includes('Others') && !watch('otherFarmEquipment');

  // Signature checks
  const isAgreementMissing = !watch('agreementAccepted');
  const isFarmerSigMissing = !watch('farmerSignature');
  const isSESigMissing = !watch('seSignature');

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("Final Review")}</Text>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.md, fontSize: 13 }}>
        {t("Fields marked in RED are required to submit the profile.")}
      </Text>

      {/* 1. Personal Details */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>1. {t("Personal Details")}</Text>
           {renderEditBtn(1)}
        </View>
        
        <RenderField label={t("Full Name")} value={watch('fullName')} t={t} />
        <RenderField label={t("Father's Name")} value={watch('fatherName')} t={t} />
        <RenderField label={t("Mobile Number")} value={watch('mobile')} prefix="+91 " t={t} />
        <RenderField label={t("Alternate Mobile")} value={watch('alternateMobile')} isRequired={false} prefix="+91 " t={t} />
        
        <View style={{ marginTop: 8 }}>
          <RenderField label={t("State")} value={watch('state')} t={t} />
          <RenderField label={t("District")} value={watch('city')} t={t} />
          <RenderField label={t("Taluka")} value={watch('taluka')} t={t} />
          <RenderField label={t("Village")} value={watch('village')} t={t} />
          <RenderField label={t("Pincode")} value={watch('pincode')} isRequired={false} t={t} />
        </View>
      </View>

      {/* 2. Farm Details */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>2. {t("Farm Details")}</Text>
           {renderEditBtn(2)}
        </View>
        
        <RenderField label={t("Total Land")} value={watch('totalLand')} suffix={` ${t(unit)}`} t={t} />
        <RenderField label={t("Irrigated Land")} value={watch('irrigatedLand') || '0'} suffix={` ${t(unit)}`} isRequired={false} t={t} />
        <RenderField label={t("Rain-Fed Land")} value={watch('rainFedLand') || '0'} suffix={` ${t(unit)}`} isRequired={false} t={t} />
        
        <View style={{ marginTop: 8 }}>
          <RenderField label={t("Major Crops")} value={watch('majorCrops')} t={t} />
          
          <RenderField label={t("Soil Type")} value={soilType.map((s: string) => s === 'Others' ? watch('otherSoilType') : s)} isMissingOverride={isOtherSoilMissing} t={t} />
          <RenderField label={t("Water Source")} value={waterSource.map((w: string) => w === 'Others' ? watch('otherWaterSource') : w)} isMissingOverride={isOtherWaterMissing} t={t} />
          
          <RenderField label={t("Irrigation Types")} value={watch('irrigationType')} isRequired={false} t={t} />
          
          <RenderField label={t("Farm Equipments")} value={farmEquipments.map((e: string) => e === 'Others' ? watch('otherFarmEquipment') : e)} isMissingOverride={isOtherEquipMissing} isRequired={false} t={t} />
          
          <RenderField label={t("Biofertilizer Knowledge")} value={watch('biofertilizer')} isRequired={false} t={t} />
        </View>
      </View>

      {/* 3. History & Linking */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>3. {t("History & Linking")}</Text>
           {renderEditBtn(3)}
        </View>
        
        {watch('pastCrops')?.length ? watch('pastCrops')?.map((crop: any, i: number) => {
          const isOtherMissing = (crop.inputUsed || []).includes('Others') && !crop.otherInputUsed;
          
          return (
            <View key={i} style={{ marginBottom: spacing.md, backgroundColor: '#F8FAFC', padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: 4 }}>{crop.cropName || t("Unknown Crop")}</Text>
              
              <RenderField label={t("Area")} value={crop.area ? `${crop.area} ${crop.areaUnit || ''}` : null} isRequired={false} t={t} />
              <RenderField label={t("Inputs Used")} value={(crop.inputUsed || []).map((i: string) => i === 'Others' ? crop.otherInputUsed : i)} isMissingOverride={isOtherMissing} isRequired={false} t={t} />
              <RenderField label={t("Yield")} value={crop.yield ? `${crop.yield} ${crop.yieldUnit || ''}` : null} isRequired={false} t={t} />
              
              <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 4 }}>
                {t("Problems")}: <Text style={{ color: crop.problemsFaced ? colors.danger : colors.text, fontWeight: crop.problemsFaced ? '700' : '400' }}>{crop.problemsFaced || t("None")}</Text>
              </Text>
            </View>
          );
        }) : <Text style={{ color: colors.textMuted, marginBottom: spacing.md }}>{t("No crop history recorded.")}</Text>}
        
        <Text style={{ color: colors.textMuted, marginBottom: 4, marginTop: 4 }}>{t("Linked Dealer")}: <Text style={{ color: colors.text, fontWeight: '700' }}>{getDealerName(watch('dealerId'))}</Text></Text>
      </View>

      {/* 4. Signatures */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>4. {t("Signatures")}</Text>
           {renderEditBtn(4)}
        </View>
        
        <Text style={{ color: isAgreementMissing ? colors.danger : colors.textMuted, fontWeight: isAgreementMissing ? '800' : '400', marginBottom: 4 }}>
          {t("Consent & Agreement")}: 
          {isAgreementMissing ? <Text style={{ color: colors.danger, fontWeight: '800' }}> {t('Missing')}</Text> : <Text style={{ color: colors.success, fontWeight: '700' }}> {t('Accepted')}</Text>}
        </Text>
        
        <Text style={{ color: isFarmerSigMissing ? colors.danger : colors.textMuted, fontWeight: isFarmerSigMissing ? '800' : '400', marginBottom: 4 }}>
          {t("Farmer Signature")}: 
          {isFarmerSigMissing ? <Text style={{ color: colors.danger, fontWeight: '800' }}> {t('Missing')}</Text> : <Text style={{ color: colors.success, fontWeight: '700' }}> {t('Captured')}</Text>}
        </Text>
        
        <Text style={{ color: isSESigMissing ? colors.danger : colors.textMuted, fontWeight: isSESigMissing ? '800' : '400', marginBottom: 4 }}>
          {t("SE Signature")}: 
          {isSESigMissing ? <Text style={{ color: colors.danger, fontWeight: '800' }}> {t('Missing')}</Text> : <Text style={{ color: colors.success, fontWeight: '700' }}> {t('Captured')}</Text>}
        </Text>
      </View>

    </View>
  );
};