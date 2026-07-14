// Frontend/src/core/locationUtils.ts

import { getPendingLocations, deleteLocations } from './database';
import { supabase } from './supabase'; // ⚠️ Ensure this path matches your supabase client location

export const SHIFT_LOCATION_TASK = 'SHIFT_LOCATION_TASK';

// Haversine formula to calculate distance between two GPS coordinates in KM
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// 🚀 The Auto-Sync Drainer
let isSyncing = false;
export const syncLocationsToSupabase = async () => {
  if (isSyncing) return; // Prevent overlapping network requests
  
  try {
    isSyncing = true;
    
    // 1. Grab unsynced locations from local database
    const pending = getPendingLocations() as any[];
    if (pending.length === 0) {
      isSyncing = false;
      return; 
    }

    // 2. Format for Supabase
    const payload = pending.map(loc => ({
      shift_id: loc.shift_id,
      latitude: loc.latitude,
      longitude: loc.longitude,
      recorded_at: new Date(loc.timestamp).toISOString(), 
      accuracy: loc.accuracy,
      speed: loc.speed
    }));

    // 3. Push to your Supabase table
    const { error } = await supabase.from('shift_locations').insert(payload);

    if (error) {
      console.error("Supabase Sync Failed:", error);
      throw error; 
    }

    // 4. Delete ONLY upon successful upload
    const syncedIds = pending.map(loc => loc.id);
    deleteLocations(syncedIds);
    
    console.log(`Successfully pushed ${syncedIds.length} coordinates to cloud!`);

  } catch (e) {
    console.error("Critical failure in location sync engine:", e);
  } finally {
    isSyncing = false;
  }
};