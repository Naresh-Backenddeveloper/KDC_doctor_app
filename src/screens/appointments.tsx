import { Btn, Div, P, Span, SvgBox, SvgG, SvgPath, SvgRect } from '../components/primitives/index'
import React from 'react'
import {
  Building2,
  CalendarClock,
  XCircle,
  UserX,
  MapPin,
  Copy,
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
  CalendarDays,
  CalendarX2,
  Navigation,
  ClipboardList,
} from '../components/primitives/icons'
import { Screen, DEVICE } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/Nav'
import { Button, IconButton, StickyBar } from '../components/ui/Button'
import { Card, Divider, KeyValue, SectionHeader, Segmented, StatusBadge, FilterChip, MetaChip } from '../components/ui/Display'
import { Banner, ModalSheet, StateBlock } from '../components/ui/Feedback'
import { ApptCard, DoctorNav, MODE, PatientAvatar, PatientMeta, STATUS } from '../components/doctor/index'
import { rupee } from '../mock-data/mock'
import { DEFAULT_APPT_ID, INPERSON_DEFAULT_APPT_ID } from '../mock-data/seed'
import { useNav } from '../navigation/navigation'
import { Field, SelectField } from '../components/ui/Inputs'
import { useAppointments } from '../store/appointments'
import { useDoctor } from '../store/doctor'
import { useAvailability } from '../store/availability'
import { useCurrentAppointment } from '../store/context'
import { acceptRequest, cancelAppointment, roomFor, rescheduleAppointment, selectAppointment, selectPatient, beginConsultation } from '../store/flows'
import { useEarnings } from '../store/earnings'
import { useRecords } from '../store/records'
import { useSelection } from '../store/selection'
import { appointmentsForTab, appointmentsOnDay, blockedDayKeys, isToday, NO_FILTERS, tabCount, type ApptFilters, type ApptTab } from '../store/selectors'
import { showToast } from '../store/toast'
import type { Appointment, Mode } from '../types'
import { addDays, dateOptions, fullDate, keyOfLabel, longDate, monthYear, parseKey, TIME_OPTIONS, TODAY_KEY, toKey } from '../utils/date'

/* ============================================ 09 — Appointment list ======= */

