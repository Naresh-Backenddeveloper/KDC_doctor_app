/**
 * Live builds: the doctor's own account from the backend into the stores: profile and
 * qualifications, verification, earnings and payouts, the bank account, the inbox and
 * support tickets. Each loader can be called on its own after a change.
 */
import { api } from './http';
import { registerDomain } from './sync';
import { useBank } from '../../store/bank';
import { useDoctor, EMPTY_PROFILE } from '../../store/doctor';
import { useEarnings, EMPTY_PAYOUT, EMPTY_SUMMARY } from '../../store/earnings';
import { useNotifications } from '../../store/notifications';
import { useSettings } from '../../store/settings';
import { useSupport } from '../../store/support';
import { EMPTY_DECLARED, useVerification } from '../../store/verification';
import type {
  BankAccount,
  DoctorNotification,
  DoctorProfile,
  EarningRow,
  EarningsSummary,
  Mode,
  NotificationCategory,
  Payout,
  Qualification,
  SupportTicket,
  TicketMessage,
  VerificationDocument,
  VerificationStatus,
} from '../../types';
import { localTodayKey, recordDate } from '../../utils/date';

/* --------------------------------------------------------------- Helpers */

/** "05 Oct 2026" for an instant, in device time (the same form as recordDate). */
export const dateOf = (iso: string | Date | null | undefined) => (iso ? recordDate(localTodayKey(new Date(iso))) : '');
/** "4:22 PM". */
export function timeOf(iso: string | Date): string {
  const d = new Date(iso);
  const h = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
}
/** "04 Oct 2026, 4:22 PM". */
export const stampOf = (iso: string | Date) => `${dateOf(iso)}, ${timeOf(iso)}`;
/** "04 Oct, 4:22 PM" (thread messages). */
export const shortStampOf = (iso: string | Date) => `${dateOf(iso).slice(0, 6)}, ${timeOf(iso)}`;
/** "+91 98490 11204" */
const pretty = (mobile: string | null) => (mobile ? `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}` : '');

/* --------------------------------------------------------------- Profile */

export interface ApiQualification {
  id: number;
  degree: string;
  institution: string;
  yearFrom: number;
  yearTo: number | null;
  state: 'pending' | 'verified' | 'rejected';
  note: string | null;
}

export interface ApiProfile {
  code: string;
  status: string;
  verificationStatus: string;
  verified: boolean;
  name: string;
  title: string | null;
  qualification: string | null;
  specialty: { id: number; name: string; practitionerTitle: string } | null;
  subSpecialty: string | null;
  experienceYears: number | null;
  languages: string[];
  about: string | null;
  regNo: string | null;
  council: { id: number; name: string } | null;
  mobile: string | null;
  email: string | null;
  hospital: string | null;
  clinicName: string | null;
  clinicAddress: string | null;
  city: string | null;
  locality: string | null;
  pincode: string | null;
  clinicPhone: string | null;
  fees: Record<Mode, number | null>;
  modes: Record<Mode, boolean>;
  freeFollowUp: boolean;
  commissionPct: number;
  onDuty: boolean;
  rating: number;
  reviews: number;
  consults: number;
  qualifications: ApiQualification[];
}

export const toQualification = (q: ApiQualification): Qualification => ({ degree: q.degree, org: q.institution, years: `${q.yearFrom} – ${q.yearTo ?? 'Present'}` });

export function toProfile(p: ApiProfile): DoctorProfile {
  const bare = p.name.replace(/^Dr\.?\s+/i, '').trim();
  const parts = bare.split(/\s+/);
  return {
    ...EMPTY_PROFILE,
    id: p.code,
    name: p.name,
    shortName: `Dr. ${parts[parts.length - 1] ?? bare}`,
    firstName: parts[0] ?? bare,
    // A photo is an authenticated file; the app shows initials until one can be fetched.
    photo: '',
    qualification: p.qualification ?? '',
    specialization: p.specialty?.name ?? '',
    subSpecialization: p.subSpecialty ?? '',
    title: p.title ?? p.specialty?.practitionerTitle ?? '',
    experience: p.experienceYears ?? 0,
    languages: p.languages,
    regNo: p.regNo ?? '',
    council: p.council?.name ?? '',
    mobile: pretty(p.mobile),
    mobileMasked: p.mobile ? `+91 ${p.mobile.slice(0, 5)} •••• ${p.mobile.slice(-2)}` : '',
    email: p.email ?? '',
    hospital: p.hospital ?? '',
    clinic: p.clinicName ?? '',
    address: [p.clinicAddress, p.locality, p.city && p.pincode ? `${p.city} – ${p.pincode}` : p.city].filter(Boolean).join(', '),
    city: p.city ?? '',
    pin: p.pincode ?? '',
    clinicPhone: p.clinicPhone ?? '',
    rating: p.rating,
    reviews: p.reviews,
    consults: p.consults,
    verified: p.verified,
    about: p.about ?? '',
    fees: { video: p.fees.video ?? 0, audio: p.fees.audio ?? 0, clinic: p.fees.clinic ?? 0 },
    modesEnabled: { ...p.modes },
    freeFollowUp: p.freeFollowUp,
    acceptsInPerson: p.modes.clinic,
  };
}

