import { Btn, Div, Img, P, Span } from '../components/primitives/index'
import React from 'react'
import {
  CalendarX2,
  UsersRound,
  IndianRupee,
  FileX2,
  BellOff,
  WifiOff,
  CloudOff,
  MoonStar,
  UserX,
  CalendarOff,
  Clock,
  CircleAlert,
  VideoOff,
  PhoneOff,
  Timer,
  SendHorizonal,
  FlaskConical,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  Bell,
} from '../components/primitives/icons'
import { Screen, DEVICE } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/Nav'
import { Button, StickyBar } from '../components/ui/Button'
import { Card, Divider, KeyValue, Segmented, StatusBadge } from '../components/ui/Display'
import { StateBlock, LoadingState, Skeleton, Banner, Toast } from '../components/ui/Feedback'
import { Logo, EcgLine } from '../components/ui/Logo'
import { DoctorNav, PatientAvatar, PatientMeta } from '../components/doctor/index'
import { patients, rupee } from '../mock-data/mock'
import { isDevLaunch, useNav } from '../navigation/navigation'
import { useAppointments } from '../store/appointments'
import { useBank } from '../store/bank'
import { useCurrentRxKey, useCurrentAppointment } from '../store/context'
import { useEarnings } from '../store/earnings'
import { loadSchedule, markNoShow, notifyRunningLate, sendPrescription, setOnDuty } from '../store/flows'
import { useNotifications } from '../store/notifications'
import { usePrescriptions } from '../store/prescriptions'
import { useRecords } from '../store/records'
import { LIVE } from '../services/config'
import { fullDate, TODAY_KEY } from '../utils/date'
import { ServiceError } from '../services'
import { syncAll } from '../services/live/sync'
import { useVerification } from '../store/verification'
import { useSelection } from '../store/selection'
import { MODE } from '../components/doctor/index'
import { showToast } from '../store/toast'


/** Shared chrome so each state sits in a believable place in the app. */
function StateScreen({
  title,
  children,
  tab,
  footer,
  background = 'bg-canvas',
}: {
  title?: string
  children: React.ReactNode
  tab?: 'home' | 'appointments' | 'patients' | 'earnings' | 'profile'
  footer?: React.ReactNode
  background?: string
}) {
  return (
    <Screen background={background} padBottom={false}>
      {title && <ScreenHeader title={title} />}
      <Div className=" flex-1 flex-col justify-center pb-[120px]">{children}</Div>
      {footer}
      {tab && <DoctorNav active={tab} />}
    </Screen>
  )
}

/* ------------------------------------------------------------- D01 Loading */

export function LoadingScreen() {
  const nav = useNav()
  React.useEffect(() => {
    if (isDevLaunch()) return
    let live = true
    if (LIVE) {
      // Everything comes from the server: profile, verification, schedule, patients, earnings…
      // Doctors still being verified go to their verification screen.
      syncAll()
        .then(() => live && (useVerification.getState().status === 'approved' ? nav.resetTo('dr-home', 'home') : nav.resetTo('dr-verification')))
        .catch((e) => {
          if (!live || (e instanceof ServiceError && e.code === 'session_ended')) return
          nav.resetTo('dr-st-api-error')
        })
      return () => {
        live = false
      }
    }
    loadSchedule()
      .then(() => live && nav.resetTo('dr-home', 'home'))
      .catch(() => live && nav.resetTo('dr-st-api-error'))
    return () => {
      live = false
    }
  }, [nav])
  return (
    <Screen background="bg-white" padBottom={false}>
      <Div className=" flex-1 flex-col items-center justify-center">
        <LoadingState label="Loading today's schedule…" />
      </Div>
      <Div className="absolute inset-x-0 bottom-0  flex-col items-center gap-2" style={{ paddingBottom: DEVICE.safeBottom + 24 }}>
        <Logo variant="wordmark" width={52} className="opacity-35" />
        <P className="text-caption text-ink-300">Verifying your session</P>
      </Div>
    </Screen>
  )
}

/* ------------------------------------------------------------ D02 Skeleton */

