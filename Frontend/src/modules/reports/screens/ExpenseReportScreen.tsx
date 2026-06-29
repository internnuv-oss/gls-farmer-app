import React, { useState } from 'react';
import { View, Text, SectionList, Pressable, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, radius, spacing } from '../../../design-system/tokens';
import { useExpenseStore, Expense } from '../../../store/expenseStore';
import { useShiftStore } from '../../../store/shiftStore'; // 🚀 Added to trace shift state
import { useAlertStore } from '../../../store/alertStore';
import { EmptyState, Button } from '../../../design-system/components';

export const ExpenseReportScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const expenses = useExpenseStore((state) => state.expenses);
  const { isActive } = useShiftStore(); // 🚀 Trace active attendance state

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [pickerMode, setPickerMode] = useState<'start' | 'end' | null>(null);

  // 🚀 REQ 4: Storage filters state metrics
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priceSort, setPriceSort] = useState<'none' | 'high' | 'low'>('none');

  const handleAddNewExpenseAction = () => {
    navigation.navigate("AddExpenseScreen");
  };

  const filteredExpenses = expenses.filter(e => {
    const expenseDate = new Date(e.date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    expenseDate.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    return expenseDate.getTime() >= start.getTime() && expenseDate.getTime() <= end.getTime();
  });

  // 🚀 REQ 4: Apply status filters and rate sorting without placeholders
  const processedExpenses = filteredExpenses
    .filter(e => statusFilter === 'All' || e.status === statusFilter)
    .sort((a, b) => {
      if (priceSort === 'high') return Number(b.amount) - Number(a.amount);
      if (priceSort === 'low') return Number(a.amount) - Number(b.amount);
      return new Date(b.date).getTime() - new Date(a.date).getTime(); // Fallback date sort
    });

  // 🚀 REQ 5: Range Grand Total logic calculation loop
  const grandTotalAmount = processedExpenses.reduce((sum, item) => sum + Number(item.amount), 0);

  // Group items by calendar day
  const groupedExpenses = processedExpenses.reduce((acc, expense) => {
    const dateStr = new Date(expense.date).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(expense);
    return acc;
  }, {} as Record<string, Expense[]>);

  const sections = Object.keys(groupedExpenses)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    .map(date => {
      // 🚀 REQ 5: Formulate internal section total counts
      const dailyTotal = groupedExpenses[date].reduce((sum, item) => sum + Number(item.amount), 0);
      return {
        title: date,
        dailyTotal,
        data: groupedExpenses[date]
      };
    });

  // 🚀 REQ 8: Restrict boundaries strictly into identical calendar month bounds
  const onDateChange = (event: any, date?: Date) => {
    const currentMode = pickerMode;
    setPickerMode(null);
    if (date) {
      if (currentMode === 'start') {
        setStartDate(date);
        if (date.getMonth() !== endDate.getMonth() || date.getFullYear() !== endDate.getFullYear()) {
          // Adjust end boundary to fit inside the start date's month
          const maxDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          setEndDate(maxDay > new Date() ? new Date() : maxDay);
        }
      }
      if (currentMode === 'end') {
        if (date.getMonth() !== startDate.getMonth() || date.getFullYear() !== startDate.getFullYear()) {
          useAlertStore.getState().showAlert(
            t("Invalid Selection"),
            t("Expense statements can only be loaded matching within the identical calendar month.")
          );
        } else {
          setEndDate(date);
        }
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Approved': return { bg: '#DCFCE7', text: '#166534' };
      case 'Rejected': return { bg: '#FEE2E2', text: '#991B1B' };
      case 'Queried': return { bg: '#FEF3C7', text: '#B45309' };
      default: return { bg: '#F1F5F9', text: '#475569' };
    }
  };

  const renderExpense = ({ item }: { item: Expense }) => {
    const sColors = getStatusColor(item.status);
    return (
      <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ backgroundColor: colors.primarySoft, padding: 8, borderRadius: radius.pill }}>
              <MaterialIcons name={item.category === 'Food' ? 'restaurant' : item.category === 'Travelling' ? 'directions-bus' : 'receipt'} size={18} color={colors.primary} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{t(item.category)}</Text>
          </View>
          <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text }}>₹{item.amount}</Text>
        </View>
        <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: 8, fontWeight: '500' }}>{item.remarks}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '700' }}>{new Date(item.date).toLocaleDateString()}</Text>
          <View style={{ backgroundColor: sColors.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill }}>
            <Text style={{ color: sColors.text, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>{t(item.status)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.screen }}>
      <View style={{ paddingTop: 50, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => navigation.goBack()} style={{ padding: 8, marginRight: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, flex: 1 }}>{t("Expense Report")}</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={renderExpense}
        contentContainerStyle={{ padding: spacing.lg }}
        renderSectionHeader={({ section: { title, dailyTotal } }) => (
          // 🚀 REQ 5: Display daily cumulative row summary metrics on section headers
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, marginTop: spacing.sm }}>
            <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' }}>{title}</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>Total: ₹{dailyTotal}</Text>
          </View>
        )}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            {/* Range Pickers */}
            <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
              <Pressable onPress={() => setPickerMode('start')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }}>
                <MaterialIcons name="event" size={18} color={colors.textMuted} style={{ marginRight: 6 }} />
                <View>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' }}>{t("Start Date")}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>{startDate.toLocaleDateString()}</Text>
                </View>
              </Pressable>
    
              <Pressable onPress={() => setPickerMode('end')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }}>
                <MaterialIcons name="event" size={18} color={colors.textMuted} style={{ marginRight: 6 }} />
                <View>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase' }}>{t("End Date")}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>{endDate.toLocaleDateString()}</Text>
                </View>
              </Pressable>
            </View>

            {/* 🚀 REQ 5: Grand Range Month Cumulative Total Header banner Display */}
            <View style={{ backgroundColor: colors.primarySoft, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.primary }}>
               <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>{t("Total for Selection Range:")}</Text>
               <Text style={{ fontSize: 18, fontWeight: '900', color: colors.primary }}>₹{grandTotalAmount}</Text>
            </View>

            {/* 🚀 REQ 4: Inline category horizontal slide selector filtering items dynamically */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xs, paddingVertical: 4 }}>
              {['All', 'Pending', 'Approved', 'Queried', 'Rejected'].map(status => (
                <Pressable key={status} onPress={() => setStatusFilter(status)} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: statusFilter === status ? colors.primary : '#E2E8F0', marginRight: 8 }}>
                   <Text style={{ color: statusFilter === status ? '#FFF' : colors.text, fontSize: 12, fontWeight: '700' }}>{t(status)}</Text>
                </Pressable>
              ))}
              <View style={{ width: 1, backgroundColor: colors.border, marginHorizontal: 4 }} />
              <Pressable onPress={() => setPriceSort(priceSort === 'high' ? 'none' : 'high')} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: priceSort === 'high' ? '#4F46E5' : '#E2E8F0', marginRight: 8 }}>
                 <Text style={{ color: priceSort === 'high' ? '#FFF' : colors.text, fontSize: 12, fontWeight: '700' }}>{t("₹ High to Low")}</Text>
              </Pressable>
              <Pressable onPress={() => setPriceSort(priceSort === 'low' ? 'none' : 'low')} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: priceSort === 'low' ? '#4F46E5' : '#E2E8F0', marginRight: 8 }}>
                 <Text style={{ color: priceSort === 'low' ? '#FFF' : colors.text, fontSize: 12, fontWeight: '700' }}>{t("₹ Low to High")}</Text>
              </Pressable>
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <EmptyState 
            title={t("No expenses")} 
            description={t("No matching expense logs were found across this configuration query.")} 
            iconName="receipt" 
            actionLabel={t("Add Expense Today")} 
            onAction={handleAddNewExpenseAction} 
          />
        }
      />

      {pickerMode && (
        <DateTimePicker
          value={pickerMode === 'start' ? startDate : endDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          maximumDate={new Date()}
          minimumDate={pickerMode === 'end' ? startDate : undefined}
        />
      )}

      {/* FIXED BOTTOM BUTTON - 🚀 REQ 7: Evaluates single point action protection mapping */}
      <View style={{ padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Button label={t("Add New Expense")} icon="add" onPress={handleAddNewExpenseAction} />
      </View>
    </View>
  );
};