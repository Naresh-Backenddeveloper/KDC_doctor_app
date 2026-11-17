/**
 * Live versions of the prescription flows in store/flows.ts (same signatures).
 *
 * - Every prescription belongs to a consultation on the server. Writing one for a patient
 *   uses their consultation in progress; with none, sending explains how instead of failing.
 * - Sending keeps the app's allergy gate, then the server checks again. Its refusals
 *   (allergy, missing diagnosis, a consultation not started) are shown as they come.
 * - After issuing, the prescription, the patient's record and the rest of the app are
 *   reloaded from the server (issuing completes the consultation there).
 * - A follow-up is recorded on the prescription; the server doesn't book it (the patient
 *   books it), so no appointment is added here.
 */
import { unresolvedConflicts } from '../../domain/allergy';
import { knownMedicine } from '../../domain/medicines';
import { useAppointments } from '../../store/appointments';
import { useConsultation } from '../../store/consultation';
import { usePrescriptions } from '../../store/prescriptions';
import { useRecords } from '../../store/records';
import { useSelection } from '../../store/selection';
import { showToast } from '../../store/toast';
import type { SendResult } from '../../store/flows';
import type { ConsultationDraft, Prescription } from '../../types';
import { addDays, longDate, recordDate, TODAY_KEY } from '../../utils/date';
import type { FollowUpForm } from '../../validation/schemas';
import { services } from '../index';
import { ServiceError } from '../mock';
import { LIVE } from '../config';
import { api } from './http';
import { consultationOf, draftBody, NO_CONSULTATION } from './prescriptions';
import { syncAll } from './sync';
import { loadPatient, loadPrescription, loadPrescriptions, toPrescription, type ApiPrescription } from './sync-records';

const FOUR_WEEKS_OUT = () => longDate(addDays(TODAY_KEY, 28));

function newDraft(key: string, init: { patientId: string; apptId?: string; diagnosis?: string[] }): Prescription {
  return {
    key,
    // The server gives the code when the draft is first saved.
    id: `draft-${key}`,
    patientId: init.patientId,
    apptId: init.apptId,
    date: recordDate(TODAY_KEY),
    diagnosis: init.diagnosis ?? [],
    medicines: [],
    advice: [],
    investigations: [],
    followUp: { required: true, date: FOUR_WEEKS_OUT(), mode: 'video', note: '' },
    status: 'draft',
  };
}

/** A draft already saved on the server for this consultation replaces an empty local one. */
interface ApiNotes {
  chiefComplaint: string | null;
  symptoms: string[];
  observations: string | null;
  assessment: string | null;
  diagnosis: string[];
  advice: string[];
  vitals: { bp?: string; pulse?: number; weight?: number; spo2?: number };
  savedAt: string | null;
}

/**
 * The consultation's saved notes (after an app restart, or written on another device), unless
 * this phone already has them. A prescription draft with no diagnosis yet takes the notes'.
 */
export async function loadNotes(apptId: string): Promise<ConsultationDraft | null> {
  let n: ApiNotes | null;
  try {
    n = await api.get<ApiNotes | null>(`doctor/consultations/${encodeURIComponent(apptId)}/notes`);
  } catch {
    return null;
  }
  if (!n) return null;
  const notes: ConsultationDraft = {
    key: apptId,
    chiefComplaint: n.chiefComplaint ?? '',
    symptoms: n.symptoms ?? [],
    observations: n.observations ?? '',
    assessment: n.assessment ?? '',
    diagnosis: n.diagnosis ?? [],
    advice: n.advice ?? [],
    vitals: {
      bp: n.vitals?.bp ?? '',
      pulse: n.vitals?.pulse ? String(n.vitals.pulse) : '',
      weight: n.vitals?.weight ? String(n.vitals.weight) : '',
      spo2: n.vitals?.spo2 ? String(n.vitals.spo2) : '',
    },
    savedAt: n.savedAt ?? undefined,
  };
  useConsultation.setState((s) => (s.drafts[apptId] ? s : { drafts: { ...s.drafts, [apptId]: notes } }));
  if (notes.diagnosis.length) {
    usePrescriptions.setState((s) => {
      const rx = s.drafts[apptId];
      return rx && !rx.diagnosis.length ? { drafts: { ...s.drafts, [apptId]: { ...rx, diagnosis: notes.diagnosis } } } : s;
    });
  }
  return useConsultation.getState().drafts[apptId] ?? notes;
}

/*
 * The prescription being written is saved on the consultation a moment after each change, so
 * an app restart (or another device) carries on with it. Issuing sends the final version.
 */
