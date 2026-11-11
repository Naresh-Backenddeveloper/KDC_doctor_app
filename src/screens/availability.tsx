import { Btn, Div, P, Span } from '../components/primitives/index'
import React from 'react'
import {
  Plus,
  Trash2,
  Clock,
  CalendarOff,
  Check,
  Info,
  Briefcase,
  Plane,
  Siren,
  UserRound,
  MoreHorizontal,
} from '../components/primitives/icons'
import { Screen } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/Nav'
import { Button, IconButton, StickyBar } from '../components/ui/Button'
import { Field, SelectField, TextArea, Toggle } from '../components/ui/Inputs'
import { Card, Divider, SectionHeader, StatusBadge } from '../components/ui/Display'
import { Banner, ModalSheet } from '../components/ui/Feedback'
import { FieldError, useZodForm } from '../components/ui/Form'
import { MODE } from '../components/doctor/index'
import { blockReasons, rupee } from '../mock-data/mock'
import { useNav } from '../navigation/navigation'
import { useController } from 'react-hook-form'
import { useAppointments } from '../store/appointments'
import { useAvailability } from '../store/availability'
import { useDoctor } from '../store/doctor'
import { blockTime, setOnDuty } from '../store/flows'
import { useRecords } from '../store/records'
import { useSelection } from '../store/selection'
import { affectedByBlock, bookedThisWeek, slotSummary, todaysAppointments } from '../store/selectors'
import { showToast } from '../store/toast'
import type { Mode, WorkingDay } from '../types'
import { addDays, dateOptions, daysBetween, keyOfLabel, longDate, shortDate, TIME_OPTIONS } from '../utils/date'
import { blockTimeSchema, scheduleSchema, type BlockTimeForm, type ScheduleForm } from '../validation/schemas'

/* ============================================== 12 — My availability ====== */

