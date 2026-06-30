import React from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing, shadows } from '../../../design-system/tokens';
import { useShiftStore } from '../../../store/shiftStore';
import { useExpenseStore } from '../../../store/expenseStore';
import { useAlertStore } from '../../../store/alertStore';
import { useFocusEffect } from '@react-navigation/native';
import { useState, useCallback } from 'react';

export const ReportsHubScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { isActive, startTime, shiftHistory } = useShiftStore();
  const expenses = useExpenseStore(s => s.expenses);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Re-fetch both shifts and expenses simultaneously
      await Promise.all([
        useShiftStore.getState().hydrateShifts(),
        useExpenseStore.getState().hydrateExpenses()
      ]);
    } catch (error) {
      console.error("Failed to refresh reports:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Fire and forget hydration on mount/focus
      useShiftStore.getState().hydrateShifts();
      useExpenseStore.getState().hydrateExpenses();
    }, [])
  );

  // Helper to filter dates
  const isToday = (dateString: string | number) => {
    const d = new Date(dateString);
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  };

  const todayExpenses = expenses.filter(e => isToday(e.date));
  const todayTotalAmount = todayExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const todayHistory = shiftHistory.find(s => isToday(s.date));
  
  let punchedInTime = null;
  let punchedOutTime = null;

  if (todayHistory) {
    const pIn = todayHistory.events.find(e => e.type === 'punch-in');
    const pOut = todayHistory.events.find(e => e.type === 'punch-out');
    if (pIn) punchedInTime = pIn.time;
    if (pOut) punchedOutTime = pOut.time;
  }

  // If still active and history didn't capture it yet, use current state
  if (isActive && startTime && !punchedInTime && isToday(startTime)) {
    punchedInTime = startTime;
  }

 const handleAddNewExpenseAction = () => {
  navigation.navigate("AddExpenseScreen");
};

  const renderMiniExpense = (item: any) => (
    <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ backgroundColor: colors.primarySoft, padding: 8, borderRadius: radius.pill }}>
          <MaterialIcons name={item.category === 'Food' ? 'restaurant' : item.category === 'Travelling' ? 'directions-bus' : 'receipt'} size={16} color={colors.primary} />
        </View>
        <View>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{t(item.category)}</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }} numberOfLines={1}>{item.remarks || t("No remarks")}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>₹{item.amount}</Text>
    </View>
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

      {/* 🚀 NEW: Strava-Style Travel Report Button */}
      <Pressable onPress={() => navigation.navigate("TravelReportScreen")} style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#ECFCCB', padding: 12, borderRadius: radius.md, marginRight: spacing.md }}>
          <MaterialIcons name="map" size={28} color="#65A30D" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{t("Travel Report")}</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '500', marginTop: 2 }}>{t("View GPS route & calculated TA/DA")}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
      </Pressable>

      <Pressable onPress={() => navigation.navigate("AttendanceReportScreen")} style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#EFF6FF', padding: 12, borderRadius: radius.md, marginRight: spacing.md }}>
          <MaterialIcons name="rule" size={28} color="#2563EB" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{t("Attendance Report")}</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '500', marginTop: 2 }}>{t("View punch-in timeline")}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
      </Pressable>

      <Pressable onPress={() => navigation.navigate("ExpenseReportScreen")} style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadows.soft, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#FEF2F2', padding: 12, borderRadius: radius.md, marginRight: spacing.md }}>
          <MaterialIcons name="receipt-long" size={28} color="#DC2626" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{t("Expense Report")}</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '500', marginTop: 2 }}>{t("Track daily reimbursements")}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
      </Pressable>

      {/* 🚀 TODAY'S SUMMARY SECTION */}
      <View style={{ marginTop: spacing.xl }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: spacing.md }}>
          {t("Today's Summary")}
        </Text>

        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
           <View style={{ flex: 1, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }}>{t("Punched In")}</Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, marginTop: 4 }}>
                {punchedInTime ? new Date(punchedInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
              </Text>
           </View>
           <View style={{ flex: 1, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }}>{t("Punched Out")}</Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, marginTop: 4 }}>
                {punchedOutTime ? new Date(punchedOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
              </Text>
           </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
           <View>
             <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{t("Today's Expenses")}</Text>
             <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginVertical: spacing.md }}>Total: ₹{todayTotalAmount}</Text>
           </View>
           {/* 🚀 REQ 7: Using corrected verification handler wrapper */}
           <Pressable onPress={handleAddNewExpenseAction} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft, marginVertical: spacing.md, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill }}>
              <MaterialIcons name="add" size={16} color={colors.primary} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary, marginLeft: 4 }}>{t("Add Expense")}</Text>
           </Pressable>
        </View>

        {todayExpenses.length > 0 ? (
           <View>
             {todayExpenses.map(renderMiniExpense)}
           </View>
        ) : (
           <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', borderStyle: 'dashed' }}>
              <Text style={{ color: colors.textMuted, fontWeight: '600', fontSize: 13 }}>{t("No expenses logged today.")}</Text>
           </View>
        )}
      </View>
    </ScrollView>
  );
};