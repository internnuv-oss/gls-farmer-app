// Frontend/src/core/locationUtils.ts

import { getPendingLocations, deleteLocations, getLastSyncedLocation, setLastSyncedLocation } from './database';
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
    
    const pending = getPendingLocations() as any[];
    if (pending.length === 0) {
      isSyncing = false;
      return; 
    }

    pending.sort((a, b) => a.timestamp - b.timestamp);

    let chunkDistance = 0;
    
    // Grab the last valid point from the PREVIOUS batch
    let lastTrustedPoint = getLastSyncedLocation(); 
    let latestValidPointForNextBatch = lastTrustedPoint;

    for (const pt of pending) {
      // 1. Hardware Filter: Accept up to 150m so cheap/weak phones aren't penalized
      if (pt.accuracy > 150) continue; 

      if (!lastTrustedPoint) {
        lastTrustedPoint = { lat: pt.latitude, lng: pt.longitude, timestamp: pt.timestamp };
        latestValidPointForNextBatch = lastTrustedPoint;
        continue;
      }

      const dist = calculateDistance(
        lastTrustedPoint.lat, lastTrustedPoint.lng, 
        pt.latitude, pt.longitude
      );

      // Calculate physical speed required to make this jump
      const timeDiffHours = (pt.timestamp - lastTrustedPoint.timestamp) / (1000 * 3600);
      const speedKmh = timeDiffHours > 0 ? (dist / timeDiffHours) : 0;

      // 2. The Spiderweb Filter: Ignore impossible jumps (fake cell-tower spikes)
      if (dist > 1.0 && speedKmh > 120) {
        continue; 
    }

      // 3. Anti-Drift Filter: Count distance only if they moved > 20 meters
      if (dist > 0.020) {
        chunkDistance += dist;
        lastTrustedPoint = { lat: pt.latitude, lng: pt.longitude, timestamp: pt.timestamp };
        latestValidPointForNextBatch = lastTrustedPoint;
      } else {
        // Stationary drift: don't add distance, but update timestamp for the next speed calculation
        lastTrustedPoint.timestamp = pt.timestamp;
      }
    }

    const payload = pending.map(loc => ({
      shift_id: loc.shift_id,
      lat: loc.latitude,      
      lng: loc.longitude,     
      timestamp: loc.timestamp, 
      accuracy: loc.accuracy,
      speed: loc.speed
    }));

    // Upload ALL points to Supabase for the map rendering
    const { error: insertError } = await supabase.from('shift_locations').insert(payload);
    if (insertError) throw insertError; 

    // Update the distance using the Smart Plausibility Math
    if (chunkDistance > 0 && payload.length > 0) {
      const { error: rpcError } = await supabase.rpc('add_shift_distance', {
        p_shift_id: payload[0].shift_id,
        p_distance_km: chunkDistance
      });
      if (rpcError) console.error("RPC Distance Update Failed:", rpcError);
    }

    // Pass timestamp as well to keep speed math accurate across batches
    if (latestValidPointForNextBatch) {
      setLastSyncedLocation(latestValidPointForNextBatch.lat, latestValidPointForNextBatch.lng, latestValidPointForNextBatch.timestamp);
    }

    const syncedIds = pending.map(loc => loc.id);
    deleteLocations(syncedIds);
    
    console.log(`Pushed ${syncedIds.length} raw points, but only added ${chunkDistance.toFixed(2)} km of REAL travel!`);

  } catch (e) {
    console.error("Critical failure in location sync engine:", e);
  } finally {
    isSyncing = false;
  }
};