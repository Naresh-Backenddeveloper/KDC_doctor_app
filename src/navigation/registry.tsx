import * as Auth from '../screens/auth'
import { DoctorHomeScreen } from '../screens/home'
import * as Appt from '../screens/appointments'
import * as Avail from '../screens/availability'
import * as Pat from '../screens/patients'
import * as Call from '../screens/consultation'
import * as Rx from '../screens/prescription'
import * as Rep from '../screens/reports'
import * as Earn from '../screens/earnings'
import * as Prof from '../screens/profile'
import * as States from '../screens/states'
import type { ScreenDef, Section, Flow } from './types'

export const DOCTOR_SECTIONS: Section[] = [
  { id: 'dr-onboarding', title: 'Onboarding & Verification', blurb: 'Sign-in, OTP and the medical-council verification gate.' },
  { id: 'dr-profile-setup', title: 'Professional Profile', blurb: 'The record patients see when they choose a doctor.' },
  { id: 'dr-home', title: 'Home Dashboard', blurb: 'The three-second read of the working day.' },
  { id: 'dr-appointments', title: 'Appointments', blurb: 'The day, the detail and the month.' },
  { id: 'dr-availability', title: 'Availability', blurb: 'Sessions, consultation duration and blocked time.' },
  { id: 'dr-patients', title: 'Patients', blurb: 'The clinical record: history, prescriptions and reports.' },
  { id: 'dr-consult', title: 'Consultation', blurb: 'Waiting room, video, audio, in-person and the clinical workspace.' },
  { id: 'dr-rx', title: 'Prescription & Follow-up', blurb: 'Writing, reviewing, sending and closing the loop.' },
  { id: 'dr-earnings', title: 'Earnings', blurb: 'Settlement, history and payouts.' },
  { id: 'dr-account', title: 'Profile, Settings & Support', blurb: 'Fees, clinic, bank, security and help.' },
  { id: 'dr-states', title: 'UI States', blurb: 'Loading, empty and the clinical exceptions of a real day.' },
]

