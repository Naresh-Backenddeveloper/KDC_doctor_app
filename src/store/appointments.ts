import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { seed } from '../mock-data/seed';
import { services } from '../services';
import type { Appointment, PendingAction } from '../types';
import { minutesOf, timeLabel } from '../utils/date';
import { persistStorage } from './storage';

interface AppointmentsState {
  appointments: Appointment[];
  heldRequests: Appointment[];
  onDuty: boolean;
  pendingActions: PendingAction[];
  merge: (fresh: Appointment[]) => void;
  setOnDuty: (on: boolean) => Promise<void>;
  acceptRequest: (id: string) => void;
  patch: (id: string, patch: Partial<Appointment>) => void;
  setStatus: (id: string, status: Appointment['status'], reason?: string) => Promise<void>;
  reschedule: (id: string, target: { key: string; label: string; time: string }) => Promise<void>;
  addAppointment: (appt: Appointment) => void;
  dismissAction: (id: string) => void;
}

export const useAppointments = create<AppointmentsState>()(
  persist(
    (set, get) => ({
      appointments: seed.appointments(),
      heldRequests: seed.heldRequests(),
      onDuty: true,
      pendingActions: seed.pending(),
      // Local changes win: the mock server has no memory of them across launches.
      merge: (fresh) =>
        set((s) => ({ appointments: [...s.appointments, ...fresh.filter((f) => !s.appointments.some((a) => a.id === f.id))] })),
      setOnDuty: async (on) => {
        set((s) => {
          if (on && s.heldRequests.length) {
            return { onDuty: on, appointments: [...s.appointments, ...s.heldRequests], heldRequests: [] };
          }
          return { onDuty: on };
        });
        await services.appointments.setOnDuty(on);
      },
      acceptRequest: (id) => get().patch(id, { requested: false }),
      patch: (id, patch) =>
        set((s) => ({ appointments: s.appointments.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      setStatus: async (id, status, reason) => {
        get().patch(id, reason ? { status, reason } : { status });
        await services.appointments.update(id, { status });
      },
      reschedule: async (id, target) => {
        const appt = get().appointments.find((a) => a.id === id);
        if (!appt) return;
        const length = minutesOf(appt.endTime) - minutesOf(appt.time);
        const endTime = timeLabel(minutesOf(target.time) + length);
        await services.appointments.reschedule(id, { ...target, endTime });
        get().patch(id, { dateKey: target.key, date: target.label, time: target.time, endTime, status: 'upcoming' });
      },
      addAppointment: (appt) => set((s) => ({ appointments: [...s.appointments, appt] })),
      dismissAction: (id) => set((s) => ({ pendingActions: s.pendingActions.filter((a) => a.id !== id) })),
    }),
    {
      name: 'appointments',
      storage: persistStorage,
      partialize: ({ appointments, heldRequests, onDuty, pendingActions }) => ({ appointments, heldRequests, onDuty, pendingActions }),
    },
  ),
);
