import { Btn, Div, P, Span } from '../components/primitives/index'
import React from 'react'
import {
  Download,
  ChevronRight,
  Landmark,
  Clock,
  TrendingUp,
  FileText,
  AlertTriangle,
  IndianRupee,
} from '../components/primitives/icons'
import { Screen, DEVICE } from '../components/ui/Screen'
import { ScreenHeader, HScroll } from '../components/ui/Nav'
import { Button, IconButton, StickyBar } from '../components/ui/Button'
import { Card, Divider, SectionHeader, Segmented, StatusBadge, KeyValue, FilterChip } from '../components/ui/Display'
import { Banner, StateBlock } from '../components/ui/Feedback'
import { BarChart, DoctorNav, EarningRow, MODE } from '../components/doctor/index'
import { rupee } from '../mock-data/mock'
import { useNav } from '../navigation/navigation'
import { useBank } from '../store/bank'
import { earningDates, filterEarnings, useEarnings, type EarningFilter } from '../store/earnings'
import { showToast } from '../store/toast'
import { services } from '../services'
import { LIVE } from '../services/config'
import { fetchStatementSummary, monthLabel } from '../services/live/earnings'

/* ============================================ 31 — Earnings dashboard ==== */

const requestStatement = (period: string) => {
  if (LIVE) {
    // Live: the month's statement from the server, shown as its totals.
    fetchStatementSummary(period)
      .then((s) =>
        showToast(`Statement · ${period}`, 'info', `${s.consultations} consultations · ${rupee(s.net)} earned · ${rupee(s.paidOut)} paid out · TDS ${rupee(s.tdsDeducted)}`),
      )
      .catch((e) => showToast('Could not load the statement', 'critical', e instanceof Error ? e.message : undefined))
    return
  }
  services.earnings
    .requestStatement(period)
    .then(() => showToast('Statement requested', 'info', 'It will arrive by email shortly.'))
    .catch(() => showToast('Could not request the statement', 'critical'))
}

/** Live: the real months; the demo is set in October 2026. */
const THIS_MONTH = LIVE ? monthLabel(0) : 'October 2026'
const LAST_MONTH = LIVE ? monthLabel(-1) : 'September 2026'

