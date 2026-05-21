import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import * as crypto from 'expo-crypto';
import { useDraftStore } from '../../../store/draftStore';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../core/supabase';
import { SimpleScreenTemplate } from '../../../design-system/templates/Templates';
import { colors, radius, spacing, shadows } from '../../../design-system/tokens';
import { Search } from 'lucide-react-native';
import { useAlertStore } from '../../../store/alertStore';

export const DraftsScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  
  const allDrafts = useDraftStore((state) => state.drafts);
  const removeDraft = useDraftStore((state) => state.removeDraft);

  // 🚀 USER-WISE FILTER: Only process drafts that belong to the logged-in user
  // (We also include !d.userId so your 5 older legacy drafts aren't permanently lost!)
  const myDrafts = useMemo(() => {
    return allDrafts.filter(d => !d.userId || d.userId === user?.id);
  }, [allDrafts, user?.id]);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [refreshing, setRefreshing] = useState(false);

  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_LIMIT = 5;

  const syncOfflineDraftsToCloud = async () => {
    if (!user?.id) return;
    const store = useDraftStore.getState();
    
    // Read directly from the store state, but apply our User-Wise filter
    const myLocalDrafts = store.drafts.filter(d => !d.userId || d.userId === user.id);
    
    for (const draft of myLocalDrafts) {
      let draftIdToSync = draft.id;
      
      // 1. Fix old ID formats
      if (draft.id.length < 32) {
        draftIdToSync = crypto.randomUUID();
        store.addDraft(draft.data, draft.type, draftIdToSync);
        store.removeDraft(draft.id);
      } 
      // 2. 🚀 CLAIM LEGACY DRAFTS: If the draft is old and missing a userId, stamp it with the current user!
      else if (!draft.userId) {
        store.updateDraft(draft.id, draft.data, user.id);
      }
      
      try {
        const { error } = await supabase.from('drafts').upsert({
          se_id: user.id,
          entity_type: draft.type.toLowerCase(),
          entity_id: draftIdToSync,
          draft_data: draft.data,
          current_step: 1, 
          updated_at: new Date(draft.updatedAt || Date.now()).toISOString()
        }, { onConflict: 'entity_id' });

        if (error) console.error(`Failed to push draft ${draftIdToSync}:`, error.message);
      } catch (err) {
        console.error("Sync error:", err);
      }
    }
  };

  useEffect(() => { syncOfflineDraftsToCloud(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncOfflineDraftsToCloud();
    setPage(1); 
    setRefreshing(false);
  };

  useEffect(() => { setPage(1); }, [searchQuery, sortOrder]);

  const processedDrafts = useMemo(() => {
    let result = [...myDrafts]; // 🚀 Use myDrafts instead of allDrafts
    if (searchQuery.trim()) {
      result = result.filter(d => {
        const nameToSearch = d.type === 'DEALER' ? d.data?.shopName : 
                             d.type === 'DISTRIBUTOR' ? d.data?.firmName : 
                             d.data?.fullName;
        return (nameToSearch || "").toLowerCase().includes(searchQuery.toLowerCase());
      });
    }
    result.sort((a, b) => {
      const timeA = a.updatedAt || 0;
      const timeB = b.updatedAt || 0;
      return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });
    return result;
  }, [myDrafts, searchQuery, sortOrder]);

  const displayedDrafts = useMemo(() => processedDrafts.slice(0, page * PAGE_LIMIT), [processedDrafts, page]);
  const hasMore = displayedDrafts.length < processedDrafts.length;

  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      setLoadingMore(true);
      setTimeout(() => { setPage(prev => prev + 1); setLoadingMore(false); }, 300);
    }
  };

  const handleDelete = (id: string) => {
    useAlertStore.getState().showAlert(t('Delete Draft'), t('Are you sure you want to delete this draft?'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Delete'), style: 'destructive', onPress: async () => {
          await supabase.from('drafts').delete().eq('entity_id', id);
          removeDraft(id);
      } }
    ]);
  };

  return (
    <SimpleScreenTemplate title={t('Saved Drafts')} onBack={() => navigation.goBack()} noScroll>
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
        ListFooterComponent={() => loadingMore ? <View style={{ paddingVertical: spacing.md, alignItems: 'center' }}><ActivityIndicator color={colors.primary} /></View> : null}
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
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{displayName}</Text>
                  <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                    <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted }}>{item.type}</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>
                      {new Date(item.updatedAt || Date.now()).toLocaleDateString()}
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
                  if (item.type === 'DEALER') navigation.navigate('DealerOnboarding', { draftData: item.data, draftId: item.id });
                  else if (item.type === 'FARMER') navigation.navigate('FarmerOnboarding', { draftData: item.data, draftId: item.id });
                  else if (item.type === 'DISTRIBUTOR') navigation.navigate('DistributorOnboarding', { draftData: item.data, draftId: item.id });
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