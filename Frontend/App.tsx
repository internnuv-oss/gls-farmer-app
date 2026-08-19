// Frontend/App.tsx

import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import "react-native-gesture-handler";
import "./src/design-system/styles/global.css";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "./src/navigation/AppNavigator";
import "./src/core/i18n";
import { AutoLogoutProvider } from "./src/core/AutoLogoutProvider";
import { syncLocationsToSupabase } from "./src/core/locationUtils";
import { startBackgroundTracking } from "./src/core/locationTracker"; 
import { useShiftStore } from "./src/store/shiftStore"; 

import "./src/core/locationTracker"; 
import "./src/core/database"; 
import { OfflineSyncManager } from "./src/core/OfflineSyncManager"; 

// 🚀 1. ADD THIS IMPORT
import { loadDynamicTranslations } from "./src/core/i18nSync";

export default function App() {

  useEffect(() => {
    // 🚀 2. CALL THIS FUNCTION WHEN THE APP STARTS
    loadDynamicTranslations();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        syncLocationsToSupabase();
        
        const state = useShiftStore.getState();
        if (state.isActive && state.activeShiftId) {
           startBackgroundTracking(state.activeShiftId);
        }
      }
    });
    return () => subscription.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AutoLogoutProvider>
          <AppNavigator />
          
          <OfflineSyncManager />
          
        </AutoLogoutProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}