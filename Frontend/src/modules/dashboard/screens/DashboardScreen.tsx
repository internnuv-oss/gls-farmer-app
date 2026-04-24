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
} from "react-native";
import { useTranslation } from "react-i18next";
import { Leaf, Search, Filter } from "lucide-react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useDraftStore } from "../../../store/draftStore";
import { useAuthStore } from "../../../store/authStore";
import { fetchMyDealers, deleteDealer } from "../services/dashboardService";
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

const { width } = Dimensions.get("window");

export const DashboardScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const drafts = useDraftStore((state) => state.drafts);
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState(1);
  const [dealers, setDealers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const pagerRef = useRef<FlatList>(null);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  // Search, Filter & Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState("latest");
  const [filterMinScore, setFilterMinScore] = useState("All");
  const [filterFirmType, setFilterFirmType] = useState("All");

  const loadData = async (pageNumber: number = 0, isRefresh = false) => {
    if (!user?.id) return;
    
    if (isRefresh) setRefreshing(true);
    else if (pageNumber === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const data = await fetchMyDealers(user.id, pageNumber, 10);
      const mapped = data.map((d: any) => ({
        id: d.id,
        name: d.shop_name,
        type: "Dealer",
        city: d.city,
        state: d.state,
        score: d.total_score,
        raw: d,
      }));

      // If page 0, replace data. If page > 0, append to the bottom.
      if (pageNumber === 0) {
        setDealers(mapped);
      } else {
        setDealers(prev => [...prev, ...mapped]);
      }

      // If we got exactly 10, there might be more. If less, we've hit the end.
      setHasMore(data.length === 10);
      setPage(pageNumber);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData(0); // Always load page 0 on focus
    }, [user?.id]),
  );
  
  const onRefresh = () => loadData(0, true);

  // Apply Search, Filter, and Sort
  const processedDealers = useMemo(() => {
    let result = [...dealers];

    // 1. Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          (d.name || "").toLowerCase().includes(query) ||
          (d.city || "").toLowerCase().includes(query) ||
          (d.state || "").toLowerCase().includes(query),
      );
    }

    // 2. Filter
    if (filterMinScore !== "All") {
      const minScore = parseInt(filterMinScore, 10);
      result = result.filter((d) => d.score >= minScore);
    }

    if (filterFirmType !== "All") {
      result = result.filter((d) => d.raw.firm_type === filterFirmType);
    }

    // 3. Sort
    result.sort((a, b) => {
      if (sortBy === "score_high") return b.score - a.score;
      if (sortBy === "score_low") return a.score - b.score;
      return 0; // 'latest' relies on the default DB fetch order (created_at desc)
    });

    return result;
  }, [dealers, searchQuery, filterMinScore, sortBy]);

  // Define Tabs with specific Empty State Configurations
  const tabPages = [
    {
      key: "Distributors",
      data: [],
      emptyMsg:
        "Onboard distributors to streamline your agricultural supply chain.",
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
      data: [],
      emptyMsg:
        "Connect with farmers and manage their profiles efficiently here.",
      icon: "agriculture",
      actionId: "farmer",
      actionLabel: "Add Farmer",
      actionIcon: "agriculture",
    },
  ];

  const handleDelete = useCallback((id: string, name: string) => {
    Alert.alert("Delete Profile", `Are you sure you want to delete ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDealer(id);
            loadData();
          } catch (e: any) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  }, []);

  const renderDealerItem = useCallback(({ item }: any) => (
    <EntityCard 
      item={item} 
      navigation={navigation} 
      t={t} 
      onDelete={handleDelete} 
    />
  ), [navigation, t, handleDelete]);

  const getScoreColor = (score: number) => {
    if (score > 60) return '#3730A3'; // Elite (Premium Deep Indigo)
    if (score >= 46) return '#166534'; // A-Category (Solid Forest Green)
    if (score >= 26) return '#B45309'; // B-Category (Rich Amber / Bronze)
    return '#991B1B';                  // C-Category (Crimson Red)
  };

  interface EntityCardProps {
    item: any;
    navigation: any;
    t: any;
    onDelete: (id: string, name: string) => void;
  }
  // Dedicated Card Component to manage individual modal and measurement states
  const EntityCard = React.memo(({ item, navigation, t, onDelete }: EntityCardProps) => {
    const [menuVisible, setMenuVisible] = useState(false);
    const iconRef = useRef<View>(null);
    const [menuCoords, setMenuCoords] = useState({ top: 0, right: 0 });

    const handleMenuPress = () => {
      if (menuVisible) {
        setMenuVisible(false);
        return;
      }
      iconRef.current?.measureInWindow((x, y, w, h) => {
        setMenuCoords({
          top: y + h,
          right: width - x - w,
        });
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
        <View
          style={{
            width: 6,
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            backgroundColor: getScoreColor(item.score),
          }}
        />
        <View style={{ padding: spacing.lg, paddingLeft: spacing.xl }}>
          
          {/* Header Row: Shop Name & Menu */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>
                {item.name}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                <MaterialIcons name="location-on" size={14} color={colors.textMuted} />
                <Text style={{ fontSize: 13, color: colors.textMuted, marginLeft: 4 }}>
                  {item.city}, {item.state}
                </Text>
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
                      position: "absolute",
                      top: menuCoords.top,
                      right: menuCoords.right,
                      backgroundColor: colors.surface,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: colors.border,
                      width: 170,
                      ...shadows.medium,
                      elevation: 5,
                    }}
                  >
                    <Pressable
                      onPress={() => {
                        setMenuVisible(false);
                        navigation.navigate("DealerOnboarding", { editData: item.raw });
                      }}
                      style={{ flexDirection: "row", alignItems: "center", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}
                    >
                      <MaterialIcons name="edit" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
                      <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>{t("Edit Profile")}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setMenuVisible(false);
                        handleDelete(item.id, item.name);
                      }}
                      style={{ flexDirection: "row", alignItems: "center", padding: spacing.md }}
                    >
                      <MaterialIcons name="delete" size={18} color={colors.danger} style={{ marginRight: spacing.sm }} />
                      <Text style={{ fontSize: 14, fontWeight: "700", color: colors.danger }}>{t("Delete Profile")}</Text>
                    </Pressable>
                  </View>
                </Pressable>
              </Modal>
            </View>
          </View>

          {/* Details Grid (Owner, Phone, Firm Type, Est Year) */}
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
                  {item.raw.owner_name || 'N/A'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MaterialIcons name="phone" size={16} color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.text, marginLeft: 6, fontWeight: '600' }}>
                  {item.raw.contact_mobile ? `+91 ${item.raw.contact_mobile}` : 'N/A'}
                </Text>
              </View>
            </View>
            
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MaterialIcons name="business" size={16} color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.text, marginLeft: 6, fontWeight: '600' }} numberOfLines={1}>
                  {item.raw.firm_type || 'N/A'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MaterialIcons name="event" size={16} color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.text, marginLeft: 6, fontWeight: '600' }}>
                  Est: {item.raw.est_year || 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Footer Row: Pills & Augmented Score */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: spacing.lg }}>
            
            {/* Status & Type Pills */}
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill }}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}>
                  {item.type}
                </Text>
              </View>
              <View style={{ backgroundColor: item.raw.status === 'SUBMITTED' ? '#DCFCE7' : '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill }}>
                <Text style={{ color: item.raw.status === 'SUBMITTED' ? '#166534' : colors.textMuted, fontSize: 12, fontWeight: "700" }}>
                  {item.raw.status === 'SUBMITTED' ? 'Approved' : 'Draft'}
                </Text>
              </View>
            </View>

            {/* Augmented Score Display */}
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: "800", letterSpacing: 0.5, marginBottom: 2 }}>
                {t("SCORE")}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                <Text style={{ fontSize: 20, fontWeight: "900", color: getScoreColor(item.score) }}>
                  {item.score}
                </Text>
              </View>
            </View>
            
          </View>

          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

          {/* Action Row */}
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
      {/* Header */}
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
          <View
            style={{
              backgroundColor: colors.primarySoft,
              padding: 8,
              borderRadius: 12,
              marginRight: spacing.sm,
            }}
          >
            <Leaf size={24} color={colors.primary} />
          </View>
          <View>
            <Text
              style={{ fontSize: 16, fontWeight: "900", color: colors.text }}
            >
              {t("Hello,")} {user?.name}
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              {t("Manage your network")}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => navigation.navigate("DraftsScreen")}
          style={{ padding: 8, position: "relative" }}
        >
          <MaterialIcons
            name="file-present"
            size={28}
            color={colors.textMuted}
          />
          {drafts.length > 0 && (
            <View
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                backgroundColor: colors.danger,
                width: 18,
                height: 18,
                borderRadius: 9,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 2,
                borderColor: colors.screen,
              }}
            >
              <Text style={{ color: "#FFF", fontSize: 10, fontWeight: "900" }}>
                {drafts.length}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Search & Filter */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: spacing.lg,
          marginBottom: spacing.md,
          gap: spacing.sm,
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: spacing.md,
            height: 48,
          }}
        >
          <Search size={20} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t("Search by name or location...")}
            placeholderTextColor={colors.textMuted}
            style={{
              flex: 1,
              marginLeft: spacing.sm,
              fontSize: 15,
              fontWeight: "500",
              color: colors.text,
            }}
          />
        </View>
        <Pressable
          onPress={() => setIsFilterModalOpen(true)}
          style={{
            width: 48,
            height: 48,
            backgroundColor:
              sortBy !== "latest" || filterMinScore !== "All"
                ? colors.primarySoft
                : colors.surface,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor:
              sortBy !== "latest" || filterMinScore !== "All"
                ? colors.primary
                : colors.border,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Filter
            size={20}
            color={
              sortBy !== "latest" || filterMinScore !== "All"
                ? colors.primary
                : colors.text
            }
          />
        </Pressable>
      </View>

      {/* Tabs */}
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

      {loading && !refreshing ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={pagerRef}
          data={tabPages}
          keyExtractor={(item) => item.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={1}
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


                initialNumToRender={5}       // How many items to render in the first batch
                maxToRenderPerBatch={5}      // How many items to render in subsequent batches
                windowSize={5}               // How many screens worth of content to keep in memory
                removeClippedSubviews={true} // Unmount components that are off-screen
                updateCellsBatchingPeriod={50} // How often to update cells (in ms)
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[colors.primary]}
                    tintColor={colors.primary}
                  />
                }
                ListEmptyComponent={
                  <EmptyState
                    title={t(
                      searchQuery ? "No Results Found" : `No ${item.key} Yet`,
                    )}
                    description={t(
                      searchQuery
                        ? "Try adjusting your search criteria."
                        : item.emptyMsg,
                    )}
                    iconName={item.icon as any}
                    actionLabel={t(item.actionLabel)}
                    actionIcon={item.actionIcon}
                    onAction={() => {
                      if (item.actionId === "dealer")
                        navigation.navigate("DealerOnboarding");
                      else navigation.navigate("ComingSoonScreen");
                    }}
                  />
                }
              />
            </View>
          )}
        />
      )}

      <FloatingActionMenu
        actions={[
          { id: "dealer", label: t("Add Dealer"), icon: "storefront" },
          { id: "farmer", label: t("Add Farmer"), icon: "agriculture" },
          { id: "distributor", label: t("Add Distributor"), icon: "domain" },
        ]}
        onActionPress={(id) => {
          if (id === "dealer") navigation.navigate("DealerOnboarding");
          else navigation.navigate("ComingSoonScreen");
        }}
      />

      {/* Filter & Sort Modal */}
      <Modal
        visible={isFilterModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFilterModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "flex-end",
            }}
          >
            <Pressable
              style={{ flex: 1 }}
              onPress={() => setIsFilterModalOpen(false)}
            />
            <View
              style={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: radius.lg,
                borderTopRightRadius: radius.lg,
                padding: spacing.lg,
                paddingBottom: spacing["3xl"],
                ...shadows.soft,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: spacing.lg,
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "800",
                    color: colors.text,
                  }}
                >
                  Filter & Sort
                </Text>
                <Pressable onPress={() => setIsFilterModalOpen(false)}>
                  <MaterialIcons
                    name="close"
                    size={24}
                    color={colors.textMuted}
                  />
                </Pressable>
              </View>

              <RadioGroup
                label="Sort By"
                options={["latest", "score_high", "score_low"]}
                value={sortBy}
                onChange={setSortBy}
              />
              <View style={{ height: spacing.md }} />
              <RadioGroup
                label="Minimum Score"
                options={["All", "50", "70", "85"]}
                value={filterMinScore}
                onChange={setFilterMinScore}
              /><View style={{ height: spacing.md }} />
              <RadioGroup
                label="Firm Type"
                options={["All", "Proprietorship", "Partnership", "Pvt Ltd"]}
                value={filterFirmType}
                onChange={setFilterFirmType}
              />

              <View style={{ marginTop: spacing.xl }}>
                <Button
                  label="Apply"
                  onPress={() => setIsFilterModalOpen(false)}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};
