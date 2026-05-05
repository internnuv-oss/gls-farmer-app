import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { CheckboxItem, SignaturePad } from '../../../../../design-system/components';
import { colors, radius, spacing } from '../../../../../design-system/tokens';
import { DistributorOnboardingValues } from '../../schema';

interface Props {
  form: UseFormReturn<DistributorOnboardingValues>;
  t: any;
}

export const Step9Agreement = ({ form, t }: Props) => {
  const { control, watch } = form;

  const renderSectionHeader = (title: string) => (
    <View style={{ marginBottom: spacing.sm, borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: spacing.sm, paddingVertical: 2 }}>
      <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary }}>{title}</Text>
    </View>
  );

  const topDealers = (Array.isArray(watch('topDealers')) ? watch('topDealers') : []) as any[];
  const hasUploadedDealerList = !!watch('documents')?.['dealer_network_list'];

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>{t("Distributor Agreement")}</Text>
      
      <ScrollView 
        style={{ backgroundColor: '#FFFFFF', padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.lg, maxHeight: 500, borderWidth: 1, borderColor: colors.border }} 
        nestedScrollEnabled={true}
      >
         
         {/* --- ANNEXURE A --- */}
         {renderSectionHeader(t('Annexure A: Territory Coverage'))}
         <View style={{ marginBottom: spacing.md, paddingHorizontal: spacing.sm }}>
           {watch('anxTerritories')?.map((tItem, i) => (
             <Text key={i} style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 4 }}>
               <Text style={{ fontWeight: 'bold', color: colors.text }}>{t("Region")} {i + 1}: </Text>
               {tItem.district}, {tItem.taluka} — {tItem.villages?.join(', ') || 'N/A'}{'\n'}
               {t("Area")}: {tItem.cultivableArea || 'N/A'} {t("Acres")} ({tItem.majorCrops?.join(', ') || 'N/A'})
             </Text>
           ))}
         </View>

         {/* --- ANNEXURE B --- */}
         {renderSectionHeader(t('Annexure B: Top Dealers Network'))}
         <View style={{ marginBottom: spacing.md, paddingHorizontal: spacing.sm }}>
           {hasUploadedDealerList ? (
             <Text style={{ fontSize: 13, lineHeight: 22, color: colors.success, fontWeight: '700' }}>{t("[Dealer List Document Uploaded]")}</Text>
           ) : topDealers.length > 0 ? (
             <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted }}>
               <Text style={{ fontWeight: 'bold', color: colors.text }}>{t("Top Dealers")}: </Text>
               {topDealers.map(d => `${d.name} (${d.contact || 'N/A'})`).join(' | ')}
             </Text>
           ) : (
             <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted }}>{t("No dealers recorded.")}</Text>
           )}
         </View>

         {/* --- ANNEXURE C --- */}
         {renderSectionHeader(t('Annexure C: Principal Companies & Product Range'))}
         <View style={{ marginBottom: spacing.md, paddingHorizontal: spacing.sm }}>
           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted }}>
             <Text style={{ fontWeight: 'bold', color: colors.text }}>1. {t("Principal Suppliers")}: </Text>{watch('anxPrincipalSuppliers')?.map(s => `${s.name} (${s.share}%)`).join(', ') || 'N/A'}{'\n'}
             <Text style={{ fontWeight: 'bold', color: colors.text }}>2. {t("Chemical Range")}: </Text>{watch('anxChemicalProducts')?.join(', ') || 'N/A'}{'\n'}
             <Text style={{ fontWeight: 'bold', color: colors.text }}>3. {t("Biological Range")}: </Text>{watch('anxBioProducts')?.join(', ') || 'N/A'}{'\n'}
             <Text style={{ fontWeight: 'bold', color: colors.text }}>4. {t("Other Products")}: </Text>{watch('anxOtherProducts')?.join(', ') || 'N/A'}
           </Text>
         </View>

         {/* --- ANNEXURE D --- */}
         {renderSectionHeader(t('Annexure D: Infrastructure Details'))}
         <View style={{ marginBottom: spacing.md, paddingHorizontal: spacing.sm }}>
           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted }}>
             <Text style={{ fontWeight: 'bold', color: colors.text }}>{t("Godown Capacity")}: </Text>{watch('godownCapacity') ? `${watch('godownCapacity')} Sq.ft` : 'N/A'}{'\n'}
             <Text style={{ fontWeight: 'bold', color: colors.text }}>{t("Cold Chain Facility")}: </Text>{watch('coldChainFacility') || 'N/A'}
           </Text>
         </View>

         {/* --- ANNEXURE E --- */}
         {renderSectionHeader(t('Annexure E: Bank & Credit References'))}
         <View style={{ marginBottom: spacing.md, paddingHorizontal: spacing.sm }}>
           {watch('anxSupplierRefs')?.length ? (
             watch('anxSupplierRefs')?.map((ref, i) => (
               <Text key={i} style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 4 }}>
                 <Text style={{ fontWeight: 'bold', color: colors.text }}>{i + 1}. {ref.name} ({ref.contact}): </Text>{ref.behavior || (ref.behaviorAudio ? t('[Audio Recorded]') : 'N/A')}
               </Text>
             ))
           ) : <Text style={{ fontSize: 13, color: colors.textMuted }}>{t("No references provided.")}</Text>}
         </View>

         {/* --- ANNEXURE F & G --- */}
         {renderSectionHeader(t('Annexure F & G: Sales Reporting & Expansion Plan'))}
         <View style={{ marginBottom: spacing.md, paddingHorizontal: spacing.sm }}>
           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 8 }}>
             <Text style={{ fontWeight: 'bold', color: colors.text }}>{t("Sales Reporting")}: </Text>
             <Text style={{ fontWeight: 'bold', color: watch('anxWillShareSales') ? colors.success : colors.danger }}>{watch('anxWillShareSales') ? t('Confirmed') : t('Not Confirmed')}</Text>
           </Text>
           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted }}>
             <Text style={{ fontWeight: 'bold', color: colors.text }}>{t("2-Year Growth Vision")}: </Text>{'\n'}
             {watch('anxGrowthVision') || (watch('anxGrowthVisionAudio') ? t('[Audio Recorded]') : 'N/A')}
           </Text>
         </View>

         {/* --- TERMS AND CONDITIONS --- */}
         <View style={{ backgroundColor: '#F8FAFC', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginTop: spacing.lg }}>
           <Text style={{ fontSize: 16, fontWeight: '900', color: colors.primary, marginBottom: spacing.md, textAlign: 'center', textDecorationLine: 'underline' }}>{t("Terms & Conditions for Appointment")}</Text>
           
           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 12 }}>
             <Text style={{ fontWeight: '800', color: colors.text }}>1. {t("Territory")}: </Text>{t("The Distributor is appointed for the territory detailed in Annexure A. GLS reserves the right to review or appoint additional partners after mutual consultation if business needs require expansion.")}
           </Text>
           
           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 12 }}>
             <Text style={{ fontWeight: '800', color: colors.text }}>2. {t("Exclusivity / Focus")}: </Text>{t("The Distributor shall give priority to GLS biological products. If Exclusive status is granted, the Distributor shall focus primarily on GLS biological inputs in the designated area.")}
           </Text>
           
           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 12 }}>
             <Text style={{ fontWeight: '800', color: colors.text }}>3. {t("Payment Terms")}: </Text>{t("Initial supplies on 100% advance or LC. Credit facility (15-30 days) may be extended after a satisfactory track record. Delayed payments attract 1.5% interest per month. All payments via RTGS/NEFT.")}
           </Text>
           
           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 12 }}>
             <Text style={{ fontWeight: '800', color: colors.text }}>4. {t("Security Deposit")}: </Text>
             {watch('securityDeposit') && parseInt(watch('securityDeposit') || '0') > 0 
               ? t(`A refundable, interest-free security deposit of ₹{{amount}} has been agreed upon. Refundable within 60 days of termination. Payment Reference: {{proof}}.`, { 
                   amount: watch('securityDeposit'), 
                   proof: watch('paymentProofText') || (watch('documents')?.distributor_payment_proof ? '[Media Uploaded]' : 'Pending') 
                 })
               : t("No security deposit is required at this time.")}
           </Text>

           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 12 }}>
             <Text style={{ fontWeight: '800', color: colors.text }}>5. {t("Minimum Stock & Off-take Commitment")}: </Text>{t("Maintain minimum 30 days' stock as per seasonal demand. Achieve minimum seasonal off-take as mutually agreed. Non-compliance for two consecutive seasons may lead to review/termination.")}
           </Text>

           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 12 }}>
             <Text style={{ fontWeight: '800', color: colors.text }}>6. {t("Logistics & Delivery")}: </Text>{t("GLS will deliver material to the Distributor's godown. The Distributor is responsible for onward distribution, proper storage (including temperature control for microbial products), and dealer-level delivery.")}
           </Text>

           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 12 }}>
             <Text style={{ fontWeight: '800', color: colors.text }}>7. {t("Technical & Marketing Support from GLS")}: </Text>{t("GLS provides Dedicated Field Executives for farmer coverage, Crop-specific packages, Farm Cards, and 100% company-funded marketing support, loyalty programs, and demo kits.")}
           </Text>

           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 12 }}>
             <Text style={{ fontWeight: '800', color: colors.text }}>8. {t("Distributor Obligations")}: </Text>{t("Conduct demos and farmer meetings, ensure all dealers hold valid FCO and Insecticide licenses, share monthly sales reports, maintain proper records, and refrain from dealing in competing unregistered/spurious biological products.")}
           </Text>

           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 12 }}>
             <Text style={{ fontWeight: '800', color: colors.text }}>9. {t("Legal & Compliance")}: </Text>{t("The Distributor must hold valid FCO authorization and Insecticide selling licenses. Full compliance with FCO 1985, Insecticides Act 1968, and GST is mandatory. GLS shall not be liable for any non-compliance by the Distributor.")}
           </Text>

           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 12 }}>
             <Text style={{ fontWeight: '800', color: colors.text }}>10. {t("Data Sharing & Confidentiality")}: </Text>{t("The Distributor agrees to share farmer and dealer network data solely for supporting the Farmer-First ecosystem. Data must be collected with consent (DPDP Act, 2023). Both parties shall treat shared info as strictly confidential and implement security measures.")}
           </Text>

           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted, marginBottom: 12 }}>
             <Text style={{ fontWeight: '800', color: colors.text }}>11. {t("Termination")}: </Text>{t("Either party may terminate with 60 days' written notice. Immediate termination is possible for material breach (payment default, license violation, data misuse). On termination, all dues must be cleared and stock adjusted.")}
           </Text>

           <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted }}>
             <Text style={{ fontWeight: '800', color: colors.text }}>12. {t("Jurisdiction")}: </Text>{t("All disputes shall be subject to the exclusive jurisdiction of courts in Vadodara, Gujarat.")}
           </Text>

           <View style={{ backgroundColor: '#E2E8F0', padding: 12, borderRadius: radius.sm, marginTop: spacing.lg, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
             <Text style={{ fontWeight: '900', color: colors.primary, marginBottom: 6, fontSize: 14 }}>{t("Acceptance")}</Text>
             <Text style={{ fontSize: 13, lineHeight: 22, color: colors.text, fontWeight: '600' }}>
               {t("I/We have read, understood, and unconditionally agree to abide by all the above Terms & Conditions, including the Data Sharing and Confidentiality obligations.")}
             </Text>
           </View>
         </View>
         <View style={{ height: 20 }} />
      </ScrollView>

      <Controller 
        control={control} 
        name="agreementAccepted" 
        render={({field}) => (
          <CheckboxItem 
            label={t("I unconditionally agree to the Terms & Conditions and Data Confidentiality obligations.")} 
            checked={field.value} 
            onChange={field.onChange} 
          />
        )} 
      />
      
      <View style={{ marginTop: spacing.xl }}>
        <Controller 
          control={control} 
          name="distributorSignature" 
          render={({field}) => (
            <View>
              <Text style={{ fontWeight: '700', marginBottom: spacing.sm, color: colors.text }}>{t("Signature & Stamp of Distributor *")}</Text>
              <SignaturePad height={250} value={field.value} onChange={(has, data) => field.onChange(has ? data : '')} />
            </View>
          )} 
        />
      </View>

      <View style={{ marginTop: spacing.md }}>
        <Controller 
          control={control} 
          name="seSignature" 
          render={({field}) => (
            <View>
              <Text style={{ fontWeight: '700', marginBottom: spacing.sm, color: colors.text }}>{t("Sales Executive Signature *")}</Text>
              <SignaturePad height={250} value={field.value} onChange={(has, data) => field.onChange(has ? data : '')} />
            </View>
          )} 
        />
      </View>
    </View>
  );
};