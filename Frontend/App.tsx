// Frontend/App.tsx

import React from 'react';
import "react-native-gesture-handler";
import "./src/design-system/styles/global.css";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "./src/navigation/AppNavigator";
import "./src/core/i18n";
import { AutoLogoutProvider } from "./src/core/AutoLogoutProvider";

// 🚀 IMPORTANT: Registers the background task in the global scope
import "./src/core/locationTracker"; 
// 🚀 IMPORTANT: Imports database to trigger the table creation instantly
import "./src/core/database"; 

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AutoLogoutProvider>
          <AppNavigator />
        </AutoLogoutProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}