export function AvailabilityScreen() {
  const nav = useNav()
  const week = useAvailability((st) => st.week)
  const duration = useAvailability((st) => st.duration)
  const blocked = useAvailability((st) => st.blocked)
  const toggleDay = useAvailability((st) => st.toggleDay)
  const removeBlock = useAvailability((st) => st.removeBlock)
  const onDuty = useAppointments((st) => st.onDuty)
  const appointments = useAppointments((st) => st.appointments)
  const today = week[0]
  const active = todaysAppointments(appointments).filter((x) => x.status !== 'cancelled' && x.status !== 'no-show').length
  const todaySlots = slotSummary(today, duration, active)

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="My availability" />

      <Div className="flex-1 gap-3 px-5 pb-[130px] pt-4">
        {/* Duty state */}
        <Card elevation="tile">
          <Div className="flex-row items-center gap-3.5">
            <Span className="flex-col h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[12px] bg-vital-50">
              <Check className="h-[19px] w-[19px] text-vital-600" strokeWidth={2.6} />
            </Span>
            <Div className="min-w-0 flex-1">
              <P className="text-title-sm text-ink-900">Accepting appointments</P>
              <P className="mt-0.5 text-body-sm text-ink-500">Patients can book your open slots</P>
            </Div>
            <Toggle on={onDuty} onClick={() => setOnDuty(!onDuty)} />
          </Div>
        </Card>

        {/* Today */}
        <Card elevation="tile">
          <Div className="flex-row items-baseline justify-between">
            <P className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Today · Mon, 5 Oct</P>
            <Span className="text-caption font-semibold text-vital-700">{todaySlots.open} slots open</Span>
          </Div>

          {/* Slot ribbon — load at a glance, with counts not just colour */}
          <Div className="mt-3 flex-row gap-[3px]">
            {Array.from({ length: todaySlots.total }).map((_, i) => (
              <Span
                key={i}
                className={`h-[26px] flex-1 rounded-[3px] ${
                  i < todaySlots.booked ? 'bg-brand-600' : i < todaySlots.booked + todaySlots.open ? 'bg-brand-100' : 'bg-ink-100'
                }`}
              />
            ))}
          </Div>
          <Div className="mt-2.5 flex-row items-center gap-4">
            <Legend color="bg-brand-600" label={`${todaySlots.booked} booked`} />
            <Legend color="bg-brand-100" label={`${todaySlots.open} open`} />
            <Legend color="bg-ink-100" label={`${todaySlots.blocked} blocked`} />
          </Div>

          <Divider className="my-3.5" />
          <Div className="gap-1.5">
            {today.sessions.map((session) => `${session.from} – ${session.to}`).map((b) => (
              <Div key={b} className="flex-row items-center gap-2.5">
                <Clock className="h-[14px] w-[14px] shrink-0 text-ink-400" strokeWidth={2.2} />
                <Span className="text-body font-semibold tabular-nums text-ink-800">{b}</Span>
              </Div>
            ))}
          </Div>
        </Card>

        {/* Weekly schedule */}
        <Div>
          <SectionHeader title="Weekly schedule" action="Edit" onAction={() => nav.navigate('dr-edit-availability')} className="!px-0 pb-2.5" />
          <Card elevation="tile" padded={false} className="overflow-hidden">
            {week.map((d, i, arr) => (
              <Div key={d.day} className={`flex-row items-start gap-3.5 px-4 py-3 ${i < arr.length - 1 ? 'border-b-[0.5px] border-ink-900/10' : ''}`}>
                <Div className="w-[38px] shrink-0 pt-[1px]">
                  <P className={`text-body-sm font-bold ${d.on ? 'text-ink-900' : 'text-ink-300'}`}>{d.short}</P>
                </Div>
                <Div className="min-w-0 flex-1">
                  {d.on ? (
                    <>
                      <Div className="gap-0.5">
                        {d.sessions.map((b) => (
                          <P key={b.from} className="text-body font-medium tabular-nums text-ink-800">
                            {b.from} – {b.to}
                          </P>
                        ))}
                      </Div>
                      <Div className="mt-1.5 flex-row gap-1.5">
                        {d.modes.map((m) => {
                          const { Icon } = MODE[m]
                          return (
                            <Span key={m} className="flex-col h-[20px] w-[20px] items-center justify-center rounded-[6px] bg-ink-50">
                              <Icon className="h-[11px] w-[11px] text-ink-500" strokeWidth={2.4} />
                            </Span>
                          )
                        })}
                      </Div>
                    </>
                  ) : (
                    <P className="text-body text-ink-300">Not available</P>
                  )}
                </Div>
                <Toggle on={d.on} onClick={() => toggleDay(d.short)} />
              </Div>
            ))}
          </Card>
        </Div>

        {/* Blocked */}
        <Div>
          <SectionHeader title="Blocked time" action="Add" onAction={() => nav.navigate('dr-block-time')} className="!px-0 pb-2.5" />
          <Div className="gap-2">
            {blocked.map((b) => (
              <Div key={b.id} className="flex-row items-center gap-3.5 rounded-tile bg-white p-3.5 shadow-tile">
                <Span className="flex-col h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[11px] bg-ink-50">
                  <CalendarOff className="h-[16px] w-[16px] text-ink-500" strokeWidth={2.1} />
                </Span>
                <Div className="min-w-0 flex-1">
                  <P className="truncate text-body-lg font-semibold text-ink-900">{b.label}</P>
                  <P className="truncate text-caption text-ink-400">
                    {b.date} · {b.time}
                  </P>
                </Div>
                <StatusBadge tone="neutral">{b.reason}</StatusBadge>
                <IconButton size={30} label="Remove" onClick={() => removeBlock(b.id)}>
                  <Trash2 className="h-[14px] w-[14px] text-ink-400" strokeWidth={2.2} />
                </IconButton>
              </Div>
            ))}
          </Div>
        </Div>
      </Div>

      <StickyBar>
        <Div className="flex-row gap-2.5">
          <Button variant="tertiary" className="flex-1" onClick={() => nav.navigate('dr-block-time')}>
            Block time
          </Button>
          <Button className="flex-1" onClick={() => nav.navigate('dr-edit-availability')}>
            Edit Schedule
          </Button>
        </Div>
      </StickyBar>
    </Screen>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <Span className="flex-row items-center gap-1.5 text-caption text-ink-500">
      <Span className={`h-[8px] w-[8px] rounded-[2px] ${color}`} />
      {label}
    </Span>
  )
}