const pendingSaves = new Map<string, ReturnType<typeof setTimeout>>();
if (LIVE) usePrescriptions.subscribe((s, prev) => {
  for (const [key, rx] of Object.entries(s.drafts)) {
    if (rx === prev.drafts[key] || rx.status !== 'draft') continue;
    const appointment = consultationOf(rx);
    if (!appointment || !(rx.medicines.length || rx.diagnosis.length)) continue;
    clearTimeout(pendingSaves.get(key));
    pendingSaves.set(
      key,
      setTimeout(() => {
        pendingSaves.delete(key);
        const latest = usePrescriptions.getState().drafts[key];
        if (latest?.status === 'draft') api.put(`doctor/consultations/${encodeURIComponent(appointment)}/prescription`, draftBody(latest)).catch(() => undefined);
      }, 1200),
    );
  }
});

async function pullServerDraft(apptId: string) {
  try {
    const p = await api.get<ApiPrescription | null>(`doctor/consultations/${encodeURIComponent(apptId)}/prescription`);
    if (!p) return;
    const rx = toPrescription(p);
    usePrescriptions.setState((s) => {
      const local = s.drafts[apptId];
      if (local && (local.medicines.length || local.diagnosis.length) && p.status === 'draft') return s;
      return { drafts: { ...s.drafts, [apptId]: { ...rx, key: apptId } } };
    });
  } catch {
    // No draft yet, or the consultation can't be read: the local draft stands.
  }
}

/** The patient's consultation in progress with this doctor, if any. */
const inProgressFor = (patientId: string) => useAppointments.getState().appointments.find((a) => a.patientId === patientId && a.status === 'in-progress');

export function openPrescriptionForPatient(patientId: string): string {
  const consult = inProgressFor(patientId);
  if (consult) {
    useSelection.getState().select({ patientId, apptId: consult.id, rxKey: consult.id, viewRxId: null });
    ensureRxDraft(consult.id);
    return consult.id;
  }
  const key = `pt:${patientId}`;
  useSelection.getState().select({ patientId, rxKey: key, viewRxId: null });
  usePrescriptions.getState().ensureDraft(key, { patientId });
  return key;
}

export function ensureRxDraft(key: string): void {
  const appt = useAppointments.getState().appointments.find((a) => a.id === key);
  if (!appt) return;
  if (!usePrescriptions.getState().drafts[key]) {
    const diagnosis = useConsultation.getState().draftFor(key).diagnosis;
    usePrescriptions.setState((s) => ({ drafts: { ...s.drafts, [key]: newDraft(key, { patientId: appt.patientId, apptId: appt.id, diagnosis }) } }));
  }
  void pullServerDraft(appt.id).then(() => loadNotes(appt.id));
}

export async function sendPrescription(key: string): Promise<SendResult> {
  const rxState = usePrescriptions.getState();
  const rx = rxState.drafts[key];
  if (!rx) return { ok: false, reason: 'missing' };
  if (!consultationOf(rx)) {
    showToast(NO_CONSULTATION, 'critical');
    return { ok: false, reason: 'missing' };
  }
  if (rx.medicines.length === 0) return { ok: false, reason: 'empty' };
  const patient = useRecords.getState().patientById(rx.patientId);
  // The app's gate, with each medicine's composition from the catalogue where known.
  const withSalts = rx.medicines.map((m) => ({ ...m, salts: knownMedicine(m.name)?.salts ?? [] }));
  const unresolved = unresolvedConflicts(withSalts, patient.allergies);
  if (unresolved.length) return { ok: false, reason: 'allergy', unresolved };

  let code: string | undefined;
  try {
    const res = (await services.prescriptions.send(rx)) as { sentAt: string; code?: string };
    code = res.code;
  } catch (e) {
    if (e instanceof ServiceError && e.code !== 'unavailable' && e.code !== 'session_ended') {
      // The server's own reason (allergy, diagnosis, consultation not started…): fix and resend.
      showToast(e.message, 'critical');
      return { ok: false, reason: 'missing' };
    }
    rxState.updateDraft(key, { status: 'failed' });
    return { ok: false, reason: 'failed' };
  }

  let sent: Prescription = { ...rx, id: code ?? rx.id, status: 'sent' };
  if (code) {
    try {
      sent = { ...(await loadPrescription(code)), key };
    } catch {
      // Shown from the local copy until the next reload.
    }
  }
  usePrescriptions.getState().addSent(sent, { id: sent.id, patientId: rx.patientId, date: sent.date, title: rx.diagnosis[0] ?? 'Prescription', items: rx.medicines.length, status: 'active' });
  useConsultation.getState().endCall();
  // Issuing completed the consultation on the server: bring the schedule, record and earnings up to date.
  void Promise.all([loadPatient(rx.patientId), loadPrescriptions(), syncAll()]).catch(() => undefined);
  return { ok: true, rx: sent };
}

export function scheduleFollowUp(key: string, form: FollowUpForm, dateKey?: string): void {
  const state = usePrescriptions.getState();
  const rx = state.drafts[key];
  if (!rx) return;
  const date = dateKey ? longDate(dateKey) : form.date;
  state.updateDraft(key, { followUp: { required: form.required, date, mode: form.mode, note: form.note, scheduled: form.required } });
  if (rx.status === 'sent' && form.required) {
    showToast('This prescription is already sent. The follow-up applies to the next one.', 'info');
  }
}
