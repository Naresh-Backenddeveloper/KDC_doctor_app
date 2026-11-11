import { Btn, Div, Img, P, Span } from '../primitives/index'
import React, { useContext, useState } from 'react'
import {
  Video,
  Phone,
  Building2,
  ChevronRight,
  LayoutGrid,
  CalendarDays,
  Users,
  IndianRupee,
  UserRound,
  BadgeCheck,
  FileText,
  FlaskConical,
  Scan,
  CreditCard,
  Bell,
  CircleAlert,
  Clock,
} from '../primitives/icons'
import { useNav, type TabId } from '../../navigation/navigation'
import { InTabs } from '../ui/Nav'
import { DEVICE, tabBarInset } from '../ui/Screen'
import { StatusBadge } from '../ui/Display'
import { rupee } from '../../mock-data/mock'
import type { Appointment, ApptStatus, Mode, Patient, Report } from '../../types'
import { useRecords } from '../../store/records'

/* ------------------------------------------------------- Consultation mode */

export const MODE = {
  video: { label: 'Video', Icon: Video, full: 'Video consultation' },
  audio: { label: 'Audio', Icon: Phone, full: 'Audio consultation' },
  clinic: { label: 'In-person', Icon: Building2, full: 'In-person consultation' },
} as const

export function ModeTag({ mode, className = '' }: { mode: Mode; className?: string }) {
  const { Icon, label } = MODE[mode]
  return (
    <Span
      className={`inline-flex flex-row shrink-0 items-center gap-1.5 rounded-[7px] bg-ink-50 px-2 py-[3px] text-[11px] font-semibold text-ink-600 ${className}`}
    >
      <Icon className="h-[12px] w-[12px]" strokeWidth={2.3} />
      {label}
    </Span>
  )
}

/* ---------------------------------------------------------- Status tokens */

/** Status is carried by a word, a shape and a colour — never colour alone. */
export const STATUS: Record<ApptStatus, { label: string; tone: any; rail: string; dotShape: 'dot' | 'ring' | 'cross' }> = {
  waiting: { label: 'Waiting', tone: 'caution', rail: 'bg-caution-600', dotShape: 'dot' },
  'in-progress': { label: 'In progress', tone: 'brand', rail: 'bg-brand-600', dotShape: 'dot' },
  upcoming: { label: 'Upcoming', tone: 'neutral', rail: 'bg-ink-300', dotShape: 'ring' },
  completed: { label: 'Completed', tone: 'success', rail: 'bg-vital-600', dotShape: 'dot' },
  cancelled: { label: 'Cancelled', tone: 'critical', rail: 'bg-critical-600', dotShape: 'cross' },
  'no-show': { label: 'No-show', tone: 'critical', rail: 'bg-critical-600', dotShape: 'cross' },
}

/* ---------------------------------------------------------------- Avatars */

