import { Btn, Div, Img, P, Span } from '../components/primitives/index'
import React from 'react'
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  MessageSquare,
  PhoneOff,
  FlaskConical,
  UserRound,
  ShieldCheck,
  Check,
  Wifi,
  Camera,
  SignalHigh,
  ChevronRight,
  Pill,
  CalendarClock,
  ClipboardList,
  Plus,
  Sparkles,
  AlertTriangle,
} from '../components/primitives/icons'
import { Screen, DEVICE } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/Nav'
import { Button, IconButton, StickyBar } from '../components/ui/Button'
import { Input } from '../components/ui/Inputs'
import { Card, MetaChip, ProgressBar } from '../components/ui/Display'
import { ModalSheet } from '../components/ui/Feedback'
import { ClinicalSection, MODE, PatientAvatar, PatientMeta } from '../components/doctor/index'
import { consultationDraft } from '../mock-data/mock'
import { AUDIO_DEFAULT_APPT_ID, DEFAULT_APPT_ID } from '../mock-data/seed'
import { useNav } from '../navigation/navigation'
import { useController } from 'react-hook-form'
import { z } from 'zod'
import { FieldError, FormInput, FormTextArea, useZodForm } from '../components/ui/Form'
import { useCallClock } from '../hooks/useCallClock'
import { useConsultation } from '../store/consultation'
import { LIVE } from '../services/config'
import { loadNotes } from '../services/live/flows-records'
import { useCurrentAppointment } from '../store/context'
import { useDoctor } from '../store/doctor'
import { beginConsultation, ensureRxDraft, selectPatient } from '../store/flows'
import { usePrescriptions } from '../store/prescriptions'
import { useRecords } from '../store/records'
import { useSelection } from '../store/selection'
import { clock } from '../utils/date'
import { notesDraftSchema, notesFinalSchema, type NotesForm } from '../validation/schemas'
import { showToast } from '../store/toast'

/* ============================================= 20 — Pre-consultation ===== */

export function WaitingRoomScreen() {
  const nav = useNav()
  const appt = useCurrentAppointment(DEFAULT_APPT_ID)
  const patient = useRecords((st) => st.patientById(appt.patientId))
  const doctor = useDoctor((st) => st.profile)
  const mic = useConsultation((st) => st.mic)
  const camera = useConsultation((st) => st.camera)
  const toggleMic = useConsultation((st) => st.toggleMic)
  const toggleCamera = useConsultation((st) => st.toggleCamera)
  const checks = [
    { Icon: Camera, label: 'Camera', detail: 'FaceTime HD · 1080p', status: 'Ready' },
    { Icon: Mic, label: 'Microphone', detail: 'Input level good', status: 'Ready' },
    { Icon: Wifi, label: 'Internet', detail: '48 Mbps · Wi-Fi', status: 'Strong' },
  ]

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Waiting room" subtitle={appt.id} />

      <Div className="flex-1 px-5 pb-[130px] pt-4">
        {/* Patient status — the thing the doctor checks first */}
        <Div className="overflow-hidden rounded-tile bg-white shadow-card ring-[1.5px] ring-inset  ring-vital-200">
          <Div className="flex-row items-center gap-3.5 p-4">
            <Div className="relative">
              <PatientAvatar patient={patient} size={52} />
              <Span className="absolute -bottom-0.5 -right-0.5 h-[14px] w-[14px] rounded-full bg-vital-600 ring-[2.5px] ring-white" />
            </Div>
            <Div className="min-w-0 flex-1">
              <Div className="flex-row items-baseline justify-between gap-3">
                <P className="min-w-0 truncate text-title-sm text-ink-900">{patient.name}</P>
                <P className="shrink-0 text-title-sm tabular-nums text-ink-900">{appt.time}</P>
              </Div>
              <PatientMeta patient={patient} extra={appt.isFollowUp ? 'Follow-up' : 'New visit'} />
              <P className="mt-1 text-caption font-bold text-vital-700">Joined · waiting 4 min</P>
            </Div>
          </Div>
          <Div className="border-t border-ink-100 bg-ink-50/60 px-4 py-2.5">
            <P className="line-clamp-2 text-body-sm leading-[18px] text-ink-600">
              <Span className="font-semibold text-ink-900">Reason:</Span> {appt.reason}
            </P>
          </Div>
        </Div>

        {/* Self preview */}
        <Div className="relative mt-3 overflow-hidden rounded-tile bg-ink-900" style={{ height: 172 }}>
          {camera && (
            <Img
              src={doctor.photo}
              alt=""
              className="h-full w-full object-cover"
              style={{ objectPosition: 'center 22%' }}
            />
          )}
          <Div className="absolute inset-0 bg-gradient-to-t from-ink-900/70 via-transparent to-ink-900/20" />
          <Div className="absolute left-3 top-3 flex-row items-center gap-1.5 rounded-chip bg-black/35 px-2.5 py-1.5 ">
            <Span className="h-[6px] w-[6px] rounded-full bg-vital-500" />
            <Span className="text-caption font-semibold text-white">Your camera</Span>
          </Div>
          <Div className="absolute inset-x-3 bottom-3 flex-row items-center gap-2">
            <IconButton size={36} tone={mic ? 'glass' : 'glassActive'} label="Mute" onClick={toggleMic}>
              {mic ? <Mic className="h-[15px] w-[15px]" strokeWidth={2.2} /> : <MicOff className="h-[15px] w-[15px]" strokeWidth={2.2} />}
            </IconButton>
            <IconButton size={36} tone={camera ? 'glass' : 'glassActive'} label="Camera" onClick={toggleCamera}>
              {camera ? <Video className="h-[15px] w-[15px]" strokeWidth={2.2} /> : <VideoOff className="h-[15px] w-[15px]" strokeWidth={2.2} />}
            </IconButton>
            <Div className="ml-auto flex-row items-end gap-[3px]">
              {[6, 10, 14, 9, 5].map((h, i) => (
                <Span key={i} className="w-[3px] rounded-full bg-vital-500" style={{ height: h }} />
              ))}
            </Div>
          </Div>
        </Div>

        {/* Device checks */}
        <Card elevation="tile" padded={false} className="mt-3 overflow-hidden">
          {checks.map((c, i, arr) => (
            <Div key={c.label} className={`flex-row items-center gap-3.5 px-4 py-3 ${i < arr.length - 1 ? 'border-b-[0.5px] border-ink-900/10' : ''}`}>
              <Span className="flex-col h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-vital-50">
                <c.Icon className="h-[16px] w-[16px] text-vital-600" strokeWidth={2.1} />
              </Span>
              <Div className="min-w-0 flex-1">
                <P className="text-body-lg font-semibold text-ink-900">{c.label}</P>
                <P className="truncate text-caption text-ink-400">{c.detail}</P>
              </Div>
              <Span className="flex-row shrink-0 items-center gap-1.5 text-body-sm font-bold text-vital-700">
                <Check className="h-[14px] w-[14px]" strokeWidth={3} />
                {c.status}
              </Span>
            </Div>
          ))}
        </Card>

        <Div className="mt-3 flex-row items-start gap-2.5 rounded-tile bg-brand-50 p-3.5">
          <ShieldCheck className="mt-[1px] h-[16px] w-[16px] shrink-0 text-brand-600" strokeWidth={2.2} />
          <P className="text-body-sm leading-[19px] text-brand-700">
            End-to-end encrypted. Consultations are not recorded unless both you and the patient consent.
          </P>
        </Div>
      </Div>

      <StickyBar>
        <Button variant="success" onClick={() => nav.navigate(beginConsultation(appt.id))} icon={<Video className="h-[18px] w-[18px]" strokeWidth={2.2} />}>
          Start Consultation
        </Button>
      </StickyBar>
    </Screen>
  )
}