export function EarningsScreen() {
  const nav = useNav()
  const earnings = useEarnings((st) => st.summary)
  const earningRows = useEarnings((st) => st.rows)
  const payout = useEarnings((st) => st.payout)
  const bank = useBank((st) => st.bank)
  const [period, setPeriod] = React.useState('w')
  const modeTotal = earnings.byMode.video + earnings.byMode.audio + earnings.byMode.clinic

  return (
    <Screen background="bg-canvas" padTop={false} padBottom={false}>
      <Div className=" h-full overflow-y-auto pb-[112px]">
        {/* Headline figure on ink — money is reported, not celebrated */}
        <Div className="bg-ink-900 px-5 pb-6" style={{ paddingTop: DEVICE.safeTop + 10 }}>
          <Div className="flex-row items-center justify-between">
            <P className="text-title-md text-white">Earnings</P>
            <IconButton size={36} tone="glass" label="Statement" onClick={() => requestStatement(THIS_MONTH)}>
              <Download className="h-[16px] w-[16px]" strokeWidth={2.2} />
            </IconButton>
          </Div>

          <P className="mt-5 text-caption text-white/50">This month · {THIS_MONTH}</P>
          <P className="mt-1.5 font-display text-[36px] font-extrabold leading-none tabular-nums tracking-[-1px] text-white">
            {rupee(earnings.month)}
          </P>
          {/* Demo only: the server's summary has no last-month total to compare with. */}
          {!LIVE && (
            <P className="mt-2 flex-row items-center gap-1.5 text-body-sm text-vital-300">
              <TrendingUp className="h-[14px] w-[14px]" strokeWidth={2.4} />
              12% above September
            </P>
          )}

          <Div className="mt-5 flex-row divide-x divide-white/10 rounded-tile bg-white/8 py-3">
            {[
              { l: 'Today', v: earnings.today },
              { l: 'This week', v: earnings.week },
              { l: 'Consults', v: earnings.consultsThisMonth, raw: true },
            ].map((x) => (
              <Div key={x.l} className="min-w-0 flex-1 px-3">
                <P className="truncate text-[10.5px] text-white/50">{x.l}</P>
                <P className="mt-1 truncate font-display text-[17px] font-bold tabular-nums text-white">
                  {x.raw ? x.v : rupee(x.v)}
                </P>
              </Div>
            ))}
          </Div>
        </Div>

        <Div className="gap-3 px-5 pt-4">
          {/* Trend */}
          <Card elevation="tile">
            <Div className="mb-3 flex-row items-center justify-between">
              <P className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">{period === 'w' ? 'This week' : 'This month'}</P>
              <Segmented
                options={[
                  { id: 'w', label: 'Week' },
                  { id: 'm', label: 'Month' },
                ]}
                value={period}
                onChange={setPeriod}
                fit
                className="!p-0.5"
              />
            </Div>
            <BarChart
              data={period === 'w' ? earnings.weekSeries : earnings.monthSeries}
              labels={period === 'w' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['W1', 'W2', 'W3', 'W4', 'W5']}
              highlight={period === 'w' ? (LIVE ? (new Date().getDay() + 6) % 7 : 4) : LIVE ? Math.min(4, Math.floor((new Date().getDate() - 1) / 7)) : 3}
            />
          </Card>

          {/* Split by consultation type */}
          <Card elevation="tile">
            <P className="mb-3 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">By consultation type</P>
            <Div className="gap-3">
              {(['video', 'audio', 'clinic'] as const).map((m) => {
                const { Icon, full } = MODE[m]
                const v = earnings.byMode[m]
                const pct = Math.round((v / modeTotal) * 100)
                return (
                  <Div key={m}>
                    <Div className="flex-row items-center gap-2.5">
                      <Icon className="h-[14px] w-[14px] shrink-0 text-ink-500" strokeWidth={2.2} />
                      <Span className="min-w-0 flex-1 truncate text-body-sm font-medium text-ink-700">{full}</Span>
                      <Span className="shrink-0 text-body-sm font-bold tabular-nums text-ink-900">{rupee(v)}</Span>
                      <Span className="w-[32px] shrink-0 text-right text-caption tabular-nums text-ink-400">{pct}%</Span>
                    </Div>
                    <Div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-ink-100">
                      <Div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                    </Div>
                  </Div>
                )
              })}
            </Div>
            <Divider className="my-3.5" />
            <KeyValue label="Average per consultation" value={rupee(earnings.avgPerConsult)} />
          </Card>

          {/* Payout summary */}
          <Btn
            onPress={() => nav.navigate('dr-payout')}
            className="tap flex-row w-full items-center gap-3.5 rounded-tile bg-white p-4 text-left shadow-tile"
          >
            <Span className="flex-col h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[12px] bg-vital-50">
              <Landmark className="h-[18px] w-[18px] text-vital-600" strokeWidth={2.1} />
            </Span>
            <Div className="min-w-0 flex-1">
              <P className="truncate text-body-lg font-semibold text-ink-900">Next payout {rupee(payout.available)}</P>
              <P className="truncate text-caption text-ink-400">
                {payout.nextPayout.date} · {bank.name} {bank.account}
              </P>
            </Div>
            <ChevronRight className="h-[17px] w-[17px] shrink-0 text-ink-300" />
          </Btn>

          {/* Recent */}
          <Div>
            <SectionHeader
              title="Recent consultations"
              action="All"
              onAction={() => nav.navigate('dr-earnings-history')}
              className="!px-0 pb-2.5"
            />
            <Card elevation="tile" padded={false} className="overflow-hidden">
              {earningRows.slice(0, 4).map((r, i, arr) => (
                <EarningRow key={r.id} row={r} last={i === arr.length - 1} />
              ))}
            </Card>
          </Div>

          <P className="px-1 text-caption leading-[17px] text-ink-400">
            Amounts are shown after the KDC+ platform fee and before TDS. A consolidated statement is issued every
            month for your records.
          </P>
        </Div>
      </Div>

      <DoctorNav active="earnings" />
    </Screen>
  )
}

