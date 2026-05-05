// store/draftStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🚀 1. Define a clear interface for what a Draft looks like
export interface Draft {
  id: string;
  type: 'DEALER' | 'FARMER' | 'DISTRIBUTOR'; 
  data: any;
  updatedAt: number;
}

export interface DraftState {
  drafts: Draft[];
  // 🚀 2. Updated addDraft to accept the type
  addDraft: (data: any, type: 'DEALER' | 'FARMER' | 'DISTRIBUTOR', customId?: string) => string;
  removeDraft: (id: string) => void;
  updateDraft: (id: string, data: any) => void;
  
  // --- NEW: SE Draft State ---
  seDraft: { step: number; data: any } | null;
  setSEDraft: (step: number, data: any) => void;
  clearSEDraft: () => void;
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      drafts: [],
      
      addDraft: (data, type, customId) => {
        const id = customId || Date.now().toString();
        set((state) => ({ 
          drafts: [
            { id, type, data, updatedAt: Date.now() }, 
            ...state.drafts
          ] 
        }));
        return id; // Return the ID so the hook can store it in a Ref
      },

      removeDraft: (id) => set((state) => ({ 
        drafts: state.drafts.filter((d) => d.id !== id) 
      })),

      updateDraft: (id, data) => set((state) => ({
        drafts: state.drafts.map((d) => (d.id === id ? { ...d, data, updatedAt: Date.now() } : d))
      })),
      
      // --- NEW: SE Draft Actions ---
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