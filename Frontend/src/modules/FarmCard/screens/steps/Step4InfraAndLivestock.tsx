// src/modules/FarmCard/screens/steps/Step4InfraAndLivestock.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, SelectField, MultiSelectField, RadioGroup } from '../../../../design-system/components';
import { spacing, colors, radius, shadows } from '../../../../design-system/tokens';
import { FarmCardValues } from '../../schema';

interface Props { form: UseFormReturn<FarmCardValues>; t: any; }

export const Step4InfraAndLivestock = ({ form, t }: Props) => {
  const { control, watch, setValue } = form;

  const DECISION_FACTORS = ["Retailer Recommendation", "Cost/Credit Extension", "Peer Results"];
  const SALES_CHANNELS = ["Local APMC Mandi", "Village Trader / Middleman", "Direct Food Processor"];
  const TRANSPORT_METHODS = ["Own Tractor", "Hired Commercial Vehicle", "On-Farm Pickup"];
  const PAYMENT_CYCLES = ["Instant Cash", "7–14 Days Credit", "30+ Days Delayed"];
  const TRACTOR_OPTIONS = ["Own Tractor", "Hired/Custom Hiring Center", "No Tractor Use"];
  const SOWING_EQUIPMENT = ["Mechanical Seed Drill", "Bull Drawn Sowing Plough"];
  const SPRAY_EQUIPMENT = ["Manual Backpack Sprayer", "Battery-Operated Knapsack", "Tractor-Mounted Boom Sprayer"];
  const TILLAGE_MACHINERY = ["Rotavator", "Cultivator", "Disc Harrow"];
  const FYM_HANDLING = ["Open pit dumping", "Covered composting", "Directly broadcasted raw"];
  const RESIDUE_MGMT = ["Burnt in Field", "Incorporated via Tillage", "Fed to Livestock"];

  const preferredChemFert = watch('preferredChemFert') || [''];
  const preferredChemCrop = watch('preferredChemCrop') || ['']; // 🚀 Added Dynamic Watcher
  const currentBioBrands = watch('currentBioBrands') || [''];

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("Infra, Livestock & Risks")}</Text>

      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, ...shadows.soft }}>
        <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.md }}>{t("Input & Market Profile")}</Text>
        
        <View style={{ marginBottom: spacing.md }}>
          <Text style={{ fontWeight: '700', fontSize: 13, marginBottom: spacing.sm, color: colors.text }}>{t("Preferred Chemical Fertilizer Brands")}</Text>
          {preferredChemFert.map((brand, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
               <View style={{ flex: 1 }}>
                 <Controller control={control} name={`preferredChemFert.${i}`} render={({field}) => (
                   <Input label={i === 0 ? t("Brand Name") : `${t("Brand Name")} ${i + 1}`} placeholder={t("e.g. IFFCO")} value={field.value} onChangeText={field.onChange} />
                 )} />
               </View>
               {preferredChemFert.length > 1 && (
                 <Pressable hitSlop={10} onPress={() => setValue('preferredChemFert', preferredChemFert.filter((_, idx) => idx !== i))}>
                   <MaterialIcons name="close" size={24} color={colors.danger} />
                 </Pressable>
               )}
            </View>
          ))}
          <Pressable onPress={() => setValue('preferredChemFert', [...preferredChemFert, ''])} style={{ padding: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md, alignItems: 'center', marginTop: 4 }}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>+ {t("Add Another Brand")}</Text>
          </Pressable>
        </View>

        {/* 🚀 Dynamic Array for Crop Protection Brands */}
        <View style={{ marginBottom: spacing.md }}>
          <Text style={{ fontWeight: '700', fontSize: 13, marginBottom: spacing.sm, color: colors.text }}>{t("Preferred Chemical Crop Protection Brands")}</Text>
          {preferredChemCrop.map((brand, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
               <View style={{ flex: 1 }}>
                 <Controller control={control} name={`preferredChemCrop.${i}`} render={({field}) => (
                   <Input label={i === 0 ? t("Brand Name") : `${t("Brand Name")} ${i + 1}`} placeholder={t("e.g. Syngenta")} value={field.value} onChangeText={field.onChange} />
                 )} />
               </View>
               {preferredChemCrop.length > 1 && (
                 <Pressable hitSlop={10} onPress={() => setValue('preferredChemCrop', preferredChemCrop.filter((_, idx) => idx !== i))}>
                   <MaterialIcons name="close" size={24} color={colors.danger} />
                 </Pressable>
               )}
            </View>
          ))}
          <Pressable onPress={() => setValue('preferredChemCrop', [...preferredChemCrop, ''])} style={{ padding: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md, alignItems: 'center', marginTop: 4 }}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>+ {t("Add Another Brand")}</Text>
          </Pressable>
        </View>

        {/* 🚀 Dynamic Array for Biological / Organic Brands */}
        <View style={{ marginBottom: spacing.md }}>
          <Text style={{ fontWeight: '700', fontSize: 13, marginBottom: spacing.sm, color: colors.text }}>{t("Current Biological / Organic Brands Used")}</Text>
          {currentBioBrands.map((brand, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
               <View style={{ flex: 1 }}>
                 <Controller control={control} name={`currentBioBrands.${i}`} render={({field}) => (
                   <Input label={i === 0 ? t("Brand Name") : `${t("Brand Name")} ${i + 1}`} placeholder={t("e.g. GLS")} value={field.value} onChangeText={field.onChange} />
                 )} />
               </View>
               {currentBioBrands.length > 1 && (
                 <Pressable hitSlop={10} onPress={() => setValue('currentBioBrands', currentBioBrands.filter((_, idx) => idx !== i))}>
                   <MaterialIcons name="close" size={24} color={colors.danger} />
                 </Pressable>
               )}
            </View>
          ))}
          <Pressable onPress={() => setValue('currentBioBrands', [...currentBioBrands, ''])} style={{ padding: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md, alignItems: 'center', marginTop: 4 }}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>+ {t("Add Another Brand")}</Text>
          </Pressable>
        </View>
        <Controller control={control} name="decisionFactor" render={({field}) => <SelectField label={t("Decision-Making Factor")} placeholder={t("Select Factor")} value={field.value ?? ''} options={DECISION_FACTORS} onChange={field.onChange} />} />
        
        <Controller control={control} name="primarySalesChannel" render={({field}) => <MultiSelectField label={t("Primary Sales Channel")} placeholder={t("Select Channel")} value={Array.isArray(field.value) ? field.value : []} options={SALES_CHANNELS} onChange={field.onChange} />} />
        <Controller control={control} name="distanceToMarket" render={({field}) => <Input label={t("Distance to Primary Market")} placeholder="e.g. 15" suffix="KM" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} />
        <Controller control={control} name="transportMethod" render={({field}) => <MultiSelectField label={t("Transport Method Available")} placeholder={t("Select Methods")} value={Array.isArray(field.value) ? field.value : []} options={TRANSPORT_METHODS} onChange={field.onChange} />} />
        <Controller control={control} name="paymentCycle" render={({field}) => <MultiSelectField label={t("Payment Cycle Norms")} placeholder={t("Select Cycle")} value={Array.isArray(field.value) ? field.value : []} options={PAYMENT_CYCLES} onChange={field.onChange} />} />
      </View>

      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, ...shadows.soft }}>
        <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.md }}>{t("Mechanization Inventory")}</Text>
        <Controller control={control} name="tractorOwnership" render={({field}) => <MultiSelectField label={t("Tractor Ownership")} placeholder={t("Select Option")} value={Array.isArray(field.value) ? field.value : []} options={TRACTOR_OPTIONS} onChange={field.onChange} />} />
        <Controller control={control} name="sowingEquipment" render={({field}) => <MultiSelectField label={t("Sowing Equipment")} placeholder={t("Select Option")} value={Array.isArray(field.value) ? field.value : []} options={SOWING_EQUIPMENT} onChange={field.onChange} />} />
        <Controller control={control} name="sprayEquipment" render={({field}) => <MultiSelectField label={t("Spray Equipment")} placeholder={t("Select Option")} value={Array.isArray(field.value) ? field.value : []} options={SPRAY_EQUIPMENT} onChange={field.onChange} />} />
        <Controller control={control} name="tillageMachinery" render={({field}) => <MultiSelectField label={t("Tillage Machinery")} placeholder={t("Select Option")} value={Array.isArray(field.value) ? field.value : []} options={TILLAGE_MACHINERY} onChange={field.onChange} />} />
      </View>

      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, ...shadows.soft }}>
        <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.md }}>{t("Livestock & Waste Profile")}</Text>
        
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><Controller control={control} name="milchCows" render={({field}) => <Input label={t("Milch Cows (Desi/Cross)")} placeholder="e.g. 2" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} /></View>
          <View style={{ flex: 1 }}><Controller control={control} name="buffaloes" render={({field}) => <Input label={t("Buffaloes")} placeholder="e.g. 5" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><Controller control={control} name="draftAnimals" render={({field}) => <Input label={t("Draft Animals (Bullocks)")} placeholder="e.g. 2" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} /></View>
          <View style={{ flex: 1 }}><Controller control={control} name="goatsSheepPoultry" render={({field}) => <Input label={t("Goats / Sheeps / Poultry")} placeholder="e.g. 15" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} /></View>
        </View>

        <Controller control={control} name="fymGenerated" render={({field}) => <Input label={t("Avg Raw FYM Generated")} placeholder="e.g. 10" suffix="Tons/Year" keyboardType="numeric" value={field.value} onChangeText={field.onChange} />} />
        <Controller control={control} name="fymHandlingMethod" render={({field}) => <SelectField label={t("Current FYM Handling Method")} placeholder={t("Select Method")} value={field.value ?? ''} options={FYM_HANDLING} onChange={field.onChange} />} />
        <Controller control={control} name="cropResidueManagement" render={({field}) => <SelectField label={t("Crop Residue Management")} placeholder={t("Select Management")} value={field.value ?? ''} options={RESIDUE_MGMT} onChange={field.onChange} />} />
        <Controller control={control} name="compostEnrichmentWillingness" render={({field}) => <RadioGroup label={t("Compost Enrichment Potential")} options={['Yes', 'No']} value={field.value} onChange={field.onChange} />} />
      </View>

      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, ...shadows.soft }}>
        <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.md }}>{t("Neighborhood Risk Boundaries")}</Text>
        
        <Controller control={control} name="waterBorneRunoffRisk" render={({field}) => <SelectField label={t("Risk of Water-Borne Runoff")} placeholder={t("Select Risk")} value={field.value ?? ''} options={['High Risk (Plot sits downhill)', 'Safe / Flat']} onChange={field.onChange} />} />
        <Controller control={control} name="airborneSprayDriftRisk" render={({field}) => <SelectField label={t("Risk of Airborne Spray Drift")} placeholder={t("Select Risk")} value={field.value ?? ''} options={['High Risk (Open border upwind)', 'Low Risk']} onChange={field.onChange} />} />
        
        <Controller control={control} name="edgePlantationPresent" render={({field}) => <RadioGroup label={t("Edge Plantation / Windbreaks Present?")} options={['Yes', 'No']} value={field.value} onChange={field.onChange} />} />
        
        {watch('edgePlantationPresent') === 'Yes' && (
          <Controller control={control} name="biologicalCropBarrier" render={({field}) => <SelectField label={t("Specify crop barrier")} placeholder={t("Select Crop")} value={field.value ?? ''} options={['Sorghum', 'Maize', 'Other']} onChange={field.onChange} />} />
        )}

        <Controller control={control} name="dominantPestVector" render={({field}) => <SelectField label={t("Dominant Neighbor Pest Vector")} placeholder={t("Select Vector")} value={field.value ?? ''} options={['White Grub Runoff', 'Sucking Pest Drift']} onChange={field.onChange} />} />
      </View>
    </View>
  );
};