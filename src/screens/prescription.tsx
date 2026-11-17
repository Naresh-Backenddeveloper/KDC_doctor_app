import { Btn, Div, P, Span } from '../components/primitives/index'
import React from 'react'
import {
  Plus,
  Trash2,
  Pencil,
  Send,
  Check,
  Clock,
  Share2,
  ChevronRight,
  CalendarClock,
  Stethoscope,
  AlertTriangle,
  Sparkles,
} from '../components/primitives/icons'
import { Screen } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/Nav'
import { Button, IconButton, StickyBar } from '../components/ui/Button'
import { Field, SearchInput, SelectField, TextArea, Toggle } from '../components/ui/Inputs'
import { Card, Divider, MetaChip, SectionHeader, StatusBadge, KeyValue } from '../components/ui/Display'
import { Banner, ModalSheet } from '../components/ui/Feedback'
import { Logo, EcgLine } from '../components/ui/Logo'
import { MODE, PatientAvatar, PatientMeta, DoctorAvatar } from '../components/doctor/index'
import { rupee } from '../mock-data/mock'
import { useNav } from '../navigation/navigation'
import { Share } from 'react-native'
import { z } from 'zod'
import { useController } from 'react-hook-form'
import { MedicineSheet } from '../components/doctor/MedicineSheet'
import { FieldError, FormInput, useZodForm } from '../components/ui/Form'
import { unresolvedForMedicine } from '../domain/allergy'
import { resolveRecentChip, searchMedicines, useMedicineSearch } from '../domain/medicines'
import { useAppointments } from '../store/appointments'
import { useConsultation } from '../store/consultation'
import { useCurrentRxKey } from '../store/context'
import { useDoctor } from '../store/doctor'
import { ensureRxDraft, roomFor, scheduleFollowUp, selectAppointment, sendPrescription } from '../store/flows'
import { usePrescriptions } from '../store/prescriptions'
import { useRecords } from '../store/records'
import { useSelection } from '../store/selection'
import { nextUpcoming } from '../store/selectors'
import { showToast } from '../store/toast'
import { injectFailure } from '../services'
import { LIVE } from '../services/config'
import { useEarnings } from '../store/earnings'
import type { CatalogMedicine, Mode, PrescribedMedicine } from '../types'
import { addDays, dateOptions, dayMonthLong, keyOfLabel, longDate, TODAY_KEY } from '../utils/date'
import { followUpSchema, type FollowUpForm } from '../validation/schemas'

/** The draft in hand, kept alive across the consultation's screens. */
function useCurrentRx() {
  const key = useCurrentRxKey()
  const rx = usePrescriptions((st) => st.drafts[key])
  React.useEffect(() => {
    if (!rx) ensureRxDraft(key)
  }, [rx, key])
  return { key, rx }
}

const ADVICE_TEMPLATES = ['Restrict salt intake to under 5 g per day.', 'Home BP log twice weekly, morning and evening.', 'Brisk walk 30 minutes, five days a week.', 'Review immediately if symptoms worsen.']
const entrySchema = z.object({ value: z.string().trim().min(2, 'Enter a value') })

/* ============================================ 25 — Create prescription === */

type EditorState = { index?: number; catalog?: CatalogMedicine; medicine?: PrescribedMedicine } | null

