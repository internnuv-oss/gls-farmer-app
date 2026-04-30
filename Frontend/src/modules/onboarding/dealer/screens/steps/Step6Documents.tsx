import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { UseFormReturn } from 'react-hook-form';
import { UploadTile } from '../../../../../design-system/components';
import { colors, radius, spacing, shadows } from '../../../../../design-system/tokens';
import { DealerOnboardingValues } from '../../schema';

interface Props {
  form: UseFormReturn<DealerOnboardingValues>;
  uploading: Record<string, boolean>;
  handleUpload: (key: string, type?: 'camera' | 'doc' | 'image') => void;
}

export const Step6Documents = ({ form, uploading, handleUpload }: Props) => {
  const { watch, setValue } = form;

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>Documents & Photos</Text>
      
      <Text style={{ fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm }}>Core Documents</Text>
      {['gst certificate / shop establishment license', 'pan card', 'cancelled cheque'].map((key) => (
        <View key={key} style={{ marginBottom: spacing.md }}>
          <Text style={{ fontWeight: '700', fontSize: 14, marginBottom: 8, color: colors.text }}>{key.toUpperCase()} *</Text>
          <UploadTile value={watch('documents')?.[key]} loading={uploading[key]} onUpload={(source) => handleUpload(key, source)} onClear={() => { const d = {...watch('documents')}; delete d[key]; setValue('documents', d); }} />
        </View>
      ))}

      <Text style={{ fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm, marginTop: spacing.lg }}>Shop Photos (Capture Multiple)</Text>
      {[
        { key: 'shop_exterior', label: '1. Exterior (Store Front)', optional: false },
        { key: 'shop_interior', label: '2. Interior (Stock Images)', optional: true },
        { key: 'shop_godown', label: '3. Godown Images', optional: true }
      ].map((photo) => {
         const rawDocValue = watch('documents')?.[photo.key];
         const docsArray = Array.isArray(rawDocValue) ? rawDocValue : (rawDocValue ? [rawDocValue] : []);
         const specificLocation = watch('shopLocations')?.[photo.key];
         
         return (
           <View key={photo.key} style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
             <Text style={{ fontWeight: '700', fontSize: 14, marginBottom: 8 }}>{photo.label} {!photo.optional && '*'}{photo.optional && <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '500' }}> (Optional)</Text>}</Text>
             {docsArray.map((docUrl, index) => (
               <View key={index} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft, padding: 12, borderRadius: radius.md, marginBottom: 8 }}>
                 <MaterialIcons name="check-circle" size={28} color={colors.primary} />
                 <View style={{ flex: 1, marginLeft: 12 }}>
                   <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 14 }}>Photo {index + 1} Captured</Text>
                   {specificLocation && specificLocation.lat && specificLocation.lng ? (
                     <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '600', marginTop: 2 }}>📍 GPS: {specificLocation.lat.toFixed(5)}, {specificLocation.lng.toFixed(5)}</Text>
                   ) : (
                     <Text style={{ color: colors.danger, fontSize: 11, fontWeight: '600', marginTop: 2 }}>⚠️ GPS Failed</Text>
                   )}
                 </View>
                 <Pressable onPress={() => { const d = {...watch('documents')}; const newArray = docsArray.filter((_, i) => i !== index); if (newArray.length > 0) d[photo.key] = newArray; else delete d[photo.key]; setValue('documents', d, { shouldValidate: true }); }} style={{ padding: 8 }}>
                   <MaterialIcons name="delete" size={22} color={colors.danger} />
                 </Pressable>
               </View>
             ))}
             <Pressable onPress={() => handleUpload(photo.key, 'camera')} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md, backgroundColor: '#F8FAFC' }}>
               {uploading[photo.key] ? <ActivityIndicator size="small" color={colors.primary} /> : <MaterialIcons name={docsArray.length > 0 ? "add-a-photo" : "camera-alt"} size={28} color={colors.primary} />}
               <View style={{ flex: 1, marginLeft: 12 }}>
                 <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 14 }}>{docsArray.length > 0 ? "Capture Another Image" : "Capture Image"}</Text>
                 <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2, fontWeight: '500' }}>GPS will be captured automatically</Text>
               </View>
             </Pressable>
           </View>
         );
      })}

      <Text style={{ fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm, marginTop: spacing.lg }}>Selfie Verification</Text>
      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
        <Text style={{ fontWeight: '700', fontSize: 14, marginBottom: 8 }}>Selfie with Contact Person *</Text>
        {watch('documents')?.['selfie_with_owner'] ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft, padding: 12, borderRadius: radius.md }}>
            <MaterialIcons name="check-circle" size={28} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}><Text style={{ color: colors.primary, fontWeight: '800', fontSize: 14 }}>Selfie Captured</Text></View>
            <Pressable onPress={() => { const d = {...watch('documents')}; delete d['selfie_with_owner']; setValue('documents', d, { shouldValidate: true }); }} style={{ padding: 8 }}>
              <MaterialIcons name="delete" size={22} color={colors.danger} />
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => handleUpload('selfie_with_owner', 'camera')} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md, backgroundColor: '#F8FAFC' }}>
            {uploading['selfie_with_owner'] ? <ActivityIndicator size="small" color={colors.primary} /> : <MaterialIcons name="person-add-alt-1" size={28} color={colors.primary} />}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 14 }}>Capture Selfie</Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2, fontWeight: '500' }}>Take a clear photo with the contact person</Text>
            </View>
          </Pressable>
        )}
      </View>

      {watch('complianceChecklist')?.length > 0 && (
        <>
          <Text style={{ fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm, marginTop: spacing.lg }}>Compliance Documents</Text>
          {watch('complianceChecklist').map((item: string) => {
            const key = item.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            return (
              <View key={key} style={{ marginBottom: spacing.md }}>
                <Text style={{ fontWeight: '700', fontSize: 14, marginBottom: 8, color: colors.text }}>{item} *</Text>
                <UploadTile value={watch('documents')?.[key]} loading={uploading[key]} onUpload={(source) => handleUpload(key, source)} onClear={() => { const d = {...watch('documents')}; delete d[key]; setValue('documents', d); }} />
              </View>
            );
          })}
        </>
      )}

      <Text style={{ fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm, marginTop: spacing.lg }}>Additional Files</Text>
      <View style={{ marginBottom: spacing.md }}>
        <Text style={{ fontWeight: '700', fontSize: 14, marginBottom: 8, color: colors.text }}>Farmer Customers List (Optional)</Text>
        <UploadTile value={watch('documents')?.['farmer_list']} loading={uploading['farmer_list']} onUpload={(source) => handleUpload('farmer_list', source)} onClear={() => { const d = {...watch('documents')}; delete d['farmer_list']; setValue('documents', d); }} />
      </View>
    </View>
  );
};