export function SkeletonScreen() {
  return (
    <Screen background="bg-canvas" padTop={false} padBottom={false}>
      <Div className="bg-ink-900 px-5 pb-5" style={{ paddingTop: DEVICE.safeTop + 8 }}>
        <Div className="flex-row items-center gap-3">
          <Skeleton className="h-[42px] w-[42px] !bg-white/15" rounded={14} />
          <Div className="flex-1 gap-2">
            <Skeleton className="h-[9px] w-[70px] !bg-white/15" />
            <Skeleton className="h-[13px] w-[120px] !bg-white/15" />
          </Div>
          <Skeleton className="h-[30px] w-[78px] !bg-white/15" rounded={12} />
        </Div>
        <Div className="mt-6 flex-row gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Div key={i} className="flex-1 gap-2">
              <Skeleton className="h-[22px] w-[34px] !bg-white/15" />
              <Skeleton className="h-[9px] w-[56px] !bg-white/15" />
            </Div>
          ))}
        </Div>
      </Div>

      <Div className="gap-3 px-5 pt-4">
        <Skeleton className="h-[13px] w-[130px]" />
        {[0, 1, 2].map((i) => (
          <Div key={i} className="rounded-tile bg-white p-4 shadow-tile">
            <Div className="flex-row gap-3.5">
              <Skeleton className="h-[34px] w-[54px]" />
              <Skeleton className="h-[38px] w-[38px]" rounded={12} />
              <Div className="flex-1 gap-2 pt-1">
                <Skeleton className="h-[12px] w-[58%]" />
                <Skeleton className="h-[10px] w-[42%]" />
                <Skeleton className="h-[10px] w-[72%]" />
              </Div>
            </Div>
          </Div>
        ))}
      </Div>

      <DoctorNav active="home" />
    </Screen>
  )
}

/* --------------------------------------------------- D03 No appointments */

export function NoAppointmentsScreen() {
  const nav = useNav()
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div className="bg-white" style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop }}>
        <Div className="px-5 pb-3 pt-4">
          <P className="text-title-lg text-ink-900">Appointments</P>
          <P className="mt-0.5 text-body-sm text-ink-500">{LIVE ? fullDate(TODAY_KEY) : 'Sunday, 11 October 2026'}</P>
        </Div>
        <Div className="px-5 pb-3.5">
          <Segmented
            options={[
              { id: 'today', label: 'Today', count: 0 },
              { id: 'upcoming', label: 'Upcoming', count: 7 },
              { id: 'completed', label: 'Completed' },
              { id: 'cancelled', label: 'Cancelled' },
            ]}
            value="today"
          />
        </Div>
      </Div>

      <Div className=" flex-1 flex-col justify-center pb-[120px]">
        <StateBlock
          tone="brand"
          icon={<CalendarX2 className="h-[31px] w-[31px]" strokeWidth={1.8} />}
          title="Nothing booked today"
          body="Sunday is outside your working days. Your next appointment is Monday at 9:30 AM."
          primary={<Button onClick={() => nav.navigate('dr-availability')}>Open a session</Button>}
          secondary={
            <Button variant="text" onClick={() => nav.navigate('dr-calendar')}>
              View the week
            </Button>
          }
        />
      </Div>

      <DoctorNav active="appointments" />
    </Screen>
  )
}

/* -------------------------------------------------------- D04 No patients */

export function NoPatientsScreen() {
  const nav = useNav()
  return (
    <StateScreen title="Patients" tab="patients">
      <StateBlock
        icon={<UsersRound className="h-[31px] w-[31px]" strokeWidth={1.8} />}
        title="No patients yet"
        body="Patients appear here after their first consultation with you. Their record stays available for 90 days afterwards."
        primary={<Button onClick={() => nav.navigate('dr-availability')}>Set your availability</Button>}
      />
    </StateScreen>
  )
}

/* -------------------------------------------------------- D05 No earnings */

export function NoEarningsScreen() {
  const nav = useNav()
  return (
    <StateScreen title="Earnings" tab="earnings">
      <StateBlock
        icon={<IndianRupee className="h-[30px] w-[30px]" strokeWidth={1.8} />}
        title="No earnings this month"
        body="Completed consultations appear here within 48 hours and settle every Wednesday."
        primary={
          <Button variant="tertiary" onClick={() => nav.navigate('dr-earnings-history')}>
            View last month
          </Button>
        }
      />
    </StateScreen>
  )
}

