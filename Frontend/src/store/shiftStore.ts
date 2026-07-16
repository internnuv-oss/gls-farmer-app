// Frontend/src/store/shiftStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../core/supabase';
import { useAuthStore } from './authStore';
import { startBackgroundTracking, stopBackgroundTracking } from '../core/locationTracker';
import { syncLocationsToSupabase } from '../core/locationUtils';

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
  routePath?: any[];
  total_distance?: number;
  assigned_route_id?: string | null;
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
  lastLocation: { lat: number, lng: number } | null;
  totalDistance: number;

  hydrateShifts: () => Promise<void>;
  startShift: (isPersonal: boolean, km: string, transit: string, vehicleType: 'two-wheeler' | 'four-wheeler' | null, actualTime: number, editedTime: number | null, location: any, odoImageUrl: string | null, routeId: string | null) => Promise<void>;
  endShift: (endKm: string, actualTime: number, editedTime: number | null, location: any, odoImageUrl: string | null, comment?: string) => Promise<void>;
  incrementActivity: () => Promise<void>;
  logActivityForDate: (dateStr: string, title: string, description: string) => Promise<void>;
  logShiftEvent: (type: 'activity' | 'expense', title: string, description: string) => Promise<void>;
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
      lastLocation: null,
      totalDistance: 0,

      hydrateShifts: async () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;
      
        const { data: shiftsData, error: shiftsError } = await supabase
          .from('shifts')
          .select('*')
          .eq('se_id', userId)
          .order('date', { ascending: false });
      
        if (shiftsError || !shiftsData) return;
      
        const activeShift = shiftsData.find(s => s.status === 'ACTIVE');
      
        const formattedHistory = shiftsData.map(s => ({
          ...s,
          id: s.id,
          date: s.date,
          events: s.events || [],
          status: s.status,
          start_km: s.start_km,
          end_km: s.end_km,
          total_distance: s.total_distance || 0,
          activities_logged: s.activities_logged || 0,
          assigned_route_id: s.assigned_route_id || null,
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
          lastLocation: activeShift?.start_location || null, 
          totalDistance: activeShift ? (activeShift.total_distance || 0) : 0
        });
      },

      startShift: async (isPersonal, km, transit, vehicleType, actualTime, editedTime, location, odoImageUrl, routeId) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;

        const timeToUse = editedTime || actualTime || Date.now();
        const dateStr = new Date(timeToUse).toISOString().split('T')[0];

        const existingShift = get().shiftHistory.find(s => s.date === dateStr);
        if (existingShift) {
          throw new Error("A shift has already been completed for today. You cannot punch in twice.");
        }

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
          total_distance: 0,
          assigned_route_id: routeId || null
        };

        const { data, error } = await supabase.from('shifts').insert(payload).select('id').single();
        if (error) throw error;

        if (initialPoint) {
          await supabase.from('shift_locations').insert({
            shift_id: data.id, ...initialPoint
          });
        }

        // 🚀 NEW: Start the battery-optimized SQLite background tracker
        await startBackgroundTracking(data.id);

        const newHistory = [...get().shiftHistory];
        const todayIndex = newHistory.findIndex(h => new Date(h.date).toDateString() === new Date(timeToUse).toDateString());
        if (todayIndex >= 0) newHistory[todayIndex].events.push(inEvent);
        else newHistory.push({ id: data.id, date: dateStr, events: [inEvent] });

        set({
          activeShiftId: data.id, isActive: true, startTime: timeToUse,
          isPersonalVehicle: isPersonal, startKm: km, transitMode: transit,
          activitiesLogged: 0, shiftHistory: newHistory,
          lastLocation: initialPoint ? { lat: initialPoint.lat, lng: initialPoint.lng } : null, 
          totalDistance: 0
        });
      },

      endShift: async (endKm, actualTime, editedTime, location, odoImageUrl, comment) => {
        const { activeShiftId, shiftHistory, totalDistance, activitiesLogged } = get();
        if (!activeShiftId) return;

        // 🚀 NEW: Stop the SQLite background tracker cleanly
        await stopBackgroundTracking();

        await syncLocationsToSupabase();

        const timeToUse = editedTime || actualTime || Date.now();

        let descriptionStr = `End KM: ${endKm || 'N/A'}`;
        if (comment) {
          descriptionStr = endKm ? `End KM: ${endKm} • Note: ${comment}` : `Note: ${comment}`;
        }

        const outEvent: TimelineEvent = {
          id: Date.now().toString(), time: timeToUse, actualTime, editedTime, location,
          type: 'punch-out', title: 'Punched Out', description: descriptionStr
        };

        if (location) {
          set({
            lastLocation: { lat: location.lat, lng: location.lng }
          });
        }

        let allowanceStatus = 'Pending';
        if (get().isPersonalVehicle && endKm) {
          const startVal = parseFloat(get().startKm || '0');
          const endVal = parseFloat(endKm);
          if (!isNaN(startVal) && !isNaN(endVal)) {
            const manualDistance = Math.max(0, endVal - startVal);
            if (manualDistance < 45) {
              allowanceStatus = 'Approved';
            }
          }
        } else if (!get().isPersonalVehicle) {
          allowanceStatus = 'Approved';
        }

        const payload = {
          end_time: timeToUse, end_km: endKm, end_location: location,
          end_odo_image: odoImageUrl, status: 'COMPLETED', updated_at: new Date().toISOString(),
          activities_logged: activitiesLogged,
          allowance_status: allowanceStatus
        };

        const currentShiftRecord = shiftHistory.find(h => h.id === activeShiftId);
        const updatedEvents = currentShiftRecord ? [...currentShiftRecord.events, outEvent] : [outEvent];

        const { error } = await supabase.from('shifts').update({ ...payload, events: updatedEvents }).eq('id', activeShiftId);
        if (error) throw error;

        const newHistory = [...shiftHistory];
        const shiftIndex = newHistory.findIndex(h => h.id === activeShiftId);
        if (shiftIndex >= 0) {
          newHistory[shiftIndex] = {
            ...newHistory[shiftIndex],
            events: updatedEvents,
            end_km: endKm,
            total_distance: currentShiftRecord?.total_distance || 0,
            activities_logged: activitiesLogged
          } as any;
        }

        set({ activeShiftId: null, isActive: false, startTime: null, shiftHistory: newHistory, lastLocation: null, totalDistance: 0 });
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

      logActivityForDate: async (dateStr: string, title: string, description: string) => {
        const parts = dateStr.split('-');
        if (parts.length !== 3) return;
        const targetDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;

        const { data: shiftData, error: shiftError } = await supabase
          .from('shifts')
          .select('id, events, activities_logged')
          .eq('se_id', userId)
          .eq('date', targetDate)
          .single();

        if (shiftError || !shiftData) return;

        const newEvent: TimelineEvent = {
          id: Date.now().toString(),
          time: Date.now(),
          type: 'activity',
          title,
          description
        };

        const updatedEvents = [...(shiftData.events || []), newEvent];
        const newCount = (shiftData.activities_logged || 0) + 1;

        await supabase.from('shifts').update({ 
          events: updatedEvents, 
          activities_logged: newCount 
        }).eq('id', shiftData.id);

        if (shiftData.id === get().activeShiftId) {
          set({ activitiesLogged: newCount });
        }

        const newHistory = [...get().shiftHistory];
        const shiftIndex = newHistory.findIndex(h => h.id === shiftData.id);
        if (shiftIndex >= 0) {
          newHistory[shiftIndex].events = updatedEvents;
          (newHistory[shiftIndex] as any).activities_logged = newCount;
          set({ shiftHistory: newHistory });
        }
      }
    }),
    { name: 'shift-storage-v6', storage: createJSONStorage(() => AsyncStorage) }
  )
);