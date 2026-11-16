import { Btn, Div, P, Span } from '../components/primitives/index'
import React from 'react'
import { Download, Share2, FileText, AlertTriangle, ExternalLink, Check } from '../components/primitives/icons'
import { Screen } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/Nav'
import { Button, IconButton, StickyBar } from '../components/ui/Button'
import { Card, Divider, StatusBadge } from '../components/ui/Display'
import { TextArea } from '../components/ui/Inputs'
import { PatientAvatar, PatientMeta } from '../components/doctor/index'
import { useNav } from '../navigation/navigation'
import { Share } from 'react-native'
import { useController } from 'react-hook-form'
import { useZodForm } from '../components/ui/Form'
import { Field } from '../components/ui/Inputs'
import { REPORT_DEFAULT_ID } from '../mock-data/seed'
import { openPrescriptionForPatient } from '../store/flows'
import { useRecords } from '../store/records'
import { LIVE } from '../services/config'
import { loadReport } from '../services/live/sync-records'
import { LoadingState, StateBlock } from '../components/ui/Feedback'
import { useSelection } from '../store/selection'
import { showToast } from '../store/toast'
import { reportNoteSchema } from '../validation/schemas'

const FLAG = {
  normal: { label: 'Normal', tone: 'success' as const, bar: 'bg-vital-600', width: '48%' },
  borderline: { label: 'Borderline', tone: 'caution' as const, bar: 'bg-caution-600', width: '72%' },
  high: { label: 'High', tone: 'critical' as const, bar: 'bg-critical-600', width: '92%' },
}

/* ========================================= 29 — Diagnostic report detail = */

/** Live: the report is fetched when opened (each read is logged on the server). */
export function ReportDetailScreen() {
  const reportId = useSelection((st) => st.reportId) ?? REPORT_DEFAULT_ID
  const loaded = useRecords((st) => Boolean(st.reportDetails[reportId]))
  const [failed, setFailed] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (!LIVE) return
    setFailed(null)
    loadReport(reportId).catch((e: unknown) => setFailed(e instanceof Error ? e.message : 'Couldn’t load the report'))
  }, [reportId])
  if (LIVE && !loaded) {
    return (
      <Screen background="bg-canvas" padBottom={false}>
        <ScreenHeader title="Report" />
        <Div className="flex-1 items-center justify-center px-6">
          {failed ? (
            <StateBlock icon={<AlertTriangle className="h-[22px] w-[22px] text-critical-600" strokeWidth={2.2} />} title="Couldn’t open this report" body={failed} tone="critical" />
          ) : (
            <LoadingState label="Opening the report…" />
          )}
        </Div>
      </Screen>
    )
  }
  return <ReportDetailBody />
}

