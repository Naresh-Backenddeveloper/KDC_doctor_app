import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { seed } from '../mock-data/seed';
import { services } from '../services';
import type { BlockedTime, Mode, WorkingDay } from '../types';
import { persistStorage } from './storage';

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
    (set, get) => ({
      week: seed.week(),
      duration: 15,
      breakFrom: '01:00 PM',
      breakTo: '02:00 PM',
      modesOffered: ['video', 'audio', 'clinic'],
      blocked: seed.blocked(),
      saveSchedule: async (week, duration, breakFrom, breakTo, modes) => {
        await services.availability.saveSchedule(week, duration);
        set({ week, duration, breakFrom, breakTo, modesOffered: modes });
      },
      toggleDay: (short) =>
        set((s) => ({ week: s.week.map((d) => (d.short === short ? { ...d, on: !d.on } : d)) })),
      addBlock: async (block) => {
        await services.availability.addBlock(block);
        set((s) => ({ blocked: [...s.blocked, block] }));
      },
      removeBlock: async (id) => {
        set((s) => ({ blocked: s.blocked.filter((b) => b.id !== id) }));
        await services.availability.removeBlock(id);
      },
    }),
    {
      name: 'availability',
      storage: persistStorage,
      partialize: ({ week, duration, breakFrom, breakTo, modesOffered, blocked }) => ({ week, duration, breakFrom, breakTo, modesOffered, blocked }),
    },
  ),
);

export const blockId = () => `b-${Math.random().toString(36).slice(2, 8)}`;
