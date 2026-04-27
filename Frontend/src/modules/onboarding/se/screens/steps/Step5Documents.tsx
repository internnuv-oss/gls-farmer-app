import React from 'react';
import { View, Text } from 'react-native';
import { UseFormReturn } from 'react-hook-form';
import { UploadTile } from '../../../../../design-system/components';
import { colors, spacing } from '../../../../../design-system/tokens';
import { SEOnboardingValues } from '../../../dealer/schema';

interface Step5Props {
  form: UseFormReturn<SEOnboardingValues>;
  uploading: Record<string, boolean>;
  handleUpload: (key: any, type?: 'camera' | 'doc' | 'image') => void;
}

export const Step5Documents = ({ form, uploading, handleUpload }: Step5Props) => {
  const { watch, setValue } = form;

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>Document Management</Text>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.lg }}>Upload digital copies of required documents.</Text>

      <View style={{ marginBottom: spacing.md }}>
        <Text style={{ fontWeight: '700', fontSize: 14, marginBottom: 8, color: colors.text }}>Profile Photo (JPG/PNG) *</Text>
        <UploadTile 
          value={watch('documents')?.profilePhoto} 
          loading={uploading['profilePhoto']} 
          onUpload={() => handleUpload('profilePhoto', 'image')} 
          onClear={() => { const d = {...watch('documents')} as any; delete d.profilePhoto; setValue('documents', d); }} 
        />
      </View>

      <View style={{ marginBottom: spacing.md }}>
        <Text style={{ fontWeight: '700', fontSize: 14, marginBottom: 8, color: colors.text }}>Identity Proof (PDF/Image) *</Text>
        <UploadTile 
          value={watch('documents')?.identityProof} 
          loading={uploading['identityProof']} 
          onUpload={(src) => handleUpload('identityProof', src)} 
          onClear={() => { const d = {...watch('documents')} as any; delete d.identityProof; setValue('documents', d); }} 
        />
      </View>

      <View style={{ marginBottom: spacing.md }}>
        <Text style={{ fontWeight: '700', fontSize: 14, marginBottom: 8, color: colors.text }}>Address Proof (PDF/Image) *</Text>
        <UploadTile 
          value={watch('documents')?.addressProof} 
          loading={uploading['addressProof']} 
          onUpload={(src) => handleUpload('addressProof', src)} 
          onClear={() => { const d = {...watch('documents')} as any; delete d.addressProof; setValue('documents', d); }} 
        />
      </View>

      <View style={{ marginBottom: spacing.md }}>
        <Text style={{ fontWeight: '700', fontSize: 14, marginBottom: 8, color: colors.text }}>Relieving Letter (Optional)</Text>
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