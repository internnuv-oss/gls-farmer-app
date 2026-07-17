import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Alert, StyleSheet, Image, KeyboardAvoidingView, Platform, Switch, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing, shadows } from '../../../../design-system/tokens';
import { useFarmDiaryStore } from '../../../../store/farmDiaryStore';
import { supabase } from '../../../../core/supabase';
import { BoundaryCaptureModal } from '../../../FarmCard/screens/components/BoundaryCaptureModal';
import { WizardFlowTemplate } from '../../../../design-system/templates';
import { Button, Input, SelectField, MultiSelectField, DatePickerField } from '../../../../design-system/components';

export const FarmDiarySetupScreen = ({ route, navigation }: any) => {
  const { t } = useTranslation();
  const { farmer, preselectedFarmCardId } = route.params;
  const farmerId = farmer?.id || farmer?.entityId;

  const [step, setStep] = useState(1);
  const [farmCards, setFarmCards] = useState<any[]>([]);
  const [selectedFarmCardId, setSelectedFarmCardId] = useState<string | null>(preselectedFarmCardId || null);
  const [masterCrops, setMasterCrops] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<any>({
    farmer_id: farmerId,
    farm_name: '',
    plot_area: '',
    plot_area_unit: 'Acres',
    land_status: '',
    is_sowing_done: false,
    sowing_date: null,
    
    soil_type: '',
    soil_ph: '',
    soil_ec_ms_cm: '',
    organic_matter_percentage: '',
    nitrogen_kg_ha: '',
    phosphorus_kg_ha: '',
    potassium_kg_ha: '',
    drainage_condition: '',
    soil_test_status: '',
    
    water_source: [],
    irrigation_method: [],
    water_tds: '',
    water_ph: '',
    
    decision_making_factor: '',
    diary_polygon: [],
  });

  const [isMapModalVisible, setIsMapModalVisible] = useState(false);
  const [mapSnapshot, setMapSnapshot] = useState<string | null>(null);
  const [showAreaUnitPicker, setShowAreaUnitPicker] = useState(false);
  const [showLandStatusPicker, setShowLandStatusPicker] = useState(false);

  const selectedFarmCard = farmCards.find(fc => fc.id === selectedFarmCardId);
  const parentBoundary = selectedFarmCard?.boundary_polygon || selectedFarmCard?.card_data?.boundary_polygon || [];

  const preferredChemCrop = selectedFarmCard?.card_data?.preferredChemCrop || [];

  const { createDiary, isLoading } = useFarmDiaryStore();

  useEffect(() => {
    const fetchCards = async () => {
      const { data } = await supabase
        .from('farm_cards')
        .select('*')
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false });
      if (data) setFarmCards(data);
    };
    const fetchMasterCrops = async () => {
      const { data } = await supabase
        .from('master_crops')
        .select('crop_name')
        .eq('status', 'Active')
        .order('crop_name');
      if (data) setMasterCrops(data.map(d => d.crop_name));
    };
    if (farmerId) fetchCards();
    fetchMasterCrops();
  }, [farmerId]);

  const handleSave = async () => {
    if (!selectedFarmCardId) {
      Alert.alert('Error', 'Please select a Farm Card in Step 1');
      return;
    }
    
    // Convert numeric fields properly
    const parseNum = (val: any) => val ? parseFloat(val) : null;
    
    const payload = {
      ...formData,
      farm_card_id: selectedFarmCardId,
      farm_name: formData.farm_name,
      plot_area: parseNum(formData.plot_area),
      plot_area_unit: formData.plot_area_unit,
      land_status: formData.land_status,
      soil_ph: parseNum(formData.soil_ph),
      soil_ec_ms_cm: parseNum(formData.soil_ec_ms_cm),
      organic_matter_percentage: parseNum(formData.organic_matter_percentage),
      nitrogen_kg_ha: parseNum(formData.nitrogen_kg_ha),
      phosphorus_kg_ha: parseNum(formData.phosphorus_kg_ha),
      potassium_kg_ha: parseNum(formData.potassium_kg_ha),
      water_tds: parseNum(formData.water_tds),
      water_ph: parseNum(formData.water_ph),
      water_source: Array.isArray(formData.water_source) ? formData.water_source.join(', ') : formData.water_source,
      irrigation_method: Array.isArray(formData.irrigation_method) ? formData.irrigation_method.join(', ') : formData.irrigation_method,
      
      
      // Defaults for JSONB
      multi_season_yield_history: [],
      historical_input_preferences: {},
    };
    
    // Clean up empty strings for optional fields that shouldn't be empty strings in DB
    Object.keys(payload).forEach(key => {
      if (payload[key] === '') payload[key] = null;
    });

    const id = await createDiary(payload);
    if (id) {
      navigation.goBack();
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!selectedFarmCardId || !formData.farm_name || !formData.plot_area || !formData.land_status || !mapSnapshot) {
        Alert.alert('Incomplete Form', 'Please fill all mandatory fields in Step 1.');
        return;
      }
      if (formData.is_sowing_done && !formData.sowing_date) {
        Alert.alert('Incomplete Form', 'Please select a Sowing Date since sowing is done.');
        return;
      }
    } else if (step === 2) {
      if (!formData.soil_type) {
        Alert.alert('Incomplete Form', 'Please select Soil Type.');
        return;
      }
    } else if (step === 3) {
      if (!formData.water_source || formData.water_source.length === 0 || !formData.irrigation_method || formData.irrigation_method.length === 0) {
        Alert.alert('Incomplete Form', 'Please select Water Source and Irrigation Method.');
        return;
      }
    }
    setStep(step + 1);
  };
  const handlePrev = () => setStep(step - 1);

  const parseDate = (ddmmyyyy: string) => {
    if (!ddmmyyyy || ddmmyyyy.length !== 10) return null;
    const [d, m, y] = ddmmyyyy.split('-');
    return new Date(`${y}-${m}-${d}`).toISOString();
  };

  const formatForPicker = (iso: string | null) => {
    if (!iso) return '';
    const date = new Date(iso);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}-${m}-${date.getFullYear()}`;
  };

  const updateForm = (key: string, val: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: val }));
  };

  const renderStep1 = () => (
    <View style={{ gap: spacing.lg }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary, marginBottom: spacing.sm }}>1. Basic Farm Details</Text>
      
      <Text style={styles.label}>{t("Farm Card")} *</Text>
      {farmCards.map((fc, index) => {
        if (fc.id === selectedFarmCardId) {
          return (
            <View key={fc.id} style={[styles.card, styles.cardSelected]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="agriculture" size={24} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ fontWeight: 'bold', color: colors.primary, fontSize: 16 }}>{t("Farm")} {farmCards.length - index}</Text>
              </View>
            </View>
          );
        }
        return null;
      })}

      <SelectField 
        label={t("Crop Name") + " *"} 
        placeholder={t("Select Crop")} 
        options={masterCrops} 
        value={formData.farm_name} 
        onChange={(v) => updateForm('farm_name', v)} 
      />

      <View style={{ marginBottom: spacing.lg, width: '100%' }}>
        <Text style={{ color: colors.textMuted, marginBottom: spacing.xs, fontSize: 12, fontWeight: '700' }}>
          {t("Plot Area")} *
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, height: 56, paddingHorizontal: spacing.md }}>
          <TextInput 
            style={{ flex: 1, fontSize: 16, color: colors.text }}
            placeholder={t("e.g. 5")}
            keyboardType="numeric"
            value={formData.plot_area}
            onChangeText={t => updateForm('plot_area', t)}
          />
          <Pressable 
            onPress={() => setShowAreaUnitPicker(true)}
            style={{ borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: spacing.sm, marginLeft: spacing.sm, flexDirection: 'row', alignItems: 'center' }}
          >
            <Text style={{ color: colors.textMuted, fontWeight: '700', fontSize: 16 }}>{formData.plot_area_unit || 'Acres'}</Text>
            <MaterialIcons name="arrow-drop-down" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      <View style={{ marginBottom: spacing.lg, width: '100%' }}>
        <Text style={{ color: colors.textMuted, marginBottom: spacing.xs, fontSize: 12, fontWeight: '700' }}>
          {t("Land Status")} *
        </Text>
        <Pressable 
          onPress={() => setShowLandStatusPicker(true)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, height: 56, paddingHorizontal: spacing.md }}
        >
          <Text style={{ fontSize: 16, color: formData.land_status ? colors.text : colors.textMuted, fontWeight: formData.land_status ? '600' : '500' }}>
            {formData.land_status || t("Select Status")}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg }}>
        <View style={{ marginBottom: formData.is_sowing_done ? spacing.lg : 0, width: '100%' }}>
          <Text style={{ color: colors.textMuted, marginBottom: spacing.xs, fontSize: 12, fontWeight: '700' }}>
            {t("Is Sowing Done?")} *
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.screen, height: 56, paddingHorizontal: spacing.md }}>
            <Text style={{ fontSize: 16, color: colors.text, fontWeight: '500' }}>{formData.is_sowing_done ? t("Yes") : t("No")}</Text>
            <Switch 
              value={formData.is_sowing_done} 
              onValueChange={v => updateForm('is_sowing_done', v)} 
              trackColor={{ false: '#E2E8F0', true: '#34d399' }}
              thumbColor={formData.is_sowing_done ? '#10b981' : '#f8fafc'}
            />
          </View>
        </View>

        {formData.is_sowing_done && (
          <View style={{ marginBottom: -spacing.lg }}>
            <DatePickerField 
              label={t("Sowing Date") + " *"}
              value={formatForPicker(formData.sowing_date)}
              onChange={(v: any) => updateForm('sowing_date', parseDate(v))}
              maximumDate={new Date()}
            />
          </View>
        )}
      </View>

      <Text style={styles.label}>{t("Diary Plot Area")} *</Text>
      {!mapSnapshot ? (
        <Pressable onPress={() => setIsMapModalVisible(true)} style={styles.mapPlaceholder}>
          <MaterialIcons name="map" size={48} color="#94A3B8" />
          <Text style={{ color: '#64748B', marginTop: spacing.sm, fontWeight: '700' }}>{t("Tap to plot diary area")}</Text>
        </Pressable>
      ) : (
        <View style={{ position: 'relative' }}>
          <Image source={{ uri: mapSnapshot }} style={{ height: 200, width: '100%', borderRadius: radius.md }} />
          <Pressable onPress={() => setIsMapModalVisible(true)} style={styles.mapEditBtn}>
            <MaterialIcons name="edit" size={20} color={colors.primary} />
          </Pressable>
        </View>
      )}
      {/* Area Unit Picker Modal */}
      <Modal visible={showAreaUnitPicker} transparent={true} animationType="fade" onRequestClose={() => setShowAreaUnitPicker(false)}>
         <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }]}>
            <View style={{ width: '80%', backgroundColor: '#FFFFFF', borderRadius: radius.lg, padding: spacing.xl }}>
               <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: spacing.md, color: colors.text }}>Select Unit</Text>
               <ScrollView>
                 {['Acres', 'Bigha'].map((u) => (
                   <Pressable 
                     key={u} 
                     onPress={() => { updateForm('plot_area_unit', u); setShowAreaUnitPicker(false); }}
                     style={{ paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}
                   >
                     <Text style={{ fontSize: 16, fontWeight: formData.plot_area_unit === u ? '700' : '400', color: formData.plot_area_unit === u ? colors.primary : colors.text }}>
                       {u}
                     </Text>
                   </Pressable>
                 ))}
               </ScrollView>
               <Pressable onPress={() => setShowAreaUnitPicker(false)} style={{ marginTop: spacing.lg, padding: spacing.md, backgroundColor: '#F1F5F9', borderRadius: radius.md, alignItems: 'center' }}>
                 <Text style={{ fontWeight: '700', color: colors.text }}>Cancel</Text>
               </Pressable>
            </View>
         </View>
      </Modal>

      <Modal visible={showLandStatusPicker} transparent={true} animationType="fade" onRequestClose={() => setShowLandStatusPicker(false)}>
         <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }]}>
            <View style={{ width: '80%', backgroundColor: '#FFFFFF', borderRadius: radius.lg, padding: spacing.xl }}>
               <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: spacing.md, color: colors.text }}>Select Land Status</Text>
               <ScrollView>
                 {['Irrigated', 'Rainfed'].map((u) => (
                   <Pressable 
                     key={u} 
                     onPress={() => { updateForm('land_status', u); setShowLandStatusPicker(false); }}
                     style={{ paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}
                   >
                     <Text style={{ fontSize: 16, fontWeight: formData.land_status === u ? '700' : '400', color: formData.land_status === u ? colors.primary : colors.text }}>
                       {u}
                     </Text>
                   </Pressable>
                 ))}
               </ScrollView>
               <Pressable onPress={() => setShowLandStatusPicker(false)} style={{ marginTop: spacing.lg, padding: spacing.md, backgroundColor: '#F1F5F9', borderRadius: radius.md, alignItems: 'center' }}>
                 <Text style={{ fontWeight: '700', color: colors.text }}>Cancel</Text>
               </Pressable>
            </View>
         </View>
      </Modal>

      <BoundaryCaptureModal 
        visible={isMapModalVisible} 
        onClose={() => setIsMapModalVisible(false)} 
        parentBoundary={parentBoundary} 
        onSave={(uri: any, path: any) => { 
          setMapSnapshot(uri); 
          updateForm('diary_polygon', path); 
        }} 
      />
    </View>
  );

  const renderStep2 = () => (
    <View style={{ gap: spacing.lg }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary, marginBottom: spacing.sm }}>2. Soil Health & Details</Text>
      
      <SelectField label={t("Soil Type") + " *"} placeholder={t("Select Soil Type")} options={['Sandy', 'Loamy', 'Clay', 'Black', 'Red']} value={formData.soil_type} onChange={(v) => updateForm('soil_type', v)} />
      <SelectField label={t("Soil Test Done?")} placeholder={t("Select")} options={['Yes', 'No']} value={formData.soil_test_status} onChange={(v) => updateForm('soil_test_status', v)} />
      
      <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.md }}>
        <View style={{ flex: 1 }}><Input label={t("Soil pH")} placeholder="e.g. 6.5" suffix="pH" keyboardType="numeric" value={formData.soil_ph} onChangeText={t => updateForm('soil_ph', t)} /></View>
        <View style={{ flex: 1 }}><Input label={t("Soil EC")} placeholder="e.g. 1.2" suffix="mS/cm" keyboardType="numeric" value={formData.soil_ec_ms_cm} onChangeText={t => updateForm('soil_ec_ms_cm', t)} /></View>
      </View>
      <Input label={t("Organic Matter")} placeholder="e.g. 2.5" suffix="%" keyboardType="numeric" value={formData.organic_matter_percentage} onChangeText={t => updateForm('organic_matter_percentage', t)} />
      
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Input label={t("Nitrogen (N)")} placeholder="e.g. 300" suffix="kg/ha" keyboardType="numeric" value={formData.nitrogen_kg_ha} onChangeText={t => updateForm('nitrogen_kg_ha', t)} /></View>
        <View style={{ flex: 1 }}><Input label={t("Phosphorus (P)")} placeholder="e.g. 60" suffix="kg/ha" keyboardType="numeric" value={formData.phosphorus_kg_ha} onChangeText={t => updateForm('phosphorus_kg_ha', t)} /></View>
        <View style={{ flex: 1 }}><Input label={t("Potassium (K)")} placeholder="e.g. 150" suffix="kg/ha" keyboardType="numeric" value={formData.potassium_kg_ha} onChangeText={t => updateForm('potassium_kg_ha', t)} /></View>
      </View>

      <SelectField label={t("Drainage Condition")} placeholder={t("Select Condition")} options={['Good', 'Moderate', 'Poor']} value={formData.drainage_condition} onChange={(v) => updateForm('drainage_condition', v)} />
    </View>
  );

  const renderStep3 = () => (
    <View style={{ gap: spacing.lg }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary, marginBottom: spacing.sm }}>3. Water & Irrigation</Text>
      
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <MultiSelectField label={t("Water Source") + " *"} placeholder={t("Select")} options={['Borewell', 'Canal', 'Rain', 'Tank', 'River']} value={formData.water_source} onChange={(v) => updateForm('water_source', v)} />
        </View>
        <View style={{ flex: 1 }}>
          <MultiSelectField label={t("Irrigation Method") + " *"} placeholder={t("Select")} options={['Drip', 'Sprinkler', 'Flood', 'Furrow']} value={formData.irrigation_method} onChange={(v) => updateForm('irrigation_method', v)} />
        </View>
      </View>
      
      <Text style={{ fontWeight: '800', color: colors.primary, marginTop: spacing.md, marginBottom: spacing.sm }}>{t("WATER QUALITY")}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Input label="TDS" placeholder="e.g. 500" suffix="ppm" keyboardType="numeric" value={formData.water_tds} onChangeText={t => updateForm('water_tds', t)} /></View>
        <View style={{ flex: 1 }}><Input label="pH" placeholder="e.g. 7.0" suffix="pH" keyboardType="numeric" value={formData.water_ph} onChangeText={t => updateForm('water_ph', t)} /></View>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={{ gap: spacing.lg }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary, marginBottom: spacing.sm }}>4. Additional Info</Text>
      
      <Input 
        label={t("Decision Making")}
        placeholder={t("Key factors influencing farm decisions...")} 
        value={formData.decision_making_factor} 
        onChangeText={t => updateForm('decision_making_factor', t)} 
      />

      <View style={{ backgroundColor: '#FFFBEB', padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: '#FDE68A', marginTop: spacing.xl }}>
        <MaterialIcons name="info-outline" size={24} color="#D97706" style={{ marginBottom: spacing.xs }} />
        <Text style={{ color: '#92400E', fontWeight: '600', fontSize: 14 }}>
          Note: Yield history and historical input preferences can be added later from the Diary Dashboard.
        </Text>
      </View>
    </View>
  );

  return (
    <WizardFlowTemplate
      headerTitle={t("Setup Farm Diary")}
      stepLabel={t(`STEP ${step} OF 4`)}
      progress01={step / 4}
      onBack={() => {
        if (step > 1) {
          handlePrev();
        } else {
          navigation.goBack();
        }
      }}
      footer={
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {step < 4 ? (
             <View style={{ flex: 1 }}>
               <Button label={t("Next")} onPress={handleNext} />
             </View>
          ) : (
             <View style={{ flex: 1 }}>
               <Button label={t("Submit Farm Diary")} onPress={handleSave} loading={isLoading} />
             </View>
          )}
        </View>
      }
    >
      <View style={{ padding: spacing.xl, flex: 1 }}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </View>
    </WizardFlowTemplate>
  );
};

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    marginBottom: spacing.xs
  },
  card: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  mapPlaceholder: {
    height: 200, backgroundColor: '#E2E8F0', borderRadius: radius.md, justifyContent: 'center', alignItems: 'center'
  },
  mapEditBtn: {
    position: 'absolute', top: 10, right: 10, backgroundColor: 'white', padding: 8, borderRadius: 20, ...shadows.soft
  }
});