export function AppointmentListScreen() {
  const nav = useNav()
  const appointments = useAppointments((st) => st.appointments)
  const [tab, setTab] = React.useState<ApptTab>('today')
  const [filters, setFilters] = React.useState<ApptFilters>(NO_FILTERS)
  const [filterOpen, setFilterOpen] = React.useState(false)
  const list = appointmentsForTab(appointments, tab, filters)
  const waiting = list.filter((a) => a.status === 'waiting' || a.status === 'in-progress')
  const upcoming = list.filter((a) => a.status === 'upcoming')
  const completed = list.filter((a) => a.status === 'completed')
  const cancelled = list.filter((a) => a.status === 'cancelled' || a.status === 'no-show')

  const open = (a: Appointment) => {
    selectAppointment(a.id)
    nav.navigate('dr-appointment-detail')
  }
  const act = (a: Appointment) => {
    if (a.requested) {
      acceptRequest(a.id)
      return
    }
    selectAppointment(a.id)
    nav.navigate(roomFor(a))
  }
  const card = (a: Appointment, dense = false) => (
    <ApptCard key={a.id} appt={a} dense={dense} onClick={() => open(a)} onAction={() => act(a)} />
  )
  const byDate = (items: Appointment[]) => Array.from(new Set(items.map((a) => a.date))).map((date) => ({ date, items: items.filter((a) => a.date === date) }))

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div
        className="sticky z-30 bg-white"
        style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop, top: -DEVICE.safeTop }}
      >
        <Div className="flex-row items-end justify-between px-5 pb-3 pt-4">
          <Div>
            <P className="text-title-lg text-ink-900">Appointments</P>
            <P className="mt-0.5 text-body-sm text-ink-500">{fullDate(TODAY_KEY)}</P>
          </Div>
          <Div className="flex-row gap-1.5">
            <IconButton size={36} label="Calendar" onClick={() => nav.navigate('dr-calendar')}>
              <CalendarDays className="h-[17px] w-[17px] text-ink-700" strokeWidth={2.2} />
            </IconButton>
            <IconButton size={36} label="Filter" onClick={() => setFilterOpen(true)}>
              <Filter className="h-[16px] w-[16px] text-ink-700" strokeWidth={2.2} />
            </IconButton>
          </Div>
        </Div>
        <Div className="px-5 pb-3.5">
          <Segmented
            options={[
              { id: 'today', label: 'Today', count: tabCount(appointments, 'today') },
              { id: 'upcoming', label: 'Upcoming', count: tabCount(appointments, 'upcoming') },
              { id: 'completed', label: 'Completed' },
              { id: 'cancelled', label: 'Cancelled' },
            ]}
            value={tab}
            onChange={(id) => setTab(id as ApptTab)}
          />
        </Div>
      </Div>

      <Div className="gap-5 px-5 pb-[112px] pt-4">
        {list.length === 0 && (
          <Div className="pt-10">
            <StateBlock
              tone="brand"
              icon={<CalendarX2 className="h-[31px] w-[31px]" strokeWidth={1.8} />}
              title="Nothing here"
              body={filters === NO_FILTERS ? 'There are no appointments in this view.' : 'No appointments match these filters.'}
            />
          </Div>
        )}

        {tab === 'today' ? (
          <>
            {waiting.length > 0 && (
              <Div>
                <GroupLabel label="Waiting now" count={waiting.length} tone="caution" />
                <Div className="gap-2.5">{waiting.map((a) => card(a))}</Div>
              </Div>
            )}
            {upcoming.length > 0 && (
              <Div>
                <GroupLabel label="Later today" count={upcoming.length} />
                <Div className="gap-2.5">{upcoming.map((a) => card(a))}</Div>
              </Div>
            )}
            {completed.length > 0 && (
              <Div>
                <GroupLabel label="Completed" count={completed.length} tone="success" />
                <Div className="gap-2.5">{completed.map((a) => card(a, true))}</Div>
              </Div>
            )}
            {cancelled.length > 0 && (
              <Div>
                <GroupLabel label="Cancelled" count={cancelled.length} />
                <Div className="gap-2.5">{cancelled.map((a) => card(a, true))}</Div>
              </Div>
            )}
          </>
        ) : (
          byDate(list).map((g) => (
            <Div key={g.date}>
              <GroupLabel label={g.date} count={g.items.length} tone={tab === 'completed' ? 'success' : 'neutral'} />
              <Div className="gap-2.5">{g.items.map((a) => card(a, tab !== 'upcoming'))}</Div>
            </Div>
          ))
        )}
      </Div>

      <ModalSheet
        visible={filterOpen}
        title="Filter appointments"
        onClose={() => setFilterOpen(false)}
        footer={
          <Div className="flex-row gap-2.5">
            <Button variant="tertiary" className="flex-1" onClick={() => setFilters(NO_FILTERS)}>
              Clear
            </Button>
            <Button className="flex-[1.3]" onClick={() => setFilterOpen(false)}>
              Apply
            </Button>
          </Div>
        }
      >
        <Div className="gap-4 pb-2">
          <Div>
            <P className="mb-2 text-body-sm font-semibold text-ink-600">Consultation type</P>
            <Div className="flex-row flex-wrap gap-2">
              {(['video', 'audio', 'clinic'] as Mode[]).map((m) => {
                const on = filters.modes.includes(m)
                return (
                  <FilterChip
                    key={m}
                    active={on}
                    onClick={() => setFilters((f) => ({ ...f, modes: on ? f.modes.filter((x) => x !== m) : [...f.modes, m] }))}
                  >
                    {MODE[m].label}
                  </FilterChip>
                )
              })}
            </Div>
          </Div>
          <Div>
            <P className="mb-2 text-body-sm font-semibold text-ink-600">Visit</P>
            <Div className="flex-row flex-wrap gap-2">
              {([
                ['all', 'All visits'],
                ['new', 'New visit'],
                ['followup', 'Follow-up'],
              ] as const).map(([id, label]) => (
                <FilterChip key={id} active={filters.visit === id} onClick={() => setFilters((f) => ({ ...f, visit: id }))}>
                  {label}
                </FilterChip>
              ))}
            </Div>
          </Div>
        </Div>
      </ModalSheet>

      <DoctorNav active="appointments" />
    </Screen>
  )
}

