import { Btn, Div, P, Span, SvgBox, SvgG, SvgPath, SvgRect } from '../components/primitives/index'
import { LIVE } from '../services/config'
import React from 'react'
import {
  Stethoscope,
  IndianRupee,
  CalendarClock,
  Building2,
  Landmark,
  Bell,
  ShieldCheck,
  LifeBuoy,
  Settings as SettingsIcon,
  ChevronRight,
  Pencil,
  LogOut,
  Globe,
  Lock,
  FileCheck,
  FileText,
  MessageSquare,
  Phone,
  Fingerprint,
  KeyRound,
  Trash2,
  Navigation,
  Clock,
  Plus,
  Send,
  Paperclip,
  Check,
  BellOff,
} from '../components/primitives/icons'
import { Screen, DEVICE, isTablet } from '../components/ui/Screen'
import { ScreenHeader, HScroll } from '../components/ui/Nav'
import { Button, IconButton, StickyBar } from '../components/ui/Button'
import { Field, Input, RadioRow, SearchInput, Toggle } from '../components/ui/Inputs'
import { Card, Divider, Group, ListRow, SectionHeader, StatusBadge, FilterChip, KeyValue } from '../components/ui/Display'
import { Banner, ModalSheet, StateBlock } from '../components/ui/Feedback'
import { FormInput, FormSelect, FormTextArea, useZodForm } from '../components/ui/Form'
import { Logo } from '../components/ui/Logo'
import { DoctorAvatar, DoctorNav, DoctorNotificationCard, MODE, VerifiedDoctorBadge } from '../components/doctor/index'
import { rupee, supportTopics } from '../mock-data/mock'
import { ACCOUNT_TYPES, APP_LANGUAGES, EXPERIENCE_OPTIONS, SPECIALIZATIONS, SUB_SPECIALIZATIONS, experienceLabel } from '../mock-data/options'
import { useNav } from '../navigation/navigation'
import { Linking } from 'react-native'
import { useController } from 'react-hook-form'
import { pickDocument } from '../platform/imagePicker'
import { useAvailability } from '../store/availability'
import { useBank } from '../store/bank'
import { useDoctor } from '../store/doctor'
import { saveBankDetails, selectAppointment } from '../store/flows'
import { useNotifications } from '../store/notifications'
import { useSession } from '../store/session'
import { useSelection } from '../store/selection'
import { useSettings } from '../store/settings'
import { useSupport } from '../store/support'
import { showToast } from '../store/toast'
import { services } from '../services'
import type { DoctorNotification, Mode, NotificationCategory, Qualification, SettingsState, SupportTicket, WorkingDay } from '../types'
import {
  bankSchema, clinicSchema, digits, feesSchema, netEarning, panSchema, passwordSchema, professionalInfoSchema, qualificationSchema,
  ticketSchema, type BankForm, type FeesForm,
} from '../validation/schemas'

/* ============================================== 34 — Notifications ======= */

export function NotificationsScreen() {
  const nav = useNav()
  const items = useNotifications((st) => st.items)
  const markAllRead = useNotifications((st) => st.markAllRead)
  const markRead = useNotifications((st) => st.markRead)
  const [filter, setFilter] = React.useState<'All' | NotificationCategory>('All')
  const groups = ['Today', 'Yesterday', 'This week']
  const allRead = items.every((n) => !n.unread)
  const visible = items.filter((n) => filter === 'All' || n.category === filter)

  const openAction = (n: DoctorNotification) => {
    markRead(n.id)
    if (n.apptId) selectAppointment(n.apptId)
    if (n.screen) nav.navigate(n.screen)
  }

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div
        className="sticky z-30 bg-white"
        style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop, top: -DEVICE.safeTop }}
      >
        <ScreenHeader
          embedded
          title="Notifications"
          border={false}
          right={
            <Btn
              onPress={markAllRead}
              disabled={allRead}
              className="tap px-2 text-body-sm font-semibold text-brand-600 disabled:text-ink-300"
            >
              {allRead ? 'All read' : 'Mark all read'}
            </Btn>
          }
        />
        <Div className="pb-3">
          <HScroll gap={8}>
            {(['All', 'Appointments', 'Patients', 'Payments', 'System'] as const).map((f) => (
              <FilterChip key={f} active={filter === f} onClick={() => setFilter(f)}>
                {f}
              </FilterChip>
            ))}
          </HScroll>
        </Div>
      </Div>

      <Div className="flex-1 pb-[40px] pt-4">
        {visible.length === 0 && (
          <Div className="pt-14">
            <StateBlock
              icon={<BellOff className="h-[30px] w-[30px]" strokeWidth={1.8} />}
              title="You're all caught up"
              body="Appointment, patient and payment alerts will show here."
            />
          </Div>
        )}
        {groups.map((g) => {
          const groupItems = visible.filter((n) => n.group === g)
          if (!groupItems.length) return null
          return (
            <Div key={g} className="mb-5">
              <P className="px-5 pb-2.5 text-caption font-bold uppercase tracking-[.08em] text-ink-400">{g}</P>
              <Div className="gap-2.5 px-5">
                {groupItems.map((n) => (
                  <DoctorNotificationCard key={n.id} n={n} onPress={() => markRead(n.id)} onAction={() => openAction(n)} />
                ))}
              </Div>
            </Div>
          )
        })}
      </Div>
    </Screen>
  )
}

/** Live: "Mon–Sat · 6 working days", "Every day · 7 working days" or "Mon, Wed, Fri · 3 working days". */
function workingDays(week: WorkingDay[]): string {
  const on = week.map((d, i) => (d.on && d.sessions.length ? i : -1)).filter((i) => i >= 0)
  if (!on.length) return 'No working days set'
  const count = `${on.length} working day${on.length === 1 ? '' : 's'}`
  if (on.length === 7) return `Every day · ${count}`
  const run = on.every((d, k) => k === 0 || d === on[k - 1] + 1)
  const days = run && on.length > 2 ? `${week[on[0]].short}–${week[on[on.length - 1]].short}` : on.map((i) => week[i].short).join(', ')
  return `${days} · ${count}`
}

/* ============================================== 35 — Doctor profile ====== */