/* --------------------------------------------------------- D06 No reports */

export function NoReportsScreen() {
  const nav = useNav()
  return (
    <StateScreen title="Diagnostic reports">
      <StateBlock
        icon={<FlaskConical className="h-[31px] w-[31px]" strokeWidth={1.8} />}
        title="No reports on file"
        body="Reports ordered through KDC+ arrive here automatically. The patient can also upload reports from outside labs."
        primary={
          <Button variant="tertiary" onClick={() => nav.navigate('dr-rx-create')}>
            Request a test
          </Button>
        }
      />
    </StateScreen>
  )
}

/* --------------------------------------------------- D07 No notifications */

export function NoNotificationsScreen() {
  return (
    <StateScreen title="Notifications">
      <StateBlock
        icon={<BellOff className="h-[30px] w-[30px]" strokeWidth={1.8} />}
        title="You're all caught up"
        body="Appointment, patient and payment alerts will show here."
      />
    </StateScreen>
  )
}

/* ------------------------------------------------------------ D08 Offline */

export function OfflineScreen() {
  const nav = useNav()
  return (
    <StateScreen title="Appointments" tab="appointments">
      <StateBlock
        icon={<WifiOff className="h-[31px] w-[31px]" strokeWidth={1.8} />}
        title="No internet connection"
        body="Today's schedule is shown from your last sync at 9:12 AM. New bookings will not appear until you reconnect."
        primary={
          <Button icon={<RefreshCw className="h-[17px] w-[17px]" strokeWidth={2.3} />} onClick={() => nav.resetTo('dr-st-loading')}>
            Retry
          </Button>
        }
        secondary={
          <Button variant="tertiary" onClick={() => nav.navigate('dr-appointments', { tab: 'appointments' })}>
            View cached schedule
          </Button>
        }
      />
      <Div className="mt-7 px-6">
        <Banner
          tone="caution"
          icon={<AlertTriangle className="h-[16px] w-[16px]" strokeWidth={2.2} />}
          title="Consultations cannot start offline"
          body="Patients are told you are reconnecting."
        />
      </Div>
    </StateScreen>
  )
}

/* ---------------------------------------------------------- D09 API error */

export function ApiErrorScreen() {
  const nav = useNav()
  return (
    <StateScreen title="Patients" tab="patients">
      <StateBlock
        tone="critical"
        icon={<CloudOff className="h-[31px] w-[31px]" strokeWidth={1.8} />}
        title="We couldn't load this"
        body="The patient record service is not responding. No clinical data has been lost and nothing you entered was discarded."
        primary={
          <Button icon={<RefreshCw className="h-[17px] w-[17px]" strokeWidth={2.3} />} onClick={() => nav.resetTo('dr-st-loading')}>
            Try again
          </Button>
        }
        secondary={
          <Button variant="text" onClick={() => nav.navigate('dr-support')}>
            Report to support
          </Button>
        }
      />
      <P className="mt-7 text-center text-caption tabular-nums text-ink-300">Reference KDC-DR-5118 · 11:42 AM</P>
    </StateScreen>
  )
}

/* ------------------------------------------------- D10 Doctor unavailable */

export function OffDutyScreen() {
  const nav = useNav()
  const held = useAppointments((st) => st.heldRequests.length)
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div className=" flex-1 flex-col justify-center pb-[140px]">
        <StateBlock
          icon={<MoonStar className="h-[30px] w-[30px]" strokeWidth={1.8} />}
          title="You're off duty"
          body="New bookings are paused. Patients see your next available session instead of an empty calendar."
        />
        <Div className="mt-8 px-5">
          <Card elevation="tile">
            <KeyValue label="Off since" value="Today, 1:00 PM" />
            <KeyValue label="Next session" value="Tomorrow, 9:00 AM" />
            <Divider className="my-2.5" />
            <KeyValue label="Requests held" value={`${held} patient${held === 1 ? '' : 's'}`} tone="critical" />
          </Card>
        </Div>
      </Div>

      <StickyBar>
        <Div className="gap-2.5">
          <Button
            variant="success"
            onClick={() => {
              setOnDuty(true)
              nav.resetTo('dr-home', 'home')
            }}
          >
            Go on duty
          </Button>
          <Button variant="text" onClick={() => nav.navigate('dr-availability')}>
            Edit availability
          </Button>
        </Div>
      </StickyBar>
    </Screen>
  )
}

