import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../core/supabase';
import { useAuthStore } from './authStore';
import { useShiftStore } from './shiftStore';

export interface Expense {
  id: string;
  category: string;
  amount: string;
  date: string;
  remarks: string;
  receipt_url: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Queried';
}

interface ExpenseState {
  expenses: Expense[];
  hydrateExpenses: () => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id' | 'status'>) => Promise<void>;
}

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set, get) => ({
      expenses: [],
      
      hydrateExpenses: async () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;

        const { data, error } = await supabase
          .from('expenses')
          .select('*')
          .eq('se_id', userId)
          .order('date', { ascending: false });

        if (!error && data) set({ expenses: data });
      },

      addExpense: async (expense) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;
        
        const activeShiftId = useShiftStore.getState().activeShiftId;

        const payload = {
          se_id: userId,
          shift_id: activeShiftId || null,
          category: expense.category,
          amount: parseFloat(expense.amount),
          date: expense.date,
          remarks: expense.remarks,
          receipt_url: expense.receipt_url,
          status: 'Pending'
        };

        const { data, error } = await supabase.from('expenses').insert(payload).select().single();
        if (error) throw error;

        // Log this expense to the active shift timeline if applicable
        if (activeShiftId) {
          await useShiftStore.getState().logShiftEvent('expense', 'Logged Expense', `${expense.category} • ₹${expense.amount}`);
        }

        set((state) => ({ expenses: [data, ...state.expenses] }));
      }
    }),
    { name: 'expense-storage-v3', storage: createJSONStorage(() => AsyncStorage) }
  )
);