export function ProfileScreen() {
  const nav = useNav()
  const tablet = isTablet()
  const doctor = useDoctor((st) => st.profile)
  const bank = useBank((st) => st.bank)
  const week = useAvailability((st) => st.week)

  const practice = [
    { Icon: Stethoscope, label: 'Professional information', sub: 'Qualifications and registration', screen: 'dr-professional-info' },
    { Icon: IndianRupee, label: 'Consultation fees', sub: `${rupee(doctor.fees.audio)} – ${rupee(doctor.fees.clinic)}`, screen: 'dr-fees' },
    { Icon: CalendarClock, label: 'Availability', sub: LIVE ? workingDays(week) : 'Mon–Sat · 6 working days', screen: 'dr-availability' },
    { Icon: Building2, label: 'Clinic information', sub: doctor.hospital, screen: 'dr-clinic' },
    { Icon: Landmark, label: 'Bank details', sub: bank.account ? `${bank.name} ${bank.account}` : 'Add your settlement account', screen: 'dr-bank' },
  ]
  const account = [
    { Icon: Bell, label: 'Notifications', sub: 'Push, SMS and email', screen: 'dr-notifications' },
    { Icon: ShieldCheck, label: 'Privacy & security', sub: 'Devices, access log, consent', screen: 'dr-settings' },
    { Icon: LifeBuoy, label: 'Support', sub: 'Chat, call and tickets', screen: 'dr-support' },
    { Icon: SettingsIcon, label: 'Settings', sub: 'Language, legal, account', screen: 'dr-settings' },
  ]

  return (
    <Screen background="bg-canvas" padTop={false} padBottom={false}>
      <Div className=" h-full overflow-y-auto pb-[112px]">
        {/* Identity */}
        <Div className={`bg-ink-900 ${tablet ? 'px-8 pb-8' : 'px-5 pb-6'}`} style={{ paddingTop: DEVICE.safeTop + (tablet ? 18 : 10) }}>
          <Div className="flex-row items-center justify-between">
            <P className={`${tablet ? 'text-title-lg' : 'text-title-md'} text-white`}>Profile</P>
            <IconButton size={36} tone="glass" label="Edit" onClick={() => nav.navigate('dr-profile-setup')}>
              <Pencil className="h-[15px] w-[15px]" strokeWidth={2.2} />
            </IconButton>
          </Div>

          <Div className={`${tablet ? 'mt-7 gap-6' : 'mt-5 gap-4'} flex-row items-center`}>
            <DoctorAvatar src={doctor.photo} name={doctor.name} size={tablet ? 112 : 72} ring />
            <Div className="min-w-0 flex-1">
              <Div className="flex-row items-center gap-1.5">
                <P className={`truncate ${tablet ? 'text-title-lg' : 'text-title-sm'} text-white`}>{doctor.name}</P>
                <VerifiedDoctorBadge size={tablet ? 20 : 15} />
              </Div>
              <P className={`mt-0.5 truncate ${tablet ? 'text-body-lg' : 'text-body-sm'} text-white/70`}>{doctor.specialization}</P>
              <P className={`truncate ${tablet ? 'text-body' : 'text-caption'} text-white/45`}>{experienceLabel(doctor.experience) || '—'} experience</P>
            </Div>
          </Div>

          <Btn
            onPress={() => nav.navigate('dr-professional-profile')}
            className={`tap ${tablet ? 'mt-6' : 'mt-4'} flex-row w-full items-center justify-between rounded-tile bg-white/8 px-3.5 py-2.5 ring-1 ring-inset  ring-white/12`}
          >
            <Span className="text-body-sm font-semibold text-white">View public profile</Span>
            <ChevronRight className="h-[16px] w-[16px] text-white/60" />
          </Btn>
        </Div>

        <Div className="gap-5 px-5 pt-5">
          <Div>
            <SectionHeader title="Practice" className="!px-0 pb-2.5" />
            <Group>
              {practice.map((m, i, arr) => (
                <ListRow
                  key={m.label}
                  icon={<m.Icon className="h-[16px] w-[16px]" strokeWidth={2.1} />}
                  title={m.label}
                  subtitle={m.sub}
                  last={i === arr.length - 1}
                  onClick={() => nav.navigate(m.screen)}
                />
              ))}
            </Group>
          </Div>

          <Div>
            <SectionHeader title="Account" className="!px-0 pb-2.5" />
            <Group>
              {account.map((m, i, arr) => (
                <ListRow
                  key={m.label}
                  icon={<m.Icon className="h-[16px] w-[16px]" strokeWidth={2.1} />}
                  title={m.label}
                  subtitle={m.sub}
                  last={i === arr.length - 1}
                  onClick={() => nav.navigate(m.screen)}
                />
              ))}
            </Group>
          </Div>

          <Div className=" flex-col items-center gap-2 pt-1">
            <Logo variant="wordmark" width={54} className="opacity-40" />
            <P className="text-caption text-ink-300">for Doctors · 1.0.0 (build 112)</P>
          </Div>
        </Div>
      </Div>

      <DoctorNav active="profile" />
    </Screen>
  )
}

/* ====================================== 36 — Professional information ==== */

const INFO_LANGUAGES = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada']

