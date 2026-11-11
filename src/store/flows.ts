import { services } from '../services';
import { unresolvedConflicts } from '../domain/allergy';
import type { Appointment, BankUpdate, Prescription } from '../types';
import { addDays, longDate, recordDate, shortDate, TODAY_KEY } from '../utils/date';
import type { BlockTimeForm, FollowUpForm } from '../validation/schemas';
import { useAppointments } from './appointments';
import { blockId, useAvailability } from './availability';
import { useBank } from './bank';
import { elapsedSeconds, useConsultation } from './consultation';
import { useDoctor } from './doctor';
import { useEarnings } from './earnings';
import { useNotifications } from './notifications';
import { nextPrescriptionId, usePrescriptions } from './prescriptions';
import { useRecords } from './records';
import { useSelection } from './selection';
import { affectedByBlock, blockedDayKeys } from './selectors';

export const apptOf = (id: string) => useAppointments.getState().appointments.find((a) => a.id === id);

/* ------------------------------------------------------------ Schedule */

export function selectAppointment(apptId: string) {
  const a = apptOf(apptId);
  useSelection.getState().select({ apptId, patientId: a?.patientId ?? null, rxKey: apptId, viewRxId: null });
}

export function selectPatient(patientId: string) {
  useSelection.getState().select({ patientId, apptId: null });
}

export async function loadSchedule() {
  useAppointments.getState().merge(await services.appointments.list());
}

export function setOnDuty(on: boolean) {
  useAppointments.getState().setOnDuty(on).catch(() => undefined);
}

/** A patient request has to be accepted before it behaves like a booked visit. */
export function acceptRequest(apptId: string) {
  useAppointments.getState().acceptRequest(apptId);
}

/** Where tapping Join / Start lands, given the consultation mode. */
export const roomFor = (appt: Pick<Appointment, 'mode'>) => (appt.mode === 'clinic' ? 'dr-inperson' : 'dr-waiting-room');

/** Starts the clock and returns the screen the consultation happens on. */
export function beginConsultation(apptId: string): string {
  const appt = apptOf(apptId);
  selectAppointment(apptId);
  useAppointments.getState().patch(apptId, { status: 'in-progress', requested: false });
  useConsultation.getState().startCall(apptId);
  if (!appt) return 'dr-video-call';
  return appt.mode === 'audio' ? 'dr-audio-call' : appt.mode === 'clinic' ? 'dr-workspace' : 'dr-video-call';
}

export function markNoShow(apptId: string) {
  const a = apptOf(apptId);
  if (!a) return;
  useAppointments.getState().setStatus(apptId, 'no-show', 'Patient did not join').catch(() => undefined);
  useConsultation.getState().clearActive();
}

export function cancelAppointment(apptId: string) {
  const a = apptOf(apptId);
  if (!a) return;
  useAppointments.getState().setStatus(apptId, 'cancelled', 'Cancelled by you').catch(() => undefined);
}

export async function rescheduleAppointment(apptId: string, target: { key: string; label: string; time: string }): Promise<string | null> {
  const state = useAppointments.getState();
  const clash = state.appointments.some(
    (a) => a.id !== apptId && a.dateKey === target.key && a.time.replace(/^0/, '') === target.time.replace(/^0/, '') && a.status !== 'cancelled',
  );
  if (clash) return 'You already have a patient at that time.';
  if (blockedDayKeys(useAvailability.getState().blocked).has(target.key)) return 'That day is blocked in your availability.';
  await state.reschedule(apptId, target);
  return null;
}

export async function notifyRunningLate() {
  await services.appointments.notifyRunningLate(22);
  useAppointments.getState().dismissAction('pa0');
}

export async function blockTime(form: BlockTimeForm) {
  const { fromKey, toKey, allDay, from, to, reason, note } = form;
  const affected = affectedByBlock(useAppointments.getState().appointments, { fromKey, toKey, allDay, from, to });
  const label = note.trim() || `${reason} block`;
  const date = fromKey === toKey ? longDate(fromKey) : `${shortDate(fromKey).split(' ')[0]} – ${shortDate(toKey)} ${toKey.slice(0, 4)}`;
  await useAvailability.getState().addBlock({
    id: blockId(),
    reason,
    label,
    date,
    time: allDay ? 'All day' : `${from} – ${to}`,
    fromKey,
    toKey,
    allDay,
    from: allDay ? undefined : from,
    to: allDay ? undefined : to,
    note: note.trim() || undefined,
  });
  affected.forEach((a) => useAppointments.getState().setStatus(a.id, 'cancelled', `Cancelled — you blocked ${date}`).catch(() => undefined));
  if (affected.length) {
    useNotifications.getState().add({ category: 'Appointments', title: 'Patients notified of your block', body: `${affected.length} appointments moved · next available slots offered` });
  }
  return affected;
}

/* ------------------------------------------------------- Prescriptions */

export function openPrescriptionForPatient(patientId: string) {
  const key = `pt:${patientId}`;
  useSelection.getState().select({ patientId, rxKey: key, viewRxId: null });
  usePrescriptions.getState().ensureDraft(key, { patientId });
  return key;
}