function ReportDetailBody() {
  const nav = useNav()
  const reportId = useSelection((st) => st.reportId) ?? REPORT_DEFAULT_ID
  const r = useRecords((st) => st.reportDetails[reportId] ?? st.reportDetails[REPORT_DEFAULT_ID])
  const status = useRecords((st) => st.reports.find((x) => x.id === reportId))
  const p = useRecords((st) => st.patientById(r.patientId))
  const markReviewed = useRecords((st) => st.markReportReviewed)
  const high = r.results.filter((x) => x.flag === 'high').length
  const borderline = r.results.filter((x) => x.flag === 'borderline').length
  const reviewed = status?.status === 'reviewed'
  const form = useZodForm(reportNoteSchema, { note: status?.note ?? '' })
  const { field: note, fieldState: noteState } = useController({ control: form.control, name: 'note' })

  const review = form.handleSubmit(async (v) => {
    if (!reviewed) await markReviewed(reportId, v.note)
    openPrescriptionForPatient(p.id)
    nav.navigate('dr-rx-create')
  })
  const save = () => showToast('Report saved to your files')

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader
        title="Report"
        subtitle={r.id}
        right={
          <>
            <IconButton size={36} label="Share" onClick={() => Share.share({ message: `${r.name} · ${r.id}` })}>
              <Share2 className="h-[16px] w-[16px] text-ink-700" strokeWidth={2.2} />
            </IconButton>
            <IconButton size={36} label="Download" onClick={save}>
              <Download className="h-[16px] w-[16px] text-ink-700" strokeWidth={2.2} />
            </IconButton>
          </>
        }
      />

      <Div className="flex-1 gap-3 px-5 pb-[140px] pt-4">
        {/* Who and what */}
        <Card elevation="tile" padded={false}>
          <Div className="flex-row items-center gap-3.5 p-4">
            <PatientAvatar patient={p} size={46} />
            <Div className="min-w-0 flex-1">
              <P className="truncate text-title-sm text-ink-900">{p.name}</P>
              <PatientMeta patient={p} extra={p.blood} />
            </Div>
            <StatusBadge tone={reviewed ? 'success' : 'caution'} dot>
              {reviewed ? 'Reviewed' : 'Needs review'}
            </StatusBadge>
          </Div>
          <Divider />
          <Div className="p-4">
            <P className="text-title-sm text-ink-900">{r.name}</P>
            <P className="mt-0.5 text-body-sm text-ink-500">{r.lab}</P>
            <Div className="mt-3  grid-cols-2 gap-3 border-t border-ink-100 pt-3">
              <Div>
                <P className="text-caption text-ink-400">Collected</P>
                <P className="mt-0.5 text-body-sm font-semibold text-ink-900">{r.collected}</P>
              </Div>
              <Div>
                <P className="text-caption text-ink-400">Reported</P>
                <P className="mt-0.5 text-body-sm font-semibold text-ink-900">{r.reported}</P>
              </Div>
            </Div>
          </Div>
        </Card>

        {/* Clinical summary first */}
        <Div className="flex-row items-start gap-3 rounded-tile bg-caution-50 p-4">
          <AlertTriangle className="mt-[1px] h-[17px] w-[17px] shrink-0 text-caution-700" strokeWidth={2.2} />
          <Div className="min-w-0">
            <P className="text-body-sm font-bold text-caution-700">
              {high} outside reference range · {borderline} borderline
            </P>
            <P className="mt-0.5 text-body-sm leading-[18px] text-caution-700/85">{r.summary}</P>
          </Div>
        </Div>

        {/* Results */}
        {r.results.length > 0 && (
        <Card elevation="tile" padded={false}>
          <Div className="flex-row items-center justify-between px-4 pb-2 pt-4">
            <P className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Results</P>
            <Span className="text-caption text-ink-400">Reference</Span>
          </Div>
          {r.results.map((x, i, arr) => {
            const f = FLAG[x.flag]
            return (
              <Div key={x.name} className={`px-4 py-3 ${i < arr.length - 1 ? 'border-b-[0.5px] border-ink-900/10' : ''}`}>
                <Div className="flex-row items-start justify-between gap-3">
                  <P className="min-w-0 flex-1 text-body-lg font-medium leading-[20px] text-ink-900">{x.name}</P>
                  <P
                    className={`shrink-0 text-title-sm tabular-nums ${
                      x.flag === 'normal' ? 'text-ink-900' : x.flag === 'high' ? 'text-critical-600' : 'text-caution-700'
                    }`}
                  >
                    {x.value} <Span className="text-caption font-medium text-ink-400">{x.unit}</Span>
                  </P>
                </Div>
                <Div className="mt-2 flex-row items-center gap-3">
                  <Div className="relative h-[5px] flex-1 overflow-hidden rounded-full bg-ink-100">
                    <Span className={`absolute inset-y-0 left-0 rounded-full ${f.bar}`} style={{ width: f.width }} />
                  </Div>
                  <Span className="shrink-0 text-caption tabular-nums text-ink-400">{x.range}</Span>
                  <StatusBadge tone={f.tone}>{f.label}</StatusBadge>
                </Div>
              </Div>
            )
          })}
        </Card>
        )}

        {/* Clinical note on the report */}
        <Card elevation="tile">
          <Div className="mb-2 flex-row items-center justify-between">
            <P className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Your clinical note</P>
            <Span className="text-caption text-ink-400">Visible to the patient</Span>
          </Div>
          <Field error={noteState.error?.message}>
            <TextArea
              value={note.value}
              onChangeText={note.onChange}
              placeholder="e.g. Lipids remain above target. Rosuvastatin increased to 20 mg. Repeat profile in 8 weeks."
              className="min-h-[92px]"
            />
          </Field>
        </Card>

        <Card elevation="tile">
          <P className="text-body-sm leading-[19px] text-ink-600">
            Reviewed and released by <Span className="font-bold text-ink-900">{r.pathologist}</Span>
          </P>
          <Divider className="my-3" />
          <Btn onPress={() => showToast('Opening lab PDF', 'info')} className="tap flex-row w-full items-center justify-between text-left">
            <Span className="flex-row items-center gap-2.5">
              <FileText className="h-[16px] w-[16px] text-brand-600" strokeWidth={2.1} />
              <Span className="text-body-lg font-semibold text-brand-600">View full lab PDF</Span>
            </Span>
            <ExternalLink className="h-[15px] w-[15px] text-ink-300" strokeWidth={2.2} />
          </Btn>
        </Card>
      </Div>

      <StickyBar>
        <Div className="flex-row gap-2.5">
          <Button variant="tertiary" block={false} className="w-[54px] !px-0" aria-label="Download" onClick={save}>
            <Download className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </Button>
          <Button
            className="flex-1"
            loading={form.formState.isSubmitting}
            onClick={review}
            icon={<Check className="h-[17px] w-[17px]" strokeWidth={2.4} />}
          >
            {reviewed ? 'Prescribe' : 'Mark reviewed & prescribe'}
          </Button>
        </Div>
      </StickyBar>
    </Screen>
  )
}
