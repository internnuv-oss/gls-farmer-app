import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../../core/supabase';
import { colors, radius, spacing, shadows } from '../../../design-system/tokens';

export const FarmCardsListScreen = ({ route, navigation }: any) => {
  const { t } = useTranslation();
  const { farmer } = route.params;
  const farmerId = farmer.id || farmer.entityId;

  const [farmCards, setFarmCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCardsFromDB = async () => {
    try {
      const { data, error } = await supabase
        .from('farm_cards')
        .select('*')
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error("Failed to fetch farm cards", err);
      return null;
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadInitial = async () => {
        const data = await fetchCardsFromDB();
        if (isActive) {
          if (!data || data.length === 0) {
            navigation.replace("FarmCardOnboardingScreen", { farmer });
          } else {
            setFarmCards(data);
          }
          setLoading(false);
        }
      };

      loadInitial();
      return () => { isActive = false; };
    }, [farmerId, navigation, farmer])
  );

  // 🚀 NEW: Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    const data = await fetchCardsFromDB();
    if (data) setFarmCards(data);
    setRefreshing(false);
  };

  // 🚀 Replace useEffect with useFocusEffect to fetch fresh data EVERY time the screen is viewed
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchFarmCards = async () => {
        try {
          const { data, error } = await supabase
            .from('farm_cards')
            .select('*')
            .eq('farmer_id', farmerId)
            .order('created_at', { ascending: false });

          if (error) throw error;

          if (isActive) {
            // SMART ROUTING: If exactly 0 cards exist, bypass this screen entirely
            if (!data || data.length === 0) {
              navigation.replace("FarmCardOnboardingScreen", { farmer });
            } else {
              setFarmCards(data);
            }
          }
        } catch (err) {
          console.error("Failed to fetch farm cards", err);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      fetchFarmCards();

      // Cleanup function to prevent state updates if the user navigates away before fetch completes
      return () => {
        isActive = false;
      };
    }, [farmerId, navigation, farmer])
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.screen, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: spacing.md, color: colors.textMuted, fontWeight: '700' }}>{t("Checking Farm Records...")}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.screen }}>
      <View style={{ padding: spacing.xl, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginLeft: spacing.sm }}>{t("Back to Hub")}</Text>
        </Pressable>
        <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text }}>{t("Farm Cards")}</Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '600' }}>{farmer.name || t("Farmer")}</Text>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: spacing.xl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        {farmCards.map((card, index) => (
          <Pressable
          key={card.id}
          onPress={() => {
            if (card.status === 'DRAFT') {
              // 🚀 Route to Onboarding and pass the draft data
              navigation.navigate("FarmCardOnboardingScreen", { farmer, draftCard: card });
            } else {
              // Route to read-only details
              navigation.navigate("FarmCardDetailsScreen", { farmCard: card });
            }
          }}
            style={{
              backgroundColor: colors.surface,
              padding: spacing.lg,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              marginBottom: spacing.md,
              ...shadows.soft,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="agriculture" size={24} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>
                  {t("Farm")} {farmCards.length - index}
                </Text>
              </View>
              <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm }}>
                <Text style={{ color: '#16A34A', fontSize: 12, fontWeight: '800' }}>{card.status}</Text>
              </View>
            </View>
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: colors.screen, paddingTop: spacing.sm, gap: 12 }}>
              <View style={{ width: '45%' }}>
                <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>{t("Total Area")}</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>
                  {card.card_data?.totalLandArea || '--'} {card.card_data?.totalLandAreaUnit || ''}
                </Text>
              </View>
              <View style={{ width: '45%' }}>
                <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>{t("Cultivated Area")}</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>
                  {card.card_data?.cultivatedArea || '--'} {card.card_data?.cultivatedAreaUnit || ''}
                </Text>
              </View>
              <View style={{ width: '45%' }}>
                <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>{t("Field / Plot")}</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }} numberOfLines={1}>
                  {[card.card_data?.fieldNumber, card.card_data?.plotNumber].filter(Boolean).join(' / ') || '--'}
                </Text>
              </View>
              <View style={{ width: '45%' }}>
                <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>{t("Soil & Water")}</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }} numberOfLines={1}>
                  {card.card_data?.soilType || '--'} • {card.card_data?.waterSource || '--'}
                </Text>
              </View>
              
              <View style={{ position: 'absolute', right: 0, bottom: 10 }}>
                <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
              </View>
            </View>
          </Pressable>
        ))}

        {/* 🚀 ADD ANOTHER FARM CARD BUTTON */}
        <Pressable
          onPress={() => navigation.navigate("FarmCardOnboardingScreen", { farmer })}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F8FAFC',
            padding: spacing.xl,
            borderRadius: radius.lg,
            borderWidth: 2,
            borderColor: colors.primary,
            borderStyle: 'dashed',
            marginTop: spacing.sm,
            marginBottom: 40,
          }}
        >
          <MaterialIcons name="add-circle" size={28} color={colors.primary} style={{ marginRight: spacing.sm }} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{t("Add Another Farm Card")}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};