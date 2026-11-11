import { launchImageLibrary } from 'react-native-image-picker';
import { useAppointments } from '../src/store/appointments';
import { useAvailability } from '../src/store/availability';
import { useBank } from '../src/store/bank';
import { useConsultation } from '../src/store/consultation';
import { useDoctor } from '../src/store/doctor';
import { useEarnings, filterEarnings, earningDates } from '../src/store/earnings';
import { acceptRequest, beginConsultation, blockTime, cancelAppointment, ensureRxDraft, loadSchedule, markNoShow, notifyRunningLate, openPrescriptionForPatient, rescheduleAppointment, roomFor, saveBankDetails, scheduleFollowUp, selectAppointment, sendPrescription, setOnDuty } from '../src/store/flows';
import { useNotifications } from '../src/store/notifications';
import { usePrescriptions } from '../src/store/prescriptions';
import { filterPatients, useRecords, countAwaiting } from '../src/store/records';
import { useSelection } from '../src/store/selection';
import { affectedByBlock, appointmentsForTab, bookedThisWeek, NO_FILTERS, nextUpcoming, slotSummary, summarize, tabCount, todaysAppointments } from '../src/store/selectors';
import { useSession } from '../src/store/session';
import { useSettings } from '../src/store/settings';
import { useSupport } from '../src/store/support';
import { useVerification } from '../src/store/verification';
import { pickDocument } from '../src/platform/imagePicker';
import { toPrescribed } from '../src/domain/medicines';
import { MEDICINE_CATALOG } from '../src/mock-data/medicines';
import { DEFAULT_APPT_ID, seed, seedDraftRx } from '../src/mock-data/seed';
import { injectFailure, mockControl } from '../src/services';
import { maskAccount, maskPan } from '../src/services/earnings';
import { formatSize } from '../src/services/verification';

const initial = new Map<any, any>();
const stores = [useSession, useVerification, useDoctor, useAppointments, useRecords, useConsultation, usePrescriptions, useAvailability, useEarnings, useBank, useNotifications, useSettings, useSupport];

beforeAll(() => {
  mockControl.latency = 0;
  stores.forEach((s: any) => initial.set(s, s.getState()));
});

beforeEach(() => {
  stores.forEach((s: any) => s.setState(initial.get(s), true));
  useSelection.getState().reset();
});

describe('session', () => {
  it('logs in, verifies the OTP and persists the session', async () => {
    const s = useSession.getState();
    await s.requestOtp('98490 11204', 'Kdc@doctor');
    expect(useSession.getState().otpMobile).toBe('9849011204');
    await useSession.getState().verifyOtp('123456');
    expect(useSession.getState().token).toBeTruthy();
    const stored = await useSession.persist.getOptions().storage!.getItem('session');
    expect((stored as any).state.token).toBeTruthy();
    expect((stored as any).state.otpMobile).toBeUndefined();
  });

  it('rejects OTP 000000 without creating a session', async () => {
    useSession.setState({ otpMobile: '9849011204' });
    await expect(useSession.getState().verifyOtp('000000')).rejects.toThrow(/not valid/);
    expect(useSession.getState().token).toBeNull();
  });

  it('surfaces a wrong password as a field error', async () => {
    await expect(useSession.getState().requestOtp('9849011204', 'wrong-password')).rejects.toMatchObject({ field: 'password' });
  });

  it('clears the session on logout', async () => {
    useSession.setState({ token: 't', mobile: 'm' });
    useSession.getState().logout();
    expect(useSession.getState().token).toBeNull();
  });
});

