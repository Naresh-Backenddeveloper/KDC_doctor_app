import { Btn, Div, P, Span } from '../components/primitives/index'
import React from 'react'
import {
  FileText,
  FlaskConical,
  FolderOpen,
  ChevronRight,
  UsersRound,
  Clock,
  Droplet,
  AlertTriangle,
  Plus,
  MessageSquare,
  CalendarPlus,
} from '../components/primitives/icons'
import { Screen, DEVICE } from '../components/ui/Screen'
import { ScreenHeader, HScroll } from '../components/ui/Nav'
import { Button, StickyBar } from '../components/ui/Button'
import { SearchInput } from '../components/ui/Inputs'
import { Card, Divider, FilterChip, MetaChip, SectionHeader, StatusBadge, KeyValue } from '../components/ui/Display'
import { DoctorNav, MODE, PatientAvatar, PatientCard, PatientMeta, ReportCard } from '../components/doctor/index'
import { StateBlock } from '../components/ui/Feedback'
import { useNav } from '../navigation/navigation'
import { useCurrentPatient } from '../store/context'
import { openPrescriptionForPatient, selectPatient } from '../store/flows'
import { usePrescriptions } from '../store/prescriptions'
import { countAwaiting, filterPatients, useRecords, type PatientFilter } from '../store/records'
import { useSelection } from '../store/selection'
import { showToast } from '../store/toast'
import type { Report } from '../types'

/* ================================================== 15 — Patient list ==== */

export function PatientsScreen() {
  const nav = useNav()
  const patients = useRecords((st) => st.patients)
  const [query, setQuery] = React.useState('')
  const [filter, setFilter] = React.useState<PatientFilter>('Recent')
  const visible = filterPatients(patients, query, filter)
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div
        className="sticky z-30 bg-white"
        style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop, top: -DEVICE.safeTop }}
      >
        <Div className="flex-row items-end justify-between px-5 pb-3 pt-4">
          <Div>
            <P className="text-title-lg text-ink-900">Patients</P>
            <P className="mt-0.5 text-body-sm text-ink-500">{patients.length} under your care</P>
          </Div>
        </Div>
        <Div className="px-5 pb-3">
          <SearchInput placeholder="Search patients" value={query} onChange={setQuery} />
        </Div>
        <Div className="pb-3">
          <HScroll gap={8}>
            {(['All', 'Recent', 'Upcoming', 'Completed', 'Follow-up due'] as PatientFilter[]).map((f) => (
              <FilterChip key={f} active={filter === f} onClick={() => setFilter(f)}>
                {f}
              </FilterChip>
            ))}
          </HScroll>
        </Div>
      </Div>

      <Div className="gap-2.5 px-5 pb-[112px] pt-4">
        {visible.length === 0 && (
          <Div className="pt-12">
            <StateBlock
              icon={<UsersRound className="h-[31px] w-[31px]" strokeWidth={1.8} />}
              title="No patients found"
              body="Try a different name, condition or filter."
            />
          </Div>
        )}
        {visible.map((p) => (
          <PatientCard
            key={p.id}
            patient={p}
            onClick={() => {
              selectPatient(p.id)
              nav.navigate('dr-patient-profile')
            }}
          />
        ))}
      </Div>

      <DoctorNav active="patients" />
    </Screen>
  )
}

/* =============================================== 16 — Patient profile ==== */

