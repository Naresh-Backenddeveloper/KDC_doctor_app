import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { seed } from '../mock-data/seed';
import { services } from '../services';
import type { BankAccount, BankUpdate } from '../types';
import { persistStorage } from './storage';
import { LIVE } from '../services/config';

const EMPTY: BankAccount = { name: '', holder: '', account: '', ifsc: '', branch: '', type: '', status: 'verifying', pan: '', panHolder: '' };

interface BankState {
  bank: BankAccount;
  /** Live: whether a settlement account is on file at all. */
  hasAccount: boolean;
  /** Live: why operations couldn't verify the account, if they couldn't. */
  failure: string | null;
  update: (update: BankUpdate) => Promise<void>;
  markVerified: () => void;
}

export const useBank = create<BankState>()(
  persist(
    (set) => ({
      bank: LIVE ? EMPTY : seed.bank(),
      hasAccount: !LIVE,
      failure: null,
      update: async (update) => {
        const applied = await services.earnings.updateBank(update);
        set((s) => ({ bank: { ...s.bank, ...applied }, hasAccount: true, failure: null }));
      },
      // Demo only: there is no reviewer, so the account verifies itself. Live: operations verify it.
      markVerified: () => set((s) => (LIVE ? s : { bank: { ...s.bank, status: 'verified' } })),
    }),
    { name: 'bank', storage: persistStorage, partialize: ({ bank }) => (LIVE ? {} : { bank }) },
  ),
);