/* ------------------------------------------------------ D11 Patient cancelled */

export function PatientCancelledScreen() {
  const nav = useNav()
  const apptId = useSelection((st) => st.apptId)
  const appt = useAppointments((st) => st.appointments.find((a) => a.id === apptId && a.status === 'cancelled'))
  const cancelledPatient = useRecords((st) => (appt ? st.patientById(appt.patientId) : undefined))
  return (
    <Screen background="bg-white" padBottom={false}>
      <ScreenHeader title="Appointment" />
      <Div className=" flex-1 flex-col justify-center pb-[150px]">
        <StateBlock
          tone="critical"
          icon={<CalendarOff className="h-[31px] w-[31px]" strokeWidth={1.8} />}
          title={appt ? 'Appointment cancelled' : 'Patient cancelled'}
          body={
            appt && cancelledPatient
              ? `You cancelled ${cancelledPatient.name}'s ${appt.time} ${MODE[appt.mode].full.toLowerCase()}. They have been notified and refunded.`
              : 'Meera Pillai cancelled the 11:30 AM video consultation 42 minutes before the start time.'
          }
        />
        <Div className="mt-7 px-6">
          <Card elevation="tile">
            <KeyValue label="Appointment" value={appt?.id ?? 'KDC-AP-88412'} />
            <KeyValue label="Cancelled at" value="10:48 AM" />
            <Divider className="my-2.5" />
            <KeyValue label="Consultation fee" value={rupee(appt?.fee ?? 800)} />
            {!appt && <KeyValue label="Late-cancellation credit" value={rupee(400)} tone="success" strong />}
            {!appt && (
              <P className="mt-2 text-caption leading-[17px] text-ink-400">
                Cancellations inside one hour are credited at 50% under your practitioner agreement.
              </P>
            )}
          </Card>
        </Div>
      </Div>

      <StickyBar>
        <Div className="gap-2.5">
          <Button onClick={() => nav.resetTo('dr-appointments', 'appointments')}>Back to schedule</Button>
          <Button variant="text" onClick={() => nav.navigate('dr-availability')}>
            Open this slot for booking
          </Button>
        </Div>
      </StickyBar>
    </Screen>
  )
}

/* ---------------------------------------------------------- D12 No-show */

export function NoShowScreen() {
  const nav = useNav()
  const [calling, setCalling] = React.useState(false)
  const appt = useCurrentAppointment('KDC-AP-88444')
  const p = useRecords((st) => st.patientById(appt.patientId))
  const mark = () => {
    markNoShow(appt.id)
    showToast(`${p.name} marked as no-show`, 'info')
    nav.resetTo('dr-home', 'home')
  }
  return (
    <Screen background="bg-white" padBottom={false}>
      <ScreenHeader title="Waiting room" />
      <Div className=" flex-1 flex-col justify-center pb-[150px]">
        <StateBlock
          tone="caution"
          icon={<UserX className="h-[31px] w-[31px]" strokeWidth={1.8} />}
          title="Patient did not join"
          body={`${p.name} has not entered the waiting room 10 minutes after the scheduled start. Two reminders have been sent.`}
        />
        <Div className="mt-7 px-6">
          <Card elevation="tile">
            <Div className="flex-row items-center gap-3.5">
              <PatientAvatar patient={p} size={44} />
              <Div className="min-w-0 flex-1">
                <P className="truncate text-title-sm text-ink-900">{p.name}</P>
                <PatientMeta patient={p} />
              </Div>
              <StatusBadge tone="caution" dot>
                Not joined
              </StatusBadge>
            </Div>
            <Divider className="my-3" />
            <KeyValue label="Scheduled" value={appt.time} />
            <KeyValue label="Waiting" value="10 min 24 sec" />
          </Card>
        </Div>
      </Div>

      {calling && (
        <Div className="pointer-events-none absolute inset-x-5 z-50" style={{ bottom: 170 }}>
          <Toast tone="info" title={`Calling ${p.name}`} body={p.mobileMasked} />
        </Div>
      )}

      <StickyBar>
        <Div className="gap-2.5">
          <Button variant="tertiary" onClick={() => nav.navigate('dr-st-not-joined')}>
            Wait 5 more minutes
          </Button>
          <Div className="flex-row gap-2.5">
            <Button variant="tertiary" className="flex-1" onClick={() => setCalling(true)}>
              Call patient
            </Button>
            <Button variant="danger" className="flex-1" onClick={mark}>
              Mark no-show
            </Button>
          </Div>
        </Div>
      </StickyBar>
    </Screen>
  )
}