export function PatientProfileScreen() {
  const nav = useNav()
  const p = useCurrentPatient()
  const rxCount = usePrescriptions((st) => st.summaries.filter((r) => r.patientId === p.id).length)
  const reports = useRecords((st) => st.reports)
  const patientReports = reports.filter((r) => r.patientId === p.id)

  const sections = [
    { label: 'Consultation history', sub: `${p.consults} consultations`, Icon: Clock, screen: 'dr-patient-history' },
    { label: 'Prescriptions', sub: `${rxCount} issued by you`, Icon: FileText, screen: 'dr-patient-rx' },
    { label: 'Diagnostic reports', sub: `${patientReports.length} reports · ${patientReports.filter((r) => r.status === 'pending').length} awaiting`, Icon: FlaskConical, screen: 'dr-reports' },
    { label: 'Documents', sub: '2 uploaded by patient', Icon: FolderOpen, screen: 'dr-reports' },
  ]

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Patient record" subtitle={p.id} />

      <Div className="flex-1 gap-3 px-5 pb-[130px] pt-4">
        {/* Identity */}
        <Card elevation="tile">
          <Div className="flex-row items-center gap-3.5">
            <PatientAvatar patient={p} size={60} />
            <Div className="min-w-0 flex-1">
              <P className="truncate text-title-md text-ink-900">{p.name}</P>
              <PatientMeta patient={p} />
              <P className="mt-0.5 truncate text-caption text-ink-400">
                {p.mobileMasked} · {p.city}
              </P>
            </Div>
          </Div>
          <Div className="mt-3.5 flex-row items-center gap-2">
            <MetaChip className="!bg-critical-50 !text-critical-700">
              <Droplet className="h-[11px] w-[11px]" /> {p.blood}
            </MetaChip>
            <MetaChip>Patient since {p.since}</MetaChip>
            <MetaChip>{p.consults} consults</MetaChip>
          </Div>
        </Card>

        {/* Safety-critical first */}
        {p.allergies.length > 0 && (
          <Card elevation="tile" className="!bg-critical-50">
            <Div className="flex-row items-center gap-2.5">
              <AlertTriangle className="h-[16px] w-[16px] shrink-0 text-critical-600" strokeWidth={2.3} />
              <P className="text-[11px] font-bold uppercase tracking-[.08em] text-critical-700">Drug allergies</P>
            </Div>
            <Div className="mt-2.5 flex-row flex-wrap gap-2">
              {p.allergies.map((a) => (
                <Span key={a} className="rounded-chip bg-white px-3 py-1.5 text-body-sm font-bold text-critical-700">
                  {a}
                </Span>
              ))}
            </Div>
          </Card>
        )}

        <Card elevation="tile">
          <P className="mb-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Active conditions</P>
          <Div className="gap-2">
            {p.conditions.map((c) => (
              <Div key={c} className="flex-row gap-2.5">
                <Span className="mt-[8px] h-[5px] w-[5px] shrink-0 rounded-full bg-brand-600" />
                <P className="text-body leading-[21px] text-ink-800">{c}</P>
              </Div>
            ))}
          </Div>
          <Divider className="my-3" />
          <KeyValue label="Last consultation" value={p.lastConsult} />
          {p.nextAppointment && <KeyValue label="Next appointment" value={p.nextAppointment} tone="success" />}
        </Card>

        {/* Record sections */}
        <Div>
          <SectionHeader title="Clinical record" className="!px-0 pb-2.5" />
          <Card elevation="tile" padded={false} className="overflow-hidden">
            {sections.map((s, i, arr) => (
              <Btn
                key={s.label}
                onPress={() => nav.navigate(s.screen)}
                className={`tap flex-row w-full items-center gap-3.5 px-4 py-3.5 text-left ${i < arr.length - 1 ? 'border-b-[0.5px] border-ink-900/10' : ''}`}
              >
                <Span className="flex-col h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-brand-50">
                  <s.Icon className="h-[16px] w-[16px] text-brand-600" strokeWidth={2.1} />
                </Span>
                <Span className="min-w-0 flex-1">
                  <Span className="block truncate text-body-lg text-ink-900">{s.label}</Span>
                  <Span className="block truncate text-caption text-ink-400">{s.sub}</Span>
                </Span>
                <ChevronRight className="h-[17px] w-[17px] shrink-0 text-ink-300" />
              </Btn>
            ))}
          </Card>
        </Div>

        <P className="px-1 text-caption leading-[17px] text-ink-400">
          You can see this record because {p.name.split(' ')[0]} has an active care relationship with you. Access is
          logged and ends 90 days after the last consultation.
        </P>
      </Div>

      <StickyBar>
        <Div className="flex-row gap-2.5">
          <Button
            variant="tertiary"
            block={false}
            className="w-[54px] !px-0"
            aria-label="Message"
            onClick={() => showToast(`Message sent to ${p.name.split(' ')[0]}`, 'info')}
          >
            <MessageSquare className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </Button>
          <Button
            variant="tertiary"
            block={false}
            className="w-[54px] !px-0"
            aria-label="Schedule"
            onClick={() => nav.navigate('dr-calendar')}
          >
            <CalendarPlus className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              openPrescriptionForPatient(p.id)
              nav.navigate('dr-rx-create')
            }}
          >
            New prescription
          </Button>
        </Div>
      </StickyBar>
    </Screen>
  )
}

