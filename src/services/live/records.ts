import type { RecordsService } from '../records';
import { api } from './http';
import { loadReport } from './sync-records';

/** Live: report reviews and consultation notes on the backend. */
export const liveRecordsService: RecordsService = {
  /** The note is shown to the patient; reviewing again replaces it. */
  async markReportReviewed(id, note) {
    await api.post(`doctor/reports/${encodeURIComponent(id)}/review`, note.trim() ? { note: note.trim().slice(0, 800) } : {});
    await loadReport(id).catch(() => undefined);
  },
  /** The draft notes of the consultation (keyed by appointment code). Empty vitals are left out. */
  async saveConsultationDraft(draft) {
    const vitals = Object.fromEntries(Object.entries(draft.vitals ?? {}).filter(([, v]) => typeof v === 'string' && v.trim() !== '').map(([k, v]) => [k, String(v).trim()]));
    await api.put(`doctor/consultations/${encodeURIComponent(draft.key)}/notes`, {
      chiefComplaint: draft.chiefComplaint ?? '',
      symptoms: (draft.symptoms ?? []).filter((x) => x.trim()),
      observations: draft.observations ?? '',
      assessment: draft.assessment ?? '',
      diagnosis: (draft.diagnosis ?? []).filter((x) => x.trim().length >= 2),
      advice: (draft.advice ?? []).filter((x) => x.trim().length >= 2),
      ...(Object.keys(vitals).length ? { vitals } : {}),
    });
  },
};
