import {
  allergyOverrideSchema, bankSchema, blockTimeSchema, bloodPressure, clinicSchema, declaredSchema, feesSchema, followUpSchema,
  loginSchema, netEarning, notesDraftSchema, notesFinalSchema, otpSchema, panSchema, passwordSchema, profileSetupSchema,
  qualificationSchema, scheduleSchema, vitalsSchema,
} from '../src/validation/schemas';

const ok = (schema: any, v: any) => schema.safeParse(v).success;

describe('login and OTP', () => {
  it('accepts a 10-digit mobile with or without spaces', () => {
    expect(ok(loginSchema, { mobile: '98490 11204', password: 'Kdc@doctor' })).toBe(true);
    expect(ok(loginSchema, { mobile: '9849011204', password: 'Kdc@doctor' })).toBe(true);
  });
  it('rejects short, long and non-numeric mobiles', () => {
    expect(ok(loginSchema, { mobile: '98490', password: 'Kdc@doctor' })).toBe(false);
    expect(ok(loginSchema, { mobile: '984901120412', password: 'Kdc@doctor' })).toBe(false);
    expect(ok(loginSchema, { mobile: '98490abcde', password: 'Kdc@doctor' })).toBe(false);
  });
  it('requires an 8-character password', () => {
    expect(ok(loginSchema, { mobile: '9849011204', password: 'short' })).toBe(false);
  });
  it('requires exactly six OTP digits', () => {
    expect(ok(otpSchema, { code: '123456' })).toBe(true);
    expect(ok(otpSchema, { code: '7294' })).toBe(false);
  });
});

describe('onboarding', () => {
  const declared = { name: 'Dr. Test Doc', regNo: 'TSMC/FMR/48219', council: 'Telangana State Medical Council', specialization: 'Cardiology', qualification: 'MBBS', experience: '16 years' };
  it('accepts valid declared details', () => expect(ok(declaredSchema, declared)).toBe(true));
  it('rejects empty council and bad registration', () => {
    expect(ok(declaredSchema, { ...declared, council: '' })).toBe(false);
    expect(ok(declaredSchema, { ...declared, regNo: 'x' })).toBe(false);
  });
  it('requires at least one language on the profile', () => {
    const base = { name: 'Dr. Test', qualification: 'MBBS', specialization: 'Cardiology', experience: '5 years', subSpecialization: '', languages: [], clinic: 'Apollo', about: '' };
    expect(ok(profileSetupSchema, base)).toBe(false);
    expect(ok(profileSetupSchema, { ...base, languages: ['English'] })).toBe(true);
  });
  it('checks qualification year format', () => {
    expect(ok(qualificationSchema, { degree: 'MD', org: 'Osmania', years: '2005 – 2008' })).toBe(true);
    expect(ok(qualificationSchema, { degree: 'MD', org: 'Osmania', years: 'soon' })).toBe(false);
  });
});

describe('clinical notes', () => {
  it('validates blood pressure format and physiology', () => {
    expect(bloodPressure.safeParse('148/94').success).toBe(true);
    expect(bloodPressure.safeParse('').success).toBe(true);
    expect(bloodPressure.safeParse('94/148').success).toBe(false);
    expect(bloodPressure.safeParse('abc').success).toBe(false);
  });
  it('bounds pulse, weight and SpO2', () => {
    const good = { bp: '120/80', pulse: '78', weight: '76', spo2: '98' };
    expect(ok(vitalsSchema, good)).toBe(true);
    expect(ok(vitalsSchema, { ...good, pulse: '300' })).toBe(false);
    expect(ok(vitalsSchema, { ...good, weight: '0' })).toBe(false);
    expect(ok(vitalsSchema, { ...good, spo2: '120' })).toBe(false);
  });
  const notes = { chiefComplaint: '', symptoms: [], observations: '', assessment: '', diagnosis: [], advice: [], vitals: { bp: '', pulse: '', weight: '', spo2: '' } };
  it('lets a draft be saved incomplete', () => expect(ok(notesDraftSchema, notes)).toBe(true));
  it('requires complaint and diagnosis before prescribing', () => {
    expect(ok(notesFinalSchema, notes)).toBe(false);
    expect(ok(notesFinalSchema, { ...notes, chiefComplaint: 'Chest pain', diagnosis: ['Angina'] })).toBe(true);
  });
  it('requires explicit acknowledgement and a reason to override', () => {
    expect(ok(allergyOverrideSchema, { acknowledged: false, reason: 'Benefit outweighs risk here' })).toBe(false);
    expect(ok(allergyOverrideSchema, { acknowledged: true, reason: 'short' })).toBe(false);
    expect(ok(allergyOverrideSchema, { acknowledged: true, reason: 'Benefit outweighs risk here' })).toBe(true);
  });
  it('requires a date when follow-up is required', () => {
    expect(ok(followUpSchema, { required: true, date: '', mode: 'video', note: '' })).toBe(false);
    expect(ok(followUpSchema, { required: false, date: '', mode: 'video', note: '' })).toBe(true);
  });
});

