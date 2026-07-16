import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHIFT_LOCATION_TASK, calculateDistance, syncLocationsToSupabase } from './locationUtils';
import { insertLocation } from './database';

TaskManager.defineTask(SHIFT_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("Background Location Error:", error);
    return;
  }
  
  if (data) {
    const { locations } = data as any;
    if (locations && locations.length > 0) {
      
      // Keep trying to get the shift ID (AsyncStorage can be slow to wake up in background)
      let activeShiftId = await AsyncStorage.getItem('active_shift_id');
      if (!activeShiftId) return;

      const lastLocStr = await AsyncStorage.getItem('last_valid_location');
      let lastLoc = lastLocStr ? JSON.parse(lastLocStr) : null;
      let addedNewPoint = false;

      for (const loc of locations) {
        const accuracy = loc.coords.accuracy ?? 999;
        
        // NOISE FILTER 1: Ignore terrible GPS signals
        if (accuracy > 150) continue; 

        // NOISE FILTER 2: Ignore stationary GPS bounce
        if (lastLoc) {
          const distInKm = calculateDistance(
            lastLoc.lat, lastLoc.lng, 
            loc.coords.latitude, loc.coords.longitude
          );
          const distInMeters = distInKm * 1000;

          // If moved less than 15 meters, ignore
          if (distInMeters < 15) continue; 
        }

        try {
          insertLocation(
            activeShiftId,
            loc.coords.latitude,
            loc.coords.longitude,
            loc.timestamp,
            accuracy,
            loc.coords.speed ?? 0
          );
          
          lastLoc = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          addedNewPoint = true;
        } catch (dbError) {
          console.error("Failed to insert location into SQLite:", dbError);
        }
      }

      if (lastLoc) {
        await AsyncStorage.setItem('last_valid_location', JSON.stringify(lastLoc));
      }

      // 🚀 CRITICAL FIX: Trigger sync immediately from the background thread
      // If we added a valid point, push it to Supabase while the OS is keeping us awake!
      if (addedNewPoint) {
        await syncLocationsToSupabase();
      }
    }
  }
});

export const startBackgroundTracking = async (shiftId: string) => {
  await AsyncStorage.setItem('active_shift_id', shiftId);
  await AsyncStorage.removeItem('last_valid_location'); 
  
  await Location.startLocationUpdatesAsync(SHIFT_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced, // High drains battery and gets killed faster by OS
    timeInterval: 30000,  // Every 30 seconds
    distanceInterval: 25, // Or every 25 meters
    showsBackgroundLocationIndicator: true, // Forces iOS to keep it alive
    foregroundService: {
      notificationTitle: "Field Commander Active",
      notificationBody: "Tracking your shift route.",
      notificationColor: "#16A34A",
    },
  });
};

export const stopBackgroundTracking = async () => {
  await AsyncStorage.removeItem('active_shift_id');
  await AsyncStorage.removeItem('last_valid_location');
  
  const isRegistered = await TaskManager.isTaskRegisteredAsync(SHIFT_LOCATION_TASK);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(SHIFT_LOCATION_TASK);
  }
};