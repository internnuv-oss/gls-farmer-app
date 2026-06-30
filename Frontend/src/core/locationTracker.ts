import * as TaskManager from 'expo-task-manager';
import { useShiftStore } from '../store/shiftStore';
import { SHIFT_LOCATION_TASK } from './locationUtils';

TaskManager.defineTask(SHIFT_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("Background Location Error:", error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    if (locations && locations.length > 0) {
      const newPoints = locations.map((loc: any) => ({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        timestamp: loc.timestamp,
        speed: loc.coords.speed ?? 0,
        heading: loc.coords.heading ?? 0,
        accuracy: loc.coords.accuracy ?? 999 // 🚀 Ensure accuracy is captured
      }));
      
      await useShiftStore.getState().addRoutePoints(newPoints);
    }
  }
});