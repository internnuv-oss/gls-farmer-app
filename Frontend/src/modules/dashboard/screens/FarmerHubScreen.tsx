import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing, shadows } from '../../../design-system/tokens';

export const FarmerHubScreen = ({ route, navigation }: any) => {
  const { t } = useTranslation();
  const { entity } = route.params;

  // Handle Drafts vs Completed
  const isDraft = entity.isDraft;
  
  // Try to extract location data
  const village = entity.raw?.personal_details?.village || entity.city || entity.village || "Unknown Village";
  const state = entity.raw?.personal_details?.state || entity.state || "Unknown State";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.screen }}>
      {/* Header section */}
      <View style={{ padding: spacing.xl, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginLeft: spacing.sm }}>{t("Back")}</Text>
        </Pressable>
        
        <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text, marginBottom: spacing.xs }}>
          {entity.name}
        </Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '600' }}>
          {village}, {state}
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.xl }}>
        
        {/* Action Cards Container */}
        <View style={{ flex: 1 }}>
            
            {/* The primary Action Card */}
            <Pressable
              onPress={() => {
                if (isDraft) {
                  navigation.navigate("FarmerOnboarding", { 
                    draftId: entity.entityId, 
                    draftData: entity.raw, 
                    initialStep: entity.step 
                  });
                } else {
                  navigation.navigate("EntityProfile", { entity: entity });
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

          </View>

      </ScrollView>
    </SafeAreaView>
  );
};