export function ProfessionalInfoScreen() {
  const nav = useNav()
  const doctor = useDoctor((st) => st.profile)
  const qualifications = useDoctor((st) => st.qualifications)
  const saveProfile = useDoctor((st) => st.saveProfile)
  const saveQualifications = useDoctor((st) => st.saveQualifications)
  const form = useZodForm(professionalInfoSchema, {
    specialization: doctor.specialization,
    subSpecialization: doctor.subSpecialization,
    experience: experienceLabel(doctor.experience),
    languages: doctor.languages,
  })
  const { field: languages, fieldState: languagesState } = useController({ control: form.control, name: 'languages' })
  const [qualEditor, setQualEditor] = React.useState<{ index?: number } | null>(null)

  const toggleLanguage = (l: string) =>
    languages.onChange(languages.value.includes(l) ? languages.value.filter((x: string) => x !== l) : [...languages.value, l])

  const save = form.handleSubmit(async (v) => {
    await saveProfile({ ...v, experience: parseInt(v.experience, 10) })
    showToast('Saved')
    nav.back()
  })

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Professional information" />

      <Div className="flex-1 gap-3 px-5 pb-[130px] pt-4">
        <Card elevation="tile">
          <Div className="mb-3 flex-row items-center justify-between">
            <P className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Medical registration</P>
            <StatusBadge tone="success" dot>
              Verified
            </StatusBadge>
          </Div>
          <Field label="Registration number">
            <Input defaultValue={doctor.regNo} readOnly className="!bg-ink-50" />
          </Field>
          <Div className="mt-3">
            <Field label="Issuing council">
              <Input defaultValue={doctor.council} readOnly className="!bg-ink-50" />
            </Field>
          </Div>
          <P className="mt-2.5 text-caption leading-[17px] text-ink-400">
            Registration details are locked after verification. Contact support to change them.
          </P>
        </Card>

        <Card elevation="tile">
          <P className="mb-3 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Specialization</P>
          <Div className="gap-3">
            <FormSelect control={form.control} name="specialization" label="Primary specialization" options={SPECIALIZATIONS} />
            <FormSelect control={form.control} name="subSpecialization" label="Sub-specialization" options={SUB_SPECIALIZATIONS} />
            <FormSelect control={form.control} name="experience" label="Years of experience" options={EXPERIENCE_OPTIONS} />
          </Div>
        </Card>

        <Card elevation="tile">
          <Div className="mb-3 flex-row items-center justify-between">
            <P className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Qualifications</P>
            <Btn onPress={() => setQualEditor({})} className="tap flex-row items-center gap-1 text-body-sm font-semibold text-brand-600">
              <Plus className="h-[14px] w-[14px]" strokeWidth={2.6} />
              Add
            </Btn>
          </Div>
          {qualifications.map((q, i) => (
            <Div key={`${q.degree}-${i}`}>
              {i > 0 && <Divider className="my-3" />}
              <Div className="flex-row items-start gap-3">
                <Span className="mt-[6px] h-[6px] w-[6px] shrink-0 rounded-full bg-brand-600" />
                <Div className="min-w-0 flex-1">
                  <P className="text-body-lg font-semibold text-ink-900">{q.degree}</P>
                  <P className="mt-0.5 truncate text-body-sm text-ink-500">{q.org}</P>
                  <P className="mt-1 text-caption tabular-nums text-ink-400">{q.years}</P>
                </Div>
                <IconButton size={30} label="Edit" onClick={() => setQualEditor({ index: i })}>
                  <Pencil className="h-[13px] w-[13px] text-ink-400" strokeWidth={2.3} />
                </IconButton>
              </Div>
            </Div>
          ))}
        </Card>

        <Card elevation="tile">
          <P className="mb-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Languages</P>
          <Div className="flex-row flex-wrap gap-2">
            {INFO_LANGUAGES.map((l) => {
              const on = languages.value.includes(l)
              return (
                <Btn
                  key={l}
                  onPress={() => toggleLanguage(l)}
                  className={`tap h-[38px] rounded-chip px-3.5 text-body-sm font-semibold  ${
                    on ? 'bg-brand-600 text-white shadow-cta' : 'bg-white text-ink-700 ring-1 ring-inset  ring-ink-200'
                  }`}
                >
                  {l}
                </Btn>
              )
            })}
          </Div>
          {languagesState.error && <P className="mt-2 text-caption text-critical-600">{languagesState.error.message}</P>}
        </Card>
      </Div>

      <StickyBar>
        <Button onClick={save} loading={form.formState.isSubmitting}>Save changes</Button>
      </StickyBar>

      {qualEditor && (
        <QualificationSheet
          initial={qualEditor.index === undefined ? undefined : qualifications[qualEditor.index]}
          onDelete={
            qualEditor.index === undefined || qualifications.length <= 1
              ? undefined
              : () => {
                  saveQualifications(qualifications.filter((_, i) => i !== qualEditor.index))
                  setQualEditor(null)
                }
          }
          onSave={(q) => {
            const next = qualEditor.index === undefined ? [...qualifications, q] : qualifications.map((x, i) => (i === qualEditor.index ? q : x))
            saveQualifications(next)
            setQualEditor(null)
          }}
          onClose={() => setQualEditor(null)}
        />
      )}
    </Screen>
  )
}

function QualificationSheet({
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  initial?: Qualification
  onSave: (q: Qualification) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const form = useZodForm(qualificationSchema, initial ?? { degree: '', org: '', years: '' })
  return (
    <ModalSheet
      visible
      title={initial ? 'Edit qualification' : 'Add qualification'}
      onClose={onClose}
      footer={
        <Div className="flex-row gap-2.5">
          {onDelete && (
            <Button variant="tertiary" className="flex-1 !text-critical-600" onClick={onDelete}>
              Remove
            </Button>
          )}
          <Button className="flex-1" onClick={form.handleSubmit(onSave)}>
            Save
          </Button>
        </Div>
      }
    >
      <Div className="gap-3.5 pb-2">
        <FormInput control={form.control} name="degree" label="Degree" required />
        <FormInput control={form.control} name="org" label="Institution" required />
        <FormInput control={form.control} name="years" label="Years" required hint="e.g. 2009 – 2012" />
      </Div>
    </ModalSheet>
  )
}

/* ============================================= 37 — Consultation fees === */

const MODE_LENGTH: Record<Mode, string> = { clinic: '20 min', video: '15 min', audio: '12 min' }

function FeeCard({ form, mode }: { form: ReturnType<typeof useZodForm<FeesForm>>; mode: Mode }) {
  const { Icon, full } = MODE[mode]
  const { field: fee, fieldState } = useController({ control: form.control, name: mode })
  const { field: enabled } = useController({ control: form.control, name: `${mode}On` as 'videoOn' })
  const amount = Number(fee.value) || 0
  return (
    <Card elevation="tile">
      <Div className="flex-row items-center gap-3">
        <Span className="flex-col h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] bg-brand-50">
          <Icon className="h-[17px] w-[17px] text-brand-600" strokeWidth={2.1} />
        </Span>
        <Div className="min-w-0 flex-1">
          <P className="truncate text-title-sm text-ink-900">{full}</P>
          <P className="text-caption text-ink-400">{MODE_LENGTH[mode]}</P>
        </Div>
        <Toggle on={enabled.value} onClick={() => enabled.onChange(!enabled.value)} />
      </Div>

      <Divider className="my-3.5" />

      <Div className="flex-row items-end gap-3">
        <Div className="min-w-0 flex-1">
          <P className="mb-1 text-caption text-ink-400">Patient pays</P>
          <Input
            value={fee.value}
            onChangeText={fee.onChange}
            inputMode="numeric"
            prefix={<Span className="border-r border-ink-200 pr-3 font-semibold text-ink-900">₹</Span>}
            className="!h-[46px]"
          />
        </Div>
        <Div className="shrink-0 pb-1 text-right">
          <P className="text-caption text-ink-400">You receive</P>
          <P className="mt-1 text-title-sm tabular-nums text-vital-700">{rupee(netEarning(amount))}</P>
        </Div>
      </Div>
      {fieldState.error && <P className="mt-2 text-caption text-critical-600">{fieldState.error.message}</P>}

      <P className="mt-2.5 text-caption text-ink-400">
        Cardiologists in Hyderabad charge {rupee(600)} – {rupee(1200)} for this type.
      </P>
    </Card>
  )
}

export function FeesScreen() {
  const nav = useNav()
  const doctor = useDoctor((st) => st.profile)
  const saveProfile = useDoctor((st) => st.saveProfile)
  const form = useZodForm<FeesForm>(feesSchema, {
    video: String(doctor.fees.video),
    audio: String(doctor.fees.audio),
    clinic: String(doctor.fees.clinic),
    videoOn: doctor.modesEnabled.video,
    audioOn: doctor.modesEnabled.audio,
    clinicOn: doctor.modesEnabled.clinic,
    freeFollowUp: doctor.freeFollowUp,
  })
  const { field: freeFollowUp } = useController({ control: form.control, name: 'freeFollowUp' })

  const save = form.handleSubmit(async (v) => {
    await saveProfile({
      fees: { video: Number(v.video), audio: Number(v.audio), clinic: Number(v.clinic) },
      modesEnabled: { video: v.videoOn, audio: v.audioOn, clinic: v.clinicOn },
      freeFollowUp: v.freeFollowUp,
    })
    showToast('Fees saved')
    nav.back()
  })

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Consultation fees" />

      <Div className="flex-1 gap-3 px-5 pb-[130px] pt-4">
        <Banner
          tone="brand"
          icon={<ShieldCheck className="h-[16px] w-[16px]" strokeWidth={2.2} />}
          title="Fees are set by you"
          body="KDC+ deducts a 12% platform fee. Changes apply to new bookings only."
        />

        {(['video', 'audio', 'clinic'] as Mode[]).map((m) => (
          <FeeCard key={m} form={form} mode={m} />
        ))}

        <Card elevation="tile">
          <Div className="flex-row items-center justify-between">
            <Div className="min-w-0 pr-4">
              <P className="text-title-sm text-ink-900">Free follow-up window</P>
              <P className="mt-0.5 text-body-sm leading-[18px] text-ink-500">
                No charge if the patient returns within 7 days for the same complaint.
              </P>
            </Div>
            <Toggle on={freeFollowUp.value} onClick={() => freeFollowUp.onChange(!freeFollowUp.value)} />
          </Div>
        </Card>
      </Div>

      <StickyBar>
        <Button onClick={save} loading={form.formState.isSubmitting}>Save fees</Button>
      </StickyBar>
    </Screen>
  )
}

