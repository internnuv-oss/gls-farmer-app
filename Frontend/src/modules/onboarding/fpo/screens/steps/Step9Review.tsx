// Frontend/src/modules/onboarding/fpo/screens/steps/Step9Review.tsx
import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { UseFormReturn } from 'react-hook-form';
import { colors, radius, spacing, shadows } from '../../../../../design-system/tokens';
import { FPOOnboardingValues, FPO_GLS_COMMITMENTS } from '../../schema';

interface Props {
  form: UseFormReturn<FPOOnboardingValues>;
  scoreData: { raw: number, band: string };
  setJumpBackTo: (step: number) => void;
  setStep: (step: number) => void;
  t: any; 
}

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
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
      <Text style={{ color: isMissing ? colors.danger : colors.textMuted, fontWeight: isMissing ? '800' : '600', flex: 1, paddingRight: spacing.sm }}>
        {label}
      </Text>
      <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
        {isMissing ? (
          <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
            <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 11 }}>{t("MISSING")}</Text>
          </View>
        ) : (
          <Text style={{ color: colors.text, fontWeight: '700', textAlign: 'right', fontSize: 13 }}>
            {prefix}{Array.isArray(value) ? value.join(', ') : value}{suffix}
          </Text>
        )}
      </View>
    </View>
  );
};