export async function loadProfile(): Promise<ApiProfile> {
  const p = await api.get<ApiProfile>('doctor/me');
  useDoctor.setState({ profile: toProfile(p), qualifications: p.qualifications.map(toQualification) });
  useEarnings.setState({ commissionPct: p.commissionPct });
  return p;
}

/* ----------------------------------------------------------- Verification */

interface ApiVerification {
  status: 'draft' | 'submitted' | 'in_review' | 'docs_requested' | 'ready' | 'approved' | 'rejected';
  canEdit: boolean;
  missing: string[];
  declared: { name: string; regNo: string | null; council: { id: number; name: string } | null; specialty: { id: number; name: string } | null; qualification: string | null; experienceYears: number | null };
  documents: { type: string; label: string; required: boolean; state: 'missing' | 'review' | 'verified' | 'rejected'; note: string | null; file: { name: string; sizeBytes: number } | null }[];
  submittedAt: string | null;
  slaDueAt: string | null;
  requestMessage: string | null;
  decision: { outcome: 'approved' | 'rejected'; reason: string | null; at: string | null } | null;
}

export function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * The app has three states. A documents request shows as "rejected" (the screen's
 * fix-and-resubmit path, with the reviewer's message); every stage before a decision
 * is "pending". `serverStatus` keeps the exact stage for the screen.
 */
const STATUS: Record<ApiVerification['status'], VerificationStatus> = {
  draft: 'pending',
  submitted: 'pending',
  in_review: 'pending',
  ready: 'pending',
  docs_requested: 'rejected',
  approved: 'approved',
  rejected: 'rejected',
};

export async function loadVerification(): Promise<VerificationStatus> {
  const v = await api.get<ApiVerification>('doctor/verification');
  const documents: VerificationDocument[] = v.documents.map((d) => ({
    id: d.type,
    label: d.label,
    file: d.file?.name ?? '',
    size: d.file ? formatSize(d.file.sizeBytes) : '',
    state: d.state,
    // Before submission the doctor may still swap or remove a file.
    userUploaded: v.canEdit && Boolean(d.file),
  }));
  const status = STATUS[v.status];
  useVerification.setState({
    status,
    serverStatus: v.status,
    canSubmit: v.canEdit && (v.status === 'draft' || v.status === 'docs_requested'),
    missingItems: v.missing,
    submitted: v.submittedAt ? dateOf(v.submittedAt) : 'not yet',
    expected: v.slaDueAt ? `by ${dateOf(v.slaDueAt)}` : 'within 48 hours',
    rejectionReason: v.status === 'docs_requested' ? (v.requestMessage ?? 'The review team asked for more documents.') : v.status === 'rejected' ? (v.decision?.reason ?? 'Your application was not approved.') : '',
    declared: {
      name: v.declared.name,
      regNo: v.declared.regNo ?? '',
      council: v.declared.council?.name ?? '',
      specialization: v.declared.specialty?.name ?? '',
      qualification: v.declared.qualification ?? '',
      experience: v.declared.experienceYears ?? 0,
    },
    documents,
    uploadError: null,
  });
  return status;
}

/* --------------------------------------------------------------- Earnings */

interface ApiSummary extends EarningsSummary {
  payout: {
    available: number;
    pending: number;
    lastPayout: { amount: number; date: string | null; code: string } | null;
    nextPayout: { date: string; cycle: string };
    failed: { code: string; amount: number; attempted: string; account: string | null; reason: string } | null;
    clearanceHours: number;
  };
  commissionPct: number;
}

interface ApiEarningRow {
  id: string;
  date: string;
  apptId: string;
  patient: string | null;
  mode: Mode;
  amount: number;
  status: 'settled' | 'processing' | 'no-show';
}

export function toPayout(p: ApiSummary['payout']): Payout {
  return {
    available: p.available,
    pending: p.pending,
    lastPayout: p.lastPayout ? { amount: p.lastPayout.amount, date: dateOf(p.lastPayout.date) } : { amount: 0, date: '—' },
    nextPayout: { date: recordDate(p.nextPayout.date), cycle: p.nextPayout.cycle },
    ...(p.failed ? { failed: { amount: p.failed.amount, attempted: stampOf(p.failed.attempted), account: p.failed.account ?? 'your bank account', reason: p.failed.reason } } : {}),
  };
}

export async function loadEarnings(): Promise<void> {
  const [s, page] = await Promise.all([api.get<ApiSummary>('doctor/earnings/summary'), api.get<{ rows: ApiEarningRow[] }>('doctor/earnings?page=1&limit=100')]);
  const summary: EarningsSummary = {
    today: s.today,
    week: s.week,
    month: s.month,
    byMode: s.byMode,
    consultsThisMonth: s.consultsThisMonth,
    avgPerConsult: s.avgPerConsult,
    weekSeries: s.weekSeries,
    monthSeries: s.monthSeries,
    settledThisMonth: s.settledThisMonth,
  };
  const rows: EarningRow[] = page.rows.map((r) => ({ id: r.id, date: dateOf(r.date), apptId: r.apptId, patient: r.patient ?? '', mode: r.mode, amount: r.amount, status: r.status }));
  useEarnings.setState({ summary, rows, payout: toPayout(s.payout), commissionPct: s.commissionPct, clearanceHours: s.payout.clearanceHours });
}

/* ------------------------------------------------------------------ Bank */

interface ApiBank {
  name: string;
  holder: string;
  account: string;
  ifsc: string;
  branch: string | null;
  type: string;
  status: 'verifying' | 'verified' | 'failed';
  failureReason: string | null;
  pan: string;
  panHolder: string;
}

export const EMPTY_BANK: BankAccount = { name: '', holder: '', account: '', ifsc: '', branch: '', type: '', status: 'verifying', pan: '', panHolder: '' };

/** A failed check shows as "verifying" (the app has two states); `bankFailure` carries the reason. */
export const toBank = (b: ApiBank): BankAccount => ({
  name: b.name,
  holder: b.holder,
  account: b.account,
  ifsc: b.ifsc,
  branch: b.branch ?? '',
  type: b.type,
  status: b.status === 'verified' ? 'verified' : 'verifying',
  pan: b.pan,
  panHolder: b.panHolder,
});

export async function loadBank(): Promise<void> {
  const b = await api.get<ApiBank | null>('doctor/bank-account');
  useBank.setState({ bank: b ? toBank(b) : EMPTY_BANK, hasAccount: Boolean(b), failure: b?.status === 'failed' ? (b.failureReason ?? 'The bank details could not be verified.') : null });
}

/* ----------------------------------------------------------------- Inbox */

interface ApiNotification {
  id: number;
  event: string;
  category: string;
  title: string;
  body: string;
  data: { type?: string; code?: string } | null;
  unread: boolean;
  createdAt: string;
  group: string;
}

const CATEGORIES: NotificationCategory[] = ['Appointments', 'Patients', 'Payments', 'System'];

/** Where a notification leads in the app, from what it's about. */
function target(n: ApiNotification): Pick<DoctorNotification, 'action' | 'screen' | 'apptId'> {
  const code = n.data?.code;
  switch (n.data?.type) {
    case 'consultation':
      return n.event === 'doctor.patient_waiting' ? { action: 'Join now', screen: 'dr-waiting-room', apptId: code } : { screen: 'dr-appointment-detail', apptId: code };
    case 'appointment':
      return { screen: 'dr-appointment-detail', apptId: code };
    case 'lab_report':
      return { action: 'Review', screen: 'dr-reports' };
    case 'payout':
      return { screen: 'dr-payout' };
    case 'bank_account':
      return { screen: 'dr-bank' };
    case 'verification':
      return { screen: 'dr-verification' };
    case 'support_ticket':
      return { screen: 'dr-support' };
    default:
      return {};
  }
}

export const toNotification = (n: ApiNotification): DoctorNotification => ({
  id: String(n.id),
  group: n.group,
  category: (CATEGORIES as string[]).includes(n.category) ? (n.category as NotificationCategory) : 'System',
  title: n.title,
  body: n.body,
  time: timeOf(n.createdAt),
  unread: n.unread,
  ...target(n),
});

export async function loadNotifications(): Promise<void> {
  const page = await api.get<{ rows: ApiNotification[] }>('me/notifications?page=1&limit=100');
  useNotifications.setState({ items: page.rows.map(toNotification) });
}

/* ---------------------------------------------------------------- Support */

interface ApiTicketRow {
  id: string;
  subject: string;
  priority: string;
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
  created: string;
  updated: string;
}

interface ApiTicket extends ApiTicketRow {
  thread: { id: number; from: 'requester' | 'support'; name: string; text: string; at: string }[];
}

const TICKET_STATUS: Record<ApiTicketRow['status'], SupportTicket['status']> = { open: 'open', in_progress: 'in-progress', waiting: 'in-progress', resolved: 'resolved', closed: 'resolved' };
const PRIORITY: Record<string, string> = { low: 'Low', medium: 'Normal', high: 'High', urgent: 'Urgent' };

export const toTicket = (t: ApiTicket): SupportTicket => ({
  id: t.id,
  subject: t.subject,
  status: TICKET_STATUS[t.status] ?? 'open',
  priority: PRIORITY[t.priority.toLowerCase()] ?? t.priority,
  created: stampOf(t.created),
  updated: stampOf(t.updated),
  thread: t.thread.map((m): TicketMessage => ({ from: m.from === 'support' ? 'support' : 'doctor', at: shortStampOf(m.at), ...(m.from === 'support' ? { name: m.name } : {}), text: m.text })),
});

/** The ten most recent tickets, each with its thread (the screens open them directly). */
export async function loadTickets(): Promise<void> {
  const page = await api.get<{ rows: ApiTicketRow[] }>('me/support-tickets?page=1&limit=10');
  const tickets = await Promise.all(page.rows.map((r) => api.get<ApiTicket>(`me/support-tickets/${encodeURIComponent(r.id)}`)));
  useSupport.setState({ tickets: tickets.map(toTicket) });
}

export async function loadTicket(id: string): Promise<SupportTicket> {
  const t = toTicket(await api.get<ApiTicket>(`me/support-tickets/${encodeURIComponent(id)}`));
  useSupport.setState((s) => ({ tickets: s.tickets.some((x) => x.id === id) ? s.tickets.map((x) => (x.id === id ? t : x)) : [t, ...s.tickets] }));
  return t;
}

/* ------------------------------------------------------------------ Domain */

/**
 * The account, loaded at sign-in and on launch. Verification first: everything past it
 * (earnings, bank) belongs to an approved doctor, and is skipped quietly before then.
 */
/** The server's names for the settings screen's switches (GET/PUT /me/preferences). */
export const PREFERENCE_KEYS = {
  apptBooked: 'appointmentBooked',
  patientWaiting: 'patientWaiting',
  apptCancelled: 'appointmentCancelled',
  reportUploaded: 'reportUploaded',
  payoutCredited: 'payoutCredited',
  productUpdates: 'productUpdates',
} as const;

interface ApiPreferences {
  language?: string;
  security?: { biometricLock?: boolean };
  notifications?: Partial<Record<(typeof PREFERENCE_KEYS)[keyof typeof PREFERENCE_KEYS], boolean>>;
}

/** The doctor's notification switches, biometric lock and language, saved on the server. */
export async function loadPreferences(): Promise<void> {
  const p = await api.get<ApiPreferences>('me/preferences');
  const next: Partial<Record<string, boolean | string>> = {};
  for (const [local, remote] of Object.entries(PREFERENCE_KEYS)) {
    const v = p.notifications?.[remote];
    if (typeof v === 'boolean') next[local] = v;
  }
  if (typeof p.security?.biometricLock === 'boolean') next.biometricLock = p.security.biometricLock;
  if (p.language) next.language = p.language;
  useSettings.setState(next);
}

export async function loadAccount(): Promise<void> {
  await Promise.all([loadProfile(), loadVerification()]);
  await Promise.all([loadEarnings().catch(() => undefined), loadBank().catch(() => undefined), loadNotifications(), loadTickets(), loadPreferences().catch(() => undefined)]);
}

export function clearAccount() {
  useDoctor.setState({ profile: EMPTY_PROFILE, qualifications: [] });
  useVerification.setState({ status: 'pending', serverStatus: 'draft', canSubmit: false, missingItems: [], submitted: '', expected: '', rejectionReason: '', declared: EMPTY_DECLARED, documents: [], uploadError: null });
  useEarnings.setState({ summary: EMPTY_SUMMARY, rows: [], payout: EMPTY_PAYOUT });
  useBank.setState({ bank: EMPTY_BANK, hasAccount: false, failure: null });
  useNotifications.setState({ items: [] });
  useSupport.setState({ tickets: [] });
}

registerDomain({ name: 'account', load: loadAccount, clear: clearAccount });