/* ============================================ 38 — Clinic information === */

export function ClinicScreen() {
  const nav = useNav()
  const doctor = useDoctor((st) => st.profile)
  const saveProfile = useDoctor((st) => st.saveProfile)
  const form = useZodForm(clinicSchema, {
    clinic: doctor.clinic,
    address: doctor.address,
    city: doctor.city,
    pin: doctor.pin,
    clinicPhone: doctor.clinicPhone,
    acceptsInPerson: doctor.acceptsInPerson,
  })
  const { field: acceptsInPerson } = useController({ control: form.control, name: 'acceptsInPerson' })
  const save = form.handleSubmit(async (v) => {
    await saveProfile(v)
    showToast('Clinic details saved')
    nav.back()
  })
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Clinic information" />

      <Div className="flex-1 gap-3 px-5 pb-[130px] pt-4">
        <Card elevation="tile" padded={false} className="overflow-hidden">
          <Div className="relative h-[128px] bg-[#E8EEF4]">
            <SvgBox viewBox="0 0 360 128" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
              <SvgRect width="360" height="128" fill="#E9EFF5" />
              <SvgRect x="16" y="12" width="88" height="40" rx="6" fill="#DCEBDF" />
              <SvgRect x="258" y="74" width="90" height="48" rx="6" fill="#DCEBDF" />
              {[
                [120, 12, 58, 36],
                [190, 12, 50, 36],
                [16, 66, 76, 38],
                [104, 66, 62, 38],
                [178, 66, 58, 38],
              ].map(([x, y, w, h], i) => (
                <SvgRect key={i} x={x} y={y} width={w} height={h} rx="4" fill="#DFE6ED" />
              ))}
              <SvgG stroke="#FFFFFF" strokeLinecap="round">
                <SvgPath d="M0 60h360" strokeWidth="9" />
                <SvgPath d="M110 0v128" strokeWidth="7" />
                <SvgPath d="M246 0v128" strokeWidth="5" />
              </SvgG>
            </SvgBox>
            <Div className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2">
              <Span className="flex-col h-[34px] w-[34px] items-center justify-center rounded-full bg-brand-600 shadow-lift ring-[3px] ring-white">
                <Building2 className="h-[16px] w-[16px] text-white" strokeWidth={2.3} />
              </Span>
            </Div>
            <Btn
              onPress={() => Linking.openURL(`https://maps.apple.com/?q=${encodeURIComponent(doctor.clinic)}`)}
              className="tap absolute bottom-2.5 right-2.5 flex-row items-center gap-1.5 rounded-chip bg-white/92 px-2.5 py-1.5 shadow-tile"
            >
              <Navigation className="h-[12px] w-[12px] text-brand-600" strokeWidth={2.4} />
              <Span className="text-caption font-bold text-ink-800">Directions</Span>
            </Btn>
          </Div>

          <Div className="gap-3 p-4">
            <FormInput control={form.control} name="clinic" label="Hospital / clinic name" />
            <FormTextArea control={form.control} name="address" label="Address" className="min-h-[76px]" />
            <Div className=" grid-cols-2 gap-3">
              <FormInput control={form.control} name="city" label="City" />
              <FormInput control={form.control} name="pin" label="PIN code" inputMode="numeric" />
            </Div>
            <FormInput control={form.control} name="clinicPhone" label="Clinic contact" />
          </Div>
        </Card>

        <Card elevation="tile">
          <P className="mb-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Consultation timings</P>
          <Div className="gap-2">
            {[
              { d: 'Monday – Friday', t: '10:00 AM – 1:00 PM, 5:00 PM – 9:00 PM' },
              { d: 'Saturday', t: '10:00 AM – 2:00 PM' },
              { d: 'Sunday', t: 'Closed' },
            ].map((x) => (
              <Div key={x.d} className="flex-row items-start gap-3 rounded-[10px] bg-ink-50 px-3.5 py-2.5">
                <Clock className="mt-[2px] h-[14px] w-[14px] shrink-0 text-ink-400" strokeWidth={2.2} />
                <Div className="min-w-0 flex-1">
                  <P className="text-body-sm font-semibold text-ink-900">{x.d}</P>
                  <P className="mt-0.5 text-caption tabular-nums text-ink-500">{x.t}</P>
                </Div>
              </Div>
            ))}
          </Div>
        </Card>

        <Card elevation="tile">
          <Div className="flex-row items-center justify-between">
            <Div className="min-w-0 pr-4">
              <P className="text-title-sm text-ink-900">Accept in-person bookings</P>
              <P className="mt-0.5 text-body-sm text-ink-500">Patients can book a clinic visit</P>
            </Div>
            <Toggle on={acceptsInPerson.value} onClick={() => acceptsInPerson.onChange(!acceptsInPerson.value)} />
          </Div>
        </Card>
      </Div>

      <StickyBar>
        <Button onClick={save} loading={form.formState.isSubmitting}>Save clinic details</Button>
      </StickyBar>
    </Screen>
  )
}

/* ================================================= 39 — Bank details ==== */

