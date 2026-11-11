import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { seed } from '../mock-data/seed';
import { services } from '../services';
import type { SupportTicket } from '../types';
import { nowTime, recordDate, TODAY_KEY } from '../utils/date';
import { persistStorage } from './storage';

interface SupportState {
  tickets: SupportTicket[];
  reply: (ticketId: string, text: string) => Promise<void>;
  create: (subject: string, description: string) => Promise<string>;
}

const stamp = () => `${recordDate(TODAY_KEY).slice(0, 6)}, ${nowTime()}`;

export const useSupport = create<SupportState>()(
  persist(
    (set) => ({
      tickets: [seed.ticket()],
      reply: async (ticketId, text) => {
        await services.support.reply(ticketId, text);
        const at = stamp();
        set((s) => ({
          tickets: s.tickets.map((t) =>
            t.id === ticketId ? { ...t, updated: `${recordDate(TODAY_KEY)}, ${nowTime()}`, thread: [...t.thread, { from: 'doctor', at, text }] } : t,
          ),
        }));
      },
      create: async (subject, description) => {
        const { id } = await services.support.create(subject, description);
        const at = stamp();
        set((s) => ({
          tickets: [
            { id, subject, status: 'open', priority: 'Normal', created: at, updated: at, thread: [{ from: 'doctor', at, text: description }] },
            ...s.tickets,
          ],
        }));
        return id;
      },
    }),
    { name: 'support', storage: persistStorage },
  ),
);
