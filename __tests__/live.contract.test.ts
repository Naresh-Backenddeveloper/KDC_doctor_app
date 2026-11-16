/// <reference types="node" />
/**
 * Contract test: the doctor app's own stores and flows on a real KDC+ backend. Runs only when
 * pointed at a server:
 *   DOCTOR_LIVE_URL=http://127.0.0.1:4000/api/v1 DOCTOR_DATA=/path/p11c-data.json npx jest live.contract
 * DOCTOR_DATA comes from the backend test kit (p11c-seed.mjs); SMS codes are read from the MSG91
 * stand-in's log. DOCTOR_INDEX picks the doctor (default 0). Round 2 runs many of these processes at
 * once, one per doctor (DOCTOR_SKIP_APPLICANT=1 in all but one).
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const LIVE = process.env.DOCTOR_LIVE_URL;
const suite = LIVE ? describe : describe.skip;
const data = LIVE ? JSON.parse(readFileSync(process.env.DOCTOR_DATA!, 'utf8')) : null;
const who = Number(process.env.DOCTOR_INDEX ?? 0);
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function smsCodeFor(mobile: string, since: number): Promise<string> {
  for (let i = 0; i < 80; i++) {
    const lines = readFileSync(data.smsLog, 'utf8').trim().split('\n').slice(since).map((l: string) => JSON.parse(l));
    const hit = lines.filter((e: { kind: string; to: string }) => e.kind === 'sms' && e.to === `91${mobile}`).at(-1);
    if (hit) return hit.code;
    await sleep(100);
  }
  throw new Error(`no SMS for ${mobile}`);
}
const smsCount = () => readFileSync(data.smsLog, 'utf8').trim().split('\n').length;
const db = process.env.DOCTOR_DB ?? 'kdcplus_r2';
const sql = (q: string) => execSync(`mysql ${db} -N -e "${q}"`, { encoding: 'utf8' }).trim();

suite('the doctor app on the live backend', () => {
  jest.setTimeout(180_000);
  const doctor = data?.doctors[who];
  const appts = doctor?.appointments;

  // The app's modules, loaded once for this doctor (their own session and Keychain).
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { useSession } = require('../src/store/session') as typeof import('../src/store/session');
  const flows = require('../src/store/flows') as typeof import('../src/store/flows');
  const { syncAll, clearAll } = require('../src/services/live/sync') as typeof import('../src/services/live/sync');
  const { services, ServiceError } = require('../src/services') as typeof import('../src/services');
  const { loadRefreshToken } = require('../src/store/secure') as typeof import('../src/store/secure');
  const { useAppointments } = require('../src/store/appointments') as typeof import('../src/store/appointments');
  const { useRecords } = require('../src/store/records') as typeof import('../src/store/records');
  const { usePrescriptions } = require('../src/store/prescriptions') as typeof import('../src/store/prescriptions');
  const { useDoctor } = require('../src/store/doctor') as typeof import('../src/store/doctor');
  const { useVerification } = require('../src/store/verification') as typeof import('../src/store/verification');
  const { useEarnings } = require('../src/store/earnings') as typeof import('../src/store/earnings');
  const { useBank } = require('../src/store/bank') as typeof import('../src/store/bank');
  const { useSupport } = require('../src/store/support') as typeof import('../src/store/support');
  const { useAvailability } = require('../src/store/availability') as typeof import('../src/store/availability');
  const { fetchMedicines, toPrescribed } = require('../src/domain/medicines') as typeof import('../src/domain/medicines');
  const { setSessionEndedHandler } = require('../src/services/live/http') as typeof import('../src/services/live/http');
  /* eslint-enable @typescript-eslint/no-require-imports */

  const ended = jest.fn();
  beforeAll(() => setSessionEndedHandler(ended));
  const appt = (code: string) => useAppointments.getState().appointments.find((a) => a.id === code);

  it('signs in with password and SMS code; the refresh token goes to the Keychain', async () => {
    await expect(useSession.getState().requestOtp(doctor.mobile, 'wrong-password-1')).rejects.toBeInstanceOf(ServiceError);
    const before = smsCount();
    // The test kit signed this doctor in moments ago; wait out the SMS resend window as a person would.
    for (let i = 0; ; i++) {
      try {
        await useSession.getState().requestOtp(doctor.mobile, doctor.password);
        break;
      } catch (e) {
        if (!(e instanceof ServiceError && e.code === 'rate_limited') || i > 35) throw e;
        await sleep(1000);
      }
    }
    const code = await smsCodeFor(doctor.mobile, before);
    expect(code).toMatch(/^\d{6}$/);
    await useSession.getState().verifyOtp(code);
    expect(useSession.getState().token).toMatch(/^kdc_at_/);
    expect(await loadRefreshToken()).toMatch(/^kdc_rt_/);
  });

  it('loads everything the screens show from the server', async () => {
    await syncAll();
    expect(useVerification.getState().status).toBe('approved');
    expect(useDoctor.getState().profile.name).toContain(doctor.name.replace(/^Dr\.\s*/, ''));
    const codes = useAppointments.getState().appointments.map((a) => a.id);
    expect(codes).toEqual(expect.arrayContaining(Object.values(appts)));
    const consult = appt(appts.consult)!;
    expect(consult).toMatchObject({ mode: 'video', status: 'upcoming', patientId: String(doctor.patients[0].memberId) });
    expect(useRecords.getState().patientById(consult.patientId).name).toBe('Arjun Sharma');
    expect(useAvailability.getState().week.length).toBe(7);
    expect(useEarnings.getState().summary).toBeDefined();
  });

  it('runs a consultation: start, notes, a prescription from the catalogue, issued; the appointment completes', async () => {
    const screen = flows.beginConsultation(appts.consult);
    expect(screen).toBe('dr-video-call');
    for (let i = 0; i < 30 && sql(`select count(*) from consultations c join appointments a on a.id = c.appointment_id where a.code = '${appts.consult}' and c.started_at is not null`) !== '1'; i++) await sleep(200);
    expect(sql(`select status from appointments where code = '${appts.consult}'`)).toBe('in_progress');

    await services.records.saveConsultationDraft({ key: appts.consult, chiefComplaint: 'Fever and body ache for 3 days', symptoms: ['Fever', 'Body ache'], observations: 'Mild pharyngeal congestion', assessment: 'Likely viral', diagnosis: ['Viral fever'], advice: ['Plenty of fluids'], vitals: {} } as never);

    flows.ensureRxDraft(appts.consult);
    usePrescriptions.getState().updateDraft(appts.consult, { diagnosis: ['Viral fever'], advice: ['Plenty of fluids'] });
    const [dolo] = await fetchMedicines('Dolo');
    expect(dolo?.name).toContain('Dolo');
    usePrescriptions.getState().saveMedicine(appts.consult, { ...toPrescribed(dolo), dosage: '1 tablet', frequency: 'Three times daily', duration: '3 days', food: 'After food' });
    const sent = await flows.sendPrescription(appts.consult);
    expect(sent).toMatchObject({ ok: true });
    for (let i = 0; i < 30 && appt(appts.consult)?.status !== 'completed'; i++) {
      await sleep(300);
      await syncAll().catch(() => undefined);
    }
    expect(appt(appts.consult)?.status).toBe('completed');
    expect(sql(`select count(*) from prescriptions p join appointments a on a.id = p.appointment_id where a.code = '${appts.consult}' and p.status = 'issued'`)).toBe('1');
    expect(usePrescriptions.getState().summaries.length).toBeGreaterThan(0);
  });

  it('a no-show, a cancellation and a reschedule, each decided by the server', async () => {
    flows.markNoShow(appts.noShow);
    flows.cancelAppointment(appts.cancel);
    for (let i = 0; i < 30; i++) {
      await sleep(300);
      await syncAll().catch(() => undefined);
      if (appt(appts.noShow)?.status === 'no-show' && appt(appts.cancel)?.status === 'cancelled') break;
    }
    expect(appt(appts.noShow)?.status).toBe('no-show');
    expect(appt(appts.cancel)?.status).toBe('cancelled');
    // The patient is refunded in full for a doctor's cancellation.
    expect(sql(`select count(*) from refunds r join payment_transactions t on t.id = r.transaction_id where t.purpose_code = '${appts.cancel}'`)).toBe('1');

    const target = { key: doctor.rescheduleTo.date, label: doctor.rescheduleTo.date, time: '11:00 AM' };
    expect(await flows.rescheduleAppointment(appts.reschedule, target)).toBeNull();
    expect(appt(appts.reschedule)).toMatchObject({ dateKey: doctor.rescheduleTo.date, status: 'upcoming' });
  });

  it('duty, running late, blocks and the weekly schedule', async () => {
    flows.setOnDuty(false);
    for (let i = 0; i < 20 && sql(`select on_duty from doctors where code = '${doctor.code}'`) !== '0'; i++) await sleep(200);
    expect(sql(`select on_duty from doctors where code = '${doctor.code}'`)).toBe('0');
    flows.setOnDuty(true);
    await flows.notifyRunningLate().catch((e: Error) => expect(e).toBeInstanceOf(ServiceError));
    const blocked = await flows.blockTime({ fromKey: doctor.rescheduleTo.date.replace(/\d{2}$/, (d: string) => String(Number(d) + 2).padStart(2, '0')), toKey: doctor.rescheduleTo.date.replace(/\d{2}$/, (d: string) => String(Number(d) + 2).padStart(2, '0')), allDay: true, from: '', to: '', reason: 'Meeting', note: 'CME conference' } as never);
    expect(Array.isArray(blocked)).toBe(true);
    expect(useAvailability.getState().blocked.some((b) => b.reason.toLowerCase() === 'meeting')).toBe(true);
    const block = useAvailability.getState().blocked.find((b) => b.reason.toLowerCase() === 'meeting')!;
    await useAvailability.getState().removeBlock(block.id);
    expect(useAvailability.getState().blocked.some((b) => b.id === block.id)).toBe(false);
  });

  it('profile, bank account, support and the session’s end', async () => {
    await useDoctor.getState().saveProfile({ about: 'Interventional cardiologist with 12 years of practice.' });
    expect(sql(`select count(*) from doctors where code = '${doctor.code}' and about like 'Interventional%'`)).toBe('1');

    const result = await flows.saveBankDetails({ holder: doctor.name.replace(/^Dr\.\s*/, ''), accountNumber: '50100012345678', confirmAccount: '50100012345678', ifsc: 'HDFC0001234', type: 'Savings', pan: 'AXXPR1234F' } as never);
    expect(result).toBe('verifying');
    expect(useBank.getState().bank.account).not.toContain('50100012345678');
    expect(sql(`select b.status from doctor_bank_accounts b join doctors d on d.id = b.doctor_id where d.code = '${doctor.code}'`)).toBe('verifying');

    const ticket = await services.support.create('Payout not received', 'My payout for last week has not reached my bank account yet.');
    expect(ticket.id).toMatch(/^KDC-ST-/);
    await syncAll();
    expect(useSupport.getState().tickets.some((t) => t.id === ticket.id)).toBe(true);

    const token = useSession.getState().token;
    useSession.getState().logout();
    for (let i = 0; i < 20 && (await loadRefreshToken()); i++) await sleep(100);
    expect(await loadRefreshToken()).toBeNull();
    const res = await fetch(`${LIVE}/me`, { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(401);
    clearAll();
    expect(useAppointments.getState().appointments).toEqual([]);
    expect(useRecords.getState().patients).toEqual([]);
    expect(ended).not.toHaveBeenCalled();
  });

  // The applicant is shared: run once, not in every parallel load process.
  (process.env.DOCTOR_SKIP_APPLICANT ? it.skip : it)('an invited doctor applies: declaration, a document upload, submission refused until complete', async () => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    let app!: { session: typeof import('../src/store/session'); verification: typeof import('../src/store/verification'); sync: typeof import('../src/services/live/sync'); services: typeof import('../src/services') };
    jest.isolateModules(() => {
      app = { session: require('../src/store/session'), verification: require('../src/store/verification'), sync: require('../src/services/live/sync'), services: require('../src/services') };
    });
    /* eslint-enable @typescript-eslint/no-require-imports */
    const { applicant } = data;
    const before = smsCount();
    for (let i = 0; ; i++) {
      try {
        await app.session.useSession.getState().requestOtp(applicant.mobile, applicant.password);
        break;
      } catch (e) {
        if (!(e instanceof app.services.ServiceError && e.code === 'rate_limited') || i > 35) throw e;
        await sleep(1000);
      }
    }
    await app.session.useSession.getState().verifyOtp(await smsCodeFor(applicant.mobile, before));
    await app.sync.syncAll();
    const v = app.verification.useVerification.getState();
    expect(v.status).toBe('pending');
    expect(v.documents.map((d) => d.id)).toEqual(expect.arrayContaining(['registration', 'qualification', 'photo', 'government_id']));
    await v.saveDeclared({ name: 'Dr. Sana Qureshi', regNo: 'TSMC/P11C/99001', council: 'Telangana State Medical Council', specialization: 'Dermatology', qualification: 'MBBS, MD (Dermatology)', experience: 7 });
    expect(sql(`select count(*) from doctors where name = 'Dr. Sana Qureshi' and reg_no = 'TSMC/P11C/99001'`)).toBe('1');
    // Not every document is in: the server refuses, and says why.
    await expect(app.verification.useVerification.getState().resubmit()).rejects.toBeInstanceOf(app.services.ServiceError);
    if (typeof XMLHttpRequest !== 'undefined') {
      await app.verification.useVerification.getState().upload('registration', { name: 'registration.pdf', size: 1200, uri: 'file:///nonexistent.pdf' });
    }
  });
});