export function CreatePrescriptionScreen() {
  const nav = useNav()
  const { key, rx } = useCurrentRx()
  const patient = useRecords((st) => st.patientById(rx?.patientId ?? ''))
  const updateDraft = usePrescriptions((st) => st.updateDraft)
  const saveMedicine = usePrescriptions((st) => st.saveMedicine)
  const removeMedicine = usePrescriptions((st) => st.removeMedicine)
  const [query, setQuery] = React.useState('')
  const [editor, setEditor] = React.useState<EditorState>(null)
  const [investigationOpen, setInvestigationOpen] = React.useState(false)
  const [templates, setTemplates] = React.useState(false)
  const [noMedicines, setNoMedicines] = React.useState(false)
  const investigationForm = useZodForm(entrySchema, { value: '' })
  // Live: medicine search answers arrive asynchronously; re-render when they do.
  useMedicineSearch((s) => s.version)

  if (!rx) return <Screen background="bg-canvas" padBottom={false}><Div /></Screen>

  const unresolved = rx.medicines.flatMap((m) => unresolvedForMedicine(m, patient.allergies))
  const overridden = rx.medicines.filter((m) => m.allergyOverride).length
  const results = query.trim() ? searchMedicines(query).slice(0, 6) : []

  const addFromChip = (label: string) => {
    const catalog = resolveRecentChip(label)
    if (catalog) setEditor({ catalog })
  }
  const toReview = () => {
    if (rx.medicines.length === 0) {
      setNoMedicines(true)
      return
    }
    setNoMedicines(false)
    updateDraft(key, { reviewed: true })
    useSelection.getState().select({ viewRxId: null })
    nav.navigate('dr-rx-review')
  }
  const addInvestigation = investigationForm.handleSubmit((v) => {
    updateDraft(key, { investigations: [...rx.investigations, v.value.trim()] })
    investigationForm.reset({ value: '' })
    setInvestigationOpen(false)
  })

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Create prescription" subtitle={patient.name} />

      <Div className="flex-1 gap-3 px-5 pb-[140px] pt-4">
        {/* Patient strip with the allergy guard-rail */}
        <Card elevation="tile" padded={false}>
          <Div className="flex-row items-center gap-3 p-3.5">
            <PatientAvatar patient={patient} size={42} />
            <Div className="min-w-0 flex-1">
              <P className="truncate text-title-sm text-ink-900">{patient.name}</P>
              <PatientMeta patient={patient} extra={patient.blood} />
            </Div>
            <Span className="shrink-0 text-caption tabular-nums text-ink-400">{rx.date}</Span>
          </Div>
          {patient.allergies.length > 0 && (
            <Div className="flex-row items-center gap-2 border-t border-ink-100 bg-critical-50 px-3.5 py-2.5">
              <AlertTriangle className="h-[14px] w-[14px] shrink-0 text-critical-600" strokeWidth={2.4} />
              <P className="text-body-sm font-semibold text-critical-700">
                Allergic to {patient.allergies.join(', ')} — checked against every medicine added
              </P>
            </Div>
          )}
        </Card>

        {/* Diagnosis */}
        <Card elevation="tile">
          <Div className="mb-2 flex-row items-center justify-between">
            <P className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Diagnosis</P>
            <Btn
              onPress={() => nav.navigate('dr-notes')}
              className="tap text-body-sm font-semibold text-brand-600"
            >
              Edit
            </Btn>
          </Div>
          {rx.diagnosis.map((d) => (
            <Div key={d} className="flex-row items-center gap-2.5 rounded-[11px] bg-ink-50 px-3.5 py-2.5">
              <Span className="h-[5px] w-[5px] shrink-0 rounded-full bg-critical-600" />
              <P className="min-w-0 flex-1 text-body font-medium text-ink-900">{d}</P>
            </Div>
          ))}
        </Card>

        {/* Medicines */}
        <Div>
          <SectionHeader title="Medicines" subtitle={`${rx.medicines.length} added`} className="!px-0 pb-2.5" />
          <Div className="gap-2.5">
            {rx.medicines.map((m, i) => (
              <Card key={`${m.name}-${i}`} elevation="tile" padded={false}>
                <Div className="flex-row items-start gap-3 p-3.5 pb-2.5">
                  <Span className="flex-col h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                    {i + 1}
                  </Span>
                  <Div className="min-w-0 flex-1">
                    <P className="text-title-sm leading-[20px] text-ink-900">{m.name}</P>
                    <P className="mt-0.5 text-body-sm text-ink-500">{m.strength}</P>
                  </Div>
                  <Div className="flex-row shrink-0 gap-1">
                    <IconButton size={30} label="Edit" onClick={() => setEditor({ index: i, medicine: m })}>
                      <Pencil className="h-[13px] w-[13px] text-ink-500" strokeWidth={2.3} />
                    </IconButton>
                    <IconButton size={30} label="Remove" onClick={() => removeMedicine(key, i)}>
                      <Trash2 className="h-[13px] w-[13px] text-critical-600" strokeWidth={2.3} />
                    </IconButton>
                  </Div>
                </Div>

                <Div className=" grid-cols-4 gap-px border-t border-ink-100 bg-ink-100">
                  {[
                    { l: 'Dosage', v: m.dosage },
                    { l: 'Frequency', v: m.frequency.split(' — ')[0] },
                    { l: 'Duration', v: m.duration },
                    { l: 'Food', v: m.food },
                  ].map((x) => (
                    <Div key={x.l} className="bg-white px-2 py-2.5 text-center">
                      <P className="text-[9.5px] font-semibold uppercase tracking-wide text-ink-400">{x.l}</P>
                      <P className="mt-0.5 text-[11.5px] font-bold leading-[14px] text-ink-900">{x.v}</P>
                    </Div>
                  ))}
                </Div>

                <P className="px-3.5 py-2.5 text-caption italic leading-[16px] text-ink-500">{m.instructions}</P>
                {m.allergyOverride && (
                  <Div className="flex-row items-start gap-2 border-t border-critical-200 bg-critical-50 px-3.5 py-2.5">
                    <AlertTriangle className="mt-[1px] h-[13px] w-[13px] shrink-0 text-critical-600" strokeWidth={2.4} />
                    <P className="min-w-0 flex-1 text-caption font-semibold text-critical-700">
                      Allergy override · {m.allergyOverride.allergens.join(', ')} — {m.allergyOverride.reason}
                    </P>
                  </Div>
                )}
              </Card>
            ))}
          </Div>

          {/* Add medicine — the search-first pattern doctors expect */}
          <Div className="mt-2.5 rounded-tile bg-white p-3.5 shadow-tile">
            <SearchInput placeholder="Search medicine by brand or salt" value={query} onChange={setQuery} />
            {results.length > 0 && (
              <Div className="mt-2 overflow-hidden rounded-[11px] border border-ink-100">
                {results.map((m) => (
                  <Btn
                    key={m.id}
                    onPress={() => {
                      setQuery('')
                      setEditor({ catalog: m })
                    }}
                    className="tap flex-row w-full items-center gap-2 border-b-[0.5px] border-ink-900/10 bg-white px-3 py-2.5 text-left"
                  >
                    <Div className="min-w-0 flex-1">
                      <P className="truncate text-body font-semibold text-ink-900">{m.name}</P>
                      <P className="truncate text-caption text-ink-500">{m.strength}</P>
                    </Div>
                    <Plus className="h-[14px] w-[14px] text-brand-600" strokeWidth={2.6} />
                  </Btn>
                ))}
              </Div>
            )}
            <Div className="mt-2.5 flex-row flex-wrap gap-1.5">
              <Span className="text-caption text-ink-400">Recent:</Span>
              {['Telma 40', 'Ecosprin 75', 'Met XL 25', 'Nitrocontin 2.6'].map((m) => (
                <Btn
                  key={m}
                  onPress={() => addFromChip(m)}
                  className="tap inline-flex flex-row items-center gap-1 rounded-chip bg-ink-50 px-2.5 py-1 text-caption font-medium text-ink-600"
                >
                  <Plus className="h-[11px] w-[11px]" strokeWidth={2.6} />
                  {m}
                </Btn>
              ))}
            </Div>
            <Button
              variant="secondary"
              size="md"
              className="mt-3"
              onClick={() => setEditor({})}
              icon={<Plus className="h-[16px] w-[16px]" strokeWidth={2.6} />}
            >
              Add Medicine
            </Button>
          </Div>
        </Div>

        {/* Investigations */}
        <Card elevation="tile">
          <Div className="mb-2 flex-row items-center justify-between">
            <P className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Investigations advised</P>
            <Btn
              onPress={() => setInvestigationOpen(true)}
              className="tap flex-row items-center gap-1 text-body-sm font-semibold text-brand-600"
            >
              <Plus className="h-[14px] w-[14px]" strokeWidth={2.6} />
              Add
            </Btn>
          </Div>
          <Div className="flex-row flex-wrap gap-1.5">
            {rx.investigations.map((x) => (
              <Div key={x} onPress={() => updateDraft(key, { investigations: rx.investigations.filter((v) => v !== x) })}>
                <MetaChip>{x}</MetaChip>
              </Div>
            ))}
          </Div>
        </Card>

        {/* Advice */}
        <Card elevation="tile">
          <Div className="mb-2 flex-row items-center justify-between">
            <P className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Advice</P>
            <Btn onPress={() => setTemplates(true)} className="tap flex-row items-center gap-1 text-body-sm font-semibold text-brand-600">
              <Sparkles className="h-[13px] w-[13px]" strokeWidth={2.4} />
              Template
            </Btn>
          </Div>
          <TextArea
            value={rx.advice.join('\n')}
            onChangeText={(v: string) => updateDraft(key, { advice: v.split('\n') })}
            className="min-h-[92px] !text-body"
          />
        </Card>

        {/* Follow-up */}
        <Card elevation="tile">
          <Div className="flex-row items-center justify-between">
            <Div className="min-w-0">
              <P className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Follow-up</P>
              <P className="mt-1 text-body-lg font-semibold text-ink-900">{rx.followUp.date}</P>
            </Div>
            <Toggle on={rx.followUp.required} onClick={() => updateDraft(key, { followUp: { ...rx.followUp, required: !rx.followUp.required } })} />
          </Div>
          <Divider className="my-3" />
          <Btn
            onPress={() => nav.navigate('dr-followup')}
            className="tap flex-row w-full items-center justify-between text-left"
          >
            <Span className="flex-row items-center gap-2.5">
              {React.createElement(MODE[rx.followUp.mode].Icon, { className: 'h-[15px] w-[15px] text-ink-500', strokeWidth: 2.2 })}
              <Span className="text-body text-ink-700">{MODE[rx.followUp.mode].full} · 15 min</Span>
            </Span>
            <ChevronRight className="h-[16px] w-[16px] text-ink-300" />
          </Btn>
        </Card>
      </Div>

      <StickyBar>
        <FieldError message={noMedicines ? 'Add at least one medicine' : undefined} />
        <Div className="mb-2.5 flex-row items-center justify-between">
          <Span className="text-caption text-ink-500">
            {rx.medicines.length} {rx.medicines.length === 1 ? 'medicine' : 'medicines'} · {rx.followUp.required ? '1 follow-up' : 'No follow-up'}
          </Span>
          {unresolved.length > 0 ? (
            <Span className="text-caption font-semibold text-critical-700">Allergy conflict</Span>
          ) : overridden > 0 ? (
            <Span className="text-caption font-semibold text-critical-700">
              {overridden} allergy {overridden === 1 ? 'override' : 'overrides'}
            </Span>
          ) : (
            <Span className="text-caption font-semibold text-vital-700">No interactions found</Span>
          )}
        </Div>
        <Button onClick={toReview}>Review Prescription</Button>
      </StickyBar>

      {editor && (
        <MedicineSheet
          initial={editor.catalog}
          editing={editor.medicine}
          allergies={patient.allergies}
          onSave={(m) => {
            saveMedicine(key, m, editor.index)
            setEditor(null)
          }}
          onClose={() => setEditor(null)}
        />
      )}

      <ModalSheet
        visible={investigationOpen}
        title="Add investigation"
        onClose={() => setInvestigationOpen(false)}
        footer={<Button onClick={addInvestigation}>Add</Button>}
      >
        <Div className="pb-2">
          <FormInput control={investigationForm.control} name="value" label="Investigation" required autoFocus />
        </Div>
      </ModalSheet>

      <ModalSheet visible={templates} title="Advice templates" subtitle="Tap to add" onClose={() => setTemplates(false)}>
        <Div className="gap-2 pb-2">
          {ADVICE_TEMPLATES.filter((t) => !rx.advice.includes(t)).map((t) => (
            <Btn key={t} onPress={() => updateDraft(key, { advice: [...rx.advice, t] })} className="tap w-full rounded-tile bg-ink-50 px-3.5 py-3 text-left">
              <P className="text-body text-ink-800">{t}</P>
            </Btn>
          ))}
        </Div>
      </ModalSheet>
    </Screen>
  )
}

