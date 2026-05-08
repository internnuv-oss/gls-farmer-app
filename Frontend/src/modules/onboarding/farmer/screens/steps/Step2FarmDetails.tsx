import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Controller } from 'react-hook-form';
import { Input, MultiSelectField, SelectField } from '../../../../../design-system/components';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../../../../design-system/tokens';

const WEST_INDIA_CROPS = ["Cotton", "Groundnut", "Sugarcane", "Wheat", "Bajra", "Maize", "Castor", "Soybean"];
const SOIL_TYPES = ["Black", "Sandy", "Red", "Loamy", "Others"];
const WATER_SOURCES = ["Canal", "Borewell", "Rain", "Tube-well" ,"Well", "Tank", "Pond","River","Others"];

const IRRIGATION_TYPES = ["Drip", "Sprinkler", "Flood", "Micro-sprinkler", "Rain-fed Only", "Others"];
const TREE_TYPES = ["Mango", "Neem", "Teak", "Coconut", "Lemon", "Papaya", "Others"];
const CATTLE_TYPES = ["Cow", "Buffalo", "Ox / Bull", "Goat / Sheep", "Poultry", "Others"];
const LAND_UNITS = ["Acres", "Bigha"];

// 🚀 NEW CONSTANTS
const FARM_EQUIPMENTS = ["Mini Tractor", "Tractor", "Cultivation Equipments", "Others"];
const BIOFERTILIZER_OPTS = ["Don't Know", "He knows", "Using"];

