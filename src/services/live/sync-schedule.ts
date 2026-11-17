/**
 * Live builds: the doctor's schedule from the backend into the stores: appointments
 * (today, upcoming, recent completed and cancelled), duty, weekly availability and
 * blocks. Ids: an appointment is its booking code; a patient is the backend memberId.
 */
import { upsertPatientStub } from './sync-records';
import type { Appointment, ApptStatus, BlockedTime, Mode, PendingAction, WorkingDay } from '../../types';
import { useAppointments } from '../../store/appointments';
import { useAvailability } from '../../store/availability';
import { useConsultation } from '../../store/consultation';
import { longDate, minutesOf, shortDate, timeLabel, TODAY_KEY } from '../../utils/date';
import { api } from './http';
import { registerDomain } from './sync';

/* ------------------------------------------------------------- Shapes */

export interface ApiAppointment {
  code: string;
  status: 'pending_payment' | 'requested' | 'confirmed' | 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  mode: Mode;
  date: string;
  time: string;
  endTime: string;
  startsAt: string;
  isFollowUp: boolean;
  reason: string | null;
  lateMinutes: number | null;
  prescriptionCode: string | null;
  patient: { memberId: number | null; name: string; age: number | null; gender: string | null; relation: string | null };
  fee: number;
  requested: boolean;
}

interface ApiSchedule {
  slotMinutes: number;
  breakFrom: string | null;
  breakTo: string | null;
  onDuty: boolean;
  days: { weekday: number; on: boolean; sessions: { from: string; to: string }[]; modes: Mode[] }[];
}

export interface ApiBlock {
  id: number;
  reason: string;
  fromDate: string;
  toDate: string;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  note: string | null;
}

interface Paged<T> {
  rows: T[];
  total: number;
}

/* ------------------------------------------------------------ Mapping */