/* ============================================ 26 — Prescription review === */

export function ReviewPrescriptionScreen() {
  const nav = useNav()
  const { key, rx: draft } = useCurrentRx()
  const viewRxId = useSelection((st) => st.viewRxId)
  const viewed = usePrescriptions((st) => (viewRxId ? st.docs[viewRxId] : undefined))
  const doctor = useDoctor((st) => st.profile)
  const rx = viewed ?? draft
  const patient = useRecords((st) => st.patientById(rx?.patientId ?? ''))
  const appointment = useAppointments((st) => st.appointments.find((a) => a.id === rx?.apptId))
  const [sending, setSending] = React.useState(false)
  const [blocked, setBlocked] = React.useState<string | null>(null)

  if (!rx) return <Screen background="bg-canvas" padBottom={false}><Div /></Screen>
  const readOnly = rx.status === 'sent'

  const send = async () => {
    setSending(true)
    const result = await sendPrescription(key)
    setSending(false)
    if (result.ok) {
      nav.navigate('dr-rx-sent')
    } else if (result.reason === 'failed') {
      nav.navigate('dr-st-rx-failed')
    } else if (result.reason === 'allergy') {
      setBlocked(result.unresolved.map((c) => `${c.medicine} — ${c.allergen}`).join('; '))
    } else if (result.reason === 'empty') {
      showToast('Add at least one medicine', 'critical')
    }
  }
  const share = () => Share.share({ message: `Prescription ${rx.id} for ${patient.name}` })

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader
        title="Review prescription"
        subtitle={rx.id}
        right={
          <IconButton size={36} label="Share" onClick={share}>
            <Share2 className="h-[16px] w-[16px] text-ink-700" strokeWidth={2.2} />
          </IconButton>
        }
      />

      <Div className="flex-1 px-4 pb-[140px] pt-4">
        {/* The document exactly as the patient will receive it */}
        <Div className="overflow-hidden rounded-card bg-white shadow-card">
          <Div className="px-5 pb-4 pt-5">
            <Div className="flex-row items-start justify-between gap-4">
              <Logo variant="wordmark" width={88} />
              <Div className="text-right">
                <P className="text-[10px] font-bold uppercase tracking-[.1em] text-ink-400">Digital Prescription</P>
                <P className="mt-1 text-caption tabular-nums text-ink-600">{rx.id}</P>
              </Div>
            </Div>
            <Div className="mt-3 flex-row items-center gap-2">
              <EcgLine width={110} height={13} stroke="#0068C8" opacity={0.5} />
              <Span className="h-px flex-1 bg-gradient-to-r from-gold/60 to-transparent" />
            </Div>
          </Div>

          <Div className="bg-brand-50/60 px-5 py-3.5">
            <Div className="flex-row items-start gap-2.5">
              <Stethoscope className="mt-[2px] h-[16px] w-[16px] shrink-0 text-brand-600" strokeWidth={2.1} />
              <Div className="min-w-0">
                <P className="text-title-sm text-ink-900">{doctor.name}</P>
                <P className="text-body-sm text-ink-600">{doctor.qualification}</P>
                <P className="mt-0.5 text-caption text-ink-500">
                  {doctor.title} · {doctor.hospital}
                </P>
                <P className="mt-1 text-caption text-ink-400">
                  Reg. No. {doctor.regNo} · {doctor.council}
                </P>
              </Div>
            </Div>
          </Div>

          <Div className=" grid-cols-2 divide-x divide-ink-100 border-b border-ink-100">
            <Div className="px-5 py-3.5">
              <P className="text-[10px] font-bold uppercase tracking-[.08em] text-ink-400">Patient</P>
              <P className="mt-1.5 text-body-lg font-semibold text-ink-900">{patient.name}</P>
              <P className="text-caption text-ink-500">
                {patient.age} yrs · {patient.gender}
              </P>
              <P className="mt-0.5 text-caption tabular-nums text-ink-400">{patient.id}</P>
            </Div>
            <Div className="px-5 py-3.5">
              <P className="text-[10px] font-bold uppercase tracking-[.08em] text-ink-400">Date</P>
              <P className="mt-1.5 text-body-lg font-semibold text-ink-900">{rx.date}</P>
              <P className="text-caption text-ink-500">{appointment ? MODE[appointment.mode].full : 'Video consultation'}</P>
            </Div>
          </Div>

          <Block title="Diagnosis">
            {rx.diagnosis.map((d) => (
              <Div key={d} className="flex-row gap-2.5">
                <Span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-critical-600" />
                <P className="text-body-lg font-medium leading-[21px] text-ink-900">{d}</P>
              </Div>
            ))}
          </Block>

          <Block
            title="Medication"
            trailing={<Span className="rounded-[6px] bg-brand-600 px-1.5 py-[3px] font-display text-[11px] font-extrabold tracking-[.02em] text-white">Rx</Span>}
          >
            <Div className="gap-3">
              {rx.medicines.map((m, i) => (
                <Div key={`${m.name}-${i}`} className="rounded-tile bg-ink-50/70 p-3.5">
                  <Div className="flex-row items-start gap-2.5">
                    <Span className="flex-col h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                      {i + 1}
                    </Span>
                    <Div className="min-w-0 flex-1">
                      <P className="text-body-lg font-bold leading-[20px] text-ink-900">{m.name}</P>
                      <P className="text-body-sm text-ink-500">{m.strength}</P>
                    </Div>
                  </Div>
                  <Div className="mt-2.5  grid-cols-4 gap-2 pl-[32px]">
                    {[
                      { l: 'Dosage', v: m.dosage },
                      { l: 'Frequency', v: m.frequency.split(' — ')[0] },
                      { l: 'Duration', v: m.duration },
                      { l: 'Food', v: m.food },
                    ].map((x) => (
                      <Div key={x.l}>
                        <P className="text-[9px] font-semibold uppercase tracking-[.04em] text-ink-400">{x.l}</P>
                        <P className="mt-0.5 text-[11.5px] font-semibold leading-[14px] text-ink-800">{x.v}</P>
                      </Div>
                    ))}
                  </Div>
                  <P className="mt-2.5 pl-[32px] text-caption italic leading-[16px] text-ink-500">{m.instructions}</P>
                  {m.allergyOverride && (
                    <P className="mt-2 pl-[32px] text-caption font-semibold text-critical-700">
                      Prescribed despite allergy to {m.allergyOverride.allergens.join(', ')}: {m.allergyOverride.reason}
                    </P>
                  )}
                </Div>
              ))}
            </Div>
          </Block>

          <Block title="Advice">
            <Div className="gap-2">
              {rx.advice.map((a) => (
                <Div key={a} className="flex-row gap-2.5 text-body leading-[21px] text-ink-700">
                  <Span className="mt-[8px] h-[4px] w-[4px] shrink-0 rounded-full bg-ink-300" />
                  {a}
                </Div>
              ))}
            </Div>
          </Block>

          {rx.investigations.length > 0 && <Block title="Investigations advised">
            <Div className="flex-row flex-wrap gap-1.5">
              {rx.investigations.map((x) => (
                <MetaChip key={x}>{x}</MetaChip>
              ))}
            </Div>
          </Block>}

          <Block title="Follow-up" last>
            <Div className="flex-row items-start gap-2.5 rounded-tile bg-brand-50 p-3.5">
              <Clock className="mt-[1px] h-[16px] w-[16px] shrink-0 text-brand-600" strokeWidth={2.2} />
              <Div className="min-w-0">
                <P className="text-body-sm font-semibold text-brand-700">
                  {rx.followUp.required ? `${rx.followUp.date} · ${MODE[rx.followUp.mode].full}` : 'No follow-up scheduled'}
                </P>
                <P className="mt-0.5 text-body-sm text-brand-700/80">{rx.followUp.note}</P>
              </Div>
            </Div>
          </Block>

          <Div className="flex-row items-end justify-between border-t border-ink-100 px-5 py-4">
            <Div className="min-w-0">
              <P className="text-caption text-ink-400">Digitally signed by</P>
              <P className="mt-0.5 truncate text-body-sm font-bold text-ink-900">{doctor.name}</P>
              <P className="text-caption text-ink-400">{rx.date} · 5:44 PM</P>
            </Div>
            <DoctorAvatar src={doctor.photo} name={doctor.name} size={44} />
          </Div>

          <P className="border-t border-ink-100 bg-ink-50/60 px-5 py-2.5 text-center text-[10px] leading-[14px] text-ink-400">
            Computer-generated prescription issued through KDC+. Valid without a physical signature.
          </P>
        </Div>
      </Div>

      {!readOnly && (
        <StickyBar>
          {blocked && (
            <Div className="mb-2.5 flex-row items-start gap-2 rounded-[11px] bg-critical-50 px-3 py-2">
              <AlertTriangle className="mt-[1px] h-[14px] w-[14px] shrink-0 text-critical-600" strokeWidth={2.4} />
              <P className="min-w-0 flex-1 text-caption font-semibold text-critical-700">
                Allergy not overridden: {blocked}. Edit the prescription to continue.
              </P>
            </Div>
          )}
          <Div className="flex-row gap-2.5">
            <Button
              variant="tertiary"
              block={false}
              className="w-[56px] !px-0"
              aria-label="Edit prescription"
              onClick={() => nav.navigate('dr-rx-create')}
            >
              <Pencil className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </Button>
            {/* Long-press sends with a simulated network failure, to reach the failure path. */}
            <Button
              className="flex-1"
              loading={sending}
              onClick={send}
              onLongPress={() => {
                injectFailure('prescriptions.send')
                send()
              }}
              icon={<Send className="h-[16px] w-[16px]" strokeWidth={2.2} />}
            >
              Send Prescription
            </Button>
          </Div>
        </StickyBar>
      )}
    </Screen>
  )
}

