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
  if (isSyncing) return; 
  
  try {
    isSyncing = true;
    
    // 1. Grab unsynced locations from local database
    const pending = getPendingLocations() as any[];
    if (pending.length === 0) {
      isSyncing = false;
      return; 
    }

    // Sort chronologically to ensure accurate math
    pending.sort((a, b) => a.timestamp - b.timestamp);

    // 2. 🚀 Calculate the total distance of this offline chunk
    let chunkDistance = 0;
    for (let i = 1; i < pending.length; i++) {
      chunkDistance += calculateDistance(
        pending[i-1].latitude, pending[i-1].longitude,
        pending[i].latitude, pending[i].longitude
      );
    }

    // 3. Format for Supabase
    const payload = pending.map(loc => ({
      shift_id: loc.shift_id,
      lat: loc.latitude,      
      lng: loc.longitude,     
      timestamp: loc.timestamp, 
      accuracy: loc.accuracy,
      speed: loc.speed
    }));

    // Inside syncLocationsToSupabase, before the insert:
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (!session || sessionError) {
      // Try to refresh the token manually
      const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
      if (!refreshedSession) {
        console.error("Auth expired in background, aborting sync.");
        isSyncing = false;
        return;
      }
    }

    // 4. Bulk insert coordinates
    const { error: insertError } = await supabase.from('shift_locations').insert(payload);
    if (insertError) throw insertError; 

    // 5. 🚀 Update the total distance securely via RPC
    if (chunkDistance > 0 && payload.length > 0) {
      const { error: rpcError } = await supabase.rpc('add_shift_distance', {
        p_shift_id: payload[0].shift_id,
        p_distance_km: chunkDistance
      });
      if (rpcError) console.error("RPC Distance Update Failed:", rpcError);
    }

    // 6. Delete ONLY upon successful upload
    const syncedIds = pending.map(loc => loc.id);
    deleteLocations(syncedIds);
    
    console.log(`Successfully pushed ${syncedIds.length} coordinates and added ${chunkDistance.toFixed(2)} km!`);

  } catch (e) {
    console.error("Critical failure in location sync engine:", e);
  } finally {
    isSyncing = false;
  }
};