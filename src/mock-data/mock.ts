import { portrait, PORTRAIT_IDS } from './media'
import type { Appointment, ApptStatus, Mode, Patient, Report } from '../types'

export type { Appointment, ApptStatus, Mode, Patient, Report }

/**
 * Mock dataset for the KDC+ Doctor prototype.
 *
 * The signed-in doctor is Dr. Arjun Mehta — the same consultant the patient app
 * features — so the two apps read as one product family. Every patient name,
 * identifier, registration number and clinical value is fictional. No real
 * patient data appears anywhere in this project.
 */

export const rupee = (n: number) => `₹${n.toLocaleString('en-IN')}`

/* ------------------------------------------------------------- The doctor */

export const doctor = {
  id: 'KDC-DR-10482',
  name: 'Dr. Arjun Mehta',
  shortName: 'Dr. Mehta',
  firstName: 'Arjun',
  photo: portrait(PORTRAIT_IDS.arjun, 420),
  qualification: 'MBBS, MD (Medicine), DM (Cardiology)',
  specialization: 'Cardiology',
  subSpecialization: 'Interventional Cardiology',
  title: 'Senior Consultant Cardiologist',
  experience: 16,
  languages: ['English', 'Hindi', 'Telugu'],
  regNo: 'TSMC/FMR/48219',
  council: 'Telangana State Medical Council',
  mobile: '+91 98490 11204',
  mobileMasked: '+91 98490 •••• 04',
  email: 'arjun.mehta@kdcplus.in',
  hospital: 'Apollo Hospitals',
  clinic: 'Apollo Hospitals — Jubilee Hills',
  address: 'Road No. 72, Film Nagar, Jubilee Hills, Hyderabad – 500033',
  clinicPhone: '+91 40 2360 7777',
  timings: 'Mon–Sat · 10:00 AM – 1:00 PM, 5:00 PM – 9:00 PM',
  rating: 4.9,
  reviews: 1284,
  consults: 11400,
  verified: true,
  about:
    'Senior Interventional Cardiologist with 16 years of clinical experience in preventive cardiology, coronary intervention and heart failure management. Leads the structural heart programme at Apollo Hospitals, Jubilee Hills.',
  fees: { video: 800, audio: 600, clinic: 1000 },
}

export const qualifications = [
  { degree: 'DM — Cardiology', org: 'Sri Jayadeva Institute of Cardiovascular Sciences, Bengaluru', years: '2009 – 2012' },
  { degree: 'MD — General Medicine', org: 'Osmania Medical College, Hyderabad', years: '2005 – 2008' },
  { degree: 'MBBS', org: 'Gandhi Medical College, Secunderabad', years: '1999 – 2004' },
]

export const experienceHistory = [
  { role: 'Senior Consultant Cardiologist', org: 'Apollo Hospitals, Jubilee Hills', years: '2016 – Present' },
  { role: 'Consultant Cardiologist', org: 'Care Hospitals, Banjara Hills', years: '2012 – 2016' },
  { role: 'Registrar — Cardiology', org: 'Sri Jayadeva Institute, Bengaluru', years: '2009 – 2012' },
]

/* ------------------------------------------------------------- Patients */

