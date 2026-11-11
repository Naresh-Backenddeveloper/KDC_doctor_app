import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_APPT_ID, seed, seedDraftRx } from '../mock-data/seed';
import type { PrescribedMedicine, Prescription, PrescriptionSummary } from '../types';
import { longDate, recordDate, TODAY_KEY, addDays } from '../utils/date';
import { persistStorage } from './storage';

const FOUR_WEEKS_OUT = longDate(addDays(TODAY_KEY, 28));

interface PrescriptionsState {
  drafts: Record<string, Prescription>;
  docs: Record<string, Prescription>;
  summaries: PrescriptionSummary[];
  ensureDraft: (key: string, init: { patientId: string; apptId?: string; diagnosis?: string[] }) => void;
  updateDraft: (key: string, patch: Partial<Prescription>) => void;
  saveMedicine: (key: string, medicine: PrescribedMedicine, index?: number) => void;
  removeMedicine: (key: string, index: number) => void;
  addSent: (rx: Prescription, summary: PrescriptionSummary) => void;
}

const nextRxId = () => `KDC-RX-2026-${90000 + Math.floor(Math.random() * 9999)}`;

export const usePrescriptions = create<PrescriptionsState>()(
  persist(
    (set, get) => ({
      drafts: { [DEFAULT_APPT_ID]: seedDraftRx() },
      docs: seed.rxDocs(),
      summaries: seed.rxSummaries(),
      ensureDraft: (key, init) => {
        if (get().drafts[key]) return;
        const draft: Prescription = {
          key,
          id: nextRxId(),
          patientId: init.patientId,
          apptId: init.apptId,
          date: recordDate(TODAY_KEY),
          diagnosis: init.diagnosis ?? [],
          medicines: [],
          advice: [],
          investigations: [],
          followUp: { required: true, date: FOUR_WEEKS_OUT, mode: 'video', note: '' },
          status: 'draft',
        };
        set((s) => ({ drafts: { ...s.drafts, [key]: draft } }));
      },
      updateDraft: (key, patch) =>
        set((s) => (s.drafts[key] ? { drafts: { ...s.drafts, [key]: { ...s.drafts[key], ...patch } } } : s)),
      saveMedicine: (key, medicine, index) => {
        const draft = get().drafts[key];
        if (!draft) return;
        const medicines =
          index === undefined ? [...draft.medicines, medicine] : draft.medicines.map((m, i) => (i === index ? medicine : m));
        get().updateDraft(key, { medicines });
      },
      removeMedicine: (key, index) => {
        const draft = get().drafts[key];
        if (draft) get().updateDraft(key, { medicines: draft.medicines.filter((_, i) => i !== index) });
      },
      addSent: (rx, summary) =>
        set((s) => ({
          docs: { ...s.docs, [rx.id]: rx },
          summaries: [summary, ...s.summaries.filter((x) => x.id !== summary.id)],
          drafts: { ...s.drafts, [rx.key]: rx },
        })),
    }),
    { name: 'prescriptions', storage: persistStorage, partialize: ({ drafts, docs, summaries }) => ({ drafts, docs, summaries }) },
  ),
);

export const nextPrescriptionId = nextRxId;
