import { Btn, Div, P, Span } from '../components/primitives/index'
import React from 'react'
import {
  Bell,
  CalendarDays,
  Users,
  CalendarClock,
  Play,
  ArrowRight,
} from '../components/primitives/icons'
import { Screen, DEVICE } from '../components/ui/Screen'
import { Logo } from '../components/ui/Logo'
import { Card, SectionHeader } from '../components/ui/Display'
import { HScroll } from '../components/ui/Nav'
import {
  DoctorAvatar,
  DoctorNav,
  DutyPill,
  MODE,
  PatientAvatar,
  PatientMeta,
  PendingActionRow,
  ScheduleRow,
  StatTile,
} from '../components/doctor/index'
import { todaySchedule } from '../mock-data/mock'
import { DEFAULT_APPT_ID } from '../mock-data/seed'
import { useNav } from '../navigation/navigation'
import { useAppointments } from '../store/appointments'
import { useAvailability } from '../store/availability'
import { LIVE } from '../services/config'
import { useDoctor } from '../store/doctor'
import { acceptRequest, openPrescriptionForPatient, roomFor, selectAppointment, selectPatient, setOnDuty } from '../store/flows'
import { useNotifications } from '../store/notifications'
import { countAwaiting, useRecords } from '../store/records'
import { nextUpcoming, summarize, todaysAppointments } from '../store/selectors'
import { greeting, minutesOf, todayHeader } from '../utils/date'
import type { Appointment, PendingAction } from '../types'

const QUICK = [
  { label: 'Start consult', Icon: Play, screen: 'dr-waiting-room', accent: true },
  { label: 'Appointments', Icon: CalendarDays, screen: 'dr-appointments' },
  { label: 'Patients', Icon: Users, screen: 'dr-patients' },
  { label: 'Availability', Icon: CalendarClock, screen: 'dr-availability' },
]