export const patients: Patient[] = [
  {
    id: 'KDC-PT-7741208',
    name: 'Rahul Sharma',
    age: 34,
    gender: 'Male',
    photo: portrait(PORTRAIT_IDS.patientMale, 240),
    blood: 'O+',
    mobileMasked: '+91 98490 •••• 87',
    city: 'Hyderabad',
    conditions: ['Essential hypertension — Stage 1', 'Dyslipidaemia'],
    allergies: ['Penicillin'],
    lastConsult: '18 Sep 2026',
    nextAppointment: 'Today, 5:30 PM',
    consults: 4,
    since: 'Mar 2024',
  },
  {
    id: 'KDC-PT-6620915',
    name: 'Meera Pillai',
    age: 52,
    gender: 'Female',
    photo: portrait(PORTRAIT_IDS.patientFemale, 240),
    blood: 'B+',
    mobileMasked: '+91 99490 •••• 12',
    city: 'Secunderabad',
    conditions: ['Type 2 diabetes mellitus', 'Hypothyroidism'],
    allergies: [],
    lastConsult: '02 Oct 2026',
    nextAppointment: 'Today, 11:30 AM',
    consults: 9,
    since: 'Jun 2022',
  },
  {
    id: 'KDC-PT-5519034',
    name: 'Imran Qureshi',
    age: 41,
    gender: 'Male',
    blood: 'A+',
    mobileMasked: '+91 90000 •••• 45',
    city: 'Hyderabad',
    conditions: ['Post-angioplasty follow-up (LAD stent, 2024)'],
    allergies: ['Sulfa drugs'],
    lastConsult: '21 Sep 2026',
    nextAppointment: 'Wed, 8 Oct',
    consults: 12,
    since: 'Jan 2021',
  },
  {
    id: 'KDC-PT-4482176',
    name: 'Sunita Rao',
    age: 63,
    gender: 'Female',
    blood: 'AB+',
    mobileMasked: '+91 98661 •••• 33',
    city: 'Kompally',
    conditions: ['Chronic heart failure — NYHA II', 'Atrial fibrillation'],
    allergies: ['Iodinated contrast'],
    lastConsult: '28 Sep 2026',
    consults: 21,
    since: 'Aug 2019',
  },
  {
    id: 'KDC-PT-3390841',
    name: 'Vikram Chandra',
    age: 28,
    gender: 'Male',
    blood: 'O−',
    mobileMasked: '+91 93910 •••• 70',
    city: 'Madhapur',
    conditions: ['Palpitations — under evaluation'],
    allergies: [],
    lastConsult: '04 Oct 2026',
    consults: 2,
    since: 'Sep 2026',
  },
  {
    id: 'KDC-PT-2284590',
    name: 'Lakshmi Narayan',
    age: 47,
    gender: 'Female',
    blood: 'B−',
    mobileMasked: '+91 97000 •••• 18',
    city: 'Gachibowli',
    conditions: ['Hypertension', 'Obesity — Class I'],
    allergies: [],
    lastConsult: '15 Sep 2026',
    nextAppointment: 'Thu, 9 Oct',
    consults: 6,
    since: 'Feb 2023',
  },
  {
    id: 'KDC-PT-1176302',
    name: 'Kavitha Reddy',
    age: 38,
    gender: 'Female',
    blood: 'A−',
    mobileMasked: '+91 94900 •••• 26',
    city: 'Banjara Hills',
    conditions: ['Mitral valve prolapse'],
    allergies: ['Aspirin'],
    lastConsult: '30 Sep 2026',
    consults: 5,
    since: 'Nov 2023',
  },
  {
    id: 'KDC-PT-9903517',
    name: 'Prakash Menon',
    age: 58,
    gender: 'Male',
    blood: 'O+',
    mobileMasked: '+91 99590 •••• 61',
    city: 'Kukatpally',
    conditions: ['Ischaemic heart disease', 'Type 2 diabetes mellitus'],
    allergies: [],
    lastConsult: '12 Sep 2026',
    consults: 17,
    since: 'Apr 2020',
  },
]

/* --------------------------------------------------------- Appointments */

export const appointments: Omit<Appointment, 'dateKey'>[] = [
  { id: 'KDC-AP-88412', patientId: patients[1].id, mode: 'video', time: '11:30 AM', endTime: '11:45 AM', date: 'Today, 5 Oct 2026', status: 'waiting', reason: 'HbA1c review and dose adjustment', fee: 800, isFollowUp: true },
  { id: 'KDC-AP-88419', patientId: patients[4].id, mode: 'audio', time: '11:50 AM', endTime: '12:02 PM', date: 'Today, 5 Oct 2026', status: 'waiting', reason: 'Palpitations — Holter report discussion', fee: 600, isFollowUp: false },
  { id: 'KDC-AP-88431', patientId: patients[0].id, mode: 'video', time: '5:30 PM', endTime: '5:45 PM', date: 'Today, 5 Oct 2026', status: 'upcoming', reason: 'Blood pressure not controlled on current medication', fee: 800, isFollowUp: true },
  { id: 'KDC-AP-88437', patientId: patients[6].id, mode: 'clinic', time: '6:15 PM', endTime: '6:35 PM', date: 'Today, 5 Oct 2026', status: 'upcoming', reason: 'Echocardiogram review', fee: 1000, isFollowUp: false, clinicRoom: 'Consulting Room 4, Block B' },
  { id: 'KDC-AP-88444', patientId: patients[7].id, mode: 'video', time: '7:00 PM', endTime: '7:15 PM', date: 'Today, 5 Oct 2026', status: 'upcoming', reason: 'Chest discomfort on exertion', fee: 800, isFollowUp: false },
  { id: 'KDC-AP-88390', patientId: patients[3].id, mode: 'video', time: '9:30 AM', endTime: '9:45 AM', date: 'Today, 5 Oct 2026', status: 'completed', reason: 'Heart failure review', fee: 800, isFollowUp: true },
  { id: 'KDC-AP-88392', patientId: patients[2].id, mode: 'clinic', time: '10:00 AM', endTime: '10:20 AM', date: 'Today, 5 Oct 2026', status: 'completed', reason: 'Post-stent six-month review', fee: 1000, isFollowUp: true, clinicRoom: 'Consulting Room 4, Block B' },
  { id: 'KDC-AP-88396', patientId: patients[5].id, mode: 'audio', time: '10:30 AM', endTime: '10:42 AM', date: 'Today, 5 Oct 2026', status: 'completed', reason: 'Medication side-effect query', fee: 600, isFollowUp: false },
  { id: 'KDC-AP-88311', patientId: patients[4].id, mode: 'video', time: '4:00 PM', endTime: '4:15 PM', date: 'Sat, 4 Oct 2026', status: 'cancelled', reason: 'Cancelled by patient · 2 hours before', fee: 800, isFollowUp: false },
  { id: 'KDC-AP-88307', patientId: patients[7].id, mode: 'video', time: '12:00 PM', endTime: '12:15 PM', date: 'Sat, 4 Oct 2026', status: 'no-show', reason: 'Patient did not join', fee: 800, isFollowUp: false },
]

