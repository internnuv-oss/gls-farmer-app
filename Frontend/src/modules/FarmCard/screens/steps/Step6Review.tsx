// src/modules/FarmCard/screens/steps/Step6Review.tsx
import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { UseFormReturn } from 'react-hook-form';
import { colors, radius, spacing, shadows } from '../../../../design-system/tokens';
import { FarmCardValues } from '../../schema';

interface Props { form: UseFormReturn<FarmCardValues>; setStep: (step: number) => void; setJumpBackTo: (step: number) => void; t: any; }

const RenderField = ({ label, value, t, prefix = "", suffix = "" }: any) => {
  const isMissing = value === undefined || value === null || value === false || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.filter(v => v).length === 0);

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
      <Text style={{ color: colors.textMuted, fontWeight: '600', flex: 1, paddingRight: spacing.sm }}>{label}</Text>
      <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
        {isMissing ? (
          <Text style={{ color: colors.textMuted, fontWeight: '500', fontSize: 13, fontStyle: 'italic' }}>{t("N/A")}</Text>
        ) : (
          <Text style={{ color: colors.text, fontWeight: '700', textAlign: 'right', fontSize: 13 }}>
            {prefix}{Array.isArray(value) ? value.join(', ') : value}{suffix}
          </Text>
        )}
      </View>
    </View>
  );
};

export const Step6Review = ({ form, setStep, setJumpBackTo, t }: Props) => {
  const { watch } = form;
  const docs: Record<string, any> = watch('documents') || {};
  const preferredChemFert = watch('preferredChemFert') || [];
  const preferredChemCrop = watch('preferredChemCrop') || [];
  const currentBioBrands = watch('currentBioBrands') || [];

  const ReviewSection = ({ title, stepNo, children }: { title: string, stepNo: number, children: React.ReactNode }) => (
    <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm }}>
         <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{title}</Text>
         <Pressable onPress={() => { setJumpBackTo(6); setStep(stepNo); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill }} hitSlop={15}>
           <MaterialIcons name="edit" size={14} color={colors.primary} />
           <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12 }}>{t("EDIT")}</Text>
         </Pressable>
      </View>
      {children}
    </View>
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("Final Review")}</Text>

      <ReviewSection title={t("1. Socio-Economic")} stepNo={1}>
        <RenderField label={t("Location")} value={`${watch('village')}, ${watch('taluka')}, ${watch('district')}, ${watch('state')}`} t={t} />
        <RenderField label={t("WhatsApp")} value={watch('primaryWhatsapp')} t={t} />
        <RenderField label={t("Education")} value={watch('educationLevel')} t={t} />
        <RenderField label={t("Farming Exp")} value={watch('farmingExperience')} suffix=" Yrs" t={t} />
        <RenderField label={t("Family")} value={watch('familyMembers')} t={t} />
        <RenderField label={t("Labour")} value={watch('labourType')} t={t} />
      </ReviewSection>

      <ReviewSection title={t("2. Land & Water")} stepNo={2}>
        <RenderField label={t("Field / Plot")} value={`${watch('fieldNumber')} / ${watch('plotNumber')}`} t={t} />
        <RenderField label={t("Survey No.")} value={watch('surveyNo')} t={t} />
        <RenderField label={t("Legal Owner")} value={watch('legalOwnerName')} t={t} />
        <RenderField label={t("Land Status")} value={watch('landStatus')} t={t} />
        <RenderField label={t("Total Land")} value={watch('totalLandArea')} suffix={` ${watch('totalLandAreaUnit')}`} t={t} />
        <RenderField label={t("FSPP Area")} value={watch('fsppCommittedArea')} suffix={` ${watch('fsppCommittedAreaUnit')}`} t={t} />
        <RenderField label={t("Water Source")} value={watch('waterSource')} t={t} />
        <RenderField label={t("Irrig. Method")} value={watch('irrigationMethod')} t={t} />
      </ReviewSection>

      <ReviewSection title={t("3. Soil & History")} stepNo={3}>
        <RenderField label={t("Soil Type")} value={watch('soilType')} t={t} />
        <RenderField label={t("Soil Test")} value={watch('soilTestStatus') === 'Yes' ? `${watch('soilTestStatus')} (${watch('soilTestDate')})` : watch('soilTestStatus')} t={t} />
        <RenderField label={t("pH / EC")} value={`${watch('soilPh') || 'N/A'} / ${watch('soilEc') || 'N/A'}`} t={t} />
        <RenderField label={t("NPK")} value={`${watch('nitrogen') || 'N/A'} / ${watch('phosphorus') || 'N/A'} / ${watch('potassium') || 'N/A'}`} t={t} />
        <Text style={{ fontWeight: '800', marginTop: spacing.md, marginBottom: 4, color: colors.text }}>{t("Yield History")}</Text>
        {watch('yieldHistory')?.map((yh: any, i: number) => (
          <Text key={i} style={{ fontSize: 13, color: colors.textMuted, marginBottom: 2 }}>
            • {yh.year} {yh.season}: {yh.cropGrown || 'N/A'} ({yh.area || '0'} {yh.areaUnit}) - {yh.yieldQtl || '0'} Qtl/Acre
          </Text>
        ))}
      </ReviewSection>

      <ReviewSection title={t("4. Infra & Risks")} stepNo={4}>
        <RenderField label={t("Chem Ferts")} value={preferredChemFert.filter(Boolean).length > 0 ? preferredChemFert.filter(Boolean) : undefined} t={t} />
        <RenderField label={t("Chem Crops")} value={preferredChemCrop.filter(Boolean).length > 0 ? preferredChemCrop.filter(Boolean) : undefined} t={t} />
        <RenderField label={t("Bio Brands")} value={currentBioBrands.filter(Boolean).length > 0 ? currentBioBrands.filter(Boolean) : undefined} t={t} />
        <RenderField label={t("Sales Channel")} value={watch('primarySalesChannel')} t={t} />
        <RenderField label={t("Tractor")} value={watch('tractorOwnership')} t={t} />
        <RenderField label={t("Runoff Risk")} value={watch('waterBorneRunoffRisk')} t={t} />
        <RenderField label={t("Pest Vector")} value={watch('dominantPestVector')} t={t} />
      </ReviewSection>

      <ReviewSection title={t("5. Media Verification")} stepNo={5}>
        {['field_boundary', 'soil_squeeze', 'lab_report'].map(key => (
           <View key={key} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
             <MaterialIcons name={docs[key] ? "check-circle" : "cancel"} size={16} color={docs[key] ? colors.success : colors.textMuted} />
             <Text style={{ fontSize: 12, marginLeft: 6, color: docs[key] ? colors.text : colors.textMuted, fontWeight: '600' }}>{key.replace(/_/g, ' ').toUpperCase()}</Text>
           </View>
        ))}
      </ReviewSection>

    </ScrollView>
  );
};