/* ========================================= 17 — Consultation history ===== */

export function PatientHistoryScreen() {
  const nav = useNav()
  const p = useCurrentPatient()
  const allHistory = useRecords((st) => st.history)
  const consultationHistory = allHistory.filter((c) => c.patientId === p.id)

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Consultation history" subtitle={p.name} />

      <Div className="flex-1 px-5 pb-[40px] pt-4">
        <Card elevation="tile" className="mb-3">
          <Div className="flex-row items-center gap-3">
            <PatientAvatar patient={p} size={40} />
            <Div className="min-w-0 flex-1">
              <P className="truncate text-body-lg font-semibold text-ink-900">{p.name}</P>
              <PatientMeta patient={p} />
            </Div>
            <Div className="shrink-0 text-right">
              <P className="text-title-sm tabular-nums text-ink-900">{p.consults}</P>
              <P className="text-caption text-ink-400">consults</P>
            </Div>
          </Div>
        </Card>

        <Div className="relative">
          {consultationHistory.map((c, i) => {
            const { Icon, full } = MODE[c.mode]
            const last = i === consultationHistory.length - 1
            return (
              <Div key={c.id} className="relative flex-row gap-3.5 pb-3.5">
                {!last && <Span className="absolute left-[18px] top-[40px] w-[1.5px] rounded-full bg-ink-100" style={{ bottom: 0 }} />}
                <Span className="relative z-10 flex-col h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[11px] bg-white shadow-tile border border-ink-100">
                  <Icon className="h-[16px] w-[16px] text-brand-600" strokeWidth={2.1} />
                </Span>
                <Btn
                  onPress={() => {
                    useSelection.getState().select({ viewRxId: c.rxId })
                    nav.navigate('dr-rx-review')
                  }}
                  className="tap min-w-0 flex-1 rounded-tile bg-white p-3.5 text-left shadow-tile"
                >
                  <Div className="flex-row items-baseline justify-between gap-3">
                    <P className="text-title-sm tabular-nums text-ink-900">{c.date}</P>
                    <Span className="shrink-0 text-caption tabular-nums text-ink-400">{c.duration}</Span>
                  </Div>
                  <P className="mt-0.5 text-caption font-medium text-ink-500">{full}</P>
                  <P className="mt-2 text-body leading-[21px] text-ink-800">{c.summary}</P>
                  <Div className="mt-2.5 flex-row items-center gap-2 border-t border-ink-100 pt-2.5">
                    <FileText className="h-[13px] w-[13px] shrink-0 text-ink-400" strokeWidth={2.2} />
                    <Span className="min-w-0 flex-1 truncate text-caption tabular-nums text-ink-500">{c.rxId}</Span>
                    <Span className="shrink-0 text-caption font-bold text-brand-600">View</Span>
                  </Div>
                </Btn>
              </Div>
            )
          })}
        </Div>
      </Div>
    </Screen>
  )
}

/* ========================================= 18 — Prescription history ===== */

