import React, { useRef, useState, useCallback, useMemo, useEffect } from "react";
import * as crypto from 'expo-crypto';
import {
  View, Text, FlatList, Pressable, Dimensions, TextInput,
  ActivityIndicator, Modal, RefreshControl, Linking, Image
} from "react-native";
import { useTranslation } from "react-i18next";
import { Search, Filter } from "lucide-react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useAuthStore } from "../../../store/authStore";
import { useAlertStore } from "../../../store/alertStore";
import { useDraftStore } from "../../../store/draftStore";
import { supabase } from "../../../core/supabase";
import { fetchMyDealers, fetchMyFarmers, fetchMyDistributors, fetchMyDrafts, deleteDraft } from "../services/dashboardService";

import { FloatingActionMenu, EmptyState } from "../../../design-system/components";
import { colors, radius, spacing, shadows } from "../../../design-system/tokens";
import { FilterModal, FilterState, defaultFilters } from "../../../design-system/components/FilterModal";

const { width } = Dimensions.get("window");

export const DashboardScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState(0); 
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const pagerRef = useRef<FlatList>(null);
  
  useEffect(() => {
    if (route?.params?.activeTab !== undefined) {
      const tabIndex = route.params.activeTab;
      setActiveTab(tabIndex);
      setTimeout(() => {
        pagerRef.current?.scrollToIndex({ index: tabIndex, animated: true });
      }, 100);
      navigation.setParams({ activeTab: undefined });
    }
  }, [route?.params?.activeTab, navigation]);
  
  const [distributors, setDistributors] = useState<any[]>([]);
  const [dealers, setDealers] = useState<any[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]); 
  const [dbDrafts, setDbDrafts] = useState<any[]>([]); // 🚀 State for DB Drafts

  // Migration to DB: Pull legacy local drafts to the cloud
  const localDrafts = useDraftStore((state) => state.drafts);
  const clearLocalDrafts = useDraftStore((state) => state.clearDrafts);
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    const migrateLocalDrafts = async () => {
      if (!user?.id || !localDrafts || localDrafts.length === 0) return;

      setIsMigrating(true);
      try {
        const myLocalDrafts = localDrafts.filter((d: any) => !d.userId || d.userId === user.id);
        
        if (myLocalDrafts.length > 0) {
          // 1. Format payload for bulk insert
          const migrationPayload = myLocalDrafts.map((draft: any) => {
            let draftIdToSync = draft.id;
            if (!draftIdToSync || draftIdToSync.length < 32) draftIdToSync = crypto.randomUUID(); // Fix legacy IDs
            
            return {
              se_id: user.id,
              entity_type: draft.type.toLowerCase(), // 'DEALER' -> 'dealer'
              entity_id: draftIdToSync,
              draft_data: draft.data,
              current_step: 1, 
              updated_at: new Date(draft.updatedAt || Date.now()).toISOString()
            };
          });

          // 2. Perform a single, fast bulk Upsert
          const { error } = await supabase.from('drafts').upsert(migrationPayload, { onConflict: 'entity_id' });

          if (error) throw error;

          // 3. Wipe local storage robustly so it never runs again
          if (typeof clearLocalDrafts === 'function') {
            clearLocalDrafts();
          } else {
            const store = useDraftStore.getState();
            myLocalDrafts.forEach((d: any) => store.removeDraft(d.id));
          }

          // 4. Refresh the dashboard lists to show the newly synced data
          loadData(0, true);
        }
      } catch (error) {
        console.error("Failed to migrate legacy local drafts:", error);
      } finally {
        setIsMigrating(false);
      }
    };

    migrateLocalDrafts();
  }, [user?.id, localDrafts]);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingPageRef = useRef<number | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  // 🚀 Map Database Drafts into the UI structure
  const mappedDrafts = useMemo(() => {
    return {
      Distributors: dbDrafts.filter(d => d.entity_type === 'distributor').map(d => ({
        id: d.id, entityId: d.entity_id, name: d.draft_data?.firmName || d.draft_data?.firm_name || 'Incomplete Distributor', type: 'Distributor',
        city: d.draft_data?.city || d.draft_data?.raw_data?.city || '', state: d.draft_data?.state || d.draft_data?.raw_data?.state || '', score: 0, raw: d.draft_data, step: d.current_step, isDraft: true
      })),
      Dealers: dbDrafts.filter(d => d.entity_type === 'dealer').map(d => ({
        id: d.id, entityId: d.entity_id, name: d.draft_data?.primaryShopName || d.draft_data?.shopName || 'Incomplete Dealer', type: 'Dealer',
        city: d.draft_data?.primaryShopLocation?.city || d.draft_data?.city || '', state: d.draft_data?.primaryShopLocation?.state || d.draft_data?.state || '', score: 0, raw: d.draft_data, step: d.current_step, isDraft: true
      })),
      Farmers: dbDrafts.filter(d => d.entity_type === 'farmer').map(d => ({
        id: d.id, entityId: d.entity_id, name: d.draft_data?.fullName || d.draft_data?.full_name || 'Incomplete Farmer', type: 'Farmer',
        // 🚀 FIX: Map flat fields correctly for drafts so location shows up
        city: d.draft_data?.city || d.draft_data?.village || '', 
        state: d.draft_data?.state || '', 
        score: 0, raw: d.draft_data, step: d.current_step, isDraft: true
      }))
    };
  }, [dbDrafts]);

  const loadData = async (pageNumber: number = 0, isRefresh = false) => {
    if (!user?.id || loadingPageRef.current === pageNumber) return; 
    
    loadingPageRef.current = pageNumber; 
    if (isRefresh) setRefreshing(true);
    else if (pageNumber === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const PAGE_LIMIT = 5;
      
      // 🚀 Fetch entities AND drafts
      const [dealersData, farmersData, distributorsData, draftsData] = await Promise.all([
        fetchMyDealers(user.id, pageNumber, PAGE_LIMIT),
        fetchMyFarmers(user.id, pageNumber, PAGE_LIMIT),
        fetchMyDistributors(user.id, pageNumber, PAGE_LIMIT),
        pageNumber === 0 ? fetchMyDrafts(user.id) : Promise.resolve([]) // Fetch drafts once on refresh/mount
      ]);

      const mappedDistributors = distributorsData.map((d: any) => ({
        id: d.id, name: d.firm_name, type: "Distributor", 
        city: d.city || 'N/A', // 🚀 FIX: Directly access city and state columns
        state: d.state || 'N/A', 
        score: d.total_score || 0, raw: d, isDraft: false
      }));

      const mappedDealers = dealersData.map((d: any) => ({
        id: d.id, name: d.primary_shop_name || d.shop_name, type: "Dealer", city: d.primary_shop_location?.city || d.city,
        state: d.primary_shop_location?.state || d.state, score: d.total_score || 0, raw: d, isDraft: false
      }));

      const mappedFarmers = farmersData.map((f: any) => ({
        id: f.id, name: f.full_name, type: "Farmer", city: f.personal_details?.city || f.village,
        state: f.personal_details?.state || "N/A", score: 0, raw: f, isDraft: false
      }));

      if (pageNumber === 0) {
        setDistributors(mappedDistributors);
        setDealers(mappedDealers);
        setFarmers(mappedFarmers);
        setDbDrafts(draftsData); // Save drafts to state
      } else {
        setDistributors(prev => [...prev, ...mappedDistributors]);
        setDealers(prev => [...prev, ...mappedDealers]);
        setFarmers(prev => [...prev, ...mappedFarmers]);
      }

      setHasMore(dealersData.length === PAGE_LIMIT || farmersData.length === PAGE_LIMIT || distributorsData.length === PAGE_LIMIT);
      setPage(pageNumber);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      loadingPageRef.current = null; 
    }
  };
  
  useFocusEffect(
    useCallback(() => {
      loadData(0);
    }, [user?.id])
  );
  
  const onRefresh = () => loadData(0, true);

  // --- DISTRIBUTOR FILTERING & SORTING ---
  const processedDistributors = useMemo(() => {
    let result = [...mappedDrafts.Distributors, ...distributors]; // Mix drafts & completed
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(d => 
        (d.name || "").toLowerCase().includes(query) || 
        (d.city || "").toLowerCase().includes(query) ||
        (d.state || "").toLowerCase().includes(query) ||
        (d.raw?.raw_data?.contactPerson || d.raw?.contactPerson || "").toLowerCase().includes(query) ||
        // 🚀 Added phone number search for Distributors (DB & Drafts)
        (d.raw?.contact_mobile || d.raw?.contactMobile || d.raw?.raw_data?.contactMobile || "").includes(query)
      );
    }

    if (filters.completionStatus.length > 0) {
      result = result.filter(d => filters.completionStatus.includes(d.isDraft ? "Incomplete" : "Completed"));
    }

    if (filters.distributorBand.length > 0) {
      result = result.filter((d) => {
        const band = d.raw?.band || "";
        return filters.distributorBand.some(b => band.includes(b));
      });
    }

    if (filters.distributorStatus.length > 0) {
      result = result.filter((d) => filters.distributorStatus.includes(d.raw?.raw_data?.proposedStatus || d.raw?.proposedStatus));
    }

    if (filters.distributorColdChain.length > 0) {
      result = result.filter((d) => filters.distributorColdChain.includes(d.raw?.raw_data?.coldChainFacility || d.raw?.coldChainFacility));
    }

    result.sort((a, b) => {
      if (filters.sortBy === "score_high") return b.score - a.score;
      if (filters.sortBy === "score_low") return a.score - b.score;
      return 0; 
    });

    return result;
  }, [distributors, mappedDrafts.Distributors, searchQuery, filters]);

  // --- DEALER FILTERING & SORTING ---
  const processedDealers = useMemo(() => {
    let result = [...mappedDrafts.Dealers, ...dealers]; // Mix drafts & completed

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          (d.name || "").toLowerCase().includes(query) ||
          (d.city || "").toLowerCase().includes(query) ||
          (d.state || "").toLowerCase().includes(query) ||
          (d.raw?.contact_person || d.raw?.contactPerson || "").toLowerCase().includes(query) ||
          // 🚀 Added phone number search for Dealers (DB & Drafts)
          (d.raw?.contact_mobile || d.raw?.contactMobile || "").includes(query)
      );
    }

    if (filters.completionStatus.length > 0) {
      result = result.filter(d => filters.completionStatus.includes(d.isDraft ? "Incomplete" : "Completed"));
    }

    if (filters.category.length > 0) {
      result = result.filter((d) => filters.category.includes(d.raw?.category));
    }
    if (filters.proposedStatus.length > 0) {
      result = result.filter((d) => filters.proposedStatus.includes(d.raw?.proposed_status || d.raw?.proposedStatus));
    }
    if (filters.firmType.length > 0) {
      result = result.filter((d) => filters.firmType.includes(d.raw?.firm_type || d.raw?.firmType));
    }
    if (filters.linkedStatus.length > 0) {
      result = result.filter((item) => {
        const isLinked = (item.raw?.distributor_links?.isLinked || item.raw?.distributorLinks?.isLinked) === 'Yes' ? 'Linked' : 'Unlinked';
        return filters.linkedStatus.includes(isLinked);
      });
    }
    if (filters.willingDemoFarmers.length > 0) {
      result = result.filter((item) => {
        const willing = (item.raw?.demo_farmers_data?.willing || item.raw?.demoFarmersData?.willing) === 'Yes' ? 'Yes' : 'No';
        return filters.willingDemoFarmers.includes(willing);
      });
    }

    result.sort((a, b) => {
      if (filters.sortBy === "score_high") return b.score - a.score;
      if (filters.sortBy === "score_low") return a.score - b.score;
      return 0; 
    });

    return result;
  }, [dealers, mappedDrafts.Dealers, searchQuery, filters]);

  const isFilterActive = JSON.stringify(filters) !== JSON.stringify(defaultFilters);

  // --- FARMER FILTERING & SORTING ---
  const processedFarmers = useMemo(() => {
    let result = [...mappedDrafts.Farmers, ...farmers]; // Mix drafts & completed
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          (f.name || "").toLowerCase().includes(query) ||
          (f.city || "").toLowerCase().includes(query) ||
          (f.state || "").toLowerCase().includes(query) ||
          (f.raw?.village || "").toLowerCase().includes(query) ||
          (f.raw?.personal_details?.fatherName || f.raw?.personalDetails?.fatherName || "").toLowerCase().includes(query) ||
          // 🚀 Added/Enhanced phone number search for Farmers (DB & Drafts)
          (f.raw?.mobile || f.raw?.contactMobile || "").includes(query)
      );
    }

    if (filters.completionStatus.length > 0) {
      result = result.filter(d => filters.completionStatus.includes(d.isDraft ? "Incomplete" : "Completed"));
    }

    if (filters.scale.length > 0) {
      result = result.filter((f) => {
        const land = parseFloat(f.raw?.farm_details?.totalLand || f.raw?.farmDetails?.totalLand || "0");
        let scale = "Large";
        if (land < 2) scale = "Marginal";
        else if (land >= 2 && land <= 5) scale = "Small";
        return filters.scale.includes(scale);
      });
    }
    if (filters.farmerCrops.length > 0) {
      result = result.filter((f) => {
        const crops = f.raw?.farm_details?.majorCrops || f.raw?.farmDetails?.majorCrops || [];
        return filters.farmerCrops.some((c) => crops.includes(c)); 
      });
    }
    if (filters.farmerSoil.length > 0) {
      const PREDEFINED_SOILS = ["Black", "Sandy", "Red", "Loamy"];
      result = result.filter((f) => {
        const soils = f.raw?.farm_details?.soilType || f.raw?.farmDetails?.soilType || [];
        return filters.farmerSoil.some((s) => {
          if (s === "Others") return soils.some((soil: string) => !PREDEFINED_SOILS.includes(soil));
          return soils.includes(s);
        });
      });
    }
    if (filters.farmerWater.length > 0) {
      const PREDEFINED_WATER = ["Canal", "Borewell", "Rain"];
      result = result.filter((f) => {
        const waters = f.raw?.farm_details?.waterSource || f.raw?.farmDetails?.waterSource || [];
        return filters.farmerWater.some((w) => {
          if (w === "Others") return waters.some((water: string) => !PREDEFINED_WATER.includes(water));
          return waters.includes(w);
        });
      });
    }

    result.sort((a, b) => {
      if (filters.sortBy === "land_high") return parseFloat(b.raw?.farm_details?.totalLand || b.raw?.farmDetails?.totalLand || "0") - parseFloat(a.raw?.farm_details?.totalLand || a.raw?.farmDetails?.totalLand || "0");
      if (filters.sortBy === "land_low") return parseFloat(a.raw?.farm_details?.totalLand || a.raw?.farmDetails?.totalLand || "0") - parseFloat(b.raw?.farm_details?.totalLand || b.raw?.farmDetails?.totalLand || "0");
      return 0; 
    });

    return result;
  }, [farmers, mappedDrafts.Farmers, searchQuery, filters]);

  const tabPages = [
    {
      key: "Distributors",
      data: processedDistributors,
      emptyMsg: "Onboard distributors to streamline your agricultural supply chain.",
      icon: "domain",
      actionId: "distributor",
      actionLabel: "Add Distributor",
      actionIcon: "domain",
    },
    {
      key: "Dealers",
      data: processedDealers, 
      emptyMsg: "Start building your network by onboarding your first dealer.",
      icon: "storefront",
      actionId: "dealer",
      actionLabel: "Add Dealer",
      actionIcon: "storefront",
    },
    {
      key: "Farmers",
      data: processedFarmers, 
      emptyMsg: "Connect with farmers and manage their profiles efficiently here.",
      icon: "agriculture",
      actionId: "farmer",
      actionLabel: "Add Farmer",
      actionIcon: "agriculture",
    },
  ];

  const getScoreColor = (score: number) => {
    if (score > 60) return '#3730A3';
    if (score >= 46) return '#166534';
    if (score >= 26) return '#B45309';
    return '#991B1B';                  
  };

  const handleDeleteDraft = useCallback((entityId: string) => {
    useAlertStore.getState().showAlert(
      t("Delete Draft"), 
      t("Are you sure you want to delete this incomplete profile?"), 
      [
        { text: t("Cancel"), style: "cancel" },
        { 
          text: t("Delete"), 
          style: "destructive", 
          onPress: async () => {
            setLoading(true);
            try {
              await deleteDraft(entityId);
              loadData(0, true); // Refresh the list
            } catch (e) {
              console.error("Failed to delete draft:", e);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  }, [t]);

  const renderDealerItem = useCallback(({ item }: any) => (
    <EntityCard item={item} navigation={navigation} t={t} onDeleteDraft={handleDeleteDraft} /> // 👈 Pass down onDeleteDraft
  ), [navigation, t, handleDeleteDraft]);

  interface EntityCardProps { item: any; navigation: any; t: any; onDeleteDraft: (id: string) => void; } // 👈 Added onDeleteDraft type

  const EntityCard = React.memo(({ item, navigation, t, onDeleteDraft }: EntityCardProps) => {
    const [menuVisible, setMenuVisible] = useState(false);
    const iconRef = useRef<View>(null);
    const [menuCoords, setMenuCoords] = useState({ top: 0, right: 0 });
    
    const isDealer = item.type === 'Dealer';
    const isDistributor = item.type === 'Distributor';
    const isFarmer = item.type === 'Farmer';
    const hasScore = !item.isDraft && (isDealer || isDistributor);
    
    // GPS Mapping
    const gps = isDealer ? (item.raw.primary_shop_location?.gps?.exterior || item.raw.primaryShopLocation?.gps?.exterior) : null;
    
    // 🚀 Dynamic extraction for 4 most important attributes based on Entity Type + Draft status
    let infoBlocks: { icon: string, value: any, isPhone: boolean, translate?: boolean }[] = [];

    if (isDealer) {
      const person = item.raw.contact_person || item.raw.contactPerson || item.raw.owners?.[0]?.name;
      const phone = item.raw.contact_mobile || item.raw.contactMobile;
      const firm = item.raw.firm_type || item.raw.firmType;
      const est = item.raw.est_year || item.raw.estYear;
      
      infoBlocks = [
        { icon: 'person', value: person, isPhone: false },
        { icon: 'phone', value: phone, isPhone: true },
        { icon: 'business', value: firm, isPhone: false, translate: true },
        { icon: 'event', value: est ? `Est: ${est}` : null, isPhone: false },
      ];
    } else if (isDistributor) {
      const person = item.raw.contact_person || item.raw.contactPerson;
      const phone = item.raw.contact_mobile || item.raw.contactMobile;
      const firm = item.raw.firm_type || item.raw.firmType;
      const turnover = item.raw.business_scope?.turnoverPotential || item.raw.turnoverPotential;

      infoBlocks = [
        { icon: 'person', value: person, isPhone: false },
        { icon: 'phone', value: phone, isPhone: true },
        { icon: 'business', value: firm, isPhone: false, translate: true },
        { icon: 'account-balance-wallet', value: turnover ? `₹${turnover} Cr` : null, isPhone: false },
      ];
    } else if (isFarmer) {
      // 🚀 FIX: Removed Father's Name, Added Water Source, Prioritized Phone Number
      const phone = item.raw.mobile || item.raw.contactMobile;
      const land = item.raw.farm_details?.totalLand || item.raw.totalLand;
      const rawCrops = item.raw.farm_details?.majorCrops || item.raw.majorCrops;
      const crops = Array.isArray(rawCrops) ? rawCrops.join(', ') : rawCrops;
      const rawWater = item.raw.farm_details?.waterSource || item.raw.waterSource;
      const water = Array.isArray(rawWater) ? rawWater.join(', ') : rawWater;

      infoBlocks = [
        { icon: 'phone', value: phone, isPhone: true },
        { icon: 'landscape', value: land ? `${land} Acres` : null, isPhone: false },
        { icon: 'grass', value: crops, isPhone: false, translate: true },
        { icon: 'water-drop', value: water, isPhone: false, translate: true },
      ];
    }

    // Filter out items that haven't been filled yet
    const validBlocks = infoBlocks.filter(b => b.value && String(b.value).trim() !== '');

    const badgeBg = isDealer ? '#FEF3C7' : isDistributor ? '#FFEDD5' : '#E0E7FF';
    const badgeColor = isDealer ? colors.warning : isDistributor ? colors.secondary : '#4F46E5';

    const handleMenuPress = () => {
      if (menuVisible) {
        setMenuVisible(false);
        return;
      }
      iconRef.current?.measureInWindow((x, y, w, h) => {
        setMenuCoords({ top: y + h, right: width - x - w });
        setMenuVisible(true);
      });
    };

    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          marginBottom: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          ...shadows.soft,
          overflow: "hidden"
        }}
      >
        <View style={{ width: 6, position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: item.isDraft ? '#94A3B8' : (hasScore ? getScoreColor(item.score) : colors.success) }} />
        <View style={{ padding: spacing.lg, paddingLeft: spacing.xl }}>
          
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>
                  {item.name}
                </Text>
                {/* 🚀 Draft Tag Beside Name */}
                {item.isDraft && (
                  <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ color: '#DC2626', fontSize: 10, fontWeight: "800", textTransform: 'uppercase' }}>{t("Draft")}</Text>
                  </View>
                )}
              </View>
              
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, flexWrap: "wrap", gap: 8 }}>
                {item.city && item.state ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialIcons name="location-on" size={14} color={colors.textMuted} />
                    <Text style={{ fontSize: 13, color: colors.textMuted, marginLeft: 4 }}>
                      {item.city}, {item.state}
                    </Text>
                  </View>
                ) : null}
                
                {isDealer && gps?.lat && gps?.lng && (
                  <Pressable 
                    onPress={() => Linking.openURL(`https://maps.google.com/?q=${gps.lat},${gps.lng}`)}
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#BFDBFE' }}
                  >
                    <MaterialIcons name="map" size={12} color="#2563EB" style={{ marginRight: 2 }} />
                    <Text style={{ fontSize: 10, color: '#2563EB', fontWeight: '800' }}>{t("MAP")}</Text>
                  </Pressable>
                )}
              </View>
            </View>

            <View>
              {item.isDraft ? (
                /* 🚀 Delete Bin Icon for Drafts */
                <Pressable onPress={() => onDeleteDraft(item.entityId)} style={{ padding: spacing.xs }} hitSlop={10}>
                  <MaterialIcons name="delete-outline" size={24} color="#DC2626" />
                </Pressable>
              ) : (
                <>
                  <Pressable ref={iconRef} onPress={handleMenuPress} style={{ padding: spacing.xs }} hitSlop={10}>
                    <MaterialIcons name="more-vert" size={24} color={colors.textMuted} />
                  </Pressable>

                  <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
                    <Pressable style={{ flex: 1 }} onPress={() => setMenuVisible(false)}>
                      <View
                        style={{
                          position: "absolute", top: menuCoords.top, right: menuCoords.right, backgroundColor: colors.surface,
                          borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, width: 170, ...shadows.medium, elevation: 5,
                        }}
                      >
                        <Pressable
                          onPress={() => {
                            setMenuVisible(false);
                            if (item.type === 'Farmer') navigation.navigate("FarmerOnboarding", { editData: item.raw });
                            else if (item.type === 'Distributor') navigation.navigate("DistributorOnboarding", { editData: item.raw });
                            else navigation.navigate("DealerOnboarding", { editData: item.raw });
                          }}
                          style={{ flexDirection: "row", alignItems: "center", padding: spacing.md }}
                        >
                          <MaterialIcons name="edit" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
                          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>{t("Edit Profile")}</Text>
                        </Pressable>
                      </View>
                    </Pressable>
                  </Modal>
                </>
              )}
            </View>
          </View>

          {/* 🚀 Unified Grid Box */}
          <View style={{ 
             marginTop: spacing.md,
             backgroundColor: '#F8FAFC',
             padding: spacing.md,
             borderRadius: radius.md,
             borderWidth: 1,
             borderColor: colors.border 
           }}>
            
            {validBlocks.length === 0 ? (
              <Text style={{ fontSize: 13, color: colors.textMuted, fontStyle: 'italic', fontWeight: '600' }}>
                {t("Profile details are incomplete")}
              </Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs, rowGap: spacing.sm }}>
                {validBlocks.map((block, idx) => (
                  <View key={idx} style={{ width: '50%', paddingHorizontal: spacing.xs, flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialIcons name={block.icon as any} size={16} color={colors.primary} />
                    {block.isPhone ? (
                      <Pressable onPress={() => Linking.openURL(`tel:${block.value}`)} style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: colors.primary, marginLeft: 6, fontWeight: '700', textDecorationLine: 'underline' }} numberOfLines={1}>
                          +91 {block.value}
                        </Text>
                      </Pressable>
                    ) : (
                      <Text style={{ fontSize: 13, color: colors.text, marginLeft: 6, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                        {block.translate ? t(block.value as string) : block.value}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: spacing.lg }}>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ backgroundColor: badgeBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill }}>
                <Text style={{ color: badgeColor, fontSize: 12, fontWeight: "700" }}>{t(item.type)}</Text>
              </View>
              {/* Only show Approved tag if it's NOT a draft */}
              {!item.isDraft && (
                <View style={{ backgroundColor: item.raw.status === 'SUBMITTED' ? '#DCFCE7' : '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill }}>
                  <Text style={{ color: item.raw.status === 'SUBMITTED' ? '#166534' : colors.textMuted, fontSize: 12, fontWeight: "700" }}>
                    {t(item.raw.status === 'SUBMITTED' ? 'Approved' : 'Pending')}
                  </Text>
                </View>
              )}
            </View>

            {hasScore && (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: "800", letterSpacing: 0.5, marginBottom: 2 }}>{t("SCORE")}</Text>
                <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                  <Text style={{ fontSize: 20, fontWeight: "900", color: getScoreColor(item.score) }}>{item.score}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

          <Pressable
            onPress={() => {
              if (item.isDraft) {
                if (item.type === 'Farmer') navigation.navigate("FarmerOnboarding", { draftId: item.entityId, draftData: item.raw, initialStep: item.step });
                else if (item.type === 'Distributor') navigation.navigate("DistributorOnboarding", { draftId: item.entityId, draftData: item.raw, initialStep: item.step });
                else navigation.navigate("DealerOnboarding", { draftId: item.entityId, draftData: item.raw, initialStep: item.step });
              } else {
                navigation.navigate("EntityProfile", { entity: item });
              }
            }}
            style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}
          >
            <Text style={{ color: item.isDraft ? '#D97706' : colors.primary, fontWeight: "800", fontSize: 14, marginRight: 4 }}>
              {item.isDraft ? t("Resume Onboarding") : t("View Profile")}
            </Text>
            <MaterialIcons name={item.isDraft ? "edit-document" : "chevron-right"} size={18} color={item.isDraft ? '#D97706' : colors.primary} />
          </Pressable>
        </View>
      </View>
    );
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.screen, paddingTop: 50 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ padding: 0, borderRadius: 12, marginRight: spacing.sm }}>
            <Image 
              source={require('../../../../assets/company-logo.jpeg')} 
              style={{ width: 180, height: 52, resizeMode: 'contain', borderRadius: 8 }} 
            />
          </View>
        </View>
      </View>

      <View style={{ flexDirection: "row", paddingHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, height: 48 }}>
          <Search size={20} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            // 🚀 Updated placeholder text
            placeholder={t("Search by name, phone, or location...")}
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, marginLeft: spacing.sm, fontSize: 13, fontWeight: "500", color: colors.text }}
          />
        </View>
        <Pressable
          onPress={() => setIsFilterModalOpen(true)}
          style={{
            width: 48, height: 48,
            backgroundColor: isFilterActive ? colors.primarySoft : colors.surface,
            borderRadius: radius.md, borderWidth: 1,
            borderColor: isFilterActive ? colors.primary : colors.border,
            justifyContent: "center", alignItems: "center",
          }}
        >
          <Filter size={20} color={isFilterActive ? colors.primary : colors.textMuted} />
        </Pressable>
      </View>

      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: spacing.lg,
          marginBottom: spacing.sm,
        }}
      >
        {tabPages.map((tab, index) => (
          <Pressable
            key={tab.key}
            onPress={() => {
              setActiveTab(index);
              pagerRef.current?.scrollToIndex({ index, animated: true });
            }}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderBottomWidth: 2,
              borderBottomColor: activeTab === index ? colors.primary : "transparent",
              alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "800", color: activeTab === index ? colors.primary : colors.textMuted }}>
              {t(tab.key)}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        ref={pagerRef}
        data={tabPages}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={0}
        getItemLayout={(data, index) => ({ length: width, offset: width * index, index })}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          if (activeTab !== index) setActiveTab(index);
        }}
        renderItem={({ item }) => (
          <View style={{ width }}>
            <FlatList
              data={item.data}
              renderItem={renderDealerItem}
              keyExtractor={(i) => i.id}
              contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              onEndReached={() => {
                if (hasMore && !loadingMore && !loading && !refreshing) {
                  loadData(page + 1);
                }
              }}
              onEndReachedThreshold={0.5}
              ListFooterComponent={() => loadingMore ? <View style={{ paddingVertical: spacing.md }}><ActivityIndicator color={colors.primary} /></View> : null}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
              ListEmptyComponent={
                (loading || isMigrating) && !refreshing ? (
                  <View style={{ marginTop: 60, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    {isMigrating && (
                       <Text style={{ marginTop: 10, color: colors.primary, fontWeight: '700' }}>
                         {t("Syncing drafts...")}
                       </Text>
                    )}
                  </View>
                ) : (
                  <EmptyState
                    title={t(searchQuery ? "No Results Found" : `No ${item.key} Yet`)}
                    description={t(searchQuery ? "Try adjusting your search criteria." : item.emptyMsg)}
                    iconName={item.icon as any}
                    actionLabel={t(item.actionLabel)}
                    actionIcon={item.actionIcon as any}
                    onAction={() => {
                      if (item.actionId === "dealer") navigation.navigate("DealerOnboarding");
                      else if (item.actionId === "farmer") navigation.navigate("FarmerOnboarding");
                      else if (item.actionId === "distributor") navigation.navigate("DistributorOnboarding");
                      else navigation.navigate("ComingSoonScreen");
                    }}
                  />
                )
              }
            />
          </View>
        )}
      />

      <FloatingActionMenu
        actions={[
          { id: "dealer", label: t("Add Dealer"), icon: "storefront" },
          { id: "farmer", label: t("Add Farmer"), icon: "agriculture" },
          { id: "distributor", label: t("Add Distributor"), icon: "domain" },
        ]}
        onActionPress={(id) => {
          if (id === "dealer") navigation.navigate("DealerOnboarding");
          else if (id === "farmer") navigation.navigate("FarmerOnboarding");
          else if (id === "distributor") navigation.navigate("DistributorOnboarding");
          else navigation.navigate("ComingSoonScreen");
        }}
      />

      <FilterModal
        visible={isFilterModalOpen}
        entityType={tabPages[activeTab].key} 
        currentFilters={filters}
        onApply={(newFilters) => setFilters(newFilters)}
        onClose={() => setIsFilterModalOpen(false)}
      />
    </View>
  );
};