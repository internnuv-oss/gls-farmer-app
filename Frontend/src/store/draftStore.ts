import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as crypto from 'expo-crypto';
import { useAuthStore } from './authStore'; // 🚀 IMPORT AUTH STORE

// 1. Added userId to the Draft interface
export interface Draft {
  id: string;
  userId?: string; // 🚀 Link draft to a specific user
  type: 'DEALER' | 'FARMER' | 'DISTRIBUTOR'; 
  data: any;
  updatedAt: number;
}

export interface DraftState {
  drafts: Draft[];
  addDraft: (data: any, type: 'DEALER' | 'FARMER' | 'DISTRIBUTOR', customId?: string) => string;
  removeDraft: (id: string) => void;
  updateDraft: (id: string, data: any, overrideUserId?: string) => void;
  
  seDraft: { step: number; data: any } | null;
  setSEDraft: (step: number, data: any) => void;
  clearSEDraft: () => void;
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      drafts: [],
      
      addDraft: (data, type, customId) => {
        const id = customId || crypto.randomUUID();
        const userId = useAuthStore.getState().user?.id; // 🚀 Tag with current user

        set((state) => ({ 
          drafts: [
            { id, type, data, updatedAt: Date.now(), userId }, 
            ...state.drafts
          ] 
        }));
        return id;
      },

      removeDraft: (id) => set((state) => ({ 
        drafts: state.drafts.filter((d) => d.id !== id) 
      })),

      updateDraft: (id, data, overrideUserId) => set((state) => ({
        drafts: state.drafts.map((d) => (d.id === id ? { 
          ...d, 
          data, 
          updatedAt: Date.now(),
          // 🚀 Preserve the original owner, or update it if needed
          userId: overrideUserId || d.userId || useAuthStore.getState().user?.id 
        } : d))
      })),
      
      seDraft: null,
      setSEDraft: (step, data) => set({ seDraft: { step, data } }),
      clearSEDraft: () => set({ seDraft: null }),
    }),
    {
      name: 'drafts-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);