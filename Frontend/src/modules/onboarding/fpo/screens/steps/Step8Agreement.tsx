// Frontend/src/modules/onboarding/fpo/screens/steps/Step8Agreement.tsx
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { SignaturePad, CheckboxItem } from '../../../../../design-system/components';
import { colors, radius, spacing } from '../../../../../design-system/tokens';
import { FPOOnboardingValues } from '../../schema';

interface Props { form: UseFormReturn<FPOOnboardingValues>; t: any; isLocked?: boolean; }

export const Step8Agreement = ({ form, t, isLocked }: Props) => {
  const { control } = form;

  return (
    <View style={{ flex: 1 }} pointerEvents={isLocked ? "none" : "auto"}>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>{t("Terms & Signatures")}</Text>
      <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg }}>
        {t("These terms form part of the formal FPO-GLS Partnership MoU.")}
      </Text>

      {/* 🚀 FIX: Added nestedScrollEnabled and showsVerticalScrollIndicator so it scrolls perfectly inside the wizard */}
      <ScrollView 
        nestedScrollEnabled={true} 
        showsVerticalScrollIndicator={true}
        style={{ backgroundColor: '#F1F5F9', padding: spacing.md, borderRadius: radius.md, height: 300, marginBottom: spacing.md }}
      >
        <Text style={{ fontWeight: '800', marginBottom: spacing.sm }}>{t("Section E: Terms & Conditions")}</Text>
        <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20, marginBottom: spacing.lg }}>
          <Text style={{ fontWeight: '700' }}>1. Scope of Supply & Operations:</Text> {t("The FPO is appointed as a strategic sustainable input partner for the territory detailed in Section C. The FPO will prioritize GLS biological products within its command area to steer members toward residue-free and sustainable farming practices.")}{"\n\n"}
          
          <Text style={{ fontWeight: '700' }}>2. Commercial & Payment Terms:</Text> {t("Initial stock deployment will operate on a 100% advance or secured bank framework. Credit terms (15–30 days) may be extended based on timely transaction history and seasonal volume performance, subject to approval by GLS finance. All financial transactions must be completed electronically via RTGS/NEFT/IMPS from the registered FPO bank account.")}{"\n\n"}
          
          <Text style={{ fontWeight: '700' }}>3. Execution of the 'Farmer-First' Strategy:</Text> {t("The FPO agrees to provide field access to GLS field teams to conduct joint farmer meetings, field schools, and method demonstrations. The FPO management will assist in identifying progressive 'Lead Farmers' in each village cluster to lay down product validation trials.")}{"\n\n"}
          
          <Text style={{ fontWeight: '700' }}>4. Data Sharing, Governance & Digital Compliance:</Text> {t("The FPO agrees to share necessary farmer-member data gathered during operations (Farmer names, mobile numbers, land holdings, baseline crop patterns, Farm Card records, input application dates, and final yield/quality metrics). All shared member data will be utilized solely to execute custom crop-advisory plans, evaluate soil performance, run company-funded loyalty programs, and optimize field executive movements. Both parties will ensure full compliance with the Digital Personal Data Protection (DPDP) Act, 2023. Explicit verbal or written consent will be requested from member farmers before digitizing their profiles for the ecosystem ledger. Both parties shall safeguard this data from third-party leakage or commercial misuse.")}{"\n\n"}
          
          <Text style={{ fontWeight: '700' }}>5. Regulatory Compliance:</Text> {t("The FPO holds ultimate accountability for keeping its retailing licenses (FCO and Insecticide Act) valid, updated, and active. GLS bears no responsibility for local licensing discrepancies resulting from administrative delays on the FPO's side.")}{"\n\n"}
          
          <Text style={{ fontWeight: '700' }}>6. Dispute Resolution & Jurisdiction:</Text> {t("Any disputes arising out of structural execution or accounting reconciliation will be resolved amicably through joint consultation between the GLS Regional Head and the FPO Board of Directors. Unresolved conflicts shall fall under the exclusive jurisdiction of courts in Vadodara, Gujarat.")}
        </Text>
      </ScrollView>

      <Controller control={control} name="agreementAccepted" render={({field}) => (
        <View style={{ marginBottom: spacing.lg }}>
          <CheckboxItem label={t("I agree to the Terms & Conditions")} checked={field.value} onChange={field.onChange} />
          {form.formState.errors.agreementAccepted && <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{form.formState.errors.agreementAccepted.message}</Text>}
        </View>
      )} />

      <Text style={{ fontWeight: '800', marginBottom: spacing.sm }}>{t("FPO Authorized Signature *")}</Text>
      <Controller control={control} name="fpoSignature" render={({ field }) => (
        <SignaturePad value={field.value} onChange={(hasSig, sigData) => field.onChange(sigData || '')} />
      )} />
      {form.formState.errors.fpoSignature && <Text style={{ color: colors.danger, fontSize: 12, marginBottom: spacing.md }}>{form.formState.errors.fpoSignature.message}</Text>}

      <Text style={{ fontWeight: '800', marginBottom: spacing.sm }}>{t("GLS Executive Signature *")}</Text>
      <Controller control={control} name="seSignature" render={({ field }) => (
        <SignaturePad value={field.value} onChange={(hasSig, sigData) => field.onChange(sigData || '')} />
      )} />
      {form.formState.errors.seSignature && <Text style={{ color: colors.danger, fontSize: 12, marginBottom: spacing.md }}>{form.formState.errors.seSignature.message}</Text>}
    </View>
  );
};