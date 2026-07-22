import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Search, Filter } from "lucide-react-native";
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { colors, radius, spacing, shadows } from '../../../design-system/tokens';
import { EmptyState } from '../../../design-system/components';
import { supabase } from '../../../core/supabase';
import { useAuthStore } from '../../../store/authStore';
import { FilterModal, FilterState, defaultFilters } from '../../../design-system/components/FilterModal';

export const InventoryScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🚀 Search & Sort States
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ ...defaultFilters, sortBy: 'name_asc' });

  useFocusEffect(
    useCallback(() => {
      const fetchInventory = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('executive_inventory')
          .select('balance_qty, batch_number, item_master(name, mrp, uom)')
          .eq('se_id', user?.id)
          .gt('balance_qty', 0)
          .order('updated_at', { ascending: false });
        
        if (error) {
           console.error("Supabase Inventory Error:", error.message);
        }

        setInventory(data || []);
        setLoading(false);
      };
      fetchInventory();
    }, [user?.id])
  );

  // 🚀 Dynamic Filtering and Sorting Logic
  const filteredInventory = useMemo(() => {
    let result = [...inventory];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.item_master?.name?.toLowerCase().includes(q) || 
        item.batch_number?.toLowerCase().includes(q)
      );
    }

    if (filters.sortBy === 'name_asc') {
      result.sort((a, b) => (a.item_master?.name || '').localeCompare(b.item_master?.name || ''));
    } else if (filters.sortBy === 'qty_desc') {
      result.sort((a, b) => b.balance_qty - a.balance_qty);
    } else if (filters.sortBy === 'qty_asc') {
      result.sort((a, b) => a.balance_qty - b.balance_qty);
    }

    return result;
  }, [inventory, searchQuery, filters.sortBy]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.screen }}>
      <View style={{ paddingTop: 50, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => navigation.goBack()} style={{ padding: 8, marginRight: 8 }}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text, flex: 1 }}>{t("Live Inventory")}</Text>
      </View>

      {/* 🚀 Search & Sort UI */}
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.screen, paddingBottom: spacing.sm }}>
        <View style={{ flexDirection: "row", marginBottom: spacing.sm, gap: spacing.sm }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, height: 48 }}>
            <Search size={20} color={colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t("Search items or batches...")}
              placeholderTextColor={colors.textMuted}
              style={{ flex: 1, marginLeft: spacing.sm, fontSize: 13, fontWeight: "500", color: colors.text }}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <MaterialIcons name="cancel" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={() => setIsFilterModalOpen(true)}
            style={{
              width: 48, height: 48,
              backgroundColor: filters.sortBy !== 'name_asc' ? colors.primarySoft : colors.surface,
              borderRadius: radius.md, borderWidth: 1,
              borderColor: filters.sortBy !== 'name_asc' ? colors.primary : colors.border,
              justifyContent: "center", alignItems: "center",
            }}
          >
            <Filter size={20} color={filters.sortBy !== 'name_asc' ? colors.primary : colors.textMuted} />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, color: colors.textMuted, fontWeight: '600' }}>{t("Syncing stock ledger...")}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredInventory}
          keyExtractor={(i, idx) => idx.toString()}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
          ListEmptyComponent={
            <EmptyState 
              iconName="inventory" 
              title={searchQuery ? t("No matches found") : t("No Stock Available")} 
              description={searchQuery ? t("Try adjusting your search.") : t("You currently have no inventory assigned. Contact your warehouse manager for stock transfers.")} 
              actionLabel={t("Go Back")}
              onAction={() => navigation.goBack()}
            />
          }
          renderItem={({ item }) => (
            <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.soft, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ backgroundColor: '#FEF3C7', padding: 12, borderRadius: radius.md, marginRight: spacing.md }}>
                <MaterialIcons name="category" size={24} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{item.item_master.name}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, fontWeight: '600' }}>Batch: {item.batch_number}</Text>
                <Text style={{ fontSize: 12, color: colors.primary, marginTop: 2, fontWeight: '700' }}>MRP: ₹{item.item_master.mrp} / {item.item_master.uom}</Text>
              </View>
              <View style={{ alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: '#BFDBFE' }}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#2563EB' }}>{item.balance_qty}</Text>
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#3B82F6', letterSpacing: 0.5 }}>UNITS</Text>
              </View>
            </View>
          )}
        />
      )}

      <FilterModal
        visible={isFilterModalOpen}
        entityType="Inventory"
        currentFilters={filters}
        onApply={(newFilters) => setFilters(newFilters)}
        onClose={() => setIsFilterModalOpen(false)}
      />
    </View>
  );
};