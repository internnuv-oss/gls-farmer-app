import React, { useRef, useState, useCallback, useMemo, useEffect } from "react";
import * as crypto from 'expo-crypto';
import {
  View, Text, FlatList, Pressable, Dimensions, TextInput,
  ActivityIndicator, Modal, RefreshControl, Linking, Image, ScrollView
} from "react-native";
import { useTranslation } from "react-i18next";
import { Search, Filter } from "lucide-react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useAuthStore } from "../../../store/authStore";
import { useAlertStore } from "../../../store/alertStore";
import { useDraftStore } from "../../../store/draftStore";
import { supabase } from "../../../core/supabase";
import { ActiveShiftWidget } from '../../shifts/components/ActiveShiftWidget';
import { useShiftStore } from '../../../store/shiftStore';
import { 
  fetchMyDealers, 
  fetchMyFarmers, 
  fetchMyDistributors, 
  fetchMyDrafts, 
  deleteDraft, 
  fetchMyFPOs, 
  fetchMyRoutes 
} from "../services/dashboardService";
import { syncLocationsToSupabase } from '../../../core/locationUtils';

import { FloatingActionMenu, EmptyState, EntityCard } from "../../../design-system/components";
import { colors, radius, spacing, shadows } from "../../../design-system/tokens";
import { FilterModal, FilterState, defaultFilters } from "../../../design-system/components/FilterModal";
import { AnalyticsTable } from "../components/AnalyticsTable";

const { width } = Dimensions.get("window");

