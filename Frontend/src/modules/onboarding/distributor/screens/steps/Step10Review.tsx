import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { UseFormReturn } from 'react-hook-form';
import { colors, radius, spacing, shadows } from '../../../../../design-system/tokens';
import { DistributorOnboardingValues } from '../../schema';

interface Props {
  form: UseFormReturn<DistributorOnboardingValues>;
  scoreData: { raw: number, band: string };
  setStep: (step: number) => void;
  setJumpBackTo: (step: number) => void;
  t: any;
}

// 🚀 HELPER: Updated to accept an override so we can inject complex array logic
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

export const Step10Review = ({ form, scoreData, setStep, setJumpBackTo, t }: Props) => {
  const { watch } = form;

  const renderEditBtn = (targetStep: number) => (
    <Pressable 
      onPress={() => { 
        setJumpBackTo(10); 
        setStep(targetStep); 
      }} 
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
      hitSlop={15}
    >
      <MaterialIcons name="edit" size={16} color={colors.primary} />
      <Text style={{ color: colors.primary, fontWeight: '700' }}>{t("Edit")}</Text>
    </Pressable>
  );

  const getCategoryColor = (band: string) => {
    if (band.includes('A+') || band.includes('A') || band.includes('Green')) return '#166534';
    if (band.includes('B') || band.includes('Yellow')) return '#B45309';
    return '#991B1B'; 
  };

  // State extractions
  const topDealers = (Array.isArray(watch('topDealers')) ? watch('topDealers') : []) as any[];
  const glsCommitments = watch('glsCommitments') || [];
  const uploadedDocs = watch('documents') || {};

  // Combine Core Docs with Dynamic Compliance Docs
  const coreDocs = ['gst_certificate', 'pan_card', 'cancelled_cheque', 'trade_licence', 'itr_declaration', 'authorisation_letter', 'storage_exterior', 'storage_interior'];
  const complianceDocs = (watch('complianceChecklist') || []).map((item: string) => item.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase());
  const allRequiredDocs = [...coreDocs, ...complianceDocs];

  // Complex Nested Array Checks (Directly matches schema.ts rules)
  const anxTerritories = watch('anxTerritories') || [];
  const isTerritoriesMissing = anxTerritories.length === 0 || anxTerritories.some((tItem:any) => !tItem.state || !tItem.district || !tItem.taluka || !tItem.villages?.length || !tItem.cultivableArea || !tItem.majorCrops?.length);

  const anxPrincipalSuppliers = watch('anxPrincipalSuppliers') || [];
  const isPrincipalSuppliersMissing = anxPrincipalSuppliers.length === 0 || anxPrincipalSuppliers.some((s:any) => !s.name || !s.share);

  const anxSupplierRefs = watch('anxSupplierRefs') || [];
  const isSupplierRefsMissing = anxSupplierRefs.length === 0 || anxSupplierRefs.some((r:any) => !r.name || !r.contact || r.contact.length !== 10);

  // General Condition Checks
  const isDealersMissing = !uploadedDocs['dealer_network_list'] && !(topDealers.length > 0 && topDealers[0].name);
  const isCommitmentsMissing = glsCommitments.length !== 5;
  const isAgreementMissing = !watch('agreementAccepted');
  const isDistSigMissing = !watch('distributorSignature');
  const isSESigMissing = !watch('seSignature');
  const isGrowthVisionMissing = !watch('anxGrowthVision') && !watch('anxGrowthVisionAudio');
  const requiresPaymentProof = watch('securityDeposit') && parseInt(watch('securityDeposit') || '0') > 0;
  const isPaymentProofMissing = requiresPaymentProof && !watch('paymentProofText') && !uploadedDocs['distributor_payment_proof'];

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("Final Review")}</Text>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.md, fontSize: 13 }}>
        {t("Fields marked in RED are required to submit the profile.")}
      </Text>

      {/* 1. Basic Information */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>1. {t("Basic Info")}</Text>
           {renderEditBtn(1)}
        </View>
        
        <RenderField label={t("Firm Name")} value={watch('firmName')} t={t} />
        <RenderField label={t("Owner")} value={watch('ownerName')} t={t} />
        <RenderField label={t("Contact Person")} value={watch('contactPerson')} t={t} />
        <RenderField label={t("Designation")} value={watch('contactDesignation')} t={t} />
        <RenderField label={t("Mobile")} value={watch('contactMobile')} prefix="+91 " t={t} />
        <RenderField label={t("Email")} value={watch('email')} isRequired={false} t={t} />
        
        <View style={{ marginTop: 8 }}>
          <RenderField label={t("Firm Type")} value={watch('firmType')} t={t} />
          <RenderField label={t("Est Year")} value={watch('estYear')} t={t} />
          <RenderField label={t("State")} value={watch('state')} t={t} />
          <RenderField label={t("City")} value={watch('city')} t={t} />
          <RenderField label={t("Taluka")} value={watch('taluka')} t={t} />
          <RenderField label={t("Pincode")} value={watch('pincode')} t={t} />
          <RenderField label={t("Address")} value={watch('address')} t={t} />
        </View>

        <View style={{ marginTop: 8 }}>
          <RenderField label={t("GST Number")} value={watch('gstNumber')} t={t} />
          <RenderField label={t("PAN Number")} value={watch('panNumber')} t={t} />
        </View>
        
        <Text style={{ fontWeight: '700', fontSize: 13, marginBottom: 4, marginTop: 8 }}>{t("Bank Details")}:</Text>
        {watch('bankAccounts')?.map((bank, i) => {
          const isBankMissing = !bank.accountName || !bank.bankNameBranch || !bank.accountNumber || !bank.bankIfsc;
          return (
            <View key={i} style={{ marginBottom: 8 }}>
              {isBankMissing ? (
                <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 13 }}>
                  {t("Account")} {i + 1}: {t("Missing Required Bank Fields")}
                </Text>
              ) : (
                <>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>{t("Account")} {i + 1} - {bank.accountName}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>{bank.bankNameBranch}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>A/C: {bank.accountNumber} | IFSC: {bank.bankIfsc}</Text>
                </>
              )}
            </View>
          );
        })}
      </View>

      {/* 2. Profiling & Scoring */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>2. {t("Profiling & Scoring")}</Text>
           {renderEditBtn(2)}
        </View>
        <Text style={{ fontWeight: '900', fontSize: 18, color: getCategoryColor(scoreData.band), marginBottom: 8 }}>
          {t("Overall")}: {scoreData.raw} {t("Points")} ({scoreData.band.split(' ')[0]})
        </Text>
      </View>

      {/* 3. Business Scope & Infra */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>3. {t("Business Scope")}</Text>
           {renderEditBtn(3)}
        </View>
        
        <RenderField label={t("Applied Territory")} value={watch('appliedTerritory')} t={t} />
        <RenderField label={t("Turnover Potential")} value={watch('turnoverPotential')} prefix="₹" suffix=" Cr" t={t} />
        <RenderField label={t("Major Suppliers")} value={watch('currentSuppliers')} t={t} />
        <RenderField label={t("Proposed Status")} value={watch('proposedStatus')} t={t} />
        <RenderField label={t("Demo Farmers Comm.")} value={watch('demoFarmersCommitment')} t={t} />
        <RenderField label={t("Godown Capacity")} value={watch('godownCapacity')} suffix=" Sq.ft" t={t} />
        <RenderField label={t("Cold Chain Facility")} value={watch('coldChainFacility')} t={t} />
      </View>

      {/* 4. Dealer Network */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>4. {t("Dealer Network")}</Text>
           {renderEditBtn(4)}
        </View>
        {isDealersMissing ? (
          <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 13 }}>
            {t("Missing: Please upload a list or add dealers manually.")}
          </Text>
        ) : uploadedDocs['dealer_network_list'] ? (
          <Text style={{ color: colors.success, fontWeight: '700', fontSize: 13 }}>✓ {t("Dealer List Uploaded")}</Text>
        ) : (
          <View>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 4 }}>{topDealers.length} {t("Dealers Recorded")}:</Text>
            {topDealers.slice(0, 5).map((d: any, i: number) => (
              <Text key={i} style={{ color: colors.text, fontSize: 12, marginBottom: 2 }}>• {d.name} <Text style={{ color: colors.textMuted }}>({d.contact})</Text></Text>
            ))}
          </View>
        )}
      </View>

      {/* 5 & 6. Checklists */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>5 & 6. {t("Compliance")}</Text>
           <View style={{ flexDirection: 'row', gap: 12 }}>
             {renderEditBtn(5)}
             {renderEditBtn(6)}
           </View>
        </View>
        
        <Text style={{ fontWeight: isCommitmentsMissing ? '800' : '700', color: isCommitmentsMissing ? colors.danger : colors.text, fontSize: 13, marginBottom: 4 }}>
          {t("GLS Commitments Accepted")}:
        </Text>
        {isCommitmentsMissing ? (
           <Text style={{ color: colors.danger, fontSize: 13, fontWeight: '800' }}>
             {t("Missing")} {5 - glsCommitments.length} {t("Commitments")}
           </Text>
        ) : (
           <Text style={{ color: colors.success, fontSize: 12, fontWeight: '700' }}>✓ {t("All 5 Commitments Accepted")}</Text>
        )}
      </View>

      {/* 7. Documents & Photos */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>7. {t("Documents & Photos")}</Text>
           {renderEditBtn(7)}
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
      </View>

      {/* 8. SE Annexures */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>8. {t("Agreement Annexures")}</Text>
           {renderEditBtn(8)}
        </View>
        
        <RenderField label={t("Territories")} value={anxTerritories.map((t:any) => t.district).filter(Boolean)} isMissingOverride={isTerritoriesMissing} t={t} />
        <RenderField label={t("Principal Suppliers")} value={anxPrincipalSuppliers.map((s:any) => s.name).filter(Boolean)} isMissingOverride={isPrincipalSuppliersMissing} t={t} />
        <RenderField label={t("Chemical Products")} value={watch('anxChemicalProducts')} t={t} />
        <RenderField label={t("Bio Products")} value={watch('anxBioProducts')} t={t} />
        <RenderField label={t("Other Products")} value={watch('anxOtherProducts')} t={t} />
        <RenderField label={t("Credit References")} value={anxSupplierRefs.map((r:any) => r.name).filter(Boolean)} isMissingOverride={isSupplierRefsMissing} t={t} />
        
        <Text style={{ color: watch('anxWillShareSales') === undefined ? colors.danger : colors.textMuted, fontWeight: watch('anxWillShareSales') === undefined ? '800' : '400', marginBottom: 4, marginTop: 8 }}>
          {t("Share Sales Data?")}: 
          {watch('anxWillShareSales') === undefined ? (
             <Text style={{ color: colors.danger, fontWeight: '800' }}> {t("Missing")}</Text>
          ) : (
             <Text style={{ color: colors.text, fontWeight: '700' }}> {watch('anxWillShareSales') ? t("Yes") : t("No")}</Text>
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
        
        <Text style={{ color: colors.textMuted, marginBottom: 4, marginTop: 4 }}>{t("Security Deposit")}: <Text style={{ color: colors.text, fontWeight: '700' }}>₹{watch('securityDeposit') || '0'}</Text></Text>
        
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

      {/* 9. Agreement & Signatures */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>9. {t("Agreement & Signatures")}</Text>
           {renderEditBtn(9)}
        </View>
        
        <Text style={{ color: isAgreementMissing ? colors.danger : colors.textMuted, fontWeight: isAgreementMissing ? '800' : '400', marginBottom: 4 }}>
          {t("Agreement Accepted")}: 
          {isAgreementMissing ? <Text style={{ color: colors.danger, fontWeight: '800' }}> {t('Missing')}</Text> : <Text style={{ color: colors.success, fontWeight: '700' }}> {t('Yes')}</Text>}
        </Text>
        
        <Text style={{ color: isDistSigMissing ? colors.danger : colors.textMuted, fontWeight: isDistSigMissing ? '800' : '400', marginBottom: 4 }}>
          {t("Distributor Signature")}: 
          {isDistSigMissing ? <Text style={{ color: colors.danger, fontWeight: '800' }}> {t('Missing')}</Text> : <Text style={{ color: colors.success, fontWeight: '700' }}> {t('Captured')}</Text>}
        </Text>
        
        <Text style={{ color: isSESigMissing ? colors.danger : colors.textMuted, fontWeight: isSESigMissing ? '800' : '400', marginBottom: 4 }}>
          {t("SE Signature")}: 
          {isSESigMissing ? <Text style={{ color: colors.danger, fontWeight: '800' }}> {t('Missing')}</Text> : <Text style={{ color: colors.success, fontWeight: '700' }}> {t('Captured')}</Text>}
        </Text>
      </View>

    </View>
  );
};