/* ============================================ 21 — Video consultation ==== */

function ChatSheet({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = React.useState<string[]>([])
  const [draft, setDraft] = React.useState('')
  const send = () => {
    if (!draft.trim()) return
    setMessages((m) => [...m, draft.trim()])
    setDraft('')
  }
  return (
    <ModalSheet visible title="Chat with patient" subtitle="Saved to the consultation record" onClose={onClose}>
      <Div className="gap-2 pb-2">
        {messages.length === 0 && <P className="py-2 text-body text-ink-400">Share links or instructions without interrupting the call.</P>}
        {messages.map((m, i) => (
          <Div key={i} className="self-end rounded-tile bg-brand-600 px-3.5 py-2.5 max-w-[84%]">
            <P className="text-body text-white">{m}</P>
          </Div>
        ))}
        <Div className="mt-1 flex-row items-center gap-2.5">
          <Div className="min-w-0 flex-1">
            <Input placeholder="Type a message" value={draft} onChangeText={setDraft} className="!h-[44px]" />
          </Div>
          <IconButton size={44} tone="brand" label="Send" onClick={send}>
            <MessageSquare className="h-[17px] w-[17px]" strokeWidth={2.2} />
          </IconButton>
        </Div>
      </Div>
    </ModalSheet>
  )
}

export function VideoCallScreen() {
  const nav = useNav()
  const appt = useCurrentAppointment(DEFAULT_APPT_ID)
  const patient = useRecords((st) => st.patientById(appt.patientId))
  const doctor = useDoctor((st) => st.profile)
  const mic = useConsultation((st) => st.mic)
  const camera = useConsultation((st) => st.camera)
  const speaker = useConsultation((st) => st.speaker)
  const toggleMic = useConsultation((st) => st.toggleMic)
  const toggleCamera = useConsultation((st) => st.toggleCamera)
  const toggleSpeaker = useConsultation((st) => st.toggleSpeaker)
  const endCall = useConsultation((st) => st.endCall)
  const seconds = useCallClock(appt.id, 372)
  const [chatOpen, setChatOpen] = React.useState(false)
  const openPanel = (screen: string) => {
    selectPatient(patient.id)
    useSelection.getState().select({ apptId: appt.id, rxKey: appt.id })
    if (screen === 'dr-rx-create') ensureRxDraft(appt.id)
    nav.navigate(screen)
  }
  const end = () => {
    endCall()
    nav.navigate('dr-workspace')
  }
  const panel = [
    { Icon: UserRound, label: 'Patient', screen: 'dr-patient-profile' },
    { Icon: ClipboardList, label: 'Notes', screen: 'dr-notes' },
    { Icon: Pill, label: 'Prescribe', screen: 'dr-rx-create' },
    { Icon: FlaskConical, label: 'Reports', screen: 'dr-reports' },
  ]

  return (
    <Screen background="bg-black" padTop={false} padBottom={false}>
      <Div className="relative h-full w-full">
        {/* Patient stream */}
        <Img
          src={patient.photo}
          alt={patient.name}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: 'center 26%' }}
        />
        <Div
          className="absolute inset-x-0 top-0 h-[230px]"
          style={{ background: 'linear-gradient(180deg, rgba(5,12,20,.84) 0%, rgba(5,12,20,.42) 46%, rgba(5,12,20,0) 100%)' }}
        />
        <Div
          className="absolute inset-x-0 bottom-0 h-[330px]"
          style={{ background: 'linear-gradient(0deg, rgba(5,12,20,.93) 0%, rgba(5,12,20,.66) 38%, rgba(5,12,20,0) 100%)' }}
        />

        {/* Top chrome — patient identity, because the doctor needs it, not branding */}
        <Div className="absolute inset-x-0 px-5" style={{ top: DEVICE.safeTop + 2 }}>
          <Div className="flex-row items-start justify-between gap-3">
            <Div className="min-w-0">
              <P className="truncate text-title-sm text-white">{patient.name}</P>
              <P className="truncate text-body-sm text-white/75">
                {patient.age} yrs · {patient.gender === 'Male' ? 'M' : 'F'} · {patient.blood}
              </P>
            </Div>
            <Div className="flex-row shrink-0 items-center gap-2">
              <Span className="flex-row items-center gap-1.5 rounded-chip bg-black/35 px-2.5 py-1.5 ">
                <SignalHigh className="h-[13px] w-[13px] text-vital-500" strokeWidth={2.6} />
                <Span className="text-caption font-semibold text-white">HD</Span>
              </Span>
              <Span className="flex-row items-center gap-1.5 rounded-chip bg-black/35 px-2.5 py-1.5 tabular-nums ">
                <Span className="h-[6px] w-[6px] rounded-full bg-critical-500" />
                <Span className="text-caption font-bold text-white">{clock(seconds)}</Span>
              </Span>
            </Div>
          </Div>

          {/* Allergy banner stays visible for the whole call */}
          {patient.allergies.length > 0 && (
            <Div className="mt-2.5 inline-flex flex-row items-center gap-1.5 rounded-chip bg-critical-600/25 px-2.5 py-1.5 ring-1 ring-inset  ring-critical-500/40 ">
              <AlertTriangle className="h-[12px] w-[12px] text-critical-200" strokeWidth={2.6} />
              <Span className="text-[10.5px] font-bold text-critical-100">
                Allergy · {patient.allergies.join(', ')}
              </Span>
            </Div>
          )}
        </Div>

        {/* Doctor self-view */}
        <Div
          className="absolute right-4 overflow-hidden rounded-[16px] shadow-lift border border-white/20"
          style={{ top: DEVICE.safeTop + 92, width: 94, height: 130 }}
        >
          {camera ? (
            <Img src={doctor.photo} alt="" className="h-full w-full object-cover" style={{ objectPosition: 'center 20%' }} />
          ) : (
            <Div className="h-full w-full flex-col items-center justify-center bg-ink-800">
              <VideoOff className="h-[20px] w-[20px] text-white/60" strokeWidth={2.1} />
            </Div>
          )}
          <Div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4">
            <Span className="text-[10px] font-semibold text-white">You</Span>
          </Div>
        </Div>

        {/* Clinical panel — peeks, expands on drag */}
        <Div className="absolute inset-x-0" style={{ bottom: DEVICE.safeBottom + 96 }}>
          <Div className="mx-4 rounded-[18px] bg-white/12 p-1 ring-1 ring-inset  ring-white/16 ">
            <Div className="flex-row justify-center pb-1 pt-1">
              <Span className="h-[3.5px] w-[32px] rounded-full bg-white/40" />
            </Div>
            <Div className=" grid-cols-4 gap-1 pb-1">
              {panel.map((a) => (
                <Btn
                  key={a.label}
                  onPress={() => openPanel(a.screen)}
                  className="tap  flex-col items-center gap-1.5 rounded-[13px] py-2.5  active:bg-white/15"
                >
                  <a.Icon className="h-[18px] w-[18px] text-white" strokeWidth={2.1} />
                  <Span className="text-[10.5px] font-semibold leading-none text-white">{a.label}</Span>
                </Btn>
              ))}
            </Div>
          </Div>
        </Div>

        {/* Call controls */}
        <Div className="absolute inset-x-0 px-5" style={{ bottom: DEVICE.safeBottom + 14 }}>
          <Div className="flex-row items-center justify-between rounded-[24px] bg-white/10 p-2 ring-1 ring-inset  ring-white/14 ">
            <IconButton size={48} tone={mic ? 'glass' : 'glassActive'} label="Mute" onClick={toggleMic}>
              {mic ? <Mic className="h-[20px] w-[20px]" strokeWidth={2.1} /> : <MicOff className="h-[20px] w-[20px]" strokeWidth={2.1} />}
            </IconButton>
            <IconButton size={48} tone={camera ? 'glass' : 'glassActive'} label="Camera" onClick={toggleCamera}>
              {camera ? <Video className="h-[20px] w-[20px]" strokeWidth={2.1} /> : <VideoOff className="h-[20px] w-[20px]" strokeWidth={2.1} />}
            </IconButton>
            <IconButton size={48} tone={speaker ? 'glassActive' : 'glass'} label="Speaker" onClick={toggleSpeaker}>
              <Volume2 className="h-[20px] w-[20px]" strokeWidth={2.1} />
            </IconButton>
            <IconButton size={48} tone="glass" label="Chat" onClick={() => setChatOpen(true)}>
              <MessageSquare className="h-[19px] w-[19px]" strokeWidth={2.1} />
            </IconButton>
            {/* Long-press rehearses a dropped connection. */}
            <IconButton size={48} tone="danger" label="End consultation" onClick={end} onLongPress={() => nav.navigate('dr-st-video-lost')}>
              <PhoneOff className="h-[20px] w-[20px]" strokeWidth={2.2} />
            </IconButton>
          </Div>
        </Div>
      </Div>
      {chatOpen && <ChatSheet onClose={() => setChatOpen(false)} />}
    </Screen>
  )
}

