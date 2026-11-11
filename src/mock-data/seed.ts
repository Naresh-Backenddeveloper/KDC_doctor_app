import { appointments, blockedTime, consultationDraft, doctor, draftPrescription, earningRows, earnings, notifications, patientPrescriptions, patients, payout, pendingActions, reportDetail, reports, supportTicket, verification, weeklySchedule, consultationHistory } from './mock';
import { TODAY_KEY } from '../utils/date';
import type {
  Appointment, BankAccount, BlockedTime, ConsultationDraft, ConsultationHistoryEntry, DeclaredDetails, DoctorNotification,
  DoctorProfile, EarningRow, EarningsSummary, Patient, Payout, PendingAction, Prescription, PrescriptionSummary, Report,
  ReportDetail, SupportTicket, VerificationDocument, WorkingDay,
} from '../types';

/** The record the blueprint opens when nothing has been chosen. */
export const DEFAULT_APPT_ID = 'KDC-AP-88431';
export const AUDIO_DEFAULT_APPT_ID = 'KDC-AP-88419';
export const INPERSON_DEFAULT_APPT_ID = 'KDC-AP-88437';
export const REPORT_DEFAULT_ID = 'KDC-LR-77210';

const appt = (a: Omit<Appointment, 'dateKey'>, dateKey: string): Appointment => ({ ...a, dateKey });

const seedAppointments = (): Appointment[] => [
  ...appointments.map((a) => appt(a, a.date.startsWith('Today') ? TODAY_KEY : '2026-10-04')),
  // Three more this week and four in the blocked 12–14 Oct window, as the blueprint's counts state.
  appt({ id: 'KDC-AP-88501', patientId: patients[2].id, mode: 'video', time: '10:00 AM', endTime: '10:15 AM', date: 'Wed, 8 Oct 2026', status: 'upcoming', reason: 'Six-month stent follow-up', fee: 800, isFollowUp: true }, '2026-10-08'),
  appt({ id: 'KDC-AP-88502', patientId: patients[5].id, mode: 'audio', time: '11:00 AM', endTime: '11:12 AM', date: 'Thu, 9 Oct 2026', status: 'upcoming', reason: 'Blood pressure diary review', fee: 600, isFollowUp: true }, '2026-10-09'),
  appt({ id: 'KDC-AP-88503', patientId: patients[3].id, mode: 'video', time: '5:30 PM', endTime: '5:45 PM', date: 'Fri, 10 Oct 2026', status: 'upcoming', reason: 'Heart failure medication titration', fee: 800, isFollowUp: true }, '2026-10-10'),
  appt({ id: 'KDC-AP-88511', patientId: patients[0].id, mode: 'video', time: '9:30 AM', endTime: '9:45 AM', date: 'Mon, 12 Oct 2026', status: 'upcoming', reason: 'Home BP log review', fee: 800, isFollowUp: true }, '2026-10-12'),
  appt({ id: 'KDC-AP-88512', patientId: patients[1].id, mode: 'clinic', time: '6:00 PM', endTime: '6:20 PM', date: 'Mon, 12 Oct 2026', status: 'upcoming', reason: 'Diabetes and thyroid review', fee: 1000, isFollowUp: true, clinicRoom: 'Consulting Room 4, Block B' }, '2026-10-12'),
  appt({ id: 'KDC-AP-88513', patientId: patients[7].id, mode: 'audio', time: '10:15 AM', endTime: '10:27 AM', date: 'Tue, 13 Oct 2026', status: 'upcoming', reason: 'Chest discomfort follow-up', fee: 600, isFollowUp: true }, '2026-10-13'),
  appt({ id: 'KDC-AP-88514', patientId: patients[4].id, mode: 'video', time: '5:45 PM', endTime: '6:00 PM', date: 'Wed, 14 Oct 2026', status: 'upcoming', reason: 'Holter result discussion', fee: 800, isFollowUp: true }, '2026-10-14'),
];

