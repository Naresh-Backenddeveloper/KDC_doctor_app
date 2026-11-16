/**
 * Live: patients, their records, lab reports and prescriptions, from the backend into
 * useRecords and usePrescriptions.
 *
 * - The patient list (GET /doctor/patients) loads with the rest of the app. It holds the
 *   patients whose record is shared with this doctor (a confirmed booking shares it).
 * - A patient's detail and reports load when the patient is opened (`loadPatient`). Every
 *   such read is logged on the server as an access to that record, so nothing is fetched
 *   for patients the doctor doesn't open.
 * - Prescriptions: the doctor's list (GET /doctor/prescriptions); one in full on demand.
 */
import type { ConsultationHistoryEntry, Mode, Patient, PrescribedMedicine, Prescription, PrescriptionSummary, Report, ReportDetail, ReportResult } from '../../types';
import { useRecords } from '../../store/records';
import { usePrescriptions } from '../../store/prescriptions';
import { localTodayKey, longDate, recordDate } from '../../utils/date';
import { api } from './http';
import { registerDomain } from './sync';

/* ------------------------------------------------------------------ Shapes */

interface ApiPatientRow {
  memberId: number;
  name: string;
  age: number | null;
  gender: string | null;
  bloodGroup: string | null;
  conditions: string[];
  allergies: string[];
  consults: number;
  lastSeen: string | null;
  next: string | null;
}

interface ApiPatient {
  memberId: number;
  name: string;
  age: number | null;
  gender: string | null;
  bloodGroup: string | null;
  city: string | null;
  mobile: string | null;
  patientSince: string | null;
  medical: { allergies: string[]; conditions: string[] };
  consults: number;
  lastConsultation: string | null;
  nextConsultation: { code: string; startsAt: string; mode: Mode } | null;
  history: { appointmentCode: string; date: string; mode: Mode; durationMin: number; summary: string | null; prescriptionCode: string | null }[];
  prescriptions: { code: string; status: string; issuedAt: string | null; diagnosis: string[] }[];
}

interface ApiReport {
  code: string;
  name: string;
  category: 'blood' | 'imaging' | 'other';
  status: string;
  lab: string | null;
  memberId: number;
  collectedAt: string | null;
  reportedAt: string | null;
  flagged: number;
  params: number;
  reviewedByYou?: boolean;
}

interface ApiReportDetail extends ApiReport {
  pathologist: string | null;
  summary: string | null;
  results: { name: string; value: string; unit: string | null; range: string | null; flag: 'normal' | 'borderline' | 'high' | 'low' }[];
  reviews: { doctor: { code: string; name: string }; note: string | null }[];
}

export interface ApiPrescription {
  code: string;
  status: 'draft' | 'issued' | 'cancelled';
  active: boolean;
  appointmentCode: string;
  mode: Mode;
  patient: { memberId: number | null; name: string | null };
  diagnosis: string[];
  items: { name: string; strength: string | null; generic: string; dosage: string; frequency: string; duration: string; food: string | null; instructions: string | null; allergyOverride: { allergens: string[]; reason: string; at: string } | null }[];
  advice: string[];
  investigations: string[];
  followUp: { required: boolean; date: string | null; mode: Mode | null; note: string | null };
  issuedAt: string | null;
}

/* ----------------------------------------------------------------- Mapping */

const dayOf = (iso: string | null | undefined) => (iso ? recordDate(localTodayKey(new Date(iso))) : '');
const gender = (g: string | null): Patient['gender'] => (g === 'female' ? 'Female' : 'Male');
const CATEGORY: Record<ApiReport['category'], Report['category']> = { blood: 'Blood Tests', imaging: 'Imaging', other: 'Other' };
/** The app shows normal, borderline or high; a low value is out of range too, so it reads as high (flagged). */
const FLAG: Record<ApiReportDetail['results'][number]['flag'], ReportResult['flag']> = { normal: 'normal', borderline: 'borderline', high: 'high', low: 'high' };

function nextLabel(iso: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  const key = localTodayKey(d);
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
  return `${key === localTodayKey() ? 'Today' : longDate(key)}, ${time}`;
}