/* ============================================ 22 — Audio consultation ==== */

export function AudioCallScreen() {
  const nav = useNav()
  const a = useCurrentAppointment(AUDIO_DEFAULT_APPT_ID)
  const p = useRecords((st) => st.patientById(a.patientId))
  const mic = useConsultation((st) => st.mic)
  const speaker = useConsultation((st) => st.speaker)
  const toggleMic = useConsultation((st) => st.toggleMic)
  const toggleSpeaker = useConsultation((st) => st.toggleSpeaker)
  const endCall = useConsultation((st) => st.endCall)
  const seconds = useCallClock(a.id, 276)
  const end = () => {
    endCall()
    nav.navigate('dr-workspace')
  }

  return (
    <Screen background="bg-ink-900" padTop={false} padBottom={false}>
      <Div className="relative  h-full w-full flex-col items-center">
        <Div className="relative flex-row w-full items-center justify-between px-5" style={{ marginTop: DEVICE.safeTop + 4 }}>
          <Span className="flex-row items-center gap-1.5 rounded-chip bg-white/10 px-2.5 py-1.5 ring-1 ring-inset  ring-white/15">
            <ShieldCheck className="h-[12px] w-[12px] text-vital-300" strokeWidth={2.5} />
            <Span className="text-[10.5px] font-semibold text-white/90">Encrypted</Span>
          </Span>
          <Span className="rounded-chip bg-white/10 px-2.5 py-1.5 text-[10.5px] font-semibold tabular-nums text-white/75">
            {a.id}
          </Span>
        </Div>

        {/* Caller */}
        <Div className="relative mt-[56px]  flex-col items-center px-8">
          <Div className="relative flex-col items-center justify-center">
            <Span className="absolute h-[180px] w-[180px] animate-pulseRing rounded-full bg-white/12" />
            <Span className="absolute h-[180px] w-[180px] animate-pulseRing rounded-full bg-white/12 [animation-delay:1.1s]" />
            <PatientAvatar patient={p} size={146} className="relative !rounded-[48px] shadow-lift" />
          </Div>

          <P className="mt-7 text-title-lg text-white">{p.name}</P>
          <P className="mt-1 text-body-lg text-white/60">
            {p.age} yrs · {p.gender} · {MODE[a.mode].full}
          </P>

          <Div className="mt-6 flex-row items-center gap-2.5 rounded-chip bg-white/10 px-4 py-2.5 ring-1 ring-inset  ring-white/14">
            <Span className="h-[7px] w-[7px] rounded-full bg-vital-400" />
            <Span className="font-display text-[19px] font-bold tabular-nums tracking-[-0.2px] text-white">{clock(seconds)}</Span>
          </Div>

          <Div className="mt-3.5 flex-row items-center gap-2 text-body-sm text-white/50">
            <SignalHigh className="h-[14px] w-[14px] text-vital-400" strokeWidth={2.4} />
            Connection stable · HD voice
          </Div>
        </Div>

        {/* Reason stays on screen — the doctor is listening, not reading a record */}
        <Div className="mt-7 w-full px-6">
          <Div className="rounded-tile bg-white/8 p-3.5 ring-1 ring-inset  ring-white/12">
            <P className="text-[10px] font-bold uppercase tracking-[.1em] text-white/45">Reason</P>
            <P className="mt-1.5 text-body leading-[21px] text-white/85">{a.reason}</P>
          </Div>
        </Div>

        <Div className="mt-auto flex-row h-[40px] items-end justify-center gap-[3px] pb-2">
          {[6, 13, 21, 28, 17, 10, 24, 31, 19, 12, 7, 16, 26, 21, 9, 6, 14, 22, 16, 8].map((h, i) => (
            <Span key={i} className="w-[3px] rounded-full bg-white/30" style={{ height: h }} />
          ))}
        </Div>

        {/* Controls */}
        <Div className="w-full px-8" style={{ paddingBottom: DEVICE.safeBottom + 24 }}>
          <Div className="flex-row items-center justify-center gap-6">
            <Control Icon={Volume2} label="Speaker" active={speaker} onClick={toggleSpeaker} />
            <IconButton size={68} tone="danger" label="End call" onClick={end} onLongPress={() => nav.navigate('dr-st-audio-lost')} className="shadow-lift">
              <PhoneOff className="h-[25px] w-[25px]" strokeWidth={2.2} />
            </IconButton>
            <Control Icon={MicOff} label={mic ? 'Mute' : 'Muted'} active={!mic} onClick={toggleMic} />
          </Div>
        </Div>
      </Div>
    </Screen>
  )
}

