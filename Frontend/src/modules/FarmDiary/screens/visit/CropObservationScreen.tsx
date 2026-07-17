import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet, Alert, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing } from '../../../../design-system/tokens';
import { useFarmDiaryStore } from '../../../../store/farmDiaryStore';
import { supabase } from '../../../../core/supabase';

export const CropObservationScreen = ({ route, navigation }: any) => {
  const { t } = useTranslation();
  const { diary, baseVisitId } = route.params; 
  const { fetchDynamicParameters, saveCropObservation, isLoading } = useFarmDiaryStore();

  const [crops, setCrops] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [selectedCropId, setSelectedCropId] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  
  const [parameters, setParameters] = useState<any[]>([]);
  const [samplesData, setSamplesData] = useState<any>({
    1: { photo_path: null, values: {} },
    2: { photo_path: null, values: {} },
    3: { photo_path: null, values: {} },
    4: { photo_path: null, values: {} },
    5: { photo_path: null, values: {} }
  });

  const [activeTab, setActiveTab] = useState<number>(1);
  const [loadingParams, setLoadingParams] = useState(false);
  const [showStagePicker, setShowStagePicker] = useState(false);
  const [showUomPicker, setShowUomPicker] = useState<string | null>(null);

  useEffect(() => {
    const loadCrops = async () => {
      const { data } = await supabase.from('master_crops').select('*');
      if (data && data.length > 0) {
        setCrops(data);
        const match = data.find(c => c.crop_name?.toLowerCase() === diary.farm_name?.toLowerCase());
        if (match) setSelectedCropId(match.id);
        else setSelectedCropId(data[0].id);
      }
    };
    loadCrops();
  }, [diary.farm_name]);

  useEffect(() => {
    if (selectedCropId) {
      const loadStages = async () => {
        const { data } = await supabase
          .from('sop_crop_stages')
          .select(`
            id,
            stage_id,
            stage_sequence,
            master_crop_stages ( id, stage_name ),
            sop_applications ( das )
          `)
          .eq('crop_id', selectedCropId)
          .order('stage_sequence', { ascending: true });
          
        if (data && data.length > 0) {
          const formattedStages = data.map((d: any) => {
            const app = d.sop_applications && d.sop_applications.length > 0 ? d.sop_applications[0] : null;
            return {
              sop_crop_stage_id: d.id,
              id: d.master_crop_stages?.id,
              stage_name: d.master_crop_stages?.stage_name,
              das: app ? app.das : null
            };
          }).filter((s: any) => s.id);
          setStages(formattedStages);
          if (formattedStages.length > 0) setSelectedStageId(formattedStages[0].id);
          else setSelectedStageId(null);
        } else {
          setStages([]);
          setSelectedStageId(null);
        }
      };
      loadStages();
    } else {
      setStages([]);
      setSelectedStageId(null);
    }
  }, [selectedCropId]);

  useEffect(() => {
    if (selectedCropId && selectedStageId) {
      loadParameters();
    } else {
      setParameters([]);
    }
  }, [selectedCropId, selectedStageId]);

  const loadParameters = async () => {
    setLoadingParams(true);
    const params = await fetchDynamicParameters(selectedCropId!, selectedStageId!);
    setParameters(params || []);
    setLoadingParams(false);
  };

  const handleValueChange = (paramId: string, value: string, uomId?: string) => {
    setSamplesData((prev: any) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        values: {
          ...prev[activeTab].values,
          [paramId]: { value, uom_id: uomId }
        }
      }
    }));
  };

  const handlePhotoCapture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSamplesData((prev: any) => ({
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          photo_path: result.assets[0].uri
        }
      }));
    }
  };

  const calculateAverage = (paramId: string) => {
    let sum = 0;
    let count = 0;
    for (let i = 1; i <= 5; i++) {
      const val = parseFloat(samplesData[i].values[paramId]?.value);
      if (!isNaN(val)) {
        sum += val;
        count++;
      }
    }
    return count > 0 ? (sum / count).toFixed(1) : '-';
  };

  const handleSave = async () => {
    if (!baseVisitId) {
      Alert.alert('Error', 'Missing Base Visit ID. Cannot save observation.');
      return;
    }
    if (!selectedCropId || !selectedStageId) {
      Alert.alert('Error', 'Please select Crop and Stage');
      return;
    }
    const validPlants = [1, 2, 3, 4, 5].filter(i => 
      samplesData[i].photo_path || Object.keys(samplesData[i].values).length > 0
    );

    if (validPlants.length === 0) {
      Alert.alert('Validation Error', 'Please fill details or capture a photo for at least one plant.');
      return;
    }

    const sessionData = {
      base_visit_id: baseVisitId,
      farm_diary_id: diary.id,
      selected_crop_id: selectedCropId,
      selected_stage_id: selectedStageId,
      overall_plant_health_score: 5,
    };

    const formattedSamples = validPlants.map(i => ({
      index: i,
      photo_path: samplesData[i].photo_path,
      values: Object.keys(samplesData[i].values).map(paramId => ({
        parameter_id: paramId,
        value: samplesData[i].values[paramId].value,
        uom_id: samplesData[i].values[paramId].uom_id,
      }))
    }));

    const success = await saveCropObservation(sessionData, formattedSamples);
    if (success) {
      navigation.navigate("FarmDiaryDashboardScreen", { diary }); 
    }
  };

  const activeCrop = crops.find(c => c.id === selectedCropId);
  const activeStage = stages.find(s => s.id === selectedStageId);

  // Helper for mock color chips based on label text
  const getColorForOption = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('dark green')) return '#166534';
    if (l.includes('light green')) return '#84cc16';
    if (l.includes('yellow-green') || l.includes('yellow green')) return '#bef264';
    if (l.includes('green')) return '#22c55e';
    if (l.includes('yellow')) return '#fde047';
    if (l.includes('pale') || l.includes('white')) return '#fefce8';
    return '#E2E8F0';
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Dynamic Header mimicking UI Mockup */}
      <View style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
          <Pressable onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="arrow-left" size={24} color={colors.text} />
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginLeft: spacing.sm }}>Gujarat Life Sciences</Text>
          </Pressable>
          <View style={{ backgroundColor: '#065F46', paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill }}>
             <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Visit #04</Text>
          </View>
        </View>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
           <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Crop:</Text>
              <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text }}>{diary.farm_name || 'Groundnut'}</Text>
              {activeStage?.das ? (
                <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm, alignSelf: 'flex-start', marginTop: spacing.xs }}>
                   <Text style={{ color: '#166534', fontSize: 10, fontWeight: '700' }}>{activeStage.das} Days After Sowing (DAS)</Text>
                </View>
              ) : null}
           </View>
           <View style={{ width: 1, backgroundColor: '#E2E8F0', height: 40, marginHorizontal: spacing.lg }} />
           <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Stage:</Text>
              <Pressable 
                onPress={() => setShowStagePicker(true)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#F1F5F9', borderRadius: radius.md, width: '100%' }}
              >
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, flex: 1 }} numberOfLines={2}>
                  {activeStage?.stage_name || 'Select Stage'}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={24} color={colors.text} />
              </Pressable>
              <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '600', marginTop: spacing.xs }}>Batch ID: GL-GN-2023-04</Text>
           </View>
        </View>
      </View>

      {/* Main Content (Only visible when params are loaded) */}
      {(selectedCropId && selectedStageId && !loadingParams) && (
        <>
          {/* Tab Bar */}
          <View style={{ flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
            {[1, 2, 3, 4, 5].map(tab => {
              const isActive = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.md,
                    alignItems: 'center',
                    borderBottomWidth: isActive ? 2 : 1,
                    borderBottomColor: isActive ? '#166534' : 'transparent',
                    borderRightWidth: tab < 5 ? 1 : 0,
                    borderRightColor: '#E2E8F0',
                    marginTop: isActive ? 1 : 0 // slight shift to align borders
                  }}
                >
                  <Text style={{ fontWeight: isActive ? '700' : '500', color: isActive ? '#166534' : '#64748B' }}>
                    Plant {tab}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView style={{ flex: 1, padding: spacing.xl }}>
             {/* Dynamic Parameters for Active Tab */}
             {parameters.map(param => {
               const defaultUom = param.permitted_uoms?.find((u: any) => u.is_default);
               const fallbackUom = defaultUom || param.permitted_uoms?.[0];
               const val = samplesData[activeTab].values[param.id]?.value || '';
               const currentUomId = samplesData[activeTab].values[param.id]?.uom_id || fallbackUom?.uom_id;
               const currentUom = param.permitted_uoms?.find((u: any) => u.uom_id === currentUomId);
               const uomSymbol = currentUom?.symbol || '';
               const isCategorical = param.ui_input_type === 'dropdown' || param.ui_input_type === 'chips' || param.ui_input_type === 'categorical' || param.parameter_label.toLowerCase().includes('color');
               
               // Mock options data if empty (since DB might not have the exact leaf colors configured yet)
               let options = param.options_data;
               if (!options || !Array.isArray(options) || options.length === 0) {
                 if (param.parameter_label.toLowerCase().includes('color')) {
                   options = ['Dark Green', 'Green', 'Light Green', 'Yellow-Green', 'Yellow', 'Pale'];
                 }
               }

               return (
                 <View key={param.id} style={{ marginBottom: spacing.xl }}>
                   <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                     <MaterialIcons name="crop-free" size={20} color="#065F46" />
                     <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, marginLeft: spacing.xs }}>
                       {param.parameter_label.toLowerCase()}
                     </Text>
                   </View>
                   
                   {!isCategorical ? (
                     <View>
                       <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: radius.md, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
                         <TextInput
                           style={{ flex: 1, padding: spacing.md, fontSize: 16, color: colors.text }}
                           placeholder={`Enter ${param.parameter_label.toLowerCase()}`}
                           placeholderTextColor="#94A3B8"
                           keyboardType="numeric"
                           value={val}
                           onChangeText={t => handleValueChange(param.id, t, currentUomId)}
                         />
                         {uomSymbol ? (
                           <Pressable 
                             onPress={() => param.permitted_uoms?.length > 1 ? setShowUomPicker(param.id) : null}
                             style={{ backgroundColor: '#E2E8F0', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#CBD5E1' }}
                           >
                             <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{uomSymbol}</Text>
                             {param.permitted_uoms?.length > 1 && (
                               <MaterialIcons name="arrow-drop-down" size={18} color={colors.text} />
                             )}
                           </Pressable>
                         ) : null}
                       </View>
                       <Text style={{ fontSize: 12, fontStyle: 'italic', color: '#64748B', marginTop: spacing.xs }}>
                         Average for this crop stage: 32-40 {uomSymbol}
                       </Text>
                     </View>
                   ) : (
                     <View>
                        {/* Dropdown Mimic */}
                        <Pressable style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: radius.md, backgroundColor: '#FFFFFF', padding: spacing.md, marginBottom: spacing.md }}>
                           <Text style={{ fontSize: 14, color: val ? colors.text : '#94A3B8' }}>{val || 'Select Color Scale'}</Text>
                           <MaterialIcons name="keyboard-arrow-down" size={20} color={colors.text} />
                        </Pressable>
                        {/* Chips Grid */}
                        {options && (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' }}>
                            {options.map((opt: string, idx: number) => {
                              const isSelected = val === opt;
                              const chipColor = getColorForOption(opt);
                              return (
                                <Pressable
                                  key={idx}
                                  onPress={() => handleValueChange(param.id, opt, undefined)}
                                  style={{
                                    width: '47%', padding: spacing.md, borderRadius: radius.md,
                                    borderWidth: isSelected ? 2 : 1, 
                                    borderColor: isSelected ? '#166534' : '#E2E8F0',
                                    backgroundColor: isSelected ? '#ECFDF5' : '#FFFFFF',
                                    alignItems: 'center'
                                  }}
                                >
                                  <View style={{ width: '100%', height: 24, backgroundColor: chipColor, borderRadius: 4, marginBottom: spacing.xs }} />
                                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{opt}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        )}
                     </View>
                   )}
                 </View>
               );
             })}

             {/* Mandatory Photo Capture Block */}
             <View style={{ 
               borderWidth: 2, borderStyle: 'dashed', borderColor: '#CBD5E1', 
               backgroundColor: '#FFFFFF', borderRadius: 16, padding: spacing.xl,
               alignItems: 'center', marginBottom: spacing.xl 
             }}>
               <Pressable 
                 onPress={handlePhotoCapture}
                 style={{ alignItems: 'center', width: '100%' }}
               >
                 <Feather name="camera" size={36} color="#64748B" />
                 <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, marginTop: spacing.md, textAlign: 'center' }}>
                   {samplesData[activeTab].photo_path ? "Photo Captured Successfully!" : "Take Mandatory Plant Set Photograph"}
                 </Text>
               </Pressable>
               {samplesData[activeTab].photo_path && (
                 <View style={{ marginTop: spacing.md, alignItems: 'center', width: '100%' }}>
                   <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: '#A7F3D0' }}>
                     <Feather name="shield" size={14} color="#059669" />
                     <Text style={{ fontSize: 12, fontWeight: '800', marginLeft: 6, color: '#065F46' }}>Geo-Parameters Locked</Text>
                   </View>
                   <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>23.0225° N, 72.5714° E • 10:45 AM</Text>
                 </View>
               )}
             </View>

             {/* Live Parameters Average Summary */}
             <View style={{ 
               backgroundColor: '#FFFFFF', 
               borderRadius: 24, 
               padding: spacing.lg,
               paddingBottom: spacing.xl,
               borderWidth: 1, 
               borderColor: '#E2E8F0',
               marginBottom: spacing.xl
             }}>
               <View style={{ width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md }} />
               <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg }}>
                 <View style={{ backgroundColor: '#DCFCE7', padding: spacing.xs, borderRadius: radius.sm, marginRight: spacing.sm }}>
                   <Feather name="bar-chart-2" size={16} color="#166534" />
                 </View>
                 <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>Live Parameters Average</Text>
               </View>
               
               {/* Submit Button */}
               <Pressable
                 onPress={handleSave}
                 style={{
                   backgroundColor: '#065F46', padding: spacing.md,
                   borderRadius: radius.md, alignItems: 'center', opacity: isLoading ? 0.7 : 1
                 }}
                 disabled={isLoading}
               >
                 <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                   {isLoading ? "Saving..." : t("Submit Observation Cycle")}
                 </Text>
               </Pressable>
             </View>
             
           </ScrollView>

           {/* Bottom Tab Bar Mimic */}
           <View style={{ flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingBottom: 20, paddingTop: spacing.sm }}>
              <Pressable style={{ flex: 1, alignItems: 'center' }}>
                 <Feather name="grid" size={24} color="#94A3B8" />
                 <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>Dashboard</Text>
              </Pressable>
              <Pressable style={{ flex: 1, alignItems: 'center' }}>
                 <Feather name="check-square" size={24} color="#065F46" />
                 <Text style={{ fontSize: 10, color: '#065F46', marginTop: 4, fontWeight: '700' }}>Tasks</Text>
              </Pressable>
              <Pressable style={{ flex: 1, alignItems: 'center' }}>
                 <Feather name="user" size={24} color="#94A3B8" />
                 <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>Profile</Text>
              </Pressable>
           </View>
        </>
      )}

      {loadingParams && (
         <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: spacing.md, fontWeight: '600', color: colors.textMuted }}>Loading Field Parameters...</Text>
         </View>
      )}

      <Modal visible={showStagePicker} transparent={true} animationType="fade" onRequestClose={() => setShowStagePicker(false)}>
         <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }]}>
            <View style={{ width: '80%', backgroundColor: '#FFFFFF', borderRadius: radius.lg, padding: spacing.xl, maxHeight: '60%' }}>
               <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: spacing.md, color: colors.text }}>Select Crop Stage</Text>
               <ScrollView>
                 {stages.map((stg) => (
                   <Pressable 
                     key={stg.id} 
                     onPress={() => { setSelectedStageId(stg.id); setShowStagePicker(false); }}
                     style={{ paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}
                   >
                     <Text style={{ fontSize: 16, fontWeight: selectedStageId === stg.id ? '700' : '400', color: selectedStageId === stg.id ? colors.primary : colors.text }}>
                       {stg.stage_name}
                     </Text>
                   </Pressable>
                 ))}
                 {stages.length === 0 && (
                   <Text style={{ color: colors.textMuted, fontStyle: 'italic', paddingVertical: spacing.md }}>No stages found for this crop.</Text>
                 )}
               </ScrollView>
               <Pressable onPress={() => setShowStagePicker(false)} style={{ marginTop: spacing.lg, padding: spacing.md, backgroundColor: '#F1F5F9', borderRadius: radius.md, alignItems: 'center' }}>
                 <Text style={{ fontWeight: '700', color: colors.text }}>Cancel</Text>
               </Pressable>
            </View>
         </View>
      </Modal>

      <Modal visible={!!showUomPicker} transparent={true} animationType="fade" onRequestClose={() => setShowUomPicker(null)}>
         <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }]}>
            <View style={{ width: '80%', backgroundColor: '#FFFFFF', borderRadius: radius.lg, padding: spacing.xl, maxHeight: '60%' }}>
               <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: spacing.md, color: colors.text }}>Select Unit</Text>
               <ScrollView>
                 {showUomPicker && parameters.find(p => p.id === showUomPicker)?.permitted_uoms?.map((u: any) => {
                   const isActiveTabParamVal = samplesData[activeTab].values[showUomPicker]?.value || '';
                   const currentUomId = samplesData[activeTab].values[showUomPicker]?.uom_id || parameters.find(p => p.id === showUomPicker)?.permitted_uoms?.find((du: any) => du.is_default)?.uom_id || parameters.find(p => p.id === showUomPicker)?.permitted_uoms?.[0]?.uom_id;
                   
                   return (
                   <Pressable 
                     key={u.uom_id} 
                     onPress={() => { 
                       handleValueChange(showUomPicker, isActiveTabParamVal, u.uom_id); 
                       setShowUomPicker(null); 
                     }}
                     style={{ paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}
                   >
                     <Text style={{ fontSize: 16, fontWeight: currentUomId === u.uom_id ? '700' : '400', color: currentUomId === u.uom_id ? colors.primary : colors.text }}>
                       {u.symbol}
                     </Text>
                   </Pressable>
                 )})}
               </ScrollView>
               <Pressable onPress={() => setShowUomPicker(null)} style={{ marginTop: spacing.lg, padding: spacing.md, backgroundColor: '#F1F5F9', borderRadius: radius.md, alignItems: 'center' }}>
                 <Text style={{ fontWeight: '700', color: colors.text }}>Cancel</Text>
               </Pressable>
            </View>
         </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    marginRight: spacing.md,
  },
  pillSelected: {
    backgroundColor: '#065F46',
    borderColor: '#065F46',
  }
});
