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
  
  // 🚀 DB CRUD: We now use standard React state to hold our database drafts
  const [dbDrafts, setDbDrafts] = useState<any[]>([]);
  const [isFetchingInitial, setIsFetchingInitial] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [refreshing, setRefreshing] = useState(false);

  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_LIMIT = 5;

  // 🚀 MASTER FUNCTION: Migrate old local drafts -> Wipe local -> Fetch from DB
  const migrateAndFetchDrafts = async () => {
    if (!user?.id) return;
    
    try {
      const store = useDraftStore.getState();
      const localDrafts = store.drafts || [];
      const myLocalDrafts = localDrafts.filter((d: any) => !d.userId || d.userId === user.id);
      
      // --- PHASE 1: MIGRATE OLD LOCAL DRAFTS TO CLOUD ---
      if (myLocalDrafts.length > 0) {
        const migrationPayload = myLocalDrafts.map((draft: any) => {
          let draftIdToSync = draft.id;
          if (draftIdToSync.length < 32) draftIdToSync = crypto.randomUUID(); // Fix legacy IDs
          
          return {
            se_id: user.id,
            entity_type: draft.type.toLowerCase(),
            entity_id: draftIdToSync,
            draft_data: draft.data,
            current_step: 1, 
            updated_at: new Date(draft.updatedAt || Date.now()).toISOString()
          };
        });

        const { error } = await supabase.from('drafts').upsert(migrationPayload, { onConflict: 'entity_id' });

        if (!error) {
          // 🚀 WIPE LOCAL STORAGE: We successfully migrated, delete local so we never run this again!
          if (typeof store.clearDrafts === 'function') {
            store.clearDrafts();
          } else {
            // Fallback if clearDrafts isn't defined yet
            myLocalDrafts.forEach((d: any) => store.removeDraft(d.id));
          }
        }
      }

      // --- PHASE 2: FETCH DIRECTLY FROM DB ---
      const { data, error } = await supabase
        .from('drafts')
        .select('*')
        .eq('se_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Map the DB snake_case format back to the camelCase format the UI expects
      if (data) {
        const formattedDrafts = data.map((dbDraft) => ({
          id: dbDraft.entity_id,
          type: dbDraft.entity_type.toUpperCase(),
          data: dbDraft.draft_data,
          updatedAt: new Date(dbDraft.updated_at).getTime()
        }));
        setDbDrafts(formattedDrafts);
      }

    } catch (err) {
      console.error("Migration/Fetch error:", err);
    } finally {
      setIsFetchingInitial(false);
    }
  };

  useEffect(() => { migrateAndFetchDrafts(); }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await migrateAndFetchDrafts();
    setPage(1); 
    setRefreshing(false);
  };

  useEffect(() => { setPage(1); }, [searchQuery, sortOrder]);

  const processedDrafts = useMemo(() => {
    let result = [...dbDrafts]; // 🚀 Now filtering against our DB state!
    if (searchQuery.trim()) {
      result = result.filter(d => {
        const safeType = (d.type || '').toUpperCase();
        const nameToSearch = safeType === 'DEALER' ? d.data?.shopName : 
                             safeType === 'DISTRIBUTOR' ? d.data?.firmName : 
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
  }, [dbDrafts, searchQuery, sortOrder]);

  const displayedDrafts = useMemo(() => processedDrafts.slice(0, page * PAGE_LIMIT), [processedDrafts, page]);
  const hasMore = displayedDrafts.length < processedDrafts.length;

  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      setLoadingMore(true);
      setTimeout(() => { setPage(prev => prev + 1); setLoadingMore(false); }, 300);
    }
  };

  // 🚀 DB CRUD: Delete directly from Supabase, completely ignoring local storage
  const handleDelete = (id: string) => {
    useAlertStore.getState().showAlert(t('Delete Draft'), t('Are you sure you want to delete this draft?'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Delete'), style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('drafts').delete().eq('entity_id', id);
          if (!error) {
            // Instantly remove it from the UI
            setDbDrafts(prev => prev.filter(d => d.id !== id));
          } else {
            useAlertStore.getState().showAlert("Error", "Failed to delete draft from cloud.");
          }
      } }
    ]);
  };

  if (isFetchingInitial) {
    return (
      <SimpleScreenTemplate title={t('Saved Drafts')} onBack={() => navigation.goBack()} noScroll>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: spacing.md, color: colors.textMuted, fontWeight: '700' }}>{t("Syncing drafts from cloud...")}</Text>
        </View>
      </SimpleScreenTemplate>
    );
  }

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
          const safeType = (item.type || '').toUpperCase();
          const isDealer = safeType === 'DEALER';
          const isDistributor = safeType === 'DISTRIBUTOR';
          const isFarmer = safeType === 'FARMER';
          
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
                      <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted }}>{safeType}</Text>
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
                  if (safeType === 'DEALER') navigation.navigate('DealerOnboarding', { draftData: item.data, draftId: item.id });
                  else if (safeType === 'FARMER') navigation.navigate('FarmerOnboarding', { draftData: item.data, draftId: item.id });
                  else if (safeType === 'DISTRIBUTOR') navigation.navigate('DistributorOnboarding', { draftData: item.data, draftId: item.id });
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