const seedHeldRequests = (): Appointment[] =>
  ([patients[7], patients[5], patients[2]] as Patient[]).map((p, i) => ({
    id: `KDC-AP-8960${i + 1}`,
    patientId: p.id,
    mode: 'video',
    time: ['12:10 PM', '12:25 PM', '12:40 PM'][i],
    endTime: ['12:25 PM', '12:40 PM', '12:55 PM'][i],
    date: 'Today, 5 Oct 2026',
    dateKey: TODAY_KEY,
    status: 'waiting',
    reason: 'Walk-in consultation request',
    fee: 800,
    isFollowUp: false,
    requested: true,
  }));

const seedPatients = (): Patient[] =>
  patients.map((p) => ({ ...p, followUpDue: p.id === patients[5].id || p.id === patients[3].id }));

const historyFor = (p: Patient): ConsultationHistoryEntry[] => [
  { id: `h-${p.id}`, patientId: p.id, date: p.lastConsult, mode: 'video', summary: `Review of ${p.conditions[0].toLowerCase()}`, duration: '12 min', rxId: `KDC-RX-2026-${p.id.slice(-5)}` },
];

const seedHistory = (): ConsultationHistoryEntry[] => [
  ...consultationHistory.map((c) => ({ ...c, patientId: patients[0].id })),
  ...patients.slice(1).flatMap(historyFor),
];

const seedRxSummaries = (): PrescriptionSummary[] => [
  ...patientPrescriptions.map((r) => ({ ...r, patientId: patients[0].id })),
  ...patients.slice(1).map((p) => ({ id: `KDC-RX-2026-${p.id.slice(-5)}`, patientId: p.id, date: p.lastConsult, title: `${p.conditions[0]} — maintenance`, items: 1, status: 'active' as const })),
];

const rxDoc = (s: PrescriptionSummary): Prescription => ({
  key: s.id,
  id: s.id,
  patientId: s.patientId,
  date: s.date,
  diagnosis: [s.title],
  medicines: draftPrescription.medicines.slice(0, Math.min(s.items, 2)),
  advice: [],
  investigations: [],
  followUp: { required: false, date: '', mode: 'video', note: '' },
  status: 'sent',
});

const seedRxDocs = (): Record<string, Prescription> => {
  const docs: Record<string, Prescription> = Object.fromEntries(seedRxSummaries().map((s) => [s.id, rxDoc(s)]));
  docs[draftPrescription.id] = { ...draftPrescription, key: draftPrescription.id, status: 'sent', apptId: DEFAULT_APPT_ID };
  return docs;
};

export const seedDraftRx = (): Prescription => ({
  key: DEFAULT_APPT_ID,
  id: draftPrescription.id,
  patientId: draftPrescription.patientId,
  apptId: DEFAULT_APPT_ID,
  date: draftPrescription.date,
  diagnosis: [...draftPrescription.diagnosis],
  medicines: draftPrescription.medicines.map((m) => ({ ...m })),
  advice: [...draftPrescription.advice],
  investigations: [...draftPrescription.investigations],
  followUp: { ...draftPrescription.followUp },
  status: 'draft',
});

const seedDraftConsult = (): ConsultationDraft => ({
  key: DEFAULT_APPT_ID,
  chiefComplaint: consultationDraft.chiefComplaint,
  symptoms: [...consultationDraft.symptoms],
  observations: consultationDraft.observations,
  assessment: consultationDraft.assessment,
  diagnosis: [...consultationDraft.diagnosis],
  advice: [...consultationDraft.advice],
  vitals: { bp: '148/94', pulse: '78', weight: '76', spo2: '98' },
});

export const emptyConsultDraft = (key: string): ConsultationDraft => ({
  key,
  chiefComplaint: '',
  symptoms: [],
  observations: '',
  assessment: '',
  diagnosis: [],
  advice: [],
  vitals: { bp: '', pulse: '', weight: '', spo2: '' },
});

