import React, { useRef, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Dimensions,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Linking,
  Image,
} from "react-native";
import { useTranslation } from "react-i18next";
import i18n from "../../../core/i18n";
import { Leaf, Search, Filter } from "lucide-react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useDraftStore } from "../../../store/draftStore";
import { useAuthStore } from "../../../store/authStore";
import { fetchMyDealers, fetchMyFarmers } from "../services/dashboardService";

import {
  FloatingActionMenu,
  Button,
  RadioGroup,
  EmptyState,
} from "../../../design-system/components";
import {
  colors,
  radius,
  spacing,
  shadows,
} from "../../../design-system/tokens";
import { FilterModal, FilterState, defaultFilters } from "../../../design-system/components/FilterModal";

const { width } = Dimensions.get("window");

const FilterChipGroup = ({ label, options, selected, onSelect }: { label: string, options: {label: string, value: string}[], selected: string, onSelect: (val: string) => void }) => (
  <View style={{ marginBottom: spacing.lg }}>
    <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: spacing.sm }}>{label}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((opt) => {
        const isActive = selected === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: radius.pill,
              backgroundColor: isActive ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: isActive ? colors.primary : colors.border,
            }}
          >
            <Text style={{ 
              fontSize: 13, 
              fontWeight: isActive ? "700" : "600", 
              color: isActive ? '#FFFFFF' : colors.textMuted 
            }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  </View>
);

