import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../../core/supabase';
import { calculateDistance } from '../../../core/locationUtils';

import { colors, radius, spacing, shadows } from '../../../design-system/tokens';
import { Button } from '../../../design-system/components';
import { useShiftStore } from '../../../store/shiftStore';
import { useAuthStore } from '../../../store/authStore';
import { useExpenseStore } from '../../../store/expenseStore';

export const TravelReportScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const user = useAuthStore((s) => s.user);
    const shiftHistory = useShiftStore((s) => s.shiftHistory);
    const expenses = useExpenseStore((s) => s.expenses);

    const [viewMode, setViewMode] = useState<'calendar' | 'report'>('calendar');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isCapturing, setIsCapturing] = useState(false);

    const viewShotRef = useRef<ViewShot>(null);
    const mapRef = useRef<MapView>(null);

    const isSameDay = (d1: Date, d2: Date) =>
        d1.getDate() === d2.getDate() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear();

    const dailyShift = useMemo(() => {
        return shiftHistory.find((s) => isSameDay(new Date(s.date), selectedDate));
    }, [selectedDate, shiftHistory]);

    const [dynamicRoute, setDynamicRoute] = useState<any[]>([]);
    const [isLoadingRoute, setIsLoadingRoute] = useState(false);

    // 🚀 NEW: State to hold the fetched route details
    const [assignedRoute, setAssignedRoute] = useState<{name: string, locations: string[]} | null>(null);

    // 🚀 NEW: State and Handler for Pull-to-Refresh functionality
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        if (!dailyShift?.id) return;
        setRefreshing(true);
        setIsLoadingRoute(true);
        try {
            let allPoints: any[] = [];
            let lastTimestamp = 0;
            let hasMore = true;

            while (hasMore) {
                const { data } = await supabase
                    .from('shift_locations')
                    .select('lat, lng, timestamp')
                    .eq('shift_id', dailyShift.id)
                    .gt('timestamp', lastTimestamp)
                    .order('timestamp', { ascending: true })
                    .limit(1000);

                if (data && data.length > 0) {
                    allPoints = [...allPoints, ...data];
                    lastTimestamp = data[data.length - 1].timestamp;
                    if (data.length < 1000) hasMore = false;
                } else {
                    hasMore = false;
                }
            }

            const simplifiedPoints = [];
            let lastAdded = null;

            for (const point of allPoints) {
                if (!lastAdded) {
                    simplifiedPoints.push({ lat: point.lat, lng: point.lng });
                    lastAdded = point;
                } else {
                    const dist = calculateDistance(lastAdded.lat, lastAdded.lng, point.lat, point.lng);
                    if (dist > 0.05) {
                        simplifiedPoints.push({ lat: point.lat, lng: point.lng });
                        lastAdded = point;
                    }
                }
            }

            setDynamicRoute(simplifiedPoints);
            
            // Re-trigger the map camera framing to re-align the newly refreshed polyline bounds
            fitMapToRoute();
        } catch (error) {
            console.error("Refresh failed:", error);
        } finally {
            setIsLoadingRoute(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const fetchRouteDetails = async () => {
            if (!dailyShift) {
                setAssignedRoute(null);
                return;
            }
            // If they selected "Others" during punch-in, assigned_route_id is null
            if (!dailyShift.assigned_route_id) {
                setAssignedRoute({ name: 'Others', locations: [] });
                return;
            }
            
            try {
                const { data, error } = await supabase
                    .from('routes')
                    .select('name, locations')
                    .eq('id', dailyShift.assigned_route_id)
                    .single();
                    
                if (data && !error) {
                    setAssignedRoute({ name: data.name, locations: data.locations || [] });
                }
            } catch (e) {
                console.error("Failed to fetch route details", e);
            }
        };
        fetchRouteDetails();
    }, [dailyShift?.assigned_route_id, dailyShift]);

    useEffect(() => {
        const fetchRouteForShift = async () => {
            if (!dailyShift?.id) {
                setDynamicRoute([]);
                return;
            }
    
            setIsLoadingRoute(true);
            try {
                let allPoints: any[] = [];
                let lastTimestamp = 0;
                let hasMore = true;
    
                // Paginate through Supabase to bypass the 1,000 row limit
                while (hasMore) {
                    const { data } = await supabase
                        .from('shift_locations')
                        .select('lat, lng, timestamp')
                        .eq('shift_id', dailyShift.id)
                        .gt('timestamp', lastTimestamp)
                        .order('timestamp', { ascending: true })
                        .limit(1000);
    
                    if (data && data.length > 0) {
                        allPoints = [...allPoints, ...data];
                        lastTimestamp = data[data.length - 1].timestamp;
                        if (data.length < 1000) hasMore = false;
                    } else {
                        hasMore = false;
                    }
                }
    
                // 🚀 MAP OPTIMIZATION: Simple Decimation
                // Only keep points that are at least ~50 meters apart visually to prevent UI freezing
                const simplifiedPoints = [];
                let lastAdded = null;
    
                for (const point of allPoints) {
                    if (!lastAdded) {
                        simplifiedPoints.push({ lat: point.lat, lng: point.lng });
                        lastAdded = point;
                    } else {
                        const dist = calculateDistance(lastAdded.lat, lastAdded.lng, point.lat, point.lng);
                        if (dist > 0.05) { // 0.05 km = 50 meters
                            simplifiedPoints.push({ lat: point.lat, lng: point.lng });
                            lastAdded = point;
                        }
                    }
                }
    
                setDynamicRoute(simplifiedPoints);
            } catch (error) {
                console.error("Failed to fetch route:", error);
            } finally {
                setIsLoadingRoute(false);
            }
        };
    
        fetchRouteForShift();
    }, [dailyShift?.id]);

    const reportData = useMemo(() => {
        if (!dailyShift) return null;
        const shiftData = dailyShift as any;

        const punchInEvent = dailyShift.events.find((e: any) => e.type === "punch-in");
        const punchOutEvent = dailyShift.events.find((e: any) => e.type === "punch-out");

        const rawStart = shiftData.startKm || shiftData.start_km || "0";
        const rawEnd = shiftData.endKm || shiftData.end_km || rawStart;

        const startKm = parseFloat(rawStart);
        const endKm = parseFloat(rawEnd);
        const manualDistance = Math.max(0, endKm - startKm);

        const gpsDistance = shiftData.totalDistance || shiftData.total_distance || 0;
        const activities = shiftData.activitiesLogged || shiftData.activities_logged || 0;

        const TA = manualDistance * 4;
        const DA = manualDistance > 60 ? TA + 150 : TA;

        const dailyExpenses = expenses.filter(e => 
            isSameDay(new Date(e.date), selectedDate) && 
            e.category !== 'TA/DA' && 
            e.receipt_url !== 'SYSTEM_GENERATED'
        );
        
        const totalExpenses = dailyExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
        const grandTotal = DA + totalExpenses;

        const routeCoordinates = dynamicRoute.map((point: any) => ({ 
            latitude: point.lat, 
            longitude: point.lng 
        }));

        return {
            punchInTime: punchInEvent ? new Date(punchInEvent.time) : null,
            punchOutTime: punchOutEvent ? new Date(punchOutEvent.time) : null,
            startKm,
            endKm,
            manualDistance,
            gpsDistance: parseFloat(gpsDistance).toFixed(2), // 🚀 Format to 2 decimal places
            TA,
            DA,
            activities,
            routeCoordinates,
            dailyExpenses,
            totalExpenses,
            grandTotal,
        };
    }, [dailyShift, expenses, selectedDate]);

    // 🚀 FIX: Prevent map flashing world coordinates. Seed the region natively.
    const mapInitialRegion = useMemo(() => {
        if (reportData?.routeCoordinates && reportData.routeCoordinates.length > 0) {
            return {
                latitude: reportData.routeCoordinates[0].latitude,
                longitude: reportData.routeCoordinates[0].longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            };
        }
        return undefined;
    }, [reportData]);

    const getIconForType = (type: string) => {
        switch(type) {
            case 'punch-in': return { name: 'login', color: '#16A34A', bg: '#DCFCE7' };
            case 'punch-out': return { name: 'logout', color: '#DC2626', bg: '#FEE2E2' };
            case 'expense': return { name: 'receipt', color: '#D97706', bg: '#FEF3C7' };
            default: return { name: 'assignment', color: '#2563EB', bg: '#DBEAFE' };
        }
    };

    const renderTimelineEvent = (item: any, index: number, dataLength: number) => {
        const styling = getIconForType(item.type);
        const isLast = index === dataLength - 1;

        // 🚀 NEW: Dynamic Activity Description based on Route mapping
        let displayDescription = item.description;
        
        // Append Assigned Route to the Punch-in event description
        if (item.type === 'punch-in' && assignedRoute) {
            const routeText = `${t('Route')}: ${assignedRoute.name}`;
            displayDescription = displayDescription ? `${routeText}\n${displayDescription}` : routeText;
        }

        if (item.type === 'activity' && assignedRoute && displayDescription) {
            const isInRoute = (assignedRoute.locations || []).some((loc: any) => {
                // Safely extract the string whether it's an array of strings or objects like {name: 'Village'}
                const locName = typeof loc === 'string' ? loc : (loc?.name || loc?.village || '');
                if (!locName || typeof locName !== 'string') return false;
                
                return displayDescription.toLowerCase().includes(locName.toLowerCase());
            });
            
            // Prevent double-wrapping if the string somehow already contains the prefix
            if (!displayDescription.startsWith(`${assignedRoute.name} (`) && !displayDescription.startsWith('Others (')) {
                if (isInRoute && assignedRoute.name !== 'Others') {
                    // Display: "RouteName (VillageName)"
                    displayDescription = `${assignedRoute.name} (${displayDescription})`;
                } else {
                    // Display: "Others (VillageName)"
                    displayDescription = `Others (${displayDescription})`;
                }
            }
        }

        return (
            <View key={index} style={{ flexDirection: 'row', marginBottom: spacing.lg }}>
                <View style={{ width: 75, alignItems: 'flex-end', paddingRight: spacing.md }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                        {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
                
                <View style={{ alignItems: 'center', width: 24 }}>
                    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: styling.bg, alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                        <MaterialIcons name={styling.name as any} size={14} color={styling.color} />
                    </View>
                    {!isLast && <View style={{ width: 2, flex: 1, backgroundColor: colors.border, marginTop: -4, marginBottom: -20 }} />}
                </View>

                <View style={{ flex: 1, paddingLeft: spacing.md, paddingBottom: isLast ? 0 : spacing.lg }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{t(item.title)}</Text>
                    {displayDescription ? (
                        <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '600', marginTop: 4 }}>{t(displayDescription)}</Text>
                    ) : null}
                </View>
            </View>
        );
    };

    const handleShareReport = async () => {
        if (!viewShotRef.current) return;
        setIsCapturing(true);
        
        try {
            const uri = await captureRef(viewShotRef, {
                format: 'png',
                quality: 1.0,
                result: 'tmpfile'
            });
            const isAvailable = await Sharing.isAvailableAsync();
            
            if (isAvailable) {
                const rawName = user?.name || user?.firstName || 'Executive';
                const safeName = rawName.replace(/[^a-zA-Z0-9]/g, '_');
                const dateStr = selectedDate.toLocaleDateString('en-GB').replace(/\//g, '_');
                const finalFileName = `${safeName}_${dateStr}_Report.png`;
                const renamedUri = `${FileSystem.documentDirectory}${finalFileName}`;
                
                await FileSystem.copyAsync({
                    from: uri,
                    to: renamedUri
                });

                await Sharing.shareAsync(renamedUri, { 
                    mimeType: 'image/png',
                    dialogTitle: 'Share Travel Report' 
                });
            }
        } catch (error) {
            console.error("Error sharing report:", error);
        } finally {
            setIsCapturing(false);
        }
    };

    // 🚀 FIX: Reliable callback attached to the Map's native ready state
    const fitMapToRoute = () => {
        if (mapRef.current && reportData?.routeCoordinates && reportData.routeCoordinates.length > 1) {
            // Slight delay ensures the layout sizing resolves perfectly before animating zoom
            setTimeout(() => {
                mapRef.current?.fitToCoordinates(reportData.routeCoordinates, {
                    edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                    animated: true,
                });
            }, 300);
        }
    };

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const days: (Date | null)[] = Array(firstDay).fill(null);
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i));
    }

    const changeMonth = (offset: number) => {
        setCurrentMonth(new Date(year, month + offset, 1));
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.screen }}>
            <View style={{ paddingTop: 50, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surface }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Pressable
                        onPress={() => viewMode === 'report' ? setViewMode('calendar') : navigation.goBack()}
                        style={{ padding: 8, marginRight: 8 }}
                    >
                        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                    </Pressable>
                    <Text style={{ fontSize: 20, fontWeight: "900", color: colors.text }}>{t("Travel Report")}</Text>
                </View>
                {viewMode === 'report' && (
                    <Pressable onPress={handleShareReport} disabled={isCapturing || !dailyShift} style={{ opacity: !dailyShift || isCapturing ? 0.5 : 1 }}>
                        <MaterialIcons name="share" size={24} color={colors.primary} />
                    </Pressable>
                )}
            </View>

            {/* 🚀 Injected RefreshControl configuration */}
            <ScrollView 
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh} 
                        colors={[colors.primary]} // Android color indicator theme tint
                        tintColor={colors.primary} // iOS color indicator spinner tint
                    />
                }
            >
            <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1.0 }} style={{ flex: 1, backgroundColor: colors.screen }}>
                    {user && (
                        <View style={{ padding: spacing.lg, backgroundColor: colors.primarySoft, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                            <Text style={{ fontSize: 20, fontWeight: "900", color: colors.primary }}>{user.name}</Text>
                            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>Phone: {user.mobile}</Text>
                            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>{selectedDate.toLocaleDateString()}</Text>
                        </View>
                    )}

                    {viewMode === 'calendar' ? (
                        <View style={{ margin: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.soft }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
                                <Pressable onPress={() => changeMonth(-1)} style={{ padding: 8, backgroundColor: "#F1F5F9", borderRadius: radius.md }}>
                                    <MaterialIcons name="chevron-left" size={24} color={colors.text} />
                                </Pressable>
                                <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>
                                    {currentMonth.toLocaleDateString([], { month: "long", year: "numeric" })}
                                </Text>
                                <Pressable onPress={() => changeMonth(1)} style={{ padding: 8, backgroundColor: "#F1F5F9", borderRadius: radius.md }}>
                                    <MaterialIcons name="chevron-right" size={24} color={colors.text} />
                                </Pressable>
                            </View>

                            <View style={{ flexDirection: "row", marginBottom: spacing.sm }}>
                                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                                    <Text key={i} style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: "800", color: colors.textMuted }}>{d}</Text>
                                ))}
                            </View>

                            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                                {days.map((day, i) => {
                                    if (!day) return <View key={i} style={{ width: "14.28%", aspectRatio: 1 }} />;

                                    const dayTime = day.getTime();
                                    const todayNorm = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
                                    const isFuture = dayTime > todayNorm;
                                    const isSelected = isSameDay(day, selectedDate);
                                    const hasShift = shiftHistory.some(s => isSameDay(new Date(s.date), day));

                                    return (
                                        <Pressable
                                            key={i}
                                            onPress={() => setSelectedDate(day)}
                                            disabled={isFuture}
                                            style={{ width: "14.28%", aspectRatio: 1, justifyContent: "center", alignItems: "center" }}
                                        >
                                            <View style={[{ width: 36, height: 36, justifyContent: "center", alignItems: "center", borderRadius: 18 }, isSelected && { backgroundColor: colors.primary }]}>
                                                <Text style={{ color: isSelected ? "#FFF" : isFuture ? "#CBD5E1" : colors.text, fontWeight: isSelected ? "900" : "600", fontSize: 14 }}>
                                                    {day.getDate()}
                                                </Text>
                                            </View>
                                            {hasShift && !isSelected && (
                                                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, position: "absolute", bottom: 2 }} />
                                            )}
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                    ) : (
                        !reportData ? (
                            <View style={{ padding: spacing.xl, alignItems: "center" }}>
                                <MaterialIcons name="location-off" size={60} color={colors.border} />
                                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textMuted, marginTop: 16, textAlign: "center" }}>
                                    {t("No travel data recorded for this date.")}
                                </Text>
                            </View>
                        ) : (
                            <View style={{ padding: spacing.lg }}>

                                {/* MAP */}
                                <View style={{ height: 300, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, ...shadows.medium }}>
                                    {reportData.routeCoordinates.length > 0 ? (
                                        <MapView
                                            ref={mapRef}
                                            provider={PROVIDER_GOOGLE}
                                            style={{ flex: 1 }}
                                            initialRegion={mapInitialRegion} // 🚀 FIXED: No more world map flashes
                                            onMapReady={fitMapToRoute}       // 🚀 FIXED: Triggers exactly when engine mounts
                                            scrollEnabled={false}
                                            zoomEnabled={false}
                                        >
                                            <Polyline 
                                                coordinates={reportData.routeCoordinates} 
                                                strokeColor={colors.primary} 
                                                strokeWidth={5} 
                                                lineCap="round" 
                                                lineJoin="round" 
                                            />
                                            <Marker coordinate={reportData.routeCoordinates[0]} pinColor="green" title="Start" />
                                            <Marker coordinate={reportData.routeCoordinates[reportData.routeCoordinates.length - 1]} pinColor="red" title="End" />
                                        </MapView>
                                    ) : (
                                        <View style={{ flex: 1, backgroundColor: "#E2E8F0", justifyContent: "center", alignItems: "center" }}>
                                            <MaterialIcons name="map" size={48} color="#94A3B8" />
                                            <Text style={{ color: "#64748B", fontWeight: "600", marginTop: 8 }}>{t("No GPS route recorded")}</Text>
                                        </View>
                                    )}
                                </View>

                                {/* DISTANCES */}
                                <View style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.md }}>
                                    <View style={styles.card}>
                                        <Text style={styles.cardLabel}>MANUAL DISTANCE</Text>
                                        <Text style={styles.cardValue}>{reportData.manualDistance} km</Text>
                                        <Text style={styles.cardSubValue}>{reportData.startKm} to {reportData.endKm}</Text>
                                    </View>
                                    <View style={styles.card}>
                                        <Text style={styles.cardLabel}>GPS TRACKED</Text>
                                        <Text style={styles.cardValue}>{reportData.gpsDistance} km</Text>
                                        <Text style={styles.cardSubValue}>Background System</Text>
                                    </View>
                                </View>

                                <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
                                    
                                    {/* TIMELINE */}
                                    <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8 }}>
                                        {t("Activities")}
                                    </Text>
                                    <View style={{ marginTop: spacing.sm }}>
                                        {(() => {
                                            const events = [...(dailyShift?.events || [])].sort((a: any, b: any) => a.time - b.time);
                                            if (events.length === 0) {
                                                return (
                                                    <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: "center", paddingVertical: spacing.sm }}>
                                                        {t("No activities logged on this date.")}
                                                    </Text>
                                                );
                                            }
                                            return events.map((item, index) => renderTimelineEvent(item, index, events.length));
                                        })()}
                                    </View>

                                    {/* FINANCIALS / ALLOWANCE */}
                                    <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text, marginTop: 24, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8 }}>
                                        {t("Summary")}
                                    </Text>
                                    

                                    <View style={styles.row}>
                                        <Text style={styles.rowLabel}>Profiles / Activities Logged:</Text>
                                        <Text style={styles.rowValue}>{reportData.activities}</Text>
                                    </View>

                                    <View style={styles.row}>
                                        <Text style={styles.rowLabel}>Travel Allowance (TA @ ₹4/km):</Text>
                                        <Text style={styles.rowValue}>₹{reportData.TA || 0}</Text>
                                    </View>

                                    <View style={styles.row}>
                                        <Text style={styles.rowLabel}>Daily Allowance (DA):</Text>
                                        <Text style={styles.rowValue}>₹{reportData.manualDistance > 60 ? 150 : 0}</Text>
                                    </View>

                                    {reportData.dailyExpenses && reportData.dailyExpenses.length > 0 && (
                                        <View style={styles.row}>
                                            <Text style={styles.rowLabel}>{t("Other Expenses")}:</Text>
                                            <Text style={styles.rowValue}>₹{reportData.totalExpenses || 0}</Text>
                                        </View>
                                    )}

                                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1.5, borderTopColor: colors.primarySoft }}>
                                        <Text style={{ fontSize: 18, fontWeight: "900", color: colors.primary }}>{t("Grand Total")}:</Text>
                                        <Text style={{ fontSize: 24, fontWeight: "900", color: colors.primary }}>
                                            ₹{(reportData.TA || 0) + (reportData.manualDistance > 60 ? 150 : 0) + (reportData.totalExpenses || 0)}
                                        </Text>
                                    </View>
                                </View>

                            </View>
                        )
                    )}
                </ViewShot>
            </ScrollView>

            <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, ...shadows.medium }}>
                {viewMode === 'calendar' ? (
                    <Button 
                        label={`View Report for ${selectedDate.toLocaleDateString()}`}
                        onPress={() => setViewMode('report')} 
                    />
                ) : (
                    <Button 
                        label="Share Travel Report"
                        onPress={handleShareReport}
                        disabled={!dailyShift || isCapturing}
                        icon="share"
                    />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        flex: 1,
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardLabel: {
        fontSize: 11,
        fontWeight: "800",
        color: colors.textMuted,
        marginBottom: 8,
    },
    cardValue: {
        fontSize: 20,
        fontWeight: "900",
        color: colors.text,
    },
    cardSubValue: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 4,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 5,
    },
    rowLabel: {
        fontSize: 14,
        fontWeight: "700",
        color: colors.textMuted,
    },
    rowValue: {
        fontSize: 14,
        fontWeight: "900",
        color: colors.text,
    },
});