export const Step2FarmDetails = ({ control, errors, t, watch }: any) => {
  const selectedSoilType = watch('soilType') || [];
  const selectedWaterSource = watch('waterSource') || [];
  const selectedEquipments = watch('farmEquipments') || [];
  const landUnit = watch('landUnit') || 'Acres';

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("Farm Details")}</Text>

      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
        <View style={{ flex: 2 }}>
          <Controller control={control} name="totalLand" render={({field}) => (
            <Input label={t("Total Land Holding *")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" error={errors.totalLand?.message} />
          )} />
        </View>
        <View style={{ flex: 1 }}>
          <Controller control={control} name="landUnit" render={({field}) => (
            <SelectField label={t("Unit")} options={LAND_UNITS} value={field.value || 'Acres'} onChange={field.onChange} />
          )} />
        </View>
      </View>
      
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
        <View style={{ flex: 2 }}>
          <Controller control={control} name="irrigatedLand" render={({field}) => (
            <Input label={t("Irrigated Land ")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" />
          )} />
        </View>
        <View style={{ flex: 1 }}>
          <Controller control={control} name="landUnit" render={({field}) => (
            <SelectField label={t("Unit")} options={LAND_UNITS} value={field.value || 'Acres'} onChange={field.onChange} />
          )} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
        <View style={{ flex: 2 }}>
          <Controller control={control} name="rainFedLand" render={({field}) => (
            <Input label={t("Rain-fed Land ")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" />
          )} />
        </View>
        <View style={{ flex: 1 }}>
          <Controller control={control} name="landUnit" render={({field}) => (
            <SelectField label={t("Unit")} options={LAND_UNITS} value={field.value || 'Acres'} onChange={field.onChange} />
          )} />
        </View>
      </View>
      
      <Controller control={control} name="majorCrops" render={({field}) => <MultiSelectField label={t("Major Crops (This Season) *")} options={WEST_INDIA_CROPS} value={field.value} onChange={field.onChange} searchable error={errors.majorCrops?.message} />} />
      <Controller control={control} name="soilType" render={({field}) => <MultiSelectField label={t("Soil Type *")} options={SOIL_TYPES} value={field.value} onChange={field.onChange} error={errors.soilType?.message} />} />
      
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

      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

      {/* 🚀 Changed to MultiSelectField */}
      <Controller control={control} name="irrigationType" render={({field}) => (
        <MultiSelectField label={t("Irrigation Types ")} options={IRRIGATION_TYPES} value={field.value} onChange={field.onChange} />
      )} />

      {/* 🚀 Added MultiSelect for Farm Equipments */}
      <Controller control={control} name="farmEquipments" render={({field}) => (
        <MultiSelectField label={t("Farm Equipments ")} options={FARM_EQUIPMENTS} value={field.value} onChange={field.onChange} />
      )} />

      {/* Conditional input if 'Others' is selected in Farm Equipments */}
      {selectedEquipments.includes('Others') && (
        <Controller control={control} name="otherFarmEquipment" render={({field}) => (
          <Input label={t("Specify Other Equipment *")} value={field.value} onChangeText={field.onChange} error={errors.otherFarmEquipment?.message} />
        )} />
      )}

      {/* 🚀 Added Biofertilizer Select */}
      <Controller control={control} name="biofertilizer" render={({field}) => (
        <SelectField label={t("Biological Products Knowledge ")} options={BIOFERTILIZER_OPTS} value={field.value} onChange={field.onChange} />
      )} />

      <View style={{ marginBottom: spacing.lg }}>
        <Text style={{ color: colors.textMuted, fontWeight: '700', marginBottom: 8, fontSize: 13 }}>{t("Are you doing intercropping? ")}</Text>
        <Controller control={control} name="isIntercropping" render={({field}) => (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {['Yes', 'No'].map(opt => (
              <Pressable
                key={opt}
                onPress={() => field.onChange(opt)}
                style={{ flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: field.value === opt ? colors.primary : colors.border, backgroundColor: field.value === opt ? colors.primarySoft : colors.surface, borderRadius: radius.md, alignItems: 'center' }}
              >
                <Text style={{ color: field.value === opt ? colors.primary : colors.text, fontWeight: '700' }}>{t(opt)}</Text>
              </Pressable>
            ))}
          </View>
        )} />
      </View>

      <View style={{ height: 1, backgroundColor: colors.border, marginBottom: spacing.md }} />

      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary, marginBottom: spacing.sm }}>{t("Side Trees ")}</Text>
      <Controller control={control} name="sideTrees" render={({ field }) => {
        const trees = field.value?.length > 0 ? field.value : [{ type: '', quantity: '' }];
        return (
          <View style={{ marginBottom: spacing.lg }}>
            {trees.map((tree: any, index: number) => (
              <View key={index} style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, alignItems: 'center' }}>
                <View style={{ flex: 2 }}>
                   <SelectField label={t("Tree Type")} options={TREE_TYPES} value={tree.type} onChange={(val: string) => {
                       const newTrees = [...trees];
                       newTrees[index].type = val;
                       field.onChange(newTrees);
                     }}
                   />
                </View>
                <View style={{ flex: 1 }}>
                   <Input label={t("Qty")} keyboardType="numeric" value={tree.quantity} onChangeText={(val: string) => {
                       const newTrees = [...trees];
                       newTrees[index].quantity = val;
                       field.onChange(newTrees);
                     }}
                   />
                </View>
                <Pressable 
                  onPress={() => {
                    const filtered = trees.filter((_: any, i: number) => i !== index);
                    field.onChange(filtered.length > 0 ? filtered : [{ type: '', quantity: '' }]);
                  }} 
                  style={{ padding: 8, backgroundColor: '#FEE2E2', borderRadius: radius.md, height: 48, justifyContent: 'center', marginTop: 24 }}
                >
                  <MaterialIcons name="delete" size={20} color="#991B1B" />
                </Pressable>
              </View>
            ))}
            <Pressable onPress={() => field.onChange([...trees, { type: '', quantity: '' }])} style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.sm, backgroundColor: '#F1F5F9', borderRadius: radius.md, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#E2E8F0' }}>
              <MaterialIcons name="add" size={18} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{t("Add Tree")}</Text>
            </Pressable>
          </View>
        );
      }} />

      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary, marginBottom: spacing.sm }}>{t("Cattles / Livestock ")}</Text>
      <Controller control={control} name="cattles" render={({ field }) => {
        const cattleList = field.value?.length > 0 ? field.value : [{ type: '', quantity: '' }];
        return (
          <View style={{ marginBottom: spacing.lg }}>
            {cattleList.map((cattle: any, index: number) => (
              <View key={index} style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, alignItems: 'center' }}>
                <View style={{ flex: 2 }}>
                   <SelectField label={t("Livestock")} options={CATTLE_TYPES} value={cattle.type} onChange={(val: string) => {
                       const newList = [...cattleList];
                       newList[index].type = val;
                       field.onChange(newList);
                     }}
                   />
                </View>
                <View style={{ flex: 1 }}>
                   <Input label={t("Qty")} keyboardType="numeric" value={cattle.quantity} onChangeText={(val: string) => {
                       const newList = [...cattleList];
                       newList[index].quantity = val;
                       field.onChange(newList);
                     }}
                   />
                </View>
                <Pressable 
                  onPress={() => {
                    const filtered = cattleList.filter((_: any, i: number) => i !== index);
                    field.onChange(filtered.length > 0 ? filtered : [{ type: '', quantity: '' }]);
                  }} 
                  style={{ padding: 8, backgroundColor: '#FEE2E2', borderRadius: radius.md, height: 48, justifyContent: 'center', marginTop: 24 }} 
                >
                  <MaterialIcons name="delete" size={20} color="#991B1B" />
                </Pressable>
              </View>
            ))}
            <Pressable onPress={() => field.onChange([...cattleList, { type: '', quantity: '' }])} style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.sm, backgroundColor: '#F1F5F9', borderRadius: radius.md, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#E2E8F0' }}>
              <MaterialIcons name="add" size={18} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{t("Add Cattle")}</Text>
            </Pressable>
          </View>
        );
      }} />

    </View>
  );
};