/** Timeline rows for the Home schedule and the day calendar. */
export const todaySchedule = [
  { time: '9:30 AM', apptId: 'KDC-AP-88390' },
  { time: '10:00 AM', apptId: 'KDC-AP-88392' },
  { time: '10:30 AM', apptId: 'KDC-AP-88396' },
  { time: '11:30 AM', apptId: 'KDC-AP-88412' },
  { time: '11:50 AM', apptId: 'KDC-AP-88419' },
  { time: '1:00 PM', break: 'Break · Ward round' },
  { time: '5:30 PM', apptId: 'KDC-AP-88431' },
  { time: '6:15 PM', apptId: 'KDC-AP-88437' },
  { time: '7:00 PM', apptId: 'KDC-AP-88444' },
]

export const pendingActions = [
  { id: 'pa0', kind: 'followup' as const, title: 'Running 22 minutes behind', body: '3 patients affected · notify them of the new times', action: 'Review', screen: 'dr-st-running-late' },
  { id: 'pa1', kind: 'prescription' as const, title: 'Prescription not sent', body: 'Sunita Rao · consultation closed 9:45 AM', action: 'Complete', screen: 'dr-rx-create' },
  { id: 'pa2', kind: 'report' as const, title: '2 reports awaiting review', body: 'Imran Qureshi · Lipid Profile, Serum Creatinine', action: 'Review', screen: 'dr-reports' },
  { id: 'pa3', kind: 'followup' as const, title: 'Follow-up not scheduled', body: 'Lakshmi Narayan · advised 4-week review', action: 'Schedule', screen: 'dr-followup' },
]

/* ---------------------------------------------------------- Availability */

export const weeklySchedule = [
  { day: 'Monday', short: 'Mon', on: true, blocks: ['09:00 AM – 01:00 PM', '05:00 PM – 09:00 PM'], modes: ['video', 'audio', 'clinic'] as Mode[] },
  { day: 'Tuesday', short: 'Tue', on: true, blocks: ['09:00 AM – 01:00 PM'], modes: ['video', 'audio'] as Mode[] },
  { day: 'Wednesday', short: 'Wed', on: true, blocks: ['09:00 AM – 01:00 PM', '05:00 PM – 09:00 PM'], modes: ['video', 'audio', 'clinic'] as Mode[] },
  { day: 'Thursday', short: 'Thu', on: true, blocks: ['05:00 PM – 09:00 PM'], modes: ['video', 'clinic'] as Mode[] },
  { day: 'Friday', short: 'Fri', on: true, blocks: ['09:00 AM – 01:00 PM', '05:00 PM – 09:00 PM'], modes: ['video', 'audio', 'clinic'] as Mode[] },
  { day: 'Saturday', short: 'Sat', on: true, blocks: ['10:00 AM – 02:00 PM'], modes: ['video', 'audio'] as Mode[] },
  { day: 'Sunday', short: 'Sun', on: false, blocks: [], modes: [] as Mode[] },
]

