import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { UseFormReturn } from 'react-hook-form';
import { colors, radius, spacing } from '../../../../../design-system/tokens';
import { DealerOnboardingValues } from '../../schema';

interface Props {
  form: UseFormReturn<DealerOnboardingValues>;
  scoreData: { raw: number, band: string };
  setJumpBackTo: (step: number) => void;
  setStep: (step: number) => void;
  getCategoryColor: (band: string) => string;
}

export const Step9Review = ({ form, scoreData, setJumpBackTo, setStep, getCategoryColor }: Props) => {
  const { watch } = form;

  const renderEditBtn = (targetStep: number) => (
    <Pressable onPress={() => { setJumpBackTo(9); setStep(targetStep); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <MaterialIcons name="edit" size={16} color={colors.primary} />
      <Text style={{ color: colors.primary, fontWeight: '700' }}>Edit</Text>
    </Pressable>
  );

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>Final Review</Text>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.md, fontSize: 13 }}>Please verify all the details carefully before generating the agreement.</Text>

      {/* 1. Basic Information */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>1. Basic Info</Text>
           {renderEditBtn(1)}
        </View>
        
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Primary Shop: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('shopName')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Firm Type: <Text style={{ color: colors.text }}>{watch('firmType')} ({watch('estYear')})</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Location: <Text style={{ color: colors.text }}>{watch('village')}, {watch('taluka')}, {watch('city')}, {watch('state')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Address: <Text style={{ color: colors.text }}>{watch('address')} {watch('landmark') ? `(Near ${watch('landmark')})` : ''}</Text></Text>

        <Text style={{ color: colors.textMuted, marginBottom: 4, marginTop: 8 }}>Owner(s): <Text style={{ color: colors.text }}>{watch('owners')?.map(o => o.name).join(', ')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Mobile: <Text style={{ color: colors.text }}>+91 {watch('contactMobile')}</Text></Text>
        {watch('landlineNumber') ? <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Landline: <Text style={{ color: colors.text }}>{watch('landlineNumber')}</Text></Text> : null}
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>GST Number: <Text style={{ color: colors.text }}>{watch('gstNumber')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 8 }}>PAN Number: <Text style={{ color: colors.text }}>{watch('panNumber')}</Text></Text>
        
        <Text style={{ fontWeight: '700', fontSize: 13, marginBottom: 4, marginTop: 4 }}>Bank Details:</Text>
        {watch('bankAccounts')?.map((bank, i) => (
          <View key={i} style={{ marginBottom: 8 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>Account {i + 1} ({bank.accountType})</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{bank.bankName} - {bank.bankBranch}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>A/C: {bank.accountNumber} | IFSC: {bank.bankIfsc}</Text>
          </View>
        ))}
      </View>

      {/* 2. Profiling & Scoring */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>2. Profiling & Scoring</Text>
           {renderEditBtn(2)}
        </View>
        <Text style={{ fontWeight: '900', fontSize: 18, color: getCategoryColor(scoreData.band), marginBottom: 8 }}>
          Overall: {scoreData.raw} Points ({scoreData.band})
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>Financial: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('scoreFinancial')}/10</Text></Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>Reputation: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('scoreReputation')}/10</Text></Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>Operations: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('scoreOperations')}/10</Text></Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>Network: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('scoreFarmerNetwork')}/10</Text></Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>Team: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('scoreTeam')}/10</Text></Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>Portfolio: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('scorePortfolio')}/10</Text></Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>Experience: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('scoreExperience')}/10</Text></Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>Growth: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('scoreGrowth')}/10</Text></Text>
        </View>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Audio Notes Attached: <Text style={{ color: colors.text }}>{['audioFinancial', 'audioReputation', 'audioOperations', 'audioFarmerNetwork', 'audioTeam', 'audioPortfolio', 'audioExperience', 'audioGrowth'].filter(k => watch(k as any)).length}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Red Flags: <Text style={{ color: watch('redFlags') ? colors.danger : colors.text, fontWeight: watch('redFlags') ? '700' : '400' }}>{watch('redFlags') || 'None'}</Text></Text>
      </View>

      {/* 3. Business Details */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>3. Business Area</Text>
           {renderEditBtn(3)}
        </View>

        {watch('hasAdditionalLocations') === 'Yes' && (
          <View>
            <Text style={{ fontWeight: '700', fontSize: 13, marginBottom: 4 }}>Additional Shops ({watch('additionalShops')?.length || 0}):</Text>
            {watch('additionalShops')?.map((s, i) => (
              <View key={i} style={{ marginBottom: 8, paddingLeft: 8, borderLeftWidth: 2, borderColor: colors.border }}>
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 12 }}>{s.shopName} ({s.estYear})</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{s.address} ({s.village}, {s.city})</Text>
              </View>
            ))}

            <Text style={{ fontWeight: '700', fontSize: 13, marginTop: 4, marginBottom: 4 }}>Godowns ({watch('godowns')?.length || 0}):</Text>
            {watch('godowns')?.map((g, i) => (
              <View key={i} style={{ marginBottom: 8, paddingLeft: 8, borderLeftWidth: 2, borderColor: colors.border }}>
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 12 }}>{g.capacity} {g.capacityUnit}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{g.address}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={{ color: colors.textMuted, marginBottom: 4, marginTop: 8 }}>Linked to Distributor?: <Text style={{ color: colors.text }}>{watch('isLinkedToDistributor')}</Text></Text>
        {watch('isLinkedToDistributor') === 'Yes' && watch('linkedDistributors')?.map((dist, i) => <Text key={i} style={{ color: colors.textMuted, marginBottom: 4, marginLeft: 8 }}>- {dist.name} ({dist.contact})</Text>)}
        
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Proposed Status: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('proposedStatus')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Willing for Demo Farmers: <Text style={{ color: colors.text }}>{watch('willingDemoFarmers')}</Text></Text>
      </View>

      {/* 4 & 5. Checklists */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>4 & 5. Checklists</Text>
           {renderEditBtn(4)}
        </View>
        <Text style={{ fontWeight: '700', fontSize: 13, marginBottom: 4 }}>GLS Commitments Accepted:</Text>
        {watch('glsCommitments')?.map((c, i) => <Text key={i} style={{ color: colors.text, fontSize: 12, marginBottom: 2 }}>✓ {c}</Text>)}
        <Text style={{ fontWeight: '700', fontSize: 13, marginBottom: 4, marginTop: 8 }}>Compliance Documents Checked:</Text>
        {watch('complianceChecklist')?.length ? watch('complianceChecklist')?.map((c, i) => <Text key={i} style={{ color: colors.text, fontSize: 12, marginBottom: 2 }}>✓ {c}</Text>) : <Text style={{ color: colors.textMuted, fontSize: 12 }}>None Selected</Text>}
      </View>
      
      {/* 6. Documents & Photos */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>6. Documents & Location</Text>
           {renderEditBtn(6)}
        </View>
        <Text style={{ color: colors.textMuted, marginBottom: 8 }}>Exterior GPS: <Text style={{ color: watch('shopLocations')?.['shop_exterior'] ? colors.success : colors.danger, fontWeight: '700' }}>{watch('shopLocations')?.['shop_exterior'] ? `${watch('shopLocations')?.['shop_exterior'].lat.toFixed(5)}, ${watch('shopLocations')?.['shop_exterior'].lng.toFixed(5)}` : 'Missing'}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 8 }}>Files Uploaded:</Text>
        {Object.entries(watch('documents') || {}).map(([key, val]) => (
           <Text key={key} style={{ color: colors.text, fontSize: 12, marginBottom: 2 }}>
             • {key.replace(/_/g, ' ').toUpperCase()}: <Text style={{ color: colors.primary, fontWeight: '700' }}>{Array.isArray(val) ? `${val.length} Files` : 'Uploaded'}</Text>
           </Text>
        ))}
      </View>

      {/* 7. SE Annexures */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>7. Annexures</Text>
           {renderEditBtn(7)}
        </View>
        
        <Text style={{ fontWeight: '700', fontSize: 13, marginBottom: 4 }}>Territories ({watch('seTerritories')?.length || 0}):</Text>
        {watch('seTerritories')?.map((t, i) => (
          <View key={i} style={{ marginBottom: 8, paddingLeft: 8, borderLeftWidth: 2, borderColor: colors.border }}>
            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 12 }}>{t.taluka}, {t.village?.join(', ')}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Area: {t.cultivableArea} Acres | Crops: {t.majorCrops?.join(', ')}</Text>
          </View>
        ))}

        <Text style={{ color: colors.textMuted, marginBottom: 4, marginTop: 8 }}>Principal Suppliers: <Text style={{ color: colors.text }}>{watch('sePrincipalSuppliers')?.join(', ')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Chemical Products: <Text style={{ color: colors.text }}>{watch('seChemicalProducts')?.join(', ')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Bio Products: <Text style={{ color: colors.text }}>{watch('seBioProducts')?.join(', ')}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Other Products: <Text style={{ color: colors.text }}>{watch('seOtherProducts')?.join(', ')}</Text></Text>
        
        <Text style={{ fontWeight: '700', fontSize: 13, marginBottom: 4, marginTop: 4 }}>Credit References:</Text>
        {watch('seHasCreditReferences') === 'Yes' && watch('seCreditReferences')?.length ? watch('seCreditReferences')?.map((ref, i) => (
          <Text key={i} style={{ color: colors.text, fontSize: 12, marginBottom: 2 }}>{i+1}. {ref.name} ({ref.contact})</Text>
        )) : <Text style={{ color: colors.textMuted, fontSize: 12 }}>None</Text>}
        
        <Text style={{ color: colors.textMuted, marginBottom: 4, marginTop: 4 }}>Share Sales Data?: <Text style={{ color: colors.text, fontWeight: '700' }}>{watch('seWillShareSales') ? 'Yes' : 'No'}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Growth Vision Provided?: <Text style={{ color: colors.text }}>{watch('seGrowthVision') || watch('seGrowthVisionAudio') ? 'Yes' : 'No'}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Security Deposit: <Text style={{ color: colors.text }}>₹{watch('seSecurityDeposit') || '0'}</Text></Text>
        {watch('seSecurityDeposit') && parseInt(watch('seSecurityDeposit') || '0') > 0 ? (
          <>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Payment Proof (Txn/Cheque): <Text style={{ color: colors.text }}>{watch('sePaymentProofText') || 'N/A'}</Text></Text>
            <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Payment Proof Media: <Text style={{ color: watch('documents')?.se_payment_proof ? colors.primary : colors.danger, fontWeight: '700' }}>{watch('documents')?.se_payment_proof ? 'Uploaded' : 'Missing'}</Text></Text>
          </>
        ) : null}
      </View>

      {/* 8. Agreement & Signatures */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
           <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>8. Agreement & Signatures</Text>
           {renderEditBtn(8)}
        </View>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Agreement Accepted: <Text style={{ color: watch('agreementAccepted') ? colors.success : colors.danger, fontWeight: '700' }}>{watch('agreementAccepted') ? 'Yes' : 'No'}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>Dealer Signature: <Text style={{ color: watch('dealerSignature') ? colors.success : colors.danger, fontWeight: '700' }}>{watch('dealerSignature') ? 'Captured' : 'Missing'}</Text></Text>
        <Text style={{ color: colors.textMuted, marginBottom: 4 }}>SE Signature: <Text style={{ color: watch('seSignature') ? colors.success : colors.danger, fontWeight: '700' }}>{watch('seSignature') ? 'Captured' : 'Missing'}</Text></Text>
      </View>

    </View>
  );
};