export const DashboardScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState(0); 
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const pagerRef = useRef<FlatList>(null);

  // 🚀 BACKGROUND SYNC HEARTBEAT
  useEffect(() => {
    // Sync immediately when the user opens the dashboard
    syncLocationsToSupabase();

    // Set a timer to sync every 60 seconds while the app is alive
    const syncInterval = setInterval(() => {
      syncLocationsToSupabase();
    }, 60000);

    // Cleanup the timer when they leave the dashboard
    return () => clearInterval(syncInterval);
  }, []);
  
  const incrementActivity = useShiftStore((state) => state.incrementActivity);

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
  const [dbDrafts, setDbDrafts] = useState<any[]>([]);
  const [fpos, setFpos] = useState<any[]>([]); 
  const [routes, setRoutes] = useState<any[]>([]); 

  // Drill-down states for Farmers Tab
  const [farmerViewMode, setFarmerViewMode] = useState<'routes' | 'villages' | 'profiles'>('routes');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedVillageName, setSelectedVillageName] = useState<string | null>(null);

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
          const migrationPayload = myLocalDrafts.map((draft: any) => {
            return {
              se_id: user.id,
              entity_type: draft.type.toLowerCase(), 
              entity_id: draft.id,
              draft_data: draft.data,
              current_step: draft.data._step || 1, 
              updated_at: new Date(draft.updatedAt || Date.now()).toISOString()
            };
          });

          const { error } = await supabase.from('drafts').upsert(migrationPayload, { onConflict: 'entity_id' });
          if (error) throw error;
          clearLocalDrafts();
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

  // Analytics Modal State
  const [analyticsModalConfig, setAnalyticsModalConfig] = useState<{isOpen: boolean; entities: any[]; title: string}>({ isOpen: false, entities: [], title: '' });

  const mappedDrafts = useMemo(() => {
    return {
      Distributors: dbDrafts.filter(d => d.entity_type === 'distributor').map(d => ({
        id: d.id, entityId: d.entity_id, name: d.draft_data?.firmName || d.draft_data?.firm_name || 'Incomplete Distributor', type: 'Distributor',
        city: d.draft_data?.city || d.draft_data?.raw_data?.city || '', state: d.draft_data?.state || d.draft_data?.raw_data?.state || '', score: 0, raw: d.draft_data, step: d.current_step, isDraft: true,
        updatedAt: d.updated_at 
      })),
      Dealers: dbDrafts.filter(d => d.entity_type === 'dealer').map(d => ({
        id: d.id, entityId: d.entity_id, name: d.draft_data?.primaryShopName || d.draft_data?.shopName || 'Incomplete Dealer', type: 'Dealer',
        city: d.draft_data?.primaryShopLocation?.city || d.draft_data?.city || '', state: d.draft_data?.primaryShopLocation?.state || d.draft_data?.state || '', score: 0, raw: d.draft_data, step: d.current_step, isDraft: true,
        updatedAt: d.updated_at 
      })),
      Farmers: dbDrafts.filter(d => d.entity_type === 'farmer').map(d => ({
        id: d.id, entityId: d.entity_id, name: d.draft_data?.fullName || d.draft_data?.full_name || 'Incomplete Farmer', type: 'Farmer',
        city: d.draft_data?.city || d.draft_data?.village || '', 
        state: d.draft_data?.state || '', 
        score: 0, raw: d.draft_data, step: d.current_step, isDraft: true,updatedAt: d.updated_at 
      })),
      FPOs: dbDrafts.filter(d => d.entity_type === 'fpo').map(d => ({
        id: d.id, entityId: d.entity_id, name: d.draft_data?.fpoName || d.draft_data?.fpo_name || 'Incomplete FPO', type: 'FPO',
        city: d.draft_data?.city || d.draft_data?.raw_data?.city || '', state: d.draft_data?.state || d.draft_data?.raw_data?.state || '', score: 0, raw: d.draft_data, step: d.current_step, isDraft: true,
        updatedAt: d.updated_at 
      }))
    };
  }, [dbDrafts]);

  const loadData = async (pageNumber: number = 0, isRefresh = false) => {
    if (!user?.id || loadingPageRef.current === pageNumber) return; 
    
    loadingPageRef.current = pageNumber; 
    
    if (isRefresh) setRefreshing(true);
    else if (pageNumber === 0 && farmers.length === 0) setLoading(true);
    else if (pageNumber > 0) setLoadingMore(true);

    try {
      // 🚀 A healthy middle-ground. 5 is too small and causes jittery counting. 
      // 50 loads instantly without choking the frontend memory.
      const PAGE_LIMIT = 50; 
      
      const [dealersData, farmersData, distributorsData, fposData, draftsData, routesData] = await Promise.all([
        fetchMyDealers(user.id, pageNumber, PAGE_LIMIT),
        fetchMyFarmers(user.id, pageNumber, PAGE_LIMIT),
        fetchMyDistributors(user.id, pageNumber, PAGE_LIMIT),
        fetchMyFPOs(user.id, pageNumber, PAGE_LIMIT),
        pageNumber === 0 ? fetchMyDrafts(user.id) : Promise.resolve([]),
        pageNumber === 0 ? fetchMyRoutes(user.id) : Promise.resolve([]) 
      ]);

      const mappedDistributors = distributorsData.map((d: any) => ({
        id: d.id, name: d.firm_name, type: "Distributor", 
        city: d.city || 'N/A', state: d.state || 'N/A', 
        score: d.total_score || 0, raw: d, isDraft: false,
        updatedAt: d.updated_at || d.created_at
      }));

      const mappedDealers = dealersData.map((d: any) => ({
        id: d.id, name: d.primary_shop_name || d.shop_name, type: "Dealer", city: d.primary_shop_location?.city || d.city,
        state: d.primary_shop_location?.state || d.state, score: d.total_score || 0, raw: d, isDraft: false,
        updatedAt: d.updated_at || d.created_at
      }));

      const mappedFarmers = farmersData.map((f: any) => ({
        id: f.id, name: f.full_name, type: "Farmer", city: f.personal_details?.city || f.village,
        state: f.personal_details?.state || "N/A", score: f.fspp_details?.score, raw: f, isDraft: false,
        updatedAt: f.updated_at || f.created_at
      }));

      const mappedFPOs = fposData.map((f: any) => ({
        id: f.id, name: f.fpo_name, type: "FPO", city: f.city || "N/A", state: f.state || "N/A", score: f.total_score || 0, raw: f, isDraft: false,
        updatedAt: f.updated_at || f.created_at
      }));

      // 🚀 FIX: The Smart Merge Engine
      // Prevents the "decreasing numbers" glitch by updating existing profiles 
      // without deleting the pages the user has already scrolled to load!
      const mergeById = (prevArray: any[], newArray: any[]) => {
        const map = new Map(prevArray.map(item => [item.id, item]));
        newArray.forEach(item => map.set(item.id, item));
        return Array.from(map.values()).sort((a: any, b: any) => 
          new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
        );
      };

      // 🚀 CRITICAL FIX: Always merge by ID, even on screen focus.
      // This stops the array from dropping items from local state!
      setDistributors(prev => mergeById(prev, mappedDistributors));
      setDealers(prev => mergeById(prev, mappedDealers));
      setFarmers(prev => mergeById(prev, mappedFarmers));
      setFpos(prev => mergeById(prev, mappedFPOs));

      if (pageNumber === 0) {
        setDbDrafts(draftsData);
        setRoutes(routesData); 
      }

      setHasMore(dealersData.length === PAGE_LIMIT || farmersData.length === PAGE_LIMIT || distributorsData.length === PAGE_LIMIT || fposData.length === PAGE_LIMIT);
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
  
  const onRefresh = async () => {
    // 🚀 FIX: Force the shift state to resync with the DB whenever they refresh the dashboard
    await useShiftStore.getState().hydrateShifts();
    loadData(0, true);
  };

  const extractVillages = (routeData: any) => {
    let v: string[] = [];
    let locs = routeData.locations;
    
    // Safety check in case Supabase returns JSONB as a string
    if (typeof locs === 'string') {
      try { locs = JSON.parse(locs); } catch (e) {}
    }
    
    if (Array.isArray(locs)) {
      locs.forEach((loc: any) => {
        if (Array.isArray(loc.villages)) v.push(...loc.villages);
      });
    }
    return v;
  };

  // --- DISTRIBUTOR FILTERING & SORTING ---
  const processedDistributors = useMemo(() => {
    const completedPhones = new Set(distributors.map(d => d.raw?.contact_mobile));
    const activeDrafts = mappedDrafts.Distributors.filter(d => !completedPhones.has(d.raw?.contactMobile));

    let result = [...activeDrafts, ...distributors];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(d => 
        (d.name || "").toLowerCase().includes(query) || 
        (d.city || "").toLowerCase().includes(query) ||
        (d.state || "").toLowerCase().includes(query) ||
        (d.raw?.raw_data?.contactPerson || d.raw?.contactPerson || "").toLowerCase().includes(query) ||
        (d.raw?.contact_mobile || d.raw?.contactMobile || d.raw?.raw_data?.contactMobile || "").includes(query)
      );
    }
    if (filters.completionStatus.length > 0) result = result.filter(d => filters.completionStatus.includes(d.isDraft ? "Incomplete" : "Completed"));
    if (filters.distributorBand.length > 0) result = result.filter((d) => filters.distributorBand.some(b => (d.raw?.band || "").includes(b)));
    if (filters.distributorStatus.length > 0) result = result.filter((d) => filters.distributorStatus.includes(d.raw?.raw_data?.proposedStatus || d.raw?.proposedStatus));
    if (filters.distributorColdChain.length > 0) result = result.filter((d) => filters.distributorColdChain.includes(d.raw?.raw_data?.coldChainFacility || d.raw?.coldChainFacility));

    result.sort((a, b) => {
      if (filters.sortBy === "score_high") return b.score - a.score;
      if (filters.sortBy === "score_low") return a.score - b.score;
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime(); 
    });
    return result;
  }, [distributors, mappedDrafts.Distributors, searchQuery, filters]);

  // --- DEALER FILTERING & SORTING ---
  const processedDealers = useMemo(() => {
    const completedPhones = new Set(dealers.map(d => d.raw?.contact_mobile));
    const activeDrafts = mappedDrafts.Dealers.filter(d => !completedPhones.has(d.raw?.contactMobile));

    let result = [...activeDrafts, ...dealers];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(d =>
          (d.name || "").toLowerCase().includes(query) ||
          (d.city || "").toLowerCase().includes(query) ||
          (d.state || "").toLowerCase().includes(query) ||
          (d.raw?.contact_person || d.raw?.contactPerson || "").toLowerCase().includes(query) ||
          (d.raw?.contact_mobile || d.raw?.contactMobile || "").includes(query)
      );
    }

    if (filters.completionStatus.length > 0) result = result.filter(d => filters.completionStatus.includes(d.isDraft ? "Incomplete" : "Completed"));
    if (filters.category.length > 0) result = result.filter((d) => filters.category.includes(d.raw?.category));
    if (filters.proposedStatus.length > 0) result = result.filter((d) => filters.proposedStatus.includes(d.raw?.proposed_status || d.raw?.proposedStatus));
    if (filters.firmType.length > 0) result = result.filter((d) => filters.firmType.includes(d.raw?.firm_type || d.raw?.firmType));
    if (filters.linkedStatus.length > 0) result = result.filter((item) => filters.linkedStatus.includes((item.raw?.distributor_links?.isLinked || item.raw?.distributorLinks?.isLinked) === 'Yes' ? 'Linked' : 'Unlinked'));
    if (filters.willingDemoFarmers.length > 0) result = result.filter((item) => filters.willingDemoFarmers.includes((item.raw?.demo_farmers_data?.willing || item.raw?.demoFarmersData?.willing) === 'Yes' ? 'Yes' : 'No'));

    result.sort((a, b) => {
      if (filters.sortBy === "score_high") return b.score - a.score;
      if (filters.sortBy === "score_low") return a.score - b.score;
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });
    return result;
  }, [dealers, mappedDrafts.Dealers, searchQuery, filters]);

  // --- FARMER FILTERING & SORTING ---
  const processedFarmers = useMemo(() => {
    const completedPhones = new Set(farmers.map(f => f.raw?.mobile));
    const activeDrafts = mappedDrafts.Farmers.filter(f => !completedPhones.has(f.raw?.mobile));

    let result = [...activeDrafts, ...farmers]; 
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(f =>
          (f.name || "").toLowerCase().includes(query) ||
          (f.city || "").toLowerCase().includes(query) ||
          (f.state || "").toLowerCase().includes(query) ||
          (f.raw?.village || "").toLowerCase().includes(query) ||
          (f.raw?.personal_details?.fatherName || f.raw?.personalDetails?.fatherName || "").toLowerCase().includes(query) ||
          (f.raw?.mobile || f.raw?.contactMobile || "").includes(query)
      );
    }

    // 🚀 NEW: Combined Stage Filtering logic (Replaces Completion, FSPP, and Farm Card statuses)
    if (filters.farmerStage && filters.farmerStage.length > 0) {
      result = result.filter((f) => {
        let isMatch = false;
        
        // 1. Check if 'Submitted' is selected
        if (filters.farmerStage.includes('Submitted') && !f.isDraft) {
          isMatch = true;
        }
        
        // 2. Check if 'FSPP' is selected
        if (filters.farmerStage.includes('FSPP')) {
          const hasFspp = !!(f.raw?.fspp_details?.statusLabel || f.raw?.fsppDetails?.statusLabel);
          if (hasFspp) isMatch = true;
        }
        
        // 3. Check if 'Farm Card' is selected
        if (filters.farmerStage.includes('Farm Card')) {
          const hasCards = Array.isArray(f.raw?.farm_cards) && f.raw.farm_cards.length > 0;
          if (hasCards) isMatch = true;
        }
        
        return isMatch;
      });
    }
    
    // Inject Route Filtering
    if (filters.routeId && filters.routeId.length > 0) {
      const selectedRouteVillages = routes
        .filter(r => filters.routeId.includes(r.id))
        .flatMap(r => extractVillages(r))
        .map(v => v.trim().toLowerCase()); 
        
      result = result.filter(f => {
        const fVill = (f.raw?.village || f.raw?.personal_details?.village || '').trim().toLowerCase();
        return selectedRouteVillages.includes(fVill);
      });
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
    
    if (filters.farmerCrops.length > 0) result = result.filter((f) => filters.farmerCrops.some((c) => (f.raw?.farm_details?.majorCrops || f.raw?.farmDetails?.majorCrops || []).includes(c)));
    
    if (filters.farmerSoil.length > 0) {
      const PREDEFINED_SOILS = ["Black", "Sandy", "Red", "Loamy"];
      result = result.filter((f) => filters.farmerSoil.some((s) => s === "Others" ? (f.raw?.farm_details?.soilType || f.raw?.farmDetails?.soilType || []).some((soil: string) => !PREDEFINED_SOILS.includes(soil)) : (f.raw?.farm_details?.soilType || f.raw?.farmDetails?.soilType || []).includes(s)));
    }
    
    if (filters.farmerWater.length > 0) {
      const PREDEFINED_WATER = ["Canal", "Borewell", "Rain"];
      result = result.filter((f) => filters.farmerWater.some((w) => w === "Others" ? (f.raw?.farm_details?.waterSource || f.raw?.farmDetails?.waterSource || []).some((water: string) => !PREDEFINED_WATER.includes(water)) : (f.raw?.farm_details?.waterSource || f.raw?.farmDetails?.waterSource || []).includes(w)));
    }

    result.sort((a, b) => {
      if (filters.sortBy === "land_high") return parseFloat(b.raw?.farm_details?.totalLand || b.raw?.farmDetails?.totalLand || "0") - parseFloat(a.raw?.farm_details?.totalLand || a.raw?.farmDetails?.totalLand || "0");
      if (filters.sortBy === "land_low") return parseFloat(a.raw?.farm_details?.totalLand || a.raw?.farmDetails?.totalLand || "0") - parseFloat(b.raw?.farm_details?.totalLand || b.raw?.farmDetails?.totalLand || "0");
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });
    return result;
  }, [farmers, mappedDrafts.Farmers, searchQuery, filters, routes]);


  // Generate UI data blocks for Route Views
  const processedRoutes = useMemo(() => {
    // 🚀 We combine the raw submitted farmers + raw drafts here to get a stable, un-fluctuating count
    const stableFarmersList = [...farmers, ...mappedDrafts.Farmers];

    // 1. Sort the defined routes alphabetically by name
    let routeCards = [...routes]
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(r => {
        const vills = extractVillages(r);
        const villsLower = vills.map(v => v.trim().toLowerCase());
        
        // 🚀 Count from the stable list, ignoring active filters/search
        const count = stableFarmersList.filter(f => {
          const fVill = (f.raw?.village || f.raw?.personal_details?.village || f.city || '').trim().toLowerCase();
          return villsLower.includes(fVill);
        }).length;
        
        return { id: r.id, name: r.name, villages: vills, count, isUnrouted: false };
    });

    // 2. Calculate Unrouted / Other Villages
    const allRoutedVillagesLower = routeCards.flatMap(r => r.villages).map(v => v.trim().toLowerCase());
    const unroutedFarmers = stableFarmersList.filter(f => {
       const fVill = (f.raw?.village || f.raw?.personal_details?.village || f.city || '').trim().toLowerCase();
       return fVill && !allRoutedVillagesLower.includes(fVill);
    });

    // 3. Append Unrouted at the very end
    if (unroutedFarmers.length > 0) {
      const unroutedVills = Array.from(new Set(unroutedFarmers.map(f => f.raw?.village || f.raw?.personal_details?.village || f.city).filter(Boolean)));
      routeCards.push({
        id: 'unrouted',
        name: t('Others'),
        villages: unroutedVills as string[],
        count: unroutedFarmers.length,
        isUnrouted: true
      });
    }
    return routeCards;
 }, [routes, farmers, mappedDrafts.Farmers, t]);

 const processedVillages = useMemo(() => {
    if (!selectedRouteId) return [];
    const route = processedRoutes.find(r => r.id === selectedRouteId);
    if (!route) return [];

    // 🚀 We use the stable list for villages too
    const stableFarmersList = [...farmers, ...mappedDrafts.Farmers];

    return route.villages.map(vName => {
      // 🚀 Count from the stable list, ignoring active filters/search
      const count = stableFarmersList.filter(f => {
        const fVill = (f.raw?.village || f.raw?.personal_details?.village || f.city || '').trim().toLowerCase();
        return fVill === vName.trim().toLowerCase();
      }).length;
      return { name: vName, count };
    }).filter(v => v.count > 0 || !route.isUnrouted); 
 }, [selectedRouteId, processedRoutes, farmers, mappedDrafts.Farmers]);


  // --- FPO FILTERING & SORTING ---
  const processedFPOs = useMemo(() => {
    const completedPhones = new Set(fpos.map(f => f.raw?.contact_mobile || f.raw?.contactMobile));
    const activeDrafts = mappedDrafts.FPOs.filter(f => !completedPhones.has(f.raw?.contact_mobile || f.raw?.contactMobile));

    let result = [...activeDrafts, ...fpos]; 
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((f) =>
          (f.name || "").toLowerCase().includes(query) ||
          (f.city || "").toLowerCase().includes(query) ||
          (f.state || "").toLowerCase().includes(query) ||
          (f.raw?.ceo_name || f.raw?.ceoName || "").toLowerCase().includes(query) ||
          (f.raw?.contact_mobile || f.raw?.contactMobile || "").includes(query)
      );
    }

    if (filters.completionStatus.length > 0) {
      result = result.filter(d => filters.completionStatus.includes(d.isDraft ? "Incomplete" : "Completed"));
    }

    // 🚀 NEW: FPO Member Scale Filtering
    if (filters.fpoScale && filters.fpoScale.length > 0) {
      result = result.filter((f) => {
        const members = parseInt(f.raw?.total_members || f.raw?.totalMembers || "0", 10);
        let scale = "Large (>1000)";
        if (members < 250) scale = "Small (<250)";
        else if (members >= 250 && members <= 1000) scale = "Medium (250-1000)";
        return filters.fpoScale.includes(scale);
      });
    }

    // 🚀 NEW: FPO Business Activities Filtering
    if (filters.fpoBusiness && filters.fpoBusiness.length > 0) {
      result = result.filter((f) => 
        filters.fpoBusiness.some((b: string) => (f.raw?.business_activities || f.raw?.businessActivities || []).includes(b))
      );
    }

    // 🚀 NEW: FPO Promoting Agency Filtering
    if (filters.fpoPromotingAgency && filters.fpoPromotingAgency.length > 0) {
      result = result.filter((f) => filters.fpoPromotingAgency.includes(f.raw?.promoting_agency || f.raw?.promotingAgency));
    }

    result.sort((a, b) => {
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });

    return result;
  }, [fpos, mappedDrafts.FPOs, searchQuery, filters]);

  const isFilterActive = JSON.stringify(filters) !== JSON.stringify(defaultFilters);

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
    {
      key: "FPOs",
      data: processedFPOs, 
      emptyMsg: "Partner with Farmer Producer Organizations to scale your reach.",
      icon: "groups",
      actionId: "fpo",
      actionLabel: "Add FPO",
      actionIcon: "groups",
    },
  ];



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
              loadData(0, true); 
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
    <EntityCard item={item} navigation={navigation} t={t} onDeleteDraft={handleDeleteDraft} /> 
  ), [navigation, t, handleDeleteDraft]);



  return (
    <View style={{ flex: 1, backgroundColor: colors.screen, paddingTop: 50 }}>
      <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        width: "100%"
      }}
    >
      <View style={{ flexShrink: 0, justifyContent: "center" }}>
        <Image 
          source={require('../../../../assets/company-logo.jpeg')} 
          style={{ width: 140, height: 40, resizeMode: 'contain', borderRadius: 8 }} 
        />
      </View>

      <View style={{ flex: 1, alignItems: "flex-end", justifyContent: "center" }}>
        <ActiveShiftWidget />
      </View>
    </View>

      <View style={{ flexDirection: "row", paddingHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, height: 48 }}>
          <Search size={20} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
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
            {item.key === 'Farmers' && !searchQuery && !isFilterActive ? (
              farmerViewMode === 'routes' ? (
                <FlatList
                  data={processedRoutes}
                  keyExtractor={r => r.id}
                  contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
                  ListHeaderComponent={
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.sm }}>
                      <Pressable 
                        onPress={() => {
                          const routeEntities = processedRoutes.map(r => ({
                            name: r.name,
                            farmers: item.data.filter((f: any) => {
                              const fVill = (f.raw?.village || f.raw?.personal_details?.village || '').trim().toLowerCase();
                              return r.villages.map((v: string) => v.toLowerCase()).includes(fVill);
                            }),
                            villageCount: r.villages.length
                          }));
                          setAnalyticsModalConfig({ isOpen: true, entities: routeEntities, title: t('Routes Analysis') });
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, ...shadows.soft }}
                      >
                        <MaterialIcons name="analytics" size={16} color={colors.primary} />
                        <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '700', color: colors.primary }}>{t("Analysis")}</Text>
                      </Pressable>
                    </View>
                  }
                  renderItem={({ item: route }) => (
                    <Pressable
                      onPress={() => {
                        setSelectedRouteId(route.id);
                        setFarmerViewMode('villages');
                      }}
                      style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadows.soft }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={{ backgroundColor: '#EFF6FF', padding: 12, borderRadius: radius.md, marginRight: spacing.md }}>
                          <MaterialIcons name="route" size={24} color="#2563EB" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }} numberOfLines={1}>{route.name}</Text>
                          <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2, fontWeight: '600' }}>{route.villages.length} {t("Villages")}</Text>
                        </View>
                      </View>
                      <View style={{ backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, marginLeft: spacing.sm }}>
                        <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>{route.count} {t("Profiles")}</Text>
                      </View>
                    </Pressable>
                  )}
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
                        title={t("No Routes Assigned")}
                        description={t("No routes have been assigned to you yet.")}
                        iconName="map"
                        actionLabel={t("Add Farmer Manually")}
                        onAction={() => navigation.navigate("FarmerOnboarding")}
                      />
                    )
                  }
                />
              ) : farmerViewMode === 'villages' ? (
                <View style={{ flex: 1 }}>
                  <Pressable
                    onPress={() => {
                      setFarmerViewMode('routes');
                      setSelectedRouteId(null);
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, paddingBottom: 0 }}
                  >
                    <MaterialIcons name="arrow-back" size={20} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontWeight: '800', marginLeft: 4 }}>{t("Back to Routes")}</Text>
                  </Pressable>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.md }}>
                    <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text, flex: 1 }}>
                      {processedRoutes.find(r => r.id === selectedRouteId)?.name}
                    </Text>
                    
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable 
                        onPress={() => {
                          const route = processedRoutes.find(r => r.id === selectedRouteId);
                          navigation.navigate("TempDealersListScreen", { 
                            title: `${route?.name || 'Route'} Dealers`, 
                            villages: route?.villages || [] 
                          });
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, ...shadows.soft }}
                      >
                        <MaterialIcons name="storefront" size={16} color={colors.primary} />
                        <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '700', color: colors.primary }}>{t("Dealers")}</Text>
                      </Pressable>

                      <Pressable 
                        onPress={() => {
                          const villageEntities = processedVillages.map(v => ({
                            name: v.name,
                            farmers: item.data.filter((f: any) => {
                              const fVill = (f.raw?.village || f.raw?.personal_details?.village || '').trim().toLowerCase();
                              return fVill === v.name.toLowerCase();
                            }),
                            villageCount: 1
                          }));
                          setAnalyticsModalConfig({ isOpen: true, entities: villageEntities, title: t('Villages Analysis') });
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, ...shadows.soft }}
                      >
                        <MaterialIcons name="analytics" size={16} color={colors.primary} />
                        <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '700', color: colors.primary }}>{t("Analysis")}</Text>
                      </Pressable>
                    </View>
                  </View>
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}>
                    {processedVillages.map(v => (
                      <Pressable
                        key={v.name}
                        onPress={() => {
                          // Prevent navigation if there are no profiles
                          if (v.count > 0) {
                            setSelectedVillageName(v.name);
                            setFarmerViewMode('profiles');
                          }
                        }}
                        style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadows.soft, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: v.count === 0 ? 0.7 : 1 }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View style={{ backgroundColor: v.count > 0 ? colors.primarySoft : '#F1F5F9', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
                            <MaterialIcons name="location-city" size={22} color={v.count > 0 ? colors.primary : colors.textMuted} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }} numberOfLines={1}>{v.name}</Text>
                            
                            {/* Fallback Text for 0 Profiles */}
                            {v.count > 0 ? (
                              <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2, fontWeight: '600' }}>{v.count} {t("Onboarded")}</Text>
                            ) : (
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                <MaterialIcons name="info-outline" size={14} color={colors.textMuted} style={{ marginRight: 4 }} />
                                <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>{t("No profiles in this village yet")}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        
                        {/* Only show the chevron arrow if it's clickable */}
                        {v.count > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialIcons name="chevron-right" size={24} color={colors.primary} />
                          </View>
                        )}
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : (
                <FlatList
                  data={item.data.filter((f: any) => {
                    const fVill = (f.raw?.village || f.raw?.personal_details?.village || '').trim().toLowerCase();
                    return fVill === (selectedVillageName || '').trim().toLowerCase();
                  })}
                  renderItem={renderDealerItem}
                  keyExtractor={(i) => i.id}
              contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
              ListHeaderComponent={
                    <View style={{ marginBottom: spacing.md }}>
                      <Pressable
                        onPress={() => {
                          setFarmerViewMode('villages');
                          setSelectedVillageName(null);
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}
                      >
                        <MaterialIcons name="arrow-back" size={20} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontWeight: '800', marginLeft: 4 }}>{t("Back to Villages")}</Text>
                      </Pressable>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text, flex: 1 }}>
                          {t("Farmers in")} {selectedVillageName}
                        </Text>
                        
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <Pressable 
                            onPress={() => {
                              navigation.navigate("TempDealersListScreen", { 
                                title: `${selectedVillageName} Dealers`, 
                                villages: [selectedVillageName] 
                              });
                            }}
                            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, ...shadows.soft }}
                          >
                            <MaterialIcons name="storefront" size={16} color={colors.primary} />
                            <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '700', color: colors.primary }}>{t("Dealers")}</Text>
                          </Pressable>

                          <Pressable 
                            onPress={() => {
                              const filteredFarmers = item.data.filter((f: any) => {
                                const fVill = (f.raw?.village || f.raw?.personal_details?.village || '').trim().toLowerCase();
                                return fVill === (selectedVillageName || '').trim().toLowerCase();
                              });
                              setAnalyticsModalConfig({ 
                                isOpen: true, 
                                entities: [{ name: selectedVillageName || '', farmers: filteredFarmers, villageCount: 1 }],
                                title: `${selectedVillageName} Village Analysis`
                              });
                            }}
                            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, ...shadows.soft }}
                          >
                            <MaterialIcons name="analytics" size={16} color={colors.primary} />
                            <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '700', color: colors.primary }}>{t("Analysis")}</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  }
                />
              )
            ) : (
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
                        else if (item.actionId === "fpo") navigation.navigate("FPOOnboarding");
                        else navigation.navigate("ComingSoonScreen");
                      }}
                    />
                  )
                }
              />
            )}
          </View>
        )}
      />

      <FloatingActionMenu
        actions={[
          { id: "expense", label: t("Log Expense"), icon: "receipt" },
          { id: "dealer", label: t("Add Dealer"), icon: "storefront" },
          { id: "farmer", label: t("Add Farmer"), icon: "agriculture" },
          { id: "distributor", label: t("Add Distributor"), icon: "domain" },
          { id: "fpo", label: t("Add FPO"), icon: "groups" },
        ]}
        onActionPress={(id) => {
          if (id === "expense") navigation.navigate("AddExpenseScreen");
          else {
            if (id === "dealer") navigation.navigate("DealerOnboarding");
            else if (id === "farmer") navigation.navigate("FarmerOnboarding");
            else if (id === "distributor") navigation.navigate("DistributorOnboarding");
            else if (id === "fpo") navigation.navigate("FPOOnboarding");
            else navigation.navigate("ComingSoonScreen");
          }}
        }
      />

      <FilterModal
        visible={isFilterModalOpen}
        entityType={tabPages[activeTab].key} 
        currentFilters={filters}
        onApply={(newFilters) => setFilters(newFilters)}
        onClose={() => setIsFilterModalOpen(false)}
        routesList={[...routes].sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(r => ({ label: r.name, value: r.id }))} 
      />

      {/* Analytics Modal */}
      <Modal
        visible={analyticsModalConfig.isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAnalyticsModalConfig({ isOpen: false, entities: [], title: '' })}
      >
        <View style={{ flex: 1, backgroundColor: colors.screen }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, backgroundColor: colors.surface }}>
            <Pressable
              onPress={() => setAnalyticsModalConfig({ isOpen: false, entities: [], title: '' })}
              style={{ padding: spacing.xs, marginRight: spacing.md, backgroundColor: colors.surface, borderRadius: radius.pill }}
            >
              <MaterialIcons name="close" size={24} color={colors.text} />
            </Pressable>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>
              {t("Analysis")}
            </Text>
          </View>
          <AnalyticsTable entities={analyticsModalConfig.entities} title={analyticsModalConfig.title} />
        </View>
      </Modal>
    </View>
  );
};