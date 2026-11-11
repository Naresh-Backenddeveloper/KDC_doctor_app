import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { seed } from '../mock-data/seed';
import type { EarningRow, EarningsSummary, FailedPayout, Mode, Payout } from '../types';
import { recordDate, TODAY_KEY } from '../utils/date';
import { persistStorage } from './storage';

export type EarningFilter = 'This month' | 'Last month' | 'Settled' | 'Processing' | 'No-shows';

interface EarningsState {
  summary: EarningsSummary;
  rows: EarningRow[];
  payout: Payout;
  recordConsultation: (row: { apptId: string; patient: string; mode: Mode; fee: number }) => void;
  failPayout: (failed: FailedPayout) => void;
  clearFailedPayout: () => void;
}

const THIS_MONTH = recordDate(TODAY_KEY).slice(3);

export function filterEarnings(rows: EarningRow[], filter: EarningFilter): EarningRow[] {
  switch (filter) {
    case 'This month':
      return rows.filter((r) => r.date.slice(3) === THIS_MONTH);
    case 'Last month':
      return rows.filter((r) => r.date.slice(3) !== THIS_MONTH);
    case 'Settled':
      return rows.filter((r) => r.status === 'settled');
    case 'Processing':
      return rows.filter((r) => r.status === 'processing');
    case 'No-shows':
      return rows.filter((r) => r.status === 'no-show');
  }
}

/** Distinct row dates, newest first; rows are held newest-first. */
export const earningDates = (rows: EarningRow[]) => Array.from(new Set(rows.map((r) => r.date)));

export const useEarnings = create<EarningsState>()(
  persist(
    (set) => ({
      summary: seed.earnings(),
      rows: seed.earningRows(),
      payout: seed.payout(),
      recordConsultation: ({ apptId, patient, mode, fee }) =>
        set((s) => {
          const consultsThisMonth = s.summary.consultsThisMonth + 1;
          const month = s.summary.month + fee;
          return {
            rows: [
              { id: `e-${apptId}`, date: recordDate(TODAY_KEY), apptId, patient, mode, amount: fee, status: 'processing' },
              ...s.rows,
            ],
            summary: {
              ...s.summary,
              today: s.summary.today + fee,
              week: s.summary.week + fee,
              month,
              consultsThisMonth,
              byMode: { ...s.summary.byMode, [mode]: s.summary.byMode[mode] + fee },
              avgPerConsult: Math.round(month / consultsThisMonth),
            },
            payout: { ...s.payout, pending: s.payout.pending + fee },
          };
        }),
      failPayout: (failed) => set((s) => ({ payout: { ...s.payout, failed } })),
      clearFailedPayout: () => set((s) => ({ payout: { ...s.payout, failed: undefined } })),
    }),
    { name: 'earnings', storage: persistStorage, partialize: ({ summary, rows, payout }) => ({ summary, rows, payout }) },
  ),
);