export const blockedTime = [
  { id: 'b1', reason: 'Leave', label: 'Annual leave', date: '12 – 14 Oct 2026', time: 'All day' },
  { id: 'b2', reason: 'Meeting', label: 'Cath lab review', date: 'Wed, 8 Oct 2026', time: '2:00 PM – 3:30 PM' },
]

export const blockReasons = ['Personal', 'Meeting', 'Leave', 'Emergency', 'Other']

/* -------------------------------------------------------- Clinical notes */

export const consultationDraft = {
  chiefComplaint: 'Headache and giddiness on standing, for the past 10 days.',
  symptoms: ['Headache', 'Postural giddiness', 'Reduced exercise tolerance'],
  observations: 'BP 148/94 mmHg (seated, right arm). Pulse 78 bpm, regular. No pedal oedema. S1 S2 normal, no murmur.',
  assessment: 'Blood pressure inadequately controlled on telmisartan 40 mg monotherapy. No evidence of target organ damage on current review.',
  diagnosis: ['Essential hypertension — Stage 1, uncontrolled', 'Dyslipidaemia'],
  advice: [
    'Restrict salt intake to under 5 g per day.',
    'Home BP log twice weekly, morning and evening.',
    'Brisk walk 30 minutes, five days a week.',
  ],
  vitals: { bp: '148/94 mmHg', pulse: '78 bpm', weight: '76 kg', spo2: '98%' },
}

export const draftPrescription = {
  id: 'KDC-RX-2026-91037',
  patientId: patients[0].id,
  date: '05 Oct 2026',
  diagnosis: ['Essential hypertension — Stage 1, uncontrolled'],
  medicines: [
    {
      name: 'Telma AM Tablet',
      strength: 'Telmisartan 40 mg + Amlodipine 5 mg',
      dosage: '1 tablet',
      frequency: 'Once daily',
      duration: '30 days',
      food: 'After food',
      instructions: 'Take in the morning. Do not stop without advice.',
    },
    {
      name: 'Rosuvas 10 Tablet',
      strength: 'Rosuvastatin 10 mg',
      dosage: '1 tablet',
      frequency: 'Once daily — bedtime',
      duration: '30 days',
      food: 'After food',
      instructions: 'Report muscle pain or weakness immediately.',
    },
  ],
  advice: consultationDraft.advice,
  investigations: ['Serum Creatinine & Electrolytes — after 4 weeks', 'Lipid Profile — after 8 weeks'],
  followUp: { required: true, date: 'Mon, 2 Nov 2026', mode: 'video' as Mode, note: 'Review BP log and renal profile.' },
}

/* ------------------------------------------------- Consultation history */

export const consultationHistory = [
  { id: 'c1', date: '05 Oct 2026', mode: 'video' as Mode, summary: 'Hypertension uncontrolled — combination therapy started', duration: '14 min', rxId: 'KDC-RX-2026-91037' },
  { id: 'c2', date: '18 Sep 2026', mode: 'audio' as Mode, summary: 'Report review — lipids borderline, statin continued', duration: '9 min', rxId: 'KDC-RX-2026-88214' },
  { id: 'c3', date: '20 Aug 2026', mode: 'clinic' as Mode, summary: 'Annual review — ECG and echocardiogram normal', duration: '22 min', rxId: 'KDC-RX-2026-80651' },
  { id: 'c4', date: '14 Mar 2026', mode: 'video' as Mode, summary: 'New diagnosis — essential hypertension, telmisartan started', duration: '18 min', rxId: 'KDC-RX-2026-61220' },
]

export const patientPrescriptions = [
  { id: 'KDC-RX-2026-91037', date: '05 Oct 2026', title: 'Hypertension — combination therapy', items: 2, status: 'active' as const },
  { id: 'KDC-RX-2026-88214', date: '18 Sep 2026', title: 'Lipid control — statin continued', items: 1, status: 'completed' as const },
  { id: 'KDC-RX-2026-80651', date: '20 Aug 2026', title: 'Annual review prescription', items: 3, status: 'completed' as const },
  { id: 'KDC-RX-2026-61220', date: '14 Mar 2026', title: 'Hypertension — initial therapy', items: 1, status: 'completed' as const },
]

/* ----------------------------------------------------- Diagnostic reports */

