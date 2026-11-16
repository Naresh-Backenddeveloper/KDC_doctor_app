import { z } from 'zod';
import { minutesOf } from '../utils/date';

export const digits = (v: string) => v.replace(/\D/g, '');

const required = (message: string) => z.string().trim().min(1, message);

export const loginSchema = z.object({
  mobile: z.string().refine((v) => /^\d{10}$/.test(digits(v)) && digits(v).length === v.replace(/\s/g, '').length, 'Enter your 10-digit registered mobile number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const otpSchema = z.object({ code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code') });
export type OtpForm = z.infer<typeof otpSchema>;

/* ------------------------------------------------------------ Onboarding */

export const REG_NO_PATTERN = /^[A-Za-z]{2,6}\/[A-Za-z]{2,6}\/\d{3,8}$|^[A-Za-z0-9/-]{5,20}$/;

export const declaredSchema = z.object({
  name: required('Enter your full name').min(3, 'Enter your full name'),
  regNo: required('Enter your registration number').regex(REG_NO_PATTERN, 'Enter the number as printed on your certificate'),
  council: required('Select your medical council'),
  specialization: required('Select your specialization'),
  qualification: required('Enter your qualification'),
  experience: required('Select your experience').regex(/^\d{1,2} years?$/, 'Select your experience'),
});
export type DeclaredForm = z.infer<typeof declaredSchema>;

export const profileSetupSchema = z.object({
  name: required('Enter your full name').min(3, 'Enter your full name'),
  qualification: required('Enter your qualification'),
  specialization: required('Select your specialization'),
  experience: required('Select your experience'),
  subSpecialization: z.string(),
  languages: z.array(z.string()).min(1, 'Select at least one language'),
  clinic: required('Enter your hospital or clinic'),
  about: z.string().max(600, 'Keep this under 600 characters'),
});
export type ProfileSetupForm = z.infer<typeof profileSetupSchema>;

export const professionalInfoSchema = z.object({
  specialization: required('Select your specialization'),
  subSpecialization: z.string(),
  experience: required('Select your experience'),
  languages: z.array(z.string()).min(1, 'Select at least one language'),
});
export type ProfessionalInfoForm = z.infer<typeof professionalInfoSchema>;

export const qualificationSchema = z.object({
  degree: required('Enter the degree'),
  org: required('Enter the institution'),
  years: required('Enter the years').regex(/^\d{4}\s*[–-]\s*(\d{4}|Present)$/, 'Use the format 2009 – 2012'),
});
export type QualificationForm = z.infer<typeof qualificationSchema>;

/* -------------------------------------------------------- Clinical notes */

const inRange = (value: string, min: number, max: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max;
};

export const bloodPressure = z.string().refine((v) => {
  if (!v.trim()) return true;
  const m = v.trim().match(/^(\d{2,3})\/(\d{2,3})$/);
  if (!m) return false;
  const [sys, dia] = [Number(m[1]), Number(m[2])];
  return sys >= 60 && sys <= 260 && dia >= 30 && dia <= 160 && sys > dia;
}, 'Use systolic/diastolic, e.g. 120/80');

const vital = (min: number, max: number, message: string) =>
  z.string().refine((v) => !v.trim() || inRange(v, min, max), message);

export const vitalsSchema = z.object({
  bp: bloodPressure,
  pulse: vital(30, 220, 'Pulse must be 30–220'),
  weight: vital(1, 300, 'Weight must be 1–300 kg'),
  spo2: vital(50, 100, 'SpO₂ must be 50–100'),
});

/** Saving a draft only insists that whatever was typed is well formed. */
export const notesDraftSchema = z.object({
  chiefComplaint: z.string().max(1000),
  symptoms: z.array(z.string()),
  observations: z.string().max(2000),
  assessment: z.string().max(2000),
  diagnosis: z.array(z.string()),
  advice: z.array(z.string()),
  vitals: vitalsSchema,
});
export type NotesForm = z.infer<typeof notesDraftSchema>;

/** Moving on to prescribing needs the clinical minimum. */
export const notesFinalSchema = notesDraftSchema.extend({
  chiefComplaint: required('Enter the chief complaint'),
  diagnosis: z.array(z.string()).min(1, 'Add at least one diagnosis'),
});

/* ---------------------------------------------------------- Prescription */

export const medicineSchema = z.object({
  dosage: required('Select a dosage'),
  frequency: required('Select a frequency'),
  duration: required('Select a duration'),
  food: required('Select food timing'),
  instructions: z.string().max(240, 'Keep instructions under 240 characters'),
});
export type MedicineForm = z.infer<typeof medicineSchema>;

export const allergyOverrideSchema = z.object({
  acknowledged: z.boolean().refine((v) => v, 'Confirm you have reviewed this allergy'),
  reason: required('State the clinical reason for overriding').min(8, 'State the clinical reason for overriding'),
});
export type AllergyOverrideForm = z.infer<typeof allergyOverrideSchema>;

export const followUpSchema = z
  .object({
    required: z.boolean(),
    date: z.string(),
    mode: z.enum(['video', 'audio', 'clinic']),
    note: z.string().max(240, 'Keep the note under 240 characters'),
  })
  .refine((v) => !v.required || v.date.trim().length > 0, { message: 'Choose a date', path: ['date'] });
export type FollowUpForm = z.infer<typeof followUpSchema>;

/* ------------------------------------------------------------ Availability */

const sessionsOverlap = (a: { from: string; to: string }, b: { from: string; to: string }) =>
  minutesOf(a.from) < minutesOf(b.to) && minutesOf(b.from) < minutesOf(a.to);

const sessionSchema = z.object({ from: z.string(), to: z.string() });

