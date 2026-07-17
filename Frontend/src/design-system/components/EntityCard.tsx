import React, { useRef, useState } from "react";
import { View, Text, Pressable, Modal, Linking, Dimensions } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, radius, spacing, shadows } from "../tokens";

const { width } = Dimensions.get("window");

export interface EntityCardProps { 
  item: any; 
  navigation: any; 
  t: any; 
  onDeleteDraft: (id: string) => void; 
}

const getScoreColor = (score: number) => {
  if (score > 60) return '#3730A3';
  if (score >= 46) return '#166534';
  if (score >= 26) return '#B45309';
  return '#991B1B';                  
};

export const EntityCard = React.memo(({ item, navigation, t, onDeleteDraft }: EntityCardProps) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const iconRef = useRef<View>(null);
  const [menuCoords, setMenuCoords] = useState({ top: 0, right: 0 });
  
  const isDealer = item.type === 'Dealer';
  const isDistributor = item.type === 'Distributor';
  const isFarmer = item.type === 'Farmer';
  const isFPO = item.type === 'FPO';
  const hasScore = !item.isDraft && (isDealer || isDistributor || (isFarmer && item.score !== undefined));
  
  const gps = isDealer ? (item.raw.primary_shop_location?.gps?.exterior || item.raw.primaryShopLocation?.gps?.exterior) : null;
  
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
    const phone = item.raw.mobile || item.raw.contactMobile;
    const land = item.raw.farm_details?.totalLand || item.raw.totalLand;
    const landUnit = item.raw.farm_details?.landUnit || item.raw.landUnit || 'Acres'; 
    const rawCrops = item.raw.farm_details?.majorCrops || item.raw.majorCrops;
    const crops = Array.isArray(rawCrops) ? rawCrops.join(', ') : rawCrops;
    const rawWater = item.raw.farm_details?.waterSource || item.raw.waterSource;
    const water = Array.isArray(rawWater) ? rawWater.join(', ') : rawWater;

    infoBlocks = [
      { icon: 'phone', value: phone, isPhone: true },
      { icon: 'landscape', value: land ? `${land} ${t(landUnit)}` : null, isPhone: false }, 
      { icon: 'grass', value: crops, isPhone: false, translate: true },
      { icon: 'water-drop', value: water, isPhone: false, translate: true },
    ];
  } else if (isFPO) {
    const person = item.raw.ceo_name || item.raw.ceoName;
    const phone = item.raw.contact_mobile || item.raw.contactMobile;
    const agency = item.raw.promoting_agency || item.raw.promotingAgency;
    const members = item.raw.member_base?.totalMembers || item.raw.totalMembers;

    infoBlocks = [
      { icon: 'person', value: person, isPhone: false },
      { icon: 'phone', value: phone, isPhone: true },
      { icon: 'handshake', value: agency, isPhone: false },
      { icon: 'groups', value: members ? `${members} Members` : null, isPhone: false },
    ];
  }

  const validBlocks = infoBlocks.filter(b => b.value && String(b.value).trim() !== '');

  const badgeBg = isDealer ? '#FEF3C7' : isDistributor ? '#FFEDD5' : isFPO ? '#F3E8FF' : '#E0E7FF';
  const badgeColor = isDealer ? colors.warning : isDistributor ? colors.secondary : isFPO ? '#7E22CE' : '#4F46E5';

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

  const handleCardPress = () => {
    if (isFarmer) {
      navigation.navigate("FarmerHub", { entity: item });
    }
  };

  return (
    <Pressable
      onPress={isFarmer ? handleCardPress : undefined}
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
                          else if (item.type === 'FPO') navigation.navigate("FPOOnboarding", { editData: item.raw }); 
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
            <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: "800", letterSpacing: 0.5, marginBottom: 2 }}>
              {t("SCORE")} / CATEGORY
            </Text>
            <View style={{ flexDirection: "row", alignItems: "baseline" }}>
              <Text style={{ fontSize: 20, fontWeight: "900", color: getScoreColor(item.score) }}>
                {item.score}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: "800", color: getScoreColor(item.score), marginLeft: 6 }}>
                (Category {item.score >= 70 ? 'A' : item.score >= 50 ? 'B' : 'C'})
              </Text>
            </View>
          </View>
        )}
        </View>

        {/* 🚀 NEW: 3-Stage Dots/Blocks Progress for Farmers */}
        {isFarmer && !item.isDraft && (() => {
          const isStage1 = true;
          const isStage2 = !!(item.raw.fspp_details && Object.keys(item.raw.fspp_details).length > 0);
          const isStage3 = item.raw.has_farm_card === true || (Array.isArray(item.raw.farm_cards) && item.raw.farm_cards.length > 0);

          return (
            <View style={{ marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
              <View style={{ position: 'relative', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                
                {/* Background Connecting Line */}
                <View style={{ position: 'absolute', top: 7, left: '16.6%', right: '16.6%', height: 2, backgroundColor: colors.border }} />
                
                {/* Active Connecting Line */}
                <View style={{ position: 'absolute', top: 7, left: '16.6%', width: isStage3 ? '66.6%' : isStage2 ? '33.3%' : '0%', height: 2, backgroundColor: colors.primary }} />

                {/* Stage 1 */}
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: isStage1 ? colors.primary : colors.border, borderWidth: 3, borderColor: colors.surface, zIndex: 1, marginBottom: 6 }} />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: isStage1 ? colors.primary : colors.textMuted, textAlign: 'center' }}>{t("Onboarded")}</Text>
                </View>

                {/* Stage 2 */}
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: isStage2 ? colors.primary : colors.border, borderWidth: 3, borderColor: colors.surface, zIndex: 1, marginBottom: 6 }} />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: isStage2 ? colors.primary : colors.textMuted, textAlign: 'center' }}>{t("FSPP Enrollment")}</Text>
                </View>

                {/* Stage 3 */}
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: isStage3 ? colors.primary : colors.border, borderWidth: 3, borderColor: colors.surface, zIndex: 1, marginBottom: 6 }} />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: isStage3 ? colors.primary : colors.textMuted, textAlign: 'center' }}>{t("Farm Card")}</Text>
                </View>

              </View>
            </View>
          );
        })()}

        {!isFarmer && (
          <>
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />

            <Pressable
              onPress={() => {
                if (item.isDraft) {
                  if (item.type === 'Farmer') navigation.navigate("FarmerOnboarding", { draftId: item.entityId, draftData: item.raw, initialStep: item.step });
                  else if (item.type === 'FPO') navigation.navigate("FPOOnboarding", { draftId: item.entityId, draftData: item.raw, initialStep: item.step });
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
          </>
        )}
      </View>
    </Pressable>
  );
});
