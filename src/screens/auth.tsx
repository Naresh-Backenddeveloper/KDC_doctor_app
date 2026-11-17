import { Btn, Div, Img, P, Span, TextField } from '../components/primitives/index'
import React from 'react'
import {
  ShieldCheck,
  ChevronRight,
  Lock,
  Eye,
  Camera,
  Check,
  Upload,
  FileCheck2,
  Clock,
  CircleAlert,
  Stethoscope,
  Languages,
  Building2,
  Award,
  Pencil,
  X,
} from '../components/primitives/icons'
import { Screen, DEVICE, solidBarInset } from '../components/ui/Screen'
import { Logo, EcgLine } from '../components/ui/Logo'
import { StepBar } from '../components/ui/Display'
import { Button, IconButton, StickyBar } from '../components/ui/Button'
import { Field, OtpInput } from '../components/ui/Inputs'
import { FieldError, FormInput, FormSelect, FormTextArea, useZodForm } from '../components/ui/Form'
import { Card, Divider, SectionHeader, StatusBadge, KeyValue, ProgressBar } from '../components/ui/Display'
import { ScreenHeader } from '../components/ui/Nav'
import { Banner, ModalSheet } from '../components/ui/Feedback'
import { DOCTOR_SCENE } from '../mock-data/media'
import { experienceHistory, rupee } from '../mock-data/mock'
import { COUNCILS, EXPERIENCE_OPTIONS, LANGUAGES, SPECIALIZATIONS, SUB_SPECIALIZATIONS, experienceLabel } from '../mock-data/options'
import { DoctorAvatar, VerifiedDoctorBadge, MODE } from '../components/doctor/index'
import { isDevLaunch, useNav } from '../navigation/navigation'
import { Linking } from 'react-native'
import { useController } from 'react-hook-form'
import { useSession } from '../store/session'
import { LIVE } from '../services/config'
import { restoreSession } from '../services/live/http'
import { useDoctor } from '../store/doctor'
import { useVerification } from '../store/verification'
import { pickDocument } from '../platform/imagePicker'
import { showToast } from '../store/toast'
import { ServiceError } from '../services'
import { declaredSchema, loginSchema, newPasswordSchema, otpSchema, profileSetupSchema, type DeclaredForm } from '../validation/schemas'
import type { VerificationDocument, VerificationStatus } from '../types'

/* ===================================================== 01 — Splash ======== */

function nextAfterSplash() {
  return useSession.getState().token ? 'dr-st-loading' : 'dr-welcome'
}

/** Live: a session continues if the Keychain's refresh token still works (or the server can't say). */
async function nextAfterSplashLive() {
  const state = await restoreSession()
  return state === 'signed-out' ? 'dr-welcome' : 'dr-st-loading'
}

export function SplashScreen() {
  const nav = useNav()
  React.useEffect(() => {
    if (isDevLaunch()) return
    if (LIVE) {
      let alive = true
      const started = Date.now()
      nextAfterSplashLive().then((next) => {
        setTimeout(() => alive && nav.resetTo(next), Math.max(0, 1600 - (Date.now() - started)))
      })
      return () => {
        alive = false
      }
    }
    const t = setTimeout(() => nav.resetTo(nextAfterSplash()), 1600)
    return () => clearTimeout(t)
  }, [nav])
  return (
    <Screen background="bg-white" padTop={false} padBottom={false}>
      <Btn
        onPress={() => nav.resetTo(nextAfterSplash())}
        className="relative  h-full w-full flex-col items-center justify-center bg-clinical"
      >
        <Div className="relative  flex-col items-center">
          <Logo variant="wordmark" width={206} className="animate-riseIn" />
          <Div className="mt-2 h-[24px]">
            <EcgLine animate width={250} height={24} stroke="#0068C8" />
          </Div>
          <P className="mt-1 text-[16px] font-semibold tracking-[-0.2px] text-vital-600">Your health in your hands</P>

          {/* The one mark that separates this build from the patient app */}
          <Span className="mt-6 inline-flex flex-row items-center gap-2 rounded-chip bg-ink-900 px-3.5 py-[7px]">
            <Stethoscope className="h-[13px] w-[13px] text-white" strokeWidth={2.3} />
            <Span className="text-[11.5px] font-bold uppercase tracking-[.14em] text-white">For Doctors</Span>
          </Span>
        </Div>

        <Div className="absolute inset-x-0  flex-col items-center" style={{ bottom: DEVICE.safeBottom + 28 }}>
          <P className="text-micro font-medium uppercase tracking-[.12em] text-ink-300">KDC Healthcare · India</P>
        </Div>
      </Btn>
    </Screen>
  )
}

/* ==================================================== 02 — Welcome ======== */

