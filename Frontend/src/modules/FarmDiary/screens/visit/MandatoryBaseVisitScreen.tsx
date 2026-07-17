import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator, TextInput, Image, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing } from '../../../../design-system/tokens';
import { useFarmDiaryStore } from '../../../../store/farmDiaryStore';
import { supabase } from '../../../../core/supabase';
import { Button, Input, SelectField, TextArea, DatePickerField } from '../../../../design-system/components';
import * as ImagePicker from 'expo-image-picker';
export const MandatoryBaseVisitScreen = ({ route, navigation }: any) => {
  const { t } = useTranslation();
  const { diary } = route.params;
  const { startBaseVisit, getNextVisitNumber, isLoading } = useFarmDiaryStore();
  
  const [visitNumber, setVisitNumber] = useState<number | null>(null);

  useEffect(() => {
    const fetchVisitNumber = async () => {
      const num = await getNextVisitNumber(diary.id);
      setVisitNumber(num);
    };
    fetchVisitNumber();
  }, [diary.id]);

  const [products, setProducts] = useState<string[]>([]);
  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase.from('master_gls_products').select('*');
      if (data) {
        setProducts(data.map(p => p.product_name || p.name || ''));
      }
    };
    fetchProducts();
  }, []);

  const today = new Date();
  
  const [formData, setFormData] = useState<any>({
    visit_date: today.toISOString().split('T')[0],
    visit_time: today.toTimeString().substring(0, 5),
    soil_moisture_percentage: '',
    soil_health_status: 'Optimal',
    last_watering_date: null,
    fertilizers_given: false,
    fertilizers_applied: [],
    pesticides_given: false,
    pesticides_applied: [],
    general_observations: ''
  });

  const [currentFertilizer, setCurrentFertilizer] = useState({ name: '', quantity: '', unit: 'kg', method: '' });
  const [currentPesticide, setCurrentPesticide] = useState({ name: '', quantity: '', unit: 'L', method: '' });

  const [visitPhotos, setVisitPhotos] = useState<string[]>([]);

  const handleCapturePhoto = () => {
    Alert.alert(
      t("Upload Photo"),
      t("Choose a method to upload photo"),
      [
        { text: t("Cancel"), style: "cancel" },
        { 
          text: t("Take Photo"), 
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Camera access is required.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              quality: 0.7,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              setVisitPhotos(prev => [...prev, result.assets[0].uri]);
            }
          }
        },
        { 
          text: t("Choose from Gallery"), 
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Gallery access is required.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.7,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              setVisitPhotos(prev => [...prev, result.assets[0].uri]);
            }
          }
        }
      ]
    );
  };

  const handleSave = async () => {
    // 🚀 Strict validation for all mandatory fields
    if (
      formData.soil_moisture_percentage.toString().trim() === '' ||
      !formData.soil_health_status ||
      !formData.last_watering_date
    ) {
      Alert.alert('Incomplete Form', 'Please fill all mandatory base visit parameters, including the date.');
      return;
    }

    if (formData.fertilizers_given && formData.fertilizers_applied.length === 0) {
      Alert.alert('Incomplete Form', 'Please add at least one fertilizer since you selected "Yes".');
      return;
    }

    if (formData.pesticides_given && formData.pesticides_applied.length === 0) {
      Alert.alert('Incomplete Form', 'Please add at least one pesticide since you selected "Yes".');
      return;
    }

    const baseVisitId = await startBaseVisit(diary.id, {
      ...formData,
      visit_photos: visitPhotos,
      date_of_visit: formData.visit_date,
      soil_moisture_percentage: parseFloat(formData.soil_moisture_percentage) || 0,
    });

    if (baseVisitId) {
      navigation.replace('CropObservationScreen', { diary, baseVisitId });
    }
  };

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.screen }}>
      {/* Header */}
      <View style={{ padding: spacing.xl, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginLeft: spacing.sm }}>{t("Back")}</Text>
        </Pressable>
        <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text }}>
          {t("Field Check-In Ledger")}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs, marginBottom: spacing.md }}>
          <MaterialIcons name="calendar-today" size={14} color={colors.textMuted} />
          <Text style={{ fontSize: 14, color: colors.textMuted, marginLeft: spacing.xs }}>
            {today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} • {today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={{ alignSelf: 'flex-start', backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill }}>
          {visitNumber === null ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <Text style={{ color: colors.surface, fontSize: 12, fontWeight: '700' }}>
              {t("Visit")} #{visitNumber.toString().padStart(2, '0')}
            </Text>
          )}
        </View>
      </View>

      <ScrollView style={{ flex: 1, padding: spacing.xl }}>
        {/* Warning Alert */}
        <View style={{ flexDirection: 'row', backgroundColor: '#FEE2E2', padding: spacing.lg, borderRadius: radius.md, marginBottom: spacing.xl }}>
          <Feather name="alert-triangle" size={20} color={colors.danger} style={{ marginTop: 2 }} />
          <Text style={{ color: colors.danger, flex: 1, marginLeft: spacing.sm, fontWeight: '600', fontSize: 14 }}>
            Mandatory Base Visit parameters required to unlock dynamic crop stage logs.
          </Text>
        </View>

        <View style={{ gap: spacing.lg, paddingBottom: 60 }}>
          
          <Input 
            label={t("Soil Moisture")}
            placeholder="0"
            suffix="%"
            keyboardType="numeric"
            value={formData.soil_moisture_percentage.toString()}
            onChangeText={t => setFormData({ ...formData, soil_moisture_percentage: t })}
          />

          <SelectField 
            label={t("Soil Health Status")}
            placeholder={t("Select")}
            options={['Optimal', 'Good', 'Fair', 'Poor']}
            value={formData.soil_health_status}
            onChange={v => setFormData({ ...formData, soil_health_status: v })}
          />

          <DatePickerField 
            label={t("Last Watering Date")}
            value={formatForPicker(formData.last_watering_date)}
            onChange={v => setFormData({ ...formData, last_watering_date: parseDate(v) })}
            maximumDate={today}
          />

          {/* Fertilizers */}
          <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: formData.fertilizers_given ? spacing.md : 0 }}>
              <Text style={{ fontWeight: '700', color: colors.text, fontSize: 14 }}>{t("Fertilizers Given?")}</Text>
              <Switch 
                value={formData.fertilizers_given} 
                onValueChange={v => setFormData({ ...formData, fertilizers_given: v })} 
                trackColor={{ false: '#d1d5db', true: '#34d399' }}
                thumbColor={formData.fertilizers_given ? '#10b981' : '#f3f4f6'}
              />
            </View>

            {formData.fertilizers_given && (
              <View>
                {formData.fertilizers_applied.length > 0 && (
                  <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing.md }}>
                    <View style={{ flexDirection: 'row', backgroundColor: colors.screen, padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <Text style={{ flex: 2, fontWeight: '700', fontSize: 12 }}>{t("Name")}</Text>
                      <Text style={{ flex: 1, fontWeight: '700', fontSize: 12 }}>{t("Qty")}</Text>
                      <Text style={{ flex: 2, fontWeight: '700', fontSize: 12 }}>{t("Method")}</Text>
                      <View style={{ width: 30 }} />
                    </View>
                    {formData.fertilizers_applied.map((fert: any, idx: number) => (
                      <View key={idx} style={{ flexDirection: 'row', padding: spacing.sm, borderBottomWidth: idx === formData.fertilizers_applied.length - 1 ? 0 : 1, borderBottomColor: colors.border, alignItems: 'center', backgroundColor: colors.surface }}>
                        <Text style={{ flex: 2, fontSize: 12 }}>{fert.name}</Text>
                        <Text style={{ flex: 1, fontSize: 12 }}>{fert.quantity} {fert.unit}</Text>
                        <Text style={{ flex: 2, fontSize: 12 }}>{fert.method}</Text>
                        <Pressable onPress={() => {
                          const newArr = [...formData.fertilizers_applied];
                          newArr.splice(idx, 1);
                          setFormData({ ...formData, fertilizers_applied: newArr });
                        }} style={{ width: 30, alignItems: 'flex-end' }}>
                          <Feather name="trash-2" size={16} color="#ef4444" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                <View style={{ backgroundColor: colors.screen, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border }}>
                   <Text style={{ fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>{t("Add New Fertilizer")}</Text>
                   
                   <Text style={styles.label}>{t("Name")}</Text>
                   <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 48, justifyContent: 'center', marginBottom: spacing.sm }}>
                     <TextInput 
                       placeholder={t("Start typing...")}
                       value={currentFertilizer.name}
                       onChangeText={t => setCurrentFertilizer({ ...currentFertilizer, name: t })}
                       style={{ fontSize: 16, color: colors.text }}
                     />
                   </View>
                   {currentFertilizer.name.length > 1 && !products.includes(currentFertilizer.name) && (
                      <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, maxHeight: 120, marginBottom: spacing.sm }}>
                         <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                           {products.filter(p => p.toLowerCase().includes(currentFertilizer.name.toLowerCase())).map((p, pIdx) => (
                             <Pressable key={pIdx} style={{ padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.screen }} onPress={() => {
                                setCurrentFertilizer({ ...currentFertilizer, name: p });
                             }}>
                               <Text>{p}</Text>
                             </Pressable>
                           ))}
                           {products.filter(p => p.toLowerCase().includes(currentFertilizer.name.toLowerCase())).length === 0 && (
                             <Text style={{ padding: spacing.sm, color: colors.textMuted, fontStyle: 'italic' }}>No suggestions found.</Text>
                           )}
                         </ScrollView>
                      </View>
                   )}

                   <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                     <View style={{ flex: 1 }}>
                       <Input 
                         label={t("Quantity")}
                         placeholder="0"
                         keyboardType="numeric"
                         value={currentFertilizer.quantity.toString()}
                         onChangeText={t => setCurrentFertilizer({ ...currentFertilizer, quantity: t })}
                       />
                     </View>
                     <View style={{ flex: 1 }}>
                       <SelectField 
                         label={t("Unit")}
                         placeholder={t("Select")}
                         options={['kg', 'L', 'g', 'ml']}
                         value={currentFertilizer.unit}
                         onChange={v => setCurrentFertilizer({ ...currentFertilizer, unit: v })}
                       />
                     </View>
                   </View>

                   <Input 
                     label={t("Method")}
                     placeholder={t("e.g. Broadcast, Drip")}
                     value={currentFertilizer.method}
                     onChangeText={t => setCurrentFertilizer({ ...currentFertilizer, method: t })}
                   />
                   
                   <Pressable onPress={() => {
                      if (!currentFertilizer.name) {
                        Alert.alert("Error", "Please enter a fertilizer name");
                        return;
                      }
                      setFormData({ ...formData, fertilizers_applied: [...formData.fertilizers_applied, currentFertilizer] });
                      setCurrentFertilizer({ name: '', quantity: '', unit: 'kg', method: '' });
                   }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.md, borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed', borderRadius: radius.md, marginTop: spacing.sm }}>
                      <Feather name="plus" size={16} color="#065F46" />
                      <Text style={{ color: colors.primary, fontWeight: '700', marginLeft: spacing.sm }}>{t("Add to List")}</Text>
                   </Pressable>
                </View>
              </View>
            )}
          </View>

          {/* Pesticides */}
          <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: formData.pesticides_given ? spacing.md : 0 }}>
              <Text style={{ fontWeight: '700', color: colors.text, fontSize: 14 }}>{t("Pesticides Given?")}</Text>
              <Switch 
                value={formData.pesticides_given} 
                onValueChange={v => setFormData({ ...formData, pesticides_given: v })} 
                trackColor={{ false: '#d1d5db', true: '#34d399' }}
                thumbColor={formData.pesticides_given ? '#10b981' : '#f3f4f6'}
              />
            </View>

            {formData.pesticides_given && (
              <View>
                {formData.pesticides_applied.length > 0 && (
                  <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing.md }}>
                    <View style={{ flexDirection: 'row', backgroundColor: colors.screen, padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <Text style={{ flex: 2, fontWeight: '700', fontSize: 12 }}>{t("Name")}</Text>
                      <Text style={{ flex: 1, fontWeight: '700', fontSize: 12 }}>{t("Qty")}</Text>
                      <Text style={{ flex: 2, fontWeight: '700', fontSize: 12 }}>{t("Method")}</Text>
                      <View style={{ width: 30 }} />
                    </View>
                    {formData.pesticides_applied.map((pest: any, idx: number) => (
                      <View key={idx} style={{ flexDirection: 'row', padding: spacing.sm, borderBottomWidth: idx === formData.pesticides_applied.length - 1 ? 0 : 1, borderBottomColor: colors.border, alignItems: 'center', backgroundColor: colors.surface }}>
                        <Text style={{ flex: 2, fontSize: 12 }}>{pest.name}</Text>
                        <Text style={{ flex: 1, fontSize: 12 }}>{pest.quantity} {pest.unit}</Text>
                        <Text style={{ flex: 2, fontSize: 12 }}>{pest.method}</Text>
                        <Pressable onPress={() => {
                          const newArr = [...formData.pesticides_applied];
                          newArr.splice(idx, 1);
                          setFormData({ ...formData, pesticides_applied: newArr });
                        }} style={{ width: 30, alignItems: 'flex-end' }}>
                          <Feather name="trash-2" size={16} color="#ef4444" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                <View style={{ backgroundColor: colors.screen, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border }}>
                   <Text style={{ fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>{t("Add New Pesticide")}</Text>
                   
                   <Text style={styles.label}>{t("Name")}</Text>
                   <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 48, justifyContent: 'center', marginBottom: spacing.sm }}>
                     <TextInput 
                       placeholder={t("Start typing...")}
                       value={currentPesticide.name}
                       onChangeText={t => setCurrentPesticide({ ...currentPesticide, name: t })}
                       style={{ fontSize: 16, color: colors.text }}
                     />
                   </View>
                   {currentPesticide.name.length > 1 && !products.includes(currentPesticide.name) && (
                      <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, maxHeight: 120, marginBottom: spacing.sm }}>
                         <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                           {products.filter(p => p.toLowerCase().includes(currentPesticide.name.toLowerCase())).map((p, pIdx) => (
                             <Pressable key={pIdx} style={{ padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.screen }} onPress={() => {
                                setCurrentPesticide({ ...currentPesticide, name: p });
                             }}>
                               <Text>{p}</Text>
                             </Pressable>
                           ))}
                           {products.filter(p => p.toLowerCase().includes(currentPesticide.name.toLowerCase())).length === 0 && (
                             <Text style={{ padding: spacing.sm, color: colors.textMuted, fontStyle: 'italic' }}>No suggestions found.</Text>
                           )}
                         </ScrollView>
                      </View>
                   )}

                   <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                     <View style={{ flex: 1 }}>
                       <Input 
                         label={t("Quantity")}
                         placeholder="0"
                         keyboardType="numeric"
                         value={currentPesticide.quantity.toString()}
                         onChangeText={t => setCurrentPesticide({ ...currentPesticide, quantity: t })}
                       />
                     </View>
                     <View style={{ flex: 1 }}>
                       <SelectField 
                         label={t("Unit")}
                         placeholder={t("Select")}
                         options={['kg', 'L', 'g', 'ml']}
                         value={currentPesticide.unit}
                         onChange={v => setCurrentPesticide({ ...currentPesticide, unit: v })}
                       />
                     </View>
                   </View>

                   <Input 
                     label={t("Method")}
                     placeholder={t("e.g. Spray, Drenching")}
                     value={currentPesticide.method}
                     onChangeText={t => setCurrentPesticide({ ...currentPesticide, method: t })}
                   />
                   
                   <Pressable onPress={() => {
                      if (!currentPesticide.name) {
                        Alert.alert("Error", "Please enter a pesticide name");
                        return;
                      }
                      setFormData({ ...formData, pesticides_applied: [...formData.pesticides_applied, currentPesticide] });
                      setCurrentPesticide({ name: '', quantity: '', unit: 'L', method: '' });
                   }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.md, borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed', borderRadius: radius.md, marginTop: spacing.sm }}>
                      <Feather name="plus" size={16} color="#065F46" />
                      <Text style={{ color: colors.primary, fontWeight: '700', marginLeft: spacing.sm }}>{t("Add to List")}</Text>
                   </Pressable>
                </View>
              </View>
            )}
          </View>

          <TextArea
            label={t("General Problems/Observations")}
            placeholder={t("Describe any issues or general observations...")}
            value={formData.general_observations}
            onChangeText={t => setFormData({ ...formData, general_observations: t })}
          />

          <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginTop: spacing.md }}>
            <Text style={{ fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>{t("General Visit Photos (Optional)")}</Text>
            {visitPhotos.length > 0 && (
              <ScrollView horizontal style={{ marginBottom: spacing.md }}>
                {visitPhotos.map((photo, idx) => (
                  <View key={idx} style={{ position: 'relative', marginRight: spacing.sm }}>
                    <Image source={{ uri: photo }} style={{ width: 80, height: 80, borderRadius: radius.sm }} />
                    <Pressable 
                      style={{ position: 'absolute', top: -5, right: -5, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 2 }}
                      onPress={() => {
                        const newArr = [...visitPhotos];
                        newArr.splice(idx, 1);
                        setVisitPhotos(newArr);
                      }}>
                      <MaterialIcons name="close" size={14} color="#FFF" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}
            <Pressable onPress={handleCapturePhoto} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.md, borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed', borderRadius: radius.md }}>
              <Feather name="camera" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '700', marginLeft: spacing.sm }}>{t("Capture Photo")}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Footer */}
      <View style={{ padding: spacing.xl, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Button 
          label={isLoading ? t("Saving...") : t("Submit")} 
          onPress={handleSave} 
          loading={isLoading} 
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.xs, marginLeft: 4 }
});
