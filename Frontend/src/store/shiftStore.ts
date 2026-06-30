import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { supabase } from '../core/supabase';
import { useAuthStore } from './authStore';
import { SHIFT_LOCATION_TASK, calculateDistance } from '../core/locationUtils';

export interface TimelineEvent {
  id: string;
  time: number; 
  actualTime?: number; 
  editedTime?: number | null; 
  location?: { lat: number, lng: number } | null; 
  vehicleType?: 'two-wheeler' | 'four-wheeler' | null; 
  type: 'punch-in' | 'punch-out' | 'activity' | 'expense';
  title: string;
  description?: string;
}

export interface PastShift {
  id: string;
  date: string;
  events: TimelineEvent[];
  routePath?: any[]; // 🚀 Exposed for UI map rendering
}

interface ShiftState {
  activeShiftId: string | null;
  isActive: boolean;
  startTime: number | null;
  isPersonalVehicle: boolean;
  startKm: string;
  transitMode: string;
  activitiesLogged: number;
  shiftHistory: PastShift[]; 
  routePath: any[];
  pendingPoints: any[]; // 🚀 NEW: Queue for un-uploaded GPS points
  totalDistance: number;
  
  hydrateShifts: () => Promise<void>;
  startShift: (isPersonal: boolean, km: string, transit: string, vehicleType: 'two-wheeler' | 'four-wheeler' | null, actualTime: number, editedTime: number | null, location: any, odoImageUrl: string | null) => Promise<void>;
  endShift: (endKm: string, actualTime: number, editedTime: number | null, location: any, odoImageUrl: string | null, comment?: string) => Promise<void>;
  incrementActivity: () => Promise<void>;
  logShiftEvent: (type: 'activity' | 'expense', title: string, description: string) => Promise<void>;
  addRoutePoints: (points: any[]) => Promise<void>;
  syncPendingRoutePoints: () => Promise<void>; // 🚀 NEW: Batched Uploader
}

let syncInterval: NodeJS.Timeout | null = null;
let isSyncing = false;