/* ============================================== 32 — Earnings history ==== */

export function EarningsHistoryScreen() {
  const earnings = useEarnings((st) => st.summary)
  const earningRows = useEarnings((st) => st.rows)
  const [filter, setFilter] = React.useState<EarningFilter>('This month')
  const visible = filterEarnings(earningRows, filter)
  const byDate = earningDates(visible)
  const isMonth = filter === 'This month'
  const totals = [
    { l: 'Consultations', v: isMonth ? String(earnings.consultsThisMonth) : String(visible.filter((r) => r.status !== 'no-show').length) },
    { l: 'Gross', v: rupee(isMonth ? earnings.month : visible.reduce((sum, r) => sum + r.amount, 0)) },
    { l: 'Settled', v: rupee(isMonth ? earnings.settledThisMonth : visible.filter((r) => r.status === 'settled').reduce((sum, r) => sum + r.amount, 0)) },
  ]

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div
        className="sticky z-30 bg-white"
        style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop, top: -DEVICE.safeTop }}
      >
        <ScreenHeader
          embedded
          title="Earnings history"
          border={false}
          right={
            <IconButton size={36} label="Export" onClick={() => requestStatement(filter)}>
              <Download className="h-[16px] w-[16px] text-ink-700" strokeWidth={2.2} />
            </IconButton>
          }
        />
        <Div className="pb-3">
          <HScroll gap={8}>
            {(['This month', 'Last month', 'Settled', 'Processing', 'No-shows'] as EarningFilter[]).map((f) => (
              <FilterChip key={f} active={filter === f} onClick={() => setFilter(f)}>
                {f}
              </FilterChip>
            ))}
          </HScroll>
        </Div>
      </Div>

      <Div className="flex-1 px-5 pb-[40px] pt-4">
        <Card elevation="tile" className="mb-4">
          <Div className="flex-row divide-x divide-ink-100">
            {totals.map((x) => (
              <Div key={x.l} className="min-w-0 flex-1 px-3 text-center">
                <P className="truncate font-display text-[17px] font-bold tabular-nums text-ink-900">{x.v}</P>
                <P className="mt-1 truncate text-[10.5px] text-ink-400">{x.l}</P>
              </Div>
            ))}
          </Div>
        </Card>

        {byDate.length === 0 && (
          <Div className="pt-12">
            <StateBlock
              icon={<IndianRupee className="h-[30px] w-[30px]" strokeWidth={1.8} />}
              title="No earnings here"
              body="Completed consultations appear here within 48 hours and settle every Wednesday."
            />
          </Div>
        )}
        {byDate.map((d) => {
          const rows = visible.filter((r) => r.date === d)
          const total = rows.reduce((s, r) => s + r.amount, 0)
          return (
            <Div key={d} className="mb-4">
              <Div className="mb-2 flex-row items-baseline justify-between px-1">
                <P className="text-caption font-bold uppercase tracking-[.08em] text-ink-500">{d}</P>
                <Span className="text-caption font-bold tabular-nums text-ink-700">{rupee(total)}</Span>
              </Div>
              <Card elevation="tile" padded={false} className="overflow-hidden">
                {rows.map((r, i) => (
                  <EarningRow key={r.id} row={r} last={i === rows.length - 1} />
                ))}
              </Card>
            </Div>
          )
        })}
      </Div>
    </Screen>
  )
}

/* ================================================== 33 — Payout details == */