/* =========================================== 13 — Edit availability ====== */

export function EditAvailabilityScreen() {
  const nav = useNav()
  const storeWeek = useAvailability((st) => st.week)
  const storeDuration = useAvailability((st) => st.duration)
  const storeBreakFrom = useAvailability((st) => st.breakFrom)
  const storeBreakTo = useAvailability((st) => st.breakTo)
  const storeModes = useAvailability((st) => st.modesOffered)
  const saveSchedule = useAvailability((st) => st.saveSchedule)
  const fees = useDoctor((st) => st.profile.fees)
  const appointments = useAppointments((st) => st.appointments)
  const [editing, setEditing] = React.useState(0)

  const form = useZodForm<ScheduleForm>(scheduleSchema, {
    days: storeWeek,
    breakFrom: storeBreakFrom,
    breakTo: storeBreakTo,
    duration: storeDuration,
    modesOffered: storeModes,
  })
  const { field: days, fieldState: daysState } = useController({ control: form.control, name: 'days' })
  const { field: breakFrom } = useController({ control: form.control, name: 'breakFrom' })
  const { field: breakTo, fieldState: breakState } = useController({ control: form.control, name: 'breakTo' })
  const { field: duration } = useController({ control: form.control, name: 'duration' })
  const { field: modes, fieldState: modesState } = useController({ control: form.control, name: 'modesOffered' })

  const week: WorkingDay[] = days.value
  const current = week[editing]
  const updateDay = (patch: Partial<WorkingDay>) =>
    days.onChange(week.map((d, i) => (i === editing ? { ...d, ...patch } : d)))
  const setSession = (i: number, patch: Partial<{ from: string; to: string }>) =>
    updateDay({ sessions: current.sessions.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
  const addSession = () => {
    const last = current.sessions[current.sessions.length - 1]
    updateDay({ on: true, sessions: [...current.sessions, last ? { from: last.to, to: last.to } : { from: '09:00 AM', to: '01:00 PM' }] })
  }
  const removeSession = (i: number) => updateDay({ sessions: current.sessions.filter((_, j) => j !== i) })
  const pressDay = (i: number) => {
    if (i === editing) updateDay({ on: !current.on })
    else setEditing(i)
  }
  const toggleMode = (m: Mode) => modes.onChange(modes.value.includes(m) ? modes.value.filter((x: Mode) => x !== m) : [...modes.value, m])

  const dayErrors = (daysState.error as any)?.[editing]
  const sessionError = (i: number) => dayErrors?.sessions?.[i]?.message as string | undefined
  const dayError = dayErrors?.sessions?.message as string | undefined

  const submit = form.handleSubmit(async (v) => {
    await saveSchedule(v.days, v.duration, v.breakFrom, v.breakTo, v.modesOffered)
    showToast('Schedule saved')
    nav.navigate('dr-availability')
  })

  const booked = bookedThisWeek(appointments)

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Edit schedule" subtitle="Applies from tomorrow" />

      <Div className="flex-1 gap-3 px-5 pb-[130px] pt-4">
        <Card elevation="tile">
          <P className="mb-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Working days</P>
          <Div className="flex-row gap-1.5">
            {week.map((d, i) => (
              <Btn
                key={d.short}
                onPress={() => pressDay(i)}
                className={`tap h-[42px] flex-1 rounded-[11px] text-body-sm font-bold  ${
                  d.on ? 'bg-brand-600 text-white shadow-cta' : 'bg-white text-ink-400 ring-1 ring-inset  ring-ink-200'
                }`}
              >
                {d.short}
              </Btn>
            ))}
          </Div>
        </Card>

        <Card elevation="tile">
          <Div className="mb-3 flex-row items-center justify-between">
            <P className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">{current.day} — sessions</P>
            <Btn onPress={addSession} className="tap flex-row items-center gap-1 text-body-sm font-semibold text-brand-600">
              <Plus className="h-[14px] w-[14px]" strokeWidth={2.6} />
              Add session
            </Btn>
          </Div>

          {current.sessions.map((session, i) => (
            <Div key={i} className={i > 0 ? 'mt-2.5' : ''}>
              <Div className="flex-row items-center gap-2.5">
                <Div className="min-w-0 flex-1">
                  <P className="mb-1 text-caption text-ink-400">Start</P>
                  <SelectField value={session.from} options={TIME_OPTIONS} title="Session start" onChange={(from) => setSession(i, { from })} />
                </Div>
                <Span className="mt-5 text-ink-300">—</Span>
                <Div className="min-w-0 flex-1">
                  <P className="mb-1 text-caption text-ink-400">End</P>
                  <SelectField value={session.to} options={TIME_OPTIONS} title="Session end" onChange={(to) => setSession(i, { to })} />
                </Div>
                <IconButton size={34} label="Remove session" className="mt-5" onClick={() => removeSession(i)}>
                  <Trash2 className="h-[15px] w-[15px] text-ink-400" strokeWidth={2.2} />
                </IconButton>
              </Div>
              <FieldError message={sessionError(i)} />
            </Div>
          ))}
          {current.sessions.length === 0 && <P className="text-body text-ink-400">{current.on ? 'No sessions yet.' : 'Not a working day.'}</P>}
          <FieldError message={dayError} />

          <Divider className="my-3.5" />

          <P className="mb-2 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Break</P>
          <Div className="flex-row items-center gap-2.5">
            <Div className="min-w-0 flex-1">
              <SelectField value={breakFrom.value} options={TIME_OPTIONS} title="Break start" onChange={breakFrom.onChange} />
            </Div>
            <Span className="text-ink-300">—</Span>
            <Div className="min-w-0 flex-1">
              <SelectField value={breakTo.value} options={TIME_OPTIONS} title="Break end" onChange={breakTo.onChange} />
            </Div>
          </Div>
          <FieldError message={breakState.error?.message} />
        </Card>

        <Card elevation="tile">
          <P className="mb-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Consultation duration</P>
          <Div className="flex-row gap-2">
            {[10, 15, 20, 30].map((d) => (
              <Btn
                key={d}
                onPress={() => duration.onChange(d)}
                className={`tap h-[42px] flex-1 rounded-[11px] text-body-sm font-bold  ${
                  duration.value === d ? 'bg-brand-600 text-white shadow-cta' : 'bg-white text-ink-700 ring-1 ring-inset  ring-ink-200'
                }`}
              >
                {d} min
              </Btn>
            ))}
          </Div>
          <P className="mt-2.5 text-caption text-ink-400">Determines how many slots each session generates.</P>
        </Card>

        <Card elevation="tile">
          <P className="mb-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Consultation types offered</P>
          <Div className="gap-2">
            {(['video', 'audio', 'clinic'] as const).map((m) => {
              const { Icon, full } = MODE[m]
              return (
                <Div key={m} className="flex-row items-center gap-3 rounded-[11px] bg-ink-50 px-3.5 py-3">
                  <Icon className="h-[16px] w-[16px] shrink-0 text-ink-600" strokeWidth={2.2} />
                  <Div className="min-w-0 flex-1">
                    <P className="truncate text-body-lg font-semibold text-ink-900">{full}</P>
                    <P className="text-caption text-ink-400">{rupee(fees[m])} per consultation</P>
                  </Div>
                  <Toggle on={modes.value.includes(m)} onClick={() => toggleMode(m)} />
                </Div>
              )
            })}
          </Div>
          <FieldError message={modesState.error?.message} />
        </Card>

        <Banner
          tone="caution"
          icon={<Info className="h-[16px] w-[16px]" strokeWidth={2.2} />}
          title={`${booked} appointments already booked this week`}
          body="Reducing hours will not cancel them. You will be asked to reschedule any affected slots."
        />
      </Div>

      <StickyBar>
        <Button onClick={submit} loading={form.formState.isSubmitting}>Save schedule</Button>
      </StickyBar>
    </Screen>
  )
}

/* ================================================== 14 — Block time ====== */

const REASON_ICON: Record<string, React.ComponentType<any>> = {
  Personal: UserRound,
  Meeting: Briefcase,
  Leave: Plane,
  Emergency: Siren,
  Other: MoreHorizontal,
}

export function BlockTimeScreen() {
  const nav = useNav()
  const preset = useSelection((st) => st.blockFromKey)
  const appointments = useAppointments((st) => st.appointments)
  const patientById = useRecords((st) => st.patientById)
  const dates = React.useMemo(() => dateOptions(120), [])
  const [confirming, setConfirming] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  React.useEffect(() => () => useSelection.getState().select({ blockFromKey: null }), [])

  const form = useZodForm<BlockTimeForm>(blockTimeSchema, {
    reason: 'Leave',
    fromKey: preset ?? '2026-10-12',
    toKey: preset ?? addDays('2026-10-12', 2),
    allDay: true,
    from: '09:00 AM',
    to: '01:00 PM',
    note: '',
  })
  const { field: reason } = useController({ control: form.control, name: 'reason' })
  const { field: fromKey } = useController({ control: form.control, name: 'fromKey' })
  const { field: toKey, fieldState: toState } = useController({ control: form.control, name: 'toKey' })
  const { field: allDay } = useController({ control: form.control, name: 'allDay' })
  const { field: from } = useController({ control: form.control, name: 'from' })
  const { field: to, fieldState: timeState } = useController({ control: form.control, name: 'to' })
  const { field: note, fieldState: noteState } = useController({ control: form.control, name: 'note' })

  const affected = affectedByBlock(appointments, { fromKey: fromKey.value, toKey: toKey.value, allDay: allDay.value, from: from.value, to: to.value })
  const dayCount = daysBetween(fromKey.value, toKey.value) + 1
  const range = fromKey.value === toKey.value ? shortDate(fromKey.value) : `${shortDate(fromKey.value).split(' ')[0]} – ${shortDate(toKey.value)}`

  const openConfirm = form.handleSubmit(() => setConfirming(true))
  const confirm = form.handleSubmit(async (v) => {
    setBusy(true)
    await blockTime(v)
    setBusy(false)
    setConfirming(false)
    showToast('Time blocked')
    nav.navigate('dr-availability')
  })

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Block time" />

      <Div className="flex-1 gap-3 px-5 pb-[130px] pt-4">
        <Card elevation="tile">
          <P className="mb-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Reason</P>
          <Div className=" grid-cols-3 gap-2">
            {blockReasons.map((r) => {
              const Icon = REASON_ICON[r]
              const on = reason.value === r
              return (
                <Btn
                  key={r}
                  onPress={() => reason.onChange(r)}
                  className={`tap  flex-col items-center gap-1.5 rounded-[11px] py-3  ${
                    on ? 'bg-brand-600 shadow-cta' : 'bg-white ring-1 ring-inset  ring-ink-200'
                  }`}
                >
                  <Icon className={`h-[16px] w-[16px] ${on ? 'text-white' : 'text-ink-500'}`} strokeWidth={2.2} />
                  <Span className={`text-[11px] font-bold ${on ? 'text-white' : 'text-ink-700'}`}>{r}</Span>
                </Btn>
              )
            })}
          </Div>
        </Card>

        <Card elevation="tile">
          <P className="mb-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">When</P>
          <Div className="gap-3">
            <Field label="From">
              <SelectField
                value={longDate(fromKey.value)}
                options={dates.map((d) => d.label)}
                title="From"
                onChange={(label) => {
                  const key = keyOfLabel(label, dates)
                  if (key) fromKey.onChange(key)
                }}
              />
            </Field>
            <Field label="To" error={toState.error?.message}>
              <SelectField
                value={longDate(toKey.value)}
                options={dates.map((d) => d.label)}
                title="To"
                onChange={(label) => {
                  const key = keyOfLabel(label, dates)
                  if (key) toKey.onChange(key)
                }}
              />
            </Field>

            <Div className="flex-row items-center justify-between rounded-[11px] bg-ink-50 px-3.5 py-3">
              <Span className="text-body-lg font-semibold text-ink-900">All day</Span>
              <Toggle on={allDay.value} onClick={() => allDay.onChange(!allDay.value)} />
            </Div>

            {!allDay.value && (
              <Div>
                <Div className="flex-row items-center gap-2.5">
                  <Div className="min-w-0 flex-1">
                    <SelectField value={from.value} options={TIME_OPTIONS} title="From time" onChange={from.onChange} />
                  </Div>
                  <Span className="text-ink-300">—</Span>
                  <Div className="min-w-0 flex-1">
                    <SelectField value={to.value} options={TIME_OPTIONS} title="To time" onChange={to.onChange} />
                  </Div>
                </Div>
                <FieldError message={timeState.error?.message} />
              </Div>
            )}
          </Div>
        </Card>

        <Card elevation="tile">
          <Field label="Note (optional)" hint="Only you can see this." error={noteState.error?.message}>
            <TextArea value={note.value} onChangeText={note.onChange} placeholder="e.g. Conference — Cardiological Society of India" className="min-h-[88px]" />
          </Field>
        </Card>

        {affected.length > 0 && (
          <Banner
            tone="critical"
            icon={<Info className="h-[16px] w-[16px]" strokeWidth={2.2} />}
            title={`${affected.length} appointment${affected.length === 1 ? '' : 's'} fall in this period`}
            body="Blocking will notify these patients and offer them your next available slots."
          />
        )}
      </Div>

      <StickyBar>
        <Div className="mb-3 flex-row items-center justify-between">
          <Span className="text-body-sm text-ink-500">{range} · {allDay.value ? 'All day' : `${from.value} – ${to.value}`}</Span>
          <Span className="text-body-sm font-bold text-ink-900">{dayCount} {dayCount === 1 ? 'day' : 'days'}</Span>
        </Div>
        <Button variant="danger" onClick={openConfirm}>
          Block Time
        </Button>
      </StickyBar>

      <ModalSheet
        visible={confirming}
        title="Confirm block"
        subtitle={`${range} · ${allDay.value ? 'All day' : `${from.value} – ${to.value}`}`}
        onClose={() => setConfirming(false)}
        footer={
          <Div className="flex-row gap-2.5">
            <Button variant="tertiary" className="flex-1" onClick={() => setConfirming(false)}>
              Keep schedule
            </Button>
            <Button variant="danger" className="flex-1" loading={busy} onClick={confirm}>
              Block Time
            </Button>
          </Div>
        }
      >
        <Div className="gap-2 pb-2">
          {affected.length === 0 && <P className="text-body text-ink-500">No booked patients are affected.</P>}
          {affected.length > 0 && (
            <P className="text-body-sm font-semibold text-critical-700">
              These patients will be cancelled and offered your next available slots:
            </P>
          )}
          {affected.map((a) => (
            <Div key={a.id} className="flex-row items-center justify-between rounded-[11px] bg-ink-50 px-3.5 py-2.5">
              <P className="min-w-0 flex-1 truncate text-body font-semibold text-ink-900">{patientById(a.patientId).name}</P>
              <Span className="shrink-0 text-caption tabular-nums text-ink-500">{a.date.split(', ')[1]} · {a.time}</Span>
            </Div>
          ))}
        </Div>
      </ModalSheet>
    </Screen>
  )
}
