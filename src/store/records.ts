import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { seed } from '../mock-data/seed';
import { services } from '../services';
import type { ConsultationHistoryEntry, Patient, Report, ReportDetail } from '../types';
import { persistStorage } from './storage';
import { LIVE } from '../services/config';

export type PatientFilter = 'All' | 'Recent' | 'Upcoming' | 'Completed' | 'Follow-up due';

interface RecordsState {
  patients: Patient[];
  reports: Report[];
  history: ConsultationHistoryEntry[];
  reportDetails: Record<string, ReportDetail>;
  patientById: (id: string) => Patient;
  markReportReviewed: (id: string, note: string) => Promise<void>;
  addHistory: (entry: ConsultationHistoryEntry) => void;
  patchPatient: (id: string, patch: Partial<Patient>) => void;
}

/** Live: someone not loaded (yet) is shown as a blank patient, never as a demo one. */
export const emptyPatient = (id: string): Patient => ({
  id, name: '', age: 0, gender: 'Male', blood: '', mobileMasked: '', city: '', conditions: [], allergies: [], lastConsult: '', consults: 0, since: '',
});

const FALLBACK = LIVE ? emptyPatient('') : seed.patients()[0];

export function filterPatients(patients: Patient[], query: string, filter: PatientFilter) {
  const q = query.trim().toLowerCase();
  return patients.filter((p) => {
    const hit = !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.conditions.some((c) => c.toLowerCase().includes(q));
    if (!hit) return false;
    switch (filter) {
      case 'Upcoming':
        return Boolean(p.nextAppointment);
      case 'Completed':
        return !p.nextAppointment;
      case 'Follow-up due':
        return Boolean(p.followUpDue);
      default:
        return true;
    }
  });
}

export const countAwaiting = (reports: Report[]) => reports.filter((r) => r.status === 'ready').length;

export const useRecords = create<RecordsState>()(
  persist(
    (set, get) => ({
      // Live: filled from the server (services/live/sync-records.ts), never seeded.
      patients: LIVE ? [] : seed.patients(),
      reports: LIVE ? [] : seed.reports(),
      history: LIVE ? [] : seed.history(),
      reportDetails: LIVE ? {} : seed.reportDetails(),
      patientById: (id) => get().patients.find((p) => p.id === id) ?? (LIVE ? emptyPatient(id) : FALLBACK),
      markReportReviewed: async (id, note) => {
        await services.records.markReportReviewed(id, note);
        set((s) => ({ reports: s.reports.map((r) => (r.id === id ? { ...r, status: 'reviewed', note } : r)) }));
      },
      addHistory: (entry) => set((s) => ({ history: [entry, ...s.history] })),
      patchPatient: (id, patch) =>
        set((s) => ({ patients: s.patients.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
    }),
    {
      name: 'records',
      storage: persistStorage,
      // Live: patient records are never written to the phone's storage.
      partialize: ({ patients, reports, history, reportDetails }) => (LIVE ? {} : { patients, reports, history, reportDetails }),
    },
  ),
);
