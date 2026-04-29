import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type AuthState = {
  // 🚀 Added firstName, lastName, email, dob
  user: { id: string; name?: string; firstName?: string; lastName?: string; email?: string; dob?: string; mobile?: string; isProfileComplete?: boolean;} | null;
  loginTimestamp: number | null; 
  isProfileComplete?: boolean;
  setUser: (user: AuthState["user"]) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loginTimestamp: null,
      setUser: (user) => set({ user, loginTimestamp: user ? Date.now() : null }),
      logout: () => set({ user: null, loginTimestamp: null }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);