describe('schedule', () => {
  const day = (sessions: { from: string; to: string }[]) => ({ day: 'Monday', short: 'Mon', on: true, sessions, modes: ['video' as const] });
  const form = (days: any[]) => ({ days, breakFrom: '01:00 PM', breakTo: '02:00 PM', duration: 15, modesOffered: ['video'] });
  it('accepts valid sessions', () => expect(ok(scheduleSchema, form([day([{ from: '09:00 AM', to: '01:00 PM' }])]))).toBe(true));
  it('rejects an end before the start', () => expect(ok(scheduleSchema, form([day([{ from: '01:00 PM', to: '09:00 AM' }])]))).toBe(false));
  it('rejects overlapping sessions', () => {
    expect(ok(scheduleSchema, form([day([{ from: '09:00 AM', to: '01:00 PM' }, { from: '12:00 PM', to: '02:00 PM' }])]))).toBe(false);
  });
  it('requires a session on a working day and at least one consultation type', () => {
    expect(ok(scheduleSchema, form([day([])]))).toBe(false);
    expect(ok(scheduleSchema, { ...form([day([{ from: '09:00 AM', to: '01:00 PM' }])]), modesOffered: [] })).toBe(false);
  });
  it('rejects a block ending before it starts', () => {
    const block = { reason: 'Leave', fromKey: '2026-10-14', toKey: '2026-10-12', allDay: true, from: '', to: '', note: '' };
    expect(ok(blockTimeSchema, block)).toBe(false);
    expect(ok(blockTimeSchema, { ...block, toKey: '2026-10-14' })).toBe(true);
  });
});

describe('bank and money', () => {
  const bank = { holder: 'Arjun Mehta', accountNumber: '123456789012', confirmAccountNumber: '123456789012', ifsc: 'HDFC0001204', type: 'Savings' };
  it('accepts valid bank details', () => expect(ok(bankSchema, bank)).toBe(true));
  it('enforces the IFSC pattern', () => {
    expect(ok(bankSchema, { ...bank, ifsc: 'HDFC1001204' })).toBe(false);
    expect(ok(bankSchema, { ...bank, ifsc: 'hdfc0001204' })).toBe(false);
  });
  it('requires matching account numbers', () => expect(ok(bankSchema, { ...bank, confirmAccountNumber: '123456789013' })).toBe(false));
  it('rejects account numbers of the wrong length', () => expect(ok(bankSchema, { ...bank, accountNumber: '123', confirmAccountNumber: '123' })).toBe(false));
  it('validates PAN', () => {
    expect(ok(panSchema, { pan: 'ABCDE1234F' })).toBe(true);
    expect(ok(panSchema, { pan: 'ABCD1234F' })).toBe(false);
    expect(ok(panSchema, { pan: 'abcde1234f' })).toBe(false);
  });
  it('computes net earnings after the 12% fee', () => {
    expect(netEarning(800)).toBe(704);
    expect(netEarning(1000)).toBe(880);
  });
  it('validates a fee only when the mode is enabled', () => {
    const f = { video: '50', audio: '600', clinic: '1000', videoOn: true, audioOn: true, clinicOn: true, freeFollowUp: true };
    expect(ok(feesSchema, f)).toBe(false);
    expect(ok(feesSchema, { ...f, videoOn: false })).toBe(true);
    expect(ok(feesSchema, { ...f, video: '800' })).toBe(true);
  });
  it('validates clinic PIN and matching password change', () => {
    expect(ok(clinicSchema, { clinic: 'Apollo', address: 'Road 72', city: 'Hyderabad', pin: '50003', clinicPhone: '+91 40 2360 7777', acceptsInPerson: true })).toBe(false);
    expect(ok(passwordSchema, { current: 'oldpassword', next: 'newpassword', confirm: 'different1' })).toBe(false);
    expect(ok(passwordSchema, { current: 'oldpassword', next: 'newpassword', confirm: 'newpassword' })).toBe(true);
  });
});
