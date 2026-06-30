import React, { useState, useRef, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import MapView, { Polyline, Marker } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import { colors, radius, spacing, shadows } from '../../../design-system/tokens';
import { Button } from '../../../design-system/components';
import { useShiftStore } from '../../../store/shiftStore';
import { useAuthStore } from '../../../store/authStore';

const { width } = Dimensions.get('window');

export const TravelReportScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const shiftHistory = useShiftStore((s) => s.shiftHistory);
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  
  const viewShotRef = useRef<ViewShot>(null);
  const mapRef = useRef<MapView>(null);

  // Helper to filter dates
  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  };

  // Extract shift data for the selected day
  const dailyShift = useMemo(() => {
    return shiftHistory.find(s => isSameDay(new Date(s.date), selectedDate));
  }, [selectedDate, shiftHistory]);

  const reportData = useMemo(() => {
    if (!dailyShift) return null;

    const shiftData = dailyShift as any;

    const punchInEvent = dailyShift.events.find(e => e.type === 'punch-in');
    const punchOutEvent = dailyShift.events.find(e => e.type === 'punch-out');

    // 🚀 THE FIX: Bulletproof extraction checking both camelCase (Frontend) and snake_case (Raw DB)
    const rawStart = shiftData.startKm || shiftData.start_km || '0';
    const rawEnd = shiftData.endKm || shiftData.end_km || rawStart;
    
    const startKm = parseFloat(rawStart);
    const endKm = parseFloat(rawEnd);
    const manualDistance = Math.max(0, endKm - startKm);
    
    const gpsDistance = shiftData.totalDistance || shiftData.total_distance || 0;
    const activities = shiftData.activitiesLogged || shiftData.activities_logged || 0;

    // Financial Calculations based on exact rules
    const TA = manualDistance * 4;
    const DA = manualDistance > 60 ? TA + 150 : TA;

    // Route coordinates for the Map
    const rawRoute = shiftData.routePath || shiftData.route_path || [];
    const routeCoordinates = rawRoute.map((point: any) => ({
      latitude: point.lat,
      longitude: point.lng,
    }));

    // 🚀 Extract the status
    const allowanceStatus = shiftData.allowance_status || shiftData.allowanceStatus || 'Pending';

    return {
      punchInTime: punchInEvent ? new Date(punchInEvent.time) : null,
      punchOutTime: punchOutEvent ? new Date(punchOutEvent.time) : null,
      startKm,
      endKm,
      manualDistance,
      gpsDistance,
      TA,
      DA,
      activities,
      routeCoordinates,
      allowanceStatus
    };
  }, [dailyShift]);

  const handleShareReport = async () => {
    if (!viewShotRef.current) return;
    setIsCapturing(true);
    
    try {
      const uri = await captureRef(viewShotRef, {
        format: 'jpg',
        quality: 0.9,
      });
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/jpeg',
          dialogTitle: `Travel Report - ${selectedDate.toLocaleDateString()}`,
        });
      }
    } catch (error) {
      console.error("Failed to share report", error);
    } finally {
      setIsCapturing(false);
    }
  };

  // Auto-zoom map to fit the route
  const handleMapLayout = () => {
    // 🚀 FIX 2: Safely ensure reportData isn't null before checking routeCoordinates
    if (mapRef.current && reportData && reportData.routeCoordinates.length > 0) {
      mapRef.current.fitToCoordinates(reportData.routeCoordinates, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: true,
      });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.screen }}>
      {/* Header */}
      <View style={{ paddingTop: 50, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => navigation.goBack()} style={{ padding: 8, marginRight: 8 }}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text }}>{t("Travel Report")}</Text>
        </View>
        <Pressable onPress={handleShareReport} disabled={isCapturing || !dailyShift} style={{ opacity: (!dailyShift || isCapturing) ? 0.5 : 1 }}>
          <MaterialIcons name="share" size={24} color={colors.primary} />
        </Pressable>
      </View>

      {/* Date Selector */}
      <View style={{ padding: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable 
          onPress={() => setShowDatePicker(true)}
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, justifyContent: 'space-between' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="calendar-today" size={20} color={colors.primary} style={{ marginRight: 10 }} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
              {selectedDate.toLocaleDateString('en-GB')} {/* en-GB gives dd/mm/yyyy */}
            </Text>
          </View>
          <MaterialIcons name="arrow-drop-down" size={24} color={colors.textMuted} />
        </Pressable>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) setSelectedDate(date);
            }}
          />
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* The ViewShot wraps everything we want to capture in the image */}
        <ViewShot ref={viewShotRef} style={{ backgroundColor: colors.screen }}>
          
          {/* Capture Header (Visible in screenshot) */}
          <View style={{ padding: spacing.lg, backgroundColor: colors.primarySoft }}>
            {/* 🚀 FIX 3: Use .name (or firstName) and .mobile matching your store's interface */}
            <Text style={{ fontSize: 22, fontWeight: '900', color: colors.primary }}>{user?.name || user?.firstName || 'Executive Report'}</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Phone: +91 {user?.mobile || 'N/A'}</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Date: {selectedDate.toLocaleDateString('en-GB')}</Text>
          </View>

          {!reportData ? (
            <View style={{ padding: spacing.xl, alignItems: 'center', marginTop: 40 }}>
              <MaterialIcons name="location-off" size={60} color={colors.border} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textMuted, marginTop: 16 }}>
                {t("No travel data recorded for this date.")}
              </Text>
            </View>
          ) : (
            <View style={{ padding: spacing.lg }}>
              
              {/* THE MAP */}
              <View style={{ height: 280, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, ...shadows.medium }}>
                {reportData.routeCoordinates.length > 0 ? (
                  <MapView
                    ref={mapRef}
                    style={{ flex: 1 }}
                    onLayout={handleMapLayout}
                    scrollEnabled={false} // Lock map interaction for the report view
                    zoomEnabled={false}
                  >
                    <Polyline
                      coordinates={reportData.routeCoordinates}
                      strokeColor={colors.primary} 
                      strokeWidth={4}
                    />
                    <Marker coordinate={reportData.routeCoordinates[0]} pinColor="green" title="Start" />
                    <Marker coordinate={reportData.routeCoordinates[reportData.routeCoordinates.length - 1]} pinColor="red" title="End" />
                  </MapView>
                ) : (
                  <View style={{ flex: 1, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: colors.textMuted, fontWeight: '700' }}>No GPS route captured</Text>
                  </View>
                )}
              </View>

              {/* TIMINGS */}
              <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>PUNCHED IN</Text>
                  <Text style={styles.cardValue}>
                    {reportData.punchInTime ? reportData.punchInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </Text>
                </View>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>PUNCHED OUT</Text>
                  <Text style={styles.cardValue}>
                    {reportData.punchOutTime ? reportData.punchOutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </Text>
                </View>
              </View>

              {/* DISTANCES */}
              <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>MANUAL DISTANCE</Text>
                  <Text style={styles.cardValue}>{reportData.manualDistance} km</Text>
                  <Text style={styles.subText}>{reportData.startKm} to {reportData.endKm}</Text>
                </View>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>GPS TRACKED</Text>
                  <Text style={styles.cardValue}>{reportData.gpsDistance} km</Text>
                  <Text style={styles.subText}>Background System</Text>
                </View>
              </View>

              {/* FINANCIALS & ACTIVITIES */}
              <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8 }}>
                  Daily Summary
                </Text>
                
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Profiles / Activities Logged:</Text>
                  <Text style={styles.rowValue}>{reportData.activities}</Text>
                </View>
                
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Travel Allowance (TA @ ₹4/km):</Text>
                  <Text style={styles.rowValue}>₹{reportData.TA}</Text>
                </View>

                <View style={[styles.row, { borderBottomWidth: 0, marginBottom: 0, marginTop: 8 }]}>
                  <Text style={[styles.rowLabel, { fontSize: 16, fontWeight: '900', color: colors.text }]}>Total Daily Allowance (DA):</Text>
                  <Text style={[styles.rowValue, { fontSize: 20, color: colors.text }]}>₹{reportData.DA}</Text>
                </View>
                
                {reportData.manualDistance > 60 && (
                  <Text style={{ fontSize: 11, color: colors.success, fontWeight: '700', textAlign: 'right', marginTop: 4, marginBottom: 8 }}>
                    {"+ ₹150 Bonus (Distance > 60km)"}
                  </Text>
                )}

                {/* 🚀 NEW: Allowance Status Banner */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textMuted }}>{t("Allowance Status")}:</Text>
                  <View style={{ 
                    backgroundColor: reportData.allowanceStatus === 'Approved' ? '#DCFCE7' : reportData.allowanceStatus === 'Rejected' ? '#FEE2E2' : reportData.allowanceStatus === 'Queried' ? '#FEF3C7' : '#F1F5F9', 
                    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill 
                  }}>
                    <Text style={{ 
                      color: reportData.allowanceStatus === 'Approved' ? '#166534' : reportData.allowanceStatus === 'Rejected' ? '#991B1B' : reportData.allowanceStatus === 'Queried' ? '#B45309' : '#475569', 
                      fontSize: 12, fontWeight: '800', textTransform: 'uppercase' 
                    }}>
                      {t(reportData.allowanceStatus)}
                    </Text>
                  </View>
                </View>

              </View>

            </View>
          )}
        </ViewShot>
      </ScrollView>

      {/* 🚀 STICKY BOTTOM BAR FOR SHARING */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, ...shadows.medium }}>
        <Button 
          label={isCapturing ? t("Preparing Report...") : t("Share Travel Report")} 
          onPress={handleShareReport} 
          disabled={isCapturing || !dailyShift} 
          icon="share"
        />
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  cardLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted, marginBottom: 4 },
  cardValue: { fontSize: 18, fontWeight: '900', color: colors.text },
  subText: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12 },
  rowLabel: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  rowValue: { fontSize: 16, fontWeight: '900', color: colors.text }
});