describe('verification and uploads', () => {
  const asset = { didCancel: false, assets: [{ fileName: 'id.jpg', fileSize: 204800, uri: 'file:///id.jpg' }] };

  it('runs mock progress and moves a document into review', async () => {
    const seen: number[] = [];
    const unsub = useVerification.subscribe((st) => {
      const p = st.documents.find((d) => d.id === 'd4')?.progress;
      if (p !== undefined) seen.push(p);
    });
    await useVerification.getState().upload('d4', { name: 'id.jpg', size: 204800, uri: 'x' });
    unsub();
    expect(seen).toEqual(expect.arrayContaining([0, 15, 100]));
    const doc = useVerification.getState().documents.find((d) => d.id === 'd4')!;
    expect(doc).toMatchObject({ state: 'review', file: 'id.jpg', size: '200 KB', userUploaded: true });
    expect(doc.progress).toBeUndefined();
  });

  it('removes an uploaded document', async () => {
    await useVerification.getState().upload('d4', { name: 'id.jpg', size: 1000, uri: 'x' });
    useVerification.getState().removeDocument('d4');
    expect(useVerification.getState().documents.find((d) => d.id === 'd4')).toMatchObject({ state: 'missing', file: '' });
  });

  it('handles cancel, denial, picked and errored image picks', async () => {
    const lib = launchImageLibrary as unknown as jest.Mock;
    lib.mockResolvedValueOnce({ didCancel: true });
    expect(await pickDocument()).toEqual({ status: 'cancelled' });
    lib.mockResolvedValueOnce({ errorCode: 'permission' });
    expect(await pickDocument()).toEqual({ status: 'denied' });
    lib.mockResolvedValueOnce(asset);
    expect(await pickDocument()).toMatchObject({ status: 'picked', file: { name: 'id.jpg' } });
    lib.mockResolvedValueOnce({ errorCode: 'others', errorMessage: 'boom' });
    expect(await pickDocument()).toEqual({ status: 'error', message: 'boom' });
    lib.mockRejectedValueOnce(new Error('crash'));
    expect(await pickDocument()).toEqual({ status: 'error', message: 'crash' });
  });

  it('switches status and marks the rejected document', () => {
    useVerification.getState().setStatus('approved');
    expect(useVerification.getState().status).toBe('approved');
    expect(useVerification.getState().documents.find((d) => d.id === 'd3')?.state).toBe('verified');
    useVerification.getState().setStatus('rejected');
    expect(useVerification.getState().documents.find((d) => d.id === 'd3')?.state).toBe('rejected');
    expect(useVerification.getState().rejectionReason).toMatch(/photograph/);
  });

  it('persists declared details', async () => {
    const d = { ...useVerification.getState().declared, regNo: 'TSMC/FMR/99999' };
    await useVerification.getState().saveDeclared(d);
    const stored = await useVerification.persist.getOptions().storage!.getItem('verification');
    expect((stored as any).state.declared.regNo).toBe('TSMC/FMR/99999');
  });

  it('formats file sizes', () => {
    expect(formatSize(1048576)).toBe('1.0 MB');
    expect(formatSize(204800)).toBe('200 KB');
  });
});