export function DoctorHomeScreen() {
  const nav = useNav()
  const doctor = useDoctor((s) => s.profile)
  const appointments = useAppointments((s) => s.appointments)
  const onDuty = useAppointments((s) => s.onDuty)
  const pendingActions = useAppointments((s) => s.pendingActions)
  const reports = useRecords((s) => s.reports)
  const patients = useRecords((s) => s.patients)
  const patientById = useRecords((s) => s.patientById)
  const hasUnread = useNotifications((s) => s.unreadCount() > 0)

  const summary = summarize(appointments)
  const today = todaysAppointments(appointments)
  const waiting = today.filter((a) => a.status === 'waiting')
  const next = nextUpcoming(appointments)
  const nextPatient = next ? patientById(next.patientId) : undefined
  const recent = patients.slice(0, 6)
  const breakFrom = useAvailability((s) => s.breakFrom)
  const scheduleRows = LIVE
    ? liveScheduleRows(today, breakFrom)
    : todaySchedule.flatMap((row): { row: { time: string; apptId?: string; break?: string }; appt?: Appointment }[] => {
        if (!row.apptId) return [{ row }]
        const appt = appointments.find((a) => a.id === row.apptId)
        return appt && appt.status !== 'cancelled' ? [{ row, appt }] : []
      })
  const breaks = scheduleRows.filter((r) => !r.appt).length
  const awaitingReports = countAwaiting(reports)
  const actions = pendingActions.flatMap((a) =>
    a.id === 'pa2'
      ? awaitingReports
        ? [{ ...a, title: `${awaitingReports} report${awaitingReports > 1 ? 's' : ''} awaiting review` }]
        : []
      : [a],
  )

  const toggleDuty = () => {
    setOnDuty(!onDuty)
    if (onDuty) nav.navigate('dr-st-off-duty')
  }
  const join = (a: Appointment) => {
    selectAppointment(a.id)
    nav.navigate(roomFor(a))
  }
  const openAppointment = (id: string) => {
    selectAppointment(id)
    nav.navigate('dr-appointment-detail')
  }
  const startConsult = () => {
    const target = waiting.find((a) => !a.requested) ?? next
    if (target) join(target)
    else nav.navigate('dr-waiting-room')
  }
  const openAction = (a: PendingAction) => {
    if (a.patientId && (a.screen === 'dr-rx-create' || a.screen === 'dr-followup')) openPrescriptionForPatient(a.patientId)
    else if (a.patientId) selectPatient(a.patientId)
    nav.navigate(a.screen)
  }

  return (
    <Screen background="bg-canvas" padTop={false} padBottom={false}>
      <Div className=" h-full overflow-y-auto pb-[112px]">
        {/* ------------------------------------------------- Command header */}
        <Div className="bg-ink-900 px-5 pb-5" style={{ paddingTop: DEVICE.safeTop + 8 }}>
          <Div className="flex-row items-center gap-3">
            <Btn onPress={() => nav.navigate('dr-profile', { tab: 'profile' })} className="tap">
              <DoctorAvatar src={doctor.photo} name={doctor.name} size={42} />
            </Btn>
            <Div className="min-w-0 flex-1">
              <P className="text-caption text-white/50">{greeting()}</P>
              <P className="truncate text-title-sm text-white">{doctor.shortName}</P>
            </Div>
            <DutyPill on={onDuty} onClick={toggleDuty} />
            <Btn
              onPress={() => nav.navigate('dr-notifications')}
              className="tap relative flex-col h-[38px] w-[38px] items-center justify-center rounded-full bg-white/10 ring-1 ring-inset  ring-white/15"
            >
              <Bell className="h-[17px] w-[17px] text-white" strokeWidth={2.1} />
              {hasUnread && (
                <Span className="absolute right-[9px] top-[9px] h-[7px] w-[7px] rounded-full bg-critical-500 ring-2 ring-ink-900" />
              )}
            </Btn>
          </Div>

          {/* Today at a glance — the three-second read */}
          <Div className="mt-5">
            <Div className="flex-row items-baseline justify-between">
              <P className="text-[11px] font-bold uppercase tracking-[.1em] text-white/45">{todayHeader()}</P>
              <Btn
                onPress={() => nav.navigate('dr-appointments', { tab: 'appointments' })}
                className="tap text-caption font-semibold text-white/70"
              >
                Full day →
              </Btn>
            </Div>
            <Div className="mt-3 flex-row divide-x divide-white/10">
              <StatTile value={summary.total} label="Appointments" onClick={() => nav.navigate('dr-appointments', { tab: 'appointments' })} />
              <StatTile value={summary.waiting} label="Waiting" tone="caution" onClick={() => nav.navigate('dr-appointments', { tab: 'appointments' })} />
              <StatTile value={summary.completed} label="Completed" tone="success" />
              <StatTile value={summary.upcoming} label="Upcoming" tone="brand" />
            </Div>
          </Div>
        </Div>

        {/* ------------------------------------------------ Waiting now ---- */}
        {waiting.length > 0 && (
          <Div className="px-5 pt-4">
            <Div className="overflow-hidden rounded-tile bg-white shadow-card ring-[1.5px] ring-inset  ring-caution-200">
              <Div className="flex-row items-center gap-2 bg-caution-50 px-4 py-2">
                <Span className="relative flex-row h-[7px] w-[7px]">
                  <Span className="absolute inline-flex flex-row h-full w-full animate-ping rounded-full bg-caution-600 opacity-60" />
                  <Span className="relative inline-flex flex-row h-[7px] w-[7px] rounded-full bg-caution-600" />
                </Span>
                <P className="text-[11px] font-bold uppercase tracking-[.08em] text-caution-700">
                  {waiting.length} {waiting.length === 1 ? 'patient' : 'patients'} waiting
                </P>
              </Div>
              {waiting.map((a, i) => {
                const p = patientById(a.patientId)
                const { Icon } = MODE[a.mode]
                return (
                  <Div key={a.id} className={`flex-row items-center gap-3 px-4 py-3 ${i < waiting.length - 1 ? 'border-b-[0.5px] border-ink-900/10' : ''}`}>
                    <PatientAvatar patient={p} size={38} />
                    <Div className="min-w-0 flex-1">
                      <P className="truncate text-title-sm text-ink-900">{p.name}</P>
                      <P className="truncate text-caption text-ink-500">
                        {a.time} · {MODE[a.mode].full}
                      </P>
                    </Div>
                    <Btn
                      onPress={() => (a.requested ? acceptRequest(a.id) : join(a))}
                      className="tap flex-row h-[34px] shrink-0 items-center gap-1.5 rounded-chip bg-brand-600 px-4 text-body-sm font-bold text-white shadow-cta"
                    >
                      <Icon className="h-[14px] w-[14px]" strokeWidth={2.4} />
                      {a.requested ? 'Accept' : 'Join'}
                    </Btn>
                  </Div>
                )
              })}
            </Div>
          </Div>
        )}

        {/* ------------------------------------------- Next appointment ---- */}
        {next && nextPatient && (
        <Div className="px-5 pt-5">
          <SectionHeader title="Next appointment" className="!px-0 pb-2.5" />
          <Card elevation="tile" padded={false} className="overflow-hidden">
            <Div className="flex-row items-start gap-3.5 p-4">
              <PatientAvatar patient={nextPatient} size={52} />
              <Div className="min-w-0 flex-1">
                <P className="truncate text-title-sm text-ink-900">{nextPatient.name}</P>
                <PatientMeta patient={nextPatient} extra={next.isFollowUp ? 'Follow-up' : 'New visit'} />
                <P className="mt-1.5 line-clamp-2 text-body-sm leading-[18px] text-ink-500">{next.reason}</P>
              </Div>
              <Div className="shrink-0 text-right">
                <P className="text-title-sm tabular-nums text-ink-900">{next.time}</P>
                <P className="mt-0.5 text-caption text-ink-400">{LIVE ? startsIn(next.time) : next.id === DEFAULT_APPT_ID ? 'in 2h 14m' : 'Today'}</P>
              </Div>
            </Div>

            <Div className="flex-row items-center gap-2 border-t border-ink-100 px-4 py-2.5">
              {React.createElement(MODE[next.mode].Icon, { className: 'h-[14px] w-[14px] shrink-0 text-ink-400', strokeWidth: 2.2 })}
              <Span className="text-caption font-medium text-ink-500">
                {MODE[next.mode].full} · {minutesOf(next.endTime) - minutesOf(next.time)} min
              </Span>
              <Span className="ml-auto text-caption tabular-nums text-ink-400">{next.id}</Span>
            </Div>

            <Btn
              onPress={() => openAppointment(next.id)}
              className="tap flex-row w-full items-center justify-center gap-2 border-t border-ink-100 bg-brand-50/70 py-3 text-body font-bold text-brand-700"
            >
              View Appointment
              <ArrowRight className="h-[15px] w-[15px]" strokeWidth={2.4} />
            </Btn>
          </Card>
        </Div>
        )}

        {/* ----------------------------------------------- Quick actions --- */}
        <Div className="px-5 pt-5">
          <Div className=" grid-cols-4 gap-2.5">
            {QUICK.map((q) => (
              <Btn
                key={q.label}
                onPress={() => (q.accent ? startConsult() : nav.navigate(q.screen))}
                className={`tap  flex-col items-center gap-2 rounded-tile px-1 py-3 ${
                  q.accent ? 'bg-brand-600 shadow-cta' : 'bg-white shadow-tile'
                }`}
              >
                <q.Icon
                  className={`h-[19px] w-[19px] ${q.accent ? 'text-white' : 'text-brand-600'}`}
                  strokeWidth={2.1}
                  fill={q.accent ? 'currentColor' : 'none'}
                />
                <Span
                  className={`w-full text-center text-[10.5px] font-bold leading-[13px] ${
                    q.accent ? 'text-white' : 'text-ink-900'
                  }`}
                >
                  {q.label}
                </Span>
              </Btn>
            ))}
          </Div>
        </Div>

        {/* --------------------------------------------- Today's schedule -- */}
        <Div className="pt-6">
          <SectionHeader
            title="Today's schedule"
            subtitle={`${scheduleRows.length - breaks} appointments${breaks ? ` · ${breaks} break` : ''}`}
            action="Calendar"
            onAction={() => nav.navigate('dr-calendar')}
            className="pb-3"
          />
          <Div className="px-5">
            <Card elevation="tile" className="!px-3 !py-4">
              {scheduleRows.map(({ row, appt }, i) => (
                <ScheduleRow
                  key={row.time}
                  time={row.time}
                  appt={appt}
                  breakLabel={row.break}
                  last={i === scheduleRows.length - 1}
                  onClick={() => appt && openAppointment(appt.id)}
                />
              ))}
            </Card>
          </Div>
        </Div>

        {/* --------------------------------------------- Pending actions --- */}
        <Div className="pt-5">
          <SectionHeader title="Pending actions" subtitle={`${actions.length} ${actions.length === 1 ? 'item needs' : 'items need'} you`} className="pb-2.5" />
          <Div className="px-5">
            {actions.length === 0 ? (
              <P className="text-body-sm text-ink-400">Nothing needs you right now.</P>
            ) : <Card elevation="tile" padded={false} className="overflow-hidden">
              {actions.map((a, i) => (
                <PendingActionRow key={a.id} item={a} last={i === actions.length - 1} onClick={() => openAction(a)} />
              ))}
            </Card>}
          </Div>
        </Div>

        {/* ---------------------------------------------- Recent patients -- */}
        <Div className="pt-6">
          <SectionHeader
            title="Recent patients"
            action="All"
            onAction={() => nav.navigate('dr-patients', { tab: 'patients' })}
            className="pb-3"
          />
          <HScroll gap={10}>
            {recent.map((p) => (
              <Btn
                key={p.id}
                onPress={() => {
                  selectPatient(p.id)
                  nav.navigate('dr-patient-profile')
                }}
                className="tap  w-[108px] shrink-0 flex-col items-center rounded-tile bg-white p-3 text-center shadow-tile"
              >
                <PatientAvatar patient={p} size={44} />
                <P className="mt-2 w-full truncate text-[12px] font-bold text-ink-900">{p.name.split(' ')[0]}</P>
                <P className="mt-0.5 w-full truncate text-[10.5px] text-ink-400">
                  {p.age} · {p.gender === 'Male' ? 'M' : 'F'}
                </P>
                <P className="mt-1.5 w-full truncate text-[10px] text-ink-400">{p.lastConsult}</P>
              </Btn>
            ))}
          </HScroll>
        </Div>

        <Div className="flex-row items-center justify-center gap-2 px-5 pt-7">
          <Logo variant="wordmark" width={46} className="opacity-40" />
          <Span className="text-caption text-ink-300">for Doctors · v1.0.0</Span>
        </Div>
      </Div>

      <DoctorNav active="home" />
    </Screen>
  )
}

/** Live: today's timeline from the real appointments (not cancelled), with the break if it falls today. */
function liveScheduleRows(today: Appointment[], breakFrom: string): { row: { time: string; apptId?: string; break?: string }; appt?: Appointment }[] {
  const rows: { row: { time: string; apptId?: string; break?: string }; appt?: Appointment }[] = today
    .filter((a) => a.status !== 'cancelled' && a.status !== 'no-show')
    .map((a) => ({ row: { time: a.time.replace(/^0/, ''), apptId: a.id }, appt: a }))
  if (rows.length && breakFrom) rows.push({ row: { time: breakFrom.replace(/^0/, ''), break: 'Break' } })
  return rows.sort((x, y) => minutesOf(x.row.time) - minutesOf(y.row.time))
}

/** "in 2h 14m", "in 25m" or "now", from the device clock. */
function startsIn(time: string): string {
  const now = new Date()
  const diff = minutesOf(time) - (now.getHours() * 60 + now.getMinutes())
  if (diff <= 0) return 'now'
  const h = Math.floor(diff / 60)
  return `in ${h ? `${h}h ` : ''}${diff % 60}m`
}
