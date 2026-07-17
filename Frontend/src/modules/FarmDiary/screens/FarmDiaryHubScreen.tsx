import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing, shadows } from '../../../design-system/tokens';
import { useFarmDiaryStore } from '../../../store/farmDiaryStore';
import { supabase } from '../../../core/supabase';

export const FarmDiaryHubScreen = ({ route, navigation }: any) => {
  const { t } = useTranslation();
  const { farmer } = route.params;
  const farmerId = farmer.id || farmer.entityId;

  const { diaries, isLoading: diariesLoading, fetchDiaries } = useFarmDiaryStore();
  const [farmCards, setFarmCards] = useState<any[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  
  // State for accordion: track which Farm Card is expanded
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  useEffect(() => {
    fetchDiaries(farmerId);
    
    const fetchCards = async () => {
      setLoadingCards(true);
      const { data } = await supabase
        .from('farm_cards')
        .select('*')
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false });
      
      if (data) setFarmCards(data);
      setLoadingCards(false);
    };
    
    fetchCards();
  }, [farmerId]);

  const isLoading = diariesLoading || loadingCards;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.screen }}>
      <View style={{ padding: spacing.xl, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginLeft: spacing.sm }}>{t("Back")}</Text>
        </Pressable>
        <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text }}>
          {t("Farm Diaries")}
        </Text>
      </View>

      <ScrollView style={{ flex: 1, padding: spacing.xl }}>
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : farmCards.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <MaterialIcons name="agriculture" size={64} color={colors.textMuted} />
            <Text style={{ marginTop: 16, fontSize: 16, color: colors.textMuted, textAlign: 'center' }}>
              {t("No Farm Cards found. Create a Farm Card first to start logging diaries.")}
            </Text>
          </View>
        ) : (
          farmCards.map((card, index) => {
            const cardDiaries = diaries.filter(d => d.farm_card_id === card.id);
            const isExpanded = expandedCardId === card.id;

            return (
              <View key={card.id} style={{ marginBottom: spacing.md }}>
                {/* Farm Card Action Card */}
                <Pressable 
                  onPress={() => setExpandedCardId(isExpanded ? null : card.id)}
                  style={{
                    backgroundColor: colors.surface, 
                    padding: spacing.lg, 
                    borderRadius: radius.lg, 
                    borderWidth: 1, 
                    borderColor: isExpanded ? colors.primary : colors.border, 
                    ...shadows.soft
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialIcons name="agriculture" size={24} color={isExpanded ? colors.primary : colors.text} style={{ marginRight: 12 }} />
                      <View>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>
                          {t("Farm")} {farmCards.length - index}
                        </Text>
                        <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 2 }}>
                          {cardDiaries.length} {t("Diaries")}
                        </Text>
                      </View>
                    </View>
                    <MaterialIcons name={isExpanded ? "expand-less" : "expand-more"} size={24} color={colors.textMuted} />
                  </View>
                </Pressable>

                {/* Expanded Diaries List */}
                {isExpanded && (
                  <View style={{ marginTop: spacing.sm, marginLeft: spacing.xl, paddingLeft: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.border }}>
                    {cardDiaries.length === 0 ? (
                      <Text style={{ color: colors.textMuted, fontStyle: 'italic', marginVertical: spacing.md }}>
                        {t("No farm diaries found for this farm.")}
                      </Text>
                    ) : (
                      cardDiaries.map(diary => (
                        <Pressable
                          key={diary.id}
                          onPress={() => navigation.navigate("FarmDiaryDashboardScreen", { diary })}
                          style={{
                            backgroundColor: '#F8FAFC', 
                            padding: spacing.md, 
                            borderRadius: radius.md, 
                            borderWidth: 1, 
                            borderColor: colors.border, 
                            marginBottom: spacing.sm
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View>
                              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                                {diary.farm_name || "Unnamed Farm Diary"}
                              </Text>
                              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                                {t("Area")}: {diary.total_land_area_acres} Acres
                              </Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
                          </View>
                        </Pressable>
                      ))
                    )}

                    <Pressable
                      onPress={() => navigation.navigate("FarmDiarySetupScreen", { farmer, preselectedFarmCardId: card.id })}
                      style={{
                        flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs, paddingVertical: spacing.sm
                      }}
                    >
                      <MaterialIcons name="add-circle-outline" size={20} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontWeight: '700', marginLeft: 8 }}>
                        {t("Add New Diary Here")}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};