export const DashboardScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const drafts = useDraftStore((state) => state.drafts);
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState(0); // 0 = Distributors
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const pagerRef = useRef<FlatList>(null);
  const [dealers, setDealers] = useState<any[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]); // 👈 ADD THIS

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadingPageRef = useRef<number | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState("latest");
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const loadData = async (pageNumber: number = 0, isRefresh = false) => {
    if (!user?.id || loadingPageRef.current === pageNumber) return; 
    
    loadingPageRef.current = pageNumber; 
    if (isRefresh) setRefreshing(true);
    else if (pageNumber === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const PAGE_LIMIT = 5;
      
      // Fetch both Dealers and Farmers at the same time
      const [dealersData, farmersData] = await Promise.all([
        fetchMyDealers(user.id, pageNumber, PAGE_LIMIT),
        fetchMyFarmers(user.id, pageNumber, PAGE_LIMIT)
      ]);

      const mappedDealers = dealersData.map((d: any) => ({
        id: d.id,
        name: d.primary_shop_name || d.shop_name,
        type: "Dealer",
        city: d.primary_shop_location?.city || d.city,
        state: d.primary_shop_location?.state || d.state,
        score: d.total_score,
        raw: d,
      }));

      const mappedFarmers = farmersData.map((f: any) => ({
        id: f.id,
        name: f.full_name,
        type: "Farmer",
        city: f.personal_details?.city || f.village,
        state: f.personal_details?.state || "N/A",
        score: 0, // Farmers don't use the 0-100 scoring system right now
        raw: f,
      }));

      if (pageNumber === 0) {
        setDealers(mappedDealers);
        setFarmers(mappedFarmers);
      } else {
        setDealers(prev => {
          const existingIds = new Set(prev.map(item => item.id));
          const uniqueNewItems = mappedDealers.filter(item => !existingIds.has(item.id));
          return [...prev, ...uniqueNewItems];
        });
        setFarmers(prev => {
          const existingIds = new Set(prev.map(item => item.id));
          const uniqueNewItems = mappedFarmers.filter(item => !existingIds.has(item.id));
          return [...prev, ...uniqueNewItems];
        });
      }

      setHasMore(dealersData.length === PAGE_LIMIT || farmersData.length === PAGE_LIMIT);
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
  // Fixed: Removed activeTab from dependency array so it doesn't refetch/reset on swipe
  useFocusEffect(
    useCallback(() => {
      loadData(0);
    }, [user?.id])
  );
  
  const onRefresh = () => loadData(0, true);

  const processedDealers = useMemo(() => {
    let result = [...dealers];

    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          (d.name || "").toLowerCase().includes(query) ||
          (d.city || "").toLowerCase().includes(query) ||
          (d.state || "").toLowerCase().includes(query) ||
          (d.raw?.contact_person || "").toLowerCase().includes(query),
      );
    }

    // 2. Risk Category Filter (Multi-select array)
    if (filters.category.length > 0) {
      result = result.filter((d) => filters.category.includes(d.raw?.category));
    }

    // 3. Proposed Status Filter (Multi-select array)
    if (filters.proposedStatus.length > 0) {
      result = result.filter((d) => filters.proposedStatus.includes(d.raw?.proposed_status));
    }

    // 4. Firm Type Filter (Multi-select array)
    if (filters.firmType.length > 0) {
      result = result.filter((d) => filters.firmType.includes(d.raw?.firm_type));
    }

    // 5. Distributor Linkage Filter (Multi-select array)
    if (filters.linkedStatus.length > 0) {
      result = result.filter((item) => {
        const isLinked = item.raw?.distributor_links?.isLinked === 'Yes' ? 'Linked' : 'Unlinked';
        return filters.linkedStatus.includes(isLinked);
      });
    }

    // 6. Demo Farmers Willingness Filter (Multi-select array)
    if (filters.willingDemoFarmers.length > 0) {
      result = result.filter((item) => {
        const willing = item.raw?.demo_farmers_data?.willing === 'Yes' ? 'Yes' : 'No';
        return filters.willingDemoFarmers.includes(willing);
      });
    }

    // 7. Sorting
    result.sort((a, b) => {
      if (filters.sortBy === "score_high") return b.score - a.score;
      if (filters.sortBy === "score_low") return a.score - b.score;
      return 0; // "latest"
    });

    return result;
  }, [dealers, searchQuery, filters]);

  const isFilterActive = JSON.stringify(filters) !== JSON.stringify(defaultFilters);

  const processedFarmers = useMemo(() => {
    let result = [...farmers];
    
    // 1. Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          (f.name || "").toLowerCase().includes(query) ||
          (f.city || "").toLowerCase().includes(query) ||
          (f.state || "").toLowerCase().includes(query) ||
          (f.raw?.village || "").toLowerCase().includes(query) ||
          (f.raw?.mobile || "").includes(query) ||
          (f.raw?.personal_details?.fatherName || "").toLowerCase().includes(query)
      );
    }

    // 2. Scale Filter
    if (filters.scale.length > 0) {
      result = result.filter((f) => {
        const land = parseFloat(f.raw?.farm_details?.totalLand || "0");
        let scale = "Large";
        if (land < 2) scale = "Marginal";
        else if (land >= 2 && land <= 5) scale = "Small";
        return filters.scale.includes(scale);
      });
    }

    // 3. Crops Filter (Intersection Check)
    if (filters.farmerCrops.length > 0) {
      result = result.filter((f) => {
        const crops = f.raw?.farm_details?.majorCrops || [];
        // Keep farmer if they grow ANY of the selected crops
        return filters.farmerCrops.some((c) => crops.includes(c)); 
      });
    }

    // 4. Soil Type Filter
    if (filters.farmerSoil.length > 0) {
      const PREDEFINED_SOILS = ["Black", "Sandy", "Red", "Loamy"];
      result = result.filter((f) => {
        const soils = f.raw?.farm_details?.soilType || [];
        return filters.farmerSoil.some((s) => {
          if (s === "Others") return soils.some((soil: string) => !PREDEFINED_SOILS.includes(soil));
          return soils.includes(s);
        });
      });
    }

    // 5. Water Source Filter
    if (filters.farmerWater.length > 0) {
      const PREDEFINED_WATER = ["Canal", "Borewell", "Rain"];
      result = result.filter((f) => {
        const waters = f.raw?.farm_details?.waterSource || [];
        return filters.farmerWater.some((w) => {
          if (w === "Others") return waters.some((water: string) => !PREDEFINED_WATER.includes(water));
          return waters.includes(w);
        });
      });
    }

    // 6. Sorting
    result.sort((a, b) => {
      if (filters.sortBy === "land_high") return parseFloat(b.raw?.farm_details?.totalLand || "0") - parseFloat(a.raw?.farm_details?.totalLand || "0");
      if (filters.sortBy === "land_low") return parseFloat(a.raw?.farm_details?.totalLand || "0") - parseFloat(b.raw?.farm_details?.totalLand || "0");
      return 0; // "latest" fallback
    });

    return result;
  }, [farmers, searchQuery, filters]);// Define Tabs
  const tabPages = [
    {
      key: "Distributors",
      data: [], // Distributors will show an empty state until integrated
      emptyMsg: "Onboard distributors to streamline your agricultural supply chain.",
      icon: "domain",
      actionId: "distributor",
      actionLabel: "Add Distributor",
      actionIcon: "domain",
    },
    {
      key: "Dealers",
      data: processedDealers, // Loaded Dealers data
      emptyMsg: "Start building your network by onboarding your first dealer.",
      icon: "storefront",
      actionId: "dealer",
      actionLabel: "Add Dealer",
      actionIcon: "storefront",
    },
    {
      key: "Farmers",
      data: processedFarmers, // Farmers will show an empty state until integrated
      emptyMsg: "Connect with farmers and manage their profiles efficiently here.",
      icon: "agriculture",
      actionId: "farmer",
      actionLabel: "Add Farmer",
      actionIcon: "agriculture",
    },
  ];

  const renderDealerItem = useCallback(({ item }: any) => (
    <EntityCard 
      item={item} 
      navigation={navigation} 
      t={t} 
    />
  ), [navigation, t]);

  const getScoreColor = (score: number) => {
    if (score > 60) return '#3730A3';
    if (score >= 46) return '#166534';
    if (score >= 26) return '#B45309';
    return '#991B1B';                  
    if (score > 60) return '#3730A3';
    if (score >= 46) return '#166534';
    if (score >= 26) return '#B45309';
    return '#991B1B';                  
  };

  interface EntityCardProps {
    item: any;
    navigation: any;
    t: any;
  }

  const EntityCard = React.memo(({ item, navigation, t }: EntityCardProps) => {
    const [menuVisible, setMenuVisible] = useState(false);
    const iconRef = useRef<View>(null);
    const [menuCoords, setMenuCoords] = useState({ top: 0, right: 0 });
    
    const gps = item.raw.primary_shop_location?.gps?.exterior;

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
          overflow: "hidden",
        }}
      >
        {/* UPDATE: Use green for farmers, dynamic score color for dealers */}
        <View style={{ width: 6, position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: item.type === 'Dealer' ? getScoreColor(item.score) : colors.success }} />
        <View style={{ padding: spacing.lg, paddingLeft: spacing.xl }}>
          
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>
                {item.name}
              </Text>
              
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, flexWrap: "wrap", gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialIcons name="location-on" size={14} color={colors.textMuted} />
                  <Text style={{ fontSize: 13, color: colors.textMuted, marginLeft: 4 }}>
                    {item.city || 'N/A'}, {item.state || 'N/A'}
                  </Text>
                </View>
                
                {/* Dealer specific Map link */}
                {item.type === 'Dealer' && gps?.lat && gps?.lng && (
                  <Pressable 
                    onPress={() => Linking.openURL(`https://maps.google.com/?q=${gps.lat},${gps.lng}`)}
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#BFDBFE' }}
                  >
                    <MaterialIcons name="map" size={12} color="#2563EB" style={{ marginRight: 2 }} />
                    <Text style={{ fontSize: 10, color: '#2563EB', fontWeight: '800' }}>MAP</Text>
                  </Pressable>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialIcons name="date-range" size={14} color={colors.textMuted} />
                  <Text style={{ fontSize: 13, color: colors.textMuted, marginLeft: 4 }}>
                    Since {item.raw.created_at ? new Date(item.raw.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                  </Text>
                </View>
              </View>
            </View>

            <View>
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
                        // UPDATE: Route to FarmerOnboarding if the entity is a Farmer
                        if (item.type === 'Farmer') {
                          navigation.navigate("FarmerOnboarding", { editData: item.raw });
                        } else {
                          navigation.navigate("DealerOnboarding", { editData: item.raw });
                        }
                      }}
                      style={{ flexDirection: "row", alignItems: "center", padding: spacing.md }}
                    >
                      <MaterialIcons name="edit" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
                      <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>{t("Edit Profile")}</Text>
                    </Pressable>
                  </View>
                </Pressable>
              </Modal>
            </View>
          </View>

          <View style={{ 
             marginTop: spacing.md,
             backgroundColor: '#F8FAFC',
             padding: spacing.md,
             borderRadius: radius.md,
             borderWidth: 1,
             borderColor: colors.border 
           }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MaterialIcons name="person" size={16} color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.text, marginLeft: 6, fontWeight: '600' }} numberOfLines={1}>
                  {item.type === 'Dealer' ? (item.raw.contact_person || 'N/A') : (item.raw.personal_details?.fatherName || 'N/A')}
                </Text>
              </View>
              
              <Pressable 
                onPress={() => {
                   const phone = item.type === 'Dealer' ? item.raw.contact_mobile : item.raw.mobile;
                   if(phone) Linking.openURL(`tel:${phone}`);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
              >
                <MaterialIcons name="phone" size={16} color={(item.type === 'Dealer' ? item.raw.contact_mobile : item.raw.mobile) ? colors.primary : colors.textMuted} />
                <Text style={{ 
                   fontSize: 13, 
                   color: (item.type === 'Dealer' ? item.raw.contact_mobile : item.raw.mobile) ? colors.primary : colors.text, 
                   marginLeft: 6, 
                   fontWeight: '700', 
                   textDecorationLine: (item.type === 'Dealer' ? item.raw.contact_mobile : item.raw.mobile) ? 'underline' : 'none' 
                 }}>
                  {item.type === 'Dealer' 
                    ? (item.raw.contact_mobile ? `+91 ${item.raw.contact_mobile}` : 'N/A')
                    : (item.raw.mobile ? `+91 ${item.raw.mobile}` : 'N/A')}
                </Text>
              </Pressable>
            </View>
            
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MaterialIcons name="business" size={16} color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.text, marginLeft: 6, fontWeight: '600' }} numberOfLines={1}>
                  {item.type === 'Dealer' ? (item.raw.firm_type || 'N/A') : `Crops: ${(item.raw.farm_details?.majorCrops || []).join(', ') || 'N/A'}`}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MaterialIcons name="event" size={16} color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.text, marginLeft: 6, fontWeight: '600' }}>
                  {item.type === 'Dealer' ? `Est: ${item.raw.est_year || 'N/A'}` : `Land: ${item.raw.farm_details?.totalLand || 0} Ac`}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: spacing.lg }}>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ backgroundColor: item.type === 'Dealer' ? '#FEF3C7' : '#E0E7FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill }}>
                <Text style={{ color: item.type === 'Dealer' ? colors.warning : '#4F46E5', fontSize: 12, fontWeight: "700" }}>{item.type}</Text>
              </View>
              <View style={{ backgroundColor: item.raw.status === 'SUBMITTED' ? '#DCFCE7' : '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill }}>
                <Text style={{ color: item.raw.status === 'SUBMITTED' ? '#166534' : colors.textMuted, fontSize: 12, fontWeight: "700" }}>
                  {item.raw.status === 'SUBMITTED' ? 'Approved' : 'Draft'}
                </Text>
              </View>
            </View>

            {/* UPDATE: Hide SCORE for Farmers */}
            {item.type === 'Dealer' && (
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
            onPress={() => navigation.navigate("EntityProfile", { entity: item })}
            style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}
          >
            <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 14, marginRight: 4 }}>
              {t("View Profile")}
            </Text>
            <MaterialIcons name="chevron-right" size={18} color={colors.primary} />
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
  <View style={{ padding: 4, borderRadius: 12, marginRight: spacing.sm }}>
    {/* REPLACED LEAF WITH YOUR COMPANY LOGO */}
    <Image 
      source={require('../../../../assets/company-logo.jpeg')} 
      style={{ width: 140, height: 40, resizeMode: 'contain', borderRadius: 8 }} 
    />
  </View>
  {/* <View>
    <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>{t("Hello,")} {user?.name}</Text>
    <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "600" }}>{t("Manage your network")}</Text>
  </View> */}
</View>

        <Pressable onPress={() => navigation.navigate("DraftsScreen")} style={{ padding: 8, position: "relative" }}>
          <MaterialIcons name="file-present" size={28} color={colors.textMuted} />
          {drafts.length > 0 && (
            <View style={{ position: "absolute", top: 4, right: 4, backgroundColor: colors.danger, width: 18, height: 18, borderRadius: 9, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: colors.screen }}>
              <Text style={{ color: "#FFF", fontSize: 10, fontWeight: "900" }}>{drafts.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* 🚀 REMOVED THE BLOCKER LOGIC. The app now flows straight into the Dashboard list. */}
      
      {/* Search & Filter */}
      <View style={{ flexDirection: "row", paddingHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, height: 48 }}>
          <Search size={20} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t("Search by name or location...")}
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, marginLeft: spacing.sm, fontSize: 15, fontWeight: "500", color: colors.text }}
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
                  borderBottomColor:
                    activeTab === index ? colors.primary : "transparent",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontWeight: "800",
                    color: activeTab === index ? colors.primary : colors.textMuted,
                  }}
                >
                  {t(tab.key)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* FIX: FlatList is no longer unmounted when loading. */}
          <FlatList
            ref={pagerRef}
            data={tabPages}
            keyExtractor={(item) => item.key}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={0}
            getItemLayout={(data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
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
                    contentContainerStyle={{
                      padding: spacing.lg,
                      paddingBottom: 100,
                    }}
                    showsVerticalScrollIndicator={false}
                    // ✅ UPDATED: Added item.key check and ensured guards are tight
                    onEndReached={() => {
                      if (item.key === "Dealers" && hasMore && !loadingMore && !loading && !refreshing) {
                        loadData(page + 1);
                      }
                    }}
                    onEndReachedThreshold={0.5}
  ListFooterComponent={() => (
    loadingMore ? (
      <View style={{ paddingVertical: spacing.md }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    ) : null
  )}
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={[colors.primary]}
      tintColor={colors.primary}
    />
  }
                  ListEmptyComponent={
                    loading && !refreshing ? (
                      <View style={{ marginTop: 60, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={colors.primary} />
                      </View>
                    ) : (
                      <EmptyState
                        title={t(searchQuery ? "No Results Found" : `No ${item.key} Yet`)}
                        description={t(searchQuery ? "Try adjusting your search criteria." : item.emptyMsg)}
                        iconName={item.icon as any}
                        actionLabel={t(item.actionLabel)}
                        actionIcon={item.actionIcon}
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

      {/* Floating Action Menu is now completely unlocked! */}
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
        entityType={tabPages[activeTab].key} // Passes "Dealers", "Distributors", or "Farmers" dynamically
        currentFilters={filters}
        onApply={(newFilters) => setFilters(newFilters)}
        onClose={() => setIsFilterModalOpen(false)}
      />
    </View>
  );
};