export const Step9Review = ({ form, scoreData, setJumpBackTo, setStep, t }: Props) => {
  const { watch } = form;

  const bankAccounts = watch('bankAccounts') || [];
  const glsCommitments = watch('glsCommitments') || [];
  const uploadedDocs = watch('documents') || {};
  const majorCrops = watch('majorCrops') || [];
  const allottedTerritories = watch('allottedTerritories') || []; // 🚀 NEW FIX
  
  const coreDocs = ['incorporation_certificate', 'fco_license', 'pan_card', 'cancelled_cheque', 'board_resolution', 'storage_exterior', 'storage_interior'];
  const complianceDocs = (watch('complianceChecklist') || []).map((item: string) => item.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase());
  const allRequiredDocs = [...coreDocs, ...complianceDocs];

  const isCropsMissing = majorCrops.length === 0 || majorCrops.some((c: any) => !c.name || !c.acreage);
  const isTerritoriesMissing = allottedTerritories.length === 0 || allottedTerritories.some((tItem: any) => !tItem.district || !tItem.taluka || !tItem.villages || tItem.villages.length === 0);

  const isCommitmentsMissing = glsCommitments.length !== FPO_GLS_COMMITMENTS.length;
  const isAgreementMissing = !watch('agreementAccepted');
  const isFPOSigMissing = !watch('fpoSignature');
  const isSESigMissing = !watch('seSignature');

  const ReviewSection = ({ title, stepNo, children }: { title: string, stepNo: number, children: React.ReactNode }) => (
    <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm }}>
         <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{title}</Text>
         <Pressable onPress={() => { setJumpBackTo(9); setStep(stepNo); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill }} hitSlop={15}>
           <MaterialIcons name="edit" size={14} color={colors.primary} />
           <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12 }}>{t("EDIT")}</Text>
         </Pressable>
      </View>
      {children}
    </View>
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.xs }}>{t("Final Review")}</Text>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.lg, fontSize: 13 }}>
        {t("Fields marked in RED are required to submit the profile.")}
      </Text>
      
      {/* 1. Basic Information */}
      <ReviewSection title={t("1. Basic Information")} stepNo={1}>
        <RenderField label={t("FPO Name")} value={watch('fpoName')} t={t} />
        <RenderField label={t("Promoting Agency")} value={watch('promotingAgency')} t={t} />
        <RenderField label={t("CEO / MD")} value={watch('ceoName')} t={t} />
        <RenderField label={t("BoD President")} value={watch('bodPresidentName')} t={t} />
        <RenderField label={t("Mobile")} value={watch('contactMobile')} prefix="+91 " t={t} />
        <RenderField label={t("Location")} value={`${watch('taluka')}, ${watch('city')}`} t={t} />
        <RenderField label={t("Address")} value={watch('address')} t={t} />
        <RenderField label={t("Command Area")} value={watch('commandArea')} t={t} />
        <RenderField label={t("Reg. Number")} value={watch('registrationNumber')} t={t} />
        <RenderField label={t("GST Number")} value={watch('gstNumber')} isRequired={false} t={t} />
        <RenderField label={t("PAN Number")} value={watch('panNumber')} t={t} />
        
        <Text style={{ fontWeight: '800', fontSize: 13, marginBottom: spacing.sm, marginTop: spacing.md, color: colors.primary }}>{t("Bank Details")}</Text>
        {bankAccounts.map((bank: any, i: number) => {
          const isBankMissing = !bank.accountName || !bank.bankNameBranch || !bank.accountNumber || !bank.bankIfsc;
          return (
            <View key={i} style={{ backgroundColor: '#F8FAFC', padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: isBankMissing ? '#FECACA' : '#E2E8F0', marginBottom: 8 }}>
              {isBankMissing ? (
                <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 12 }}>{t("Account")} {i + 1}: {t("Missing Required Bank Fields")}</Text>
              ) : (
                <>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 12 }}>{t("Account")} {i + 1}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>{bank.bankNameBranch}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t("A/C: ")} {bank.accountNumber} | {t("IFSC: ")} {bank.bankIfsc}</Text>
                </>
              )}
            </View>
          );
        })}
        {bankAccounts.length === 0 && <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 12 }}>{t("Missing Bank Accounts")}</Text>}
      </ReviewSection>

      {/* 2. Profiling & Scoring */}
      <ReviewSection title={t("2. Profiling & Scoring")} stepNo={2}>
        <RenderField label={t("Member Base & Reach")} value={`${watch('scoreMemberBase') || 0}/10`} t={t} />
        <RenderField label={t("Financial Health")} value={`${watch('scoreFinancial') || 0}/10`} t={t} />
        <RenderField label={t("Governance & Mgmt")} value={`${watch('scoreGovernance') || 0}/10`} t={t} />
      </ReviewSection>

      {/* 3. Business Scope */}
      <ReviewSection title={t("3. Business Scope")} stepNo={3}>
        <Text style={{ fontWeight: '800', color: colors.text, marginBottom: 8 }}>{t("Allotted Territories")}:</Text>
        {isTerritoriesMissing ? (
          <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 12, marginBottom: 8 }}>{t("MISSING OR INCOMPLETE")}</Text>
        ) : (
          allottedTerritories.map((tItem: any, idx: number) => (
            <View key={idx} style={{ marginBottom: 8, backgroundColor: '#F8FAFC', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>{tItem.district} - {tItem.taluka}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>{t("Villages:")} {tItem.villages?.join(', ')}</Text>
            </View>
          ))
        )}
        <RenderField label={t("Expected Off-take")} value={watch('expectedOfftake')} prefix="₹ " t={t} />
        <RenderField label={t("Current Suppliers")} value={watch('currentSuppliers')} isRequired={false} t={t} />
        <RenderField label={t("Partnership Tier")} value={watch('partnershipTier')} t={t} />
        <RenderField label={t("Demo Commitments")} value={watch('demoFarmersCommitment')} t={t} />
      </ReviewSection>

      {/* 4. Network & Members */}
      <ReviewSection title={t("4. Member Base & Annexures")} stepNo={4}>
        <RenderField label={t("Total Members")} value={watch('totalMembers')} t={t} />
        <RenderField label={t("Active Members")} value={watch('activeMembers')} t={t} />

        <Text style={{ color: isCropsMissing ? colors.danger : colors.primary, fontWeight: '800', marginBottom: 6, marginTop: spacing.md, fontSize: 13 }}>
          {t("Major Crops:")} {isCropsMissing && <Text style={{ color: colors.danger, fontWeight: '800' }}>{t("Missing Details")}</Text>}
        </Text>
        {!isCropsMissing && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {majorCrops.map((c: any, i: number) => (
              <View key={i} style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{c.name} ({c.acreage} Ac)</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ marginTop: spacing.md }}>
          <RenderField label={t("Kharif Demand")} value={watch('kharifDemand')} isRequired={false} t={t} />
          <RenderField label={t("Rabi Demand")} value={watch('rabiDemand')} isRequired={false} t={t} />
        </View>

        <Text style={{ color: colors.primary, fontWeight: '800', marginBottom: 6, marginTop: spacing.md, fontSize: 13 }}>{t("Infrastructure & Storage")}</Text>
        <RenderField label={t("Warehouse Space")} value={watch('warehouseSpace')} isRequired={false} suffix=" sq.ft" t={t} />
        <RenderField label={t("Storage Conditions")} value={watch('storageConditions')} isRequired={false} t={t} />
        <RenderField label={t("Custom Machinery")} value={watch('customMachinery')} isRequired={false} t={t} />
      </ReviewSection>

      {/* 5 & 6. Checklists */}
      <ReviewSection title={t("5 & 6. Commitments")} stepNo={5}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontWeight: '700', color: colors.text, fontSize: 13 }}>{t("GLS Commitments Accepted:")}</Text>
          {isCommitmentsMissing ? (
            <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <Text style={{ color: colors.danger, fontSize: 11, fontWeight: '800' }}>{t("MISSING")} {FPO_GLS_COMMITMENTS.length - glsCommitments.length}</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <Text style={{ color: colors.success, fontSize: 11, fontWeight: '800' }}>{t("ALL ACCEPTED")}</Text>
            </View>
          )}
        </View>
      </ReviewSection>

      {/* 7. Documents & Location */}
      <ReviewSection title={t("7. Documents & Photos")} stepNo={7}>
        {allRequiredDocs.map((key) => {
           const isUploaded = Array.isArray(uploadedDocs[key]) ? uploadedDocs[key].length > 0 : !!uploadedDocs[key];
           return (
             <View key={key} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
               <MaterialIcons name={isUploaded ? "check-circle" : "cancel"} size={16} color={isUploaded ? colors.success : colors.danger} />
               <Text style={{ fontSize: 12, marginLeft: 6, color: colors.text, fontWeight: '600' }}>
                 {key.replace(/_/g, ' ').toUpperCase()}
               </Text>
             </View>
           );
        })}
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
          <MaterialIcons name="gps-fixed" size={16} color={!watch('storageLocations')?.['storage_exterior'] ? colors.danger : colors.success} />
          <Text style={{ marginLeft: 6, color: colors.text, fontWeight: '700', fontSize: 13 }}>{t("GPS Location")}:</Text>
          <Text style={{ marginLeft: 'auto', color: !watch('storageLocations')?.['storage_exterior'] ? colors.danger : colors.success, fontWeight: '800', fontSize: 12 }}>
            {!watch('storageLocations')?.['storage_exterior'] ? t("MISSING (Need Photo)") : t("CAPTURED")}
          </Text>
        </View>
      </ReviewSection>

      {/* 8. Agreement & Signatures */}
      <ReviewSection title={t("8. Signatures")} stepNo={8}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>{t("Agreement Accepted")}</Text>
          {isAgreementMissing ? <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 12 }}>{t('NO')}</Text> : <Text style={{ color: colors.success, fontWeight: '800', fontSize: 12 }}>{t('YES')}</Text>}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>{t("FPO Signature")}</Text>
          {isFPOSigMissing ? <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 12 }}>{t('MISSING')}</Text> : <Text style={{ color: colors.success, fontWeight: '800', fontSize: 12 }}>{t('CAPTURED')}</Text>}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>{t("SE Signature")}</Text>
          {isSESigMissing ? <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 12 }}>{t('MISSING')}</Text> : <Text style={{ color: colors.success, fontWeight: '800', fontSize: 12 }}>{t('CAPTURED')}</Text>}
        </View>
      </ReviewSection>

    </ScrollView>
  );
};