export const reports: Report[] = [
  { id: 'KDC-LR-77210', name: 'Lipid Profile — Complete', category: 'Blood Tests', date: '02 Oct 2026', lab: 'Dr. Lal PathLabs', status: 'ready', flagged: 2, params: 9 },
  { id: 'KDC-LR-77198', name: 'Serum Creatinine & Electrolytes', category: 'Blood Tests', date: '02 Oct 2026', lab: 'Dr. Lal PathLabs', status: 'ready', flagged: 0, params: 6 },
  { id: 'KDC-LR-76940', name: 'Complete Blood Count (CBC)', category: 'Blood Tests', date: '18 Sep 2026', lab: 'Vijaya Diagnostic Centre', status: 'reviewed', flagged: 1, params: 24 },
  { id: 'KDC-LR-76112', name: 'HbA1c (Glycosylated Haemoglobin)', category: 'Blood Tests', date: '18 Sep 2026', lab: 'Vijaya Diagnostic Centre', status: 'reviewed', flagged: 0, params: 2 },
  { id: 'KDC-IM-20418', name: '2D Echocardiogram', category: 'Imaging', date: '20 Aug 2026', lab: 'Apollo Hospitals — Cardiac Imaging', status: 'reviewed', flagged: 0, params: 0 },
  { id: 'KDC-IM-20407', name: 'Chest X-ray — PA view', category: 'Imaging', date: '20 Aug 2026', lab: 'Apollo Hospitals — Radiology', status: 'reviewed', flagged: 0, params: 0 },
  { id: 'KDC-LR-78004', name: 'Thyroid Profile (T3, T4, TSH)', category: 'Blood Tests', date: '05 Oct 2026', lab: 'Dr. Lal PathLabs', status: 'pending', flagged: 0, params: 3 },
]

export const reportDetail = {
  id: 'KDC-LR-77210',
  name: 'Lipid Profile — Complete',
  patientId: patients[0].id,
  lab: 'Dr. Lal PathLabs, Banjara Hills',
  collected: '02 Oct 2026, 7:20 AM',
  reported: '02 Oct 2026, 6:45 PM',
  pathologist: 'Dr. S. Venkatesh, MD (Pathology)',
  results: [
    { name: 'Total Cholesterol', value: '232', unit: 'mg/dL', range: '< 200', flag: 'high' as const },
    { name: 'Triglycerides', value: '186', unit: 'mg/dL', range: '< 150', flag: 'high' as const },
    { name: 'HDL Cholesterol', value: '41', unit: 'mg/dL', range: '> 40', flag: 'normal' as const },
    { name: 'LDL Cholesterol', value: '148', unit: 'mg/dL', range: '< 130', flag: 'borderline' as const },
    { name: 'VLDL Cholesterol', value: '37', unit: 'mg/dL', range: '< 30', flag: 'borderline' as const },
    { name: 'Total Cholesterol / HDL', value: '5.7', unit: '', range: '< 5.0', flag: 'high' as const },
  ],
}

/* ------------------------------------------------------------- Earnings */

export const earnings = {
  today: 8500,
  week: 52400,
  month: 218600,
  byMode: { video: 129000, audio: 35600, clinic: 54000 },
  consultsThisMonth: 268,
  avgPerConsult: 816,
  /** Mon–Sun, in ₹ */
  weekSeries: [7200, 9600, 6400, 11200, 8500, 9500, 0],
  monthSeries: [38400, 52100, 46700, 52400, 29000],
}

export const earningRows = [
  { id: 'e1', date: '05 Oct 2026', apptId: 'KDC-AP-88392', patient: 'Imran Qureshi', mode: 'clinic' as Mode, amount: 1000, status: 'settled' as const },
  { id: 'e2', date: '05 Oct 2026', apptId: 'KDC-AP-88390', patient: 'Sunita Rao', mode: 'video' as Mode, amount: 800, status: 'settled' as const },
  { id: 'e3', date: '05 Oct 2026', apptId: 'KDC-AP-88396', patient: 'Lakshmi Narayan', mode: 'audio' as Mode, amount: 600, status: 'processing' as const },
  { id: 'e4', date: '04 Oct 2026', apptId: 'KDC-AP-88301', patient: 'Prakash Menon', mode: 'video' as Mode, amount: 800, status: 'settled' as const },
  { id: 'e5', date: '04 Oct 2026', apptId: 'KDC-AP-88307', patient: 'Prakash Menon', mode: 'video' as Mode, amount: 0, status: 'no-show' as const },
  { id: 'e6', date: '03 Oct 2026', apptId: 'KDC-AP-88288', patient: 'Kavitha Reddy', mode: 'clinic' as Mode, amount: 1000, status: 'settled' as const },
]

