import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { UseFormReturn } from 'react-hook-form';
import { colors, radius, spacing, shadows } from '../../../../../design-system/tokens';
import { DealerOnboardingValues, GLS_COMMITMENTS } from '../../schema';
import { useTranslation } from 'react-i18next';

interface Props {
  form: UseFormReturn<DealerOnboardingValues>;
  scoreData: { raw: number, band: string };
  setJumpBackTo: (step: number) => void;
  setStep: (step: number) => void;
  getCategoryColor: (band: string) => string;
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

export const Step9Review = ({ form, scoreData, setJumpBackTo, setStep, getCategoryColor }: Props) => {
  const { watch } = form;
  const { t } = useTranslation();

  const renderEditBtn = (targetStep: number) => (
    <Pressable onPress={() => { setJumpBackTo(9); setStep(targetStep); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} hitSlop={15}>
      <MaterialIcons name="edit" size={16} color={colors.primary} />
      <Text style={{ color: colors.primary, fontWeight: '700' }}>{t("Edit")}</Text>
    </Pressable>
  );

  // State extractions
  const owners = watch('owners') || [];
  const bankAccounts = watch('bankAccounts') || [];
  const glsCommitments = watch('glsCommitments') || [];
  const uploadedDocs = watch('documents') || {};
  
  // Combine Core Docs with Dynamic Compliance Docs
  const coreDocs = ['gst certificate / shop establishment license', 'pan card', 'cancelled cheque', 'shop_exterior', 'selfie_with_owner'];
  const complianceDocs = (watch('complianceChecklist') || []).map((item: string) => item.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase());
  const allRequiredDocs = [...coreDocs, ...complianceDocs];

  // Complex Nested Array Checks
  const isOwnersMissing = owners.length === 0 || owners.some((o: any) => !o.name);
  
  const additionalShops = watch('additionalShops') || [];
  const godowns = watch('godowns') || [];
  const isAdditionalLocMissing = watch('hasAdditionalLocations') === 'Yes' && additionalShops.length === 0 && godowns.length === 0;

  const linkedDistributors = watch('linkedDistributors') || [];
  const isDistributorMissing = watch('isLinkedToDistributor') === 'Yes' && (linkedDistributors.length === 0 || !linkedDistributors[0].name || !linkedDistributors[0].contact);

  const demoFarmers = watch('demoFarmers') || [];
  const isDemoFarmersMissing = watch('willingDemoFarmers') === 'Yes' && !uploadedDocs['demo_farmers_list'] && (demoFarmers.length === 0 || !demoFarmers.some((f: any) => f.name && f.contact && f.address));

  const seTerritories = watch('seTerritories') || [];
  const isTerritoriesMissing = seTerritories.length === 0 || seTerritories.some((tItem: any) => !tItem.taluka || !tItem.village?.length || !tItem.cultivableArea || !tItem.majorCrops?.length);

  const seCreditRefs = watch('seCreditReferences') || [];
  const isCreditRefsMissing = watch('seHasCreditReferences') === 'Yes' && (seCreditRefs.length === 0 || seCreditRefs.some((r: any) => !r.name || !r.contact || r.contact.length !== 10));

  // General Condition Checks
  const isCommitmentsMissing = glsCommitments.length !== GLS_COMMITMENTS.length;
  const isAgreementMissing = !watch('agreementAccepted');
  const isDealerSigMissing = !watch('dealerSignature');
  const isSESigMissing = !watch('seSignature');
  const isGrowthVisionMissing = !watch('seGrowthVision') && !watch('seGrowthVisionAudio');
  const requiresPaymentProof = watch('seSecurityDeposit') && parseInt(watch('seSecurityDeposit') || '0') > 0;
  const isPaymentProofMissing = requiresPaymentProof && !watch('sePaymentProofText') && !uploadedDocs['se_payment_proof'];

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("Final Review")}</Text>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.md, fontSize: 13 }}>{t("Fields marked in RED are required to submit the profile.")}</Text>
      
      {/* 1. Basic Information */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{t("1. Basic Info")}</Text>
           {renderEditBtn(1)}
        </View>
        
        <RenderField label={t("Primary Shop")} value={watch('shopName')} t={t} />
        <RenderField label={t("Firm Type")} value={watch('firmType')} suffix={` (${watch('estYear')})`} t={t} />
        
        <View style={{ marginTop: 8 }}>
          <RenderField label={t("State")} value={watch('state')} t={t} />
          <RenderField label={t("City")} value={watch('city')} t={t} />
          <RenderField label={t("Taluka")} value={watch('taluka')} t={t} />
          <RenderField label={t("Village")} value={watch('village')} t={t} />
          <RenderField label={t("Address")} value={watch('address')} t={t} />
          <RenderField label={t("Landmark")} value={watch('landmark')} isRequired={false} t={t} />
        </View>

        <View style={{ marginTop: 8 }}>
          <RenderField label={t("Owner(s)")} value={owners.map((o: any) => o.name).filter(Boolean)} isMissingOverride={isOwnersMissing} t={t} />
          <RenderField label={t("Mobile")} value={watch('contactMobile')} prefix="+91 " t={t} />
          <RenderField label={t("Landline")} value={watch('landlineNumber')} isRequired={false} t={t} />
          <RenderField label={t("GST Number")} value={watch('gstNumber')} t={t} />
          <RenderField label={t("PAN Number")} value={watch('panNumber')} t={t} />
        </View>
        
        <Text style={{ fontWeight: '700', fontSize: 13, marginBottom: 4, marginTop: 8 }}>{t("Bank Details:")}</Text>
        {bankAccounts.map((bank: any, i: number) => {
          const isBankMissing = !bank.accountType || !bank.bankName || !bank.bankBranch || !bank.accountName || !bank.accountNumber || !bank.bankIfsc;
          return (
            <View key={i} style={{ marginBottom: 8 }}>
              {isBankMissing ? (
                <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 12 }}>{t("Account")} {i + 1}: {t("Missing Required Bank Fields")}</Text>
              ) : (
                <>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>{t("Account")} {i + 1} ({bank.accountType})</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>{bank.bankName} - {bank.bankBranch}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t("A/C: ")} {bank.accountNumber} | {t("IFSC: ")} {bank.bankIfsc}</Text>
                </>
              )}
            </View>
          );
        })}
        {bankAccounts.length === 0 && <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 12 }}>{t("Missing Bank Accounts")}</Text>}
      </View>

      {/* 2. Profiling & Scoring */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{t("2. Profiling & Scoring")}</Text>
           {renderEditBtn(2)}
        </View>
        <Text style={{ fontWeight: '900', fontSize: 18, color: getCategoryColor(scoreData.band), marginBottom: 8 }}>
          {t("Overall: ")} {scoreData.raw} {t("Points")} ({scoreData.band})
        </Text>
      </View>

      {/* 3. Business Details */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{t("3. Business Area")}</Text>
           {renderEditBtn(3)}
        </View>
        
        <RenderField label={t("Has Additional Locations?")} value={watch('hasAdditionalLocations')} t={t} />
        {watch('hasAdditionalLocations') === 'Yes' && (
          <View style={{ paddingLeft: 8, borderLeftWidth: 2, borderColor: isAdditionalLocMissing ? colors.danger : colors.border, marginBottom: 8 }}>
            {isAdditionalLocMissing ? (
              <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 12 }}>{t("Missing: Please add at least 1 shop or godown")}</Text>
            ) : (
              <>
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 12 }}>{t("Additional Shops")}: {additionalShops.length}</Text>
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 12 }}>{t("Godowns")}: {godowns.length}</Text>
              </>
            )}
          </View>
        )}

        <RenderField label={t("Linked to Distributor?")} value={watch('isLinkedToDistributor')} t={t} />
        {watch('isLinkedToDistributor') === 'Yes' && (
           <View style={{ paddingLeft: 8, borderLeftWidth: 2, borderColor: isDistributorMissing ? colors.danger : colors.border, marginBottom: 8 }}>
             {isDistributorMissing ? (
               <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 12 }}>{t("Missing Distributor Details")}</Text>
             ) : (
               <Text style={{ color: colors.text, fontWeight: '600', fontSize: 12 }}>{linkedDistributors[0]?.name} ({linkedDistributors[0]?.contact})</Text>
             )}
           </View>
        )}

        <RenderField label={t("Proposed Status")} value={watch('proposedStatus')} t={t} />
        
        <RenderField label={t("Willing for Demo Farmers")} value={watch('willingDemoFarmers')} t={t} />
        {watch('willingDemoFarmers') === 'Yes' && (
          <View style={{ paddingLeft: 8, borderLeftWidth: 2, borderColor: isDemoFarmersMissing ? colors.danger : colors.border, marginBottom: 8 }}>
            {isDemoFarmersMissing ? (
               <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 12 }}>{t("Missing: Upload a list or enter farmers manually")}</Text>
            ) : uploadedDocs['demo_farmers_list'] ? (
               <Text style={{ color: colors.success, fontWeight: '700', fontSize: 12 }}>✓ {t("Document Uploaded")}</Text>
            ) : (
               <Text style={{ color: colors.text, fontWeight: '600', fontSize: 12 }}>{t("Manual Farmers Recorded")}: {demoFarmers.filter((f: any) => f.name).length}</Text>
            )}
          </View>
        )}
      </View>

      {/* 4 & 5. Checklists */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{t("4 & 5. Checklists")}</Text>
           {renderEditBtn(4)}
        </View>
        
        <Text style={{ fontWeight: isCommitmentsMissing ? '800' : '700', color: isCommitmentsMissing ? colors.danger : colors.text, fontSize: 13, marginBottom: 4 }}>
          {t("GLS Commitments Accepted:")}
        </Text>
        {isCommitmentsMissing ? (
           <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '800' }}>
             {t("Missing")} {GLS_COMMITMENTS.length - glsCommitments.length} {t("Commitments")}
           </Text>
        ) : (
           <Text style={{ color: colors.success, fontSize: 12, fontWeight: '700' }}>✓ {t("All Commitments Accepted")}</Text>
        )}
      </View>

      {/* 6. Documents & Location */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{t("6. Documents & Location")} *</Text>
           {renderEditBtn(6)}
        </View>
        <Text style={{ color: colors.textMuted, marginBottom: 8, fontSize: 13 }}>{t("Required Files")}:</Text>
        {allRequiredDocs.map((key) => {
           const isUploaded = Array.isArray(uploadedDocs[key]) ? uploadedDocs[key].length > 0 : !!uploadedDocs[key];
           return (
             <Text key={key} style={{ fontSize: 12, marginBottom: 2, color: isUploaded ? colors.textMuted : colors.danger, fontWeight: isUploaded ? '400' : '800' }}>
               • {key.replace(/_/g, ' ').toUpperCase()}: {' '}
               {isUploaded ? (
                 <Text style={{ color: colors.success, fontWeight: '700' }}>{t("Uploaded")}</Text>
               ) : (
                 <Text style={{ color: colors.danger, fontWeight: '800' }}>{t("Missing")}</Text>
               )}
             </Text>
           );
        })}
        
        <Text style={{ color: !watch('shopLocations')?.['shop_exterior'] ? colors.danger : colors.textMuted, fontWeight: !watch('shopLocations')?.['shop_exterior'] ? '800' : '400', marginTop: 8 }}>
          {t("GPS Location")}: {!watch('shopLocations')?.['shop_exterior'] ? <Text style={{ color: colors.danger, fontWeight: '800' }}>{t("Missing (Requires Shop Exterior Photo)")}</Text> : <Text style={{ color: colors.success, fontWeight: '700' }}>{t("Captured")}</Text>}
        </Text>
      </View>

      {/* 7. Annexures */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{t("7. Annexures")}</Text>
           {renderEditBtn(7)}
        </View>
        
        <RenderField label={t("Territories")} value={seTerritories.map((tItem:any) => tItem.taluka).filter(Boolean)} isMissingOverride={isTerritoriesMissing} t={t} />
        <RenderField label={t("Principal Suppliers")} value={watch('sePrincipalSuppliers')} t={t} />
        <RenderField label={t("Chemical Products")} value={watch('seChemicalProducts')} t={t} />
        <RenderField label={t("Bio Products")} value={watch('seBioProducts')} t={t} />
        <RenderField label={t("Other Products")} value={watch('seOtherProducts')} t={t} />
        
        <RenderField label={t("Has Credit References?")} value={watch('seHasCreditReferences')} t={t} />
        {watch('seHasCreditReferences') === 'Yes' && (
           <View style={{ paddingLeft: 8, borderLeftWidth: 2, borderColor: isCreditRefsMissing ? colors.danger : colors.border, marginBottom: 8 }}>
             {isCreditRefsMissing ? (
               <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 12 }}>{t("Missing Valid Reference Details")}</Text>
             ) : (
               <Text style={{ color: colors.text, fontWeight: '600', fontSize: 12 }}>{seCreditRefs.map((r:any) => r.name).join(', ')}</Text>
             )}
           </View>
        )}

        <Text style={{ color: watch('seWillShareSales') === undefined ? colors.danger : colors.textMuted, fontWeight: watch('seWillShareSales') === undefined ? '800' : '400', marginBottom: 4, marginTop: 8 }}>
          {t("Share Sales Data?")}: 
          {watch('seWillShareSales') === undefined ? (
             <Text style={{ color: colors.danger, fontWeight: '800' }}> {t("Missing")}</Text>
          ) : (
             <Text style={{ color: colors.text, fontWeight: '700' }}> {watch('seWillShareSales') ? t("Yes") : t("No")}</Text>
          )}
        </Text>

        <Text style={{ color: isGrowthVisionMissing ? colors.danger : colors.textMuted, fontWeight: isGrowthVisionMissing ? '800' : '400', marginBottom: 4, marginTop: 8 }}>
          {t("Growth Vision Provided?")}: 
          {isGrowthVisionMissing ? (
             <Text style={{ color: colors.danger, fontWeight: '800' }}> {t("Missing")}</Text>
          ) : (
             <Text style={{ color: colors.text, fontWeight: '700' }}> {t("Yes")}</Text>
          )}
        </Text>
        
        <Text style={{ color: colors.textMuted, marginBottom: 4, marginTop: 4 }}>{t("Security Deposit")}: <Text style={{ color: colors.text, fontWeight: '700' }}>₹{watch('seSecurityDeposit') || '0'}</Text></Text>
        
        {requiresPaymentProof && (
          <Text style={{ color: isPaymentProofMissing ? colors.danger : colors.textMuted, fontWeight: isPaymentProofMissing ? '800' : '400', marginBottom: 4 }}>
            {t("Payment Proof")}: {isPaymentProofMissing ? (
               <Text style={{ color: colors.danger, fontWeight: '800' }}>{t("Missing")}</Text>
            ) : (
               <Text style={{ color: colors.text, fontWeight: '700' }}>{t("Provided")}</Text>
            )}
          </Text>
        )}
      </View>

      {/* 8. Agreement & Signatures */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{t("8. Agreement & Signatures")}</Text>
           {renderEditBtn(8)}
        </View>
        
        <Text style={{ color: isAgreementMissing ? colors.danger : colors.textMuted, fontWeight: isAgreementMissing ? '800' : '400', marginBottom: 4 }}>
          {t("Agreement Accepted")}: 
          {isAgreementMissing ? <Text style={{ color: colors.danger, fontWeight: '800' }}> {t('Missing')}</Text> : <Text style={{ color: colors.success, fontWeight: '700' }}> {t('Yes')}</Text>}
        </Text>
        
        <Text style={{ color: isDealerSigMissing ? colors.danger : colors.textMuted, fontWeight: isDealerSigMissing ? '800' : '400', marginBottom: 4 }}>
          {t("Dealer Signature")}: 
          {isDealerSigMissing ? <Text style={{ color: colors.danger, fontWeight: '800' }}> {t('Missing')}</Text> : <Text style={{ color: colors.success, fontWeight: '700' }}> {t('Captured')}</Text>}
        </Text>
        
        <Text style={{ color: isSESigMissing ? colors.danger : colors.textMuted, fontWeight: isSESigMissing ? '800' : '400', marginBottom: 4 }}>
          {t("SE Signature")}: 
          {isSESigMissing ? <Text style={{ color: colors.danger, fontWeight: '800' }}> {t('Missing')}</Text> : <Text style={{ color: colors.success, fontWeight: '700' }}> {t('Captured')}</Text>}
        </Text>
      </View>

    </View>
  );
};