import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { seed } from '../mock-data/seed';
import { services } from '../services';
import type { BankAccount, BankUpdate } from '../types';
import { persistStorage } from './storage';

interface BankState {
  bank: BankAccount;
  update: (update: BankUpdate) => Promise<void>;
  markVerified: () => void;
}

export const useBank = create<BankState>()(
  persist(
    (set) => ({
      bank: seed.bank(),
      update: async (update) => {
        const applied = await services.earnings.updateBank(update);
        set((s) => ({ bank: { ...s.bank, ...applied } }));
      },
      markVerified: () => set((s) => ({ bank: { ...s.bank, status: 'verified' } })),
    }),
    { name: 'bank', storage: persistStorage, partialize: ({ bank }) => ({ bank }) },
  ),
);
