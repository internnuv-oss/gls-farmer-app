// src/core/locationTracker.ts
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { SHIFT_LOCATION_TASK, syncLocationsToSupabase } from './locationUtils';
import { insertLocation, getActiveShiftId, setActiveShiftId } from './database';

TaskManager.defineTask(SHIFT_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("Background Location Error:", error);
    return;
  }
  
  if (data) {
    const { locations } = data as any;
    if (locations && locations.length > 0) {
      
      // 🚀 FIX: Uses synchronous SQLite instead of AsyncStorage
      const activeShiftId = getActiveShiftId();
      if (!activeShiftId) return;

      let addedNewPoint = false;

      for (const loc of locations) {
        const accuracy = loc.coords.accuracy ?? 999;
        
        // 🚀 FIX: Changed 150m to 500m to allow pocket/screen-off network tracking
        if (accuracy > 500) continue; 

        try {
          insertLocation(
            activeShiftId,
            loc.coords.latitude,
            loc.coords.longitude,
            loc.timestamp,
            accuracy,
            loc.coords.speed ?? 0
          );
          addedNewPoint = true;
        } catch (dbError) {
          console.error("SQLite Insert Failed:", dbError);
        }
      }

      if (addedNewPoint) {
        await syncLocationsToSupabase();
      }
    }
  }
});

export const startBackgroundTracking = async (shiftId: string) => {
  // 🚀 FIX: Save to SQLite
  setActiveShiftId(shiftId);
  
  await Location.startLocationUpdatesAsync(SHIFT_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced, 
    timeInterval: 20000,  // Check every 20 seconds
    distanceInterval: 15, // Or 15 meters
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: "Field Commander Active",
      notificationBody: "Tracking your shift route.",
      notificationColor: "#16A34A",
    },
  });
};

export const stopBackgroundTracking = async () => {
  setActiveShiftId(null);
  
  const isRegistered = await TaskManager.isTaskRegisteredAsync(SHIFT_LOCATION_TASK);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(SHIFT_LOCATION_TASK);
  }
};