export function BankScreen() {
  const nav = useNav()
  const bank = useBank((st) => st.bank)
  const markVerified = useBank((st) => st.markVerified)
  // Live: no account yet, or one operations couldn't verify.
  const hasAccount = useBank((st) => st.hasAccount)
  const failure = useBank((st) => st.failure)
  React.useEffect(() => {
    if (bank.status !== 'verifying') return
    // The mock ₹1 test credit clears shortly after the new account is saved.
    const t = setTimeout(markVerified, 3000)
    return () => clearTimeout(t)
  }, [bank.status, markVerified])
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Bank details" />

      <Div className="flex-1 gap-3 px-5 pb-[130px] pt-4">
        {LIVE && !hasAccount ? (
          <Banner tone="brand" title="No settlement account yet" body="Add the bank account your payouts go to. Our team verifies it before the first payout." />
        ) : null}
        {LIVE && failure ? <Banner tone="critical" title="We couldn’t verify this account" body={`${failure} Update your bank details to try again.`} /> : null}
        {!LIVE || hasAccount ? (
        <Card elevation="tile">
          <Div className="mb-3 flex-row items-center justify-between">
            <P className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Settlement account</P>
            <StatusBadge tone={bank.status === 'verified' ? 'success' : 'caution'} dot>
              {bank.status === 'verified' ? 'Verified' : 'Verifying'}
            </StatusBadge>
          </Div>
          <Div className="flex-row items-center gap-3.5">
            <Span className="flex-col h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[13px] bg-ink-50">
              <Landmark className="h-[19px] w-[19px] text-ink-600" strokeWidth={2.1} />
            </Span>
            <Div className="min-w-0 flex-1">
              <P className="truncate text-title-sm text-ink-900">{bank.name}</P>
              <P className="truncate text-body-sm tabular-nums text-ink-500">{bank.account}</P>
            </Div>
          </Div>
          <Divider className="my-3.5" />
          <KeyValue label="Account holder" value={bank.holder} />
          <KeyValue label="IFSC" value={bank.ifsc} />
          <KeyValue label="Branch" value={bank.branch} />
          <KeyValue label="Account type" value={bank.type} />
        </Card>
        ) : null}

        <Banner
          tone="caution"
          icon={<Lock className="h-[16px] w-[16px]" strokeWidth={2.2} />}
          title="Changing this account pauses payouts"
          body="New account details are verified with a ₹1 test credit. Settlements resume within 2 working days."
        />

        <Card elevation="tile">
          <P className="mb-3 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Tax information</P>
          <KeyValue label="PAN" value={bank.pan} />
          <KeyValue label="TDS section" value="194J — Professional fees" />
          <KeyValue label="TDS rate" value="10%" />
          <Divider className="my-3" />
          <Btn onPress={() => showToast('Form 16A requested', 'info', 'It will arrive by email shortly.')} className="tap flex-row w-full items-center justify-between text-left">
            <Span className="flex-row items-center gap-2.5">
              <FileText className="h-[16px] w-[16px] text-brand-600" strokeWidth={2.1} />
              <Span className="text-body-lg font-semibold text-brand-600">Download Form 16A</Span>
            </Span>
            <ChevronRight className="h-[16px] w-[16px] text-ink-300" />
          </Btn>
        </Card>

        <P className="px-1 text-caption leading-[17px] text-ink-400">
          Account numbers are masked everywhere in the app and are never shown in full after verification.
        </P>
      </Div>

      <StickyBar>
        <Button onClick={() => nav.navigate('dr-bank-edit')}>Update Bank Details</Button>
      </StickyBar>
    </Screen>
  )
}

/* ==================================================== 40 — Settings ===== */

const LEGAL_TEXT: Record<string, string> = {
  'Practitioner agreement': 'Sets out the terms under which you consult through KDC+, including fees, the 12% platform fee and your clinical responsibilities.',
  'Privacy policy': 'Explains how patient and practitioner data is collected, used and protected on KDC+.',
  'Telemedicine guidelines': 'Telemedicine Practice Guidelines issued by the Ministry of Health and Family Welfare, 2020.',
}
const SIGNED_IN_DEVICES = [
  { name: 'iPhone Air', detail: 'This device · Active now' },
  { name: 'iPad', detail: 'Hyderabad · 2 days ago' },
]
const ACCESS_LOG = [
  { who: 'Rahul Sharma', when: 'Today, 11:12 AM', what: 'Patient record' },
  { who: 'Meera Pillai', when: 'Today, 9:40 AM', what: 'Prescription' },
  { who: 'Sunita Rao', when: 'Yesterday, 6:05 PM', what: 'Diagnostic report' },
]

type SettingsPanel = null | 'password' | 'devices' | 'log' | 'language' | 'deactivate' | { legal: string } | 'logout'