export const scheduleSchema = z
  .object({
    days: z.array(
      z.object({
        day: z.string(),
        short: z.string(),
        on: z.boolean(),
        sessions: z.array(sessionSchema),
        modes: z.array(z.enum(['video', 'audio', 'clinic'])),
      }),
    ),
    breakFrom: z.string(),
    breakTo: z.string(),
    duration: z.number().positive(),
    modesOffered: z.array(z.enum(['video', 'audio', 'clinic'])).min(1, 'Offer at least one consultation type'),
  })
  .superRefine((v, ctx) => {
    if (minutesOf(v.breakTo) <= minutesOf(v.breakFrom)) {
      ctx.addIssue({ code: 'custom', message: 'Break must end after it starts', path: ['breakTo'] });
    }
    v.days.forEach((d, i) => {
      if (d.on && d.sessions.length === 0) {
        ctx.addIssue({ code: 'custom', message: `Add a session for ${d.day} or mark it off`, path: ['days', i, 'sessions'] });
      }
      d.sessions.forEach((s, j) => {
        if (minutesOf(s.to) <= minutesOf(s.from)) {
          ctx.addIssue({ code: 'custom', message: 'End must be after start', path: ['days', i, 'sessions', j] });
        } else if (d.sessions.slice(0, j).some((o) => sessionsOverlap(s, o))) {
          ctx.addIssue({ code: 'custom', message: 'Sessions cannot overlap', path: ['days', i, 'sessions', j] });
        }
      });
    });
  });
export type ScheduleForm = z.infer<typeof scheduleSchema>;

export const blockTimeSchema = z
  .object({
    reason: required('Choose a reason'),
    fromKey: required('Choose a start date'),
    toKey: required('Choose an end date'),
    allDay: z.boolean(),
    from: z.string(),
    to: z.string(),
    note: z.string().max(240, 'Keep the note under 240 characters'),
  })
  .superRefine((v, ctx) => {
    if (v.toKey < v.fromKey) ctx.addIssue({ code: 'custom', message: 'End date must not be before start date', path: ['toKey'] });
    if (!v.allDay && minutesOf(v.to) <= minutesOf(v.from)) {
      ctx.addIssue({ code: 'custom', message: 'End time must be after start time', path: ['to'] });
    }
  });
export type BlockTimeForm = z.infer<typeof blockTimeSchema>;

/* ------------------------------------------------------------ Money/account */

export const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export const bankSchema = z
  .object({
    holder: required('Enter the account holder name').regex(/^[A-Za-z .']{3,}$/, 'Enter the name as on the account'),
    accountNumber: z.string().regex(/^\d{9,18}$/, 'Account number must be 9–18 digits'),
    confirmAccountNumber: z.string().min(1, 'Re-enter the account number'),
    ifsc: z.string().regex(IFSC_PATTERN, 'IFSC must be 11 characters, e.g. HDFC0001204'),
    type: required('Select an account type'),
  })
  .refine((v) => v.accountNumber === v.confirmAccountNumber, {
    message: 'Account numbers do not match',
    path: ['confirmAccountNumber'],
  });
export type BankForm = z.infer<typeof bankSchema>;

export const panSchema = z.object({ pan: z.string().regex(PAN_PATTERN, 'PAN must look like ABCDE1234F') });
export type PanForm = z.infer<typeof panSchema>;

const fee = z.string().refine((v) => /^\d+$/.test(v) && Number(v) >= 100 && Number(v) <= 10000, 'Fee must be ₹100–₹10,000');

export const feesSchema = z
  .object({
    video: z.string(),
    audio: z.string(),
    clinic: z.string(),
    videoOn: z.boolean(),
    audioOn: z.boolean(),
    clinicOn: z.boolean(),
    freeFollowUp: z.boolean(),
  })
  .superRefine((v, ctx) => {
    (['video', 'audio', 'clinic'] as const).forEach((m) => {
      if (v[`${m}On`] && !fee.safeParse(v[m]).success) {
        ctx.addIssue({ code: 'custom', message: 'Fee must be ₹100–₹10,000', path: [m] });
      }
    });
  });
export type FeesForm = z.infer<typeof feesSchema>;

export const netEarning = (feeAmount: number) => Math.round(feeAmount * 0.88);

export const clinicSchema = z.object({
  clinic: required('Enter the hospital or clinic name'),
  address: required('Enter the address'),
  city: required('Enter the city'),
  pin: z.string().regex(/^\d{6}$/, 'PIN code must be 6 digits'),
  clinicPhone: z.string().refine((v) => digits(v).length >= 10, 'Enter a valid phone number'),
  acceptsInPerson: z.boolean(),
});
export type ClinicForm = z.infer<typeof clinicSchema>;

export const passwordSchema = z
  .object({
    current: z.string().min(8, 'Enter your current password'),
    next: z.string().min(8, 'New password must be at least 8 characters'),
    confirm: z.string().min(1, 'Re-enter the new password'),
  })
  .refine((v) => v.next === v.confirm, { message: 'Passwords do not match', path: ['confirm'] });
export type PasswordForm = z.infer<typeof passwordSchema>;

export const ticketSchema = z.object({
  subject: required('Enter a subject').min(5, 'Enter a subject'),
  description: required('Describe the issue').min(10, 'Describe the issue in a little more detail'),
});
export type TicketForm = z.infer<typeof ticketSchema>;

export const reportNoteSchema = z.object({ note: z.string().max(800, 'Keep the note under 800 characters') });
export type ReportNoteForm = z.infer<typeof reportNoteSchema>;

/** Recovery, and an invited doctor's first password (live builds). The server also refuses common or personal passwords. */
export const newPasswordSchema = z.object({ newPassword: z.string().min(8, 'Use at least 8 characters').max(128, 'Use at most 128 characters') });
export type NewPasswordForm = z.infer<typeof newPasswordSchema>;
