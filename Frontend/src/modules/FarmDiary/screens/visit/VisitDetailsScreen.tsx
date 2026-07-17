import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing, shadows } from '../../../../design-system/tokens';

export const VisitDetailsScreen = ({ route, navigation }: any) => {
  const { t } = useTranslation();
  const { visit, visitNumber, diary } = route.params;

  const isGeneral = visit.is_general;
  const stageName = isGeneral 
    ? t('General') 
    : (visit.master_crop_stages?.stage_name || t('Unknown Stage'));
  
  const title = `${t("Visit")} ${visitNumber}: ${stageName}`;

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

  const baseVisit = visit.base_visit || {};

  const getPlantAverages = () => {
    if (!visit.plant_sample_sets || visit.plant_sample_sets.length === 0) return [];

    const paramMap: Record<string, { sum: number, count: number, uom: string }> = {};
    let totalPlantsSampled = 0;

    visit.plant_sample_sets.forEach((sample: any) => {
      totalPlantsSampled++;
      (sample.sample_parameter_values || []).forEach((val: any) => {
        const label = val.master_parameters?.parameter_label;
        const uom = val.master_uom?.uom_symbol || '';
        const numVal = parseFloat(val.logged_value_raw);
        if (label && !isNaN(numVal)) {
          if (!paramMap[label]) {
            paramMap[label] = { sum: 0, count: 0, uom };
          }
          paramMap[label].sum += numVal;
          paramMap[label].count += 1;
        }
      });
    });

    const results = Object.keys(paramMap).map(label => {
      const avg = (paramMap[label].sum / paramMap[label].count).toFixed(1);
      // Remove .0 if it's a whole number
      const cleanAvg = avg.endsWith('.0') ? avg.slice(0, -2) : avg;
      return { label, average: cleanAvg, uom: paramMap[label].uom };
    });

    return { totalPlantsSampled, averages: results };
  };

  const { totalPlantsSampled, averages } = getPlantAverages() as any;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.screen }}>
      {/* HEADER */}
      <View style={{ padding: spacing.xl, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginLeft: spacing.sm }}>{t("Back")}</Text>
        </Pressable>
        <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text }}>{title}</Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 4 }}>
          {new Date(visit.created_at).toLocaleString()}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl }}>
        
        {/* BASE VISIT DETAILS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("Base Visit Details")}</Text>
          <DataRow label={t("Soil Moisture")} value={baseVisit.soil_moisture_percentage ? `${baseVisit.soil_moisture_percentage}%` : null} />
          <DataRow label={t("Soil Health")} value={baseVisit.soil_health_status} />
          <DataRow label={t("Last Watering Date")} value={baseVisit.last_watering_date ? new Date(baseVisit.last_watering_date).toLocaleDateString() : null} />
          {baseVisit.general_observations && (
            <View style={{ marginTop: spacing.sm }}>
              <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '600' }}>{t("Observations")}</Text>
              <Text style={{ fontSize: 14, color: colors.text, marginTop: 4 }}>{baseVisit.general_observations}</Text>
            </View>
          )}

          {baseVisit.visit_photos && baseVisit.visit_photos.length > 0 && (
            <View style={{ marginTop: spacing.md }}>
              <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '600', marginBottom: spacing.sm }}>{t("Photos")}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {baseVisit.visit_photos.map((photo: string, idx: number) => (
                   <Image key={idx} source={{ uri: photo }} style={{ width: 100, height: 100, borderRadius: 8, marginRight: 8 }} />
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* INPUTS APPLIED */}
        {(baseVisit.fertilizers_given || baseVisit.pesticides_given) && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t("Inputs Applied")}</Text>
            {baseVisit.fertilizers_given && baseVisit.fertilizers_applied && baseVisit.fertilizers_applied.length > 0 && (
              <View style={{ marginBottom: spacing.md }}>
                <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '700', marginBottom: 4 }}>{t("Fertilizers")}</Text>
                {baseVisit.fertilizers_applied.map((f: any, i: number) => (
                  <Text key={i} style={{ fontSize: 14, color: colors.text }}>• {f.name} ({f.quantity}{f.unit}) - {f.method}</Text>
                ))}
              </View>
            )}
            {baseVisit.pesticides_given && baseVisit.pesticides_applied && baseVisit.pesticides_applied.length > 0 && (
              <View>
                <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '700', marginBottom: 4 }}>{t("Pesticides")}</Text>
                {baseVisit.pesticides_applied.map((p: any, i: number) => (
                  <Text key={i} style={{ fontSize: 14, color: colors.text }}>• {p.name} ({p.quantity}{p.unit}) - {p.method}</Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* CROP OBSERVATION DETAILS (If Not General) */}
        {!isGeneral && (
          <View style={styles.card}>
            <Text style={[styles.sectionTitle, { marginBottom: spacing.sm }]}>{t("Crop Health")}</Text>
            <DataRow label={t("Crop")} value={visit.master_crops?.crop_name} />
            
            {averages && averages.length > 0 && (
              <View style={{ marginTop: spacing.md }}>
                <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '700', marginBottom: spacing.xs }}>
                  {t("Averages")} ({totalPlantsSampled} {t("Plants")})
                </Text>
                {averages.map((avg: any, i: number) => (
                  <DataRow key={i} label={avg.label} value={`${avg.average} ${avg.uom}`.trim()} />
                ))}
              </View>
            )}

            <Text style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic', marginTop: spacing.md }}>
              {t("Detailed plant parameters are collected in the background. Averages are used for yield prediction.")}
            </Text>
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