describe('dashboard and schedule', () => {
  it('derives the blueprint default counts', () => {
    expect(summarize(useAppointments.getState().appointments)).toEqual({ total: 12, waiting: 2, completed: 7, upcoming: 3 });
  });

  it('updates counts live as statuses change', async () => {
    await useAppointments.getState().setStatus('KDC-AP-88412', 'completed');
    expect(summarize(useAppointments.getState().appointments)).toMatchObject({ waiting: 1, completed: 8 });
  });

  it('holds requests while off duty and releases them as acceptable on return', () => {
    setOnDuty(false);
    expect(useAppointments.getState().onDuty).toBe(false);
    expect(useAppointments.getState().heldRequests).toHaveLength(3);
    setOnDuty(true);
    const waiting = todaysAppointments(useAppointments.getState().appointments).filter((a) => a.status === 'waiting');
    expect(waiting.filter((a) => a.requested)).toHaveLength(3);
    acceptRequest(waiting.find((a) => a.requested)!.id);
    expect(useAppointments.getState().appointments.filter((a) => a.requested)).toHaveLength(2);
  });

  it('filters appointment tabs and matches the blueprint counts', () => {
    const appts = useAppointments.getState().appointments;
    expect(tabCount(appts, 'today')).toBe(8);
    expect(tabCount(appts, 'upcoming')).toBe(7);
    expect(tabCount(appts, 'completed')).toBe(3);
    expect(tabCount(appts, 'cancelled')).toBe(2);
    expect(appointmentsForTab(appts, 'today', { modes: ['audio'], visit: 'all' }).every((a) => a.mode === 'audio')).toBe(true);
    expect(appointmentsForTab(appts, 'today', { ...NO_FILTERS, visit: 'followup' }).every((a) => a.isFollowUp)).toBe(true);
  });

  it('picks the next upcoming appointment, skipping the one just seen', () => {
    const appts = useAppointments.getState().appointments;
    expect(nextUpcoming(appts)?.id).toBe(DEFAULT_APPT_ID);
    expect(nextUpcoming(appts, DEFAULT_APPT_ID)?.id).toBe('KDC-AP-88437');
  });

  it('selecting an appointment sets patient and prescription context', () => {
    selectAppointment('KDC-AP-88412');
    expect(useSelection.getState()).toMatchObject({ apptId: 'KDC-AP-88412', rxKey: 'KDC-AP-88412' });
  });

  it('routes consultation start by mode', () => {
    expect(roomFor({ mode: 'video' })).toBe('dr-waiting-room');
    expect(roomFor({ mode: 'clinic' })).toBe('dr-inperson');
    expect(beginConsultation(DEFAULT_APPT_ID)).toBe('dr-video-call');
    expect(useAppointments.getState().appointments.find((a) => a.id === DEFAULT_APPT_ID)?.status).toBe('in-progress');
    expect(useConsultation.getState().active?.apptId).toBe(DEFAULT_APPT_ID);
    expect(beginConsultation('KDC-AP-88419')).toBe('dr-audio-call');
    expect(beginConsultation('KDC-AP-88437')).toBe('dr-workspace');
  });

  it('marks no-show and cancels', () => {
    markNoShow(DEFAULT_APPT_ID);
    expect(useAppointments.getState().appointments.find((a) => a.id === DEFAULT_APPT_ID)?.status).toBe('no-show');
    cancelAppointment('KDC-AP-88444');
    expect(useAppointments.getState().appointments.find((a) => a.id === 'KDC-AP-88444')?.status).toBe('cancelled');
  });

  it('reschedules, refusing a clash and a blocked day', async () => {
    expect(await rescheduleAppointment(DEFAULT_APPT_ID, { key: '2026-10-05', label: 'x', time: '06:15 PM' })).toMatch(/already/);
    expect(await rescheduleAppointment(DEFAULT_APPT_ID, { key: '2026-10-13', label: 'x', time: '09:00 AM' })).toMatch(/blocked/);
    expect(await rescheduleAppointment(DEFAULT_APPT_ID, { key: '2026-10-07', label: 'Wed, 7 Oct 2026', time: '09:00 AM' })).toBeNull();
    expect(useAppointments.getState().appointments.find((a) => a.id === DEFAULT_APPT_ID)).toMatchObject({ dateKey: '2026-10-07', status: 'upcoming' });
  });

  it('loadSchedule does not clobber local changes', async () => {
    await useAppointments.getState().setStatus(DEFAULT_APPT_ID, 'completed');
    await loadSchedule();
    expect(useAppointments.getState().appointments.find((a) => a.id === DEFAULT_APPT_ID)?.status).toBe('completed');
    expect(useAppointments.getState().appointments.filter((a) => a.id === DEFAULT_APPT_ID)).toHaveLength(1);
  });

  it('dismisses the running-late action after notifying', async () => {
    await notifyRunningLate();
    expect(useAppointments.getState().pendingActions.some((a) => a.id === 'pa0')).toBe(false);
  });

  it('searches and filters patients', () => {
    const { patients } = useRecords.getState();
    expect(filterPatients(patients, 'rahul', 'All')).toHaveLength(1);
    expect(filterPatients(patients, 'heart', 'All').length).toBeGreaterThan(0);
    expect(filterPatients(patients, '', 'Upcoming').every((p) => p.nextAppointment)).toBe(true);
    expect(filterPatients(patients, '', 'Follow-up due').length).toBe(2);
  });
});

