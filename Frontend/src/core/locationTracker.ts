// Frontend/src/core/locationTracker.ts

import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHIFT_LOCATION_TASK, calculateDistance } from './locationUtils';
import { insertLocation } from './database';

TaskManager.defineTask(SHIFT_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("Background Location Error:", error);
    return;
  }
  
  if (data) {
    const { locations } = data as any;
    if (locations && locations.length > 0) {
      
      const activeShiftId = await AsyncStorage.getItem('active_shift_id');
      if (!activeShiftId) return;

      // 🚀 1. Fetch the last valid location from deep storage
      const lastLocStr = await AsyncStorage.getItem('last_valid_location');
      let lastLoc = lastLocStr ? JSON.parse(lastLocStr) : null;

      for (const loc of locations) {
        const accuracy = loc.coords.accuracy ?? 999;
        
        // 🚀 NOISE FILTER 1: Ignore terrible GPS signals (e.g., deep indoors)
        if (accuracy > 200) continue; 

        // 🚀 NOISE FILTER 2: Ignore stationary GPS bounce
        if (lastLoc) {
          const distInKm = calculateDistance(
            lastLoc.lat, lastLoc.lng, 
            loc.coords.latitude, loc.coords.longitude
          );
          const distInMeters = distInKm * 1000;

          // If they moved less than 15 meters, it's just drift. Ignore it!
          if (distInMeters < 15) continue; 
        }

        try {
          // If it passes the filters, lock it in the vault!
          insertLocation(
            activeShiftId,
            loc.coords.latitude,
            loc.coords.longitude,
            loc.timestamp,
            accuracy,
            loc.coords.speed ?? 0
          );
          
          // Update the last valid location for the next loop
          lastLoc = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        } catch (dbError) {
          console.error("Failed to insert location into SQLite:", dbError);
        }
      }

      // 🚀 2. Save the updated last location back to deep storage
      if (lastLoc) {
        await AsyncStorage.setItem('last_valid_location', JSON.stringify(lastLoc));
      }
    }
  }
});

export const startBackgroundTracking = async (shiftId: string) => {
  await AsyncStorage.setItem('active_shift_id', shiftId);
  // Clear any old location data from previous shifts
  await AsyncStorage.removeItem('last_valid_location'); 
  
  await Location.startLocationUpdatesAsync(SHIFT_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 60000, 
    distanceInterval: 50, 
    deferredUpdatesInterval: 300000, 
    deferredUpdatesDistance: 500,
    foregroundService: {
      notificationTitle: "Shift Active",
      notificationBody: "Tracking route in the background.",
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