/* ------------------------------------------------------ D13 Payment pending */

export function PaymentPendingScreen() {
  const pending = useEarnings((st) => st.payout.pending)
  const next = useEarnings((st) => st.payout.nextPayout)
  return (
    <StateScreen title="Earnings" tab="earnings">
      <StateBlock
        tone="caution"
        icon={<Clock className="h-[30px] w-[30px]" strokeWidth={1.8} />}
        title="Settlement in progress"
        body={LIVE ? `${rupee(pending)} is clearing. It is released 48 hours after each consultation closes.` : `${rupee(pending)} from 14 consultations is clearing. It is released 48 hours after each consultation closes.`}
      />
      <Div className="mt-7 px-5">
        <Card elevation="tile">
          <KeyValue label="Clearing" value={rupee(pending)} />
          {!LIVE && <KeyValue label="Consultations" value="14" />}
          <KeyValue label="Expected" value={LIVE ? next.date : 'Wed, 8 Oct 2026'} tone="success" />
        </Card>
      </Div>
    </StateScreen>
  )
}

/* ------------------------------------------------------- D14 Payment failed */

export function PayoutFailedScreen() {
  const nav = useNav()
  const failed = useEarnings((st) => st.payout.failed)
  const bank = useBank((st) => st.bank)
  return (
    <Screen background="bg-white" padBottom={false}>
      <ScreenHeader title="Payouts" />
      <Div className=" flex-1 flex-col justify-center pb-[150px]">
        <StateBlock
          tone="critical"
          icon={<CircleAlert className="h-[31px] w-[31px]" strokeWidth={1.8} />}
          title="Payout could not be credited"
          body="Your bank rejected the transfer because the account name did not match. The money is safe and has been returned to your KDC+ balance."
        />
        <Div className="mt-7 px-6">
          <Card elevation="tile">
            <KeyValue label="Amount" value={rupee(failed?.amount ?? 41200)} strong />
            <KeyValue label="Attempted" value={failed?.attempted ?? '08 Oct 2026, 6:30 PM'} />
            <KeyValue label="Account" value={failed?.account ?? `${bank.name.split(' ')[0]} •••• ${bank.account.slice(-4)}`} />
            <Divider className="my-2.5" />
            <KeyValue label="Reason" value={failed?.reason ?? 'Name mismatch'} tone="critical" />
          </Card>
        </Div>
      </Div>

      <StickyBar>
        <Div className="gap-2.5">
          <Button onClick={() => nav.navigate('dr-bank-edit')}>Update bank details</Button>
          <Button variant="text" onClick={() => nav.navigate('dr-support')}>
            Contact support
          </Button>
        </Div>
      </StickyBar>
    </Screen>
  )
}

/* -------------------------------------------------- D15 Video connection lost */