function Control({ Icon, label, active, onClick }: { Icon: React.ComponentType<any>; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <Div className=" flex-col items-center gap-2">
      <IconButton size={56} tone={active ? 'glassActive' : 'glass'} label={label} onClick={onClick}>
        <Icon className="h-[21px] w-[21px]" strokeWidth={2.1} />
      </IconButton>
      <Span className="text-caption font-medium text-white/60">{label}</Span>
    </Div>
  )
}

/* =========================================== 23 — Consultation workspace = */

export function WorkspaceScreen() {
  const nav = useNav()
  const appt = useCurrentAppointment(DEFAULT_APPT_ID)
  const patient = useRecords((st) => st.patientById(appt.patientId))
  const draft = useConsultation((st) => st.drafts[appt.id])
  const rx = usePrescriptions((st) => st.drafts[appt.id])
  const seconds = useCallClock(appt.id, 846)
  const d = draft ?? { chiefComplaint: '', symptoms: [], observations: '', assessment: '', diagnosis: [], advice: [], vitals: { bp: '', pulse: '', weight: '', spo2: '' } }

  const filled = [
    Boolean(d.chiefComplaint.trim()),
    d.symptoms.length > 0,
    Boolean(d.observations.trim()),
    d.diagnosis.length > 0,
    d.advice.length > 0,
    Boolean(rx?.reviewed || rx?.status === 'sent'),
    Boolean(rx?.followUp.scheduled),
  ]
  const count = filled.filter(Boolean).length
  const statusOf = (i: number): 'done' | 'active' | 'empty' => (!filled[i] ? 'empty' : i === count - 1 ? 'active' : 'done')
  const rxDone = filled[5]
  const followUpDone = filled[6]

  const prescribe = () => {
    ensureRxDraft(appt.id)
    nav.navigate('dr-rx-create')
  }
  const complete = () => {
    if (rx?.status === 'sent') nav.navigate(rx.followUp.required && !rx.followUp.scheduled ? 'dr-followup' : 'dr-consult-complete')
    else prescribe()
  }

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div
        className="sticky z-30 bg-white"
        style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop, top: -DEVICE.safeTop }}
      >
        <ScreenHeader embedded title="Consultation" subtitle={`${patient.name} · ${appt.id}`} border={false} />
        <Div className="px-5 pb-3">
          <Div className="flex-row items-center gap-3">
            <Div className="min-w-0 flex-1">
              <ProgressBar pct={Math.round((count / 7) * 100)} />
            </Div>
            <Span className="shrink-0 text-caption font-bold tabular-nums text-ink-600">{count} of 7</Span>
          </Div>
        </Div>
      </Div>

      <Div className="flex-1 gap-2.5 px-5 pb-[130px] pt-4">
        {/* Patient summary — always open, never editable here */}
        <Div className="overflow-hidden rounded-tile bg-ink-900 p-4">
          <Div className="flex-row items-center gap-3.5">
            <PatientAvatar patient={patient} size={46} />
            <Div className="min-w-0 flex-1">
              <P className="truncate text-title-sm text-white">{patient.name}</P>
              <P className="truncate text-body-sm text-white/60">
                {patient.age} yrs · {patient.gender} · Blood group {patient.blood}
              </P>
            </Div>
            <Span className="shrink-0 rounded-[7px] bg-white/10 px-2 py-1 text-[10.5px] font-semibold tabular-nums text-white/80">
              {clock(seconds)}
            </Span>
          </Div>

          <Div className="mt-3  grid-cols-4 gap-2">
            {Object.entries(d.vitals).map(([k, v]) => (
              <Div key={k} className="rounded-[9px] bg-white/8 px-2 py-2 text-center">
                <P className="text-[9.5px] font-semibold uppercase tracking-wide text-white/45">{k}</P>
                <P className="mt-0.5 text-[12px] font-bold tabular-nums text-white">{v ? (k === 'spo2' ? `${v}%` : v) : '—'}</P>
              </Div>
            ))}
          </Div>

          {patient.allergies.length > 0 && (
            <Div className="mt-3 flex-row items-center gap-2 rounded-[9px] bg-critical-600/20 px-3 py-2 ring-1 ring-inset  ring-critical-500/30">
              <AlertTriangle className="h-[13px] w-[13px] shrink-0 text-critical-200" strokeWidth={2.5} />
              <P className="text-caption font-semibold text-critical-100">Allergy · {patient.allergies.join(', ')}</P>
            </Div>
          )}
        </Div>

        <ClinicalSection title="Chief complaint" step={1} status={statusOf(0)} action="Edit" onAction={() => nav.navigate('dr-notes')}>
          <P className="text-body leading-[22px] text-ink-800">{d.chiefComplaint || 'Not yet recorded'}</P>
        </ClinicalSection>

        <ClinicalSection title="Symptoms" step={2} status={statusOf(1)} action="Edit" onAction={() => nav.navigate('dr-notes')}>
          <Div className="flex-row flex-wrap gap-1.5">
            {d.symptoms.map((s) => (
              <MetaChip key={s}>{s}</MetaChip>
            ))}
          </Div>
        </ClinicalSection>

        <ClinicalSection title="Clinical notes" step={3} status={statusOf(2)} action="Edit" onAction={() => nav.navigate('dr-notes')}>
          <P className="text-body leading-[22px] text-ink-800">{d.observations || 'Not yet recorded'}</P>
        </ClinicalSection>

        <ClinicalSection title="Diagnosis" step={4} status={statusOf(3)} action="Edit" onAction={() => nav.navigate('dr-notes')}>
          <Div className="gap-1.5">
            {d.diagnosis.map((x) => (
              <Div key={x} className="flex-row gap-2.5">
                <Span className="mt-[8px] h-[5px] w-[5px] shrink-0 rounded-full bg-critical-600" />
                <P className="text-body font-medium leading-[21px] text-ink-900">{x}</P>
              </Div>
            ))}
          </Div>
        </ClinicalSection>

        <ClinicalSection title="Advice" step={5} status={statusOf(4)} action="Edit" onAction={() => nav.navigate('dr-notes')}>
          <Div className="gap-1.5">
            {d.advice.map((a) => (
              <Div key={a} className="flex-row gap-2.5 text-body leading-[21px] text-ink-700">
                <Span className="mt-[8px] h-[4px] w-[4px] shrink-0 rounded-full bg-ink-300" />
                {a}
              </Div>
            ))}
          </Div>
        </ClinicalSection>

        <ClinicalSection title="Prescription" step={6} status={statusOf(5)}>
          <Btn
            onPress={prescribe}
            className="tap flex-row w-full items-center justify-center gap-2 rounded-[11px] border border-dashed border-brand-300 bg-brand-50/60 py-3 text-body font-bold text-brand-700"
          >
            <Plus className="h-[16px] w-[16px]" strokeWidth={2.6} />
            {rxDone ? `${rx?.medicines.length} medicines · Edit` : 'Add medicines'}
          </Btn>
        </ClinicalSection>

        <ClinicalSection title="Follow-up" step={7} status={statusOf(6)}>
          <Btn
            onPress={() => {
              ensureRxDraft(appt.id)
              nav.navigate('dr-followup')
            }}
            className="tap flex-row w-full items-center justify-between rounded-[11px] bg-ink-50 px-3.5 py-3 text-left"
          >
            <Span className="flex-row items-center gap-2.5">
              <CalendarClock className="h-[16px] w-[16px] text-ink-500" strokeWidth={2.2} />
              <Span className="text-body-lg text-ink-700">{followUpDone ? rx?.followUp.date : 'Schedule a follow-up'}</Span>
            </Span>
            <ChevronRight className="h-[17px] w-[17px] text-ink-300" />
          </Btn>
        </ClinicalSection>
      </Div>

      <StickyBar>
        {(!rxDone || !followUpDone) && (
          <Div className="mb-2.5 flex-row items-center gap-2">
            <AlertTriangle className="h-[14px] w-[14px] shrink-0 text-caution-600" strokeWidth={2.3} />
            <Span className="text-caption text-ink-500">
              {!rxDone && !followUpDone
                ? 'Prescription and follow-up are still empty'
                : `${!rxDone ? 'Prescription' : 'Follow-up'} is still empty`}
            </Span>
          </Div>
        )}
        <Button onClick={complete}>Complete Consultation</Button>
      </StickyBar>
    </Screen>
  )
}