export const useShiftStore = create<ShiftState>()(
  persist(
    (set, get) => ({
      activeShiftId: null,
      isActive: false,
      startTime: null,
      isPersonalVehicle: false,
      startKm: '',
      transitMode: '',
      activitiesLogged: 0,
      shiftHistory: [],
      routePath: [],
      pendingPoints: [],
      totalDistance: 0,

      // 🚀 NEW: Batched Syncing Logic
      syncPendingRoutePoints: async () => {
        if (isSyncing) return;
        const { activeShiftId, pendingPoints, totalDistance } = get();
        if (!activeShiftId || pendingPoints.length === 0) return;

        isSyncing = true;
        try {
          // Clone to prevent race conditions during upload
          const pointsToUpload = [...pendingPoints];
          
          const payload = pointsToUpload.map(p => ({
            shift_id: activeShiftId,
            lat: p.lat,
            lng: p.lng,
            timestamp: p.timestamp,
            accuracy: p.accuracy || null,
            speed: p.speed || null,
            heading: p.heading || null
          }));

          // 1. Bulk insert to the new table
          const { error: insertError } = await supabase.from('shift_locations').insert(payload);
          if (insertError) throw insertError;

          // 2. Sync the latest total_distance
          const { error: updateError } = await supabase.from('shifts')
            .update({ total_distance: parseFloat(totalDistance.toFixed(2)) })
            .eq('id', activeShiftId);
          if (updateError) throw updateError;

          // 3. Clear ONLY the points that successfully uploaded
          set((state) => ({
            pendingPoints: state.pendingPoints.filter(p => !pointsToUpload.includes(p))
          }));
        } catch (e) {
          console.log("Offline or sync failed: GPS points safely buffered.", e);
        } finally {
          isSyncing = false;
        }
      },

      hydrateShifts: async () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;

        const { data: shiftsData, error: shiftsError } = await supabase
          .from('shifts')
          .select('*')
          .eq('se_id', userId)
          .order('date', { ascending: false });

        if (shiftsError || !shiftsData) return;

        // 🚀 Fetch all shift locations and group them by shift_id
        const shiftIds = shiftsData.map(s => s.id);
        const { data: allLocs } = await supabase
          .from('shift_locations')
          .select('shift_id, lat, lng, timestamp')
          .in('shift_id', shiftIds)
          .order('timestamp', { ascending: true });

        const locsByShift: Record<string, any[]> = {};
        if (allLocs) {
          allLocs.forEach(l => {
            if (!locsByShift[l.shift_id]) locsByShift[l.shift_id] = [];
            locsByShift[l.shift_id].push({ lat: l.lat, lng: l.lng, timestamp: l.timestamp });
          });
        }

        const activeShift = shiftsData.find(s => s.status === 'ACTIVE');
        
        const formattedHistory = shiftsData.map(s => ({
          ...s,
          id: s.id,
          date: s.date,
          events: s.events || [],
          routePath: locsByShift[s.id] || []
        }));

        set({
          shiftHistory: formattedHistory,
          activeShiftId: activeShift ? activeShift.id : null,
          isActive: !!activeShift,
          startTime: activeShift ? activeShift.start_time : null,
          isPersonalVehicle: activeShift ? activeShift.is_personal_vehicle : false,
          startKm: activeShift ? activeShift.start_km : '',
          transitMode: activeShift ? activeShift.transit_mode : '',
          activitiesLogged: activeShift ? activeShift.activities_logged : 0,
          routePath: activeShift ? (locsByShift[activeShift.id] || []) : [],
          pendingPoints: [], // Wipe pending queue on fresh load
          totalDistance: activeShift ? (activeShift.total_distance || 0) : 0
        });

        // 🚀 Restore Auto-Sync Timer if active
        if (syncInterval) clearInterval(syncInterval);
        if (activeShift) {
          syncInterval = setInterval(() => get().syncPendingRoutePoints(), 60000); 
        }
      },

      startShift: async (isPersonal, km, transit, vehicleType, actualTime, editedTime, location, odoImageUrl) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;

        const timeToUse = editedTime || actualTime || Date.now();
        const dateStr = new Date(timeToUse).toISOString().split('T')[0];

        const inEvent: TimelineEvent = { 
          id: Date.now().toString(), 
          time: timeToUse, actualTime, editedTime, location, vehicleType,
          type: 'punch-in', title: 'Punched In', 
          description: isPersonal ? `Personal Vehicle • Start KM: ${km}` : `Transit: ${transit}` 
        };

        const initialPoint = location ? { lat: location.lat, lng: location.lng, timestamp: timeToUse, speed: 0, heading: 0, accuracy: 5 } : null;

        const payload = {
          se_id: userId, date: dateStr, status: 'ACTIVE',
          start_time: timeToUse, is_personal_vehicle: isPersonal,
          vehicle_type: vehicleType, start_km: km, transit_mode: transit,
          start_location: location, start_odo_image: odoImageUrl,
          events: [inEvent],
          total_distance: 0 // No more route_path array here!
        };

        const { data, error } = await supabase.from('shifts').insert(payload).select('id').single();
        if (error) throw error;

        if (initialPoint) {
            await supabase.from('shift_locations').insert({
               shift_id: data.id, ...initialPoint
            });
        }

        const hasStarted = await Location.hasStartedLocationUpdatesAsync(SHIFT_LOCATION_TASK);
        if (!hasStarted) {
          await Location.startLocationUpdatesAsync(SHIFT_LOCATION_TASK, {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 50, 
            deferredUpdatesInterval: 60000, 
            showsBackgroundLocationIndicator: true,
            foregroundService: {
              notificationTitle: "Shift Active",
              notificationBody: "Field Commander is securely tracking your route.",
              notificationColor: "#16A34A",
            },
          });
        }

        const newHistory = [...get().shiftHistory];
        const todayIndex = newHistory.findIndex(h => new Date(h.date).toDateString() === new Date(timeToUse).toDateString());
        if (todayIndex >= 0) newHistory[todayIndex].events.push(inEvent);
        else newHistory.push({ id: data.id, date: dateStr, events: [inEvent] });

        set({ 
          activeShiftId: data.id, isActive: true, startTime: timeToUse, 
          isPersonalVehicle: isPersonal, startKm: km, transitMode: transit, 
          activitiesLogged: 0, shiftHistory: newHistory,
          routePath: initialPoint ? [initialPoint] : [], pendingPoints: [], totalDistance: 0 
        });

        // 🚀 Start Batch Processing Interval
        if (syncInterval) clearInterval(syncInterval);
        syncInterval = setInterval(() => get().syncPendingRoutePoints(), 60000);
      },

      endShift: async (endKm, actualTime, editedTime, location, odoImageUrl, comment) => {
        const { activeShiftId, shiftHistory, totalDistance, activitiesLogged, routePath } = get();
        if (!activeShiftId) return;

        const hasStarted = await Location.hasStartedLocationUpdatesAsync(SHIFT_LOCATION_TASK);
        if (hasStarted) await Location.stopLocationUpdatesAsync(SHIFT_LOCATION_TASK);

        const timeToUse = editedTime || actualTime || Date.now();
        
        let descriptionStr = `End KM: ${endKm || 'N/A'}`;
        if (comment) {
          descriptionStr = endKm ? `End KM: ${endKm} • Note: ${comment}` : `Note: ${comment}`;
        }

        const outEvent: TimelineEvent = { 
          id: Date.now().toString(), time: timeToUse, actualTime, editedTime, location,
          type: 'punch-out', title: 'Punched Out', description: descriptionStr 
        };

        // Guarantee final point maps
        if (location) {
          set((state) => ({ 
            pendingPoints: [...state.pendingPoints, { lat: location.lat, lng: location.lng, timestamp: timeToUse }],
            routePath: [...state.routePath, { lat: location.lat, lng: location.lng, timestamp: timeToUse }]
          }));
        }

        // 🚀 Final flush before ending shift
        await get().syncPendingRoutePoints();
        if (syncInterval) {
          clearInterval(syncInterval);
          syncInterval = null;
        }

        // 🚀 CALCULATE ALLOWANCE STATUS
        let allowanceStatus = 'Pending';
        if (get().isPersonalVehicle && endKm) {
          const startVal = parseFloat(get().startKm || '0');
          const endVal = parseFloat(endKm);
          if (!isNaN(startVal) && !isNaN(endVal)) {
            const manualDistance = Math.max(0, endVal - startVal);
            if (manualDistance < 50) {
              allowanceStatus = 'Approved';
            }
          }
        } else if (!get().isPersonalVehicle) {
          // If no personal vehicle was used, TA/DA is effectively 0, so auto-approve
          allowanceStatus = 'Approved'; 
        }

        const payload = {
          end_time: timeToUse, end_km: endKm, end_location: location,
          end_odo_image: odoImageUrl, status: 'COMPLETED', updated_at: new Date().toISOString(),
          total_distance: parseFloat(get().totalDistance.toFixed(2)),
          activities_logged: activitiesLogged,
          allowance_status: allowanceStatus // 🚀 Keep this
        };

        const currentShiftRecord = shiftHistory.find(h => h.id === activeShiftId);
        const updatedEvents = currentShiftRecord ? [...currentShiftRecord.events, outEvent] : [outEvent];

        const { error } = await supabase.from('shifts').update({ ...payload, events: updatedEvents }).eq('id', activeShiftId);
        if (error) throw error;

        const newHistory = [...shiftHistory];
        const shiftIndex = newHistory.findIndex(h => h.id === activeShiftId);
        if (shiftIndex >= 0) newHistory[shiftIndex].events = updatedEvents;

        set({ activeShiftId: null, isActive: false, startTime: null, shiftHistory: newHistory, routePath: [], pendingPoints: [], totalDistance: 0 });
      },

      logShiftEvent: async (type, title, description) => {
        const { activeShiftId, shiftHistory } = get();
        if (!activeShiftId) return;

        const event: TimelineEvent = { id: Date.now().toString(), time: Date.now(), type, title, description };

        const currentShiftRecord = shiftHistory.find(h => h.id === activeShiftId);
        if (!currentShiftRecord) return;
        
        const updatedEvents = [...currentShiftRecord.events, event];

        await supabase.from('shifts').update({ events: updatedEvents, updated_at: new Date().toISOString() }).eq('id', activeShiftId);

        const newHistory = [...shiftHistory];
        const shiftIndex = newHistory.findIndex(h => h.id === activeShiftId);
        if (shiftIndex >= 0) newHistory[shiftIndex].events = updatedEvents;
        
        set({ shiftHistory: newHistory });
      },

      incrementActivity: async () => {
        const { activeShiftId, activitiesLogged } = get();
        const newCount = activitiesLogged + 1;
        if (activeShiftId) {
          await supabase.from('shifts').update({ activities_logged: newCount }).eq('id', activeShiftId);
        }
        set({ activitiesLogged: newCount });
      },

      addRoutePoints: async (newPoints: any[]) => {
        const { activeShiftId, routePath, pendingPoints, totalDistance } = get();
        if (!activeShiftId) return;

        let addedDistance = 0;
        let lastPoint = routePath.length > 0 ? routePath[routePath.length - 1] : null;
        const validPoints = [];

        // 🚀 Advanced GPS Filtering Engine (runs entirely locally)
        for (const point of newPoints) {
          if (!point.timestamp || point.timestamp > Date.now() + 60000) continue;
          if (point.accuracy && point.accuracy > 30) continue;
          if (point.speed && point.speed > 33.33) continue;

          if (lastPoint) {
            const distInKm = calculateDistance(lastPoint.lat, lastPoint.lng, point.lat, point.lng);
            const distInMeters = distInKm * 1000;

            if (distInMeters < 10) continue;
            if (distInMeters > 50 && point.speed === 0 && lastPoint.speed === 0) continue;

            addedDistance += distInKm;
          }

          validPoints.push(point);
          lastPoint = point;
        }

        if (validPoints.length === 0) return;

        // 🚀 Append to local structures only
        const updatedPath = [...routePath, ...validPoints];
        const updatedPending = [...pendingPoints, ...validPoints];
        const updatedDistance = totalDistance + addedDistance;

        set({ 
          routePath: updatedPath, 
          pendingPoints: updatedPending, 
          totalDistance: updatedDistance 
        });
      }
    }),
    { name: 'shift-storage-v5', storage: createJSONStorage(() => AsyncStorage) }
  )
);