function Block({
  title,
  children,
  trailing,
  last,
}: {
  title: string
  children: React.ReactNode
  trailing?: React.ReactNode
  last?: boolean
}) {
  return (
    <Div className={`px-5 py-4 ${last ? '' : 'border-b border-ink-100'}`}>
      <Div className="mb-2.5 flex-row items-center justify-between">
        <P className="text-[10px] font-bold uppercase tracking-[.1em] text-ink-400">{title}</P>
        {trailing}
      </Div>
      {children}
    </Div>
  )
}

/* ============================================== 27 — Prescription sent === */

export function PrescriptionSentScreen() {
  const nav = useNav()
  const { rx } = useCurrentRx()
  const patient = useRecords((st) => st.patientById(rx?.patientId ?? ''))
  const appt = useAppointments((st) => st.appointments.find((a) => a.id === rx?.apptId))
  if (!rx) return <Screen background="bg-white" padBottom={false}><Div /></Screen>

  const nextStep = () => nav.navigate(rx.followUp.required && !rx.followUp.scheduled ? 'dr-followup' : 'dr-consult-complete')

  return (
    <Screen background="bg-white" padBottom={false}>
      <Div className="flex-1 px-6 pb-[150px]">
        <Div className=" flex-col items-center pt-10">
          <Div className="relative flex-col h-[88px] w-[88px] items-center justify-center">
            <Span className="absolute inset-0 animate-pulseRing rounded-full bg-vital-600/20" />
            <Span className="relative flex-col h-[64px] w-[64px] items-center justify-center rounded-full bg-vital-600 shadow-[0_10px_28px_-8px_rgba(48,152,64,.6)]">
              <Check className="h-[31px] w-[31px] text-white" strokeWidth={3.2} />
            </Span>
          </Div>
          <P className="mt-6 text-center font-display text-[25px] font-extrabold leading-[30px] tracking-[-0.5px] text-ink-900">
            Prescription sent
          </P>
          <P className="mt-2 max-w-[290px] text-center text-body-lg leading-[23px] text-ink-500">
            {patient.name} has it in the KDC+ app and can order the medicines directly.
          </P>
        </Div>

        <Card elevation="card" padded={false} className="mt-7 overflow-hidden">
          <Div className="flex-row items-center gap-3.5 p-4">
            <PatientAvatar patient={patient} size={46} />
            <Div className="min-w-0 flex-1">
              <P className="truncate text-title-sm text-ink-900">{patient.name}</P>
              <PatientMeta patient={patient} />
            </Div>
            <StatusBadge tone="success" dot>
              Delivered
            </StatusBadge>
          </Div>
          <Divider />
          <Div className="p-4">
            <KeyValue label="Prescription ID" value={rx.id} />
            <KeyValue label="Date" value={rx.date} />
            <KeyValue label="Medicines" value={`${rx.medicines.length} items`} />
            <KeyValue label="Follow-up" value={rx.followUp.date} tone="success" />
          </Div>
        </Card>

        <Div className="mt-5 rounded-card bg-brand-50 p-4">
          <P className="text-body-sm font-bold text-brand-700">Consultation closed</P>
          <Div className="mt-2.5 gap-2">
            {[
              'Clinical notes saved to the patient record.',
              rx.followUp.required ? `Follow-up added to your calendar for ${dayMonthLong(rx.followUp.date)}.` : 'No follow-up required for this consultation.',
              `${rupee(appt?.fee ?? 800)} added to this week's settlement.`,
            ].map((t) => (
              <Div key={t} className="flex-row gap-2.5 text-body-sm leading-[19px] text-brand-700/90">
                <Check className="mt-[3px] h-[13px] w-[13px] shrink-0" strokeWidth={3} />
                {t}
              </Div>
            ))}
          </Div>
        </Div>
      </Div>

      <StickyBar>
        <Div className="gap-2.5">
          <Button onClick={nextStep}>Done</Button>
          <Div className="flex-row gap-2.5">
            <Button
              variant="tertiary"
              className="flex-1"
              onClick={() => {
                useSelection.getState().select({ viewRxId: rx.id })
                nav.navigate('dr-rx-review')
              }}
            >
              View prescription
            </Button>
            <Button variant="tertiary" className="flex-1" onClick={() => nav.navigate('dr-followup')}>
              Start follow-up
            </Button>
          </Div>
        </Div>
      </StickyBar>
    </Screen>
  )
}