export const payout = {
  available: 41200,
  pending: 11800,
  lastPayout: { amount: 96400, date: '01 Oct 2026' },
  nextPayout: { date: '08 Oct 2026', cycle: 'Weekly · every Wednesday' },
  bank: { name: 'HDFC Bank', holder: 'Arjun Mehta', account: '•••• •••• 7412', ifsc: 'HDFC0001204', branch: 'Jubilee Hills, Hyderabad' },
}

/* --------------------------------------------------------- Notifications */

export const notifications = [
  { id: 'n1', group: 'Today', category: 'Appointments' as const, title: 'Patient is waiting in the room', body: 'Meera Pillai · video consultation, 11:30 AM', time: '11:28 AM', unread: true, action: 'Join now' },
  { id: 'n2', group: 'Today', category: 'Appointments' as const, title: 'New appointment booked', body: 'Prakash Menon · video consultation, today 7:00 PM', time: '9:14 AM', unread: true },
  { id: 'n3', group: 'Today', category: 'Patients' as const, title: 'Report uploaded for review', body: 'Imran Qureshi · Lipid Profile, 2 values flagged', time: '8:02 AM', unread: false, action: 'Review' },
  { id: 'n4', group: 'Yesterday', category: 'Payments' as const, title: 'Payout credited', body: '₹96,400 credited to HDFC •••• 7412', time: '6:30 PM', unread: false },
  { id: 'n5', group: 'Yesterday', category: 'Appointments' as const, title: 'Appointment cancelled by patient', body: 'Vikram Chandra · 4 Oct, 4:00 PM', time: '2:10 PM', unread: false },
  { id: 'n6', group: 'This week', category: 'System' as const, title: 'Medical registration expiring', body: 'TSMC/FMR/48219 renews on 31 Dec 2026', time: 'Thu', unread: false, action: 'Update' },
  { id: 'n7', group: 'This week', category: 'Patients' as const, title: 'Prescription acknowledged', body: 'Sunita Rao marked the prescription as received', time: 'Wed', unread: false },
]

/* ---------------------------------------------------------- Support */

export const supportTopics = [
  { id: 's1', title: 'Appointments', body: 'Scheduling, cancellations, no-shows', articles: 12 },
  { id: 's2', title: 'Consultations', body: 'Video, audio and in-person workflow', articles: 15 },
  { id: 's3', title: 'Payments & Payouts', body: 'Settlement cycle, TDS, invoices', articles: 9 },
  { id: 's4', title: 'Technical Issues', body: 'Call quality, app errors, devices', articles: 11 },
  { id: 's5', title: 'Profile', body: 'Fees, availability, clinic details', articles: 8 },
  { id: 's6', title: 'Verification', body: 'Registration, documents, renewals', articles: 6 },
]

export const supportTicket = {
  id: 'KDC-ST-4471',
  subject: 'Video call dropped mid-consultation',
  status: 'in-progress' as const,
  priority: 'High',
  created: '04 Oct 2026, 4:22 PM',
  updated: '05 Oct 2026, 10:05 AM',
  thread: [
    { from: 'doctor' as const, at: '04 Oct, 4:22 PM', text: 'The video call with patient KDC-AP-88307 disconnected twice and would not reconnect. The consultation had to be completed over a phone call.' },
    { from: 'support' as const, at: '04 Oct, 5:01 PM', name: 'Nithya · KDC+ Support', text: 'Thank you for reporting this, Dr. Mehta. We can see two failed reconnect attempts on that session. Our engineering team is reviewing the call logs now.' },
    { from: 'support' as const, at: '05 Oct, 10:05 AM', name: 'Nithya · KDC+ Support', text: 'The issue was traced to a relay server in the South region. A fix has been deployed. The consultation fee for KDC-AP-88307 has been credited in full to your October settlement.' },
  ],
}

/* ------------------------------------------------------------ Verification */

export const verification = {
  status: 'pending' as const,
  submitted: '03 Oct 2026',
  expected: 'within 48 hours',
  documents: [
    { id: 'd1', label: 'Medical registration', file: 'TSMC_registration.pdf', size: '1.4 MB', state: 'verified' as const },
    { id: 'd2', label: 'Qualification — DM', file: 'DM_cardiology.pdf', size: '2.1 MB', state: 'verified' as const },
    { id: 'd3', label: 'Profile photograph', file: 'profile.jpg', size: '680 KB', state: 'review' as const },
    { id: 'd4', label: 'Government photo ID', file: '', size: '', state: 'missing' as const },
  ],
}