function GroupLabel({ label, count, tone = 'neutral' }: { label: string; count: number; tone?: 'neutral' | 'caution' | 'success' }) {
  const dot = { neutral: 'bg-ink-300', caution: 'bg-caution-600', success: 'bg-vital-600' }[tone]
  return (
    <Div className="mb-2.5 flex-row items-center gap-2">
      <Span className={`h-[6px] w-[6px] rounded-full ${dot}`} />
      <P className="text-caption font-bold uppercase tracking-[.08em] text-ink-500">{label}</P>
      <Span className="text-caption tabular-nums text-ink-300">{count}</Span>
    </Div>
  )
}

/* ========================================= 10 — Appointment details ====== */

export function AppointmentDetailScreen() {
  const nav = useNav()
  const a = useCurrentAppointment(DEFAULT_APPT_ID)
  const p = useRecords((st) => st.patientById(a.patientId))
  const { Icon, full } = MODE[a.mode]
  const s = STATUS[a.status]
  const [confirmCancel, setConfirmCancel] = React.useState(false)
  const [rescheduling, setRescheduling] = React.useState(false)
  const closed = a.status === 'completed' || a.status === 'cancelled' || a.status === 'no-show'

  const primary =
    a.mode === 'video'
      ? { label: 'Join Consultation', screen: 'dr-waiting-room' }
      : a.mode === 'audio'
        ? { label: 'Start Audio Consultation', screen: 'dr-audio-call' }
        : { label: 'View Clinic Details', screen: 'dr-inperson' }

  const startPrimary = () => {
    selectAppointment(a.id)
    if (a.mode === 'audio') nav.navigate(beginConsultation(a.id))
    else nav.navigate(primary.screen)
  }
  const openPatient = (screen: string) => {
    selectPatient(p.id)
    useSelection.getState().select({ apptId: a.id })
    nav.navigate(screen)
  }
  const doCancel = () => {
    cancelAppointment(a.id)
    setConfirmCancel(false)
    nav.navigate('dr-st-cancelled')
  }

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Appointment" subtitle={a.id} />

      <Div className="flex-1 gap-3 px-5 pb-[150px] pt-4">
        {/* Patient header */}
        <Card elevation="tile" padded={false}>
          <Btn
            onPress={() => openPatient('dr-patient-profile')}
            className="tap flex-row w-full items-center gap-3.5 p-4 text-left"
          >
            <PatientAvatar patient={p} size={56} />
            <Div className="min-w-0 flex-1">
              <P className="truncate text-title-md text-ink-900">{p.name}</P>
              <PatientMeta patient={p} extra={p.blood} />
              <P className="mt-0.5 truncate text-caption tabular-nums text-ink-400">{p.id}</P>
            </Div>
            <ChevronRight className="h-[18px] w-[18px] shrink-0 text-ink-300" />
          </Btn>

          {p.allergies.length > 0 && (
            <Div className="flex-row items-center gap-2 border-t border-ink-100 bg-critical-50 px-4 py-2.5">
              <Span className="text-[10px] font-bold uppercase tracking-[.08em] text-critical-700">Allergy</Span>
              <Span className="min-w-0 flex-1 truncate text-body-sm font-semibold text-critical-700">
                {p.allergies.join(', ')}
              </Span>
            </Div>
          )}
        </Card>

        {/* Appointment facts */}
        <Card elevation="tile">
          <Div className="mb-2 flex-row items-center justify-between">
            <P className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Appointment</P>
            <StatusBadge tone={s.tone} dot={s.dotShape === 'dot'}>
              {s.label}
            </StatusBadge>
          </Div>
          <KeyValue label="Type" value={full} />
          <KeyValue label="Date" value={a.date} />
          <KeyValue label="Time" value={`${a.time} – ${a.endTime}`} />
          <KeyValue label="Visit" value={a.isFollowUp ? 'Follow-up' : 'New visit'} />
          <KeyValue label="Fee" value={rupee(a.fee)} />
          <Divider className="my-2.5" />
          <Div className="flex-row items-center justify-between">
            <Span className="text-body text-ink-500">Appointment ID</Span>
            <Btn
              onPress={() => showToast('Press and hold the ID to copy it', 'info')}
              className="tap flex-row items-center gap-1.5 text-body font-semibold tabular-nums text-ink-900"
            >
              {a.id}
              <Copy className="h-[13px] w-[13px] text-ink-400" strokeWidth={2.2} />
            </Btn>
          </Div>
        </Card>

        {/* Reason */}
        <Card elevation="tile">
          <P className="mb-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Reason for consultation</P>
          <P className="text-body leading-[22px] text-ink-800">{a.reason}</P>
          <Divider className="my-3" />
          <P className="mb-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Known conditions</P>
          <Div className="flex-row flex-wrap gap-1.5">
            {p.conditions.map((c) => (
              <MetaChip key={c}>{c}</MetaChip>
            ))}
          </Div>
        </Card>

        {/* Clinical shortcuts */}
        <Div className=" grid-cols-3 gap-2.5">
          {[
            { label: 'History', Icon: ClipboardList, screen: 'dr-patient-history' },
            { label: 'Reports', Icon: FileText, screen: 'dr-reports' },
            { label: 'Prescriptions', Icon: FileText, screen: 'dr-patient-rx' },
          ].map((x) => (
            <Btn
              key={x.label}
              onPress={() => openPatient(x.screen)}
              className="tap  flex-col items-center gap-1.5 rounded-tile bg-white py-3 shadow-tile"
            >
              <x.Icon className="h-[17px] w-[17px] text-brand-600" strokeWidth={2.1} />
              <Span className="text-[11px] font-bold text-ink-800">{x.label}</Span>
            </Btn>
          ))}
        </Div>

        <Banner
          tone="brand"
          icon={<Icon className="h-[16px] w-[16px]" strokeWidth={2.2} />}
          title="Patient joins 5 minutes before"
          body="You will be notified the moment they enter the waiting room."
        />

        {/* Secondary actions */}
        <Div className=" grid-cols-3 gap-2.5">
          <Button
            variant="tertiary"
            size="md"
            className="!px-2"
            disabled={closed}
            onClick={() => setRescheduling(true)}
            icon={<CalendarClock className="h-[15px] w-[15px]" strokeWidth={2.2} />}
          >
            Reschedule
          </Button>
          <Button
            variant="tertiary"
            size="md"
            className="!px-2"
            disabled={closed}
            onClick={() => nav.navigate('dr-st-noshow')}
            icon={<UserX className="h-[15px] w-[15px]" strokeWidth={2.2} />}
          >
            No-show
          </Button>
          <Button
            variant="tertiary"
            size="md"
            className="!px-2 !text-critical-600"
            disabled={closed}
            onClick={() => setConfirmCancel(true)}
            icon={<XCircle className="h-[15px] w-[15px]" strokeWidth={2.2} />}
          >
            Cancel
          </Button>
        </Div>
      </Div>

      {!closed ? (
        <StickyBar>
          <Button onClick={startPrimary} icon={<Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />}>
            {primary.label}
          </Button>
        </StickyBar>
      ) : (
        <StickyBar>
          <Button variant="tertiary" onClick={() => openPatient('dr-patient-history')}>
            View consultation record
          </Button>
        </StickyBar>
      )}

      <ModalSheet
        visible={confirmCancel}
        title="Cancel this appointment?"
        subtitle={`${p.name} · ${a.time}`}
        onClose={() => setConfirmCancel(false)}
        footer={
          <Div className="flex-row gap-2.5">
            <Button variant="tertiary" className="flex-1" onClick={() => setConfirmCancel(false)}>
              Keep
            </Button>
            <Button variant="danger" className="flex-1" onClick={doCancel}>
              Cancel appointment
            </Button>
          </Div>
        }
      >
        <P className="pb-2 text-body leading-[22px] text-ink-600">The patient will be notified and refunded in full.</P>
      </ModalSheet>

      {rescheduling && <RescheduleSheet appt={a} onClose={() => setRescheduling(false)} />}
    </Screen>
  )
}