/* ============================================= 24 — Consultation notes === */

const COMMON_SYMPTOMS = ['Headache', 'Giddiness', 'Chest pain', 'Breathlessness', 'Palpitations', 'Fatigue', 'Oedema']
const ADVICE_TEMPLATES = [
  'Restrict salt intake to under 5 g per day.',
  'Home BP log twice weekly, morning and evening.',
  'Brisk walk 30 minutes, five days a week.',
  'Avoid smoking and limit alcohol.',
  'Return immediately if chest pain or breathlessness worsens.',
]

const entrySchema = z.object({ value: z.string().trim().min(2, 'Enter a value') })

function EntrySheet({
  title,
  label,
  initial,
  onSave,
  onRemove,
  onClose,
}: {
  title: string
  label: string
  initial?: string
  onSave: (value: string) => void
  onRemove?: () => void
  onClose: () => void
}) {
  const form = useZodForm(entrySchema, { value: initial ?? '' })
  const submit = form.handleSubmit((v) => onSave(v.value.trim()))
  return (
    <ModalSheet
      visible
      title={title}
      onClose={onClose}
      footer={
        <Div className="flex-row gap-2.5">
          {onRemove && (
            <Button variant="tertiary" className="flex-1 !text-critical-600" onClick={onRemove}>
              Remove
            </Button>
          )}
          <Button className="flex-1" onClick={submit}>
            Save
          </Button>
        </Div>
      }
    >
      <Div className="pb-2">
        <FormInput control={form.control} name="value" label={label} required autoFocus />
      </Div>
    </ModalSheet>
  )
}