export function WelcomeScreen() {
  const nav = useNav()
  return (
    <Screen background="bg-white" padTop={false} padBottom={false}>
      <Div className="relative h-full w-full">
        <Div className="absolute inset-x-0 top-0 h-[430px] overflow-hidden">
          <Img src={DOCTOR_SCENE.welcome} alt="" className="h-full w-full object-cover" />
          <Div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(180deg, rgba(8,20,34,.46) 0%, rgba(8,20,34,.06) 42%, #fff 100%)' }}
          />
        </Div>

        <Div className="absolute inset-x-0 px-6" style={{ top: DEVICE.safeTop + 6 }}>
          <Logo variant="wordmark" width={78} className="drop-shadow-[0_1px_10px_rgba(255,255,255,.75)]" />
        </Div>

        <Div
          className="absolute inset-x-0 bottom-0  flex-col px-6"
          style={{ top: 382, paddingBottom: DEVICE.safeBottom + 16 }}
        >
          <P className="text-micro font-bold uppercase tracking-[.14em] text-brand-600">KDC+ for Doctors</P>
          <P className="mt-2.5 font-display text-[30px] font-extrabold leading-[35px] tracking-[-0.7px] text-ink-900">
            Care that starts with you.
          </P>
          <P className="mt-3 text-body-lg leading-[23px] text-ink-500">
            Connect with patients and provide trusted healthcare through KDC+.
          </P>

          <Div className="mt-6  grid-cols-3 gap-2.5">
            {[
              { v: '11.4k', l: 'Consultations' },
              { v: '4.9', l: 'Patient rating' },
              { v: '< 2 min', l: 'Avg. wait' },
            ].map((s) => (
              <Div key={s.l} className="rounded-tile bg-ink-50 px-3 py-3">
                <P className="font-display text-[18px] font-extrabold leading-none tabular-nums text-ink-900">{s.v}</P>
                <P className="mt-1.5 text-[10.5px] leading-[13px] text-ink-500">{s.l}</P>
              </Div>
            ))}
          </Div>

          <Div className="mt-auto pt-7">
            <Button onClick={() => nav.navigate('dr-login')}>Continue</Button>
            <P className="mt-3.5 text-center text-caption leading-[17px] text-ink-400">
              Only registered medical practitioners may create an account.
            </P>
          </Div>
        </Div>
      </Div>
    </Screen>
  )
}

/* ====================================================== 03 — Login ======== */

const DEMO_PASSWORD = 'Kdc@doctor'

export function LoginScreen() {
  const nav = useNav()
  const requestOtp = useSession((st) => st.requestOtp)
  const requestRecovery = useSession((st) => st.requestRecovery)
  // The demo signs in with a prefilled account; live builds start empty.
  const form = useZodForm(loginSchema, LIVE ? { mobile: '', password: '' } : { mobile: '98490 11204', password: DEMO_PASSWORD })
  const { field: mobile, fieldState: mobileState } = useController({ control: form.control, name: 'mobile' })
  const [showPassword, setShowPassword] = React.useState(false)
  const [recovering, setRecovering] = React.useState(false)

  const applyError = (e: unknown) => {
    if (e instanceof ServiceError && (e.field === 'mobile' || e.field === 'password')) {
      form.setError(e.field, { message: e.message })
    } else {
      form.setError('password', { message: e instanceof Error ? e.message : 'Something went wrong. Try again.' })
    }
  }

  const submit = form.handleSubmit(async (v) => {
    try {
      await requestOtp(v.mobile, v.password)
      nav.navigate('dr-otp')
    } catch (e) {
      applyError(e)
    }
  })

  const forgot = async () => {
    if (!(await form.trigger('mobile'))) return
    setRecovering(true)
    try {
      await requestRecovery(form.getValues('mobile'))
      nav.navigate('dr-otp')
    } catch (e) {
      applyError(e)
    } finally {
      setRecovering(false)
    }
  }

  return (
    <Screen background="bg-white" padBottom={false}>
      <Div className=" flex-1 flex-col px-6">
        <Div className="flex-row items-center justify-between pt-5">
          <Div className="flex-row items-center gap-2.5">
            <Logo variant="wordmark" width={74} />
            <Span className="rounded-[7px] bg-ink-900 px-2 py-[4px] text-[9.5px] font-bold uppercase tracking-[.12em] text-white">
              For Doctors
            </Span>
          </Div>
          <Btn
            onPress={() => nav.navigate('dr-support')}
            className="tap text-body-sm font-semibold text-brand-600"
          >
            Need help?
          </Btn>
        </Div>

        <StepBar step={1} total={4} className="mt-7" />

        <P className="mt-5 font-display text-[30px] font-extrabold leading-[35px] tracking-[-0.7px] text-ink-900">
          Welcome, Doctor
        </P>
        <P className="mt-2.5 text-body-lg leading-[23px] text-ink-500">
          Sign in with the mobile number registered against your medical council record.
        </P>

        <Div className="mt-7 gap-4">
          <Div>
            <P className="block text-body-sm font-semibold text-ink-600">Registered mobile number</P>
            <Div className="mt-2 flex-row h-[56px] items-center rounded-ctl bg-white px-4 ring-[1.5px] ring-inset  ring-brand-600">
              <Span className="mr-3 shrink-0 border-r border-ink-200 pr-3 font-display text-[16px] font-bold text-ink-900">
                +91
              </Span>
              <TextField
                inputMode="numeric"
                value={mobile.value}
                onChangeText={mobile.onChange}
                onBlur={mobile.onBlur}
                className="h-full min-w-0 flex-1 bg-transparent font-display text-[18px] font-bold tracking-[0.4px] text-ink-900 "
              />
            </Div>
            <FieldError message={mobileState.error?.message} />
          </Div>

          <FormInput
            control={form.control}
            name="password"
            label="Password"
            hint="Required when signing in on a new device."
            type={showPassword ? 'text' : 'password'}
            suffix={
              <Btn onPress={() => setShowPassword((v) => !v)} className="tap text-ink-400">
                <Eye className="h-[17px] w-[17px]" strokeWidth={2.1} />
              </Btn>
            }
          />

          <Div className="flex-row justify-end">
            <Btn
              onPress={forgot}
              disabled={recovering}
              className="tap text-body-sm font-semibold text-brand-600"
            >
              Forgot password?
            </Btn>
          </Div>

          <Button onClick={submit} loading={form.formState.isSubmitting}>
            Continue
          </Button>
        </Div>

        {/* There is no self-serve sign-up — say so, and say what it takes */}
        <Div className="mt-6 rounded-tile bg-ink-50 p-4">
          <Div className="flex-row items-start gap-3">
            <Stethoscope className="mt-[1px] h-[16px] w-[16px] shrink-0 text-ink-500" strokeWidth={2.1} />
            <Div className="min-w-0">
              <P className="text-body-sm font-bold text-ink-900">Not on KDC+ yet?</P>
              <P className="mt-0.5 text-body-sm leading-[19px] text-ink-600">
                Practitioner onboarding takes about 10 minutes and needs your medical council registration number and
                qualification certificates.
              </P>
              <Btn
                onPress={() => nav.navigate('dr-verification')}
                className="tap mt-2 text-body-sm font-bold text-brand-600"
              >
                Request practitioner access →
              </Btn>
            </Div>
          </Div>
        </Div>

        <Div className="mt-auto pb-4 pt-8" style={{ paddingBottom: 16 + solidBarInset() }}>
          <Div className="flex-row items-center justify-center gap-5">
            {[
              { Icon: ShieldCheck, label: 'Council verified' },
              { Icon: Lock, label: 'Encrypted' },
              { Icon: FileCheck2, label: 'Audit logged' },
            ].map((a) => (
              <Span key={a.label} className="flex-row items-center gap-1.5 text-caption font-medium text-ink-500">
                <a.Icon className="h-[13px] w-[13px] text-vital-600" strokeWidth={2.3} />
                {a.label}
              </Span>
            ))}
          </Div>
          <P className="mt-4 px-2 text-center text-caption leading-[17px] text-ink-400">
            Access to patient records is logged against your registration. By continuing you agree to the KDC+{' '}
            <Span className="font-semibold text-ink-600">Practitioner Agreement</Span>.
          </P>
        </Div>
      </Div>
    </Screen>
  )
}

/* ======================================================== 04 — OTP ======== */

function maskedMobile(mobile: string) {
  return `+91 ${mobile.slice(0, 5)} •••• ${mobile.slice(-2)}`
}

const RESEND_SECONDS = 19

export function OtpScreen() {
  const nav = useNav()
  const otpMobile = useSession((st) => st.otpMobile)
  const verifyOtp = useSession((st) => st.verifyOtp)
  const resendOtp = useSession((st) => st.resendOtp)
  const resetPassword = useSession((st) => st.resetPassword)
  const otpMode = useSession((st) => st.otpMode)
  // Live recovery (and an invited doctor's first password): the code sets a new password.
  const settingPassword = LIVE && otpMode === 'recovery'
  const passwordForm = useZodForm(newPasswordSchema, { newPassword: '' })
  const profile = useDoctor((st) => st.profile)
  const form = useZodForm(otpSchema, { code: LIVE ? '' : '7294' })
  const { field: code, fieldState: codeState } = useController({ control: form.control, name: 'code' })
  const [remaining, setRemaining] = React.useState(RESEND_SECONDS)

  React.useEffect(() => {
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  const resend = async () => {
    await resendOtp()
    setRemaining(RESEND_SECONDS)
    showToast('Code resent', 'info')
  }

  const submit = form.handleSubmit(async (v) => {
    if (settingPassword) {
      const ok = await passwordForm.trigger()
      if (!ok) return
      try {
        await resetPassword(v.code, passwordForm.getValues('newPassword'))
        showToast('Password saved. Sign in with your new password.', 'success')
        nav.resetTo('dr-login')
      } catch (e) {
        if (e instanceof ServiceError && e.field === 'newPassword') passwordForm.setError('newPassword', { message: e.message })
        else form.setError('code', { message: e instanceof Error ? e.message : 'Something went wrong. Try again.' })
      }
      return
    }
    try {
      await verifyOtp(v.code)
      // Live: the loading screen fetches the profile, then routes by verification status.
      nav.resetTo(LIVE || useVerification.getState().status === 'approved' ? 'dr-st-loading' : 'dr-verification')
    } catch (e) {
      form.setError('code', { message: e instanceof Error ? e.message : 'Something went wrong. Try again.' })
    }
  })

  return (
    <Screen background="bg-white">
      <Div className=" flex-1 flex-col px-6">
        <Btn
          onPress={nav.back}
          className="tap -ml-1 mt-2 flex-col h-[38px] w-[38px] items-center justify-center rounded-full bg-ink-50"
        >
          <ChevronRight className="h-[20px] w-[20px] rotate-180 text-ink-700" strokeWidth={2.4} />
        </Btn>

        <StepBar step={2} total={4} className="mt-6" />

        <P className="mt-5 font-display text-[29px] font-extrabold leading-[34px] tracking-[-0.7px] text-ink-900">
          Verification code
        </P>
        <P className="mt-2.5 text-body-lg leading-[23px] text-ink-500">
          Sent to <Span className="font-semibold text-ink-900">{otpMobile ? maskedMobile(otpMobile) : profile.mobileMasked}</Span>
        </P>
        <Btn onPress={nav.back} className="tap mt-2 self-start text-body-sm font-bold text-brand-600">
          Change number
        </Btn>

        <Div className="mt-8">
          <OtpInput
            value={code.value}
            error={Boolean(codeState.error)}
            onChange={(v) => {
              code.onChange(v)
              if (codeState.error) form.clearErrors('code')
            }}
          />
          <FieldError message={codeState.error?.message} />
        </Div>

        {settingPassword ? (
          <Div className="mt-5">
            <FormInput control={passwordForm.control} name="newPassword" label="New password" hint="At least 8 characters. Avoid your mobile number." type="password" />
          </Div>
        ) : null}

        <Div className="mt-5 flex-row items-center justify-between">
          <Span className="text-body-sm text-ink-400">
            Resend in <Span className="font-bold tabular-nums text-ink-800">{`00:${String(remaining).padStart(2, '0')}`}</Span>
          </Span>
          <Btn
            onPress={resend}
            className={`text-body-sm font-bold ${remaining > 0 ? 'text-ink-300' : 'text-brand-600'}`}
            disabled={remaining > 0}
          >
            Resend
          </Btn>
        </Div>

        <Div className="mt-7">
          <Button onClick={submit} loading={form.formState.isSubmitting}>
            {settingPassword ? 'Save password' : 'Verify & Continue'}
          </Button>
        </Div>

        <Div className="mt-6 flex-row items-start gap-2.5 rounded-tile bg-brand-50 p-3.5">
          <ShieldCheck className="mt-[1px] h-[16px] w-[16px] shrink-0 text-brand-600" strokeWidth={2.2} />
          <P className="text-body-sm leading-[19px] text-brand-700">
            KDC+ will never ask for this code. Sharing it gives access to patient records held under your registration.
          </P>
        </Div>
      </Div>
    </Screen>
  )
}

/* =============================================== 05 — Verification ======== */

const DOC_STATE = {
  verified: { label: 'Verified', tone: 'success' as const },
  review: { label: 'In review', tone: 'caution' as const },
  missing: { label: 'Required', tone: 'critical' as const },
  rejected: { label: 'Rejected', tone: 'critical' as const },
}

const STATUS_CARD: Record<
  VerificationStatus,
  { title: string; iconWrap: string; Icon: React.ComponentType<any>; iconClass: string; bar: string }
> = {
  pending: {
    title: 'Verification pending',
    iconWrap: 'bg-caution-600/20 ring-1 ring-inset ring-caution-500/30',
    Icon: Clock,
    iconClass: 'text-caution-200',
    bar: 'bg-caution-500',
  },
  approved: {
    title: 'Verification complete',
    iconWrap: 'bg-vital-600/20 border  border-vital-500/30',
    Icon: Check,
    iconClass: 'text-vital-200',
    bar: 'bg-vital-500',
  },
  rejected: {
    title: 'Verification rejected',
    iconWrap: 'bg-critical-600/20 border  border-critical-500/30',
    Icon: CircleAlert,
    iconClass: 'text-critical-200',
    bar: 'bg-critical-500',
  },
}

const NEXT_STATUS: Record<VerificationStatus, VerificationStatus> = { pending: 'approved', approved: 'rejected', rejected: 'pending' }

export function VerificationScreen() {
  const nav = useNav()
  const status = useVerification((st) => st.status)
  const submitted = useVerification((st) => st.submitted)
  const expected = useVerification((st) => st.expected)
  const rejectionReason = useVerification((st) => st.rejectionReason)
  const declared = useVerification((st) => st.declared)
  const documents = useVerification((st) => st.documents)
  const uploadError = useVerification((st) => st.uploadError)
  const upload = useVerification((st) => st.upload)
  const removeDocument = useVerification((st) => st.removeDocument)
  const setStatus = useVerification((st) => st.setStatus)
  const resubmit = useVerification((st) => st.resubmit)
  // Live: the server's stage, and whether the application can be sent now.
  const serverStatus = useVerification((st) => st.serverStatus)
  const canSubmit = useVerification((st) => st.canSubmit)
  const [denied, setDenied] = React.useState(false)
  const [editingDetails, setEditingDetails] = React.useState(false)
  const [resubmitting, setResubmitting] = React.useState(false)

  const done = documents.filter((d) => d.state === 'verified').length
  const missing = documents.filter((d) => d.state === 'missing' || d.state === 'rejected').length
  const card = STATUS_CARD[status]

  const pick = async (doc: VerificationDocument) => {
    const res = await pickDocument()
    if (res.status === 'picked') {
      setDenied(false)
      await upload(doc.id, res.file)
    } else if (res.status === 'denied') {
      setDenied(true)
    } else if (res.status === 'error') {
      showToast('Could not open the photo', 'critical', res.message)
    }
  }

  const [incomplete, setIncomplete] = React.useState<string[] | null>(null)
  /** Where each of the server's "not complete" items is filled in. */
  const fixFor = (item: string): { label: string; go: () => void } | null => {
    if (/qualification/i.test(item)) return { label: 'Add qualification', go: () => nav.navigate('dr-professional-info') }
    if (/consultation type|fee/i.test(item)) return { label: 'Set fees', go: () => nav.navigate('dr-fees') }
    if (/registration|council|specialt|experience|declar|name/i.test(item)) return { label: 'Edit details', go: () => editDetails() }
    return null
  }
  const submitForReview = async () => {
    if (missing > 0) {
      showToast(`${missing} document${missing > 1 ? 's' : ''} still required`, 'critical')
      return
    }
    setResubmitting(true)
    try {
      await resubmit()
      showToast(LIVE && serverStatus === 'draft' ? 'Submitted for review' : 'Resubmitted for review')
    } catch (e) {
      // Live: the server says what's still missing; each item links to where it's filled in.
      if (e instanceof ServiceError && e.field === 'application') setIncomplete(e.details)
      else showToast('Couldn’t submit', 'critical', e instanceof Error ? e.message : undefined)
    } finally {
      setResubmitting(false)
    }
  }

  const editDetails = () => {
    if (status === 'approved') showToast('Registration is locked', 'info', 'Contact support to change verified details.')
    else setEditingDetails(true)
  }

  const statusBody = () => {
    if (LIVE && serverStatus === 'draft') return 'Not submitted yet. Add your documents, check your details, then submit for review.'
    if (status === 'approved') return 'Your documents are verified. Consultations are now bookable by patients.'
    if (status === 'rejected') return rejectionReason
    return `Submitted ${submitted}. Our medical review team usually responds ${expected}.`
  }

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Professional verification" />

      <Div className="flex-1 gap-3 px-5 pb-[130px] pt-4">
        <StepBar step={3} total={4} />
        {/* Long-press switches status; the demo has no reviewer to change it. */}
        <Div
          className="overflow-hidden rounded-tile bg-ink-900 p-4 shadow-card"
          onPress={() => undefined}
          onLongPress={() => setStatus(NEXT_STATUS[status])}
        >
          <Div className="flex-row items-start gap-3.5">
            <Span className={`flex-col h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[13px] ${card.iconWrap}`}>
              <card.Icon className={`h-[19px] w-[19px] ${card.iconClass}`} strokeWidth={2.2} />
            </Span>
            <Div className="min-w-0 flex-1">
              <P className="text-title-sm text-white">{card.title}</P>
              <P className="mt-1 text-body-sm leading-[19px] text-white/60">{statusBody()}</P>
            </Div>
          </Div>
          <Div className="mt-4">
            <Div className="h-[5px] w-full overflow-hidden rounded-full bg-white/15">
              <Div className={`h-full rounded-full ${card.bar}`} style={{ width: `${(done / documents.length) * 100}%` }} />
            </Div>
            <P className="mt-2 text-caption text-white/55">
              {done} of {documents.length} documents verified
            </P>
          </Div>
        </Div>

        {/* Tapping the card opens the declaration form */}
        <Div className="tap" onPress={editDetails}>
          <Card elevation="tile">
            <P className="mb-2 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Declared details</P>
            <KeyValue label="Name" value={declared.name} />
            <KeyValue label="Registration no." value={declared.regNo} />
            <KeyValue label="Council" value={declared.council} />
            <KeyValue label="Specialization" value={declared.specialization} />
            <KeyValue label="Qualification" value={declared.qualification} />
            <KeyValue label="Experience" value={declared.experience ? experienceLabel(declared.experience) : '—'} />
          </Card>
        </Div>

        {/* Documents */}
        <Div>
          <SectionHeader title="Documents" className="!px-0 pb-2.5" />
          <Div className="gap-2">
            {documents.map((d) => {
              const st = DOC_STATE[d.state]
              const uploading = d.progress !== undefined
              const needsFile = d.state === 'missing' || d.state === 'rejected'
              return (
                <Div key={d.id} className="flex-row items-center gap-3.5 rounded-tile bg-white p-3.5 shadow-tile">
                  <Span
                    className={`flex-col h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] ${
                      needsFile ? 'bg-critical-50' : 'bg-ink-50'
                    }`}
                  >
                    {needsFile ? (
                      <Upload className="h-[16px] w-[16px] text-critical-600" strokeWidth={2.2} />
                    ) : (
                      <FileCheck2 className="h-[16px] w-[16px] text-ink-500" strokeWidth={2.2} />
                    )}
                  </Span>
                  <Div className="min-w-0 flex-1">
                    <P className="truncate text-body-lg font-semibold text-ink-900">{d.label}</P>
                    {uploading ? (
                      <Div className="mt-1.5">
                        <ProgressBar pct={d.progress ?? 0} />
                        <P className="mt-1 text-caption tabular-nums text-ink-400">Uploading · {d.progress}%</P>
                      </Div>
                    ) : uploadError?.id === d.id ? (
                      <P className="truncate text-caption text-critical-600">{uploadError.message}</P>
                    ) : (
                      <P className="truncate text-caption text-ink-400">{d.file ? `${d.file} · ${d.size}` : 'Not uploaded yet'}</P>
                    )}
                  </Div>
                  {uploading ? null : needsFile ? (
                    <Button size="sm" block={false} className="px-3.5" onClick={() => pick(d)}>
                      {d.state === 'rejected' ? 'Replace' : 'Upload'}
                    </Button>
                  ) : (
                    <Div className="flex-row shrink-0 items-center gap-2">
                      <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                      {d.userUploaded && (
                        <IconButton size={28} label={`Remove ${d.label}`} onClick={() => removeDocument(d.id)}>
                          <X className="h-[13px] w-[13px] text-ink-500" strokeWidth={2.6} />
                        </IconButton>
                      )}
                    </Div>
                  )}
                </Div>
              )
            })}
          </Div>
        </Div>

        {denied && (
          <Banner
            tone="critical"
            icon={<CircleAlert className="h-[16px] w-[16px]" strokeWidth={2.2} />}
            title="Photo access is off"
            body="Allow KDC+ to use your photos in Settings to upload documents."
            action="Open Settings"
            onAction={() => Linking.openSettings()}
          />
        )}

        <Banner
          tone="brand"
          icon={<ShieldCheck className="h-[16px] w-[16px]" strokeWidth={2.2} />}
          title="You can set up your profile meanwhile"
          body="Consultations become bookable only once verification is complete."
        />
      </Div>

      <StickyBar>
        <Div className="gap-2.5">
          {(LIVE ? canSubmit : status === 'rejected') ? (
            <Button onClick={submitForReview} loading={resubmitting}>
              {LIVE && serverStatus === 'draft' ? 'Submit for review' : 'Resubmit for review'}
            </Button>
          ) : (
            <Button onClick={() => nav.navigate('dr-profile-setup')}>Continue to profile</Button>
          )}
          <Button variant="text" onClick={() => nav.navigate('dr-support')}>
            Contact verification support
          </Button>
        </Div>
      </StickyBar>

      {editingDetails && <DeclaredDetailsSheet onClose={() => setEditingDetails(false)} />}

      {/* Live: what the server says is still missing before review, each with where to fill it in. */}
      <ModalSheet visible={incomplete !== null} title="Before you submit" subtitle="Your application needs:" onClose={() => setIncomplete(null)}>
        <Div className="gap-2.5 pb-2">
          {(incomplete ?? []).map((item) => {
            const fix = fixFor(item)
            return (
              <Div key={item} className="gap-2.5 rounded-tile bg-caution-50 p-3.5">
                <P className="text-body leading-[21px] text-ink-800">{item}</P>
                {fix && (
                  <Button
                    size="sm"
                    block={false}
                    className="self-start px-4"
                    variant="secondary"
                    onClick={() => {
                      setIncomplete(null)
                      fix.go()
                    }}
                  >
                    {fix.label}
                  </Button>
                )}
              </Div>
            )
          })}
        </Div>
      </ModalSheet>
    </Screen>
  )
}

/** Personal details, qualification and council registration, edited as one declaration. */
function DeclaredDetailsSheet({ onClose }: { onClose: () => void }) {
  const declared = useVerification((st) => st.declared)
  const saveDeclared = useVerification((st) => st.saveDeclared)
  const form = useZodForm(declaredSchema, {
    name: declared.name,
    regNo: declared.regNo,
    council: declared.council,
    specialization: declared.specialization,
    qualification: declared.qualification,
    experience: experienceLabel(declared.experience),
  })
  const submit = form.handleSubmit(async (v: DeclaredForm) => {
    try {
      await saveDeclared({ ...v, experience: parseInt(v.experience, 10) })
      onClose()
    } catch (e) {
      // Live: the server's message, under the field it names when it names one.
      const field = e instanceof ServiceError && e.field && e.field in v ? (e.field as keyof DeclaredForm) : 'name'
      form.setError(field, { message: e instanceof Error ? e.message : 'Could not save. Try again.' })
    }
  })
  return (
    <ModalSheet
      visible
      title="Declared details"
      subtitle="As printed on your council registration"
      onClose={onClose}
      footer={
        <Button onClick={submit} loading={form.formState.isSubmitting}>
          Save details
        </Button>
      }
    >
      <Div className="gap-3.5 pb-2">
        <FormInput control={form.control} name="name" label="Full name" required />
        <FormInput control={form.control} name="regNo" label="Registration number" required hint="e.g. TSMC/FMR/48219" autoCapitalize="characters" />
        <FormSelect control={form.control} name="council" label="Medical council" required options={COUNCILS} />
        <FormSelect control={form.control} name="specialization" label="Specialization" required options={SPECIALIZATIONS} />
        <FormInput control={form.control} name="qualification" label="Qualification" required />
        <FormSelect control={form.control} name="experience" label="Experience" required options={EXPERIENCE_OPTIONS} />
      </Div>
    </ModalSheet>
  )
}

/* ============================================== 06 — Profile setup ======== */

export function ProfileSetupScreen() {
  const nav = useNav()
  const profile = useDoctor((st) => st.profile)
  const saveProfile = useDoctor((st) => st.saveProfile)
  const hasSession = useSession((st) => Boolean(st.token))
  const [photo, setPhoto] = React.useState(profile.photo)
  const form = useZodForm(profileSetupSchema, {
    name: profile.name,
    qualification: profile.qualification,
    specialization: profile.specialization,
    experience: experienceLabel(profile.experience),
    subSpecialization: profile.subSpecialization,
    languages: profile.languages,
    clinic: profile.clinic,
    about: profile.about,
  })
  const { field: languages, fieldState: languagesState } = useController({ control: form.control, name: 'languages' })

  const changePhoto = async () => {
    const res = await pickDocument()
    if (res.status === 'picked') setPhoto(res.file.uri)
    else if (res.status === 'denied') showToast('Photo access is off', 'critical', 'Allow access in Settings to change your photo.')
    else if (res.status === 'error') showToast('Could not open the photo', 'critical', res.message)
  }

  const toggleLanguage = (l: string) =>
    languages.onChange(languages.value.includes(l) ? languages.value.filter((x: string) => x !== l) : [...languages.value, l])

  const submit = form.handleSubmit(async (v) => {
    await saveProfile({ ...v, experience: parseInt(v.experience, 10), photo })
    nav.resetTo(hasSession ? 'dr-home' : 'dr-login', 'home')
  })

  return (
    <Screen background="bg-white" padBottom={false}>
      <ScreenHeader title="Profile setup" />

      <Div className="flex-1 px-5 pb-[130px] pt-4">
        <StepBar step={4} total={4} className="mb-6" />

        <Div className=" flex-col items-center">
          <Div className="relative">
            <DoctorAvatar src={photo} name={profile.name} size={92} />
            <IconButton size={30} tone="brand" label="Change photo" onClick={changePhoto} className="absolute -bottom-1 -right-1 ring-[3px] ring-white">
              <Camera className="h-[14px] w-[14px]" strokeWidth={2.2} />
            </IconButton>
          </Div>
          <P className="mt-2.5 text-body-sm font-semibold text-brand-600">Update profile photo</P>
          <P className="mt-1 text-caption text-ink-400">Shown to patients when they book</P>
        </Div>

        <Div className="mt-7 gap-4">
          <FormInput control={form.control} name="name" label="Full name" required />

          <FormInput control={form.control} name="qualification" label="Qualification" required hint="As printed on your degree certificates." />

          <Div className=" grid-cols-2 gap-3">
            <FormSelect control={form.control} name="specialization" label="Specialization" required options={SPECIALIZATIONS} />
            <FormSelect control={form.control} name="experience" label="Experience" required options={EXPERIENCE_OPTIONS} />
          </Div>

          <FormSelect control={form.control} name="subSpecialization" label="Sub-specialization" options={SUB_SPECIALIZATIONS} />

          <Field label="Languages spoken" hint="Patients filter by language." error={languagesState.error?.message}>
            <Div className="flex-row flex-wrap gap-2">
              {LANGUAGES.map((l) => {
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
          </Field>

          <FormInput control={form.control} name="clinic" label="Hospital / clinic" required />

          <FormTextArea control={form.control} name="about" label="About" hint="Two or three sentences. Shown on your public profile." className="min-h-[120px]" />
        </Div>
      </Div>

      <StickyBar>
        <Button onClick={submit} loading={form.formState.isSubmitting} icon={<Check className="h-[18px] w-[18px]" strokeWidth={2.6} />}>
          Save Profile
        </Button>
      </StickyBar>
    </Screen>
  )
}

/* ========================================= 07 — Professional profile ====== */

export function ProfessionalProfileScreen() {
  const nav = useNav()
  const doctor = useDoctor((st) => st.profile)
  const qualifications = useDoctor((st) => st.qualifications)
  return (
    <Screen background="bg-canvas" padTop={false} padBottom={false}>
      <Div className=" h-full overflow-y-auto pb-[120px]">
        {/* Identity band — ink, not brand blue: this is a professional record */}
        <Div className="bg-ink-900 px-5 pb-6" style={{ paddingTop: DEVICE.safeTop + 10 }}>
          <Div className="flex-row items-center justify-between">
            <Btn
              onPress={nav.back}
              className="tap flex-col h-[36px] w-[36px] items-center justify-center rounded-full bg-white/10 ring-1 ring-inset  ring-white/15"
            >
              <ChevronRight className="h-[19px] w-[19px] rotate-180 text-white" strokeWidth={2.4} />
            </Btn>
            <Logo variant="wordmark" width={52} className="rounded-[6px] bg-white px-1.5 py-1" />
          </Div>

          <Div className="mt-5 flex-row items-center gap-4">
            <DoctorAvatar src={doctor.photo} name={doctor.name} size={78} ring />
            <Div className="min-w-0 flex-1">
              <Div className="flex-row items-center gap-1.5">
                <P className="truncate text-title-md text-white">{doctor.name}</P>
                <VerifiedDoctorBadge size={16} />
              </Div>
              <P className="mt-0.5 truncate text-body-sm text-white/70">{doctor.title}</P>
              <P className="truncate text-caption text-white/45">{doctor.qualification}</P>
            </Div>
          </Div>

          <Div className="mt-4 flex-row items-center gap-2">
            <Span className="rounded-[7px] bg-white/10 px-2.5 py-[5px] text-[11px] font-semibold text-white/85">
              {doctor.experience} yrs experience
            </Span>
            <Span className="rounded-[7px] bg-white/10 px-2.5 py-[5px] text-[11px] font-semibold text-white/85">
              {doctor.consults.toLocaleString('en-IN')} consults
            </Span>
            <Span className="rounded-[7px] bg-vital-600/20 px-2.5 py-[5px] text-[11px] font-semibold text-vital-200 ring-1 ring-inset  ring-vital-500/25">
              ★ {doctor.rating}
            </Span>
          </Div>
        </Div>

        <Div className="gap-3 px-5 pt-4">
          <Card elevation="tile">
            <P className="mb-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">About</P>
            <P className="text-body leading-[22px] text-ink-700">{doctor.about}</P>
          </Card>

          <Card elevation="tile">
            <P className="mb-3 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Qualifications</P>
            {qualifications.map((q, i) => (
              <Div key={q.degree}>
                {i > 0 && <Divider className="my-3" />}
                <Div className="flex-row gap-3">
                  <Span className="mt-[6px] h-[6px] w-[6px] shrink-0 rounded-full bg-brand-600" />
                  <Div className="min-w-0 flex-1">
                    <P className="text-body-lg font-semibold text-ink-900">{q.degree}</P>
                    <P className="mt-0.5 text-body-sm leading-[18px] text-ink-500">{q.org}</P>
                    <P className="mt-1 text-caption tabular-nums text-ink-400">{q.years}</P>
                  </Div>
                </Div>
              </Div>
            ))}
          </Card>

          <Card elevation="tile">
            <P className="mb-3 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Experience</P>
            {experienceHistory.map((e, i) => (
              <Div key={e.role}>
                {i > 0 && <Divider className="my-3" />}
                <Div className="flex-row gap-3">
                  <Award className="mt-[2px] h-[15px] w-[15px] shrink-0 text-ink-400" strokeWidth={2.1} />
                  <Div className="min-w-0 flex-1">
                    <P className="text-body-lg font-semibold text-ink-900">{e.role}</P>
                    <P className="mt-0.5 text-body-sm text-ink-500">{e.org}</P>
                    <P className="mt-1 text-caption tabular-nums text-ink-400">{e.years}</P>
                  </Div>
                </Div>
              </Div>
            ))}
          </Card>

          <Card elevation="tile">
            <P className="mb-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Clinic</P>
            <Div className="flex-row items-start gap-3">
              <Building2 className="mt-[2px] h-[16px] w-[16px] shrink-0 text-brand-600" strokeWidth={2.1} />
              <Div className="min-w-0">
                <P className="text-body-lg font-semibold text-ink-900">{doctor.clinic}</P>
                <P className="mt-0.5 text-body-sm leading-[18px] text-ink-500">{doctor.address}</P>
                <P className="mt-1.5 text-caption text-ink-400">{doctor.timings}</P>
              </Div>
            </Div>
            <Divider className="my-3" />
            <Div className="flex-row items-start gap-3">
              <Languages className="mt-[2px] h-[16px] w-[16px] shrink-0 text-brand-600" strokeWidth={2.1} />
              <P className="text-body-sm text-ink-600">Consults in {doctor.languages.join(', ')}</P>
            </Div>
          </Card>

          <Card elevation="tile">
            <P className="mb-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Consultation fees</P>
            <Div className=" grid-cols-3 gap-2.5">
              {(['video', 'audio', 'clinic'] as const).map((m) => {
                const { Icon, label } = MODE[m]
                return (
                  <Div key={m} className="rounded-[10px] bg-ink-50 p-3">
                    <Icon className="h-[15px] w-[15px] text-ink-500" strokeWidth={2.2} />
                    <P className="mt-2 text-[11px] font-semibold text-ink-500">{label}</P>
                    <P className="mt-0.5 text-title-sm tabular-nums text-ink-900">{rupee(doctor.fees[m])}</P>
                  </Div>
                )
              })}
            </Div>
          </Card>
        </Div>
      </Div>

      <StickyBar>
        <Button
          variant="tertiary"
          onClick={() => nav.navigate('dr-profile-setup')}
          icon={<Pencil className="h-[16px] w-[16px]" strokeWidth={2.2} />}
        >
          Edit Profile
        </Button>
      </StickyBar>
    </Screen>
  )
}
