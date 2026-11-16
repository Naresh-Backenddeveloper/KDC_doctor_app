import { LIVE } from '../services/config';

/** Today's date key (YYYY-MM-DD, device time). */
export function localTodayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * "Today". Live: the real date when the app started (the loading screen refreshes the
 * data each launch). Demo: the prototype's fixed day, which the seed data hangs off.
 */
export const TODAY_KEY = LIVE ? localTodayKey() : '2026-10-05';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(key: string, days: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + days);
  return toKey(d);
}

export function daysBetween(fromKey: string, toKeyValue: string): number {
  return Math.round((parseKey(toKeyValue).getTime() - parseKey(fromKey).getTime()) / 86400000);
}

/** "Mon, 12 Oct 2026" */
export function longDate(key: string): string {
  const d = parseKey(key);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "12 Oct" */
export function shortDate(key: string): string {
  const d = parseKey(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "05 Oct 2026" */
export function recordDate(key: string): string {
  const d = parseKey(key);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "October 2026" */
export function monthYear(d: Date): string {
  return `${FULL_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Mon, 2 Nov 2026" → "2 November" */
export function dayMonthLong(label: string): string {
  const m = label.match(/(\d{1,2}) (\w{3})/);
  if (!m) return label;
  const month = FULL_MONTHS[MONTHS.indexOf(m[2])] ?? m[2];
  return `${m[1]} ${month}`;
}

/** Date picker rows, keyed so a sheet can show labels and hand back the day. */
export function dateOptions(count = 90, startKey = TODAY_KEY): { key: string; label: string }[] {
  return Array.from({ length: count }, (_, i) => {
    const key = addDays(startKey, i);
    return { key, label: longDate(key) };
  });
}

export const keyOfLabel = (label: string, options: { key: string; label: string }[]) =>
  options.find((o) => o.label === label)?.key;

/** "09:00 AM" → minutes since midnight. */
export function minutesOf(time: string): number {
  const m = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return 0;
  const h = (Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0);
  return h * 60 + Number(m[2]);
}

export function timeLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** Half-hour steps across the working day. */
export const TIME_OPTIONS = Array.from({ length: 33 }, (_, i) => timeLabel(6 * 60 + i * 30));

export function clock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function nowTime(): string {
  const d = new Date();
  const h = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
}
