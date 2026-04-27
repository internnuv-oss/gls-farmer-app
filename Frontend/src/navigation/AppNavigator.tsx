import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';

import { DashboardScreen } from '../modules/dashboard/screens/DashboardScreen';
import { ProfileScreen } from '../modules/dashboard/screens/ProfileScreen';
import { DealerOnboardingScreen } from '../modules/onboarding/dealer/screens/DealerOnboardingScreen';
// ✅ Import the new SE Onboarding Screen (we will build this next)
import { SEOnboardingScreen } from '../modules/onboarding/se/screens/SEOnboardingScreen';
import { LoginScreen } from '../modules/auth/screens/LoginScreen';
import { RegisterScreen } from '../modules/auth/screens/RegisterScreen';
import { DraftsScreen } from '../modules/dashboard/screens/DraftsScreen';
import { EntityProfileScreen } from '../modules/dashboard/screens/EntityProfileScreen';
import { ComingSoonScreen } from '../modules/core/screens/ComingSoonScreen';
import { useAuthStore } from '../store/authStore';
import { colors } from '../design-system/tokens';
import { FeedbackScreenTemplate } from '../design-system/templates';
import { supabase } from '../core/supabase';
import { AlertModal } from '../design-system/components/AlertModal';
import { useAlertStore } from '../store/alertStore';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const DashboardStack = createNativeStackNavigator();

const DashboardStackNavigator = () => (
  <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
    <DashboardStack.Screen name="DashboardMain" component={DashboardScreen} />
    <DashboardStack.Screen name="DraftsScreen" component={DraftsScreen} />
    <DashboardStack.Screen name="EntityProfile" component={EntityProfileScreen} />
  </DashboardStack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarStyle: { borderTopWidth: 1, borderTopColor: colors.border, elevation: 10, shadowOpacity: 0.1 },
      tabBarLabelStyle: { fontWeight: '700', fontSize: 12, marginBottom: 4 }
    }}
  >
    <Tab.Screen 
      name="Dashboard" 
      component={DashboardStackNavigator} 
      options={{ tabBarIcon: ({color}) => <MaterialIcons name="dashboard" size={24} color={color} /> }} 
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileScreen} 
      options={{ tabBarIcon: ({color}) => <MaterialIcons name="person" size={24} color={color} /> }} 
    />
  </Tab.Navigator>
);

export const AppNavigator = () => {
  const user = useAuthStore((state) => state.user);
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const logout = useAuthStore((state) => state.logout);

  const { visible, title, message, buttons, hideAlert } = useAlertStore();

  // Listen to network state changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        logout(); 
      }
    });

    return () => subscription.unsubscribe();
  }, [logout]);

  // Show Fallback Screen if offline
  if (isConnected === false) {
    return (
      <FeedbackScreenTemplate
        iconName="wifi-off"
        tone="danger"
        animationType="pulse"
        title="No Internet Connection"
        description="It looks like you're offline. Please check your mobile data or Wi-Fi connection. The app will automatically resume when the connection is restored."
        primaryActionLabel="Retry Connection"
        onPrimaryAction={() => {
          NetInfo.fetch().then(state => setIsConnected(state.isConnected));
        }}
        primaryActionIcon="refresh"
      />
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="DealerOnboarding" component={DealerOnboardingScreen} />
            {/* ✅ Registered the SEOnboardingScreen here */}
            <Stack.Screen name="SEOnboardingScreen" component={SEOnboardingScreen} />
            <Stack.Screen name="ComingSoonScreen">
              {({ navigation }) => <ComingSoonScreen onBack={() => navigation.goBack()} />}
            </Stack.Screen>
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
      <AlertModal 
        visible={visible}
        title={title}
        message={message}
        buttons={buttons.map(btn => ({
          label: btn.text,
          variant: btn.style === 'cancel' ? 'secondary' : btn.style === 'destructive' ? 'danger' : 'primary',
          onPress: () => {
            if (btn.onPress) btn.onPress();
            hideAlert();
          }
        }))}
        onClose={hideAlert}
      />
    </NavigationContainer>
  );
};