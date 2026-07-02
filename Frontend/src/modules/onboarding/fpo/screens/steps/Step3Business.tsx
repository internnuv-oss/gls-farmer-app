// Frontend/src/modules/onboarding/fpo/screens/steps/Step3Business.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal, ScrollView, TextInput } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, RadioGroup, TagsInput, SelectField } from '../../../../../design-system/components';
import { spacing, colors, radius, shadows } from '../../../../../design-system/tokens';
import { FPOOnboardingValues } from '../../schema';
import { supabase } from '../../../../../core/supabase';

interface Props { form: UseFormReturn<FPOOnboardingValues>; t: any; }

export const Step3Business = ({ form, t }: Props) => {
  const { control, watch, setValue } = form;
  
  const selectedState = watch('state');
  const territories = watch('allottedTerritories') || [{ district: '', taluka: '', villages: [] }];

  const [stateData, setStateData] = useState<any>(null);
  const [loadingLoc, setLoadingLoc] = useState(false);

  // Custom Multi-Select Modal State
  const [activeDropdownIndex, setActiveDropdownIndex] = useState<number | null>(null);
  const [villageSearchQuery, setVillageSearchQuery] = useState('');

  useEffect(() => {
    if (!selectedState) return;
    
    const fetchStateData = async () => {
      setLoadingLoc(true);
      try {
        // 🚀 Fetch directly from Supabase RPC
        const { data, error } = await supabase.rpc('get_gujarat_location_tree');
        if (error || !data) throw new Error("Location data not found.");
        
        setStateData(data);
      } catch (e) {
        setStateData(null);
      } finally { 
        setLoadingLoc(false); 
      }
    };
    
    fetchStateData();
  }, [selectedState]);

  const getDistrictsList = () => {
    if (!stateData || !stateData.districts) return [];
    return stateData.districts.map((d: any) => d.district).sort();
  };

  const getTalukasList = (districtName: string) => {
    if (!stateData || !stateData.districts || !districtName) return [];
    const dist = stateData.districts.find((d: any) => d.district === districtName);
    return dist?.subDistricts?.map((sd: any) => sd.subDistrict).sort() || [];
  };

  const getVillagesList = (districtName: string, talukaName: string) => {
    if (!stateData || !stateData.districts || !districtName || !talukaName) return [];
    const dist = stateData.districts.find((d: any) => d.district === districtName);
    const taluka = dist?.subDistricts?.find((sd: any) => sd.subDistrict === talukaName);
    return taluka?.villages?.sort() || [];
  };

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing.lg }}>{t("Business Scope & Appointment")}</Text>
      
      {/* GROUP 1: Dynamic Territory Blocks */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, ...shadows.soft }}>
        <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.sm }}>{t("Allotted Operational Territory")}</Text>
        
        {!selectedState && (
          <Text style={{ color: colors.danger, marginBottom: spacing.md, fontStyle: 'italic', fontSize: 13, backgroundColor: '#FEE2E2', padding: 8, borderRadius: 4 }}>
            {t("⚠ Please select a State in Step 1 to load territory options.")}
          </Text>
        )}

        {territories.map((territory: any, index: number) => {
          const districtOptions = getDistrictsList();
          const talukaOptions = getTalukasList(territory.district);
          const allVillages = getVillagesList(territory.district, territory.taluka);
          
          // Filter villages based on search query in the modal
          const filteredVillages = allVillages.filter((v: string) => 
            v.toLowerCase().includes(villageSearchQuery.toLowerCase())
          );

          const isTalukaDisabled = !territory.district;
          const isVillageDisabled = !territory.taluka;

          return (
            <View key={index} style={{ backgroundColor: '#F8FAFC', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8 }}>
                <Text style={{ fontWeight: '800', color: colors.text }}>{t("Territory Block")} {index + 1}</Text>
                {index > 0 && (
                  <Pressable hitSlop={10} onPress={() => {
                    const newTerritories = territories.filter((_: any, i: number) => i !== index);
                    setValue('allottedTerritories', newTerritories, { shouldValidate: true });
                  }}>
                    <MaterialIcons name="close" size={20} color={colors.danger} />
                  </Pressable>
                )}
              </View>

              {/* 1. District */}
              <Controller 
                control={control} 
                name={`allottedTerritories.${index}.district`} 
                render={({field}) => (
                  <SelectField 
                    label={loadingLoc ? t("District (Loading...) *") : t("District *")} 
                    value={field.value ?? ''} 
                    options={districtOptions} 
                    searchable 
                    onChange={(val) => { 
                      field.onChange(val); 
                      setValue(`allottedTerritories.${index}.taluka`, '', { shouldValidate: true }); 
                      setValue(`allottedTerritories.${index}.villages`, [], { shouldValidate: true }); 
                    }} 
                    error={form.formState.errors.allottedTerritories?.[index]?.district?.message} 
                  />
                )} 
              />

              {/* 2. Taluka */}
              <View pointerEvents={isTalukaDisabled ? "none" : "auto"} style={{ opacity: isTalukaDisabled ? 0.5 : 1 }}>
                <Controller 
                  control={control} 
                  name={`allottedTerritories.${index}.taluka`} 
                  render={({field}) => (
                    <SelectField 
                      label={t("Taluka *")} 
                      value={field.value ?? ''} 
                      options={talukaOptions} 
                      searchable 
                      onChange={(val) => {
                        field.onChange(val);
                        setValue(`allottedTerritories.${index}.villages`, [], { shouldValidate: true });
                      }} 
                      error={form.formState.errors.allottedTerritories?.[index]?.taluka?.message} 
                    />
                  )} 
                />
              </View>

              {/* 3. MULTI-SELECT CHECKLIST FOR VILLAGES */}
              <View pointerEvents={isVillageDisabled ? "none" : "auto"} style={{ opacity: isVillageDisabled ? 0.5 : 1, marginBottom: spacing.sm }}>
                <Controller 
                  control={control} 
                  name={`allottedTerritories.${index}.villages`} 
                  render={({field}) => (
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 6 }}>{t("Select Villages *")}</Text>
                      
                      {/* Fake Input Box that opens the Modal */}
                      <Pressable 
                        onPress={() => { setActiveDropdownIndex(index); setVillageSearchQuery(''); }}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderWidth: 1, borderColor: form.formState.errors.allottedTerritories?.[index]?.villages?.message ? colors.danger : colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12 }}
                      >
                        <Text style={{ color: field.value?.length > 0 ? colors.text : colors.textMuted, flex: 1, fontSize: 14 }} numberOfLines={1}>
                          {field.value?.length > 0 ? field.value.join(', ') : t("Tap to select villages...")}
                        </Text>
                        <MaterialIcons name="arrow-drop-down" size={24} color={colors.textMuted} />
                      </Pressable>
                      
                      {form.formState.errors.allottedTerritories?.[index]?.villages?.message && (
                        <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{form.formState.errors.allottedTerritories?.[index]?.villages?.message as string}</Text>
                      )}

                      {/* Modal with Checklist */}
                      <Modal visible={activeDropdownIndex === index} animationType="slide" transparent={true} onRequestClose={() => setActiveDropdownIndex(null)}>
                        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, height: '75%', padding: spacing.md, paddingBottom: 40 }}>
                            
                            {/* Modal Header */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{t("Select Villages")}</Text>
                              <Pressable onPress={() => setActiveDropdownIndex(null)} hitSlop={10}>
                                <MaterialIcons name="close" size={24} color={colors.text} />
                              </Pressable>
                            </View>

                            {/* Search Bar */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: radius.md, paddingHorizontal: 12, marginBottom: spacing.md }}>
                              <MaterialIcons name="search" size={20} color={colors.textMuted} />
                              <TextInput 
                                style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 16, color: colors.text }}
                                placeholder={t("Search villages...")}
                                value={villageSearchQuery}
                                onChangeText={setVillageSearchQuery}
                              />
                              {villageSearchQuery.length > 0 && (
                                <Pressable onPress={() => setVillageSearchQuery('')}><MaterialIcons name="cancel" size={20} color={colors.textMuted} /></Pressable>
                              )}
                            </View>

                            {/* Select All / Clear All (Optional Helper) */}
                            {filteredVillages.length > 0 && (
                              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
                                <Pressable onPress={() => field.onChange([])}>
                                  <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>{t("Clear All")}</Text>
                                </Pressable>
                              </View>
                            )}

                            {/* Checklist */}
                            <ScrollView showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled">
                              {filteredVillages.length === 0 ? (
                                <Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 20 }}>{t("No villages found.")}</Text>
                              ) : (
                                filteredVillages.map((v: string, vIndex: number) => {
                                  const isSelected = field.value?.includes(v);
                                  return (
                                    <Pressable 
                                      key={vIndex}
                                      onPress={() => {
                                        if (isSelected) {
                                          field.onChange(field.value.filter((val: string) => val !== v));
                                        } else {
                                          field.onChange([...(field.value || []), v]);
                                        }
                                      }}
                                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
                                    >
                                      <MaterialIcons 
                                        name={isSelected ? "check-box" : "check-box-outline-blank"} 
                                        size={24} 
                                        color={isSelected ? colors.primary : colors.textMuted} 
                                        style={{ marginRight: 12 }}
                                      />
                                      <Text style={{ fontSize: 16, color: isSelected ? colors.primary : colors.text, fontWeight: isSelected ? '700' : '500' }}>{v}</Text>
                                    </Pressable>
                                  )
                                })
                              )}
                            </ScrollView>

                            {/* Done Button */}
                            <Pressable 
                              onPress={() => setActiveDropdownIndex(null)}
                              style={{ backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.md }}
                            >
                              <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>{t("Done")} ({field.value?.length || 0} selected)</Text>
                            </Pressable>
                            
                          </View>
                        </View>
                      </Modal>
                    </View>
                  )} 
                />
              </View>
            </View>
          );
        })}

        <Pressable 
          disabled={!selectedState || loadingLoc}
          onPress={() => setValue('allottedTerritories', [...territories, { district: '', taluka: '', villages: [] }])} 
          style={{ padding: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: (selectedState && !loadingLoc) ? colors.primary : colors.textMuted, borderRadius: radius.md, alignItems: 'center', opacity: (selectedState && !loadingLoc) ? 1 : 0.5, marginTop: spacing.xs }}
        >
          <Text style={{ color: (selectedState && !loadingLoc) ? colors.primary : colors.textMuted, fontWeight: '800' }}>+ {t("Add Another Territory Block")}</Text>
        </Pressable>
      </View>

      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, ...shadows.soft }}>
        <Controller control={control} name="expectedOfftake" render={({field}) => <Input label={t("Expected Seasonal Bio-Input Off-take Potential (₹) *")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" placeholder="e.g. 500000" error={form.formState.errors.expectedOfftake?.message} />} />
      </View>

      {/* GROUP 2: Current Operations */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, ...shadows.soft }}>
        <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.sm }}>{t("Current Operations")}</Text>
        <Controller 
          control={control} 
          name="currentSuppliers" 
          render={({field}) => (
            <TagsInput 
              label={t("Current Input Supplier Companies")} 
              value={field.value || []} 
              onChange={field.onChange} 
              placeholder={t("Add supplier + Enter")} 
            />
          )} 
        />
      </View>
      
      {/* GROUP 3: Partnership Tier & Commitment */}
      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, ...shadows.soft }}>
        <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: spacing.sm }}>{t("Partnership Details")}</Text>
        <Controller 
          control={control} 
          name="partnershipTier" 
          render={({field}) => (
            <RadioGroup 
              label={t("Proposed Partnership Tier *")} 
              options={['Anchor FPO Partner', 'Cluster-Level Input Center']} 
              value={field.value} 
              onChange={field.onChange} 
              error={form.formState.errors.partnershipTier?.message}
            />
          )} 
        />
        <Controller control={control} name="demoFarmersCommitment" render={({field}) => <Input label={t("Commitment to Demonstration Farmers *")} value={field.value} onChangeText={field.onChange} keyboardType="numeric" placeholder={t("Minimum village clusters activated")} error={form.formState.errors.demoFarmersCommitment?.message} />} />
      </View>
    </View>
  );
};