import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DraftState {
  drafts: any[];
  addDraft: (draft: any ,customId?: string) => void;
  removeDraft: (id: string) => void;
  updateDraft: (id: string, data: any) => void;
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
      }))
    }),
    {
      name: 'drafts-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);