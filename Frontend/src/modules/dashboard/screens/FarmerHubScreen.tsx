// Frontend/src/modules/dashboard/screens/FarmerHubScreen.tsx

import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing, shadows } from '../../../design-system/tokens';
import { supabase } from '../../../core/supabase';
import { useAlertStore } from '../../../store/alertStore'; // 🚀 Added for lock alerts

export const FarmerHubScreen = ({ route, navigation }: any) => {
  const { t } = useTranslation();
  
  const [localEntity, setLocalEntity] = useState(route.params.entity);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('farmers')
        .select('*')
        .eq('id', localEntity.id || localEntity.entityId)
        .single();
        
      if (data && !error) {
        setLocalEntity((prev: any) => ({ ...prev, raw: data }));
      }
    } catch (e) {
      console.error("Failed to refresh farmer hub", e);
    } finally {
      setRefreshing(false);
    }
  };

  const isDraft = localEntity.isDraft;
  const village = localEntity.raw?.personal_details?.village || localEntity.city || localEntity.village || "Unknown Village";
  const state = localEntity.raw?.personal_details?.state || localEntity.state || "Unknown State";

  // 🚀 NEW: Extract FSPP and Approval Logic
  const fsppDetails = localEntity.raw?.fspp_details;
  const hasFspp = !!fsppDetails?.statusLabel;
  const fsppCategory = fsppDetails?.category; // e.g., 'Category A', 'Category B'
  
  // Check if admin has explicitly approved this profile (Checking standard fallback paths)
  const isProfileApproved = localEntity.raw?.fspp_approval_status === 'APPROVED' || fsppDetails?.approvalStatus === 'APPROVED';
  
  // They can access if they are Category A, OR if they are another category but approved by Admin
  const canAccessFarmCards = fsppCategory === 'Category A' || isProfileApproved;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.screen }}>
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
        <View style={{ flex: 1 }}>
            
            {/* Resume / Profile Card */}
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
                flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.xl,
                borderRadius: radius.lg, borderWidth: 1, borderColor: isDraft ? colors.warning : colors.success,
                marginBottom: spacing.lg, ...shadows.soft,
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
                flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.xl,
                borderRadius: radius.lg, borderWidth: 1, borderColor: '#DC2626', marginBottom: spacing.lg, ...shadows.soft,
              }}
            >
              <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginRight: spacing.lg }}>
                <MaterialIcons name="event" size={28} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{t("General Visit")}</Text>
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
                  flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.xl,
                  borderRadius: radius.lg, borderWidth: 1, borderColor: hasFspp ? "#166534" : "#2563EB", 
                  marginBottom: spacing.lg, ...shadows.soft,
                }}
              >
                <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: spacing.lg }}>
                  <MaterialIcons name="assignment" size={28} color={hasFspp ? "#166534" : "#2563EB"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>
                    {hasFspp ? t("View FSPP Assessment") : t("FSPP Enrollment")}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '700', marginTop: 4 }}>
                    {hasFspp ? t("Completed") : t("Not yet enrolled")}
                  </Text>
                </View>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
                </View>
              </Pressable>
            )}
            
            {/* 🚀 UPGRADED: FARM CARD LOCK LOGIC */}
            {!isDraft && hasFspp && (
              <Pressable
                onPress={() => {
                  if (canAccessFarmCards) {
                    navigation.navigate("FarmCardsListScreen", { farmer: localEntity });
                  } else {
                    // 🚀 Show friendly alert if locked
                    useAlertStore.getState().showAlert(
                      t("Admin Approval Required"), 
                      t(`This farmer is classified as ${fsppCategory}. Admin must approve this profile before Farm Cards can be created.`)
                    );
                  }
                }}
                style={{
                  flexDirection: 'row', alignItems: 'center', backgroundColor: canAccessFarmCards ? colors.surface : '#F8FAFC', padding: spacing.xl,
                  borderRadius: radius.lg, borderWidth: 1, borderColor: canAccessFarmCards ? colors.info : colors.border, 
                  marginBottom: spacing.lg, ...shadows.soft,
                  opacity: canAccessFarmCards ? 1 : 0.75 // Visually dim the card if locked
                }}
              >
                <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: canAccessFarmCards ? '#DBEAFE' : '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginRight: spacing.lg }}>
                  <MaterialIcons name={canAccessFarmCards ? "assignment-ind" : "lock"} size={28} color={canAccessFarmCards ? colors.info : colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: canAccessFarmCards ? colors.text : colors.textMuted }}>{t("Farm Cards")}</Text>
                  
                  {/* Dynamic Subtext for Locked/Approved status */}
                  {!canAccessFarmCards ? (
                    <Text style={{ fontSize: 12, color: '#D97706', fontWeight: '800', marginTop: 4 }}>
                      {t(`Locked: Not Approved`)}
                    </Text>
                  ) : fsppCategory !== 'Category A' ? (
                     <Text style={{ fontSize: 12, color: '#166534', fontWeight: '800', marginTop: 4 }}>
                      {t(`Approved`)}
                    </Text>
                  ) : null}
                </View>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name={canAccessFarmCards ? "chevron-right" : "block"} size={20} color={colors.textMuted} />
                </View>
              </Pressable>
            )}

          </View>
      </ScrollView>
    </SafeAreaView>
  );
};