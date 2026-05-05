import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { UseFormReturn } from 'react-hook-form';
import { colors, radius, spacing, shadows } from '../../../../../design-system/tokens';
import { DistributorOnboardingValues, DISTRIBUTOR_GLS_COMMITMENTS } from '../../schema';

interface Props {
  form: UseFormReturn<DistributorOnboardingValues>;
  scoreData: { raw: number, band: string };
  setStep: (step: number) => void;
  setJumpBackTo: (step: number) => void; // 🚀 ADDED
  t: any;
}

export const Step10Review = ({ form, scoreData, setStep, setJumpBackTo, t }: Props) => {
  const { watch } = form;

  // 🚀 FIXED: Edit button now sets jumpBackTo before jumping to the step
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

  const topDealers = (Array.isArray(watch('topDealers')) ? watch('topDealers') : []) as any[];

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("Final Review")}</Text>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.md, fontSize: 13 }}>
        {t("Please verify all the details carefully before generating the agreement.")}
      </Text>

      {/* 1. Basic Information */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>1. {t("Basic Info")}</Text>
           {renderEditBtn(1)}
        </View>
        
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Firm Name")}: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('firmName')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Owner")}: <Text style={{ color: colors.text }}>{watch('ownerName')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Contact Person")}: <Text style={{ color: colors.text }}>{watch('contactPerson')} ({watch('contactDesignation')})</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Mobile")}: <Text style={{ color: colors.text }}>+91 {watch('contactMobile')}</Text></Text>
        {watch('email') ? <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Email")}: <Text style={{ color: colors.text }}>{watch('email')}</Text></Text> : null}
        
        <Text style={{ color: colors.textMuted, marginBottom: 4, marginTop: 8 }}>{t("Firm Type")}: <Text style={{ color: colors.text }}>{watch('firmType')} (Est. {watch('estYear')})</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Location")}: <Text style={{ color: colors.text }}>{watch('taluka')}, {watch('city')}, {watch('state')} - {watch('pincode')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Address")}: <Text style={{ color: colors.text }}>{watch('address')}</Text></Text>

        <Text style={{ color: colors.textMuted, marginBottom: 4, marginTop: 8 }}>{t("GST Number")}: <Text style={{ color: colors.text }}>{watch('gstNumber')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 8 }}>{t("PAN Number")}: <Text style={{ color: colors.text }}>{watch('panNumber')}</Text></Text>
        
        <Text style={{ fontWeight: '700', fontSize: 13, marginBottom: 4, marginTop: 4 }}>{t("Bank Details")}:</Text>
        {watch('bankAccounts')?.map((bank, i) => (
          <View key={i} style={{ marginBottom: 8 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>{t("Account")} {i + 1} - {bank.accountName}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{bank.bankNameBranch}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>A/C: {bank.accountNumber} | IFSC: {bank.bankIfsc}</Text>
          </View>
        ))}
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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{t("Financial")}: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('scoreFinancial')}/10</Text></Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{t("Reputation")}: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('scoreReputation')}/10</Text></Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{t("Operations")}: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('scoreOperations')}/10</Text></Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{t("Network")}: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('scoreDealerNetwork')}/10</Text></Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{t("Team")}: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('scoreTeam')}/10</Text></Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{t("Portfolio")}: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('scorePortfolio')}/10</Text></Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{t("Experience")}: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('scoreExperience')}/10</Text></Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{t("Growth")}: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('scoreGrowth')}/10</Text></Text>
        </View>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Audio Notes Attached")}: <Text style={{ color: colors.text }}>{['audioFinancial', 'audioReputation', 'audioOperations', 'audioDealerNetwork', 'audioTeam', 'audioPortfolio', 'audioExperience', 'audioGrowth'].filter(k => watch(k as any)).length}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Red Flags")}: <Text style={{ color: watch('redFlags') ? colors.danger : colors.text, fontWeight: watch('redFlags') ? '700' : '400' }}>{watch('redFlags') || t('None')}</Text></Text>
      </View>

      {/* 3. Business Scope & Infra */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>3. {t("Business Scope")}</Text>
           {renderEditBtn(3)}
        </View>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Applied Territory")}: <Text style={{ color: colors.text }}>{watch('appliedTerritory')?.join(', ') || t('N/A')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Turnover Potential")}: <Text style={{ color: colors.text, fontWeight: '700' }}>₹{watch('turnoverPotential')} Cr</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 8 }}>{t("Major Suppliers")}: <Text style={{ color: colors.text }}>{watch('currentSuppliers')?.filter(s => s).join(', ') || t('N/A')}</Text></Text>
        
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Proposed Status")}: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('proposedStatus')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 8 }}>{t("Demo Farmers Comm.")}: <Text style={{ color: colors.text }}>{watch('demoFarmersCommitment')}</Text></Text>

        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Godown Capacity")}: <Text style={{ color: colors.text }}>{watch('godownCapacity')} Sq.ft</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Cold Chain Facility")}: <Text style={{ color: colors.text }}>{watch('coldChainFacility')}</Text></Text>
      </View>

      {/* 4. Dealer Network */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>4. {t("Dealer Network")}</Text>
           {renderEditBtn(4)}
        </View>
        {watch('documents')?.['dealer_network_list'] ? (
          <Text style={{ color: colors.success, fontWeight: '700', fontSize: 13 }}>✓ {t("Dealer List Document Uploaded")}</Text>
        ) : topDealers.length > 0 ? (
          <View>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 4 }}>{topDealers.length} {t("Top Dealers Recorded")}:</Text>
            {topDealers.slice(0, 5).map((d: any, i: number) => (
              <Text key={i} style={{ color: colors.text, fontSize: 12, marginBottom: 2 }}>• {d.name} <Text style={{ color: colors.textMuted }}>({d.contact})</Text></Text>
            ))}
            {topDealers.length > 5 ? <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700', marginTop: 4 }}>+ {topDealers.length - 5} {t("more")}</Text> : null}
          </View>
        ) : (
          <Text style={{ color: colors.danger, fontSize: 13 }}>{t("No dealers recorded.")}</Text>
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
        <Text style={{ fontWeight: '700', fontSize: 13, marginBottom: 4 }}>{t("GLS Commitments Accepted")}:</Text>
        {watch('glsCommitments')?.map((c, i) => <Text key={i} style={{ color: colors.text, fontSize: 12, marginBottom: 2 }}>✓ {c}</Text>)}
        
        <Text style={{ fontWeight: '700', fontSize: 13, marginBottom: 4, marginTop: 8 }}>{t("Regulatory Compliance Checked")}:</Text>
        {watch('complianceChecklist')?.length ? watch('complianceChecklist')?.map((c, i) => <Text key={i} style={{ color: colors.text, fontSize: 12, marginBottom: 2 }}>✓ {c}</Text>) : <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t("None Selected")}</Text>}
      </View>

      {/* 7. Documents & Photos */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>7. {t("Documents & Photos")}</Text>
           {renderEditBtn(7)}
        </View>
        <Text style={{ color: colors.textMuted, marginBottom: 8 }}>{t("Files Uploaded")}:</Text>
        {Object.entries(watch('documents') || {}).map(([key, val]) => (
           <Text key={key} style={{ color: colors.text, fontSize: 12, marginBottom: 2 }}>
             • {key.replace(/_/g, ' ').toUpperCase()}: <Text style={{ color: colors.primary, fontWeight: '700' }}>{Array.isArray(val) ? `${val.length} ${t("Files")}` : t('Uploaded')}</Text>
           </Text>
        ))}
      </View>

      {/* 8. SE Annexures */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>8. {t("Agreement Annexures")}</Text>
           {renderEditBtn(8)}
        </View>
        
        <Text style={{ fontWeight: '700', fontSize: 13, marginBottom: 4 }}>{t("Territories")} ({watch('anxTerritories')?.length || 0}):</Text>
        {watch('anxTerritories')?.map((tItem, i) => (
          <View key={i} style={{ marginBottom: 8, paddingLeft: 8, borderLeftWidth: 2, borderColor: colors.border }}>
            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 12 }}>{tItem.district}, {tItem.taluka}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t("Villages")}: {tItem.villages?.join(', ')}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t("Area")}: {tItem.cultivableArea} {t("Acres")} | {tItem.majorCrops?.join(', ')}</Text>
          </View>
        ))}

        <Text style={{ color: colors.textMuted, marginBottom: 4, marginTop: 8 }}>{t("Principal Suppliers")}: <Text style={{ color: colors.text }}>{watch('anxPrincipalSuppliers')?.map(s => `${s.name} (${s.share}%)`).join(', ') || t('N/A')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Chemical Products")}: <Text style={{ color: colors.text }}>{watch('anxChemicalProducts')?.join(', ') || t('N/A')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Bio Products")}: <Text style={{ color: colors.text }}>{watch('anxBioProducts')?.join(', ') || t('N/A')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 8 }}>{t("Other Products")}: <Text style={{ color: colors.text }}>{watch('anxOtherProducts')?.join(', ') || t('N/A')}</Text></Text>
        
        <Text style={{ fontWeight: '700', fontSize: 13, marginBottom: 4 }}>{t("Credit References")}:</Text>
        {watch('anxSupplierRefs')?.length ? watch('anxSupplierRefs')?.map((ref, i) => (
          <Text key={i} style={{ color: colors.text, fontSize: 12, marginBottom: 2 }}>{i+1}. {ref.name} ({ref.contact})</Text>
        )) : <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t("None")}</Text>}
        
        <Text style={{ color: colors.textMuted, marginBottom: 4, marginTop: 8 }}>{t("Share Sales Data?")}: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('anxWillShareSales') ? t('Yes') : t('No')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Growth Vision Provided?")}: <Text style={{ color: colors.text }}>{watch('anxGrowthVision') || watch('anxGrowthVisionAudio') ? t('Yes') : t('No')}</Text></Text>
        
        <Text style={{ color: colors.textMuted, marginBottom: 4, marginTop: 4 }}>{t("Security Deposit")}: <Text style={{ color: colors.text, fontWeight: '700' }}>₹{watch('securityDeposit') || '0'}</Text></Text>
        {watch('securityDeposit') && parseInt(watch('securityDeposit') || '0') > 0 ? (
          <>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Payment Proof (Txn/Cheque)")}: <Text style={{ color: colors.text }}>{watch('paymentProofText') || t('N/A')}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Payment Proof Media")}: <Text style={{ color: watch('documents')?.distributor_payment_proof ? colors.primary : colors.danger, fontWeight: '700' }}>{watch('documents')?.distributor_payment_proof ? t('Uploaded') : t('Missing')}</Text></Text>
          </>
        ) : null}
      </View>

      {/* 9. Agreement & Signatures */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>9. {t("Agreement & Signatures")}</Text>
           {renderEditBtn(9)}
        </View>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Agreement Accepted")}: <Text style={{ color: watch('agreementAccepted') ? colors.success : colors.danger, fontWeight: '700' }}>{watch('agreementAccepted') ? t('Yes') : t('No')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("Distributor Signature")}: <Text style={{ color: watch('distributorSignature') ? colors.success : colors.danger, fontWeight: '700' }}>{watch('distributorSignature') ? t('Captured') : t('Missing')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>{t("SE Signature")}: <Text style={{ color: watch('seSignature') ? colors.success : colors.danger, fontWeight: '700' }}>{watch('seSignature') ? t('Captured') : t('Missing')}</Text></Text>
      </View>

    </View>
  );
};