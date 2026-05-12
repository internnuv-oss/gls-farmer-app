import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { CheckboxItem, SignaturePad } from '../../../../../design-system/components';
import { colors, radius, spacing } from '../../../../../design-system/tokens';
import { DealerOnboardingValues } from '../../schema';
import { useTranslation } from 'react-i18next';

interface Props {
  form: UseFormReturn<DealerOnboardingValues>;
}

export const Step8Agreement = ({ form }: Props) => {
  const { control, watch } = form;
  const { t } = useTranslation();

  const renderSectionHeader = (title: string) => (
    <View style={{ marginBottom: spacing.sm, borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: spacing.sm, paddingVertical: 2 }}>
      <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary }}>{title}</Text>
    </View>
  );

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>{t("Dealer Agreement")}</Text>
      
      <ScrollView style={{ backgroundColor: '#FFFFFF', padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.lg, maxHeight: 500, borderWidth: 1, borderColor: colors.border }} nestedScrollEnabled={true}>
         
         {/* --- ANNEXURE A --- */}
          {renderSectionHeader(t("Annexure A: Territory Coverage"))}
         <View style={{ marginBottom: spacing.md, paddingHorizontal: spacing.sm }}>
           {watch('seTerritories')?.map((territory, i) => (
             <Text key={i} style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 4 }}>
               <Text style={{ fontWeight: 'bold', color: colors.text }}>{t("Territory")} {i + 1}: </Text>
               {territory.taluka || t('N/A')}, {territory.village?.join(', ') || t('N/A')} — {territory.cultivableArea || t('N/A')} {t("Acres")} ({territory.majorCrops?.join(', ') || t('N/A')})
             </Text>
           ))}
         </View>

         {/* --- ANNEXURE B --- */}
         {renderSectionHeader(t("Annexure B: Principal Companies & Product Range"))}
         <View style={{ marginBottom: spacing.md, paddingHorizontal: spacing.sm }}>
           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted }}>
             <Text style={{ fontWeight: 'bold', color: colors.text }}>{t("1. Principal Suppliers: ")}</Text>{watch('sePrincipalSuppliers')?.join(', ') || t('N/A')}{'\n'}
             <Text style={{ fontWeight: 'bold', color: colors.text }}>{t("2. Chemical Range: ")}</Text>{watch('seChemicalProducts')?.join(', ') || t('N/A')}{'\n'}
             <Text style={{ fontWeight: 'bold', color: colors.text }}>{t("3. Biological/Organic Range: ")}</Text>{watch('seBioProducts')?.join(', ') || t('N/A')}{'\n'}
             <Text style={{ fontWeight: 'bold', color: colors.text }}>{t("4. Other Products: ")}</Text>{watch('seOtherProducts')?.join(', ') || t('N/A')}
           </Text>
         </View>

         {/* --- ANNEXURE C --- */}
         {renderSectionHeader(t("Annexure C: Infrastructure Details"))}
         <View style={{ marginBottom: spacing.md, paddingHorizontal: spacing.sm }}>
           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted }}>
             <Text style={{ fontWeight: 'bold', color: colors.text }}>{t("Primary Godown Capacity: ")}</Text>{watch('godowns')?.[0]?.capacity ? `${watch('godowns')?.[0]?.capacity} ${watch('godowns')?.[0]?.capacityUnit || 'Sq.ft'}` : t('N/A')}{'\n'}
             <Text style={{ fontWeight: 'bold', color: colors.text }}>{t("Physical Verification (Photos): ")}</Text>{watch('documents')?.shop_exterior ? t('Successfully Captured') : t('N/A')}
           </Text>
         </View>

         {/* --- ANNEXURE D --- */}
         {renderSectionHeader(t("Annexure D: Bank & Credit References"))}
         <View style={{ marginBottom: spacing.md, paddingHorizontal: spacing.sm }}>
           {watch('seHasCreditReferences') === 'Yes' && watch('seCreditReferences')?.length ? (
             watch('seCreditReferences')?.map((ref, i) => (
               <Text key={i} style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 4 }}>
                 <Text style={{ fontWeight: 'bold', color: colors.text }}>{i + 1}. {ref.name} ({ref.contact}): </Text>{ref.behavior || (ref.behaviorAudio ? t('[Audio Recorded]') : t('N/A'))}
               </Text>
             ))
           ) : <Text style={{ fontSize: 13, color: colors.textMuted }}>{t("No references provided.")}</Text>}
         </View>

         {/* --- ANNEXURE E --- */}
         {renderSectionHeader(t("Annexure E: Monthly Sales Reporting"))}
         <View style={{ marginBottom: spacing.md, paddingHorizontal: spacing.sm }}>
           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted }}>
             {t("Confirmation to share monthly GLS sales breakup: ")}<Text style={{ fontWeight: 'bold', color: watch('seWillShareSales') ? colors.success : colors.danger }}>{watch('seWillShareSales') ? t('Confirmed') : t('Not Confirmed')}</Text>
           </Text>
         </View>

         {/* --- ANNEXURE F --- */}
         {renderSectionHeader(t("Annexure F: Future Expansion Plan"))}
         <View style={{ marginBottom: spacing.md, paddingHorizontal: spacing.sm }}>
           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted }}>
             <Text style={{ fontWeight: 'bold', color: colors.text }}>{t("2-Year Growth Vision:")}</Text>{'\n'}
             {watch('seGrowthVision') || (watch('seGrowthVisionAudio') ? t('[Audio Recorded]') : t('N/A'))}
           </Text>
         </View>

         {/* --- TERMS AND CONDITIONS --- */}
         <View style={{ backgroundColor: '#F8FAFC', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginTop: spacing.lg }}>
           <Text style={{ fontSize: 16, fontWeight: '900', color: colors.primary, marginBottom: spacing.md, textAlign: 'center', textDecorationLine: 'underline' }}>{t("General Terms & Conditions")}</Text>
           
           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 12 }}>
             <Text style={{ fontWeight: '800', color: colors.text }}>{t("1. Territory: ")}</Text>{t("The Dealer shall operate primarily in the area mentioned in Annexure A and agrees not to actively sell GLS products outside the agreed area without prior approval.")}
           </Text>
           
           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 12 }}>
             <Text style={{ fontWeight: '800', color: colors.text }}>{t("2. Status & Focus: ")}</Text>{t("As an Authorised Dealer, the Dealer can directly honour GLS farmer schemes and Farm Card discounts. As an Exclusive Dealer, the Dealer shall focus primarily on GLS biological products.")}
           </Text>
           
           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 12 }}>
             <Text style={{ fontWeight: '800', color: colors.text }}>{t("3. Payment Terms: ")}</Text>{t("Payment to be made to the linked Distributor as per mutually agreed terms. Delayed payments may result in temporary suspension of supplies.")}
           </Text>
           
           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 12 }}>
             <Text style={{ fontWeight: '800', color: colors.text }}>{t("4. Security Deposit: ")}</Text>
             {watch('seSecurityDeposit') && parseInt(watch('seSecurityDeposit') || '0') > 0 
               ? `${t("A refundable security deposit of ₹")}${watch('seSecurityDeposit')}${t(" has been agreed upon. Payment Reference: ")}${watch('sePaymentProofText') || (watch('documents')?.se_payment_proof ? t('[Media Uploaded]') : t('Pending'))}.`
               : t('No security deposit is required at this time.')}
           </Text>

           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 12 }}>
             <Text style={{ fontWeight: '800', color: colors.text }}>{t("5. Support & Obligations: ")}</Text>{t("GLS will provide technical support, Farm Cards, and promotional material. The Dealer must promote GLS products, allow Field Executives to engage with farmers, and maintain valid FCO/Insecticide licenses.")}
           </Text>

           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 12 }}>
             <Text style={{ fontWeight: '800', color: colors.text }}>{t("6. Data Sharing & Confidentiality: ")}</Text>{t("The Dealer agrees to share farmer details, crop history, and sales records strictly for the purpose of technical support and loyalty programs. Both parties shall keep all shared information confidential.")}
           </Text>

           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted }}>
             <Text style={{ fontWeight: '800', color: colors.text }}>{t("7. Termination & Jurisdiction: ")}</Text>{t("Either party may terminate with 30 days’ written notice. Disputes shall be subject to the exclusive jurisdiction of courts in Vadodara, Gujarat.")}
           </Text>

           <View style={{ backgroundColor: '#E2E8F0', padding: 12, borderRadius: radius.sm, marginTop: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
             <Text style={{ fontWeight: '900', color: colors.primary, marginBottom: 6, fontSize: 14 }}>{t("I/We formally agree to:")}</Text>
             <Text style={{ fontSize: 13, lineHeight: 22, color: colors.text, fontWeight: '600' }}>
               {t("• Promote GLS biological inputs following recommended packages.")}{'\n'}
               {t("• Allow GLS field team to engage with my farmers for support.")}{'\n'}
               {t("• Honour loyalty program and Farm Card benefits.")}{'\n'}
               {t("• Maintain proper storage and display for GLS products.")}
             </Text>
           </View>
         </View>
         <View style={{ height: 20 }} />
      </ScrollView>

      <Controller control={control} name="agreementAccepted" render={({field}) => <CheckboxItem label={t("I agree to all terms and conditions stated above.")} checked={field.value} onChange={field.onChange} />} />
      
      <View style={{ marginTop: spacing.xl }}>
        <Controller control={control} name="dealerSignature" render={({field}) => <View><Text style={{ fontWeight: '700', marginBottom: spacing.sm }}>{t("Dealer Signature *")}</Text><SignaturePad height={250} value={field.value} onChange={(has, data) => field.onChange(has ? data : '')} /></View>} />
      </View>
      <View style={{ marginTop: spacing.md }}>
        <Controller control={control} name="seSignature" render={({field}) => <View><Text style={{ fontWeight: '700', marginBottom: spacing.sm }}>{t("Sales Executive Signature *")}</Text><SignaturePad height={250} value={field.value} onChange={(has, data) => field.onChange(has ? data : '')} /></View>} />
      </View>
    </View>
  );
};