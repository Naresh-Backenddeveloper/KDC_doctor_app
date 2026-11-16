/**
 * Live versions of the schedule flows in store/flows.ts (same names and signatures).
 * Each asks the server to do it and then reloads what changed, instead of changing
 * the stores by itself: the server's rules (refunds, notices, blocks cancelling
 * appointments, no-show timing) decide.
 */
import type { Appointment } from '../../types';
import type { BlockTimeForm } from '../../validation/schemas';
import { useAppointments } from '../../store/appointments';
import { useConsultation } from '../../store/consultation';
import { useSelection } from '../../store/selection';
import { showToast } from '../../store/toast';
import { minutesOf, TODAY_KEY } from '../../utils/date';
import { ServiceError } from '../mock';
import { addBlockLive } from './availability';
import { api } from './http';
import { loadAppointments, loadBlocks, loadSchedule as loadAll } from './sync-schedule';

const apptOf = (id: string) => useAppointments.getState().appointments.find((a) => a.id === id);
const messageOf = (e: unknown, fallback: string) => (e instanceof ServiceError || e instanceof Error ? e.message : fallback);
const refresh = () => loadAppointments().catch(() => undefined);

export async function loadSchedule() {
  await loadAll();
}

/** "On duty" is the server's; the switch moves at once and goes back if the server says no. */
export function setOnDuty(on: boolean) {
  const before = useAppointments.getState().onDuty;
  useAppointments.setState({ onDuty: on });
  api.put('doctor/duty', { onDuty: on }).catch((e) => {
    useAppointments.setState({ onDuty: before });
    showToast(messageOf(e, 'Couldn’t change your duty status'), 'critical');
  });
}

/** No app creates patient requests yet (the server has no accept step); this only clears the badge. */
export function acceptRequest(apptId: string) {
  useAppointments.getState().patch(apptId, { requested: false });
}

/**
 * Starts (or rejoins) the consultation on the server: the appointment becomes in
 * progress. Returns the screen the consultation happens on. There's no video
 * provider yet (decision D5), so the call screens show the call without media.
 */
export function beginConsultation(apptId: string): string {
  const appt = apptOf(apptId);
  useSelection.getState().select({ apptId, patientId: appt?.patientId ?? null, rxKey: apptId, viewRxId: null });
  useAppointments.getState().patch(apptId, { status: 'in-progress', requested: false });
  useConsultation.getState().startCall(apptId);
  api.post(`doctor/consultations/${encodeURIComponent(apptId)}/start`, {}).then(refresh, (e) => {
    showToast(messageOf(e, 'Couldn’t start the consultation'), 'critical');
    refresh();
  });
  if (!appt) return 'dr-video-call';
  return appt.mode === 'audio' ? 'dr-audio-call' : appt.mode === 'clinic' ? 'dr-workspace' : 'dr-video-call';
}

/** The server allows it from Settings → noShowAfterMinutes after the start, if the consultation never began. */
export function markNoShow(apptId: string) {
  if (!apptOf(apptId)) return;
  useConsultation.getState().clearActive();
  api.post(`doctor/appointments/${encodeURIComponent(apptId)}/no-show`, {}).then(refresh, (e) => {
    showToast(messageOf(e, 'Couldn’t mark the no-show'), 'critical');
    refresh();
  });
}

/** The patient is refunded in full and told. */
export function cancelAppointment(apptId: string) {
  if (!apptOf(apptId)) return;
  api.post(`doctor/appointments/${encodeURIComponent(apptId)}/cancel`, { reason: 'Cancelled by the doctor' }).then(refresh, (e) => {
    showToast(messageOf(e, 'Couldn’t cancel the appointment'), 'critical');
    refresh();
  });
}

/** Any free, unblocked future time; the server says why not otherwise. */
export async function rescheduleAppointment(apptId: string, target: { key: string; label: string; time: string }): Promise<string | null> {
  const m = minutesOf(target.time);
  const time = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  try {
    await api.post(`doctor/appointments/${encodeURIComponent(apptId)}/reschedule`, { date: target.key, time });
  } catch (e) {
    return messageOf(e, 'Couldn’t move the appointment');
  }
  await refresh();
  return null;
}

/** How far behind the first of today's patients who should have been seen by now is. */
function minutesBehind(now = new Date()): number {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const overdue = useAppointments.getState().appointments.filter((a) => a.dateKey === TODAY_KEY && a.status === 'upcoming' && minutesOf(a.time) < nowMin);
  if (!overdue.length) return 15;
  return Math.min(120, Math.max(5, Math.round((nowMin - Math.min(...overdue.map((a) => minutesOf(a.time)))) / 5) * 5));
}

/** Tells today's waiting patients the doctor is running late (the server notifies them). */
export async function notifyRunningLate() {
  await api.put('doctor/running-late', { minutes: minutesBehind() });
  useAppointments.getState().dismissAction('pa0');
  await refresh();
}

/**
 * Time off. The server cancels and refunds the appointments inside it and notifies
 * those patients; the affected ones are returned for the confirmation screen.
 */
export async function blockTime(form: BlockTimeForm): Promise<Appointment[]> {
  const { fromKey, toKey, allDay, from, to, reason, note } = form;
  const result = await addBlockLive({
    id: '',
    reason,
    label: note.trim() || `${reason} block`,
    date: '',
    time: '',
    fromKey,
    toKey,
    allDay,
    ...(allDay ? {} : { from, to }),
    ...(note.trim() ? { note: note.trim() } : {}),
  });
  const before = useAppointments.getState().appointments;
  const affected = before.filter((a) => result.cancelledAppointments.includes(a.id));
  await Promise.all([loadBlocks(), refresh()]);
  return affected;
}