export function toPatient(r: ApiPatientRow, known?: Patient): Patient {
  return {
    ...(known ?? { mobileMasked: '', city: '', since: '' }),
    id: String(r.memberId),
    name: r.name,
    age: r.age ?? 0,
    gender: gender(r.gender),
    blood: r.bloodGroup ?? '—',
    conditions: r.conditions ?? [],
    allergies: r.allergies ?? [],
    lastConsult: dayOf(r.lastSeen) || '—',
    nextAppointment: nextLabel(r.next),
    consults: r.consults,
  } as Patient;
}

function toReport(r: ApiReport, note?: string): Report {
  return {
    id: r.code,
    name: r.name,
    category: CATEGORY[r.category] ?? 'Other',
    date: dayOf(r.reportedAt),
    lab: r.lab ?? '',
    status: r.reviewedByYou ? 'reviewed' : 'ready',
    flagged: r.flagged,
    params: r.params,
    patientId: String(r.memberId),
    ...(note ? { note } : {}),
  };
}

function toReportDetail(r: ApiReportDetail): ReportDetail {
  return {
    id: r.code,
    name: r.name,
    patientId: String(r.memberId),
    lab: r.lab ?? '',
    collected: dayOf(r.collectedAt),
    reported: dayOf(r.reportedAt),
    pathologist: r.pathologist ?? '',
    summary: r.summary ?? '',
    results: r.results.map((x) => ({ name: x.name, value: x.value, unit: x.unit ?? '', range: x.range ?? '', flag: FLAG[x.flag] ?? 'normal' })),
  };
}

export function toPrescription(p: ApiPrescription): Prescription {
  const medicines: PrescribedMedicine[] = p.items.map((i) => ({
    name: i.name,
    strength: i.strength ?? '',
    dosage: i.dosage,
    frequency: i.frequency,
    duration: i.duration,
    food: i.food ?? '',
    instructions: i.instructions ?? '',
    ...(i.allergyOverride ? { allergyOverride: { allergens: i.allergyOverride.allergens, reason: i.allergyOverride.reason, at: i.allergyOverride.at } } : {}),
  }));
  return {
    key: p.appointmentCode,
    id: p.code,
    patientId: p.patient.memberId ? String(p.patient.memberId) : '',
    apptId: p.appointmentCode,
    date: dayOf(p.issuedAt) || recordDate(localTodayKey()),
    diagnosis: p.diagnosis,
    medicines,
    advice: p.advice,
    investigations: p.investigations,
    followUp: { required: p.followUp.required, date: p.followUp.date ? longDate(p.followUp.date) : '', mode: p.followUp.mode ?? 'video', note: p.followUp.note ?? '', scheduled: p.followUp.required },
    status: p.status === 'draft' ? 'draft' : 'sent',
  };
}

const toSummary = (p: ApiPrescription): PrescriptionSummary => ({
  id: p.code,
  patientId: p.patient.memberId ? String(p.patient.memberId) : '',
  date: dayOf(p.issuedAt),
  title: p.diagnosis[0] ?? 'Prescription',
  items: p.items.length,
  status: p.active ? 'active' : 'completed',
});

/* ----------------------------------------------------------------- Loaders */

async function pages<T>(path: string, limit = 100, max = 1000): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; out.length < max; page++) {
    const r = await api.get<{ rows: T[]; total: number }>(`${path}${path.includes('?') ? '&' : '?'}page=${page}&limit=${limit}`);
    out.push(...r.rows);
    if (out.length >= r.total || !r.rows.length) break;
  }
  return out;
}

/** The patients shared with this doctor, and which are due a follow-up. */
export async function loadPatients(): Promise<void> {
  const [rows, followUps] = await Promise.all([pages<ApiPatientRow>('doctor/patients?filter=all'), pages<ApiPatientRow>('doctor/patients?filter=followup')]);
  const due = new Set(followUps.map((r) => r.memberId));
  const before = new Map(useRecords.getState().patients.map((p) => [p.id, p]));
  useRecords.setState({ patients: rows.map((r) => ({ ...toPatient(r, before.get(String(r.memberId))), followUpDue: due.has(r.memberId) })) });
}

/**
 * One patient in full: contact, history, reports. Called when the doctor opens the patient
 * (each read is logged on the server). Replaces that patient's history and reports.
 */
