import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { seed } from '../mock-data/seed';
import type { EarningRow, EarningsSummary, FailedPayout, Mode, Payout } from '../types';
import { recordDate, TODAY_KEY } from '../utils/date';
import { persistStorage } from './storage';
import { LIVE } from '../services/config';

export type EarningFilter = 'This month' | 'Last month' | 'Settled' | 'Processing' | 'No-shows';

/** Live builds start empty; figures come from the server (services/live/sync-account.ts). */
export const EMPTY_SUMMARY: EarningsSummary = {
  today: 0,
  week: 0,
  month: 0,
  byMode: { video: 0, audio: 0, clinic: 0 },
  consultsThisMonth: 0,
  avgPerConsult: 0,
  weekSeries: [0, 0, 0, 0, 0, 0, 0],
  monthSeries: [0, 0, 0, 0, 0],
  settledThisMonth: 0,
};
export const EMPTY_PAYOUT: Payout = { available: 0, pending: 0, lastPayout: { amount: 0, date: '—' }, nextPayout: { date: '—', cycle: '' } };

interface EarningsState {
  summary: EarningsSummary;
  rows: EarningRow[];
  payout: Payout;
  /** Live: the platform fee KDC+ keeps, in percent (the demo shows 12). */
  commissionPct: number;
  /** Live: hours before an earning can be paid out. */
  clearanceHours: number;
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
      summary: LIVE ? EMPTY_SUMMARY : seed.earnings(),
      rows: LIVE ? [] : seed.earningRows(),
      payout: LIVE ? EMPTY_PAYOUT : seed.payout(),
      commissionPct: 12,
      clearanceHours: 48,
      // Live: the server writes earnings (and payout failures); the app reloads them instead.
      recordConsultation: ({ apptId, patient, mode, fee }) =>
        set((s) => {
          if (LIVE) return s;
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
      failPayout: (failed) => set((s) => (LIVE ? s : { payout: { ...s.payout, failed } })),
      clearFailedPayout: () => set((s) => (LIVE ? s : { payout: { ...s.payout, failed: undefined } })),
    }),
    { name: 'earnings', storage: persistStorage, partialize: ({ summary, rows, payout }) => (LIVE ? {} : { summary, rows, payout }) },
  ),
);
