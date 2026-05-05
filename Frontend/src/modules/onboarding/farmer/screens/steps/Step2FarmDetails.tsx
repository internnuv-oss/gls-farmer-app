import React from 'react';
import { View, Text } from 'react-native';
import { Controller } from 'react-hook-form';
import { Input, MultiSelectField } from '../../../../../design-system/components';
import { spacing } from '../../../../../design-system/tokens';

const WEST_INDIA_CROPS = ["Cotton", "Groundnut", "Sugarcane", "Wheat", "Bajra", "Maize", "Castor", "Soybean"];
const SOIL_TYPES = ["Black", "Sandy", "Red", "Loamy", "Others"];
const WATER_SOURCES = ["Canal", "Borewell", "Rain", "Others"];

export const Step2FarmDetails = ({ control, errors, t, watch }: any) => {
  // 🚀 UPDATED: Now fallback to an empty array for soilType
  const selectedSoilType = watch('soilType') || [];
  const selectedWaterSource = watch('waterSource') || [];

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("Farm Details")}</Text>
      
      <Controller control={control} name="totalLand" render={({field}) => <Input label={t("Total Land Holding *")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" suffix="Acres" error={errors.totalLand?.message} />} />
      
      <Controller control={control} name="irrigatedLand" render={({field}) => <Input label={t("Irrigated Land (Optional)")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" suffix="Acres" />} />
      <Controller control={control} name="rainFedLand" render={({field}) => <Input label={t("Rain-fed Land (Optional)")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" suffix="Acres" />} />
      
      <Controller control={control} name="majorCrops" render={({field}) => <MultiSelectField label={t("Major Crops (This Season) *")} options={WEST_INDIA_CROPS} value={field.value} onChange={field.onChange} searchable error={errors.majorCrops?.message} />} />
      
      {/* 🚀 UPDATED: Changed RadioGroup to MultiSelectField */}
      <Controller control={control} name="soilType" render={({field}) => <MultiSelectField label={t("Soil Type *")} options={SOIL_TYPES} value={field.value} onChange={field.onChange} error={errors.soilType?.message} />} />
      
      {/* 🚀 UPDATED: Check using .includes() instead of === */}
      {selectedSoilType.includes('Others') && (
        <Controller control={control} name="otherSoilType" render={({field}) => (
          <Input label={t("Specify Other Soil Type *")} value={field.value} onChangeText={field.onChange} error={errors.otherSoilType?.message} />
        )} />
      )}

      <Controller control={control} name="waterSource" render={({field}) => <MultiSelectField label={t("Water Source *")} options={WATER_SOURCES} value={field.value} onChange={field.onChange} error={errors.waterSource?.message} />} />
      
      {selectedWaterSource.includes('Others') && (
        <Controller control={control} name="otherWaterSource" render={({field}) => (
          <Input label={t("Specify Other Water Source *")} value={field.value} onChangeText={field.onChange} error={errors.otherWaterSource?.message} />
        )} />
      )}
    </View>
  );
};