/* ================================================== 30 — Follow-up ======= */

const FOLLOW_UP_PRESETS = [
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '4 weeks', days: 28 },
  { label: '3 months', days: 91 },
]

export function FollowUpScreen() {
  const nav = useNav()
  const { key, rx } = useCurrentRx()
  const patient = useRecords((st) => st.patientById(rx?.patientId ?? ''))
  const fees = useDoctor((st) => st.profile.fees)
  const dates = React.useMemo(() => dateOptions(120), [])
  const form = useZodForm<FollowUpForm>(followUpSchema, {
    required: rx?.followUp.required ?? true,
    date: rx?.followUp.date ?? longDate(addDays(TODAY_KEY, 28)),
    mode: rx?.followUp.mode ?? 'video',
    note: rx?.followUp.note ?? '',
  })
  const { field: required } = useController({ control: form.control, name: 'required' })
  const { field: date, fieldState: dateState } = useController({ control: form.control, name: 'date' })
  const { field: mode } = useController({ control: form.control, name: 'mode' })
  const { field: note, fieldState: noteState } = useController({ control: form.control, name: 'note' })

  const submit = form.handleSubmit((v) => {
    scheduleFollowUp(key, v, keyOfLabel(v.date, dates))
    nav.navigate('dr-consult-complete')
  })

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Schedule follow-up" subtitle={patient.name} />

      <Div className="flex-1 gap-3 px-5 pb-[130px] pt-4">
        <Card elevation="tile">
          <Div className="flex-row items-center justify-between">
            <Div className="min-w-0">
              <P className="text-title-sm text-ink-900">Follow-up required</P>
              <P className="mt-0.5 text-body-sm text-ink-500">Patient is notified and can book directly</P>
            </Div>
            <Toggle on={required.value} onClick={() => required.onChange(!required.value)} />
          </Div>
        </Card>

        <Card elevation="tile">
          <P className="mb-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">When</P>
          <Div className="flex-row gap-2">
            {FOLLOW_UP_PRESETS.map((p) => {
              const label = longDate(addDays(TODAY_KEY, p.days))
              const on = date.value === label
              return (
                <Btn
                  key={p.label}
                  onPress={() => date.onChange(label)}
                  className={`tap h-[42px] flex-1 rounded-[11px] text-body-sm font-bold  ${
                    on ? 'bg-brand-600 text-white shadow-cta' : 'bg-white text-ink-700 ring-1 ring-inset  ring-ink-200'
                  }`}
                >
                  {p.label}
                </Btn>
              )
            })}
          </Div>
          <Div className="mt-3">
            <Field label="Exact date" error={dateState.error?.message}>
              <SelectField value={date.value} options={dates.map((d) => d.label)} onChange={date.onChange} title="Exact date" />
            </Field>
          </Div>
        </Card>

        <Card elevation="tile">
          <P className="mb-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Consultation type</P>
          <Div className="gap-2">
            {(['video', 'audio', 'clinic'] as Mode[]).map((m) => {
              const { Icon, full } = MODE[m]
              const on = m === mode.value
              return (
                <Btn
                  key={m}
                  onPress={() => mode.onChange(m)}
                  className={`tap flex-row w-full items-center gap-3 rounded-[11px] px-3.5 py-3 text-left  ${
                    on ? 'bg-white ring-[1.5px] ring-inset  ring-brand-600' : 'bg-white ring-1 ring-inset  ring-ink-100'
                  }`}
                >
                  <Icon className={`h-[16px] w-[16px] shrink-0 ${on ? 'text-brand-600' : 'text-ink-500'}`} strokeWidth={2.2} />
                  <Div className="min-w-0 flex-1">
                    <P className="truncate text-body-lg font-semibold text-ink-900">{full}</P>
                    <P className="text-caption text-ink-400">{rupee(fees[m])}</P>
                  </Div>
                  <Span
                    className={`flex-col h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full ${
                      on ? 'bg-brand-600' : 'ring-1 ring-inset  ring-ink-300'
                    }`}
                  >
                    {on && <Span className="h-[6px] w-[6px] rounded-full bg-white" />}
                  </Span>
                </Btn>
              )
            })}
          </Div>
        </Card>

        <Card elevation="tile">
          <Field label="Note for the patient" hint="Appears with the follow-up reminder." error={noteState.error?.message}>
            <TextArea value={note.value} onChangeText={note.onChange} className="min-h-[80px]" />
          </Field>
        </Card>

        <Banner
          tone="brand"
          icon={<CalendarClock className="h-[16px] w-[16px]" strokeWidth={2.2} />}
          title="You have 4 open slots that week"
          body="The patient will see only your available times when they book."
        />
      </Div>

      <StickyBar>
        <Button onClick={submit}>Schedule Follow-up</Button>
      </StickyBar>
    </Screen>
  )
}