export async function loadPatient(id: string): Promise<void> {
  const memberId = Number(id);
  if (!Number.isInteger(memberId) || memberId <= 0) return;
  const [p, reports] = await Promise.all([api.get<ApiPatient>(`doctor/patients/${memberId}`), api.get<ApiReport[]>(`doctor/patients/${memberId}/reports`)]);
  useRecords.setState((s) => {
    const existing = s.patients.find((x) => x.id === id);
    const patient: Patient = {
      ...(existing ?? toPatient({ memberId, name: p.name, age: p.age, gender: p.gender, bloodGroup: p.bloodGroup, conditions: [], allergies: [], consults: 0, lastSeen: null, next: null })),
      name: p.name,
      age: p.age ?? 0,
      gender: gender(p.gender),
      blood: p.bloodGroup ?? '—',
      city: p.city ?? '',
      mobileMasked: p.mobile ?? '',
      since: p.patientSince ? new Date(p.patientSince).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '',
      conditions: p.medical.conditions,
      allergies: p.medical.allergies,
      consults: p.consults,
      lastConsult: dayOf(p.lastConsultation) || '—',
      nextAppointment: p.nextConsultation ? nextLabel(p.nextConsultation.startsAt) : undefined,
    };
    const history: ConsultationHistoryEntry[] = p.history.map((h) => ({
      id: `h-${h.appointmentCode}`,
      patientId: id,
      date: recordDate(h.date),
      mode: h.mode,
      summary: h.summary ?? 'Consultation',
      duration: `${Math.max(1, h.durationMin)} min`,
      rxId: h.prescriptionCode ?? '',
    }));
    const notes = new Map(s.reports.filter((r) => r.patientId === id && r.note).map((r) => [r.id, r.note!]));
    return {
      patients: existing ? s.patients.map((x) => (x.id === id ? patient : x)) : [...s.patients, patient],
      history: [...history, ...s.history.filter((h) => h.patientId !== id)],
      reports: [...reports.map((r) => toReport(r, notes.get(r.code))), ...s.reports.filter((r) => r.patientId !== id)],
    };
  });
}

/** One report with its results (on open). */
export async function loadReport(code: string): Promise<void> {
  const r = await api.get<ApiReportDetail>(`doctor/reports/${encodeURIComponent(code)}`);
  const mine = r.reviews.find((x) => r.reviewedByYou && x.note)?.note ?? undefined;
  useRecords.setState((s) => ({
    reportDetails: { ...s.reportDetails, [r.code]: toReportDetail(r) },
    reports: [toReport(r, mine), ...s.reports.filter((x) => x.id !== r.code)],
  }));
}

/** The doctor's issued (and cancelled) prescriptions, newest first, as summaries and full documents. */
export async function loadPrescriptions(): Promise<void> {
  const rows = await pages<ApiPrescription>('doctor/prescriptions?scope=all', 50, 500);
  const issued = rows.filter((r) => r.status !== 'draft');
  usePrescriptions.setState((s) => ({
    summaries: issued.map(toSummary),
    docs: { ...Object.fromEntries(issued.map((r) => [r.code, toPrescription(r)])), ...Object.fromEntries(Object.entries(s.docs).filter(([k]) => !issued.some((r) => r.code === k))) },
  }));
}

/** One prescription in full (viewing an older one). */
export async function loadPrescription(code: string): Promise<Prescription> {
  const p = toPrescription(await api.get<ApiPrescription>(`doctor/prescriptions/${encodeURIComponent(code)}`));
  usePrescriptions.setState((s) => ({ docs: { ...s.docs, [p.id]: p } }));
  return p;
}

/**
 * A patient seen through an appointment but not (yet) in the shared list: the schedule
 * sync adds what the appointment says, so names show instead of blanks.
 */
export function upsertPatientStub(stub: { id: string; name: string; age?: number | null; gender?: string | null }) {
  useRecords.setState((s) =>
    s.patients.some((p) => p.id === stub.id)
      ? s
      : {
          patients: [
            ...s.patients,
            { id: stub.id, name: stub.name, age: stub.age ?? 0, gender: gender(stub.gender ?? null), blood: '—', mobileMasked: '', city: '', conditions: [], allergies: [], lastConsult: '—', consults: 0, since: '' },
          ],
        },
  );
}

registerDomain({
  name: 'records',
  async load() {
    await Promise.all([loadPatients(), loadPrescriptions()]);
  },
  clear() {
    useRecords.setState({ patients: [], reports: [], history: [], reportDetails: {} });
    usePrescriptions.setState({ drafts: {}, docs: {}, summaries: [] });
  },
});
