import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, Linking, StyleSheet, Modal, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing } from '../../../design-system/tokens';
import { supabase } from '../../../core/supabase';

export const FarmCardDetailsScreen = ({ route, navigation }: any) => {
  const { t } = useTranslation();
    
  // 🚀 Store the card in local state so we can overwrite it on refresh
  const [localCard, setLocalCard] = useState(route.params.farmCard);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // 🚀 NEW: Refresh state
  
  // 🚀 NEW: Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('farm_cards')
        .select('*')
        .eq('id', localCard.id)
        .single();
          
      if (data && !error) setLocalCard(data);
      } catch (e) {
        console.error("Failed to refresh card details", e);
      } finally {
        setRefreshing(false);
      }
  };
  
  // 🚀 Ensure these variables derive from localCard, not the static route.params
  const data = localCard.card_data || {};
  const media = localCard.documents || localCard.media_urls || {}; 
  const yieldHistory = data.yieldHistory || [];

  const DataRow = ({ label, value }: { label: string, value: any }) => {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return null;
    
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.screen }}>
        <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '600', flex: 1, paddingRight: 8 }}>{label}</Text>
        <Text style={{ fontSize: 14, color: colors.text, fontWeight: '800', flex: 1, textAlign: 'right' }}>
          {Array.isArray(value) ? value.join(', ') : String(value)}
        </Text>
      </View>
    );
  };

  const MediaLink = ({ label, url, icon }: { label: string, url: string, icon: any }) => {
    if (!url) return null;
    return (
      <Pressable 
        onPress={() => Linking.openURL(url)}
        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm }}
      >
        <MaterialIcons name={icon} size={24} color={colors.primary} style={{ marginRight: spacing.sm }} />
        <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: colors.text }}>{label}</Text>
        <MaterialIcons name="open-in-new" size={20} color={colors.textMuted} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.screen }}>
      
      {/* 🚀 EXPANDABLE MAP MODAL */}
      <Modal visible={isMapExpanded} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <Pressable onPress={() => setIsMapExpanded(false)} style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.pill }}>
            <MaterialIcons name="close" size={28} color="#FFF" />
          </Pressable>
          {media.field_boundary && (
            <Image source={{ uri: media.field_boundary }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* HEADER */}
      <View style={{ padding: spacing.xl, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginLeft: spacing.sm }}>{t("Back to List")}</Text>
        </Pressable>
        <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text }}>{t("Farm Card Details")}</Text>
        <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 4 }}>
          {t("Generated on")}: {new Date(localCard.created_at).toLocaleDateString()}
        </Text>
        <View style={{ position: 'absolute', right: 20, top: 70, backgroundColor: '#DCFCE7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill }}>
           <Text style={{ color: '#16A34A', fontSize: 12, fontWeight: '800' }}>{localCard.status || 'SUBMITTED'}</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: spacing.xl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        
        {/* TASK 1: SATELLITE BOUNDARY */}
        {media.field_boundary && (
          <Pressable onPress={() => setIsMapExpanded(true)} style={{ marginBottom: spacing.xl, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
            <Image source={{ uri: media.field_boundary }} style={{ width: '100%', height: 200 }} resizeMode="cover" />
            <View style={{ backgroundColor: colors.surface, padding: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
              <MaterialIcons name="zoom-out-map" size={18} color={colors.text} style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text, textAlign: 'center' }}>{t("Tap to Expand Satellite Boundary")}</Text>
            </View>
          </Pressable>
        )}

        {/* STEP 1: DEMOGRAPHICS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("Demographics & Socio-Economic")}</Text>
          <DataRow label={t("Farmer Name")} value={data.farmerName} />
          <DataRow label={t("Mobile Number")} value={data.mobileNumber} />
          <DataRow label={t("WhatsApp")} value={data.primaryWhatsapp} />
          <DataRow label={t("Location")} value={[data.village, data.taluka, data.district, data.state].filter(Boolean).join(', ')} />
          <DataRow label={t("Education")} value={data.educationLevel} />
          <DataRow label={t("Farming Experience")} value={data.farmingExperience ? `${data.farmingExperience} Years` : null} />
          <DataRow label={t("Family Members")} value={data.familyMembers} />
          <DataRow label={t("Labour Type")} value={data.labourType} />
        </View>

        {/* STEP 2: LAND & WATER */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("Land & Water Profile")}</Text>
          <DataRow label={t("Legal Owner")} value={data.legalOwnerName} />
          <DataRow label={t("Field & Plot")} value={[data.fieldNumber, data.plotNumber].filter(Boolean).join(' / ')} />
          <DataRow label={t("Survey No.")} value={data.surveyNo} />
          <DataRow label={t("Land Status")} value={data.landStatus} />
          <DataRow label={t("Total Area")} value={data.totalLandArea ? `${data.totalLandArea} ${data.totalLandAreaUnit}` : null} />
          <DataRow label={t("Cultivated Area")} value={data.cultivatedArea ? `${data.cultivatedArea} ${data.cultivatedAreaUnit}` : null} />
          <DataRow label={t("FSPP Area")} value={data.fsppCommittedArea ? `${data.fsppCommittedArea} ${data.fsppCommittedAreaUnit}` : null} />
          <DataRow label={t("Water Source")} value={data.waterSource} />
          <DataRow label={t("Irrigation Method")} value={data.irrigationMethod} />
          <DataRow label={t("Water Availability")} value={data.waterAvailability} />
          <DataRow label={t("Irrigation Freq.")} value={data.irrigationFrequency} />
          <DataRow label={t("Water Quality (TDS)")} value={data.waterTds ? `${data.waterTds} ppm` : null} />
          <DataRow label={t("Water pH")} value={data.waterPh} />
          <DataRow label={t("Pump HP")} value={data.pumpHp ? `${data.pumpHp} HP` : null} />
          <DataRow label={t("Drip/Sprinkler Area")} value={data.dripArea ? `${data.dripArea} ${data.dripAreaUnit}` : null} />
        </View>

        {/* CROP OVERVIEW (Derived) */}
        {/* <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("Current Crop Overview")}</Text>
          <DataRow label={t("Primary Crop")} value={data.primaryCrop} />
          <DataRow label={t("Sowing Date")} value={data.sowingDate} />
          <DataRow label={t("Expected Harvest")} value={data.expectedHarvestDate} />
        </View> */}

        {/* STEP 3: SOIL & HISTORY */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("Soil & Nutrients")}</Text>
          <DataRow label={t("Soil Texture")} value={data.soilType || data.soilTexture} />
          <DataRow label={t("Soil pH")} value={data.soilPh} />
          <DataRow label={t("Soil EC")} value={data.soilEc ? `${data.soilEc} mS/cm` : null} />
          <DataRow label={t("Organic Matter")} value={data.organicMatter ? `${data.organicMatter}%` : null} />
          <DataRow label={t("Nitrogen (N)")} value={data.nitrogen ? `${data.nitrogen} kg/ha` : null} />
          <DataRow label={t("Phosphorus (P)")} value={data.phosphorus ? `${data.phosphorus} kg/ha` : null} />
          <DataRow label={t("Potassium (K)")} value={data.potassium ? `${data.potassium} kg/ha` : null} />
          <DataRow label={t("Drainage Condition")} value={data.drainageCondition} />
          <DataRow label={t("Soil Test Done?")} value={data.soilTestStatus} />
          {data.soilTestStatus === 'Yes' && <DataRow label={t("Soil Test Date")} value={data.soilTestDate} />}
        </View>

        {/* YIELD HISTORY */}
        {yieldHistory.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t("Yield History")}</Text>
            {yieldHistory.map((item: any, index: number) => (
              <View key={index} style={{ paddingVertical: 8, borderBottomWidth: index === yieldHistory.length - 1 ? 0 : 1, borderBottomColor: colors.screen }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{item.year || t("Unknown Year")} ({item.season})</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={{ fontSize: 13, color: colors.textMuted }}>{item.cropGrown || item.crop || '--'}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
                    {item.yieldQtl || item.yield ? `${item.yieldQtl || item.yield} Qtl/Acre` : '--'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* STEP 4: INFRA, BRANDS & MARKET */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("Input & Market Profile")}</Text>
          <DataRow label={t("Preferred Chem Ferts")} value={data.preferredChemFert} />
          <DataRow label={t("Preferred Chem Crops")} value={data.preferredChemCrop} />
          <DataRow label={t("Bio/Organic Brands")} value={data.currentBioBrands} />
          <DataRow label={t("Decision Factor")} value={data.decisionFactor} />
          <DataRow label={t("Primary Sales Channel")} value={data.primarySalesChannel} />
          <DataRow label={t("Distance to Market")} value={data.distanceToMarket ? `${data.distanceToMarket} km` : null} />
          <DataRow label={t("Transport Method")} value={data.transportMethod} />
          <DataRow label={t("Payment Cycle")} value={data.paymentCycle} />
        </View>

        {/* MACHINERY & LIVESTOCK */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("Machinery & Livestock")}</Text>
          <DataRow label={t("Tractor Ownership")} value={data.tractorOwnership} />
          <DataRow label={t("Sowing Equipment")} value={data.sowingEquipment} />
          <DataRow label={t("Spray Equipment")} value={data.sprayEquipment} />
          <DataRow label={t("Tillage Machinery")} value={data.tillageMachinery} />
          <DataRow label={t("Milch Cows")} value={data.milchCows} />
          <DataRow label={t("Buffaloes")} value={data.buffaloes} />
          <DataRow label={t("Draft Animals")} value={data.draftAnimals} />
          <DataRow label={t("Goats / Sheep / Poultry")} value={data.goatsSheepPoultry} />
          <DataRow label={t("Avg FYM Generated")} value={data.fymGenerated ? `${data.fymGenerated} Tons/Yr` : null} />
          <DataRow label={t("FYM Handling Method")} value={data.fymHandlingMethod} />
          <DataRow label={t("Crop Residue Mgmt")} value={data.cropResidueManagement} />
          <DataRow label={t("Compost Enrichment Potential")} value={data.compostEnrichmentWillingness} />
        </View>

        {/* NEIGHBORHOOD RISKS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("Neighborhood Risk Boundaries")}</Text>
          <DataRow label={t("Water-Borne Runoff Risk")} value={data.waterBorneRunoffRisk} />
          <DataRow label={t("Airborne Spray Drift")} value={data.airborneSprayDriftRisk} />
          <DataRow label={t("Edge Plantation Present")} value={data.edgePlantationPresent} />
          {data.edgePlantationPresent === 'Yes' && <DataRow label={t("Crop Barrier")} value={data.biologicalCropBarrier} />}
          <DataRow label={t("Dominant Pest Vector")} value={data.dominantPestVector} />
        </View>

        {/* DIGITAL ADOPTION */}
        {data.digitalAdoption && data.digitalAdoption.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t("Digital Adoption")}</Text>
            {data.digitalAdoption.map((item: string, index: number) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
                <MaterialIcons name="check-circle" size={16} color="#16A34A" />
                <Text style={{ marginLeft: 8, fontSize: 13, color: colors.text, fontWeight: '600' }}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* VERIFICATION MEDIA */}
        {(media.soil_squeeze || media.lab_report) && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t("Photographic Evidence")}</Text>
            <MediaLink label={t("View Soil Squeeze Test")} url={media.soil_squeeze} icon="perm-media" />
            <MediaLink label={t("View Lab / pH Reading")} url={media.lab_report} icon="science" />
          </View>
        )}
        
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface, 
    padding: spacing.lg, 
    borderRadius: radius.lg, 
    borderWidth: 1, 
    borderColor: colors.border, 
    marginBottom: spacing.lg 
  },
  sectionTitle: {
    fontSize: 16, 
    fontWeight: '900', 
    color: colors.primary, 
    marginBottom: 12 
  }
});