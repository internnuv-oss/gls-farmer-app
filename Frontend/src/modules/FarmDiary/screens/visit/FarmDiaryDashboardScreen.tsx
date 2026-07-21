import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, radius, shadows } from '../../../../design-system/tokens';
import { useFarmDiaryStore } from '../../../../store/farmDiaryStore';
import { useShiftStore } from '../../../../store/shiftStore';
import { useAlertStore } from '../../../../store/alertStore';
import { HistoryLedgerList } from '../../components/HistoryLedgerList';
import { Button } from '../../../../design-system/components';

export const FarmDiaryDashboardScreen = ({ route, navigation }: any) => {
  const { t } = useTranslation();
  const routeDiary = route.params.diary;

  const diaries = useFarmDiaryStore(state => state.diaries);
  const diary = diaries.find(d => d.id === routeDiary.id) || routeDiary;

  const isActive = useShiftStore(state => state.isActive);
  const showAlert = useAlertStore(state => state.showAlert);

  // Removed DataRow as it will move to FarmDiaryProfileScreen

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.screen }}>
      {/* Header */}
      <View style={{ padding: spacing.xl, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginLeft: spacing.sm }}>{t("Back")}</Text>
        </Pressable>
        <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text }}>
          {diary.farm_name || "Farm Diary"}
        </Text>
        <Text style={{ fontSize: 14, color: colors.textMuted }}>
          {t("Area")}: {diary.total_land_area_acres} Acres
        </Text>
      </View>

      {/* Content */}
      <ScrollView style={{ flex: 1, padding: spacing.xl }}>
        {/* Action Card */}
        <Pressable 
          onPress={() => navigation.navigate("FarmDiaryProfileScreen", { diary })}
          style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', ...shadows.soft }}
        >
          <View style={{ backgroundColor: '#F1F5F9', padding: spacing.sm, borderRadius: radius.pill, marginRight: spacing.md }}>
            <MaterialIcons name="map" size={28} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{t("Farm Diary Profile")}</Text>
            <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 4 }}>{t("View field map, soil & water details")}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
        </Pressable>

        {/* Calendar Action Card */}
        <Pressable 
          onPress={() => navigation.navigate("FarmDiaryCalendarScreen", { diary })}
          style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl, flexDirection: 'row', alignItems: 'center', ...shadows.soft }}
        >
          <View style={{ backgroundColor: '#FFF7ED', padding: spacing.sm, borderRadius: radius.pill, marginRight: spacing.md }}>
            <MaterialIcons name="event" size={28} color="#F59E0B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{t("Calendar")}</Text>
            <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 4 }}>{t("View SOP timeline & expected dates")}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
        </Pressable>

        {/* History Ledger */}
        <HistoryLedgerList 
          diaryId={diary.id} 
          onVisitPress={(visit, visitNumber) => navigation.navigate("VisitDetailsScreen", { visit, visitNumber, diary })}
        />
      </ScrollView>

      {/* Fixed Footer */}
      <View style={{ padding: spacing.xl, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Button 
          label={t("Start New Base Visit")} 
          onPress={() => {
            if (!isActive) {
              showAlert('Shift Required', 'You must punch in and start an active shift before performing a Farm Diary visit.');
              return;
            }
            navigation.navigate("MandatoryBaseVisitScreen", { diary });
          }} 
        />
      </View>
    </SafeAreaView>
  );
};