export function VideoLostScreen() {
  const nav = useNav()
  const appt = useCurrentAppointment()
  const callPatient = useRecords((st) => st.patientById(appt.patientId))
  return (
    <Screen background="bg-black" padTop={false} padBottom={false}>
      <Div className="relative h-full w-full">
        <Img
          src={callPatient.photo}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-25 blur-[3px]"
          style={{ objectPosition: 'center 26%' }}
        />
        <Div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(5,12,20,.86) 0%, rgba(5,12,20,.93) 100%)' }} />

        <Div className="absolute inset-x-0  flex-col items-center px-8" style={{ top: '25%' }}>
          <Span className="flex-col h-[74px] w-[74px] items-center justify-center rounded-[24px] bg-white/10 ring-1 ring-inset  ring-white/15">
            <VideoOff className="h-[30px] w-[30px] text-white" strokeWidth={1.8} />
          </Span>
          <P className="mt-6 text-center text-title-md text-white">Connection lost</P>
          <P className="mt-2.5 max-w-[290px] text-center text-body-lg leading-[23px] text-white/65">
            Reconnecting to {callPatient.name}. Consultation time is paused and your notes are saved.
          </P>

          <Div className="mt-6 flex-row items-center gap-2.5 rounded-chip bg-white/10 px-4 py-2.5 ring-1 ring-inset  ring-white/15">
            <Span className="h-[7px] w-[7px] animate-pulse rounded-full bg-caution-500" />
            <Span className="text-body-sm font-semibold text-white">Reconnecting · attempt 2 of 5</Span>
          </Div>

          <Div className="mt-5 w-full max-w-[280px]">
            <EcgLine animate width={280} height={30} stroke="rgba(255,255,255,.4)" />
          </Div>
        </Div>

        <Div className="absolute inset-x-0 px-6" style={{ bottom: DEVICE.safeBottom + 22 }}>
          <Div className="gap-2.5">
            <Button variant="onDark" onClick={() => nav.navigate('dr-video-call')}>
              Rejoin consultation
            </Button>
            <Button variant="onDark" onClick={() => nav.navigate('dr-audio-call')}>
              Switch to audio
            </Button>
            <Button variant="danger" onClick={() => nav.navigate('dr-workspace')}>
              End and write notes
            </Button>
          </Div>
        </Div>
      </Div>
    </Screen>
  )
}

/* -------------------------------------------------- D16 Audio connection lost */

export function AudioLostScreen() {
  const nav = useNav()
  const appt = useCurrentAppointment('KDC-AP-88419')
  const callPatient = useRecords((st) => st.patientById(appt.patientId))
  return (
    <Screen background="bg-ink-900" padTop={false} padBottom={false}>
      <Div className="relative  h-full w-full flex-col items-center">
        <Div className="relative mt-[24%]  flex-col items-center px-8">
          <Div className="relative flex-col items-center justify-center">
            <PatientAvatar patient={callPatient} size={118} className="!rounded-[40px] opacity-50 " />
            <Span className="absolute flex-col h-[50px] w-[50px] items-center justify-center rounded-full bg-critical-600 ring-[4px] ring-ink-900">
              <PhoneOff className="h-[21px] w-[21px] text-white" strokeWidth={2.2} />
            </Span>
          </Div>

          <P className="mt-7 text-title-md text-white">Call disconnected</P>
          <P className="mt-2.5 max-w-[290px] text-center text-body-lg leading-[23px] text-white/60">
            The call with {callPatient.name} dropped at 04:36. The consultation remains open — your notes are intact.
          </P>

          <Div className="mt-6 flex-row items-center gap-2.5 rounded-chip bg-white/10 px-4 py-2.5 ring-1 ring-inset  ring-white/15">
            <AlertTriangle className="h-[14px] w-[14px] text-caution-400" strokeWidth={2.3} />
            <Span className="text-body-sm font-semibold text-white">Patient network unstable</Span>
          </Div>
        </Div>

        <Div className="absolute inset-x-0 px-6" style={{ bottom: DEVICE.safeBottom + 22 }}>
          <Div className="gap-2.5">
            <Button onClick={() => nav.navigate('dr-audio-call')}>Call again</Button>
            <Button variant="onDark" onClick={() => nav.navigate('dr-workspace')}>
              Continue to notes
            </Button>
          </Div>
        </Div>
      </Div>
    </Screen>
  )
}

/* -------------------------------------------------- D17 Patient hasn't joined */

