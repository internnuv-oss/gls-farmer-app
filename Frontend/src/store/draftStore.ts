// store/draftStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DraftState {
  drafts: any[];
  addDraft: (draft: any, customId?: string) => void;
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
      addDraft: (data, customId) => set((state) => ({
        drafts: [...state.drafts, { id: customId || Date.now().toString(), type: 'Dealer', data }]
      })),
      removeDraft: (id) => set((state) => ({
        drafts: state.drafts.filter((d) => d.id !== id)
      })),
      updateDraft: (id, data) => set((state) => ({
        drafts: state.drafts.map((d) => (d.id === id ? { ...d, data } : d))
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