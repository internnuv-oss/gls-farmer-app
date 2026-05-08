import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Controller } from 'react-hook-form';
import { Input, SelectField } from '../../../../../design-system/components';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, shadows } from '../../../../../design-system/tokens';

const PAST_CROPS = ["Cotton", "Groundnut", "Sugarcane", "Wheat", "Bajra", "Maize", "Castor", "Soybean", "Others"];
const LAND_UNITS = ["Acres", "Bigha"];

// 🚀 NEW CONSTANTS
const YIELD_UNITS = ["Quintals", "Tonnes", "Kg"];
const INPUTS_USED = ["DAP", "Urea", "NPK", "SSP", "MOP", "Compost", "Others"];

export const Step3History = ({ control, t, dealers }: any) => {
  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("History of Cultivation")}</Text>
      
      <Controller control={control} name="pastCrops" render={({ field }) => {
        const crops = field.value?.length > 0 ? field.value : [{ cropName: '', area: '', areaUnit: 'Acres', inputUsed: '', otherInputUsed: '', yield: '', yieldUnit: 'Quintals', problemsFaced: '' }];
        
        return (
          <View style={{ marginBottom: spacing.lg }}>
            {crops.map((crop: any, index: number) => (
              <View key={index} style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{t("Crop")} {index + 1}</Text>
                  <Pressable 
                    onPress={() => {
                      const filtered = crops.filter((_: any, i: number) => i !== index);
                      field.onChange(filtered.length > 0 ? filtered : [{ cropName: '', area: '', areaUnit: 'Acres', inputUsed: '', otherInputUsed: '', yield: '', yieldUnit: 'Quintals', problemsFaced: '' }]);
                    }} 
                    style={{ padding: 4 }}
                  >
                    <MaterialIcons name="delete" size={20} color={colors.danger} />
                  </Pressable>
                </View>

                <SelectField label={t("Crop Name")} options={PAST_CROPS} value={crop.cropName} onChange={(val: string) => { const newArr = [...crops]; newArr[index].cropName = val; field.onChange(newArr); }} />
                
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 2 }}>
                    <Input label={t("Area")} keyboardType="numeric" value={crop.area} onChangeText={(val: string) => { const newArr = [...crops]; newArr[index].area = val; field.onChange(newArr); }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <SelectField label={t("Unit")} options={LAND_UNITS} value={crop.areaUnit || 'Acres'} onChange={(val: string) => { const newArr = [...crops]; newArr[index].areaUnit = val; field.onChange(newArr); }} />
                  </View>
                </View>

                {/* 🚀 NEW: Input Dropdown + Conditional Others Input */}
                <SelectField label={t("Input Used (Optional)")} options={INPUTS_USED} value={crop.inputUsed} onChange={(val: string) => { const newArr = [...crops]; newArr[index].inputUsed = val; field.onChange(newArr); }} />
                {crop.inputUsed === 'Others' && (
                  <Input label={t("Specify Other Input")} placeholder="e.g., Special Fertilizer" value={crop.otherInputUsed} onChangeText={(val: string) => { const newArr = [...crops]; newArr[index].otherInputUsed = val; field.onChange(newArr); }} />
                )}

                {/* 🚀 NEW: Yield Input + Unit Dropdown */}
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 2 }}>
                    <Input label={t("Yield Obtained (Optional)")} keyboardType="numeric" value={crop.yield} onChangeText={(val: string) => { const newArr = [...crops]; newArr[index].yield = val; field.onChange(newArr); }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <SelectField label={t("Unit")} options={YIELD_UNITS} value={crop.yieldUnit || 'Quintals'} onChange={(val: string) => { const newArr = [...crops]; newArr[index].yieldUnit = val; field.onChange(newArr); }} />
                  </View>
                </View>

                <Input label={t("Problems Faced (Optional)")} placeholder="e.g., Pests, Low Rain" value={crop.problemsFaced} onChangeText={(val: string) => { const newArr = [...crops]; newArr[index].problemsFaced = val; field.onChange(newArr); }} />
              </View>
            ))}
            
            <Pressable onPress={() => field.onChange([...crops, { cropName: '', area: '', areaUnit: 'Acres', inputUsed: '', otherInputUsed: '', yield: '', yieldUnit: 'Quintals', problemsFaced: '' }])} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.md, backgroundColor: '#F1F5F9', borderRadius: radius.md, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' }}>
              <MaterialIcons name="add" size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={{ color: colors.primary, fontWeight: '800' }}>{t("Add Another Crop")}</Text>
            </Pressable>
          </View>
        );
      }} />

      <View style={{ height: 1, backgroundColor: colors.border, marginBottom: spacing.md }} />
      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary, marginBottom: spacing.sm }}>{t("Dealer Linkage (Optional)")}</Text>
      <Controller control={control} name="dealerId" render={({field}) => <SelectField label={t("Linked Dealer")} options={dealers} value={field.value} onChange={field.onChange} />} />
    </View>
  );
};