function RescheduleSheet({ appt, onClose }: { appt: Appointment; onClose: () => void }) {
  const options = React.useMemo(() => dateOptions(30), [])
  const [dateLabel, setDateLabel] = React.useState(options[1]?.label ?? '')
  const [time, setTime] = React.useState(appt.time.replace(/^(\d):/, '0$1:'))
  const [error, setError] = React.useState<string | undefined>()
  const [busy, setBusy] = React.useState(false)

  const confirm = async () => {
    const key = keyOfLabel(dateLabel, options)
    if (!key) return
    setBusy(true)
    const problem = await rescheduleAppointment(appt.id, { key, label: dateLabel, time })
    setBusy(false)
    if (problem) setError(problem)
    else {
      showToast('Appointment rescheduled')
      onClose()
    }
  }

  return (
    <ModalSheet
      visible
      title="Reschedule"
      subtitle={appt.date}
      onClose={onClose}
      footer={
        <Button onClick={confirm} loading={busy}>
          Confirm new time
        </Button>
      }
    >
      <Div className="gap-3.5 pb-2">
        <Field label="Date">
          <SelectField value={dateLabel} options={options.map((o) => o.label)} onChange={setDateLabel} title="Choose a date" />
        </Field>
        <Field label="Time" error={error}>
          <SelectField value={time} options={TIME_OPTIONS} onChange={setTime} title="Choose a time" />
        </Field>
      </Div>
    </ModalSheet>
  )
}