describe('availability', () => {
  it('derives the blueprint slot summary and responds to duration', () => {
    const today = useAvailability.getState().week[0];
    expect(slotSummary(today, 15, 8)).toEqual({ total: 18, booked: 9, blocked: 2, open: 7 });
    expect(slotSummary(today, 30, 8).total).toBe(9);
  });

  it('counts this week and block-affected appointments as the blueprint states', () => {
    const appts = useAppointments.getState().appointments;
    expect(bookedThisWeek(appts)).toBe(3);
    expect(affectedByBlock(appts, { fromKey: '2026-10-12', toKey: '2026-10-14', allDay: true })).toHaveLength(4);
  });

  it('saves schedules persistently', async () => {
    const s = useAvailability.getState();
    await s.saveSchedule(s.week.map((d) => ({ ...d, on: false })), 20, s.breakFrom, s.breakTo, ['video']);
    expect(useAvailability.getState().duration).toBe(20);
    const stored = await useAvailability.persist.getOptions().storage!.getItem('availability');
    expect((stored as any).state.duration).toBe(20);
  });

  it('blocking time cancels and returns the named affected patients', async () => {
    const affected = await blockTime({ reason: 'Leave', fromKey: '2026-10-12', toKey: '2026-10-14', allDay: true, from: '', to: '', note: 'Conference' });
    expect(affected.map((a) => a.id)).toEqual(['KDC-AP-88511', 'KDC-AP-88512', 'KDC-AP-88513', 'KDC-AP-88514']);
    expect(useAppointments.getState().appointments.find((a) => a.id === 'KDC-AP-88511')?.status).toBe('cancelled');
    expect(useAvailability.getState().blocked.some((b) => b.label === 'Conference')).toBe(true);
    expect(useNotifications.getState().items[0].title).toMatch(/notified/);
  });

  it('partial-day blocks only affect overlapping appointments', () => {
    const appts = useAppointments.getState().appointments;
    expect(affectedByBlock(appts, { fromKey: '2026-10-12', toKey: '2026-10-12', allDay: false, from: '09:00 AM', to: '11:00 AM' }).map((a) => a.id)).toEqual(['KDC-AP-88511']);
  });
});

describe('consultation drafts', () => {
  it('saves and persists a notes draft by appointment', async () => {
    await useConsultation.getState().saveDraft('KDC-AP-88412', { chiefComplaint: 'Fatigue', symptoms: ['Fatigue'], observations: '', assessment: '', diagnosis: [], advice: [], vitals: { bp: '', pulse: '', weight: '', spo2: '' } });
    expect(useConsultation.getState().draftFor('KDC-AP-88412').chiefComplaint).toBe('Fatigue');
    const stored = await useConsultation.persist.getOptions().storage!.getItem('consultation');
    expect((stored as any).state.drafts['KDC-AP-88412'].symptoms).toEqual(['Fatigue']);
  });

  it('keeps the seeded default draft intact for the default appointment', () => {
    expect(useConsultation.getState().draftFor(DEFAULT_APPT_ID).vitals.bp).toBe('148/94');
  });

  it('call controls toggle and the clock freezes at end', () => {
    useConsultation.getState().startCall(DEFAULT_APPT_ID);
    useConsultation.getState().toggleMic();
    useConsultation.getState().toggleCamera();
    useConsultation.getState().toggleSpeaker();
    expect(useConsultation.getState()).toMatchObject({ mic: false, camera: false, speaker: false });
    useConsultation.getState().endCall();
    expect(useConsultation.getState().active?.endedAt).toBeDefined();
  });
});