/** Makes sure a prescription draft exists for the consultation being written. */
export function ensureRxDraft(key: string) {
  const appt = apptOf(key);
  if (appt) {
    const diagnosis = useConsultation.getState().draftFor(key).diagnosis;
    usePrescriptions.getState().ensureDraft(key, { patientId: appt.patientId, apptId: appt.id, diagnosis });
  }
}

export type SendResult =
  | { ok: true; rx: Prescription }
  | { ok: false; reason: 'missing' | 'empty' | 'failed' }
  | { ok: false; reason: 'allergy'; unresolved: ReturnType<typeof unresolvedConflicts> };

/** The allergy gate runs here too, so no path can send past an unresolved conflict. */
export async function sendPrescription(key: string): Promise<SendResult> {
  const rxState = usePrescriptions.getState();
  const rx = rxState.drafts[key];
  if (!rx) return { ok: false, reason: 'missing' };
  if (rx.medicines.length === 0) return { ok: false, reason: 'empty' };
  const records = useRecords.getState();
  const patient = records.patientById(rx.patientId);
  const unresolved = unresolvedConflicts(rx.medicines, patient.allergies);
  if (unresolved.length) return { ok: false, reason: 'allergy', unresolved };

  try {
    await services.prescriptions.send(rx);
  } catch {
    rxState.updateDraft(key, { status: 'failed' });
    return { ok: false, reason: 'failed' };
  }

  const issuedId = rxState.docs[rx.id] ? nextPrescriptionId() : rx.id;
  const sent: Prescription = { ...rx, id: issuedId, status: 'sent' };
  rxState.addSent(sent, {
    id: issuedId,
    patientId: rx.patientId,
    date: rx.date,
    title: rx.diagnosis[0] ?? 'Prescription',
    items: rx.medicines.length,
    status: 'active',
  });

  const appt = rx.apptId ? apptOf(rx.apptId) : undefined;
  const active = useConsultation.getState().active;
  const seconds = active && appt && active.apptId === appt.id ? elapsedSeconds(active, Date.now()) : 0;
  records.addHistory({
    id: `h-${issuedId}`,
    patientId: rx.patientId,
    date: recordDate(TODAY_KEY),
    mode: appt?.mode ?? 'clinic',
    summary: rx.diagnosis[0] ?? 'Prescription issued',
    duration: `${Math.max(1, Math.round(seconds / 60))} min`,
    rxId: issuedId,
  });
  records.patchPatient(rx.patientId, { lastConsult: recordDate(TODAY_KEY), consults: patient.consults + 1 });

  if (appt && appt.status !== 'completed') {
    useAppointments.getState().setStatus(appt.id, 'completed').catch(() => undefined);
    useEarnings.getState().recordConsultation({ apptId: appt.id, patient: patient.name, mode: appt.mode, fee: appt.fee });
  }
  useConsultation.getState().endCall();
  if (patient.name === 'Sunita Rao') useAppointments.getState().dismissAction('pa1');
  return { ok: true, rx: sent };
}

/** Confirms the follow-up, placing it on the calendar when one is required. */
export function scheduleFollowUp(key: string, form: FollowUpForm, dateKey?: string) {
  const state = usePrescriptions.getState();
  const rx = state.drafts[key];
  if (!rx) return;
  const followUp = { required: form.required, date: form.date, mode: form.mode, note: form.note, scheduled: form.required };
  state.updateDraft(key, { followUp });
  if (!form.required) return;
  const targetKey = dateKey ?? addDays(TODAY_KEY, 28);
  const fee = useDoctor.getState().fee(form.mode);
  useAppointments.getState().addAppointment({
    id: `KDC-AP-${Date.now().toString().slice(-5)}`,
    patientId: rx.patientId,
    mode: form.mode,
    time: '10:00 AM',
    endTime: '10:15 AM',
    date: longDate(targetKey),
    dateKey: targetKey,
    status: 'upcoming',
    reason: form.note || 'Follow-up review',
    fee,
    isFollowUp: true,
  });
  const records = useRecords.getState();
  records.patchPatient(rx.patientId, { nextAppointment: form.date, followUpDue: false });
  if (records.patientById(rx.patientId).name === 'Lakshmi Narayan') useAppointments.getState().dismissAction('pa3');
}

/* ----------------------------------------------------------------- Bank */

export type BankSaveResult = 'verifying' | 'name-mismatch';

/** Bank rejects a credit when the holder differs from the PAN name, so the payout fails. */
export async function saveBankDetails(update: BankUpdate): Promise<BankSaveResult> {
  const bank = useBank.getState();
  const panHolder = bank.bank.panHolder;
  await bank.update(update);
  const earnings = useEarnings.getState();
  if (update.holder.trim().toLowerCase() !== panHolder.trim().toLowerCase()) {
    const b = useBank.getState().bank;
    earnings.failPayout({
      amount: earnings.payout.available,
      attempted: `${recordDate(TODAY_KEY)}, 6:30 PM`,
      account: `${b.name.split(' ')[0]} •••• ${b.account.slice(-4)}`,
      reason: 'Name mismatch',
    });
    return 'name-mismatch';
  }
  earnings.clearFailedPayout();
  return 'verifying';
}
