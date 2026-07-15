import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '../../../design-system/tokens';
import { fetchTempDealersByVillages } from '../services/dashboardService';
import { TempDealerCard } from '../components/TempDealerCard';
import { EmptyState } from '../../../design-system/components';

export const TempDealersListScreen = ({ route, navigation }: any) => {
  const { t } = useTranslation();
  const { title, villages } = route.params;

  const [dealers, setDealers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDealers = async () => {
      try {
        const data = await fetchTempDealersByVillages(villages);
        setDealers(data);
      } catch (e) {
        console.error("Failed to load temp dealers", e);
      } finally {
        setLoading(false);
      }
    };
    loadDealers();
  }, [villages]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.screen }}>
      <View style={{ padding: spacing.xl, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginLeft: spacing.sm }}>{t("Back to Dashboard")}</Text>
        </Pressable>
        
        <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: spacing.xs }}>
          {title}
        </Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '600' }}>
          {dealers.length} {t("Dealers Located")}
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={dealers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.lg }}
          renderItem={({ item }) => <TempDealerCard dealer={item} />}
          ListEmptyComponent={
            <EmptyState
              title={t("No Dealers Found")}
              description={t("There are no registered prospect dealers in the selected location(s).")}
              iconName="storefront"
              actionLabel={t("Go Back")}
              onAction={() => navigation.goBack()}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};