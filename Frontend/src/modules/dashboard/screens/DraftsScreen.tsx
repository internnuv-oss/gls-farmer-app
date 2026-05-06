import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { useDraftStore } from '../../../store/draftStore';
import { SimpleScreenTemplate } from '../../../design-system/templates/Templates';
import { colors, radius, spacing, shadows } from '../../../design-system/tokens';
import { Search } from 'lucide-react-native';
import { useAlertStore } from '../../../store/alertStore';

export const DraftsScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const drafts = useDraftStore((state) => state.drafts);
  const removeDraft = useDraftStore((state) => state.removeDraft);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [refreshing, setRefreshing] = useState(false);

  // Client-Side Pagination State
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_LIMIT = 5;

  useEffect(() => {
    setPage(1);
  }, [searchQuery, sortOrder]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setPage(1); 
      setRefreshing(false);
    }, 600);
  };

  // 1. Process the entire array (Filter & Sort)
  const processedDrafts = useMemo(() => {
    let result = [...drafts];
    if (searchQuery.trim()) {
      result = result.filter(d => {
        // 🚀 UPGRADED: Added Distributor firmName to the search logic
        const nameToSearch = d.type === 'DEALER' ? d.data?.shopName : 
                             d.type === 'DISTRIBUTOR' ? d.data?.firmName : 
                             d.data?.fullName;
        return (nameToSearch || "").toLowerCase().includes(searchQuery.toLowerCase());
      });
    }
    result.sort((a, b) => {
      const timeA = parseInt(a.id);
      const timeB = parseInt(b.id);
      return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });
    return result;
  }, [drafts, searchQuery, sortOrder]);

  // 2. Slice the array based on the current page
  const displayedDrafts = useMemo(() => {
    return processedDrafts.slice(0, page * PAGE_LIMIT);
  }, [processedDrafts, page]);

  const hasMore = displayedDrafts.length < processedDrafts.length;

  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      setLoadingMore(true);
      setTimeout(() => {
        setPage(prev => prev + 1);
        setLoadingMore(false);
      }, 300);
    }
  };

  const handleDelete = (id: string) => {
    useAlertStore.getState().showAlert(t('Delete Draft'), t('Are you sure you want to delete this draft?'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Delete'), style: 'destructive', onPress: () => removeDraft(id) }
    ]);
  };

  return (
    <SimpleScreenTemplate title={t('Saved Drafts')} onBack={() => navigation.goBack()} noScroll>
             
      {/* Search and Sort Header */}
      <View style={{ flexDirection: "row", marginBottom: spacing.md, gap: spacing.sm }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, height: 48 }}>
          <Search size={20} color={colors.textMuted} />
          <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder={t("Search drafts...")} placeholderTextColor={colors.textMuted} style={{ flex: 1, marginLeft: spacing.sm, fontSize: 15, fontWeight: "500", color: colors.text }} />
        </View>
        <Pressable onPress={() => setSortOrder(prev => prev === "newest" ? "oldest" : "newest")} style={{ paddingHorizontal: spacing.md, height: 48, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, justifyContent: "center", alignItems: "center", flexDirection: 'row' }}>
          <MaterialIcons name="sort" size={20} color={colors.primary} style={{ marginRight: 4 }} />
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>{sortOrder === "newest" ? "Newest" : "Oldest"}</Text>
        </Pressable>
      </View>

      <FlatList
        data={displayedDrafts}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing['2xl'] }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => (
          loadingMore ? (
            <View style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 80 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}>
              <MaterialIcons name="insert-drive-file" size={40} color={colors.border} />
            </View>
            <Text style={{ fontSize: 18, color: colors.text, fontWeight: '800' }}>{t('No drafts found')}</Text>
            <Text style={{ color: colors.textMuted, marginTop: 8, textAlign: 'center', maxWidth: '80%' }}>
              {searchQuery ? t('Try adjusting your search.') : t('When you save an incomplete onboarding form, it will securely appear here.')}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          // 🚀 UPGRADED: Dynamic styles based on all 3 entity types
          const isDealer = item.type === 'DEALER';
          const isDistributor = item.type === 'DISTRIBUTOR';

          const iconBg = isDealer ? '#FEF3C7' : isDistributor ? '#FFEDD5' : '#E0E7FF';
          const iconColor = isDealer ? colors.warning : isDistributor ? colors.secondary : '#4F46E5';
          const iconName = isDealer ? 'storefront' : isDistributor ? 'domain' : 'agriculture';

          const displayName = isDealer ? (item.data?.shopName || t('Incomplete Dealer')) :
                              isDistributor ? (item.data?.firmName || t('Incomplete Distributor')) : 
                              (item.data?.fullName || t('Incomplete Farmer'));

          return (
            <View style={{ backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.soft }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
                  <MaterialIcons name={iconName} size={24} color={iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
                    {displayName}
                  </Text>
                  
                  <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                    <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted }}>{item.type}</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>
                      {new Date(parseInt(item.id)).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <Pressable onPress={() => handleDelete(item.id)} style={{ padding: spacing.sm, backgroundColor: '#FEE2E2', borderRadius: radius.sm }}>
                  <MaterialIcons name="delete-outline" size={20} color={colors.danger} />
                </Pressable>
              </View>

              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />
              
              <Pressable 
                onPress={() => {
                  // 🚀 UPGRADED: Added navigation routing for Distributor Onboarding
                  if (item.type === 'DEALER') {
                    navigation.navigate('DealerOnboarding', { draftData: item.data, draftId: item.id });
                  } else if (item.type === 'FARMER') {
                    navigation.navigate('FarmerOnboarding', { draftData: item.data, draftId: item.id });
                  } else if (item.type === 'DISTRIBUTOR') {
                    navigation.navigate('DistributorOnboarding', { draftData: item.data, draftId: item.id });
                  }
                }} 
                style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xs }}
              >
                <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 14, marginRight: 4 }}>{t('Resume Onboarding')}</Text>
                <MaterialIcons name="arrow-forward" size={18} color={colors.primary} />
              </Pressable>
            </View>
          );
        }}
      />
    </SimpleScreenTemplate>
  );
};