export function PatientNotJoinedScreen() {
  const nav = useNav()
  const [reminded, setReminded] = React.useState(false)
  const appt = useCurrentAppointment()
  const waitingPatient = useRecords((st) => st.patientById(appt.patientId))
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Waiting room" />
      <Div className=" flex-1 flex-col items-center justify-center px-6 pb-[140px]">
        <Div className="relative flex-col h-[92px] w-[92px] items-center justify-center">
          <Span className="absolute inset-0 animate-pulseRing rounded-full bg-brand-600/18" />
          <Span className="absolute inset-0 animate-pulseRing rounded-full bg-brand-600/18 [animation-delay:.9s]" />
          <PatientAvatar patient={waitingPatient} size={66} className="relative opacity-60" />
        </Div>

        <P className="mt-6 text-center text-title-md text-ink-900">Waiting for {waitingPatient.name.split(' ')[0]}</P>
        <P className="mt-2.5 max-w-[300px] text-center text-body-lg leading-[23px] text-ink-500">
          The patient has been notified that you are ready. They usually join within two minutes.
        </P>

        <Div className="mt-6 flex-row items-center gap-2.5 rounded-chip bg-white px-4 py-3 shadow-tile">
          <Timer className="h-[16px] w-[16px] text-brand-600" strokeWidth={2.3} />
          <Span className="font-display text-[18px] font-bold tabular-nums text-ink-900">01:42</Span>
          <Span className="text-body-sm text-ink-400">waiting</Span>
        </Div>

        <Div className="mt-6 w-full">
          <Card elevation="tile">
            <P className="text-caption text-ink-400">While you wait</P>
            <Div className="mt-2.5 gap-2">
              {[
                { l: 'Review last consultation', s: 'dr-patient-history' },
                { l: 'Open diagnostic reports', s: 'dr-reports' },
              ].map((x) => (
                <Btn
                  key={x.l}
                  onPress={() => nav.navigate(x.s)}
                  className="tap flex-row w-full items-center justify-between rounded-[10px] bg-ink-50 px-3.5 py-2.5 text-left"
                >
                  <Span className="text-body text-ink-700">{x.l}</Span>
                  <ChevronRight className="h-[16px] w-[16px] text-ink-300" />
                </Btn>
              ))}
            </Div>
          </Card>
        </Div>
      </Div>

      <StickyBar>
        <Div className="flex-row gap-2.5">
          <Button variant="tertiary" className="flex-1" disabled={reminded} onClick={() => setReminded(true)}>
            {reminded ? 'Reminder sent' : 'Send reminder'}
          </Button>
          <Button variant="tertiary" className="flex-1 !text-critical-600" onClick={() => nav.navigate('dr-st-noshow')}>
            Mark no-show
          </Button>
        </Div>
      </StickyBar>
    </Screen>
  )
}

/* ------------------------------------------------------ D18 Running late */

export function RunningLateScreen() {
  const nav = useNav()
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Today" />
      <Div className=" flex-1 flex-col justify-center pb-[150px]">
        <StateBlock
          tone="caution"
          icon={<Timer className="h-[30px] w-[30px]" strokeWidth={1.8} />}
          title="You're running 22 minutes late"
          body="Three patients are affected. We can let them know and offer a revised time automatically."
        />

        <Div className="mt-7 px-5">
          <Card elevation="tile" padded={false} className="overflow-hidden">
            {patients.slice(0, 3).map((p, i, arr) => (
              <Div key={p.id} className={`flex-row items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? 'border-b-[0.5px] border-ink-900/10' : ''}`}>
                <PatientAvatar patient={p} size={36} />
                <Div className="min-w-0 flex-1">
                  <P className="truncate text-body-lg font-semibold text-ink-900">{p.name}</P>
                  <P className="truncate text-caption text-ink-400">
                    {['5:30 PM', '6:15 PM', '7:00 PM'][i]} → {['5:52 PM', '6:37 PM', '7:22 PM'][i]}
                  </P>
                </Div>
                <StatusBadge tone="caution">+22 min</StatusBadge>
              </Div>
            ))}
          </Card>
        </Div>
      </Div>

      <StickyBar>
        <Div className="gap-2.5">
          <Button
            onClick={async () => {
              await notifyRunningLate()
              showToast('3 patients notified of the new times')
              nav.resetTo('dr-home', 'home')
            }}
          >
            Notify all 3 patients
          </Button>
          <Button variant="text" onClick={() => nav.navigate('dr-appointments', { tab: 'appointments' })}>
            Adjust the schedule instead
          </Button>
        </Div>
      </StickyBar>
    </Screen>
  )
}

/* ------------------------------------------------ D19 Prescription failed */

