import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '../../../design-system/tokens';
import { EmptyState } from '../../../design-system/components';
import { FarmDiaryEntityCard } from '../components/FarmDiaryEntityCard';
import {
  enrichVillageFarmDiaryFarmers,
  type VillageFarmDiaryFarmer,
} from '../services/villageFarmDiaryService';

export const VillageFarmDiariesScreen = ({ route, navigation }: any) => {
  const { t } = useTranslation();
  const { villageName, farmers = [] } = route.params || {};

  const [rows, setRows] = useState<VillageFarmDiaryFarmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await enrichVillageFarmDiaryFarmers(farmers);
      setRows(data);
    } catch (e) {
      console.error('Failed to load village farm diaries', e);
      setRows([]);
    }
  }, [farmers]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      await load();
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.screen }}>
      <View
        style={{
          padding: spacing.xl,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginLeft: spacing.sm }}>
            {t('Back')}
          </Text>
        </Pressable>

        <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: spacing.xs }}>
          {t('Farm Diaries in')} {villageName}
        </Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '600' }}>
          {t('Farmers with Farm Cards')}
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.farmer.id || item.farmer.entityId)}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <FarmDiaryEntityCard
              farmer={item.farmer}
              diaries={item.diaries}
              navigation={navigation}
              t={t}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title={t('No Farm Cards Found')}
              description={t('No farmers with Farm Cards in this village yet.')}
              iconName="menu-book"
              actionLabel={t('Go Back')}
              onAction={() => navigation.goBack()}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};