describe('prescription send (critical)', () => {
  const mox = () => toPrescribed(MEDICINE_CATALOG.find((m) => m.id === 'm14')!);
  const rxState = () => usePrescriptions.getState();
  const key = DEFAULT_APPT_ID;

  it('blocks sending a medicine that conflicts with a recorded allergy', async () => {
    rxState().saveMedicine(key, mox());
    const result = await sendPrescription(key);
    expect(result).toMatchObject({ ok: false, reason: 'allergy' });
    expect(rxState().drafts[key].status).toBe('draft');
    expect(useRecords.getState().history.filter((h) => h.patientId === seed.patients()[0].id)).toHaveLength(seed.history().filter((h) => h.patientId === seed.patients()[0].id).length);
  });

  it('sends once the allergy is explicitly overridden with a reason', async () => {
    rxState().saveMedicine(key, { ...mox(), allergyOverride: { allergens: ['Penicillin'], reason: 'No alternative available', at: 'now' } });
    expect((await sendPrescription(key)).ok).toBe(true);
  });

  it('adds a sent prescription to the patient history and closes the appointment', async () => {
    const patientId = seed.patients()[0].id;
    const before = rxState().summaries.filter((r) => r.patientId === patientId).length;
    const beforeConsults = useRecords.getState().patientById(patientId).consults;
    const earningsBefore = useEarnings.getState().summary.today;
    beginConsultation(key);
    const result = await sendPrescription(key);
    expect(result.ok).toBe(true);
    expect(rxState().summaries.filter((r) => r.patientId === patientId)).toHaveLength(before + 1);
    expect(useRecords.getState().history[0]).toMatchObject({ patientId });
    expect(useRecords.getState().patientById(patientId).consults).toBe(beforeConsults + 1);
    expect(useAppointments.getState().appointments.find((a) => a.id === key)?.status).toBe('completed');
    expect(useEarnings.getState().summary.today).toBe(earningsBefore + 800);
    expect(rxState().drafts[key].status).toBe('sent');
  });

  it('keeps the draft and reports failure when sending fails, then retries', async () => {
    injectFailure('prescriptions.send');
    const failed = await sendPrescription(key);
    expect(failed).toMatchObject({ ok: false, reason: 'failed' });
    expect(rxState().drafts[key].status).toBe('failed');
    expect(rxState().drafts[key].medicines).toHaveLength(2);
    expect((await sendPrescription(key)).ok).toBe(true);
  });

  it('refuses an empty prescription', async () => {
    rxState().updateDraft(key, { medicines: [] });
    expect(await sendPrescription(key)).toMatchObject({ ok: false, reason: 'empty' });
  });

  it('adds, edits and removes medicines on a draft', () => {
    rxState().saveMedicine(key, mox());
    expect(rxState().drafts[key].medicines).toHaveLength(3);
    rxState().saveMedicine(key, { ...mox(), dosage: '2 tablets' }, 2);
    expect(rxState().drafts[key].medicines[2].dosage).toBe('2 tablets');
    rxState().removeMedicine(key, 2);
    expect(rxState().drafts[key].medicines).toHaveLength(2);
  });

  it('creates fresh drafts for other appointments and patients', () => {
    ensureRxDraft('KDC-AP-88412');
    expect(rxState().drafts['KDC-AP-88412'].medicines).toEqual([]);
    const pKey = openPrescriptionForPatient(seed.patients()[3].id);
    expect(rxState().drafts[pKey].patientId).toBe(seed.patients()[3].id);
    expect(useSelection.getState().rxKey).toBe(pKey);
  });

  it('never exposes the seeded draft as mutated across tests', () => {
    expect(seedDraftRx().medicines).toHaveLength(2);
  });

  it('schedules a follow-up onto the calendar', () => {
    const before = useAppointments.getState().appointments.length;
    scheduleFollowUp(key, { required: true, date: 'Mon, 12 Oct 2026', mode: 'audio', note: 'Review' }, '2026-10-12');
    const added = useAppointments.getState().appointments;
    expect(added).toHaveLength(before + 1);
    expect(added[added.length - 1]).toMatchObject({ dateKey: '2026-10-12', mode: 'audio', isFollowUp: true, status: 'upcoming' });
    expect(rxState().drafts[key].followUp.scheduled).toBe(true);
  });

  it('records no calendar entry when follow-up is not required', () => {
    const before = useAppointments.getState().appointments.length;
    scheduleFollowUp(key, { required: false, date: '', mode: 'video', note: '' });
    expect(useAppointments.getState().appointments).toHaveLength(before);
  });
});

