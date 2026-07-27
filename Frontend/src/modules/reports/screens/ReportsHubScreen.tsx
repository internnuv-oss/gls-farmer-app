// Frontend/src/modules/reports/screens/ReportsHubScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing, shadows } from '../../../design-system/tokens';
import { useShiftStore } from '../../../store/shiftStore';
import { useExpenseStore } from '../../../store/expenseStore';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../../store/authStore';
import { usePermissions } from '../../../core/usePermissions';

export const ReportsHubScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const userId = useAuthStore(s => s.user?.id);
  
  // FETCH UNIFIED PERMISSIONS
  const { getModulePerm, loading: permsLoading, refreshPermissions } = usePermissions(userId);
  const travelActivityAccess = getModulePerm('mobile_travel_activity');
  const retailAccess = getModulePerm('mobile_retail');

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // 🚀 NEW: Re-fetch RBAC rules from the database first
      await refreshPermissions();
      await Promise.all([
        useShiftStore.getState().hydrateShifts(),
        useExpenseStore.getState().hydrateExpenses(),
      ]);
    } catch (error) {
      console.error('Failed to refresh reports:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshPermissions]);

  useFocusEffect(
    useCallback(() => {
      useShiftStore.getState().hydrateShifts();
      useExpenseStore.getState().hydrateExpenses();
    }, [])
  );

  // FALLBACK UI IF NO ACCESS
  const hasAnyReportAccess = travelActivityAccess.can_view || retailAccess.can_view;

  if (!permsLoading && !hasAnyReportAccess) {
    return (
      <View style={styles.fallbackContainer}>
        <MaterialIcons name="security" size={64} color={colors.textMuted} />
        <Text style={styles.fallbackTitle}>{t("Restricted Area")}</Text>
        <Text style={styles.fallbackText}>{t("You do not have permission to view reports or logs. Please contact your administrator.")}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.screen }}
      contentContainerStyle={{ paddingTop: 50, paddingHorizontal: spacing.lg, paddingBottom: 100 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
      }
    >
      <View style={{ paddingBottom: spacing.lg }}>
        <Text style={{ fontSize: 26, fontWeight: '900', color: colors.text }}>{t("My Reports")}</Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '600', marginTop: 4 }}>
          {t("Track your attendance, activities, and expenses.")}
        </Text>
      </View>

      {/* Travel Report relies on mobile_travel_activity */}
      {travelActivityAccess.can_view && (
        <Pressable onPress={() => navigation.navigate('TravelReportScreen')} style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: '#ECFCCB' }]}>
            <MaterialIcons name="map" size={28} color="#65A30D" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{t('Daily Travel Report')}</Text>
            <Text style={styles.cardSub}>{t('View GPS route & calculated TA/DA')}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
        </Pressable>
      )}

      {/* Expense Report relies on mobile_travel_activity */}
      {travelActivityAccess.can_view && (
        <Pressable onPress={() => navigation.navigate('ExpenseReportScreen')} style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: '#FEF2F2' }]}>
            <MaterialIcons name="receipt-long" size={28} color="#DC2626" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{t('Expense Report')}</Text>
            <Text style={styles.cardSub}>{t('Track daily reimbursements')}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
        </Pressable>
      )}

      {/* Retail & Inventory relies on mobile_retail */}
      {retailAccess.can_view && (
        <>
          <Pressable onPress={() => navigation.navigate('InventoryScreen')} style={styles.card}>
            <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
              <MaterialIcons name="inventory-2" size={28} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t('My Inventory')}</Text>
              <Text style={styles.cardSub}>{t('View live stock & transfers')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
          </Pressable>

          <Pressable onPress={() => navigation.navigate('RetailInvoicingScreen')} style={styles.card}>
            <View style={[styles.iconContainer, { backgroundColor: '#E0E7FF' }]}>
              <MaterialIcons name="receipt-long" size={28} color="#4F46E5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t('Retail Invoicing')}</Text>
              <Text style={styles.cardSub}>{t('Generate bills & view order history')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
          </Pressable>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft, flexDirection: 'row', alignItems: 'center' },
  iconContainer: { padding: 12, borderRadius: radius.md, marginRight: spacing.md },
  cardTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  cardSub: { fontSize: 13, color: colors.textMuted, fontWeight: '500', marginTop: 2 },
  fallbackContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, backgroundColor: colors.screen },
  fallbackTitle: { fontSize: 20, fontWeight: '900', color: colors.text, marginTop: 16 },
  fallbackText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 8, fontWeight: '500', lineHeight: 20 }
});