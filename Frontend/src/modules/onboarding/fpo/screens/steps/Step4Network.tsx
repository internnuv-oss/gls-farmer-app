// Frontend/src/modules/onboarding/fpo/screens/steps/Step4Network.tsx

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, SelectField } from '../../../../../design-system/components';
import { colors, radius, spacing, shadows } from '../../../../../design-system/tokens';
import { FPOOnboardingValues } from '../../schema';

interface Props { form: UseFormReturn<FPOOnboardingValues>; t: any; }

const CROP_OPTIONS = [
  'Castor', 'Cotton', 'Fruits', 'Groundnut', 'Maize', 
  'Millets', 'Mustard', 'Paddy/Rice', 'Pulses', 'Soyabean', 
  'Spices', 'Sugarcane', 'Vegetables', 'Wheat', 'Others'
];

const TIMELINE_OPTIONS = [
  'January - February', 'February - March', 'March - April',
  'April - May', 'May - June', 'June - July',
  'July - August', 'August - September', 'September - October',
  'October - November', 'November - December', 'December - January'
];

export const Step4Network = ({ form, t }: Props) => {
  const { control, watch, setValue } = form;
  const majorCrops = watch('majorCrops') || [{ name: '', acreage: '' }];

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("Special FPO Annexures")}</Text>

      {/* --- ANNEXURE A --- */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, ...shadows.soft }}>
        <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.md }}>{t("Annexure A: Member Base & Crop Profile")}</Text>

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs }}>
          <View style={{ flex: 1 }}>
            <Controller 
              control={control} 
              name="totalMembers" 
              render={({field}) => (
                <Input label={t("Total Members *")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" placeholder="e.g. 500" error={form.formState.errors.totalMembers?.message}/>
              )} 
            />
          </View>
          <View style={{ flex: 1 }}>
            <Controller 
              control={control} 
              name="activeMembers" 
              render={({field}) => (
                <Input label={t("Active Members *")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" placeholder="e.g. 350" error={form.formState.errors.activeMembers?.message}/>
              )} 
            />
          </View>
        </View>

        <View style={{ backgroundColor: '#F8FAFC', padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: spacing.md }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm }}>{t("Major Crops Grown *")}</Text>
          {majorCrops.map((crop: any, index: number) => (
            <View key={index} style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, alignItems: 'center' }}>
              
              <View style={{ flex: 2 }}>
                <Controller 
                  control={control} 
                  name={`majorCrops.${index}.name`} 
                  render={({field}) => (
                    <SelectField 
                      label={index === 0 ? t("Crop Name") : ""} 
                      value={field.value ?? ''} 
                      options={CROP_OPTIONS}
                      searchable
                      placeholder={t("Select Crop")}
                      onChange={field.onChange} 
                      error={form.formState.errors.majorCrops?.[index]?.name?.message} 
                    />
                  )} 
                />
              </View>
              
              <View style={{ flex: 1 }}>
                <Controller 
                  control={control} 
                  name={`majorCrops.${index}.acreage`} 
                  render={({field}) => (
                    <Input 
                      label={index === 0 ? t("Acreage") : ""} 
                      placeholder={t("e.g. 50")} 
                      value={field.value} 
                      onChangeText={field.onChange} 
                      keyboardType="numeric" 
                      error={form.formState.errors.majorCrops?.[index]?.acreage?.message} 
                    />
                  )} 
                />
              </View>
              {index > 0 && (
                <Pressable onPress={() => setValue('majorCrops', majorCrops.filter((_: any, i: number) => i !== index))} style={{ padding: spacing.sm, marginTop: index === 0 ? 20 : -10 }}>
                  <MaterialIcons name="remove-circle" size={24} color={colors.danger} />
                </Pressable>
              )}
            </View>
          ))}
          <Pressable onPress={() => setValue('majorCrops', [...majorCrops, { name: '', acreage: '' }])} style={{ alignSelf: 'flex-start' }}>
            <Text style={{ color: colors.primary, fontWeight: '700', marginTop: 4 }}>+ {t("Add Another Crop")}</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Controller 
              control={control} 
              name="kharifDemand" 
              render={({field}) => (
                <SelectField 
                  label={t("Kharif Demand")} 
                  value={field.value ?? ''} 
                  options={TIMELINE_OPTIONS} 
                  onChange={field.onChange} 
                  placeholder={t("Timeline")} 
                />
              )} 
            />
          </View>
          <View style={{ flex: 1 }}>
            <Controller 
              control={control} 
              name="rabiDemand" 
              render={({field}) => (
                <SelectField 
                  label={t("Rabi Demand")} 
                  value={field.value ?? ''} 
                  options={TIMELINE_OPTIONS} 
                  onChange={field.onChange} 
                  placeholder={t("Timeline")} 
                />
              )} 
            />
          </View>
        </View>
      </View>

      {/* --- ANNEXURE B --- */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, ...shadows.soft }}>
        <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.md }}>{t("Annexure B: Infrastructure & Storage Capability")}</Text>
        <Controller 
          control={control} 
          name="warehouseSpace" 
          render={({field}) => (
            <Input label={t("Total Covered Warehouse Space (sq. ft.)")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" placeholder="e.g. 2000" />
          )} 
        />
        <Controller 
          control={control} 
          name="storageConditions" 
          render={({field}) => (
            <SelectField label={t("Storage Conditions")} value={field.value ?? ''} options={['Pucca Godown', 'Kaccha Godown', 'Temperature-controlled storage']} onChange={field.onChange} />
          )} 
        />
        <Controller 
          control={control} 
          name="customMachinery" 
          render={({field}) => (
            <Input label={t("Custom Hiring Machinery Owned (if any)")} value={field.value} onChangeText={field.onChange} placeholder={t("e.g. 2 Tractors, 1 Harvester")} />
          )} 
        />
      </View>
    </View>
  );
};