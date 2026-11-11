/**
 * KDC+ Plus — the paid membership.
 *
 * A patient buys a plan once; from that moment every consultation, medicine
 * order and diagnostic test is billed at the member rate. The rate itself is
 * not a product decision made here — operations set it in the admin panel, and
 * the app only ever reflects what it is told. That is why nothing below is
 * hardcoded into a screen: change `planConfig.discount` and every price, bill
 * line and savings figure in the app follows.
 */

export type BenefitArea = 'consultations' | 'pharmacy' | 'diagnostics'

/** Mirrors the admin panel. Percentages, not amounts — so it scales with price. */
export const planConfig = {
  /** Set per category so operations can discount one stream harder than another. */
  discount: {
    consultations: 25,
    pharmacy: 25,
    diagnostics: 25,
  } as Record<BenefitArea, number>,
  /** Shown wherever the member rate is explained. */
  headlineDiscount: 25,
}

export interface Plan {
  id: string
  name: string
  price: number
  /** Billed period in months — drives the per-month figure shown on the card. */
  months: number
  discount: number
  tag?: string
  best?: boolean
}

export const plans: Plan[] = [
  { id: 'annual', name: '12 months', price: 2500, months: 12, discount: 25, tag: 'Best value', best: true },
  { id: 'half', name: '6 months', price: 1499, months: 6, discount: 15 },
  { id: 'quarter', name: '3 months', price: 849, months: 3, discount: 10 },
]

export const planById = (id: string) => plans.find((p) => p.id === id) ?? plans[0]

/** Per-month equivalent, for comparing plans honestly. */
export const perMonth = (p: Plan) => Math.round(p.price / p.months)

/**
 * The patient's own membership. `active: false` shows the offer instead of the
 * benefit, which is how the non-member screens in the gallery are driven.
 */
export const membership = {
  active: true,
  planId: 'annual',
  discount: 25,
  since: '12 Jan 2026',
  renews: '12 Jan 2027',
  daysLeft: 96,
  get saved() {
    return totalSaved
  },
  get savedBy() {
    return savedByArea
  },
  get usedCount() {
    return savingsLedger.length
  },
}

/** Rate for an area, honouring the membership only while it is active. */
export const rateFor = (area: BenefitArea) => (membership.active ? planConfig.discount[area] : 0)

/** Member price for a listed amount. Rounded to the rupee — no paise in India. */
export function memberPrice(amount: number, area: BenefitArea) {
  const pct = rateFor(area)
  return pct ? Math.round(amount * (1 - pct / 100)) : amount
}

/** What the membership takes off this amount. */
export function memberSaving(amount: number, area: BenefitArea) {
  return amount - memberPrice(amount, area)
}

/** What a non-member would save on this amount, used for the upsell. */
export function wouldSave(amount: number, area: BenefitArea) {
  return amount - Math.round(amount * (1 - planConfig.discount[area] / 100))
}

export const benefits: { area: BenefitArea; label: string; detail: string }[] = [
  { area: 'consultations', label: 'Consultations', detail: 'Every video, audio and in-person visit' },
  { area: 'pharmacy', label: 'Pharmacy', detail: 'On medicine orders, over the regular price' },
  { area: 'diagnostics', label: 'Diagnostics', detail: 'Lab tests and home sample collection' },
]

/** Every discount the membership has already applied — the savings ledger. */
export const savingsLedger = [
  { id: 'sv01', area: 'consultations' as BenefitArea, label: 'Video consultation — Dr. Arjun Mehta', date: '28 Sep 2026', listed: 800 },
  { id: 'sv02', area: 'pharmacy' as BenefitArea, label: 'Medicine order · 3 items', date: '24 Sep 2026', listed: 351 },
  { id: 'sv03', area: 'diagnostics' as BenefitArea, label: 'Lipid Profile — Complete', date: '22 Sep 2026', listed: 699 },
  { id: 'sv04', area: 'consultations' as BenefitArea, label: 'In-person visit — Dr. Kavya Nair', date: '14 Sep 2026', listed: 900 },
  { id: 'sv05', area: 'pharmacy' as BenefitArea, label: 'Medicine order · 5 items', date: '08 Sep 2026', listed: 1240 },
  { id: 'sv06', area: 'diagnostics' as BenefitArea, label: 'HbA1c · Home collection', date: '02 Sep 2026', listed: 549 },
  { id: 'sv07', area: 'consultations' as BenefitArea, label: 'Video consultation — Dr. Sanjay Iyer', date: '27 Aug 2026', listed: 500 },
  { id: 'sv08', area: 'consultations' as BenefitArea, label: 'Video consultation — Dr. Arjun Mehta', date: '11 Aug 2026', listed: 800 },
  { id: 'sv09', area: 'pharmacy' as BenefitArea, label: 'Medicine order · 4 items', date: '29 Jul 2026', listed: 980 },
  { id: 'sv10', area: 'diagnostics' as BenefitArea, label: 'Full Body Checkup — Advanced', date: '18 Jul 2026', listed: 1200 },
  { id: 'sv11', area: 'consultations' as BenefitArea, label: 'In-person visit — Dr. Rohan Desai', date: '02 Jul 2026', listed: 1100 },
  { id: 'sv12', area: 'pharmacy' as BenefitArea, label: 'Medicine order · 7 items', date: '16 Jun 2026', listed: 1560 },
  { id: 'sv13', area: 'diagnostics' as BenefitArea, label: 'Thyroid Profile (T3, T4, TSH)', date: '30 May 2026', listed: 860 },
  { id: 'sv14', area: 'consultations' as BenefitArea, label: 'Audio consultation — Dr. Meera Nair', date: '12 May 2026', listed: 800 },
  { id: 'sv15', area: 'pharmacy' as BenefitArea, label: 'Medicine order · 2 items', date: '21 Apr 2026', listed: 740 },
  { id: 'sv16', area: 'diagnostics' as BenefitArea, label: 'Vitamin D & B12 panel', date: '09 Mar 2026', listed: 420 },
].map((r) => ({ ...r, saved: Math.round(r.listed * (planConfig.discount[r.area] / 100)) }))

/** Headline figures, summed from the ledger so the two can never disagree. */
export const totalSaved = savingsLedger.reduce((n, r) => n + r.saved, 0)

export const savedByArea = savingsLedger.reduce(
  (acc, r) => ({ ...acc, [r.area]: (acc[r.area] ?? 0) + r.saved }),
  {} as Record<BenefitArea, number>,
)