export function PatientPrescriptionsScreen() {
  const nav = useNav()
  const p = useCurrentPatient()
  const summaries = usePrescriptions((st) => st.summaries)
  const patientPrescriptions = summaries.filter((r) => r.patientId === p.id)

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Prescriptions" subtitle={p.name} />

      <Div className="flex-1 px-5 pb-[130px] pt-4">
        <P className="mb-2.5 text-caption text-ink-400">Issued by you · {patientPrescriptions.length} total</P>
        <Div className="gap-2.5">
          {patientPrescriptions.map((rx) => (
            <Btn
              key={rx.id}
              onPress={() => {
                useSelection.getState().select({ viewRxId: rx.id })
                nav.navigate('dr-rx-review')
              }}
              className="tap flex-row w-full items-start gap-3.5 rounded-tile bg-white p-4 text-left shadow-tile"
            >
              <Span className="flex-col h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[12px] bg-brand-50">
                <FileText className="h-[18px] w-[18px] text-brand-600" strokeWidth={2} />
              </Span>
              <Div className="min-w-0 flex-1">
                <Div className="flex-row items-start justify-between gap-2">
                  <P className="min-w-0 flex-1 text-body-lg font-semibold leading-[20px] text-ink-900">{rx.title}</P>
                  <StatusBadge tone={rx.status === 'active' ? 'success' : 'neutral'}>{rx.status}</StatusBadge>
                </Div>
                <P className="mt-1 text-caption tabular-nums text-ink-400">
                  {rx.date} · {rx.items} {rx.items === 1 ? 'medicine' : 'medicines'} · {rx.id}
                </P>
              </Div>
            </Btn>
          ))}
        </Div>
      </Div>

      <StickyBar>
        <Button
          onClick={() => {
            openPrescriptionForPatient(p.id)
            nav.navigate('dr-rx-create')
          }}
          icon={<Plus className="h-[17px] w-[17px]" strokeWidth={2.6} />}
        >
          New prescription
        </Button>
      </StickyBar>
    </Screen>
  )
}

/* ============================= 19 / 28 — Diagnostic reports (patient) ==== */

export function ReportsScreen() {
  const nav = useNav()
  const p = useCurrentPatient()
  const allReports = useRecords((st) => st.reports)
  const reports = allReports.filter((r) => r.patientId === p.id)
  const groups = ['Blood Tests', 'Imaging'] as const
  const awaiting = countAwaiting(reports)
  const [filter, setFilter] = React.useState('All')
  const matches = (r: Report) => {
    if (filter === 'All') return true
    if (filter === 'Awaiting review') return r.status === 'ready'
    if (filter === 'Flagged') return r.flagged > 0
    return r.category === filter
  }
  const open = (r: Report) => {
    useSelection.getState().select({ reportId: r.id, patientId: p.id })
    nav.navigate(r.status === 'pending' ? 'dr-st-report-unavailable' : 'dr-report-detail')
  }

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div
        className="sticky z-30 bg-white"
        style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop, top: -DEVICE.safeTop }}
      >
        <ScreenHeader embedded title="Diagnostic reports" subtitle={p.name} border={false} />
        <Div className="pb-3">
          <HScroll gap={8}>
            {['All', 'Blood Tests', 'Imaging', 'Awaiting review', 'Flagged'].map((f) => (
              <FilterChip key={f} active={filter === f} onClick={() => setFilter(f)}>
                {f}
              </FilterChip>
            ))}
          </HScroll>
        </Div>
      </Div>

      <Div className="flex-1 px-5 pb-[40px] pt-4">
        {/* Needs attention first */}
        {awaiting > 0 && (
          <Div className="mb-4 flex-row items-center gap-3 rounded-tile bg-caution-50 p-3.5">
            <AlertTriangle className="h-[17px] w-[17px] shrink-0 text-caution-700" strokeWidth={2.2} />
            <P className="min-w-0 flex-1 text-body-sm leading-[18px] text-caution-700">
              <Span className="font-bold">
                {awaiting} {awaiting === 1 ? 'report' : 'reports'} awaiting your review.
              </Span>{' '}
              The patient has been told results are with you.
            </P>
          </Div>
        )}

        {reports.length === 0 && (
          <Div className="pt-14">
            <StateBlock
              icon={<FlaskConical className="h-[31px] w-[31px]" strokeWidth={1.8} />}
              title="No reports on file"
              body="Reports ordered through KDC+ arrive here automatically. The patient can also upload reports from outside labs."
            />
          </Div>
        )}

        {groups.map((g) => {
          const items = reports.filter((r) => r.category === g && matches(r))
          if (!items.length) return null
          return (
            <Div key={g} className="mb-5">
              <P className="mb-2.5 text-caption font-bold uppercase tracking-[.08em] text-ink-500">{g}</P>
              <Div className="gap-2.5">
                {items.map((r) => (
                  <ReportCard
                    key={r.id}
                    report={r}
                    onClick={() => open(r)}
                  />
                ))}
              </Div>
            </Div>
          )
        })}
      </Div>
    </Screen>
  )
}
