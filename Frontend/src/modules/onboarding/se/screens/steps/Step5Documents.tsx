import React from 'react';
import { View, Text } from 'react-native';
import { UseFormReturn } from 'react-hook-form';
import { UploadTile } from '../../../../../design-system/components';
import { colors, spacing } from '../../../../../design-system/tokens';
import { SEOnboardingValues } from '../../../se/schema';
import { useTranslation } from 'react-i18next';

interface Step5Props {
  form: UseFormReturn<SEOnboardingValues>;
  uploading: Record<string, boolean>;
  handleUpload: (key: any, type?: 'camera' | 'doc' | 'image') => void;
}

export const Step5Documents = ({ form, uploading, handleUpload }: Step5Props) => {
  const { watch, setValue } = form;
  const { t } = useTranslation();

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>{t("Document Management")}</Text>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.lg }}>{t("Upload digital copies of required documents.")}</Text>

      <View style={{ marginBottom: spacing.md }}>
        <Text style={{ fontWeight: '700', fontSize: 14, marginBottom: 8, color: colors.text }}>{t("Profile Photo (JPG/PNG)")} *</Text>
        <UploadTile 
          value={watch('documents')?.profilePhoto} 
          loading={uploading['profilePhoto']} 
          onUpload={(src) => handleUpload('profilePhoto', src === 'camera' ? 'camera' : 'image')} 
          onClear={() => { const d = {...watch('documents')} as any; delete d.profilePhoto; setValue('documents', d); }} 
        />
      </View>

      <View style={{ marginBottom: spacing.md }}>
  <Text style={{ fontWeight: '700', fontSize: 14, marginBottom: 8, color: colors.text }}>{t("Aadhar Card (Front & Back) *")}</Text>
  <UploadTile 
    value={watch('documents')?.aadharCard} 
    loading={uploading['aadharCard']} 
    onUpload={(src) => handleUpload('aadharCard', src)} 
    onClear={() => { const d = {...watch('documents')} as any; delete d.aadharCard; setValue('documents', d); }} 
  />
</View>

<View style={{ marginBottom: spacing.md }}>
  <Text style={{ fontWeight: '700', fontSize: 14, marginBottom: 8, color: colors.text }}>{t("PAN Card *")}</Text>
  <UploadTile 
    value={watch('documents')?.panCard} 
    loading={uploading['panCard']} 
    onUpload={(src) => handleUpload('panCard', src)} 
    onClear={() => { const d = {...watch('documents')} as any; delete d.panCard; setValue('documents', d); }} 
  />
</View>

      <View style={{ marginBottom: spacing.md }}>
        <Text style={{ fontWeight: '700', fontSize: 14, marginBottom: 8, color: colors.text }}>{t("Address Proof (PDF/Image)")} *</Text>
        <UploadTile 
          value={watch('documents')?.addressProof} 
          loading={uploading['addressProof']} 
          onUpload={(src) => handleUpload('addressProof', src)} 
          onClear={() => { const d = {...watch('documents')} as any; delete d.addressProof; setValue('documents', d); }} 
        />
      </View>

      <View style={{ marginBottom: spacing.md }}>
        <Text style={{ fontWeight: '700', fontSize: 14, marginBottom: 8, color: colors.text }}>{t("Relieving Letter (Optional)")} </Text>
        <UploadTile 
          value={watch('documents')?.relievingLetter} 
          loading={uploading['relievingLetter']} 
          onUpload={(src) => handleUpload('relievingLetter', src)} 
          onClear={() => { const d = {...watch('documents')} as any; delete d.relievingLetter; setValue('documents', d); }} 
        />
      </View>
    </View>
  );
};