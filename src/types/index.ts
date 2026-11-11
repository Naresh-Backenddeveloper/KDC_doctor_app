export type Mode = 'video' | 'audio' | 'clinic';
export type ApptStatus = 'waiting' | 'upcoming' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female';
  photo?: string;
  blood: string;
  mobileMasked: string;
  city: string;
  conditions: string[];
  allergies: string[];
  lastConsult: string;
  nextAppointment?: string;
  consults: number;
  since: string;
  followUpDue?: boolean;
}

export interface Appointment {
  id: string;
  patientId: string;
  mode: Mode;
  time: string;
  endTime: string;
  date: string;
  /** Calendar day as YYYY-MM-DD; `date` is the display string. */
  dateKey: string;
  status: ApptStatus;
  reason: string;
  fee: number;
  isFollowUp: boolean;
  clinicRoom?: string;
  /** A patient request that needs accepting before it can be joined. */
  requested?: boolean;
}

export type ReportStatus = 'ready' | 'pending' | 'reviewed';

export interface Report {
  id: string;
  name: string;
  category: 'Blood Tests' | 'Imaging' | 'Other';
  date: string;
  lab: string;
  status: ReportStatus;
  flagged: number;
  params: number;
  patientId?: string;
  note?: string;
}

export interface ReportResult {
  name: string;
  value: string;
  unit: string;
  range: string;
  flag: 'normal' | 'borderline' | 'high';
}

export interface ReportDetail {
  id: string;
  name: string;
  patientId: string;
  lab: string;
  collected: string;
  reported: string;
  pathologist: string;
  summary: string;
  results: ReportResult[];
}

export interface ConsultationHistoryEntry {
  id: string;
  patientId: string;
  date: string;
  mode: Mode;
  summary: string;
  duration: string;
  rxId: string;
}

export interface PrescriptionSummary {
  id: string;
  patientId: string;
  date: string;
  title: string;
  items: number;
  status: 'active' | 'completed';
}

export interface Vitals {
  bp: string;
  pulse: string;
  weight: string;
  spo2: string;
}

export interface ConsultationDraft {
  key: string;
  chiefComplaint: string;
  symptoms: string[];
  observations: string;
  assessment: string;
  diagnosis: string[];
  advice: string[];
  vitals: Vitals;
  savedAt?: string;
}

export interface CatalogMedicine {
  id: string;
  name: string;
  strength: string;
  salts: string[];
  dosage: string;
  frequency: string;
  duration: string;
  food: string;
  instructions: string;
}

export interface AllergyOverride {
  allergens: string[];
  reason: string;
  at: string;
}

export interface PrescribedMedicine {
  name: string;
  strength: string;
  dosage: string;
  frequency: string;
  duration: string;
  food: string;
  instructions: string;
  allergyOverride?: AllergyOverride;
}

export interface FollowUp {
  required: boolean;
  date: string;
  mode: Mode;
  note: string;
  /** Set once the doctor has confirmed it on the follow-up screen. */
  scheduled?: boolean;
}

export type PrescriptionStatus = 'draft' | 'failed' | 'sent';

export interface Prescription {
  key: string;
  id: string;
  patientId: string;
  apptId?: string;
  date: string;
  diagnosis: string[];
  medicines: PrescribedMedicine[];
  advice: string[];
  investigations: string[];
  followUp: FollowUp;
  status: PrescriptionStatus;
  /** Set when the doctor has opened the review step at least once. */
  reviewed?: boolean;
}

export interface AllergyConflict {
  allergen: string;
  ingredient: string;
  kind: 'direct' | 'cross-reactive';
  note?: string;
}

export type VerificationStatus = 'pending' | 'approved' | 'rejected';
export type DocumentState = 'verified' | 'review' | 'missing' | 'rejected';

export interface VerificationDocument {
  id: string;
  label: string;
  file: string;
  size: string;
  state: DocumentState;
  /** Uploaded in this session, so the doctor may still remove it. */
  userUploaded?: boolean;
  /** 0–100 while an upload is running. */
  progress?: number;
}

export interface DeclaredDetails {
  name: string;
  regNo: string;
  council: string;
  specialization: string;
  qualification: string;
  experience: number;
}

export interface Qualification {
  degree: string;
  org: string;
  years: string;
}

export interface DoctorProfile {
  id: string;
  name: string;
  shortName: string;
  firstName: string;
  photo: string;
  qualification: string;
  specialization: string;
  subSpecialization: string;
  title: string;
  experience: number;
  languages: string[];
  regNo: string;
  council: string;
  mobile: string;
  mobileMasked: string;
  email: string;
  hospital: string;
  clinic: string;
  address: string;
  city: string;
  pin: string;
  clinicPhone: string;
  timings: string;
  rating: number;
  reviews: number;
  consults: number;
  verified: boolean;
  about: string;
  fees: Record<Mode, number>;
  modesEnabled: Record<Mode, boolean>;
  freeFollowUp: boolean;
  acceptsInPerson: boolean;
}

export interface Session {
  from: string;
  to: string;
}

export interface WorkingDay {
  day: string;
  short: string;
  on: boolean;
  sessions: Session[];
  modes: Mode[];
}

export interface BlockedTime {
  id: string;
  reason: string;
  label: string;
  date: string;
  time: string;
  fromKey: string;
  toKey: string;
  allDay: boolean;
  from?: string;
  to?: string;
  note?: string;
}

export interface EarningRow {
  id: string;
  date: string;
  apptId: string;
  patient: string;
  mode: Mode;
  amount: number;
  status: 'settled' | 'processing' | 'no-show';
}

export interface EarningsSummary {
  today: number;
  week: number;
  month: number;
  byMode: Record<Mode, number>;
  consultsThisMonth: number;
  avgPerConsult: number;
  weekSeries: number[];
  monthSeries: number[];
  settledThisMonth: number;
}

export interface FailedPayout {
  amount: number;
  attempted: string;
  account: string;
  reason: string;
}

export interface Payout {
  available: number;
  pending: number;
  lastPayout: { amount: number; date: string };
  nextPayout: { date: string; cycle: string };
  failed?: FailedPayout;
}

export type BankStatus = 'verified' | 'verifying';

export interface BankAccount {
  name: string;
  holder: string;
  account: string;
  ifsc: string;
  branch: string;
  type: string;
  status: BankStatus;
  pan: string;
  panHolder: string;
}

export interface BankUpdate {
  holder: string;
  accountNumber: string;
  ifsc: string;
  type: string;
  pan: string;
}

export type NotificationCategory = 'Appointments' | 'Patients' | 'Payments' | 'System';

export interface DoctorNotification {
  id: string;
  group: string;
  category: NotificationCategory;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  action?: string;
  screen?: string;
  apptId?: string;
  patientId?: string;
}

export interface TicketMessage {
  from: 'doctor' | 'support';
  at: string;
  name?: string;
  text: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  status: 'in-progress' | 'open' | 'resolved';
  priority: string;
  created: string;
  updated: string;
  thread: TicketMessage[];
}

export interface PendingAction {
  id: string;
  kind: 'prescription' | 'report' | 'followup';
  title: string;
  body: string;
  action: string;
  screen: string;
  patientId?: string;
}

export interface SettingsState {
  apptBooked: boolean;
  patientWaiting: boolean;
  apptCancelled: boolean;
  reportUploaded: boolean;
  payoutCredited: boolean;
  productUpdates: boolean;
  biometricLock: boolean;
  language: string;
}

export interface PickedFile {
  name: string;
  size: number;
  uri: string;
}