export function PrescriptionFailedScreen() {
  const nav = useNav()
  const key = useCurrentRxKey()
  const rx = usePrescriptions((st) => st.drafts[key])
  const failedPatient = useRecords((st) => st.patientById(rx?.patientId ?? ''))
  const [retrying, setRetrying] = React.useState(false)

  const retry = async () => {
    setRetrying(true)
    const result = await sendPrescription(key)
    setRetrying(false)
    if (result.ok) nav.navigate('dr-rx-sent')
    else showToast('Still could not send', 'critical', 'The draft is saved. Try again in a moment.')
  }

  return (
    <Screen background="bg-white" padBottom={false}>
      <ScreenHeader title="Prescription" />
      <Div className=" flex-1 flex-col justify-center pb-[150px]">
        <StateBlock
          tone="critical"
          icon={<SendHorizonal className="h-[30px] w-[30px]" strokeWidth={1.8} />}
          title="Prescription not sent"
          body="The prescription is saved as a draft and nothing was lost. The patient has not received it yet."
        />
        <Div className="mt-7 px-6">
          <Card elevation="tile">
            <Div className="flex-row items-center gap-3.5">
              <PatientAvatar patient={failedPatient} size={42} />
              <Div className="min-w-0 flex-1">
                <P className="truncate text-body-lg font-semibold text-ink-900">{failedPatient.name}</P>
                <P className="truncate text-caption tabular-nums text-ink-400">
                  {rx?.id ?? 'KDC-RX-2026-91037'} · {rx?.medicines.length ?? 2} medicines
                </P>
              </Div>
              <StatusBadge tone="critical" dot>
                Draft
              </StatusBadge>
            </Div>
          </Card>
          <Div className="mt-3">
            <Banner
              tone="caution"
              icon={<AlertTriangle className="h-[16px] w-[16px]" strokeWidth={2.2} />}
              title="Tell the patient if this persists"
              body="They are waiting on this prescription to order medicines."
            />
          </Div>
        </Div>
      </Div>

      <StickyBar>
        <Div className="gap-2.5">
          <Button loading={retrying} icon={<RefreshCw className="h-[17px] w-[17px]" strokeWidth={2.3} />} onClick={retry}>
            Retry sending
          </Button>
          <Button variant="tertiary" onClick={() => nav.navigate('dr-rx-review')}>
            Review the draft
          </Button>
        </Div>
      </StickyBar>
    </Screen>
  )
}

/* ------------------------------------------------- D20 Report unavailable */

export function ReportUnavailableScreen() {
  const nav = useNav()
  const addNotification = useNotifications((st) => st.add)
  const reportId = useSelection((st) => st.reportId) ?? 'KDC-LR-78004'
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Report" subtitle={reportId} />
      <Div className=" flex-1 flex-col justify-center pb-[140px]">
        <StateBlock
          icon={<FileX2 className="h-[31px] w-[31px]" strokeWidth={1.8} />}
          title="Report not released yet"
          body="The sample is still being processed at Dr. Lal PathLabs. Results are released only after a pathologist signs them off."
        />
        <Div className="mt-7 px-5">
          <Card elevation="tile">
            <KeyValue label="Test" value="Thyroid Profile" />
            <KeyValue label="Collected" value="05 Oct 2026, 7:10 AM" />
            <KeyValue label="Expected" value="Today, 7:00 PM" tone="success" />
            <Divider className="my-2.5" />
            <Div className="flex-row items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Span key={i} className={`h-[4px] flex-1 rounded-full ${i <= 3 ? 'bg-brand-600' : 'bg-ink-100'}`} />
              ))}
            </Div>
            <P className="mt-2 text-caption text-ink-400">Step 3 of 5 · Analysis in progress</P>
          </Card>
        </Div>
      </Div>

      <StickyBar>
        <Div className="gap-2.5">
          <Button
            variant="tertiary"
            onClick={() => {
              addNotification({ category: 'Patients', title: 'Reminder set', body: `We will notify you when ${reportId} is released.` })
              showToast('We will notify you', 'info')
            }}
            icon={<Bell className="h-[16px] w-[16px]" strokeWidth={2.2} />}
          >
            Notify me when released
          </Button>
          <Button variant="text" onClick={() => nav.navigate('dr-reports')}>
            Back to reports
          </Button>
        </Div>
      </StickyBar>
    </Screen>
  )
}