export function SettingsScreen() {
  const nav = useNav()
  const language = useSettings((st) => st.language)
  const setLanguage = useSettings((st) => st.setLanguage)
  const logout = useSession((st) => st.logout)
  const resetSelection = useSelection((st) => st.reset)
  const [panel, setPanel] = React.useState<SettingsPanel>(null)
  const [deactivating, setDeactivating] = React.useState(false)

  const signOut = () => {
    logout()
    resetSelection()
    nav.resetTo('dr-login')
  }
  const deactivate = async () => {
    setDeactivating(true)
    await services.auth.deactivate()
    setDeactivating(false)
    setPanel(null)
    signOut()
  }

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Settings" />

      <Div className="flex-1 gap-5 px-5 pb-[40px] pt-4">
        <Div>
          <SectionHeader title="Notifications" className="!px-0 pb-2.5" />
          <Group>
            <SettingToggle setting="apptBooked" label="New appointment booked" />
            <SettingToggle setting="patientWaiting" label="Patient waiting in room" sub="Always on during duty hours" />
            <SettingToggle setting="apptCancelled" label="Appointment cancelled" />
            <SettingToggle setting="reportUploaded" label="Report uploaded for review" />
            <SettingToggle setting="payoutCredited" label="Payout credited" />
            <SettingToggle setting="productUpdates" label="Product updates" last />
          </Group>
        </Div>

        <Div>
          <SectionHeader title="Security" className="!px-0 pb-2.5" />
          <Group>
            <SettingToggle
              setting="biometricLock"
              label="Biometric lock"
              sub="Face ID required to open the app"
              icon={<Fingerprint className="h-[16px] w-[16px]" strokeWidth={2.1} />}
            />
            <ListRow icon={<KeyRound className="h-[16px] w-[16px]" strokeWidth={2.1} />} title="Change password" onClick={() => setPanel('password')} />
            <ListRow icon={<ShieldCheck className="h-[16px] w-[16px]" strokeWidth={2.1} />} title="Signed-in devices" subtitle="2 active" onClick={() => setPanel('devices')} />
            <ListRow icon={<FileText className="h-[16px] w-[16px]" strokeWidth={2.1} />} title="Patient data access log" subtitle="Last 90 days" last onClick={() => setPanel('log')} />
          </Group>
        </Div>

        <Div>
          <SectionHeader title="Preferences" className="!px-0 pb-2.5" />
          <Group>
            <ListRow
              icon={<Globe className="h-[16px] w-[16px]" strokeWidth={2.1} />}
              title="Language"
              onClick={() => setPanel('language')}
              trailing={
                <Span className="flex-row items-center gap-2">
                  <Span className="text-body-sm text-ink-400">{language}</Span>
                  <ChevronRight className="h-[17px] w-[17px] text-ink-300" />
                </Span>
              }
              last
            />
          </Group>
        </Div>

        <Div>
          <SectionHeader title="Legal" className="!px-0 pb-2.5" />
          <Group>
            <ListRow icon={<FileCheck className="h-[16px] w-[16px]" strokeWidth={2.1} />} title="Practitioner agreement" onClick={() => setPanel({ legal: 'Practitioner agreement' })} />
            <ListRow icon={<ShieldCheck className="h-[16px] w-[16px]" strokeWidth={2.1} />} title="Privacy policy" onClick={() => setPanel({ legal: 'Privacy policy' })} />
            <ListRow icon={<FileText className="h-[16px] w-[16px]" strokeWidth={2.1} />} title="Telemedicine guidelines" subtitle="MoHFW, 2020" last onClick={() => setPanel({ legal: 'Telemedicine guidelines' })} />
          </Group>
        </Div>

        <Div>
          <Group>
            <ListRow
              icon={<LogOut className="h-[16px] w-[16px]" strokeWidth={2.1} />}
              title="Log out"
              danger
              trailing={<Span />}
              onClick={() => setPanel('logout')}
            />
            <ListRow
              icon={<Trash2 className="h-[16px] w-[16px]" strokeWidth={2.1} />}
              title="Deactivate account"
              subtitle="Stops new bookings immediately"
              danger
              trailing={<Span />}
              last
              onClick={() => setPanel('deactivate')}
            />
          </Group>
        </Div>

        <Div className=" flex-col items-center gap-2 pb-2">
          <Logo variant="wordmark" width={54} className="opacity-40" />
          <P className="text-caption text-ink-300">for Doctors · 1.0.0 (build 112)</P>
        </Div>
      </Div>

      {panel === 'password' && <ChangePasswordSheet onClose={() => setPanel(null)} />}

      <ModalSheet visible={panel === 'devices'} title="Signed-in devices" onClose={() => setPanel(null)}>
        <Div className="gap-2 pb-2">
          {SIGNED_IN_DEVICES.map((d) => (
            <KeyValue key={d.name} label={d.name} value={d.detail} />
          ))}
        </Div>
      </ModalSheet>

      <ModalSheet visible={panel === 'log'} title="Patient data access log" subtitle="Last 90 days" onClose={() => setPanel(null)}>
        <Div className="gap-2 pb-2">
          {ACCESS_LOG.map((l) => (
            <KeyValue key={l.when} label={`${l.who} · ${l.what}`} value={l.when} />
          ))}
        </Div>
      </ModalSheet>

      <ModalSheet visible={panel === 'language'} title="Language" onClose={() => setPanel(null)}>
        <Div className="gap-2 pb-2">
          {APP_LANGUAGES.map((l) => (
            <RadioRow
              key={l}
              title={l}
              selected={language === l}
              onClick={() => {
                setLanguage(l)
                setPanel(null)
              }}
            />
          ))}
        </Div>
      </ModalSheet>

      <ModalSheet
        visible={panel !== null && typeof panel === 'object'}
        title={panel !== null && typeof panel === 'object' ? panel.legal : ''}
        onClose={() => setPanel(null)}
      >
        <P className="pb-2 text-body leading-[22px] text-ink-600">{panel !== null && typeof panel === 'object' ? LEGAL_TEXT[panel.legal] : ''}</P>
      </ModalSheet>

      <ModalSheet
        visible={panel === 'logout'}
        title="Log out of KDC+?"
        onClose={() => setPanel(null)}
        footer={
          <Div className="flex-row gap-2.5">
            <Button variant="tertiary" className="flex-1" onClick={() => setPanel(null)}>
              Stay signed in
            </Button>
            <Button variant="danger" className="flex-1" onClick={signOut}>
              Log out
            </Button>
          </Div>
        }
      >
        <P className="pb-2 text-body leading-[22px] text-ink-600">Patient details are cleared from this device. Sign in again with your password and an SMS code.</P>
      </ModalSheet>
      <ModalSheet
        visible={panel === 'deactivate'}
        title="Deactivate your account?"
        onClose={() => setPanel(null)}
        footer={
          <Div className="flex-row gap-2.5">
            <Button variant="tertiary" className="flex-1" onClick={() => setPanel(null)}>
              Keep account
            </Button>
            <Button variant="danger" className="flex-1" loading={deactivating} onClick={deactivate}>
              Deactivate
            </Button>
          </Div>
        }
      >
        <P className="pb-2 text-body leading-[22px] text-ink-600">New bookings stop immediately. Existing appointments and patient records are not deleted.</P>
      </ModalSheet>
    </Screen>
  )
}

function ChangePasswordSheet({ onClose }: { onClose: () => void }) {
  const form = useZodForm(passwordSchema, { current: '', next: '', confirm: '' })
  const submit = form.handleSubmit(async (v) => {
    await services.auth.changePassword(v.current, v.next)
    showToast('Password changed')
    onClose()
  })
  return (
    <ModalSheet
      visible
      title="Change password"
      onClose={onClose}
      footer={
        <Button onClick={submit} loading={form.formState.isSubmitting}>
          Update password
        </Button>
      }
    >
      <Div className="gap-3.5 pb-2">
        <FormInput control={form.control} name="current" label="Current password" required type="password" />
        <FormInput control={form.control} name="next" label="New password" required type="password" />
        <FormInput control={form.control} name="confirm" label="Confirm new password" required type="password" />
      </Div>
    </ModalSheet>
  )
}

function SettingToggle({
  setting,
  label,
  sub,
  last,
  icon,
}: {
  setting: Exclude<keyof SettingsState, 'language'>
  label: string
  sub?: string
  last?: boolean
  icon?: React.ReactNode
}) {
  const on = useSettings((st) => st[setting])
  const toggle = useSettings((st) => st.toggle)
  return (
    <Div className={`flex-row items-center gap-3.5 bg-white px-4 py-[13px] ${last ? '' : 'border-b-[0.5px] border-ink-900/10'}`}>
      {icon && (
        <Span className="flex-col h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-brand-50 text-brand-600">
          {icon}
        </Span>
      )}
      <Div className="min-w-0 flex-1">
        <P className="truncate text-body-lg text-ink-900">{label}</P>
        {sub && <P className="mt-[1px] truncate text-body-sm text-ink-400">{sub}</P>}
      </Div>
      <Toggle on={on} onClick={() => toggle(setting)} />
    </Div>
  )
}

/* ================================================= 41 — Doctor support == */

const FAQS = [
  { q: 'When are consultation fees settled?', a: 'Fees clear 48 hours after the consultation and settle every Wednesday, after the 12% platform fee and TDS.' },
  { q: 'A patient did not join — am I still paid?', a: 'Yes. Mark the appointment as a no-show after 10 minutes; the patient\'s fee is released to your next settlement per your agreement.' },
  { q: 'How do I change my registered council details?', a: 'Council details are locked after verification. Contact verification support with your updated certificate.' },
  { q: 'Can I consult outside my listed availability?', a: 'Yes, by adding a session on the Edit schedule screen. Patients only see open slots within your sessions.' },
]

