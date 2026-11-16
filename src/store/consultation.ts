/* eslint-disable @typescript-eslint/no-require-imports -- lazy requires break import cycles between stores and live services */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_APPT_ID, emptyConsultDraft, seed } from '../mock-data/seed';
import { services } from '../services';
import type { ConsultationDraft } from '../types';
import { persistStorage } from './storage';
import { LIVE } from '../services/config';

interface ActiveConsult {
  apptId: string;
  startedAt: number;
  endedAt?: number;
}

interface ConsultationState {
  drafts: Record<string, ConsultationDraft>;
  active: ActiveConsult | null;
  mic: boolean;
  camera: boolean;
  speaker: boolean;
  draftFor: (key: string) => ConsultationDraft;
  saveDraft: (key: string, draft: Omit<ConsultationDraft, 'key'>) => Promise<void>;
  startCall: (apptId: string) => void;
  endCall: () => void;
  clearActive: () => void;
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleSpeaker: () => void;
}

export const useConsultation = create<ConsultationState>()(
  persist(
    (set, get) => ({
      // Live: notes come from the server per consultation; none are seeded.
      drafts: (LIVE ? {} : { [DEFAULT_APPT_ID]: seed.draftConsult() }) as Record<string, ConsultationDraft>,
      active: null,
      mic: true,
      camera: true,
      speaker: true,
      draftFor: (key) => get().drafts[key] ?? emptyConsultDraft(key),
      saveDraft: async (key, draft) => {
        const next = { ...draft, key, savedAt: new Date().toISOString() };
        await services.records.saveConsultationDraft(next);
        set((s) => ({ drafts: { ...s.drafts, [key]: next } }));
      },
      startCall: (apptId) => set({ active: { apptId, startedAt: Date.now() }, mic: true, camera: true, speaker: true }),
      endCall: () => {
        const active = get().active;
        set((s) => (s.active && !s.active.endedAt ? { active: { ...s.active, endedAt: Date.now() } } : s));
        // Live: the call ends on the server too (completing comes with the prescription or "complete").
        if (LIVE && active && !active.endedAt) {
          void Promise.resolve(require('../services/live/http') as typeof import('../services/live/http')).then((m) => m.api.post(`doctor/consultations/${encodeURIComponent(active.apptId)}/end`, {})).catch(() => undefined);
        }
      },
      clearActive: () => set({ active: null }),
      toggleMic: () => set((s) => ({ mic: !s.mic })),
      toggleCamera: () => set((s) => ({ camera: !s.camera })),
      toggleSpeaker: () => set((s) => ({ speaker: !s.speaker })),
    }),
    {
      name: 'consultation',
      storage: persistStorage,
      // Live: clinical notes are never written to the phone (only which call is running).
      partialize: ({ drafts, active }) => (LIVE ? { active } : { drafts, active }),
    },
  ),
);

/** Seconds elapsed for a consultation, frozen once the call has ended. */
export function elapsedSeconds(active: ActiveConsult, now: number): number {
  return Math.max(0, Math.floor(((active.endedAt ?? now) - active.startedAt) / 1000));
}