/* =========================================== 11 — Appointment calendar === */

export function CalendarScreen() {
  const nav = useNav()
  const appointments = useAppointments((st) => st.appointments)
  const blocked = useAvailability((st) => st.blocked)
  const earningsToday = useEarnings((st) => st.summary.today)
  const select = useSelection((st) => st.select)
  const [view, setView] = React.useState('month')
  const [cursor, setCursor] = React.useState(TODAY_KEY)
  const [selected, setSelected] = React.useState(TODAY_KEY)

  const first = parseKey(cursor)
  first.setDate(1)
  const monthLabel = monthYear(first)
  const offset = first.getDay()
  const blockedDays = blockedDayKeys(blocked)
  const dayCount = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const days = Array.from({ length: dayCount }, (_, i) => {
    const date = i + 1
    const key = toKey(new Date(first.getFullYear(), first.getMonth(), date))
    const load = [0, 2, 9, 5, 12, 7, 0][(date + 3) % 7]
    return { date, key, load, blocked: blockedDays.has(key), today: key === TODAY_KEY }
  })
  const weekDayIndex = parseKey(selected).getDay()
  const weekKeys = Array.from({ length: 7 }, (_, i) => addDays(selected, i - weekDayIndex))
  const shownDays = view === 'month' ? days : view === 'week' ? days.filter((d) => weekKeys.includes(d.key)) : []
  const dayAppts = appointmentsOnDay(appointments, selected)
  const moveMonth = (delta: number) => setCursor(toKey(new Date(first.getFullYear(), first.getMonth() + delta, 1)))
  const isTodaySelected = selected === TODAY_KEY
  const subtitle = isTodaySelected
    ? `${dayAppts.length + 1} appointments · ${rupee(earningsToday)}`
    : `${dayAppts.length} appointments · ${rupee(dayAppts.reduce((sum, a) => sum + a.fee, 0))}`

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div
        className="sticky z-30 bg-white"
        style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop, top: -DEVICE.safeTop }}
      >
        <ScreenHeader embedded title="Calendar" border={false} />
        <Div className="px-5 pb-3.5">
          <Segmented
            options={[
              { id: 'day', label: 'Day' },
              { id: 'week', label: 'Week' },
              { id: 'month', label: 'Month' },
            ]}
            value={view}
            onChange={setView}
          />
        </Div>
      </Div>

      <Div className="flex-1 gap-3 px-5 pb-[112px] pt-4">
        <Card elevation="tile">
          <Div className="mb-3 flex-row items-center justify-between">
            <Btn onPress={() => moveMonth(-1)} className="tap flex-col h-[30px] w-[30px] items-center justify-center rounded-full bg-ink-50">
              <ChevronLeft className="h-[16px] w-[16px] text-ink-500" strokeWidth={2.4} />
            </Btn>
            <P className="text-title-sm text-ink-900">{monthLabel}</P>
            <Btn onPress={() => moveMonth(1)} className="tap flex-col h-[30px] w-[30px] items-center justify-center rounded-full bg-ink-50">
              <ChevronRight className="h-[16px] w-[16px] text-ink-500" strokeWidth={2.4} />
            </Btn>
          </Div>

          <Div className="mb-1.5  grid-cols-7">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <Span key={i} className="text-center text-caption font-semibold text-ink-300">
                {d}
              </Span>
            ))}
          </Div>

          <Div className=" grid-cols-7 gap-y-1">
            {Array.from({ length: view === 'month' ? offset : 0 }).map((_, i) => (
              <Span key={`pad-${i}`} />
            ))}
            {shownDays.map((d) => (
              <Div key={d.date} className="flex-row justify-center py-[2px]">
                <Btn
                  onPress={() => setSelected(d.key)}
                  className={`relative flex-col h-[40px] w-[40px] items-center justify-center rounded-[12px] text-body-lg tabular-nums  ${
                    d.key === selected
                      ? 'bg-brand-600 font-bold text-white shadow-cta'
                      : d.blocked
                        ? 'bg-ink-50 font-medium text-ink-300'
                        : 'font-semibold text-ink-900'
                  }`}
                >
                  {d.date}
                  {/* Load is shown as a bar, not a colour alone */}
                  {d.key !== selected && !d.blocked && d.load > 0 && (
                    <Span
                      className={`absolute bottom-[5px] h-[3px] rounded-full ${
                        d.load > 8 ? 'bg-critical-600' : d.load > 4 ? 'bg-caution-600' : 'bg-vital-600'
                      }`}
                      style={{ width: Math.min(18, 5 + d.load) }}
                    />
                  )}
                  {d.blocked && <Span className="absolute bottom-[6px] h-[2px] w-[12px] rounded-full bg-ink-300" />}
                </Btn>
              </Div>
            ))}
          </Div>

          <Div className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-ink-100 pt-3">
            <Legend color="bg-vital-600" label="Light (1–4)" />
            <Legend color="bg-caution-600" label="Busy (5–8)" />
            <Legend color="bg-critical-600" label="Full (9+)" />
            <Legend color="bg-ink-300" label="Blocked" />
          </Div>
        </Card>

        <Div>
          <SectionHeader title={isTodaySelected ? fullDate(TODAY_KEY, false) : longDate(selected)} subtitle={subtitle} className="!px-0 pb-2.5" />
          <Div className="gap-2.5">
            {(isTodaySelected ? appointments.filter(isToday).slice(0, 4) : dayAppts).map((x) => (
              <ApptCard
                key={x.id}
                appt={x}
                dense
                onClick={() => {
                  selectAppointment(x.id)
                  nav.navigate('dr-appointment-detail')
                }}
              />
            ))}
            {dayAppts.length === 0 && <P className="text-body text-ink-400">No appointments on this day.</P>}
          </Div>
        </Div>

        <Button
          variant="tertiary"
          onClick={() => {
            select({ blockFromKey: selected })
            nav.navigate('dr-block-time')
          }}
        >
          Block time on this day
        </Button>
      </Div>

      <DoctorNav active="appointments" />
    </Screen>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <Span className="flex-row items-center gap-1.5 text-caption text-ink-500">
      <Span className={`h-[3px] w-[12px] rounded-full ${color}`} />
      {label}
    </Span>
  )
}