export const DOCTOR_SCREENS: ScreenDef[] = [
  /* --------------------------------------------------------- Onboarding */
  { id: 'dr-splash', code: '01', title: 'Splash', section: 'dr-onboarding', Component: Auth.SplashScreen, note: 'Same brand, marked “For Doctors”.' },
  { id: 'dr-welcome', code: '02', title: 'Doctor Welcome', section: 'dr-onboarding', Component: Auth.WelcomeScreen, statusTone: 'light', note: 'Positioned to the clinician, not the patient.' },
  { id: 'dr-login', code: '03', title: 'Doctor Login', section: 'dr-onboarding', Component: Auth.LoginScreen, note: 'Council-registered mobile plus a password on new devices.' },
  { id: 'dr-otp', code: '04', title: 'OTP Verification', section: 'dr-onboarding', Component: Auth.OtpScreen, note: 'Anti-fraud notice framed around patient-record access.' },
  { id: 'dr-verification', code: '05', title: 'Professional Verification', section: 'dr-onboarding', Component: Auth.VerificationScreen, note: 'The gate: no bookings until documents clear.' },

  /* ------------------------------------------------------------ Profile */
  { id: 'dr-profile-setup', code: '06', title: 'Profile Setup', section: 'dr-profile-setup', Component: Auth.ProfileSetupScreen, note: 'Captured once, shown to every patient.' },
  { id: 'dr-professional-profile', code: '07', title: 'Professional Profile', section: 'dr-profile-setup', Component: Auth.ProfessionalProfileScreen, statusTone: 'light', note: 'Credentials as a record, on ink rather than brand blue.' },

  /* --------------------------------------------------------------- Home */
  { id: 'dr-home', code: '08', title: 'Doctor Dashboard', section: 'dr-home', Component: DoctorHomeScreen, statusTone: 'light', note: 'Waiting patients outrank everything else on the screen.' },

  /* ------------------------------------------------------- Appointments */
  { id: 'dr-appointments', code: '09', title: 'Appointment List', section: 'dr-appointments', Component: Appt.AppointmentListScreen, note: 'Grouped by clinical urgency, not just by time.' },
  { id: 'dr-appointment-detail', code: '10', title: 'Appointment Details', section: 'dr-appointments', Component: Appt.AppointmentDetailScreen, note: 'Allergies surface before anything else.' },
  { id: 'dr-calendar', code: '11', title: 'Appointment Calendar', section: 'dr-appointments', Component: Appt.CalendarScreen, note: 'Day load shown as a bar, so it survives colour blindness.' },

  /* -------------------------------------------------------- Availability */
  { id: 'dr-availability', code: '12', title: 'My Availability', section: 'dr-availability', Component: Avail.AvailabilityScreen, note: 'Slot ribbon reads booked, open and blocked at a glance.' },
  { id: 'dr-edit-availability', code: '13', title: 'Edit Availability', section: 'dr-availability', Component: Avail.EditAvailabilityScreen, note: 'Sessions, breaks, duration and modes in one pass.' },
  { id: 'dr-block-time', code: '14', title: 'Block Time', section: 'dr-availability', Component: Avail.BlockTimeScreen, note: 'States the consequence before the destructive action.' },

  /* ------------------------------------------------------------ Patients */
  { id: 'dr-patients', code: '15', title: 'Patients', section: 'dr-patients', Component: Pat.PatientsScreen, note: 'Search-led, with last and next contact on every row.' },
  { id: 'dr-patient-profile', code: '16', title: 'Patient Record', section: 'dr-patients', Component: Pat.PatientProfileScreen, note: 'Safety-critical data first; access window stated.' },
  { id: 'dr-patient-history', code: '17', title: 'Consultation History', section: 'dr-patients', Component: Pat.PatientHistoryScreen, note: 'Every past encounter with its prescription attached.' },
  { id: 'dr-patient-rx', code: '18', title: 'Prescription History', section: 'dr-patients', Component: Pat.PatientPrescriptionsScreen, note: 'Only what this doctor issued.' },
  { id: 'dr-reports', code: '19', title: 'Diagnostic Reports', section: 'dr-patients', Component: Pat.ReportsScreen, note: 'Awaiting review is called out above the list.' },

  /* -------------------------------------------------------- Consultation */
  { id: 'dr-waiting-room', code: '20', title: 'Pre-Consultation', section: 'dr-consult', Component: Call.WaitingRoomScreen, note: 'Patient readiness checked before device readiness.' },
  { id: 'dr-video-call', code: '21', title: 'Video Consultation', section: 'dr-consult', Component: Call.VideoCallScreen, statusTone: 'light', indicatorTone: 'light', note: 'Allergy stays pinned; clinical tools in a peek panel.' },
  { id: 'dr-audio-call', code: '22', title: 'Audio Consultation', section: 'dr-consult', Component: Call.AudioCallScreen, statusTone: 'light', indicatorTone: 'light', note: 'Reason for consultation stays on screen while listening.' },
  { id: 'dr-workspace', code: '23', title: 'Consultation Workspace', section: 'dr-consult', Component: Call.WorkspaceScreen, note: 'Eight numbered sections; progress is explicit.' },
  { id: 'dr-notes', code: '24', title: 'Clinical Notes', section: 'dr-consult', Component: Call.NotesScreen, note: 'Structured fields and recall chips — never one blank box.' },
  { id: 'dr-inperson', code: '24b', title: 'In-Person Consultation', section: 'dr-consult', Component: Appt.InPersonScreen, note: 'Room, arrival state and the four-step clinic workflow.' },

  /* -------------------------------------------------------- Prescription */
  { id: 'dr-rx-create', code: '25', title: 'Create Prescription', section: 'dr-rx', Component: Rx.CreatePrescriptionScreen, note: 'Allergy check banner sits above the medicine list.' },
  { id: 'dr-rx-review', code: '26', title: 'Prescription Review', section: 'dr-rx', Component: Rx.ReviewPrescriptionScreen, note: 'Exactly what the patient will receive.' },
  { id: 'dr-rx-sent', code: '27', title: 'Prescription Sent', section: 'dr-rx', Component: Rx.PrescriptionSentScreen, note: 'Confirms the three things that happened, not just one.' },
  { id: 'dr-report-detail', code: '29', title: 'Report Detail', section: 'dr-rx', Component: Rep.ReportDetailScreen, note: 'Clinical summary before the value table.' },
  { id: 'dr-followup', code: '30', title: 'Follow-up', section: 'dr-rx', Component: Rx.FollowUpScreen, note: 'Interval presets, because doctors think in weeks.' },
  { id: 'dr-consult-complete', code: '30b', title: 'Consultation Completed', section: 'dr-rx', Component: Rx.ConsultCompleteScreen, note: 'Closes the loop and hands off to the next appointment.' },

  /* ------------------------------------------------------------ Earnings */
  { id: 'dr-earnings', code: '31', title: 'Earnings Dashboard', section: 'dr-earnings', Component: Earn.EarningsScreen, statusTone: 'light', note: 'One headline figure, one trend, one split.' },
  { id: 'dr-earnings-history', code: '32', title: 'Earnings History', section: 'dr-earnings', Component: Earn.EarningsHistoryScreen, note: 'Grouped by day, totalled per day.' },
  { id: 'dr-payout', code: '33', title: 'Payout Details', section: 'dr-earnings', Component: Earn.PayoutScreen, note: 'Bank details masked; fee and TDS stated plainly.' },

  /* ------------------------------------------------------------- Account */
  { id: 'dr-notifications', code: '34', title: 'Notifications', section: 'dr-account', Component: Prof.NotificationsScreen, note: 'Grouped by recency, filtered by care category.' },
  { id: 'dr-profile', code: '35', title: 'Doctor Profile', section: 'dr-account', Component: Prof.ProfileScreen, statusTone: 'light', note: 'Practice first, account second.' },
  { id: 'dr-professional-info', code: '36', title: 'Professional Information', section: 'dr-account', Component: Prof.ProfessionalInfoScreen, note: 'Registration locked after verification.' },
  { id: 'dr-fees', code: '37', title: 'Consultation Fees', section: 'dr-account', Component: Prof.FeesScreen, note: 'Shows net earnings beside every fee entered.' },
  { id: 'dr-clinic', code: '38', title: 'Clinic Information', section: 'dr-account', Component: Prof.ClinicScreen, note: 'Map preview, address and consultation timings.' },
  { id: 'dr-bank', code: '39', title: 'Bank & Payout', section: 'dr-account', Component: Prof.BankScreen, note: 'Masked account, PAN and Section 194J TDS.' },
  { id: 'dr-bank-edit', code: '39b', title: 'Update Bank Details', section: 'dr-account', Component: Prof.BankEditScreen, note: 'Verification by ₹1 test credit stated before the save.' },
  { id: 'dr-settings', code: '40', title: 'Settings', section: 'dr-account', Component: Prof.SettingsScreen, note: 'Includes a patient-data access log.' },
  { id: 'dr-support', code: '41', title: 'Doctor Support', section: 'dr-account', Component: Prof.SupportScreen, note: 'Open ticket surfaces above the topic list.' },
  { id: 'dr-ticket', code: '42', title: 'Support Ticket', section: 'dr-account', Component: Prof.TicketScreen, note: 'A real thread with a resolution, not a status chip.' },

  /* -------------------------------------------------------------- States */
  { id: 'dr-st-loading', code: 'D01', title: 'Loading', section: 'dr-states', Component: States.LoadingScreen },
  { id: 'dr-st-skeleton', code: 'D02', title: 'Skeleton Loading', section: 'dr-states', Component: States.SkeletonScreen, statusTone: 'light' },
  { id: 'dr-st-no-appointments', code: 'D03', title: 'No Appointments', section: 'dr-states', Component: States.NoAppointmentsScreen },
  { id: 'dr-st-no-patients', code: 'D04', title: 'No Patients', section: 'dr-states', Component: States.NoPatientsScreen },
  { id: 'dr-st-no-earnings', code: 'D05', title: 'No Earnings', section: 'dr-states', Component: States.NoEarningsScreen },
  { id: 'dr-st-no-reports', code: 'D06', title: 'No Reports', section: 'dr-states', Component: States.NoReportsScreen },
  { id: 'dr-st-no-notifications', code: 'D07', title: 'No Notifications', section: 'dr-states', Component: States.NoNotificationsScreen },
  { id: 'dr-st-offline', code: 'D08', title: 'No Internet', section: 'dr-states', Component: States.OfflineScreen, note: 'Says what still works offline, and what does not.' },
  { id: 'dr-st-api-error', code: 'D09', title: 'API Error', section: 'dr-states', Component: States.ApiErrorScreen, note: 'Reassures that no clinical data was lost.' },
  { id: 'dr-st-off-duty', code: 'D10', title: 'Doctor Unavailable', section: 'dr-states', Component: States.OffDutyScreen },
  { id: 'dr-st-cancelled', code: 'D11', title: 'Patient Cancelled', section: 'dr-states', Component: States.PatientCancelledScreen, note: 'States the late-cancellation credit immediately.' },
  { id: 'dr-st-noshow', code: 'D12', title: 'Patient No-show', section: 'dr-states', Component: States.NoShowScreen },
  { id: 'dr-st-payment-pending', code: 'D13', title: 'Payment Pending', section: 'dr-states', Component: States.PaymentPendingScreen },
  { id: 'dr-st-payout-failed', code: 'D14', title: 'Payment Failed', section: 'dr-states', Component: States.PayoutFailedScreen },
  { id: 'dr-st-video-lost', code: 'D15', title: 'Video Connection Lost', section: 'dr-states', Component: States.VideoLostScreen, statusTone: 'light', indicatorTone: 'light', note: 'Offers an audio fallback before ending the call.' },
  { id: 'dr-st-audio-lost', code: 'D16', title: 'Audio Connection Lost', section: 'dr-states', Component: States.AudioLostScreen, statusTone: 'light', indicatorTone: 'light' },
  { id: 'dr-st-not-joined', code: 'D17', title: 'Patient Hasn’t Joined', section: 'dr-states', Component: States.PatientNotJoinedScreen, note: 'Gives the doctor something useful to do while waiting.' },
  { id: 'dr-st-running-late', code: 'D18', title: 'Doctor Running Late', section: 'dr-states', Component: States.RunningLateScreen, note: 'Names every affected patient and the new time.' },
  { id: 'dr-st-rx-failed', code: 'D19', title: 'Prescription Failed', section: 'dr-states', Component: States.PrescriptionFailedScreen },
  { id: 'dr-st-report-unavailable', code: 'D20', title: 'Report Unavailable', section: 'dr-states', Component: States.ReportUnavailableScreen },
]

