import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Controller } from 'react-hook-form';
import { Input, SelectField, MultiSelectField } from '../../../../../design-system/components';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, shadows } from '../../../../../design-system/tokens';

const PAST_CROPS = ["Paddy", "Bajra", "Jowar", "Maize", "Other Cereals", "Tur", "Moong", "Math", "Udid", "Other Pulses", "Groundnut", "Sesamum", "Castor", "Soyabean", "Other Oilseeds", "Cotton", "Tobacco", "Guar", "Vegetable", "Fodder", "Irri. Wheat", "Unirri. Wheat", "Gram", "Mustard", "Sugarcane", "Cumin", "Coriander", "Garlic", "Sawa", "Isabgul", "Fennel", "Onion", "Potato"];
const LAND_UNITS = ["Acres", "Bigha"];
const YIELD_UNITS = ["Quintals", "Tonnes", "Kg"];
const INPUTS_USED = ["DAP", "Urea", "NPK", "SSP", "MOP", "Compost", "Others"];

const OTHER_CROP_OPTIONS = ["Other Cereals", "Other Pulses", "Other Oilseeds"];

export const Step3History = ({ control, t, dealers, isLocked }: any) => {
  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("History of Cultivation")}</Text>
      
      <View pointerEvents={isLocked ? "none" : "auto"} style={{ opacity: isLocked ? 0.5 : 1 }}>
        <Controller control={control} name="pastCrops" render={({ field }) => {
          // 🚀 CHANGED: yieldUnit defaults to 'Kg'
          const crops = field.value?.length > 0 ? field.value : [{ cropName: '', area: '', areaUnit: 'Acres', inputUsed: [], otherInputUsed: '', yield: '', yieldUnit: 'Kg', problemsFaced: '' }]; 
          
          return (
            <View style={{ marginBottom: spacing.lg }}>
              {crops.map((crop: any, index: number) => (
                <View key={index} style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft }}>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{t("Crop")} {index + 1}</Text>
                    <Pressable 
                      onPress={() => {
                        const filtered = crops.filter((_: any, i: number) => i !== index);
                        // 🚀 CHANGED: yieldUnit defaults to 'Kg' if last item is deleted
                        field.onChange(filtered.length > 0 ? filtered : [{ cropName: '', area: '', areaUnit: 'Acres', inputUsed: [], otherInputUsed: '', yield: '', yieldUnit: 'Kg', problemsFaced: '' }]);
                      }} 
                      style={{ padding: 4 }}
                    >
                      <MaterialIcons name="delete" size={20} color={colors.danger} />
                    </Pressable>
                  </View>

                  <SelectField label={t("Crop Name")} options={PAST_CROPS} value={crop.cropName} onChange={(val: string) => { const newArr = [...crops]; newArr[index].cropName = val; field.onChange(newArr); }} />
                  
                  {/* 🚀 NEW: Conditional Input for Other Past Crops */}
                  {OTHER_CROP_OPTIONS.includes(crop.cropName) && (
                    <Input 
                      label={t("Specify Other Crop *")} 
                      placeholder={t("e.g., Quinoa")} 
                      value={crop.otherCropName} 
                      onChangeText={(val: string) => { const newArr = [...crops]; newArr[index].otherCropName = val; field.onChange(newArr); }} 
                    />
                  )}
                  
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 2 }}>
                      <Input label={t("Area")} placeholder="e.g., 5" keyboardType="numeric" value={crop.area} onChangeText={(val: string) => { const newArr = [...crops]; newArr[index].area = val; field.onChange(newArr); }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <SelectField label={t("Unit")} options={LAND_UNITS} value={crop.areaUnit || 'Acres'} onChange={(val: string) => { const newArr = [...crops]; newArr[index].areaUnit = val; field.onChange(newArr); }} />
                    </View>
                  </View>

                  <MultiSelectField label={t("Inputs Used ")} options={INPUTS_USED} value={crop.inputUsed || []} onChange={(val: string[]) => { const newArr = [...crops]; newArr[index].inputUsed = val; field.onChange(newArr); }} />
                  
                  {(crop.inputUsed || []).includes('Others') && (
                    <Input label={t("Specify Other Input")} placeholder="e.g., Special Fertilizer" value={crop.otherInputUsed} onChangeText={(val: string) => { const newArr = [...crops]; newArr[index].otherInputUsed = val; field.onChange(newArr); }} />
                  )}

                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 2 }}>
                      <Input label={t("Yield Obtained ")} placeholder="e.g., 20" keyboardType="numeric" value={crop.yield} onChangeText={(val: string) => { const newArr = [...crops]; newArr[index].yield = val; field.onChange(newArr); }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      {/* 🚀 CHANGED: Fallback value is now 'Kg' */}
                      <SelectField label={t("Unit")} options={YIELD_UNITS} value={crop.yieldUnit || 'Kg'} onChange={(val: string) => { const newArr = [...crops]; newArr[index].yieldUnit = val; field.onChange(newArr); }} />
                    </View>
                  </View>

                  <Input label={t("Problems Faced ")} placeholder="e.g., Pests, Low Rain" value={crop.problemsFaced} onChangeText={(val: string) => { const newArr = [...crops]; newArr[index].problemsFaced = val; field.onChange(newArr); }} />
                </View>
              ))}
              
              {/* 🚀 CHANGED: yieldUnit defaults to 'Kg' when adding a new row */}
              <Pressable onPress={() => field.onChange([...crops, { cropName: '', area: '', areaUnit: 'Acres', inputUsed: [], otherInputUsed: '', yield: '', yieldUnit: 'Kg', problemsFaced: '' }])} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.md, backgroundColor: '#F1F5F9', borderRadius: radius.md, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' }}>
                <MaterialIcons name="add" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ color: colors.primary, fontWeight: '800' }}>{t("Add Another Crop")}</Text>
              </Pressable>
            </View>
          );
        }} />
      </View>

      <View style={{ height: 1, backgroundColor: colors.border, marginBottom: spacing.md }} />
      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary, marginBottom: spacing.sm }}>{t("Dealer Linkage ")}</Text>
      <Controller control={control} name="dealerId" render={({field}) => <SelectField label={t("Linked Dealer")} options={dealers} value={field.value} onChange={field.onChange} />} />
    </View>
  );
};