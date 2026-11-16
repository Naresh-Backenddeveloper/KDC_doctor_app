import type { EarningsService } from '../earnings';
import { api } from './http';
import { loadBank, loadEarnings, toBank } from './sync-account';

export { maskAccount, maskPan } from '../earnings';

const FULL_MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

/** "October 2026", "This month" or "Last month" (the screen's labels and filters) → "2026-10". */
export function monthOf(period: string, now = new Date()): string {
  const m = /^([A-Za-z]+)\s+(\d{4})$/.exec(period.trim());
  const idx = m ? FULL_MONTHS.indexOf(m[1].toLowerCase()) : -1;
  if (m && idx >= 0) return `${m[2]}-${String(idx + 1).padStart(2, '0')}`;
  const back = /last month/i.test(period) ? 1 : 0;
  const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** "October 2026" for this month (offset 0) or last month (-1). */
export function monthLabel(offset = 0, now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const name = FULL_MONTHS[d.getMonth()];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${d.getFullYear()}`;
}

export interface StatementSummary {
  month: string;
  consultations: number;
  gross: number;
  commission: number;
  net: number;
  tdsDeducted: number;
  paidOut: number;
}

/** GET /doctor/statements/:month: the month's totals (the PDF is at …/pdf). */
export function fetchStatementSummary(period: string): Promise<StatementSummary> {
  return api.get<StatementSummary>(`doctor/statements/${monthOf(period)}`);
}

export const liveEarningsService: EarningsService = {
  /**
   * The app shows statements as a summary: the PDF (GET /doctor/statements/:month/pdf)
   * needs an authenticated download and a file viewer, which the app doesn't have yet.
   */
  async requestStatement(period) {
    await fetchStatementSummary(period);
  },
  /** PUT /doctor/bank-account: operations verify it before payouts use it. */
  async updateBank(u) {
    const saved = await api.put<Parameters<typeof toBank>[0]>('doctor/bank-account', {
      holder: u.holder.trim(),
      accountNumber: u.accountNumber.replace(/\s/g, ''),
      ifsc: u.ifsc.trim().toUpperCase(),
      type: u.type.toLowerCase().startsWith('current') ? 'current' : 'savings',
      pan: u.pan.trim().toUpperCase(),
    });
    void Promise.all([loadBank(), loadEarnings()]).catch(() => undefined);
    return toBank(saved);
  },
};
