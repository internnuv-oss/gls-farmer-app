import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing, shadows } from '../../../design-system/tokens';
import { useShiftStore } from '../../../store/shiftStore';
import { useExpenseStore } from '../../../store/expenseStore';
import { useFocusEffect } from '@react-navigation/native';

export const ReportsHubScreen = ({ navigation }: any) => {
  const { t } = useTranslation();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        useShiftStore.getState().hydrateShifts(),
        useExpenseStore.getState().hydrateExpenses(),
      ]);
    } catch (error) {
      console.error('Failed to refresh reports:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      useShiftStore.getState().hydrateShifts();
      useExpenseStore.getState().hydrateExpenses();
    }, [])
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.screen }}
      contentContainerStyle={{ paddingTop: 50, paddingHorizontal: spacing.lg, paddingBottom: 100 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]} // Android spinner color
          tintColor={colors.primary} // iOS spinner color
        />
      }
    >
      <View style={{ paddingBottom: spacing.lg }}>
        <Text style={{ fontSize: 26, fontWeight: '900', color: colors.text }}>{t("My Reports")}</Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '600', marginTop: 4 }}>
          {t("Track your attendance, activities, and expenses.")}
        </Text>
      </View>

      {/* Travel Report */}
      <Pressable onPress={() => navigation.navigate('TravelReportScreen')} style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#ECFCCB', padding: 12, borderRadius: radius.md, marginRight: spacing.md }}>
          <MaterialIcons name="map" size={28} color="#65A30D" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{t('Daily Travel Report')}</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '500', marginTop: 2 }}>{t('View GPS route & calculated TA/DA')}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
      </Pressable>

      {/* Expense Report */}
      <Pressable onPress={() => navigation.navigate('ExpenseReportScreen')} style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadows.soft, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#FEF2F2', padding: 12, borderRadius: radius.md, marginRight: spacing.md }}>
          <MaterialIcons name="receipt-long" size={28} color="#DC2626" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{t('Expense Report')}</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '500', marginTop: 2 }}>{t('Track daily reimbursements')}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
      </Pressable>

      {/* Live Stock / Inventory */}
      <Pressable onPress={() => navigation.navigate('InventoryScreen')} style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadows.soft, flexDirection: 'row', alignItems: 'center', marginTop: spacing.md }}>
        <View style={{ backgroundColor: '#FEF3C7', padding: 12, borderRadius: radius.md, marginRight: spacing.md }}>
          <MaterialIcons name="inventory-2" size={28} color="#D97706" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{t('My Inventory')}</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '500', marginTop: 2 }}>{t('View live stock & transfers')}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
      </Pressable>

      {/* Retail Invoicing */}
      <Pressable onPress={() => navigation.navigate('RetailInvoicingScreen')} style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadows.soft, flexDirection: 'row', alignItems: 'center', marginTop: spacing.md }}>
        <View style={{ backgroundColor: '#E0E7FF', padding: 12, borderRadius: radius.md, marginRight: spacing.md }}>
          <MaterialIcons name="receipt-long" size={28} color="#4F46E5" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{t('Retail Invoicing')}</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '500', marginTop: 2 }}>{t('Generate bills & view order history')}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
      </Pressable>
    </ScrollView>
  );
};