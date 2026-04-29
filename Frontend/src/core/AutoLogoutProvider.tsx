import React, { useEffect, useRef, ReactNode } from 'react';
import { AppState, View } from 'react-native';
import { useAuthStore } from '../store/authStore';

// 🚀 TEST MODE: 1 week 

const TEST_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000;

export const AutoLogoutProvider = ({ children }: { children: ReactNode }) => {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const loginTimestamp = useAuthStore((s) => s.loginTimestamp);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // FALLBACK: If you're logged in but have no timestamp (first time setup), 
    // we set it now so the test works without you needing to logout first.
    if (user && !loginTimestamp) {
        useAuthStore.setState({ loginTimestamp: Date.now() });
    }
  }, [user, loginTimestamp]);

  const enforceSessionLimit = () => {
    if (!user || !loginTimestamp) return;

    const timeElapsed = Date.now() - loginTimestamp;
    const timeRemaining = TEST_TIMEOUT_MS - timeElapsed;

    if (timeRemaining <= 0) {
      console.log("Auto-Logout: Session expired.");
      logout();
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        logout();
      }, timeRemaining);
    }
  };

  useEffect(() => {
    enforceSessionLimit();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        enforceSessionLimit();
      }
    });

    return () => {
      subscription.remove();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user, loginTimestamp, logout]);

  return <View style={{ flex: 1 }}>{children}</View>;
};