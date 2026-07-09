// src/modules/FarmCard/screens/steps/Step3SoilAndHistory.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, SelectField, DatePickerField, YearPickerField } from '../../../../design-system/components';
import { spacing, colors, radius, shadows } from '../../../../design-system/tokens';
import { FarmCardValues } from '../../schema';

const WEST_INDIA_CROPS = [
    "Bajra",
    "Castor",
    "Chana",
    "Chilli",
    "Coriander",
    "Cotton",
    "Cumin",
    "Fennel",
    "Fodder",
    "Garlic",
    "Groundnut",
    "Guar",
    "Irri. Wheat",
    "Isabgul",
    "Jowar",
    "Maize",
    "Math",
    "Moong",
    "Mustard",
    "Onion",
    "Paddy",
    "Potato",
    "Sawa",
    "Sesamum",
    "Soyabean",
    "Sugarcane",
    "Tobacco",
    "Tomato",
    "Tur",
    "Udid",
    "Unirri. Wheat",
    "Vegetable",
    "Wheat",
  ].sort();

interface Props { form: UseFormReturn<FarmCardValues>; t: any; }

export const Step3SoilAndHistory = ({ form, t }: Props) => {
  const { control, watch, setValue, formState: { errors } } = form;
  const yieldHistory = watch('yieldHistory') || [];

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("Soil & Crop History")}</Text>

      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, ...shadows.soft }}>
        <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.md }}>{t("Baseline Soil Profiling")}</Text>
        
        <Controller control={control} name="soilType" render={({field}) => <SelectField label={t("Soil Type")} placeholder={t("Select Soil Type")} value={field.value ?? ''} options={['Sandy', 'Loamy', 'Clay', 'Black', 'Red']} onChange={field.onChange} />} />
        
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><Controller control={control} name="soilPh" render={({field}) => <Input label={t("Soil pH")} placeholder="e.g. 6.5" suffix="pH" keyboardType="numeric" value={field.value} onChangeText={(val) => {
            if (val !== '') {
              const num = parseFloat(val);
              if (!isNaN(num) && num > 14) return; // Physically block typing > 14
            }
            field.onChange(val);
          }} error={errors.soilPh?.message as string} />} /></View>
          <View style={{ flex: 1 }}><Controller control={control} name="soilEc" render={({field}) => <Input label={t("Soil EC")} placeholder="e.g. 1.2" suffix="mS/cm" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} /></View>
        </View>

        <Controller control={control} name="organicMatter" render={({field}) => <Input label={t("Organic Matter")} placeholder="e.g. 2.5" suffix="%" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} />
        
        <Controller control={control} name="nitrogen" render={({field}) => <Input label={t("Nitrogen (N)")} placeholder="e.g. 300" suffix="kg/ha" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} />
        <Controller control={control} name="phosphorus" render={({field}) => <Input label={t("Phosphorus (P)")} placeholder="e.g. 60" suffix="kg/ha" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} />
        <Controller control={control} name="potassium" render={({field}) => <Input label={t("Potassium (K)")} placeholder="e.g. 150" suffix="kg/ha" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} />

        <Controller control={control} name="drainageCondition" render={({field}) => <SelectField label={t("Drainage Condition")} placeholder={t("Select Condition")} value={field.value ?? ''} options={['Good', 'Moderate', 'Poor']} onChange={field.onChange} />} />
        
        <Controller control={control} name="soilTestStatus" render={({field}) => <SelectField label={t("Soil Test Done?")} placeholder={t("Select")} value={field.value ?? ''} options={['Yes', 'No']} onChange={(val) => { field.onChange(val); if (val === 'No') setValue('soilTestDate', ''); }} />} />
        
        {watch('soilTestStatus') === 'Yes' && (
          <Controller 
            control={control} 
            name="soilTestDate" 
            render={({field}) => (
              <DatePickerField 
                label={t("Soil Test Date")} 
                placeholder="DD-MM-YYYY" 
                value={field.value ?? ''} 
                onChange={field.onChange} 
                maximumDate={new Date()} // 🚀 FIX: Blocks future dates natively
              />
            )} 
          />
        )}
      </View>

      <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.sm }}>{t("Multi-Season Yield History")}</Text>

      {yieldHistory.map((season, index) => (
        <View key={index} style={{ backgroundColor: '#F8FAFC', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
            <Text style={{ fontWeight: '700', color: colors.text }}>{t("Season")} {index + 1}</Text>
            {index > 0 && (
              <Pressable hitSlop={10} onPress={() => setValue('yieldHistory', yieldHistory.filter((_, i) => i !== index), { shouldValidate: true })}>
                <MaterialIcons name="close" size={20} color={colors.danger} />
              </Pressable>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
             <View style={{ flex: 1 }}>
               <Controller control={control} name={`yieldHistory.${index}.year`} render={({field}) => <YearPickerField label={t("Year")} placeholder={t("Select")} value={field.value ?? ''} onChange={field.onChange} />} />
             </View>
             <View style={{ flex: 1 }}>
               <Controller control={control} name={`yieldHistory.${index}.season`} render={({field}) => <SelectField label={t("Season")} placeholder={t("Select")} value={field.value ?? ''} options={['Monsoon', 'Winter', 'Summer']} onChange={field.onChange} />} />
             </View>
          </View>
          
          <Controller control={control} name={`yieldHistory.${index}.cropGrown`} render={({field}) => <SelectField label={t("Crop Grown")} placeholder={t("Select Crop")} value={field.value ?? ''} options={WEST_INDIA_CROPS} searchable onChange={field.onChange} />} />
          
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 2 }}><Controller control={control} name={`yieldHistory.${index}.area`} render={({field}) => <Input label={t("Area")} placeholder="e.g. 5" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} /></View>
            <View style={{ flex: 1 }}><Controller control={control} name={`yieldHistory.${index}.areaUnit`} render={({field}) => <SelectField label={t("Unit")} value={field.value ?? ''} options={['Acres', 'Bigha']} onChange={field.onChange} />} /></View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Controller control={control} name={`yieldHistory.${index}.inputCost`} render={({field}) => <Input label={t("Input Cost")} placeholder="e.g. 15000" suffix="₹/Acre" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} /></View>
            <View style={{ flex: 1 }}><Controller control={control} name={`yieldHistory.${index}.yieldQtl`} render={({field}) => <Input label={t("Yield")} placeholder="e.g. 12" suffix="Qtl/Acre" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} /></View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Controller control={control} name={`yieldHistory.${index}.priceQtl`} render={({field}) => <Input label={t("Price")} placeholder="e.g. 6500" suffix="₹/Qtl" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} /></View>
            <View style={{ flex: 1 }}><Controller control={control} name={`yieldHistory.${index}.total20kg`} render={({field}) => <Input label={t("Total Bulk")} placeholder="e.g. 100" suffix="20kg Inc." keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} /></View>
          </View>
        </View>
      ))}

      <Pressable onPress={() => setValue('yieldHistory', [...yieldHistory, { year: '', season: '', cropGrown: '', area: '', areaUnit: 'Acres', inputCost: '', total20kg: '', yieldQtl: '', priceQtl: '' }])} style={{ padding: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md, alignItems: 'center' }}>
        <Text style={{ color: colors.primary, fontWeight: '800' }}>+ {t("Add Another Season")}</Text>
      </Pressable>
    </View>
  );
};