/** Live: what the ticket screen shows when the ticket isn't loaded (none yet, or after sign-out). */
const NO_TICKET: SupportTicket = { id: '', subject: '', status: 'open', priority: '', created: '', updated: '', thread: [] }

export function SupportScreen() {
  const nav = useNav()
  const tickets = useSupport((st) => st.tickets)
  const select = useSelection((st) => st.select)
  const [query, setQuery] = React.useState('')
  const [creating, setCreating] = React.useState<null | { subject: string }>(null)
  const [faq, setFaq] = React.useState<(typeof FAQS)[number] | null>(null)
  const needle = query.trim().toLowerCase()
  const topics = supportTopics.filter((t) => !needle || t.title.toLowerCase().includes(needle) || t.body.toLowerCase().includes(needle))
  const faqs = FAQS.filter((f) => !needle || f.q.toLowerCase().includes(needle) || f.a.toLowerCase().includes(needle))
  const ticket = tickets[0]
  const openTicket = (id: string) => {
    select({ ticketId: id })
    nav.navigate('dr-ticket')
  }
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div
        className="sticky z-30 bg-white"
        style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop, top: -DEVICE.safeTop }}
      >
        <ScreenHeader embedded title="Support" border={false} />
        <Div className="px-5 pb-1">
          <SearchInput placeholder="Describe the issue" value={query} onChange={setQuery} />
        </Div>
      </Div>

      <Div className="flex-1 px-5 pb-[140px] pt-4">
        <P className="text-title-md text-ink-900">How can we help?</P>
        <P className="mt-1 text-body text-ink-500">Priority support for practising clinicians, 24 × 7.</P>

        {/* Open ticket surfaces first (live: a new doctor has none) */}
        {ticket && <Btn
          onPress={() => openTicket(ticket.id)}
          className="tap mt-4 flex-row w-full items-center gap-3.5 rounded-tile bg-white p-4 text-left shadow-tile ring-[1.5px] ring-inset  ring-brand-200"
        >
          <Span className="flex-col h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] bg-brand-50">
            <MessageSquare className="h-[17px] w-[17px] text-brand-600" strokeWidth={2.1} />
          </Span>
          <Div className="min-w-0 flex-1">
            <P className="truncate text-body-lg font-semibold text-ink-900">{ticket.subject}</P>
            <P className="truncate text-caption tabular-nums text-ink-400">
              {ticket.id} · updated {ticket.updated.split(',')[1] ?? ticket.updated}
            </P>
          </Div>
          <StatusBadge tone="brand" dot>
            Open
          </StatusBadge>
        </Btn>}

        <Div className="mt-5">
          <SectionHeader title="Browse topics" className="!px-0 pb-2.5" />
          <Group>
            {topics.map((t, i, arr) => (
              <ListRow
                key={t.id}
                title={t.title}
                subtitle={t.body}
                trailing={
                  <Span className="flex-row items-center gap-2">
                    <Span className="text-caption text-ink-400">{t.articles}</Span>
                    <ChevronRight className="h-[17px] w-[17px] text-ink-300" />
                  </Span>
                }
                last={i === arr.length - 1}
                onClick={() => setCreating({ subject: `${t.title}: ` })}
              />
            ))}
          </Group>
          {topics.length === 0 && <P className="py-3 text-center text-body text-ink-400">No matching topics.</P>}
        </Div>

        <Div className="mt-5">
          <SectionHeader title="Common questions" className="!px-0 pb-2.5" />
          <Group>
            {faqs.map((f, i, arr) => (
              <ListRow key={f.q} title={<Span className="text-body">{f.q}</Span>} last={i === arr.length - 1} onClick={() => setFaq(f)} />
            ))}
          </Group>
        </Div>
      </Div>

      <StickyBar>
        <Div className="flex-row gap-2.5">
          <Button
            variant="tertiary"
            block={false}
            className="w-[56px] !px-0"
            aria-label="Call support"
            onClick={() => Linking.openURL('tel:+914023607777')}
          >
            <Phone className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </Button>
          <Button
            variant="tertiary"
            block={false}
            className="w-[56px] !px-0"
            aria-label="Chat with support"
            onClick={() => openTicket(ticket.id)}
          >
            <MessageSquare className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </Button>
          <Button className="flex-1" onClick={() => setCreating({ subject: '' })}>
            Create a ticket
          </Button>
        </Div>
      </StickyBar>

      {creating && <CreateTicketSheet subject={creating.subject} onClose={() => setCreating(null)} onCreated={openTicket} />}

      <ModalSheet visible={faq !== null} title={faq?.q ?? ''} onClose={() => setFaq(null)}>
        <P className="pb-2 text-body leading-[22px] text-ink-600">{faq?.a}</P>
      </ModalSheet>
    </Screen>
  )
}

function CreateTicketSheet({ subject, onClose, onCreated }: { subject: string; onClose: () => void; onCreated: (id: string) => void }) {
  const create = useSupport((st) => st.create)
  const form = useZodForm(ticketSchema, { subject, description: '' })
  const submit = form.handleSubmit(async (v) => {
    const id = await create(v.subject, v.description)
    onClose()
    onCreated(id)
  })
  return (
    <ModalSheet
      visible
      title="Create a ticket"
      subtitle="Priority support for practising clinicians"
      onClose={onClose}
      footer={
        <Button onClick={submit} loading={form.formState.isSubmitting}>
          Submit ticket
        </Button>
      }
    >
      <Div className="gap-3.5 pb-2">
        <FormInput control={form.control} name="subject" label="Subject" required />
        <FormTextArea control={form.control} name="description" label="What happened?" required className="min-h-[110px]" />
      </Div>
    </ModalSheet>
  )
}

/* ================================================= 42 — Support ticket == */