function initials(name: string) {
  return name
    .replace(/^Dr\.?\s+/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

/**
 * Patients are shown as a monogram unless a photo exists — most clinical
 * records have no photograph, and a monogram reads as a record, not a profile.
 */
export function PatientAvatar({
  patient,
  size = 44,
  className = '',
}: {
  patient: Pick<Patient, 'name' | 'photo' | 'gender'>
  size?: number
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const r = size * 0.3
  if (patient.photo && !failed) {
    return (
      <Img
        src={patient.photo}
        alt={patient.name}
        onError={() => setFailed(true)}
        className={`shrink-0 object-cover ${className}`}
        style={{ width: size, height: size, borderRadius: r, objectPosition: 'center 22%' }}
      />
    )
  }
  return (
    <Span
      className={`flex-col shrink-0 items-center justify-center bg-ink-100 ${className}`}
      style={{ width: size, height: size, borderRadius: r }}
    >
      <Span className="font-display font-bold text-ink-600" style={{ fontSize: size * 0.34 }}>
        {initials(patient.name)}
      </Span>
    </Span>
  )
}

export function DoctorAvatar({
  src,
  name,
  size = 44,
  className = '',
  ring,
}: {
  src?: string
  name: string
  size?: number
  className?: string
  ring?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const r = size * 0.32
  return (
    <Span
      className={`relative flex-col shrink-0 items-center justify-center overflow-hidden bg-brand-100 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: r,
        boxShadow: ring ? '0 0 0 2.5px rgba(255,255,255,.9), 0 0 0 4px rgba(0,104,200,.22)' : undefined,
      }}
    >
      {src && !failed ? (
        <Img
          src={src}
          alt={name}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
          style={{ objectPosition: 'center 20%' }}
        />
      ) : (
        <Span className="font-display font-bold text-brand-700" style={{ fontSize: size * 0.34 }}>
          {initials(name)}
        </Span>
      )}
    </Span>
  )
}

export function VerifiedDoctorBadge({ size = 15 }: { size?: number }) {
  return <BadgeCheck className="shrink-0 text-brand-600" style={{ width: size, height: size }} strokeWidth={2.4} />
}

/* ------------------------------------------------------- Patient identity */

/** The one-line clinical identity string used wherever a patient is named. */
export function PatientMeta({ patient, extra }: { patient: Patient; extra?: React.ReactNode }) {
  return (
    <P className="truncate text-body-sm text-ink-500">
      {patient.age} yrs · {patient.gender === 'Male' ? 'M' : 'F'}
      {extra ? <> · {extra}</> : null}
    </P>
  )
}

/* ------------------------------------------------------- Appointment card */

/**
 * Time-first: the doctor scans the clock column, then the patient. A coloured
 * rail on the left encodes status without spending colour on the whole card.
 */
export function ApptCard({
  appt,
  onClick,
  onAction,
  dense = false,
}: {
  appt: Appointment
  onClick?: () => void
  onAction?: () => void
  dense?: boolean
}) {
  const p = useRecords((st) => st.patientById(appt.patientId))
  const s = STATUS[appt.status]
  const { Icon } = MODE[appt.mode]
  const live = appt.status === 'waiting' || appt.status === 'in-progress'

  return (
    <Div className="relative overflow-hidden rounded-tile bg-white shadow-tile">
      <Span className={`absolute inset-y-0 left-0 w-[3px] ${s.rail}`} />
      <Btn onPress={onClick} className="tap flex-row w-full items-start gap-3.5 py-3.5 pl-4 pr-3.5 text-left">
        {/* Clock column */}
        <Div className="w-[62px] shrink-0 pt-[1px]">
          <P className="whitespace-nowrap text-title-sm tabular-nums leading-none text-ink-900" style={{ marginRight: -14 }}>{appt.time.replace(' ', '')}</P>
          <P className="mt-1 text-[10.5px] tabular-nums text-ink-400">to {appt.endTime.replace(' ', '')}</P>
        </Div>

        <Span className="mt-[3px] h-[34px] w-px shrink-0 bg-ink-100" />

        <PatientAvatar patient={p} size={38} />

        <Div className="min-w-0 flex-1">
          <P className="truncate text-title-sm text-ink-900">{p.name}</P>
          <PatientMeta patient={p} extra={appt.isFollowUp ? 'Follow-up' : 'New visit'} />
          {!dense && <P className="mt-1.5 line-clamp-1 text-body-sm leading-[18px] text-ink-500">{appt.reason}</P>}
          <Div className="mt-2 flex-row items-center gap-2">
            <ModeTag mode={appt.mode} />
            <StatusBadge tone={s.tone} dot={s.dotShape === 'dot'}>
              {s.label}
            </StatusBadge>
          </Div>
        </Div>
      </Btn>

      {live && onAction && (
        <Div className="flex-row items-center gap-2.5 border-t border-ink-100 bg-caution-50/60 px-4 py-2.5">
          <Span className="relative flex-row h-[7px] w-[7px] shrink-0">
            <Span className="absolute inline-flex flex-row h-full w-full animate-ping rounded-full bg-caution-600 opacity-60" />
            <Span className="relative inline-flex flex-row h-[7px] w-[7px] rounded-full bg-caution-600" />
          </Span>
          <P className="min-w-0 flex-1 truncate text-body-sm font-semibold text-caution-700">
            Patient waiting · 4 min
          </P>
          <Btn
            onPress={onAction}
            className="tap flex-row h-[32px] shrink-0 items-center gap-1.5 rounded-chip bg-brand-600 px-3.5 text-body-sm font-bold text-white shadow-cta"
          >
            <Icon className="h-[14px] w-[14px]" strokeWidth={2.4} />
            {appt.requested ? 'Accept' : 'Join'}
          </Btn>
        </Div>
      )}
    </Div>
  )
}

/* ------------------------------------------------------------ Stat tiles */

export function StatTile({
  value,
  label,
  tone = 'neutral',
  onClick,
}: {
  value: number | string
  label: string
  tone?: 'neutral' | 'caution' | 'success' | 'brand'
  onClick?: () => void
}) {
  const tones = {
    neutral: 'text-white',
    caution: 'text-caution-200',
    success: 'text-vital-200',
    brand: 'text-brand-200',
  }[tone]
  return (
    <Btn onPress={onClick} className="tap min-w-0 flex-1 px-1 text-left">
      <P className={`font-display text-[26px] font-extrabold leading-none tabular-nums ${tones}`}>{value}</P>
      <P className="mt-1.5 truncate text-[11px] font-medium text-white/55">{label}</P>
    </Btn>
  )
}

/* ------------------------------------------------------------- Schedule */

export function ScheduleRow({
  time,
  appt,
  breakLabel,
  onClick,
  last,
}: {
  time: string
  appt?: Appointment
  breakLabel?: string
  onClick?: () => void
  last?: boolean
}) {
  const patientById = useRecords((st) => st.patientById)
  const p = appt ? patientById(appt.patientId) : null
  const s = appt ? STATUS[appt.status] : null

  return (
    <Div className="relative flex-row gap-3">
      {/* Rail */}
      <Div className=" w-[58px] shrink-0 flex-col items-end pt-[2px]">
        <Span className="whitespace-nowrap text-[11.5px] font-semibold tabular-nums text-ink-500">{time.replace(' ', '')}</Span>
      </Div>
      <Div className="relative flex-row w-[14px] shrink-0 justify-center">
        {!last && <Span className="absolute top-[14px] w-[1.5px] rounded-full bg-ink-100" style={{ bottom: -6 }} />}
        <Span
          className={`relative z-10 mt-[5px] h-[9px] w-[9px] rounded-full ring-[2.5px] ring-white ${
            breakLabel ? 'bg-ink-200' : s?.rail ?? 'bg-ink-200'
          }`}
        />
      </Div>

      {breakLabel ? (
        <Div className="min-w-0 flex-1 pb-4">
          <Div className="rounded-[10px] border border-dashed border-ink-200 px-3 py-2">
            <P className="truncate text-body-sm font-medium text-ink-400">{breakLabel}</P>
          </Div>
        </Div>
      ) : (
        <Btn onPress={onClick} className="tap min-w-0 flex-1 pb-4 text-left">
          <Div className="flex-row items-center gap-2.5 rounded-[10px] bg-ink-50/70 px-3 py-2.5">
            <PatientAvatar patient={p!} size={28} />
            <Div className="min-w-0 flex-1">
              <P className="truncate text-body-sm font-bold text-ink-900">{p!.name}</P>
              <P className="truncate text-[11px] text-ink-500">
                {p!.age} yrs · {MODE[appt!.mode].full}
              </P>
            </Div>
            <StatusBadge tone={s!.tone} dot={s!.dotShape === 'dot'}>
              {s!.label}
            </StatusBadge>
          </Div>
        </Btn>
      )}
    </Div>
  )
}

/* ---------------------------------------------------------- Patient card */

export function PatientCard({ patient, onClick }: { patient: Patient; onClick?: () => void }) {
  return (
    <Btn
      onPress={onClick}
      className="tap flex-row w-full items-center gap-3.5 rounded-tile bg-white p-3.5 text-left shadow-tile"
    >
      <PatientAvatar patient={patient} size={46} />
      <Div className="min-w-0 flex-1">
        <P className="truncate text-title-sm text-ink-900">{patient.name}</P>
        <PatientMeta patient={patient} extra={patient.blood} />
        <Div className="mt-1.5 flex-row items-center gap-3 text-[11px] text-ink-400">
          <Span className="shrink-0">Seen {patient.lastConsult.replace(/\s\d{4}$/, '')}</Span>
          {patient.nextAppointment && (
            <Span className="min-w-0 truncate font-semibold text-brand-600">Next {patient.nextAppointment}</Span>
          )}
        </Div>
      </Div>
      <ChevronRight className="h-[17px] w-[17px] shrink-0 text-ink-300" />
    </Btn>
  )
}

/* ----------------------------------------------------------- Report card */

const REPORT_ICON = { 'Blood Tests': FlaskConical, Imaging: Scan, Other: FileText }

export function ReportCard({ report, onClick }: { report: Report; onClick?: () => void }) {
  const Icon = REPORT_ICON[report.category]
  const tone = report.status === 'pending' ? 'neutral' : report.flagged > 0 ? 'caution' : 'success'
  const label = report.status === 'pending' ? 'Awaiting' : report.status === 'reviewed' ? 'Reviewed' : 'New'
  return (
    <Btn
      onPress={onClick}
      className={`tap flex-row w-full items-start gap-3.5 rounded-tile bg-white p-3.5 text-left shadow-tile ${
        report.status === 'pending' ? 'opacity-70' : ''
      }`}
    >
      <Span className="flex-col h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] bg-ink-50">
        <Icon className="h-[17px] w-[17px] text-ink-500" strokeWidth={2.1} />
      </Span>
      <Div className="min-w-0 flex-1">
        <Div className="flex-row items-start justify-between gap-2">
          <P className="min-w-0 flex-1 truncate text-body-lg font-semibold text-ink-900">{report.name}</P>
          <StatusBadge tone={tone as any}>{label}</StatusBadge>
        </Div>
        <P className="mt-0.5 truncate text-caption text-ink-400">
          {report.date} · {report.lab}
        </P>
        {report.flagged > 0 && (
          <P className="mt-1.5 flex-row items-center gap-1.5 text-caption font-semibold text-caution-700">
            <CircleAlert className="h-[12px] w-[12px]" strokeWidth={2.4} />
            {report.flagged} of {report.params} values outside range
          </P>
        )}
      </Div>
    </Btn>
  )
}

/* ---------------------------------------------------------- Earnings row */

export function EarningRow({
  row,
  last,
}: {
  row: { date: string; apptId: string; patient: string; mode: Mode; amount: number; status: 'settled' | 'processing' | 'no-show' }
  last?: boolean
}) {
  const { Icon } = MODE[row.mode]
  const tone =
    row.status === 'settled' ? 'text-vital-700' : row.status === 'processing' ? 'text-caution-700' : 'text-ink-400'
  return (
    <Div className={`flex-row items-center gap-3.5 bg-white px-4 py-3 ${last ? '' : 'border-b-[0.5px] border-ink-900/10'}`}>
      <Span className="flex-col h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-ink-50">
        <Icon className="h-[15px] w-[15px] text-ink-500" strokeWidth={2.2} />
      </Span>
      <Div className="min-w-0 flex-1">
        <P className="truncate text-body-lg font-semibold text-ink-900">{row.patient}</P>
        <P className="truncate text-caption tabular-nums text-ink-400">
          {row.date} · {row.apptId}
        </P>
      </Div>
      <Div className="shrink-0 text-right">
        <P className={`text-body-lg font-bold tabular-nums ${row.amount ? 'text-ink-900' : 'text-ink-300'}`}>
          {row.amount ? rupee(row.amount) : '—'}
        </P>
        <P className={`text-caption font-semibold capitalize ${tone}`}>
          {row.status === 'no-show' ? 'No-show' : row.status}
        </P>
      </Div>
    </Div>
  )
}

/** Compact column chart — enough to read a trend, no chart library. */
export function BarChart({
  data,
  labels,
  highlight,
  height = 96,
}: {
  data: number[]
  labels: string[]
  highlight?: number
  height?: number
}) {
  const max = Math.max(...data, 1)
  return (
    <Div>
      <Div className="flex-row items-end gap-2" style={{ height }}>
        {data.map((v, i) => {
          const on = i === highlight
          return (
            <Div key={i} className=" min-w-0 flex-1 flex-col items-center justify-end gap-1.5" style={{ height }}>
              {on && <Span className="text-[10px] font-bold tabular-nums text-brand-700">{rupee(v)}</Span>}
              <Div
                className={`w-full rounded-[5px] ${on ? 'bg-brand-600' : v === 0 ? 'bg-ink-100' : 'bg-brand-200'}`}
                style={{ height: Math.max(4, (v / max) * (height - (on ? 20 : 4))) }}
              />
            </Div>
          )
        })}
      </Div>
      <Div className="mt-2 flex-row gap-2">
        {labels.map((l, i) => (
          <Span
            key={l}
            className={`min-w-0 flex-1 text-center text-[10.5px] ${
              i === highlight ? 'font-bold text-ink-700' : 'text-ink-400'
            }`}
          >
            {l}
          </Span>
        ))}
      </Div>
    </Div>
  )
}

/* ------------------------------------------------------ Notification card */

const NOTI_ICON = {
  Appointments: CalendarDays,
  Patients: UserRound,
  Payments: CreditCard,
  System: Bell,
} as const

export function DoctorNotificationCard({
  n,
  onAction,
  onPress,
}: {
  n: { category: keyof typeof NOTI_ICON; title: string; body: string; time: string; unread?: boolean; action?: string }
  onAction?: () => void
  onPress?: () => void
}) {
  const Icon = NOTI_ICON[n.category]
  return (
    <Div onPress={onPress} className={`flex-row gap-3.5 rounded-tile p-3.5 shadow-tile ${n.unread ? 'bg-brand-50/70' : 'bg-white'}`}>
      <Span
        className={`flex-col h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[11px] ${
          n.unread ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-500'
        }`}
      >
        <Icon className="h-[16px] w-[16px]" strokeWidth={2.1} />
      </Span>
      <Div className="min-w-0 flex-1">
        <Div className="flex-row items-start justify-between gap-3">
          <P className="text-body-lg font-semibold leading-[20px] text-ink-900">{n.title}</P>
          <Span className="shrink-0 pt-[2px] text-caption tabular-nums text-ink-400">{n.time}</Span>
        </Div>
        <P className="mt-0.5 text-body-sm leading-[18px] text-ink-500">{n.body}</P>
        {n.action && (
          <Btn onPress={onAction} className="tap mt-2 self-start text-body-sm font-bold text-brand-600">
            {n.action} →
          </Btn>
        )}
      </Div>
      {n.unread && <Span className="mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full bg-brand-600" />}
    </Div>
  )
}

/* ----------------------------------------------------------- Bottom nav */

const TABS: { id: TabId; label: string; icon: React.ComponentType<any>; screen: string }[] = [
  { id: 'home', label: 'Home', icon: LayoutGrid, screen: 'dr-home' },
  { id: 'appointments', label: 'Appointments', icon: CalendarDays, screen: 'dr-appointments' },
  { id: 'patients', label: 'Patients', icon: Users, screen: 'dr-patients' },
  { id: 'earnings', label: 'Earnings', icon: IndianRupee, screen: 'dr-earnings' },
  { id: 'profile', label: 'Profile', icon: UserRound, screen: 'dr-profile' },
]

export function DoctorNav({ active }: { active: TabId }) {
  const nav = useNav()
  if (useContext(InTabs)) return null
  return <DoctorNavBar active={active} onSelect={(t) => nav.resetTo(t.screen, t.id)} />
}
;(DoctorNav as any).overlay = true

export function DoctorNavBar({ active, onSelect }: { active: TabId; onSelect: (t: (typeof TABS)[number]) => void }) {
  return (
    <Div
      className="absolute inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 "
      style={{ paddingBottom: tabBarInset() }}
    >
      <Div className="flex-row items-start justify-around px-1 pt-2">
        {TABS.map((t) => {
          const on = t.id === active
          const Icon = t.icon
          return (
            <Btn
              key={t.id}
              onPress={() => onSelect(t)}
              className="tap  w-[72px] flex-col items-center gap-[5px] pb-1"
            >
              <Icon className={`h-[22px] w-[22px] ${on ? 'text-brand-600' : 'text-ink-400'}`} strokeWidth={on ? 2.4 : 1.9} />
              <Span className={`whitespace-nowrap text-[10.5px] leading-none ${on ? 'font-bold text-brand-600' : 'font-medium text-ink-400'}`}>
                {t.label}
              </Span>
            </Btn>
          )
        })}
      </Div>
    </Div>
  )
}

/* --------------------------------------------------------- Duty switch */

/** The doctor's own availability state — the one control that is always on screen. */
export function DutyPill({ on = true, onClick }: { on?: boolean; onClick?: () => void }) {
  return (
    <Btn
      onPress={onClick}
      className={`tap inline-flex flex-row items-center gap-2 rounded-chip px-2.5 py-[6px] ring-1 ring-inset   ${
        on ? 'bg-vital-600/15 border-vital-500/30' : 'bg-white/10 border-white/20'
      }`}
    >
      <Span className={`h-[7px] w-[7px] rounded-full ${on ? 'bg-vital-400' : 'bg-ink-300'}`} />
      <Span className="text-[11.5px] font-bold text-white">{on ? 'On duty' : 'Off duty'}</Span>
    </Btn>
  )
}

/* ------------------------------------------------- Clinical section block */

/** The collapsible unit the consultation workspace is built from. */
export function ClinicalSection({
  title,
  step,
  status,
  children,
  action,
  onAction,
  open = true,
}: {
  title: string
  step?: number
  status?: 'done' | 'empty' | 'active'
  children?: React.ReactNode
  action?: string
  onAction?: () => void
  open?: boolean
}) {
  return (
    <Div className="overflow-hidden rounded-tile bg-white shadow-tile">
      <Div className="flex-row items-center gap-2.5 px-4 pb-2 pt-3.5">
        {step !== undefined && (
          <Span
            className={`flex-col h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
              status === 'done' ? 'bg-vital-600 text-white' : status === 'active' ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500'
            }`}
          >
            {step}
          </Span>
        )}
        <P className="min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">{title}</P>
        {action && (
          <Btn onPress={onAction} className="tap shrink-0 text-body-sm font-semibold text-brand-600">
            {action}
          </Btn>
        )}
      </Div>
      {open && <Div className="px-4 pb-4">{children}</Div>}
    </Div>
  )
}

/* ------------------------------------------------------- Pending action */

const PENDING_ICON = { prescription: FileText, report: FlaskConical, followup: Clock }

export function PendingActionRow({
  item,
  onClick,
  last,
}: {
  item: { kind: keyof typeof PENDING_ICON; title: string; body: string; action: string }
  onClick?: () => void
  last?: boolean
}) {
  const Icon = PENDING_ICON[item.kind]
  return (
    <Btn
      onPress={onClick}
      className={`tap flex-row w-full items-center gap-3 bg-white px-4 py-3 text-left ${last ? '' : 'border-b-[0.5px] border-ink-900/10'}`}
    >
      <Span className="flex-col h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[10px] bg-caution-50">
        <Icon className="h-[15px] w-[15px] text-caution-700" strokeWidth={2.2} />
      </Span>
      <Div className="min-w-0 flex-1">
        <P className="truncate text-body-lg font-semibold text-ink-900">{item.title}</P>
        <P className="truncate text-caption text-ink-400">{item.body}</P>
      </Div>
      <Span className="shrink-0 text-body-sm font-bold text-brand-600">{item.action}</Span>
    </Btn>
  )
}

;(DoctorNav as any).overlay = true