const seedReports = (): Report[] => reports.map((r) => ({ ...r, patientId: patients[0].id }));

const seedReportDetails = (): Record<string, ReportDetail> => ({
  [reportDetail.id]: { ...reportDetail, summary: 'LDL and total cholesterol have risen since 18 Sep. Consider escalating statin therapy.' },
  'KDC-LR-77198': {
    id: 'KDC-LR-77198', name: 'Serum Creatinine & Electrolytes', patientId: patients[0].id, lab: 'Dr. Lal PathLabs, Banjara Hills',
    collected: '02 Oct 2026, 7:20 AM', reported: '02 Oct 2026, 6:45 PM', pathologist: 'Dr. S. Venkatesh, MD (Pathology)',
    summary: 'Renal function and electrolytes are within reference range.',
    results: [
      { name: 'Serum Creatinine', value: '0.9', unit: 'mg/dL', range: '0.7 – 1.3', flag: 'normal' },
      { name: 'Sodium', value: '139', unit: 'mmol/L', range: '135 – 145', flag: 'normal' },
      { name: 'Potassium', value: '4.2', unit: 'mmol/L', range: '3.5 – 5.1', flag: 'normal' },
    ],
  },
  'KDC-LR-76940': {
    id: 'KDC-LR-76940', name: 'Complete Blood Count (CBC)', patientId: patients[0].id, lab: 'Vijaya Diagnostic Centre',
    collected: '18 Sep 2026, 8:05 AM', reported: '18 Sep 2026, 4:30 PM', pathologist: 'Dr. R. Iyer, MD (Pathology)',
    summary: 'Mildly reduced haemoglobin; otherwise unremarkable.',
    results: [{ name: 'Haemoglobin', value: '12.6', unit: 'g/dL', range: '13 – 17', flag: 'borderline' }],
  },
  'KDC-LR-76112': {
    id: 'KDC-LR-76112', name: 'HbA1c (Glycosylated Haemoglobin)', patientId: patients[0].id, lab: 'Vijaya Diagnostic Centre',
    collected: '18 Sep 2026, 8:05 AM', reported: '18 Sep 2026, 4:30 PM', pathologist: 'Dr. R. Iyer, MD (Pathology)',
    summary: 'Glycaemic control within target.',
    results: [{ name: 'HbA1c', value: '5.4', unit: '%', range: '< 5.7', flag: 'normal' }],
  },
  'KDC-IM-20418': {
    id: 'KDC-IM-20418', name: '2D Echocardiogram', patientId: patients[0].id, lab: 'Apollo Hospitals — Cardiac Imaging',
    collected: '20 Aug 2026, 11:00 AM', reported: '20 Aug 2026, 3:15 PM', pathologist: 'Dr. N. Rao, DM (Cardiology)',
    summary: 'Normal left ventricular function. No regional wall motion abnormality.',
    results: [],
  },
  'KDC-IM-20407': {
    id: 'KDC-IM-20407', name: 'Chest X-ray — PA view', patientId: patients[0].id, lab: 'Apollo Hospitals — Radiology',
    collected: '20 Aug 2026, 10:20 AM', reported: '20 Aug 2026, 1:40 PM', pathologist: 'Dr. K. Menon, MD (Radiology)',
    summary: 'Clear lung fields. Cardiac silhouette within normal limits.',
    results: [],
  },
});

const seedEarningRows = (): EarningRow[] => [
  ...earningRows,
  { id: 'e7', date: '28 Sep 2026', apptId: 'KDC-AP-87902', patient: 'Sunita Rao', mode: 'video', amount: 800, status: 'settled' },
  { id: 'e8', date: '26 Sep 2026', apptId: 'KDC-AP-87840', patient: 'Imran Qureshi', mode: 'audio', amount: 600, status: 'settled' },
  { id: 'e9', date: '18 Sep 2026', apptId: 'KDC-AP-87511', patient: 'Rahul Sharma', mode: 'audio', amount: 0, status: 'no-show' },
];