export function PayoutScreen() {
  const nav = useNav()
  const payout = useEarnings((st) => st.payout)
  const commissionPct = useEarnings((st) => st.commissionPct)
  const clearanceHours = useEarnings((st) => st.clearanceHours)
  const bank = useBank((st) => st.bank)
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Payouts" />

      <Div className="flex-1 gap-3 px-5 pb-[130px] pt-4">
        {payout.failed && (
          <Banner
            tone="critical"
            icon={<AlertTriangle className="h-[16px] w-[16px]" strokeWidth={2.2} />}
            title="Your last payout could not be credited"
            body={`${rupee(payout.failed.amount)} · ${payout.failed.reason}. The money is safe in your KDC+ balance.`}
            action="Fix"
            onAction={() => nav.navigate('dr-st-payout-failed')}
          />
        )}
        <Card elevation="card" padded={false} className="overflow-hidden">
          <Div className="bg-ink-900 p-4">
            <P className="text-caption text-white/50">Available for payout</P>
            <P className="mt-1.5 font-display text-[30px] font-extrabold leading-none tabular-nums text-white">
              {rupee(payout.available)}
            </P>
            <Div className="mt-4 flex-row items-center gap-2 rounded-[10px] bg-white/8 px-3 py-2.5">
              <Clock className="h-[14px] w-[14px] shrink-0 text-white/60" strokeWidth={2.2} />
              <Span className="min-w-0 flex-1 truncate text-caption text-white/75">
                Credits automatically on {payout.nextPayout.date}
              </Span>
            </Div>
          </Div>
          <Div className=" grid-cols-2 divide-x divide-ink-100">
            <Btn
              onPress={() => nav.navigate('dr-st-payment-pending')}
              className="tap px-4 py-3.5 text-left"
            >
              <P className="text-caption text-ink-400">Pending clearance</P>
              <P className="mt-1 text-title-sm tabular-nums text-ink-900">{rupee(payout.pending)}</P>
              <P className="mt-0.5 text-caption text-brand-600">Consultations under 48 h →</P>
            </Btn>
            <Div className="px-4 py-3.5">
              <P className="text-caption text-ink-400">Last payout</P>
              <P className="mt-1 text-title-sm tabular-nums text-ink-900">{rupee(payout.lastPayout.amount)}</P>
              <P className="mt-0.5 text-caption text-ink-400">{payout.lastPayout.date}</P>
            </Div>
          </Div>
        </Card>

        {/* Bank — masked by default */}
        <Card elevation="tile">
          <Div className="mb-3 flex-row items-center justify-between">
            <P className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Settlement account</P>
            <StatusBadge tone={bank.status === 'verified' ? 'success' : 'caution'} dot>
              {bank.status === 'verified' ? 'Verified' : 'Verifying'}
            </StatusBadge>
          </Div>
          <Div className="flex-row items-center gap-3.5">
            <Span className="flex-col h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[12px] bg-ink-50">
              <Landmark className="h-[18px] w-[18px] text-ink-600" strokeWidth={2.1} />
            </Span>
            <Div className="min-w-0 flex-1">
              <P className="truncate text-body-lg font-semibold text-ink-900">{bank.name}</P>
              <P className="truncate text-body-sm tabular-nums text-ink-500">{bank.account}</P>
            </Div>
          </Div>
          <Divider className="my-3" />
          <KeyValue label="Account holder" value={bank.holder} />
          <KeyValue label="IFSC" value={bank.ifsc} />
          <KeyValue label="Branch" value={bank.branch} />
        </Card>

        <Card elevation="tile">
          <P className="mb-2.5 text-[11px] font-bold uppercase tracking-[.08em] text-ink-500">Payout schedule</P>
          <KeyValue label="Cycle" value={payout.nextPayout.cycle} />
          <KeyValue label="Clearance" value={`${clearanceHours} hours after consultation`} />
          <KeyValue label="Platform fee" value={`${commissionPct}% of consultation fee`} />
          <KeyValue label="TDS" value="Deducted as per Section 194J" />
        </Card>

        <Banner
          tone="brand"
          icon={<FileText className="h-[16px] w-[16px]" strokeWidth={2.2} />}
          title="Monthly statement available"
          body={`${LAST_MONTH} statement with TDS summary is ready${LIVE ? '.' : ' to download.'}`}
          action={LIVE ? 'View' : 'Get'}
          onAction={() => requestStatement(LAST_MONTH)}
        />
      </Div>

      <StickyBar>
        <Button variant="tertiary" onClick={() => nav.navigate('dr-bank')}>
          Update Bank Details
        </Button>
      </StickyBar>
    </Screen>
  )
}
