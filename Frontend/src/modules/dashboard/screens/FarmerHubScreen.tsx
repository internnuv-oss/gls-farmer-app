import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing, shadows } from '../../../design-system/tokens';
import { supabase } from '../../../core/supabase';

export const FarmerHubScreen = ({ route, navigation }: any) => {
  const { t } = useTranslation();
  
  const [localEntity, setLocalEntity] = useState(route.params.entity);
  const [refreshing, setRefreshing] = useState(false);
  const [hasFarmCard, setHasFarmCard] = useState(false);

  React.useEffect(() => {
    checkFarmCards();
  }, []);

  const checkFarmCards = async () => {
    try {
      const farmerId = localEntity.id || localEntity.entityId;
      const { data } = await supabase
        .from('farm_cards')
        .select('id')
        .eq('farmer_id', farmerId)
        .limit(1);
      
      setHasFarmCard(!!(data && data.length > 0));
    } catch (e) {
      console.error("Failed to check farm cards", e);
    }
  };

  // 🚀 NEW: Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Assuming your table is named 'farmers'. Adjust if it's 'profiles'.
      const { data, error } = await supabase
        .from('farmers')
        .select('*')
        .eq('id', localEntity.id || localEntity.entityId)
        .single();
        
      if (data && !error) {
        // Merge the fresh database row into the `raw` property
        setLocalEntity((prev: any) => ({ ...prev, raw: data }));
      }
      await checkFarmCards();
    } catch (e) {
      console.error("Failed to refresh farmer hub", e);
    } finally {
      setRefreshing(false);
    }
  };

  // 🚀 Update these to use localEntity instead of entity
  const isDraft = localEntity.isDraft;
  const village = localEntity.raw?.personal_details?.village || localEntity.city || localEntity.village || "Unknown Village";
  const state = localEntity.raw?.personal_details?.state || localEntity.state || "Unknown State";

  // 🚀 NEW: Extract FSPP and Approval Logic
  const fsppDetails = localEntity.raw?.fspp_details;
  const hasFspp = !!fsppDetails?.statusLabel;
  const fsppCategory = fsppDetails?.category; // e.g., 'Category A', 'Category B'
  
  // Check if admin has explicitly approved this profile (Checking standard fallback paths)
  const isProfileApproved = localEntity.raw?.fspp_approval_status === 'APPROVED' || fsppDetails?.approvalStatus === 'APPROVED';
  
  // They can access if they are Category A or B, OR if they are another category but approved by Admin
  const canAccessFarmCards = ['Category A', 'Category B'].includes(fsppCategory) || isProfileApproved;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.screen }}>
      {/* Header section */}
      <View style={{ padding: spacing.xl, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginLeft: spacing.sm }}>{t("Back")}</Text>
        </Pressable>
        
        <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text, marginBottom: spacing.xs }}>
          {localEntity.name}
        </Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '600' }}>
          {village}, {state}
        </Text>
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: spacing.xl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        
        {/* Action Cards Container */}
        <View style={{ flex: 1 }}>
            
            {/* The primary Action Card */}
            <Pressable
              onPress={() => {
                if (isDraft) {
                  navigation.navigate("FarmerOnboarding", { 
                    draftId: localEntity.entityId, 
                    draftData: localEntity.raw, 
                    initialStep: localEntity.step 
                  });
                } else {
                  navigation.navigate("EntityProfile", { entity: localEntity });
                }
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surface,
                padding: spacing.xl,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: isDraft ? colors.warning : colors.success,
                marginBottom: spacing.lg,
                ...shadows.soft,
              }}
            >
              <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: isDraft ? '#FEF3C7' : '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginRight: spacing.lg }}>
                <MaterialIcons name={isDraft ? "edit-document" : "person"} size={28} color={isDraft ? '#D97706' : '#166534'} />
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>
                  {isDraft ? t("Resume Onboarding") : t("Farmer Profile")}
                </Text>
                {isDraft && (
                  <Text style={{ fontSize: 12, color: '#D97706', fontWeight: '700', marginTop: 4 }}>
                    {t("Draft Incomplete")}
                  </Text>
                )}
              </View>

              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
              </View>
            </Pressable>

            {/* General Visit Card */}
            <Pressable
              onPress={() => {
                navigation.navigate("GeneralVisit", { entity: localEntity });
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surface,
                padding: spacing.xl,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: '#DC2626', // 🚀 Matching red border
                marginBottom: spacing.lg,
                ...shadows.soft,
              }}
            >
              <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginRight: spacing.lg }}>
                <MaterialIcons name="event" size={28} color="#DC2626" />
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>
                  {t("General Visit")}
                </Text>
              </View>

              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
              </View>
            </Pressable>

            {/* FSPP Enrollment Card */}
            {!isDraft && (
              <Pressable
                onPress={() => {
                  navigation.navigate("FSPPEnrollment", { entity: { ...localEntity, raw: localEntity.raw } });
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.surface,
                  padding: spacing.xl,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: localEntity.raw?.fspp_details?.statusLabel ? "#166534" : "#2563EB", // 🚀 Dynamic colorful border based on completion status
                  marginBottom: spacing.lg,
                  ...shadows.soft,
                }}
              >
                <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: spacing.lg }}>
                  <MaterialIcons name="assignment" size={28} color={localEntity.raw?.fspp_details?.statusLabel ? "#166534" : "#2563EB"} />
                </View>
                
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>
                    {localEntity.raw?.fspp_details?.statusLabel ? t("View FSPP Assessment") : t("FSPP Enrollment")}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '700', marginTop: 4 }}>
                    {localEntity.raw?.fspp_details?.statusLabel ? t("Completed") : t("Not yet enrolled")}
                  </Text>
                </View>

                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
                </View>
              </Pressable>
            )}
            
            {/* 🚀 NEW: MASTER FARM CARD ENTRY BUTTON */}
            {!isDraft && localEntity.raw?.fspp_details?.statusLabel && (
              <Pressable
                onPress={() => navigation.navigate("FarmCardsListScreen", { farmer: localEntity })}
                style={{
                  flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.xl,
                  borderRadius: radius.lg, borderWidth: 1, borderColor: colors.info, marginBottom: spacing.lg, ...shadows.soft,
                }}
              >
                <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginRight: spacing.lg }}>
                  <MaterialIcons name="assignment-ind" size={28} color={colors.info} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: canAccessFarmCards ? colors.text : colors.textMuted }}>{t("Farm Cards")}</Text>
                  
                  {/* Dynamic Subtext for Locked/Approved status */}
                  {!canAccessFarmCards ? (
                    <Text style={{ fontSize: 12, color: '#D97706', fontWeight: '800', marginTop: 4 }}>
                      {t(`Locked: Not Approved`)}
                    </Text>
                  ) : !['Category A', 'Category B'].includes(fsppCategory) ? (
                     <Text style={{ fontSize: 12, color: '#166534', fontWeight: '800', marginTop: 4 }}>
                      {t(`Approved`)}
                    </Text>
                  ) : null}
                </View>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
                </View>
              </Pressable>
            )}

            {/* 🚀 NEW: FARM DIARY ENTRY BUTTON */}
            {!isDraft && hasFarmCard && (
              <Pressable
                onPress={() => navigation.navigate("FarmDiaryHubScreen", { farmer: localEntity })}
                style={{
                  flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.xl,
                  borderRadius: radius.lg, borderWidth: 1, borderColor: '#8B5CF6', marginBottom: spacing.lg, ...shadows.soft,
                }}
              >
                <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', marginRight: spacing.lg }}>
                  <MaterialIcons name="menu-book" size={28} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{t("Farm Diaries")}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '700', marginTop: 4 }}>
                    {t("Manage crop observations")}
                  </Text>
                </View>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
                </View>
              </Pressable>
            )}

          </View>

      </ScrollView>
    </SafeAreaView>
  );
};
