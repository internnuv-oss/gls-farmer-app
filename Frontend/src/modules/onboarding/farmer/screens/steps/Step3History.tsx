import React from 'react';
import { View, Text } from 'react-native';
import { Controller } from 'react-hook-form';
import { Input, MultiSelectField, SelectField } from '../../../../../design-system/components';
import { colors, spacing } from '../../../../../design-system/tokens';

const PROBLEMS = ["Low Yield", "Pest/Disease", "Soil Fertility", "Others"];
// 🚀 Dropdown list for previous crops
const CROP_LIST = ["Cotton", "Groundnut", "Sugarcane", "Wheat", "Bajra", "Maize", "Castor", "Soybean", "Rice", "Mustard"];

// 🚀 Mock list for dealers if the actual network is empty
const MOCK_DEALERS = [
    { label: "Ramesh Agro (Mock)", value: "11111111-1111-1111-1111-111111111111" },
    { label: "Kisan Seva Kendra (Mock)", value: "22222222-2222-2222-2222-222222222222" },
    { label: "Gujarat Seeds (Mock)", value: "33333333-3333-3333-3333-333333333333" }
  ];

export const Step3History = ({ control, errors, t, dealers, watch }: any) => {
  // Watch for the "Others" selection
  const selectedProblems = watch('majorProblems') || [];
  
  // 🚀 Use actual dealers if available, otherwise fallback to mocks
  const displayDealers = dealers && dealers.length > 0 ? dealers : MOCK_DEALERS;

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("History & Dealer Linking")}</Text>
      
      {/* 🚀 Changed to SelectField dropdown */}
      <Controller control={control} name="lastCropGrown" render={({field}) => (
        <SelectField 
          label={t("Last Crop Grown (Optional)")} 
          value={field.value || ''} 
          options={CROP_LIST} 
          searchable 
          onChange={field.onChange} 
          error={errors.lastCropGrown?.message} 
        />
      )} />
      
      <Controller control={control} name="yield" render={({field}) => (
        <Input label={t("Previous Yield (Optional)")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" suffix="Quintals/Acre" />
      )} />
      
      <Controller control={control} name="majorProblems" render={({field}) => (
        <MultiSelectField label={t("Major Problems Faced (Optional)")} options={PROBLEMS} value={field.value || []} onChange={field.onChange} />
      )} />
      
      {/* 🚀 Conditional Input for Other Problem */}
      {selectedProblems.includes('Others') && (
        <Controller control={control} name="otherProblem" render={({field}) => (
          <Input label={t("Specify Other Problem *")} value={field.value} onChangeText={field.onChange} error={errors.otherProblem?.message} />
        )} />
      )}
      
      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />
      
      <Text style={{ fontSize: 16, fontWeight: '800', marginBottom: spacing.md, color: colors.primary }}>{t("Link to Dealer")}</Text>
      <Controller control={control} name="dealerId" render={({field}) => (
        <SelectField 
          label={t("Select Dealer *")} 
          value={displayDealers.find((d: any) => d.value === field.value)?.label || ''} 
          options={displayDealers.map((d: any) => d.label)} 
          searchable 
          onChange={(label) => {
            const selected = displayDealers.find((d: any) => d.label === label);
            if (selected) field.onChange(selected.value);
          }} 
          error={errors.dealerId?.message} 
        />
      )} />
    </View>
  );
};