function VitalField({ control, name, label }: { control: any; name: string; label: string }) {
  const { field, fieldState } = useController({ control, name })
  return (
    <Div>
      <P className="mb-1 text-caption text-ink-400">{label}</P>
      <Input value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} className="!h-[46px] !text-body-lg" />
      <FieldError message={fieldState.error?.message} />
    </Div>
  )
}

export function NotesScreen() {
  const nav = useNav()
  const appt = useCurrentAppointment(DEFAULT_APPT_ID)
  const patient = useRecords((st) => st.patientById(appt.patientId))
  const [stored] = React.useState(() => useConsultation.getState().draftFor(appt.id))
  const saveDraft = useConsultation((st) => st.saveDraft)
  const updateRx = usePrescriptions((st) => st.updateDraft)

  const form = useZodForm(notesDraftSchema, {
    chiefComplaint: stored.chiefComplaint,
    symptoms: stored.symptoms,
    observations: stored.observations,
    assessment: stored.assessment,
    diagnosis: stored.diagnosis,
    advice: stored.advice,
    vitals: stored.vitals,
  })
  const { field: symptoms } = useController({ control: form.control, name: 'symptoms' })
  const { field: diagnosis, fieldState: diagnosisState } = useController({ control: form.control, name: 'diagnosis' })
  const { field: advice } = useController({ control: form.control, name: 'advice' })
  const [saving, setSaving] = React.useState(false)
  const [editing, setEditing] = React.useState<null | { list: 'diagnosis' | 'advice'; index?: number }>(null)
  // Live: notes saved earlier (before an app restart, or on another device) fill the form.
  React.useEffect(() => {
    if (!LIVE || useConsultation.getState().drafts[appt.id]) return
    let alive = true
    loadNotes(appt.id).then((n) => {
      if (alive && n && !form.formState.isDirty) {
        form.reset({ chiefComplaint: n.chiefComplaint, symptoms: n.symptoms, observations: n.observations, assessment: n.assessment, diagnosis: n.diagnosis, advice: n.advice, vitals: n.vitals })
      }
    })
    return () => {
      alive = false
    }
  }, [appt.id, form])
  const [templates, setTemplates] = React.useState(false)

  // Demo: the blueprint's suggested diagnoses. Live: none until the doctor writes them.
  const seededDiagnosis = LIVE ? [] : consultationDraft.diagnosis
  const addSymptom = (s: string) => symptoms.onChange([...symptoms.value, s])
  const removeSymptom = (s: string) => symptoms.onChange(symptoms.value.filter((x: string) => x !== s))

  const writeList = (list: 'diagnosis' | 'advice', value: string[]) => (list === 'diagnosis' ? diagnosis.onChange(value) : advice.onChange(value))
  const listOf = (list: 'diagnosis' | 'advice') => (list === 'diagnosis' ? diagnosis.value : advice.value)

  const persist = async (values: NotesForm, next: string) => {
    setSaving(true)
    try {
      await saveDraft(appt.id, values)
      updateRx(appt.id, { diagnosis: values.diagnosis })
      showToast('Draft saved')
      nav.navigate(next)
    } finally {
      setSaving(false)
    }
  }

  const saveAndReturn = form.handleSubmit((v) => persist(v, 'dr-workspace'))
  const prescribe = async () => {
    const values = form.getValues()
    const parsed = notesFinalSchema.safeParse(values)
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => form.setError(issue.path.join('.') as any, { message: issue.message }))
      return
    }
    ensureRxDraft(appt.id)
    await persist(values, 'dr-rx-create')
  }

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader
        title="Clinical notes"
        subtitle={patient.name}
        right={
          <Btn onPress={saveAndReturn} className="tap px-2 text-body-sm font-semibold text-brand-600">
            Save
          </Btn>
        }
      />

      <Div className="flex-1 gap-3 px-5 pb-[130px] pt-4">
        {/* Structured, not a blank page */}
        <Card elevation="tile">
          <FormTextArea control={form.control} name="chiefComplaint" label="Chief complaint" required className="min-h-[76px]" />
        </Card>

        <Card elevation="tile">
          <P className="mb-2 text-body-sm font-semibold text-ink-600">Symptoms</P>
          <Div className="mb-2.5 flex-row flex-wrap gap-1.5">
            {symptoms.value.map((s: string) => (
              <Btn
                key={s}
                onPress={() => removeSymptom(s)}
                className="tap inline-flex flex-row items-center gap-1.5 rounded-chip bg-brand-600 px-3 py-1.5 text-body-sm font-semibold text-white"
              >
                {s}
                <Span className="text-white/70">×</Span>
              </Btn>
            ))}
          </Div>
          <P className="mb-2 text-caption text-ink-400">Frequently used in cardiology</P>
          <Div className="flex-row flex-wrap gap-1.5">
            {COMMON_SYMPTOMS.filter((s) => !symptoms.value.includes(s)).map((s) => (
              <Btn
                key={s}
                onPress={() => addSymptom(s)}
                className="tap inline-flex flex-row items-center gap-1 rounded-chip bg-white px-3 py-1.5 text-body-sm font-medium text-ink-600 ring-1 ring-inset  ring-ink-200"
              >
                <Plus className="h-[12px] w-[12px]" strokeWidth={2.6} />
                {s}
              </Btn>
            ))}
          </Div>
        </Card>

        <Card elevation="tile">
          <P className="mb-2.5 text-body-sm font-semibold text-ink-600">Vitals</P>
          <Div className=" grid-cols-2 gap-2.5">
            <VitalField control={form.control} name="vitals.bp" label="Blood pressure" />
            <VitalField control={form.control} name="vitals.pulse" label="Pulse" />
            <VitalField control={form.control} name="vitals.weight" label="Weight" />
            <VitalField control={form.control} name="vitals.spo2" label="SpO₂" />
          </Div>
        </Card>

        <Card elevation="tile">
          <FormTextArea control={form.control} name="observations" label="Observations" hint="Examination findings." className="min-h-[92px]" />
        </Card>

        <Card elevation="tile">
          <FormTextArea control={form.control} name="assessment" label="Assessment" className="min-h-[84px]" />
        </Card>

        <Card elevation="tile">
          <Div className="mb-2 flex-row items-center justify-between">
            <P className="text-body-sm font-semibold text-ink-600">
              Diagnosis <Span className="text-critical-600">*</Span>
            </P>
            <Btn
              onPress={() => setEditing({ list: 'diagnosis' })}
              className="tap flex-row items-center gap-1 text-body-sm font-semibold text-brand-600"
            >
              <Plus className="h-[14px] w-[14px]" strokeWidth={2.6} />
              Add
            </Btn>
          </Div>
          <Div className="gap-2">
            {diagnosis.value.map((x: string, i: number) => (
              <Div key={x} onPress={() => setEditing({ list: 'diagnosis', index: i })} className="flex-row items-center gap-2.5 rounded-[11px] bg-ink-50 px-3.5 py-2.5">
                <Span className="h-[5px] w-[5px] shrink-0 rounded-full bg-critical-600" />
                <P className="min-w-0 flex-1 text-body font-medium text-ink-900">{x}</P>
                {seededDiagnosis.includes(x) && <Span className="shrink-0 text-caption tabular-nums text-ink-400">ICD-10 I10</Span>}
              </Div>
            ))}
          </Div>
          <FieldError message={diagnosisState.error?.message} />
        </Card>

        <Card elevation="tile">
          <Div className="mb-2 flex-row items-center justify-between">
            <P className="text-body-sm font-semibold text-ink-600">Advice</P>
            <Btn onPress={() => setTemplates(true)} className="tap flex-row items-center gap-1 text-body-sm font-semibold text-brand-600">
              <Sparkles className="h-[13px] w-[13px]" strokeWidth={2.4} />
              Use template
            </Btn>
          </Div>
          <Div className="gap-2">
            {advice.value.map((a: string, i: number) => (
              <Div key={a} onPress={() => setEditing({ list: 'advice', index: i })} className="flex-row items-start gap-2.5 rounded-[11px] bg-ink-50 px-3.5 py-2.5">
                <Span className="mt-[8px] h-[4px] w-[4px] shrink-0 rounded-full bg-ink-400" />
                <P className="min-w-0 flex-1 text-body leading-[21px] text-ink-800">{a}</P>
              </Div>
            ))}
          </Div>
        </Card>
      </Div>

      <StickyBar>
        <Div className="flex-row gap-2.5">
          <Button variant="tertiary" className="flex-1" loading={saving} onClick={saveAndReturn}>
            Save draft
          </Button>
          <Button className="flex-[1.3]" loading={saving} onClick={prescribe}>
            Prescribe
          </Button>
        </Div>
      </StickyBar>

      {editing && (
        <EntrySheet
          title={editing.index === undefined ? 'Add diagnosis' : editing.list === 'diagnosis' ? 'Edit diagnosis' : 'Edit advice'}
          label={editing.list === 'diagnosis' ? 'Diagnosis' : 'Advice'}
          initial={editing.index === undefined ? undefined : listOf(editing.list)[editing.index]}
          onRemove={
            editing.index === undefined
              ? undefined
              : () => {
                  writeList(editing.list, listOf(editing.list).filter((_: string, i: number) => i !== editing.index))
                  setEditing(null)
                }
          }
          onSave={(value) => {
            const items = listOf(editing.list)
            writeList(
              editing.list,
              editing.index === undefined ? [...items, value] : items.map((x: string, i: number) => (i === editing.index ? value : x)),
            )
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}

      <ModalSheet visible={templates} title="Advice templates" subtitle="Tap to add" onClose={() => setTemplates(false)}>
        <Div className="gap-2 pb-2">
          {ADVICE_TEMPLATES.filter((t) => !advice.value.includes(t)).map((t) => (
            <Btn key={t} onPress={() => advice.onChange([...advice.value, t])} className="tap w-full rounded-tile bg-ink-50 px-3.5 py-3 text-left">
              <P className="text-body text-ink-800">{t}</P>
            </Btn>
          ))}
          {ADVICE_TEMPLATES.every((t) => advice.value.includes(t)) && <P className="py-2 text-body text-ink-400">All templates added.</P>}
        </Div>
      </ModalSheet>
    </Screen>
  )
}