const seedEarnings = (): EarningsSummary => ({
  today: earnings.today,
  week: earnings.week,
  month: earnings.month,
  byMode: { ...earnings.byMode },
  consultsThisMonth: earnings.consultsThisMonth,
  avgPerConsult: earnings.avgPerConsult,
  weekSeries: [...earnings.weekSeries],
  monthSeries: [...earnings.monthSeries],
  settledThisMonth: 206800,
});

const seedPayout = (): Payout => ({
  available: payout.available,
  pending: payout.pending,
  lastPayout: { ...payout.lastPayout },
  nextPayout: { ...payout.nextPayout },
});

const seedBank = (): BankAccount => ({
  name: payout.bank.name,
  holder: payout.bank.holder,
  account: payout.bank.account,
  ifsc: payout.bank.ifsc,
  branch: payout.bank.branch,
  type: 'Savings',
  status: 'verified',
  pan: 'AXXPM••••F',
  panHolder: 'Arjun Mehta',
});

const NOTIFICATION_TARGET: Record<string, Pick<DoctorNotification, 'screen' | 'apptId'>> = {
  n1: { screen: 'dr-waiting-room', apptId: 'KDC-AP-88412' },
  n3: { screen: 'dr-reports' },
  n6: { screen: 'dr-verification' },
};

const seedNotifications = (): DoctorNotification[] =>
  notifications.map((n) => ({ ...n, ...NOTIFICATION_TARGET[n.id] }));

const seedWeek = (): WorkingDay[] =>
  weeklySchedule.map((d) => ({
    day: d.day,
    short: d.short,
    on: d.on,
    modes: [...d.modes],
    sessions: d.blocks.map((b) => {
      const [from, to] = b.split(' – ');
      return { from, to };
    }),
  }));

const seedBlocked = (): BlockedTime[] => [
  { ...blockedTime[0], fromKey: '2026-10-12', toKey: '2026-10-14', allDay: true },
  { ...blockedTime[1], fromKey: '2026-10-08', toKey: '2026-10-08', allDay: false, from: '02:00 PM', to: '03:30 PM' },
];

const seedDeclared = (): DeclaredDetails => ({
  name: doctor.name,
  regNo: doctor.regNo,
  council: doctor.council,
  specialization: doctor.specialization,
  qualification: 'MBBS, MD, DM',
  experience: doctor.experience,
});

const seedDocuments = (): VerificationDocument[] => verification.documents.map((d) => ({ ...d }));

const seedDoctor = (): DoctorProfile => ({
  ...doctor,
  city: 'Hyderabad',
  pin: '500033',
  fees: { ...doctor.fees },
  modesEnabled: { video: true, audio: true, clinic: true },
  freeFollowUp: true,
  acceptsInPerson: true,
});

const seedTicket = (): SupportTicket => ({ ...supportTicket, thread: supportTicket.thread.map((t) => ({ ...t })) });

const seedPending = (): PendingAction[] =>
  pendingActions.map((a) => ({
    ...a,
    patientId: a.id === 'pa1' ? patients[3].id : a.id === 'pa2' ? patients[0].id : a.id === 'pa3' ? patients[5].id : undefined,
  }));

export const seed = {
  appointments: seedAppointments,
  heldRequests: seedHeldRequests,
  patients: seedPatients,
  reports: seedReports,
  reportDetails: seedReportDetails,
  history: seedHistory,
  rxSummaries: seedRxSummaries,
  rxDocs: seedRxDocs,
  draftConsult: seedDraftConsult,
  earningRows: seedEarningRows,
  earnings: seedEarnings,
  payout: seedPayout,
  bank: seedBank,
  notifications: seedNotifications,
  week: seedWeek,
  blocked: seedBlocked,
  declared: seedDeclared,
  documents: seedDocuments,
  doctor: seedDoctor,
  ticket: seedTicket,
  pending: seedPending,
};