export const DOCTOR_FLOWS: Flow[] = [
  {
    id: 'dr-consult',
    title: 'Consultation journey',
    blurb: 'Login through to a sent prescription and a scheduled follow-up.',
    steps: [
      'dr-login', 'dr-otp', 'dr-home', 'dr-appointments', 'dr-appointment-detail', 'dr-waiting-room',
      'dr-video-call', 'dr-patient-profile', 'dr-notes', 'dr-workspace', 'dr-rx-create', 'dr-rx-review',
      'dr-rx-sent', 'dr-followup', 'dr-consult-complete',
    ],
  },
  {
    id: 'dr-states',
    title: 'Exception states',
    blurb: 'Every loading, empty and error state of a consultation day, in review order.',
    steps: [
      'dr-st-loading', 'dr-st-skeleton', 'dr-st-no-appointments', 'dr-st-no-patients', 'dr-st-no-earnings',
      'dr-st-no-reports', 'dr-st-no-notifications', 'dr-st-off-duty', 'dr-st-not-joined', 'dr-st-noshow',
      'dr-st-cancelled', 'dr-st-running-late', 'dr-st-video-lost', 'dr-st-audio-lost', 'dr-st-rx-failed',
      'dr-st-report-unavailable', 'dr-st-payment-pending', 'dr-st-payout-failed', 'dr-st-offline', 'dr-st-api-error',
    ],
  },
  {
    id: 'dr-records',
    title: 'Patient record journey',
    blurb: 'From the dashboard into history, reports and a prescription.',
    steps: ['dr-home', 'dr-patients', 'dr-patient-profile', 'dr-patient-history', 'dr-reports', 'dr-report-detail', 'dr-rx-create'],
  },
  {
    id: 'dr-schedule',
    title: 'Availability journey',
    blurb: 'Managing the working week and blocking leave.',
    steps: ['dr-home', 'dr-availability', 'dr-edit-availability', 'dr-block-time', 'dr-calendar'],
  },
]
