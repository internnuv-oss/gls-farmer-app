import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { UseFormReturn } from 'react-hook-form';
import { UploadTile } from '../../../../../design-system/components';
import { colors, radius, spacing, shadows } from '../../../../../design-system/tokens';
import { DistributorOnboardingValues } from '../../schema';

interface Props {
  form: UseFormReturn<DistributorOnboardingValues>;
  uploading: Record<string, boolean>;
  handleUpload: (key: string, type?: 'camera' | 'doc' | 'image') => void;
  t: any;
}

export const Step7Documents = ({ form, uploading, handleUpload, t }: Props) => {
  const { watch, setValue } = form;

  // Documents explicitly listed as mandatory in the PDF
  const coreDocuments = [
    { key: 'gst_certificate', label: 'GST Registration Certificate' },
    { key: 'pan_card', label: 'PAN Card Copy' },
    { key: 'cancelled_cheque', label: 'Cancelled Cheque' },
    { key: 'trade_licence', label: 'Shop & Est. / Trade Licence' },
    { key: 'itr_declaration', label: 'Last 2 Years ITR / Turnover Declaration' },
    { key: 'authorisation_letter', label: 'Authorisation Letter from Owner' }
  ];

  const photoRequirements = [
    { key: 'storage_exterior', label: 'Storage Facility (Exterior)' },
    { key: 'storage_interior', label: 'Storage Facility (Interior)' }
  ];

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("Documents & Photos")}</Text>
      
      {/* --- CORE DOCUMENTS --- */}
      <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.sm }}>{t("Core Business Documents")}</Text>
      {coreDocuments.map((doc) => (
        <View key={doc.key} style={{ marginBottom: spacing.md }}>
          <Text style={{ fontWeight: '700', fontSize: 14, marginBottom: 8, color: colors.text }}>{t(doc.label)} *</Text>
          <UploadTile 
            value={watch('documents')?.[doc.key]} 
            loading={uploading[doc.key]} 
            onUpload={(source) => handleUpload(doc.key, source)} 
            onClear={() => { 
              const d = {...watch('documents')}; 
              delete d[doc.key]; 
              setValue('documents', d, { shouldValidate: true }); 
            }} 
          />
        </View>
      ))}

      {/* --- INFRASTRUCTURE PHOTOS --- */}
      <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.sm, marginTop: spacing.lg }}>{t("Infrastructure Photos")}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: spacing.md }}>
        {t("Capture clear photos of the distributor's main storage and cold-chain facilities.")}
      </Text>

      {photoRequirements.map((photo) => {
         const rawDocValue = watch('documents')?.[photo.key];
         const docsArray = Array.isArray(rawDocValue) ? rawDocValue : (rawDocValue ? [rawDocValue] : []);
         
         return (
           <View key={photo.key} style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
             <Text style={{ fontWeight: '700', fontSize: 14, marginBottom: 8 }}>{t(photo.label)} *</Text>
             {docsArray.map((docUrl, index) => (
               <View key={index} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft, padding: 12, borderRadius: radius.md, marginBottom: 8 }}>
                 <MaterialIcons name="check-circle" size={28} color={colors.primary} />
                 <View style={{ flex: 1, marginLeft: 12 }}>
                   <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 14 }}>{t("Photo")} {index + 1} {t("Captured")}</Text>
                 </View>
                 <Pressable 
                  onPress={() => { 
                    const d = {...watch('documents')}; 
                    const newArray = docsArray.filter((_, i) => i !== index); 
                    if (newArray.length > 0) d[photo.key] = newArray; 
                    else delete d[photo.key]; 
                    setValue('documents', d, { shouldValidate: true }); 
                  }} 
                  style={{ padding: 8 }}>
                   <MaterialIcons name="delete" size={22} color={colors.danger} />
                 </Pressable>
               </View>
             ))}
             <Pressable 
              onPress={() => handleUpload(photo.key, 'camera')} 
              style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md, backgroundColor: '#F8FAFC' }}>
               {uploading[photo.key] ? <ActivityIndicator size="small" color={colors.primary} /> : <MaterialIcons name={docsArray.length > 0 ? "add-a-photo" : "camera-alt"} size={28} color={colors.primary} />}
               <View style={{ flex: 1, marginLeft: 12 }}>
                 <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 14 }}>
                   {docsArray.length > 0 ? t("Capture Another Image") : t("Capture Image")}
                 </Text>
               </View>
             </Pressable>
           </View>
         );
      })}

      {/* --- COMPLIANCE DOCUMENTS --- */}
      {/* SAFE RENDER */}
      {(watch('complianceChecklist')?.length || 0) > 0 ? (
        <View>
          <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.sm, marginTop: spacing.lg }}>{t("Compliance Documents")}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: spacing.md }}>
            {t("Please upload the documents you verified in Step 6.")}
          </Text>

          {watch('complianceChecklist').map((item: string) => {
            const key = item.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            return (
              <View key={key} style={{ marginBottom: spacing.md }}>
                <Text style={{ fontWeight: '700', fontSize: 14, marginBottom: 8, color: colors.text }}>{t(item)} *</Text>
                <UploadTile 
                  value={watch('documents')?.[key]} 
                  loading={uploading[key]} 
                  onUpload={(source) => handleUpload(key, source)} 
                  onClear={() => { 
                    const d = {...watch('documents')}; 
                    delete d[key]; 
                    setValue('documents', d, { shouldValidate: true }); 
                  }} 
                />
              </View>
            );
          })}
        </View>
      ) : null}

      {/* --- ADDITIONAL FILES --- */}
      <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.sm, marginTop: spacing.lg }}>{t("Additional Files")}</Text>
      <View style={{ marginBottom: spacing.md }}>
        <Text style={{ fontWeight: '700', fontSize: 14, marginBottom: 8, color: colors.text }}>{t("List of Current Dealers (Optional)")}</Text>
        <UploadTile 
          value={watch('documents')?.['dealer_list']} 
          loading={uploading['dealer_list']} 
          onUpload={(source) => handleUpload('dealer_list', source)} 
          onClear={() => { 
            const d = {...watch('documents')}; 
            delete d['dealer_list']; 
            setValue('documents', d, { shouldValidate: true }); 
          }} 
        />
      </View>
    </View>
  );
};