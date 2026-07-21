import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing, shadows } from '../../../../design-system/tokens';
import { supabase } from '../../../../core/supabase';
import { Button } from '../../../../design-system/components';

export const FarmDiaryCalendarScreen = ({ route, navigation }: any) => {
  const { t } = useTranslation();
  const { diary } = route.params;

  const [loading, setLoading] = useState(false);
  const [sopData, setSopData] = useState<any[]>([]);

  useEffect(() => {
    // Check prerequisites
    if (!diary.is_sowing_done || !diary.sowing_date) {
      return; // Will render empty state
    }
    
    fetchSopData();
  }, [diary]);

  const fetchSopData = async () => {
    setLoading(true);
    try {
      // 1. Get the crop ID based on the farm_name (Crop Name)
      const { data: cropData, error: cropError } = await supabase
        .from('master_crops')
        .select('id')
        .eq('crop_name', diary.farm_name)
        .single();
        
      if (cropError || !cropData) {
        throw new Error('Could not find corresponding crop in master records.');
      }

      // 2. Fetch SOP data using the deep join
      const { data, error } = await supabase.from('sop_crop_stages')
        .select(`
          id, stage_sequence, chemical_recommendation_and_dosage,
          master_crop_stages ( stage_name ),
          sop_applications ( 
            id, application_type, das, application_method, dosage_value, benefit, impact, recommendation, chemical_name, chemical_dosage,
            master_gls_products ( product_name )
          ),
          sop_parameters ( 
            is_mandatory, 
            master_parameters ( parameter_label ) 
          )
        `)
        .eq('crop_id', cropData.id)
        .order('stage_sequence', { ascending: true });

      if (error) {
        throw error;
      }

      if (data) {
        // 3. Format and sort applications by DAS
        const formattedData = data.map((stage: any) => {
          if (stage.sop_applications) {
            stage.sop_applications.sort((a: any, b: any) => Number(a.das) - Number(b.das));
            
            // Calculate expected dates for each application
            const sowingDateObj = new Date(diary.sowing_date);
            stage.sop_applications = stage.sop_applications.map((app: any) => {
              const expectedDateObj = new Date(sowingDateObj);
              expectedDateObj.setDate(expectedDateObj.getDate() + Number(app.das || 0));
              
              // Format date as YYYY-MM-DD
              const expectedDate = expectedDateObj.toISOString().split('T')[0];
              return { ...app, expected_date: expectedDate };
            });
          }
          return stage;
        });
        setSopData(formattedData);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to fetch calendar data.');
    } finally {
      setLoading(false);
    }
  };

  const getDayDifferenceText = (expectedDate: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(expectedDate);
    target.setHours(0,0,0,0);
    
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return t("Today");
    if (diffDays === 1) return t("Tomorrow");
    if (diffDays === -1) return t("Yesterday");
    if (diffDays > 1) return t("In {{days}} days", { days: diffDays });
    return t("{{days}} days ago", { days: Math.abs(diffDays) });
  };

  const getStatusColor = (expectedDate: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(expectedDate);
    target.setHours(0,0,0,0);
    
    if (target < today) return colors.danger; // Overdue
    if (target.getTime() === today.getTime()) return colors.warning; // Due today
    return colors.success; // Upcoming
  };

  if (!diary.is_sowing_done || !diary.sowing_date) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.screen }}>
        <View style={{ padding: spacing.xl, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Pressable onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
                <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginLeft: spacing.sm }}>{t("Back")}</Text>
              </Pressable>
              <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text }}>{t("Calendar")}</Text>
              <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 4 }}>
                {diary.farm_name || "Farm Diary"}
              </Text>
            </View>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
          <MaterialIcons name="event-busy" size={64} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: spacing.sm }}>
            {t("Sowing Date Required")}
          </Text>
          <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xl }}>
            {t("To generate the crop calendar, please edit the Farm Diary Profile and set the exact Date of Sowing.")}
          </Text>
          <Button label={t("Edit Farm Diary")} onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.screen }}>
      <View style={{ padding: spacing.xl, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Pressable onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
              <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginLeft: spacing.sm }}>{t("Back")}</Text>
            </Pressable>
            <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text }}>{t("Calendar")}</Text>
            <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 4 }}>
              {diary.farm_name || "Farm Diary"}
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: spacing.md, color: colors.textMuted }}>{t("Generating calendar...")}</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1, padding: spacing.xl }}>
          <View style={{ marginBottom: spacing.lg }}>
            <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 4 }}>
              {t("Date of Sowing:")} {diary.sowing_date}
            </Text>
          </View>

          {sopData.length === 0 ? (
            <View style={{ padding: spacing.xl, alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted, fontStyle: 'italic' }}>{t("No SOP data found for this crop.")}</Text>
            </View>
          ) : (
            sopData.map((stage: any, index: number) => (
              <View key={stage.id} style={{ marginBottom: spacing.xl }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm }}>
                    <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>{index + 1}</Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 }}>
                    {stage.master_crop_stages?.stage_name || `Stage ${stage.stage_sequence}`}
                  </Text>
                </View>

                {(!stage.sop_applications || stage.sop_applications.length === 0) ? (
                   <View style={{ paddingLeft: 40 }}>
                     <Text style={{ color: colors.textMuted, fontStyle: 'italic', fontSize: 14 }}>{t("No applications scheduled for this stage.")}</Text>
                   </View>
                ) : (
                  <View style={{ paddingLeft: 14, borderLeftWidth: 2, borderLeftColor: colors.border, marginLeft: 13 }}>
                    {stage.sop_applications.map((app: any) => (
                      <View key={app.id} style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, marginLeft: spacing.lg, ...shadows.soft }}>
                        {/* Expected Date Header */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialIcons name="event" size={18} color={getStatusColor(app.expected_date)} style={{ marginRight: 6 }} />
                            <Text style={{ fontWeight: '700', color: colors.text, fontSize: 15 }}>{app.expected_date}</Text>
                          </View>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: getStatusColor(app.expected_date) }}>
                            {getDayDifferenceText(app.expected_date)}
                          </Text>
                        </View>
                        
                        {/* Task Details */}
                        <View style={{ gap: 6 }}>
                          <View style={{ flexDirection: 'row' }}>
                            <Text style={{ fontWeight: '600', color: colors.text, width: 90 }}>{t("Task:")}</Text>
                            <Text style={{ color: colors.text, flex: 1 }}>{app.application_type} ({app.application_method})</Text>
                          </View>
                          
                          {(app.chemical_name || app.master_gls_products?.product_name) && (
                            <View style={{ flexDirection: 'row' }}>
                              <Text style={{ fontWeight: '600', color: colors.text, width: 90 }}>{t("Product:")}</Text>
                              <Text style={{ color: colors.text, flex: 1 }}>
                                {app.master_gls_products?.product_name || app.chemical_name}
                              </Text>
                            </View>
                          )}
                          
                          {(app.dosage_value || app.chemical_dosage) && (
                            <View style={{ flexDirection: 'row' }}>
                              <Text style={{ fontWeight: '600', color: colors.text, width: 90 }}>{t("Dosage:")}</Text>
                              <Text style={{ color: colors.text, flex: 1 }}>
                                {app.dosage_value || app.chemical_dosage}
                              </Text>
                            </View>
                          )}
                          
                          <View style={{ flexDirection: 'row' }}>
                            <Text style={{ fontWeight: '600', color: colors.text, width: 90 }}>{t("DAS:")}</Text>
                            <Text style={{ color: colors.textMuted, flex: 1 }}>{app.das} {t("days after sowing")}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))
          )}
          <View style={{ height: spacing['3xl'] }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};