/** "13:30" → "01:30 PM" (the app's time label). */
export const from24 = (hhmm: string) => timeLabel(Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5)));
/** "01:30 PM" → "13:30". */
export const to24 = (label: string) => {
  const m = minutesOf(label);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

const STATUS: Record<ApiAppointment['status'], ApptStatus> = {
  pending_payment: 'upcoming',
  requested: 'upcoming',
  confirmed: 'upcoming',
  waiting: 'waiting',
  in_progress: 'in-progress',
  completed: 'completed',
  cancelled: 'cancelled',
  no_show: 'no-show',
};

/** "Today, 16 Nov 2026" for today (as the blueprint shows), else "Wed, 18 Nov 2026". */
export const dayLabel = (key: string) => (key === TODAY_KEY ? longDate(key).replace(/^\w{3},/, 'Today,') : longDate(key));

export function toAppointment(a: ApiAppointment): Appointment {
  return {
    id: a.code,
    patientId: a.patient.memberId === null ? '' : String(a.patient.memberId),
    mode: a.mode,
    time: from24(a.time),
    endTime: from24(a.endTime),
    date: dayLabel(a.date),
    dateKey: a.date,
    status: STATUS[a.status],
    reason: a.reason ?? '',
    fee: a.fee,
    isFollowUp: a.isFollowUp,
    ...(a.status === 'requested' ? { requested: true } : {}),
  };
}

const DAYS: { day: string; short: string; weekday: number }[] = [
  { day: 'Monday', short: 'Mon', weekday: 1 },
  { day: 'Tuesday', short: 'Tue', weekday: 2 },
  { day: 'Wednesday', short: 'Wed', weekday: 3 },
  { day: 'Thursday', short: 'Thu', weekday: 4 },
  { day: 'Friday', short: 'Fri', weekday: 5 },
  { day: 'Saturday', short: 'Sat', weekday: 6 },
  { day: 'Sunday', short: 'Sun', weekday: 0 },
];

/** Monday-first, as the app lists the week; times as the app's labels. */
export function toWeek(s: ApiSchedule): WorkingDay[] {
  return DAYS.map(({ day, short, weekday }) => {
    const d = s.days.find((x) => x.weekday === weekday);
    return { day, short, on: Boolean(d?.on), sessions: (d?.sessions ?? []).map((x) => ({ from: from24(x.from), to: from24(x.to) })), modes: d?.modes ?? [] };
  });
}

export const weekdayOf = (short: string) => DAYS.find((d) => d.short === short)?.weekday ?? 0;

const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function toBlock(b: ApiBlock): BlockedTime {
  const reason = title(b.reason);
  const date = b.fromDate === b.toDate ? longDate(b.fromDate) : `${shortDate(b.fromDate).split(' ')[0]} – ${shortDate(b.toDate)} ${b.toDate.slice(0, 4)}`;
  const from = b.startTime ? from24(b.startTime) : undefined;
  const to = b.endTime ? from24(b.endTime) : undefined;
  return {
    id: String(b.id),
    reason,
    label: b.note?.trim() || `${reason} block`,
    date,
    time: b.allDay ? 'All day' : `${from} – ${to}`,
    fromKey: b.fromDate,
    toKey: b.toDate,
    allDay: b.allDay,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(b.note ? { note: b.note } : {}),
  };
}

/**
 * The home screen's "Pending actions", from live data: running behind on today's list,
 * and reports awaiting review (the home screen fills in the count from the records store).
 */
export function pendingFrom(appts: Appointment[], now = new Date()): PendingAction[] {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const overdue = appts.filter((a) => a.dateKey === TODAY_KEY && a.status === 'upcoming' && minutesOf(a.time) + 10 < nowMin);
  const actions: PendingAction[] = [];
  if (overdue.length) {
    const behind = nowMin - Math.min(...overdue.map((a) => minutesOf(a.time)));
    actions.push({ id: 'pa0', kind: 'followup', title: `Running ${behind} minutes behind`, body: `${overdue.length} patient${overdue.length > 1 ? 's' : ''} affected · notify them of the new times`, action: 'Review', screen: 'dr-st-running-late' });
  }
  actions.push({ id: 'pa2', kind: 'report', title: 'Reports awaiting review', body: 'Lab reports from your patients', action: 'Review', screen: 'dr-reports' });
  return actions;
}

/* ------------------------------------------------------------ Loaders */

async function pages(scope: string, max: number): Promise<ApiAppointment[]> {
  const out: ApiAppointment[] = [];
  for (let page = 1; out.length < max; page++) {
    const r = await api.get<Paged<ApiAppointment>>(`doctor/appointments?scope=${scope}&page=${page}&limit=100`);
    out.push(...r.rows);
    if (out.length >= r.total || !r.rows.length) break;
  }
  return out.slice(0, max);
}

/** Today, what's coming, and the recent past (completed, cancelled). */
export async function loadAppointments(): Promise<Appointment[]> {
  const [today, upcoming, completed, cancelled] = await Promise.all([pages('today', 200), pages('upcoming', 300), pages('completed', 200), pages('cancelled', 100)]);
  const seen = new Set<string>();
  const rows = [...today, ...upcoming, ...completed, ...cancelled].filter((a) => !seen.has(a.code) && seen.add(a.code));
  // Every booked patient has a name on the schedule, even before their record is opened.
  for (const a of rows) if (a.patient.memberId !== null) upsertPatientStub({ id: String(a.patient.memberId), name: a.patient.name, age: a.patient.age, gender: a.patient.gender });
  const appointments = rows.map(toAppointment);
  useAppointments.setState({ appointments, heldRequests: [], pendingActions: pendingFrom(appointments) });
  return appointments;
}

export async function loadAvailability(): Promise<void> {
  const s = await api.get<ApiSchedule>('doctor/availability');
  const week = toWeek(s);
  const offered = [...new Set(week.flatMap((d) => d.modes))];
  useAvailability.setState({
    week,
    duration: s.slotMinutes,
    // No break saved: none is shown (patients can book those hours), and saving keeps it that way.
    breakFrom: s.breakFrom ? from24(s.breakFrom) : '',
    breakTo: s.breakTo ? from24(s.breakTo) : '',
    modesOffered: offered.length ? offered : ['video', 'audio', 'clinic'],
  });
  useAppointments.setState({ onDuty: s.onDuty });
}

export async function loadBlocks(): Promise<void> {
  const blocks = await api.get<ApiBlock[]>('doctor/blocks');
  useAvailability.setState({ blocked: blocks.map(toBlock) });
}

/** Everything the schedule screens show. */
export async function loadSchedule(): Promise<void> {
  await Promise.all([loadAppointments(), loadAvailability(), loadBlocks()]);
}

const EMPTY_WEEK: WorkingDay[] = DAYS.map(({ day, short }) => ({ day, short, on: false, sessions: [], modes: [] }));

registerDomain({
  name: 'schedule',
  load: loadSchedule,
  clear: () => {
    useAppointments.setState({ appointments: [], heldRequests: [], pendingActions: [], onDuty: false });
    useAvailability.setState({ week: EMPTY_WEEK, blocked: [] });
    useConsultation.setState({ drafts: {}, active: null });
  },
});
