import React from 'react';
import { View, Text } from 'react-native';
import { Controller } from 'react-hook-form';
import { CheckboxItem, SignaturePad } from '../../../../../design-system/components';
import { colors, radius, spacing } from '../../../../../design-system/tokens';

export const Step4Signatures = ({ control, t }: any) => {
  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>{t("Declaration & Signatures")}</Text>
      <View style={{ backgroundColor: '#F1F5F9', padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border }}>
         <Text style={{ fontSize: 13, lineHeight: 22, color: colors.textMuted }}>
           <Text style={{ fontWeight: 'bold', color: colors.text }}>I hereby agree to join the GLS Farmer First Program. I understand that:{'\n\n'}</Text>
           • A personalised Farmer Card and Crop Calendar will be prepared for me.{'\n'}
           • I will receive regular support from the GLS Field Executive.{'\n'}
           • I agree to share basic farm data and crop performance feedback with GLS for better support.{'\n'}
           • I will try to follow the recommended Crop Calendar to the best of my ability.
         </Text>
      </View>
      
      <Controller control={control} name="agreementAccepted" render={({field}) => <CheckboxItem label={t("I agree to the declaration above.")} checked={field.value} onChange={field.onChange} />} />
      
      <View style={{ marginTop: spacing.xl }}>
        <Controller control={control} name="farmerSignature" render={({field}) => (
          <View>
            <Text style={{ fontWeight: '700', marginBottom: spacing.sm }}>{t("Farmer's Signature *")}</Text>
            <SignaturePad height={200} value={field.value} onChange={(has, data) => field.onChange(has ? data : '')} />
          </View>
        )} />
      </View>
      <View style={{ marginTop: spacing.md }}>
        <Controller control={control} name="seSignature" render={({field}) => (
          <View>
            <Text style={{ fontWeight: '700', marginBottom: spacing.sm }}>{t("Sales Executive Signature *")}</Text>
            <SignaturePad height={200} value={field.value} onChange={(has, data) => field.onChange(has ? data : '')} />
          </View>
        )} />
      </View>
    </View>
  );
};