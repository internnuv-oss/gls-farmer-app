// src/modules/FarmCard/screens/steps/Step2LandAndWater.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { Input, SelectField, MultiSelectField } from '../../../../design-system/components';
import { spacing, colors, radius } from '../../../../design-system/tokens';
import { FarmCardValues } from '../../schema';

interface Props { form: UseFormReturn<FarmCardValues>; t: any; }

export const Step2LandAndWater = ({ form, t }: Props) => {
  const { control, watch, formState: { errors } } = form; 
  const UNIT_OPTIONS = ['Acres', 'Bigha'];

  const totalArea = parseFloat(watch('totalLandArea') || '0');
  const cultArea = parseFloat(watch('cultivatedArea') || '0');
  const totalUnit = watch('totalLandAreaUnit');
  const cultUnit = watch('cultivatedAreaUnit');

  const isCultAreaExceeding = !isNaN(totalArea) && !isNaN(cultArea) && cultArea > totalArea && totalUnit === cultUnit;

  const selectedWaterSources = watch('waterSource') || [];

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("Land & Water Profile")}</Text>

      <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.sm }}>{t("Core Land & Plot Inventory")}</Text>
      
      <Controller control={control} name="legalOwnerName" render={({field}) => <Input label={t("Legal Owner Name")} placeholder={t("e.g. Ramesh Patel")} value={field.value} onChangeText={field.onChange} />} />
      
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Controller control={control} name="fieldNumber" render={({field}) => <Input label={t("Field #")} placeholder={t("e.g. F-101")} value={field.value} onChangeText={field.onChange} />} /></View>
        <View style={{ flex: 1 }}><Controller control={control} name="plotNumber" render={({field}) => <Input label={t("Plots")} placeholder={t("e.g. P-05")} value={field.value} onChangeText={field.onChange} />} /></View>
      </View>

      <Controller control={control} name="surveyNo" render={({field}) => <Input label={t("Survey / Khasra / Khata No.")} placeholder={t("e.g. 152/A")} value={field.value} onChangeText={field.onChange} />} />
      <Controller control={control} name="landStatus" render={({field}) => <SelectField label={t("Land Status")} placeholder={t("Select Status")} value={field.value ?? ''} options={['Irrigated', 'Rainfed']} onChange={field.onChange} />} />
      
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 2 }}><Controller control={control} name="totalLandArea" render={({field}) => <Input label={t("Total Area")} placeholder="e.g. 10" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} /></View>
        <View style={{ flex: 1 }}><Controller control={control} name="totalLandAreaUnit" render={({field}) => <SelectField label={t("Unit")} value={field.value ?? ''} options={UNIT_OPTIONS} onChange={field.onChange} />} /></View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 2 }}>
          <Controller control={control} name="cultivatedArea" render={({field}) => (
            <Input 
              label={t("Cultivated Area")} 
              placeholder="e.g. 8" 
              keyboardType="numeric" 
              value={field.value} 
              onChangeText={field.onChange} 
              error={isCultAreaExceeding ? t("Exceeds Total Area") : (errors.cultivatedArea?.message as string)} 
            />
          )} />
        </View>
        <View style={{ flex: 1 }}><Controller control={control} name="cultivatedAreaUnit" render={({field}) => <SelectField label={t("Unit")} value={field.value ?? ''} options={UNIT_OPTIONS} onChange={field.onChange} />} /></View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.md }}>
        <View style={{ flex: 2 }}><Controller control={control} name="fsppCommittedArea" render={({field}) => <Input label={t("FSPP Committed Area")} placeholder="e.g. 5" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} /></View>
        <View style={{ flex: 1 }}><Controller control={control} name="fsppCommittedAreaUnit" render={({field}) => <SelectField label={t("Unit")} value={field.value ?? ''} options={UNIT_OPTIONS} onChange={field.onChange} />} /></View>
      </View>

      <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.sm, marginTop: spacing.md }}>{t("Water Asset Configuration")}</Text>
      
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Controller control={control} name="waterSource" render={({field}) => (
            <MultiSelectField 
              label={t("Water Source")} 
              placeholder={t("Select")} 
              value={Array.isArray(field.value) ? field.value : []} 
              options={['Borewell', 'Canal', 'Rain', 'Tank', 'River']} 
              onChange={field.onChange} 
            />
          )} />
        </View>
        <View style={{ flex: 1 }}>
          <Controller control={control} name="irrigationMethod" render={({field}) => (
            <MultiSelectField 
              label={t("Irrigation Method")} 
              placeholder={t("Select")} 
              value={Array.isArray(field.value) ? field.value : []} 
              options={['Drip', 'Sprinkler', 'Flood', 'Furrow']} 
              onChange={field.onChange} 
            />
          )} />
        </View>
      </View>

      {Array.isArray(selectedWaterSources) && selectedWaterSources.length > 0 && (
        <View style={{ marginVertical: spacing.sm, padding: spacing.sm, backgroundColor: '#f3f4f6', borderRadius: radius.md }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textMuted, marginBottom: spacing.sm }}>
            {t("WATER QUALITY (PER SOURCE)")}
          </Text>
          
          {selectedWaterSources.map((source) => (
            <View key={source} style={{ marginBottom: spacing.xs }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: 4 }}>{source}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Controller control={control} name={`waterTds.${source}`} render={({field}) => (
                    <Input label="TDS" placeholder="e.g. 500" suffix="ppm" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />
                  )} />
                </View>
                <View style={{ flex: 1 }}>
                  <Controller control={control} name={`waterPh.${source}`} render={({field}) => (
                    <Input label="pH" placeholder="e.g. 7.0" suffix="pH" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />
                  )} />
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.sm }}>
        <View style={{ flex: 1 }}><Controller control={control} name="waterAvailability" render={({field}) => <SelectField label={t("Water Availability")} placeholder={t("Select Avail.")} value={field.value ?? ''} options={['Sufficient', 'Moderate', 'Scarce']} onChange={field.onChange} />} /></View>
        <View style={{ flex: 1 }}><Controller control={control} name="irrigationFrequency" render={({field}) => <SelectField label={t("Irrigation Freq.")} placeholder={t("Select Freq.")} value={field.value ?? ''} options={['Daily', 'Alternate', 'Weekly']} onChange={field.onChange} />} /></View>
      </View>

      <Controller control={control} name="pumpHp" render={({field}) => <Input label={t("Pump HP / Motor Type")} placeholder="e.g. 5" suffix="HP" value={field.value} onChangeText={field.onChange} />} />
      
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 2 }}><Controller control={control} name="dripArea" render={({field}) => <Input label={t("Drip/Sprinkler Area")} placeholder="e.g. 2" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} /></View>
        <View style={{ flex: 1 }}><Controller control={control} name="dripAreaUnit" render={({field}) => <SelectField label={t("Unit")} value={field.value ?? ''} options={UNIT_OPTIONS} onChange={field.onChange} />} /></View>
      </View>
      
    </View>
  );
};