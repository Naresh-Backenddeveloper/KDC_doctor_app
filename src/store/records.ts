import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { seed } from '../mock-data/seed';
import { services } from '../services';
import type { ConsultationHistoryEntry, Patient, Report, ReportDetail } from '../types';
import { persistStorage } from './storage';

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

const FALLBACK = seed.patients()[0];

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
      patients: seed.patients(),
      reports: seed.reports(),
      history: seed.history(),
      reportDetails: seed.reportDetails(),
      patientById: (id) => get().patients.find((p) => p.id === id) ?? FALLBACK,
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
      partialize: ({ patients, reports, history, reportDetails }) => ({ patients, reports, history, reportDetails }),
    },
  ),
);