/* ==================================== In-person consultation (workflow) === */

export function InPersonScreen() {
  const nav = useNav()
  const [arrived, setArrived] = React.useState(false)
  const a = useCurrentAppointment(INPERSON_DEFAULT_APPT_ID)
  const p = useRecords((st) => st.patientById(a.patientId))
  const doctor = useDoctor((st) => st.profile)

  const openStep = (screen: string) => {
    selectAppointment(a.id)
    nav.navigate(screen)
  }

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="In-person consultation" subtitle={a.id} />

      <Div className="flex-1 gap-3 px-5 pb-[150px] pt-4">
        <Card elevation="tile" padded={false}>
          <Div className="flex-row items-center gap-3.5 p-4">
            <PatientAvatar patient={p} size={52} />
            <Div className="min-w-0 flex-1">
              <P className="truncate text-title-sm text-ink-900">{p.name}</P>
              <PatientMeta patient={p} extra={p.blood} />
            </Div>
            <Div className="shrink-0 text-right">
              <P className="text-title-sm tabular-nums text-ink-900">{a.time}</P>
              <StatusBadge tone={arrived ? 'success' : 'neutral'} dot={arrived} className="mt-1">
                {arrived ? 'Arrived' : 'Not arrived'}
              </StatusBadge>
            </Div>
          </Div>
        </Card>

        {/* Clinic */}
        <Card elevation="tile" padded={false} className="overflow-hidden">
          <Div className="relative h-[120px] bg-[#E8EEF4]">
            <SvgBox viewBox="0 0 360 120" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
              <SvgRect width="360" height="120" fill="#E9EFF5" />
              <SvgRect x="18" y="12" width="84" height="38" rx="6" fill="#DCEBDF" />
              <SvgRect x="252" y="70" width="92" height="44" rx="6" fill="#DCEBDF" />
              {[
                [118, 12, 56, 34],
                [186, 12, 48, 34],
                [18, 62, 72, 36],
                [102, 62, 60, 36],
                [174, 62, 56, 36],
              ].map(([x, y, w, h], i) => (
                <SvgRect key={i} x={x} y={y} width={w} height={h} rx="4" fill="#DFE6ED" />
              ))}
              <SvgG stroke="#FFFFFF" strokeLinecap="round">
                <SvgPath d="M0 56h360" strokeWidth="9" />
                <SvgPath d="M106 0v120" strokeWidth="7" />
                <SvgPath d="M240 0v120" strokeWidth="5" />
              </SvgG>
            </SvgBox>
            <Div className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2">
              <Span className="flex-col h-[32px] w-[32px] items-center justify-center rounded-full bg-brand-600 shadow-lift ring-[3px] ring-white">
                <Building2 className="h-[15px] w-[15px] text-white" strokeWidth={2.3} />
              </Span>
            </Div>
            <Div className="absolute bottom-2.5 right-2.5 flex-row items-center gap-1.5 rounded-chip bg-white/92 px-2.5 py-1.5 shadow-tile">
              <Navigation className="h-[12px] w-[12px] text-brand-600" strokeWidth={2.4} />
              <Span className="text-caption font-bold text-ink-800">Block B · Room 4</Span>
            </Div>
          </Div>
          <Div className="p-4">
            <P className="text-title-sm text-ink-900">{doctor.clinic}</P>
            <P className="mt-1 text-body-sm leading-[18px] text-ink-500">{doctor.address}</P>
            <P className="mt-2 flex-row items-center gap-1.5 text-caption text-ink-400">
              <MapPin className="h-[12px] w-[12px]" strokeWidth={2.2} /> {a.clinicRoom}
            </P>
          </Div>
        </Card>

        {/* Workflow */}
        <Div>
          <SectionHeader title="Consultation workflow" className="!px-0 pb-2.5" />
          <Card elevation="tile" padded={false} className="overflow-hidden">
            {[
              { label: 'View patient record', screen: 'dr-patient-profile' },
              { label: 'Add clinical notes', screen: 'dr-notes' },
              { label: 'Create prescription', screen: 'dr-rx-create' },
              { label: 'Schedule follow-up', screen: 'dr-followup' },
            ].map((x, i, arr) => (
              <Btn
                key={x.label}
                onPress={() => openStep(x.screen)}
                className={`tap flex-row w-full items-center gap-3 px-4 py-3.5 text-left ${i < arr.length - 1 ? 'border-b-[0.5px] border-ink-900/10' : ''}`}
              >
                <Span className="flex-col h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-ink-100 text-[10px] font-bold text-ink-600">
                  {i + 1}
                </Span>
                <Span className="min-w-0 flex-1 truncate text-body-lg text-ink-900">{x.label}</Span>
                <ChevronRight className="h-[17px] w-[17px] shrink-0 text-ink-300" />
              </Btn>
            ))}
          </Card>
        </Div>
      </Div>

      <StickyBar>
        <Div className="flex-row gap-2.5">
          <Button
            variant="tertiary"
            block={false}
            className="flex-1"
            disabled={arrived}
            onClick={() => setArrived(true)}
          >
            {arrived ? 'Arrived' : 'Mark arrived'}
          </Button>
          <Button className="flex-[1.4]" onClick={() => nav.navigate(beginConsultation(a.id))}>
            Start Consultation
          </Button>
        </Div>
      </StickyBar>
    </Screen>
  )
}
