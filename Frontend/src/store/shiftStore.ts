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
  totalDistance: number;
  hydrateShifts: () => Promise<void>;
  startShift: (isPersonal: boolean, km: string, transit: string, vehicleType: 'two-wheeler' | 'four-wheeler' | null, actualTime: number, editedTime: number | null, location: any, odoImageUrl: string | null) => Promise<void>;
  endShift: (endKm: string, actualTime: number, editedTime: number | null, location: any, odoImageUrl: string | null, comment?: string) => Promise<void>;
  incrementActivity: () => Promise<void>;
  logShiftEvent: (type: 'activity' | 'expense', title: string, description: string) => Promise<void>;
  addRoutePoints: (points: any[]) => Promise<void>;
}

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
      totalDistance: 0,

      hydrateShifts: async () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;

        const { data, error } = await supabase
          .from('shifts')
          .select('*')
          .eq('se_id', userId)
          .order('date', { ascending: false });

        if (error || !data) return;

        const activeShift = data.find(s => s.status === 'ACTIVE');
        const formattedHistory = data.map(s => ({
          id: s.id,
          date: s.date,
          events: s.events || []
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
          routePath: activeShift ? (activeShift.route_path || []) : [],
          totalDistance: activeShift ? (activeShift.total_distance || 0) : 0
        });
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

        const payload = {
          se_id: userId, date: dateStr, status: 'ACTIVE',
          start_time: timeToUse, is_personal_vehicle: isPersonal,
          vehicle_type: vehicleType, start_km: km, transit_mode: transit,
          start_location: location, start_odo_image: odoImageUrl,
          events: [inEvent],
          route_path: location ? [{ lat: location.lat, lng: location.lng, timestamp: timeToUse }] : [],
          total_distance: 0
        };

        const { data, error } = await supabase.from('shifts').insert(payload).select('id').single();
        if (error) throw error;

        // 🚀 START BACKGROUND TRACKING
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

        // Update local state
        const newHistory = [...get().shiftHistory];
        const todayIndex = newHistory.findIndex(h => new Date(h.date).toDateString() === new Date(timeToUse).toDateString());
        if (todayIndex >= 0) newHistory[todayIndex].events.push(inEvent);
        else newHistory.push({ id: data.id, date: dateStr, events: [inEvent] });

        set({ 
          activeShiftId: data.id, isActive: true, startTime: timeToUse, 
          isPersonalVehicle: isPersonal, startKm: km, transitMode: transit, 
          activitiesLogged: 0, shiftHistory: newHistory,
          routePath: payload.route_path, totalDistance: 0 
        });
      },

      endShift: async (endKm, actualTime, editedTime, location, odoImageUrl, comment) => {
        // 🚀 Extract routePath so we can append to it
        const { activeShiftId, shiftHistory, totalDistance, routePath } = get();
        if (!activeShiftId) return;

        // STOP BACKGROUND TRACKING
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(SHIFT_LOCATION_TASK);
        if (hasStarted) {
          await Location.stopLocationUpdatesAsync(SHIFT_LOCATION_TASK);
        }

        const timeToUse = editedTime || actualTime || Date.now();
        
        let descriptionStr = `End KM: ${endKm || 'N/A'}`;
        if (comment) {
          descriptionStr = endKm ? `End KM: ${endKm} • Note: ${comment}` : `Note: ${comment}`;
        }

        const outEvent: TimelineEvent = { 
          id: Date.now().toString(), time: timeToUse, actualTime, editedTime, location,
          type: 'punch-out', title: 'Punched Out', description: descriptionStr 
        };

        // 🚀 FORCE CAPTURE: Ensure the final punch-out location is locked into the visual map array
        const finalRoutePath = [...routePath];
        if (location) {
          finalRoutePath.push({ lat: location.lat, lng: location.lng, timestamp: timeToUse });
        }

        const payload = {
          end_time: timeToUse, end_km: endKm, end_location: location,
          end_odo_image: odoImageUrl, status: 'COMPLETED', updated_at: new Date().toISOString(),
          total_distance: parseFloat(totalDistance.toFixed(2)),
          route_path: finalRoutePath // 🚀 Save the updated array to Supabase
        };

        // Find existing events from local state to append to
        const currentShiftRecord = shiftHistory.find(h => h.id === activeShiftId);
        const updatedEvents = currentShiftRecord ? [...currentShiftRecord.events, outEvent] : [outEvent];

        const { error } = await supabase.from('shifts').update({ ...payload, events: updatedEvents }).eq('id', activeShiftId);
        if (error) throw error;

        // Update local state
        const newHistory = [...shiftHistory];
        const shiftIndex = newHistory.findIndex(h => h.id === activeShiftId);
        if (shiftIndex >= 0) newHistory[shiftIndex].events = updatedEvents;

        set({ activeShiftId: null, isActive: false, startTime: null, shiftHistory: newHistory, routePath: [], totalDistance: 0 });
      },

      logShiftEvent: async (type, title, description) => {
        const { activeShiftId, shiftHistory } = get();
        if (!activeShiftId) return;

        const event: TimelineEvent = {
          id: Date.now().toString(), time: Date.now(), type, title, description
        };

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
        const { activeShiftId, routePath, totalDistance } = get();
        if (!activeShiftId) return;

        let addedDistance = 0;
        const lastPoint = routePath.length > 0 ? routePath[routePath.length - 1] : null;

        let prevPoint = lastPoint;
        newPoints.forEach(point => {
          if (prevPoint) {
            addedDistance += calculateDistance(prevPoint.lat, prevPoint.lng, point.lat, point.lng);
          }
          prevPoint = point;
        });

        // 🚀 1. SAVE LOCALLY FIRST (This is what makes it offline-proof)
        const updatedPath = [...routePath, ...newPoints];
        const updatedDistance = totalDistance + addedDistance;

        set({ routePath: updatedPath, totalDistance: updatedDistance });

        // 🚀 2. ATTEMPT CLOUD SYNC (Self-healing approach)
        try {
          const { error } = await supabase.from('shifts')
            .update({ 
              route_path: updatedPath, 
              total_distance: parseFloat(updatedDistance.toFixed(2)) 
            })
            .eq('id', activeShiftId);

          if (error) throw error;
        } catch (error) {
          // If network is off, it simply fails silently.
          // Because the local 'updatedPath' array is still growing, the missing points
          // will automatically hitch a ride on the next successful upload when internet returns!
          console.log("Offline: Route points safely buffered to local storage.");
        }
      }
    }),
    { name: 'shift-storage-v3', storage: createJSONStorage(() => AsyncStorage) }
  )
);