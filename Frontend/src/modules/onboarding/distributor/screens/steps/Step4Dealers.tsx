import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, TextArea, SelectField, UploadTile } from '../../../../../design-system/components';
import { colors, radius, spacing, shadows } from '../../../../../design-system/tokens';
import { DistributorOnboardingValues } from '../../schema';

interface Props {
  form: UseFormReturn<DistributorOnboardingValues>;
  uploading: Record<string, boolean>;
  handleUpload: (key: string, type?: 'camera' | 'doc' | 'image') => void;
  t: any;
}

export const Step4Dealers = ({ form, uploading, handleUpload, t }: Props) => {
  const { control, watch, setValue } = form;

  // 🚀 FIX: TypeScript safeguard. Explicitly default to [] so it is NEVER undefined
  const rawDealers = watch('topDealers');
  const topDealers = (Array.isArray(rawDealers) ? rawDealers : []) as any[];
  
  const hasUploadedList = !!watch('documents')?.['dealer_network_list'];

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>
        {t("Dealer Network")}
      </Text>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.lg, fontSize: 13 }}>
        {t("Upload a photo/document of the distributor's top dealers OR enter them manually.")}
      </Text>

      {/* --- UPLOAD SECTION --- */}
      <View style={{ marginBottom: spacing.lg }}>
        <Text style={{ fontWeight: '800', color: colors.text, marginBottom: spacing.sm }}>
          {t("Capture or Upload Dealer List")}
        </Text>
        <UploadTile 
          value={watch('documents')?.['dealer_network_list']} 
          loading={uploading['dealer_network_list']} 
          onUpload={(source) => handleUpload('dealer_network_list', source)} 
          onClear={() => { 
            const d = { ...watch('documents') }; 
            delete d['dealer_network_list']; 
            setValue('documents', d, { shouldValidate: true }); 
          }} 
        />
      </View>

      {/* --- MANUAL ENTRY SECTION (Hidden if file is uploaded) --- */}
      {/* SAFE RENDER: Using ternary operator instead of && */}
      {!hasUploadedList ? (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <Text style={{ marginHorizontal: 12, color: colors.textMuted, fontWeight: '800', fontSize: 12 }}>{t("OR ENTER MANUALLY")}</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>

          {/* 🚀 FIX: TypeScript is now happy because topDealers is guaranteed to be an array */}
          {topDealers.map((dealer, index) => (
            <View key={index} style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                <Text style={{ fontWeight: '800', fontSize: 16, color: colors.primary }}>
                  {t("Dealer")} {index + 1}
                </Text>
                
                {/* SAFE RENDER */}
                {index > 0 ? (
                  <Pressable 
                    onPress={() => {
                      const updatedDealers = topDealers.filter((_, i) => i !== index);
                      setValue('topDealers', updatedDealers, { shouldValidate: true });
                    }}
                    style={{ padding: 4 }}
                    hitSlop={15}
                  >
                    <MaterialIcons name="close" size={24} color={colors.danger} />
                  </Pressable>
                ) : null}
              </View>

              <Controller 
                control={control} 
                name={`topDealers.${index}.name`} 
                render={({field}) => <Input label={t("Dealer Name *")} value={field.value} onChangeText={field.onChange} placeholder={t("e.g. Kisan Agro Center")} error={form.formState.errors.topDealers?.[index]?.name?.message} />} 
              />
              
              <Controller 
                control={control} 
                name={`topDealers.${index}.contact`} 
                render={({field}) => <Input label={t("Contact Number *")} value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" prefix="+91" maxLength={10} placeholder="9876543210" error={form.formState.errors.topDealers?.[index]?.contact?.message} />} 
              />

              <Controller 
                control={control} 
                name={`topDealers.${index}.address`} 
                render={({field}) => <TextArea label={t("Address / Location *")} value={field.value} onChangeText={field.onChange} placeholder={t("Enter dealer location/address...")} minHeight={60} error={form.formState.errors.topDealers?.[index]?.address?.message} />} 
              />

              {/* Optional Analytical Fields */}
              <View style={{ backgroundColor: '#F8FAFC', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#E2E8F0', marginTop: spacing.xs }}>
                <Text style={{ fontWeight: '800', color: colors.textMuted, marginBottom: spacing.md, fontSize: 12, textTransform: 'uppercase' }}>
                  {t("Performance Metrics (Optional)")}
                </Text>
                
                <Controller 
                  control={control} 
                  name={`topDealers.${index}.turnover`} 
                  render={({field}) => <Input label={t("Annual Turnover")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" prefix="₹" suffix={t("Lacs")} placeholder="e.g. 50" />} 
                />
                
                <Controller 
                  control={control} 
                  name={`topDealers.${index}.products`} 
                  render={({field}) => <Input label={t("Major Products Sold")} value={field.value} onChangeText={field.onChange} placeholder={t("e.g. Urea, DAP, Seeds")} />} 
                />
                
                <Controller 
                  control={control} 
                  name={`topDealers.${index}.farmersServed`} 
                  render={({field}) => <Input label={t("No. of Farmers Served")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" placeholder="e.g. 200" />} 
                />

                <Controller 
                  control={control} 
                  name={`topDealers.${index}.bioExperience`} 
                  render={({field}) => <SelectField label={t("Biological Product Experience")} value={field.value || ''} options={['None', 'Limited', 'Moderate', 'Strong', 'Expert']} onChange={field.onChange} placeholder={t("Select level")} />} 
                />
              </View>
            </View>
          ))}

          <Pressable 
            // 🚀 FIX: TypeScript is happy here too because we casted topDealers
            onPress={() => setValue('topDealers', [...topDealers, { name: '', address: '', contact: '', turnover: '', products: '', farmersServed: '', bioExperience: '' }])} 
            style={{ padding: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md, alignItems: 'center', marginBottom: spacing.xl, backgroundColor: '#F8FAFC' }}
          >
            <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 14 }}>+ {t("Add Another Dealer")}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};