export function TicketScreen() {
  const tickets = useSupport((st) => st.tickets)
  const ticketId = useSelection((st) => st.ticketId)
  const reply = useSupport((st) => st.reply)
  const t = tickets.find((x) => x.id === ticketId) ?? tickets[0] ?? NO_TICKET
  const [draft, setDraft] = React.useState('')
  const [sending, setSending] = React.useState(false)

  const send = async () => {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    try {
      await reply(t.id, text)
      setDraft('')
    } finally {
      setSending(false)
    }
  }
  const attach = async () => {
    const res = await pickDocument()
    if (res.status === 'picked') await reply(t.id, `Attached ${res.file.name}`)
    else if (res.status === 'denied') showToast('Photo access is off', 'critical', 'Allow access in Settings to attach a file.')
    else if (res.status === 'error') showToast('Could not open the photo', 'critical', res.message)
  }

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title={t.id} subtitle="Support ticket" />

      <Div className="flex-1 px-5 pb-[130px] pt-4">
        <Card elevation="tile" className="mb-4">
          <Div className="flex-row items-start justify-between gap-3">
            <P className="min-w-0 flex-1 text-title-sm leading-[21px] text-ink-900">{t.subject}</P>
            <StatusBadge tone="brand" dot>
              {t.status === 'open' ? 'Open' : t.status === 'resolved' ? 'Resolved' : 'In progress'}
            </StatusBadge>
          </Div>
          <Divider className="my-3" />
          <KeyValue label="Priority" value={t.priority} tone={/^(urgent|high)$/i.test(t.priority) ? 'critical' : undefined} />
          <KeyValue label="Created" value={t.created} />
          <KeyValue label="Last update" value={t.updated} />
        </Card>

        <P className="mb-3 text-caption font-bold uppercase tracking-[.08em] text-ink-400">Conversation</P>

        <Div className="gap-3">
          {t.thread.map((m, i) => {
            const mine = m.from === 'doctor'
            return (
              <Div key={i} className={`flex-row ${mine ? 'justify-end' : 'justify-start'}`}>
                <Div className={`max-w-[84%] ${mine ? 'items-end' : 'items-start'}  flex-col`}>
                  {!mine && <P className="mb-1 px-1 text-caption font-semibold text-ink-500">{m.name}</P>}
                  <Div
                    className={`rounded-tile px-3.5 py-3 ${
                      mine ? 'bg-brand-600 text-white' : 'bg-white text-ink-800 shadow-tile'
                    }`}
                  >
                    <P className="text-body leading-[21px]">{m.text}</P>
                  </Div>
                  <P className="mt-1 px-1 text-caption tabular-nums text-ink-400">{m.at}</P>
                </Div>
              </Div>
            )
          })}
        </Div>

        {t.status === 'in-progress' && (
          <Div className="mt-5 flex-row items-center gap-2.5 rounded-tile bg-vital-50 p-3.5">
            <Check className="h-[16px] w-[16px] shrink-0 text-vital-600" strokeWidth={2.6} />
            <P className="min-w-0 flex-1 text-body-sm leading-[18px] text-vital-700">
              {rupee(800)} refunded to your October settlement for the affected consultation.
            </P>
          </Div>
        )}
      </Div>

      <StickyBar aboveKeyboard>
        <Div className="flex-row items-center gap-2.5">
          <IconButton size={44} label="Attach" onClick={attach}>
            <Paperclip className="h-[17px] w-[17px] text-ink-500" strokeWidth={2.2} />
          </IconButton>
          <Div className="min-w-0 flex-1">
            <Input placeholder="Reply to support" value={draft} onChangeText={setDraft} className="!h-[44px]" />
          </Div>
          <IconButton size={44} tone="brand" label="Send" onClick={send}>
            <Send className="h-[17px] w-[17px]" strokeWidth={2.2} />
          </IconButton>
        </Div>
      </StickyBar>
    </Screen>
  )
}

/* ============================================ 39b — Update bank details == */

export function BankEditScreen() {
  const nav = useNav()
  const bank = useBank((st) => st.bank)
  const hasAccount = useBank((st) => st.hasAccount)
  const form = useZodForm<BankForm>(bankSchema, {
    holder: bank.holder,
    accountNumber: '',
    confirmAccountNumber: '',
    ifsc: '',
    type: bank.type,
  })
  const panForm = useZodForm(panSchema, { pan: '' })
  const [panOpen, setPanOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const details = React.useRef<BankForm | null>(null)

  const askForPan = form.handleSubmit((v) => {
    details.current = v
    setSubmitError(null)
    setPanOpen(true)
  })

  const save = panForm.handleSubmit(async ({ pan }) => {
    if (!details.current) return
    const { holder, accountNumber, ifsc, type } = details.current
    setSaving(true)
    try {
      const result = await saveBankDetails({ holder, accountNumber, ifsc, type, pan })
      setPanOpen(false)
      nav.navigate(result === 'name-mismatch' ? 'dr-st-payout-failed' : 'dr-bank')
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not save these details. Try again.')
    } finally {
      setSaving(false)
    }
  })

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Update bank details" />

      <Div className="flex-1 gap-3 px-5 pb-[130px] pt-4">
        <Banner
          tone="caution"
          icon={<Lock className="h-[16px] w-[16px]" strokeWidth={2.2} />}
          title="Payouts pause until the new account is verified"
          body="We send a ₹1 test credit. Settlements resume within 2 working days of it clearing."
        />

        <Card elevation="tile">
          <P className="mb-3 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">New account</P>
          <Div className="gap-3">
            <FormInput control={form.control} name="holder" label="Account holder name" required hint="Must match your PAN exactly." />
            <FormInput control={form.control} name="accountNumber" label="Account number" required placeholder="Enter account number" inputMode="numeric" transform={digits} />
            <FormInput control={form.control} name="confirmAccountNumber" label="Re-enter account number" required placeholder="Enter it again" inputMode="numeric" transform={digits} />
            <FormInput
              control={form.control}
              name="ifsc"
              label="IFSC"
              required
              hint="11 characters, e.g. HDFC0001204"
              placeholder="HDFC0001204"
              autoCapitalize="characters"
              transform={(v: string) => v.toUpperCase()}
            />
            <FormSelect control={form.control} name="type" label="Account type" options={ACCOUNT_TYPES} />
          </Div>
        </Card>

        {hasAccount && <Card elevation="tile">
          <P className="mb-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Replacing</P>
          <Div className="flex-row items-center gap-3.5">
            <Span className="flex-col h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] bg-ink-50">
              <Landmark className="h-[17px] w-[17px] text-ink-500" strokeWidth={2.1} />
            </Span>
            <Div className="min-w-0 flex-1">
              <P className="truncate text-body-lg font-semibold text-ink-900">{bank.name}</P>
              <P className="truncate text-body-sm tabular-nums text-ink-500">{bank.account}</P>
            </Div>
            <StatusBadge tone="neutral">Current</StatusBadge>
          </Div>
        </Card>}

        <P className="px-1 text-caption leading-[17px] text-ink-400">
          Bank details are stored encrypted and shown masked everywhere in the app. KDC+ support can never see the
          full account number.
        </P>
      </Div>

      <StickyBar>
        <Button onClick={askForPan}>Verify &amp; save</Button>
      </StickyBar>

      <ModalSheet
        visible={panOpen}
        title="Confirm your PAN"
        subtitle="Used to match this account for TDS under Section 194J"
        onClose={() => setPanOpen(false)}
        footer={
          <Button onClick={save} loading={saving}>
            Confirm and verify
          </Button>
        }
      >
        <Div className="gap-2 pb-2">
          <FormInput
            control={panForm.control}
            name="pan"
            label="PAN"
            required
            placeholder="ABCDE1234F"
            autoCapitalize="characters"
            transform={(v: string) => v.toUpperCase()}
          />
          {submitError && <P className="text-caption text-critical-600">{submitError}</P>}
        </Div>
      </ModalSheet>
    </Screen>
  )
}