describe('reports', () => {
  it('marks a report reviewed and updates the awaiting count', async () => {
    expect(countAwaiting(useRecords.getState().reports)).toBe(2);
    await useRecords.getState().markReportReviewed('KDC-LR-77210', 'Increase statin');
    const r = useRecords.getState().reports.find((x) => x.id === 'KDC-LR-77210');
    expect(r).toMatchObject({ status: 'reviewed', note: 'Increase statin' });
    expect(countAwaiting(useRecords.getState().reports)).toBe(1);
  });
});

describe('earnings and bank', () => {
  it('filters earnings by period and status', () => {
    const { rows } = useEarnings.getState();
    expect(filterEarnings(rows, 'This month').every((r) => r.date.endsWith('Oct 2026'))).toBe(true);
    expect(filterEarnings(rows, 'Last month').every((r) => r.date.includes('Sep'))).toBe(true);
    expect(filterEarnings(rows, 'Processing').every((r) => r.status === 'processing')).toBe(true);
    expect(filterEarnings(rows, 'No-shows').every((r) => r.status === 'no-show')).toBe(true);
    expect(earningDates(filterEarnings(rows, 'This month'))).toEqual(['05 Oct 2026', '04 Oct 2026', '03 Oct 2026']);
  });

  it('masks and stores only the masked account', async () => {
    const result = await saveBankDetails({ holder: 'Arjun Mehta', accountNumber: '123456789012', ifsc: 'ICIC0000123', type: 'Current', pan: 'ABCDE1234F' });
    expect(result).toBe('verifying');
    const bank = useBank.getState().bank;
    expect(bank).toMatchObject({ account: maskAccount('123456789012'), name: 'ICICI Bank', status: 'verifying', pan: maskPan('ABCDE1234F') });
    expect(JSON.stringify(bank)).not.toContain('123456789012');
    useBank.getState().markVerified();
    expect(useBank.getState().bank.status).toBe('verified');
  });

  it('fails the payout when the holder does not match the PAN name', async () => {
    const result = await saveBankDetails({ holder: 'Someone Else', accountNumber: '123456789012', ifsc: 'HDFC0001204', type: 'Savings', pan: 'ABCDE1234F' });
    expect(result).toBe('name-mismatch');
    expect(useEarnings.getState().payout.failed).toMatchObject({ reason: 'Name mismatch', amount: 41200 });
  });

  it('clears a failed payout after a matching update', async () => {
    useEarnings.getState().failPayout({ amount: 1, attempted: 'x', account: 'y', reason: 'z' });
    await saveBankDetails({ holder: 'arjun mehta', accountNumber: '123456789012', ifsc: 'HDFC0001204', type: 'Savings', pan: 'ABCDE1234F' });
    expect(useEarnings.getState().payout.failed).toBeUndefined();
  });
});

describe('notifications, settings, support, fees', () => {
  it('marks notifications read individually and all at once', () => {
    expect(useNotifications.getState().unreadCount()).toBe(2);
    useNotifications.getState().markRead('n1');
    expect(useNotifications.getState().unreadCount()).toBe(1);
    useNotifications.getState().markAllRead();
    expect(useNotifications.getState().unreadCount()).toBe(0);
  });

  it('persists settings toggles', async () => {
    useSettings.getState().toggle('productUpdates');
    expect(useSettings.getState().productUpdates).toBe(true);
    const stored = await useSettings.persist.getOptions().storage!.getItem('settings');
    expect((stored as any).state.productUpdates).toBe(true);
  });

  it('adds a reply and creates a ticket', async () => {
    const [t] = useSupport.getState().tickets;
    await useSupport.getState().reply(t.id, 'Thank you');
    expect(useSupport.getState().tickets[0].thread.at(-1)).toMatchObject({ from: 'doctor', text: 'Thank you' });
    const id = await useSupport.getState().create('Login issue', 'Cannot log in on my iPad.');
    expect(useSupport.getState().tickets[0]).toMatchObject({ id, status: 'open' });
  });

  it('saves fees to the doctor profile', async () => {
    await useDoctor.getState().saveProfile({ fees: { video: 900, audio: 700, clinic: 1100 } });
    expect(useDoctor.getState().fee('video')).toBe(900);
  });
});
