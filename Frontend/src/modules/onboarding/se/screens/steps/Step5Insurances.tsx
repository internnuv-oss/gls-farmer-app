import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Controller } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, SelectField } from '../../../../../design-system/components';
import { colors, radius, spacing, shadows } from '../../../../../design-system/tokens';

const INSURANCE_TYPES = ["Term Insurance", "Health Insurance", "Accident Policy"];
const INSURANCE_PROVIDERS = [
  "LIC of India", "SBI Life / General", "HDFC Life / Ergo", "ICICI Prudential / Lombard", 
  "Max Life / Bupa", "Tata AIA / AIG", "Star Health", "Care Health", "Bajaj Allianz", "Others"
];

export const Step5Insurances = ({ control, errors, t, watch, setValue, uploading, handleUpload }: any) => {
  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("Insurance Details")}</Text>
      
      <Controller control={control} name="insurances" render={({ field }) => {
        // Default to one empty block if nothing exists yet
        const insurances = field.value?.length > 0 ? field.value : [{ type: '', provider: '', insuranceId: '', documentUrl: '' }];
        
        return (
          <View style={{ marginBottom: spacing.lg }}>
            {insurances.map((ins: any, index: number) => (
              <View key={index} style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
                
                {/* Header & Delete Button */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{t("Policy")} {index + 1}</Text>
                  {insurances.length > 1 && (
                    <Pressable 
                      onPress={() => {
                        const filtered = insurances.filter((_: any, i: number) => i !== index);
                        field.onChange(filtered);
                      }} 
                      style={{ padding: 4 }}
                    >
                      <MaterialIcons name="delete" size={20} color={colors.danger} />
                    </Pressable>
                  )}
                </View>

                {/* Fields */}
                <SelectField label={t("Type of Insurance *")} options={INSURANCE_TYPES} value={ins.type} onChange={(val: string) => { const newArr = [...insurances]; newArr[index].type = val; field.onChange(newArr); }} />
                <SelectField label={t("Select Provider *")} options={INSURANCE_PROVIDERS} value={ins.provider} searchable onChange={(val: string) => { const newArr = [...insurances]; newArr[index].provider = val; field.onChange(newArr); }} />
                <Input label={t("Insurance Number / ID *")} value={ins.insuranceId} onChangeText={(val: string) => { const newArr = [...insurances]; newArr[index].insuranceId = val; field.onChange(newArr); }} placeholder="e.g. POL123456789" />
                
                {/* Document Attachment */}
                <Text style={{ color: colors.textMuted, fontWeight: '700', marginBottom: 8, fontSize: 13, marginTop: 8 }}>{t("Insurance Copy (Optional)")}</Text>
                
                {ins.documentUrl ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: '#BBF7D0' }}>
                    <MaterialIcons name="check-circle" size={20} color="#166534" style={{ marginRight: 8 }} />
                    <Text style={{ color: "#166534", fontWeight: '700', flex: 1 }}>{t("Document Uploaded")}</Text>
                    <Pressable onPress={() => { const newArr = [...insurances]; newArr[index].documentUrl = ''; field.onChange(newArr); }}>
                      <MaterialIcons name="close" size={20} color="#166534" />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable 
                    onPress={() => handleUpload(`insurances.${index}.documentUrl`, 'doc')} // Triggers the hook's document picker
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.md, backgroundColor: '#F1F5F9', borderRadius: radius.sm, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' }}
                  >
                    {uploading?.[`insurances.${index}.documentUrl`] ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <>
                        <MaterialIcons name="upload-file" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                        <Text style={{ color: colors.primary, fontWeight: '700' }}>{t("Upload Insurance Copy")}</Text>
                      </>
                    )}
                  </Pressable>
                )}
              </View>
            ))}
            
            {/* Add New Block Button */}
            <Pressable onPress={() => field.onChange([...insurances, { type: '', provider: '', insuranceId: '', documentUrl: '' }])} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.md, backgroundColor: '#EFF6FF', borderRadius: radius.md, borderWidth: 1, borderColor: '#BFDBFE', borderStyle: 'dashed' }}>
              <MaterialIcons name="add" size={20} color="#2563EB" style={{ marginRight: 8 }} />
              <Text style={{ color: "#2563EB", fontWeight: '800' }}>{t("Add Another Insurance")}</Text>
            </Pressable>
          </View>
        );
      }} />
    </View>
  );
};