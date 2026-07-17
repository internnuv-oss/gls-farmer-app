import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import MapView, { Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors, radius, spacing, shadows } from '../../../../design-system/tokens';

export const FarmDiaryProfileScreen = ({ route, navigation }: any) => {
  const { t } = useTranslation();
  const { diary } = route.params;
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Validate the polygon
  const diaryPolygon = Array.isArray(diary.diary_polygon) && diary.diary_polygon.length > 2 
    ? diary.diary_polygon 
    : null;

  const smallMapRef = React.useRef<any>(null);
  const expandedMapRef = React.useRef<any>(null);

  const handleMapReady = (ref: any) => {
    if (ref && diaryPolygon) {
      ref.fitToCoordinates(diaryPolygon, {
        edgePadding: { top: 20, right: 20, bottom: 20, left: 20 },
        animated: false,
      });
    }
  };

  const getRegion = () => {
    if (!diaryPolygon) return null;
    const lats = diaryPolygon.map((p: any) => p.latitude);
    const lons = diaryPolygon.map((p: any) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const ZOOM_DELTA = 0.0005;
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.5, ZOOM_DELTA),
      longitudeDelta: Math.max((maxLon - minLon) * 1.5, ZOOM_DELTA),
    };
  };

  const initialRegion = getRegion();

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.screen }}>
      {/* EXPANDABLE MAP MODAL */}
      <Modal visible={isMapExpanded} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <Pressable onPress={() => setIsMapExpanded(false)} style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.pill }}>
            <MaterialIcons name="close" size={28} color="#FFF" />
          </Pressable>
          {initialRegion && diaryPolygon && (
            <View style={{ width: '100%', height: '80%', borderRadius: radius.md, overflow: 'hidden' }}>
              <MapView 
                ref={expandedMapRef}
                style={{ flex: 1 }}
                provider={PROVIDER_GOOGLE}
                initialRegion={initialRegion}
                mapType="satellite"
                onMapReady={() => handleMapReady(expandedMapRef.current)}
              >
                <Polygon 
                  coordinates={diaryPolygon}
                  fillColor="rgba(22, 163, 74, 0.4)"
                  strokeColor="#16A34A"
                  strokeWidth={2}
                />
              </MapView>
            </View>
          )}
        </View>
      </Modal>

      {/* HEADER */}
      <View style={{ padding: spacing.xl, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginLeft: spacing.sm }}>{t("Back")}</Text>
        </Pressable>
        <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text }}>{t("Farm Diary Profile")}</Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 4 }}>
          {diary.farm_name || "Farm Diary"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl }}>
        
        {/* SATELLITE BOUNDARY */}
        {initialRegion && diaryPolygon && (
          <Pressable onPress={() => setIsMapExpanded(true)} style={{ marginBottom: spacing.xl, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
            <View pointerEvents="none" style={{ height: 200, width: '100%' }}>
              <MapView 
                ref={smallMapRef}
                style={{ flex: 1 }}
                provider={PROVIDER_GOOGLE}
                initialRegion={initialRegion}
                mapType="satellite"
                zoomEnabled={false}
                scrollEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
                onMapReady={() => handleMapReady(smallMapRef.current)}
              >
                <Polygon 
                  coordinates={diaryPolygon}
                  fillColor="rgba(22, 163, 74, 0.4)"
                  strokeColor="#16A34A"
                  strokeWidth={2}
                />
              </MapView>
            </View>
            <View style={{ backgroundColor: colors.surface, padding: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
              <MaterialIcons name="zoom-out-map" size={18} color={colors.text} style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text, textAlign: 'center' }}>{t("Tap to Expand Satellite Boundary")}</Text>
            </View>
          </Pressable>
        )}

        {/* FARM PROFILE */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("Farm Profile")}</Text>
          <DataRow label={t("Farm Name")} value={diary.farm_name} />
          <DataRow label={t("Legal Owner")} value={diary.legal_owner_name} />
          <DataRow label={t("Survey No.")} value={diary.survey_khasra_no} />
          <DataRow label={t("Field & Plot")} value={[diary.field_number, diary.plot_number].filter(Boolean).join(' / ')} />
          <DataRow label={t("Total Area")} value={diary.total_land_area_acres ? `${diary.total_land_area_acres} Acres` : null} />
          <DataRow label={t("Cultivated Area")} value={diary.cultivated_area_acres ? `${diary.cultivated_area_acres} Acres` : null} />
          <DataRow label={t("Land Status")} value={diary.land_status} />
        </View>

        {/* SOIL & WATER PROFILE */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("Soil & Water Profile")}</Text>
          <DataRow label={t("Soil Type")} value={diary.soil_type} />
          <DataRow label={t("Soil pH")} value={diary.soil_ph} />
          <DataRow label={t("Soil EC")} value={diary.soil_ec_ms_cm ? `${diary.soil_ec_ms_cm} mS/cm` : null} />
          <DataRow label={t("Organic Matter")} value={diary.organic_matter_percentage ? `${diary.organic_matter_percentage}%` : null} />
          <DataRow label={t("Drainage Condition")} value={diary.drainage_condition} />
          <DataRow label={t("Water Source")} value={diary.water_source} />
          <DataRow label={t("Irrigation Method")} value={diary.irrigation_method} />
          <DataRow label={t("Water Quality (TDS)")} value={diary.water_tds ? `${diary.water_tds} ppm` : null} />
          <DataRow label={t("Water pH")} value={diary.water_ph} />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
    ...shadows.soft
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: spacing.sm
  }
});
