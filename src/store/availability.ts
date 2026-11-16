/* eslint-disable @typescript-eslint/no-require-imports -- lazy requires break import cycles between stores and live services */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { seed } from '../mock-data/seed';
import { services } from '../services';
import type { BlockedTime, Mode, WorkingDay } from '../types';
import { persistStorage } from './storage';
import { LIVE } from '../services/config';

const OFF_WEEK: WorkingDay[] = [
  ['Monday', 'Mon'], ['Tuesday', 'Tue'], ['Wednesday', 'Wed'], ['Thursday', 'Thu'], ['Friday', 'Fri'], ['Saturday', 'Sat'], ['Sunday', 'Sun'],
].map(([day, short]) => ({ day, short, on: false, sessions: [], modes: [] }));

interface AvailabilityState {
  week: WorkingDay[];
  duration: number;
  breakFrom: string;
  breakTo: string;
  modesOffered: Mode[];
  blocked: BlockedTime[];
  saveSchedule: (week: WorkingDay[], duration: number, breakFrom: string, breakTo: string, modes: Mode[]) => Promise<void>;
  toggleDay: (short: string) => void;
  addBlock: (block: BlockedTime) => Promise<void>;
  removeBlock: (id: string) => Promise<void>;
}

export const useAvailability = create<AvailabilityState>()(
  persist(
    (set) => ({
      // Live: filled from the server by services/live/sync-schedule.ts.
      week: LIVE ? OFF_WEEK : seed.week(),
      duration: 15,
      breakFrom: '01:00 PM',
      breakTo: '02:00 PM',
      modesOffered: ['video', 'audio', 'clinic'],
      blocked: LIVE ? [] : seed.blocked(),
      saveSchedule: async (week, duration, breakFrom, breakTo, modes) => {
        if (LIVE) {
          // The break is part of the server's schedule; the saved schedule is read back.
          const live = (require('../services/live/availability') as typeof import('../services/live/availability'));
          await live.saveScheduleLive(week, duration, breakFrom, breakTo);
          set({ modesOffered: modes });
          await (require('../services/live/sync-schedule') as typeof import('../services/live/sync-schedule')).loadAvailability();
          return;
        }
        await services.availability.saveSchedule(week, duration);
        set({ week, duration, breakFrom, breakTo, modesOffered: modes });
      },
      toggleDay: (short) =>
        set((s) => ({ week: s.week.map((d) => (d.short === short ? { ...d, on: !d.on } : d)) })),
      addBlock: async (block) => {
        await services.availability.addBlock(block);
        if (LIVE) await (require('../services/live/sync-schedule') as typeof import('../services/live/sync-schedule')).loadBlocks();
        else set((s) => ({ blocked: [...s.blocked, block] }));
      },
      removeBlock: async (id) => {
        set((s) => ({ blocked: s.blocked.filter((b) => b.id !== id) }));
        await services.availability.removeBlock(id);
        if (LIVE) await (require('../services/live/sync-schedule') as typeof import('../services/live/sync-schedule')).loadBlocks();
      },
    }),
    {
      name: 'availability',
      storage: persistStorage,
      partialize: ({ week, duration, breakFrom, breakTo, modesOffered, blocked }) => (LIVE ? {} : { week, duration, breakFrom, breakTo, modesOffered, blocked }),
    },
  ),
);

export const blockId = () => `b-${Math.random().toString(36).slice(2, 8)}`;