/* ====================================== Consultation completed (close) === */

export function ConsultCompleteScreen() {
  const nav = useNav()
  const { rx } = useCurrentRx()
  const patient = useRecords((st) => st.patientById(rx?.patientId ?? ''))
  const appointments = useAppointments((st) => st.appointments)
  const active = useConsultation((st) => st.active)
  const clearActive = useConsultation((st) => st.clearActive)
  // Live: the consultation's fee settles with the next payout cycle.
  const nextPayout = useEarnings((st) => st.payout.nextPayout.date)
  if (!rx) return <Screen background="bg-white" padBottom={false}><Div /></Screen>

  const appt = appointments.find((a) => a.id === rx.apptId)
  const next = nextUpcoming(appointments, rx.apptId)
  const nextPatient = useRecords.getState().patientById(next?.patientId ?? '')
  const seconds = active?.endedAt ? Math.round((active.endedAt - active.startedAt) / 1000) : 846
  const duration = `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, '0')} sec`
  const fee = appt?.fee ?? 800

  return (
    <Screen background="bg-white" padBottom={false}>
      <Div className="flex-1 px-6 pb-[150px]">
        <Div className=" flex-col items-center pt-9">
          <Span className="flex-col h-[64px] w-[64px] items-center justify-center rounded-[22px] bg-vital-50">
            <Check className="h-[30px] w-[30px] text-vital-600" strokeWidth={3} />
          </Span>
          <P className="mt-5 text-center font-display text-[25px] font-extrabold leading-[30px] tracking-[-0.5px] text-ink-900">
            Consultation completed
          </P>
          <P className="mt-2 text-body text-ink-500">{duration} · {rupee(fee)} earned</P>
        </Div>

        <Card elevation="tile" padded={false} className="mt-6 overflow-hidden">
          <Div className="flex-row items-center gap-3.5 p-4">
            <PatientAvatar patient={patient} size={46} />
            <Div className="min-w-0 flex-1">
              <P className="truncate text-title-sm text-ink-900">{patient.name}</P>
              <PatientMeta patient={patient} />
            </Div>
            <StatusBadge tone="success">Closed</StatusBadge>
          </Div>
          <Divider />
          {[
            { label: 'Clinical notes', value: 'Saved', done: true },
            { label: 'Prescription', value: rx.medicines.length ? `${rx.medicines.length} medicines sent` : 'None', done: rx.medicines.length > 0 },
            { label: 'Follow-up', value: rx.followUp.required ? rx.followUp.date : 'Not required', done: true },
            { label: 'Settlement', value: LIVE ? nextPayout : 'Wed, 8 Oct', done: false },
          ].map((r, i, arr) => (
            <Div key={r.label} className={`flex-row items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? 'border-b-[0.5px] border-ink-900/10' : ''}`}>
              <Span
                className={`flex-col h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full ${
                  r.done ? 'bg-vital-600' : 'bg-ink-100'
                }`}
              >
                {r.done ? (
                  <Check className="h-[12px] w-[12px] text-white" strokeWidth={3.4} />
                ) : (
                  <Clock className="h-[11px] w-[11px] text-ink-500" strokeWidth={2.6} />
                )}
              </Span>
              <Span className="min-w-0 flex-1 truncate text-body-lg text-ink-900">{r.label}</Span>
              <Span className="shrink-0 text-body-sm font-semibold text-ink-500">{r.value}</Span>
            </Div>
          ))}
        </Card>

        {next && (
          <Div className="mt-5 rounded-card bg-ink-900 p-4">
            <P className="text-caption text-white/50">Next appointment</P>
            <Div className="mt-2 flex-row items-center gap-3">
              <Span className="text-title-sm tabular-nums text-white">{next.time}</Span>
              <Span className="h-[12px] w-px bg-white/20" />
              <Span className="min-w-0 flex-1 truncate text-body-sm text-white/75">
                {nextPatient.name} · {MODE[next.mode].label}
              </Span>
              <Btn
                onPress={() => {
                  selectAppointment(next.id)
                  nav.navigate(roomFor(next))
                }}
                className="tap shrink-0 rounded-chip bg-white px-3 py-1.5 text-caption font-bold text-ink-900"
              >
                Open
              </Btn>
            </Div>
          </Div>
        )}
      </Div>

      <StickyBar>
        <Div className="gap-2.5">
          <Button
            onClick={() => {
              clearActive()
              nav.resetTo('dr-home', 'home')
            }}
          >
            Back to dashboard
          </Button>
          <Button
            variant="text"
            onClick={() => {
              useSelection.getState().select({ viewRxId: rx.id })
              nav.navigate('dr-rx-review')
            }}
          >
            View consultation record
          </Button>
        </Div>
      </StickyBar>
    </Screen>
  )
}
