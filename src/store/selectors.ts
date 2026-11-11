import { minutesOf, TODAY_KEY, addDays, daysBetween } from '../utils/date';
import type { Appointment, BlockedTime, Mode, WorkingDay } from '../types';

export type ApptTab = 'today' | 'upcoming' | 'completed' | 'cancelled';

export interface ApptFilters {
  modes: Mode[];
  visit: 'all' | 'new' | 'followup';
}

export const NO_FILTERS: ApptFilters = { modes: [], visit: 'all' };

/** The blueprint's day totals count four morning consultations that predate the list. */
export const EARLIER_COMPLETED = 4;

export const isToday = (a: Pick<Appointment, 'dateKey'>) => a.dateKey === TODAY_KEY;
const byTime = (a: Appointment, b: Appointment) => minutesOf(a.time) - minutesOf(b.time);
const byDateThenTime = (a: Appointment, b: Appointment) => a.dateKey.localeCompare(b.dateKey) || byTime(a, b);

export const todaysAppointments = (appts: Appointment[]) => appts.filter(isToday).sort(byTime);

export function summarize(appts: Appointment[]) {
  const today = appts.filter(isToday);
  const count = (...s: Appointment['status'][]) => today.filter((a) => s.includes(a.status)).length;
  return {
    total: today.filter((a) => a.status !== 'cancelled' && a.status !== 'no-show').length + EARLIER_COMPLETED,
    waiting: count('waiting'),
    completed: count('completed') + EARLIER_COMPLETED,
    upcoming: count('upcoming'),
  };
}

export function applyFilters(appts: Appointment[], f: ApptFilters) {
  return appts.filter(
    (a) => (f.modes.length === 0 || f.modes.includes(a.mode)) && (f.visit === 'all' || (f.visit === 'followup') === a.isFollowUp),
  );
}

export function appointmentsForTab(appts: Appointment[], tab: ApptTab, f: ApptFilters = NO_FILTERS) {
  const list = applyFilters(appts, f);
  switch (tab) {
    case 'today':
      return list.filter(isToday).sort(byTime);
    case 'upcoming':
      return list.filter((a) => a.dateKey > TODAY_KEY && a.status === 'upcoming').sort(byDateThenTime);
    case 'completed':
      return list.filter((a) => a.status === 'completed').sort((a, b) => b.dateKey.localeCompare(a.dateKey) || byTime(a, b));
    case 'cancelled':
      return list.filter((a) => a.status === 'cancelled' || a.status === 'no-show').sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }
}

export const tabCount = (appts: Appointment[], tab: ApptTab) => appointmentsForTab(appts, tab).length;

export const appointmentsOnDay = (appts: Appointment[], key: string) =>
  appts.filter((a) => a.dateKey === key && a.status !== 'cancelled' && a.status !== 'no-show').sort(byTime);

/** The next patient still to be seen today, optionally skipping the one just closed. */
export const nextUpcoming = (appts: Appointment[], excludeId?: string) =>
  todaysAppointments(appts).find((a) => a.status === 'upcoming' && a.id !== excludeId);

/** Booked (not yet closed) appointments that fall inside a proposed block. */
export function affectedByBlock(
  appts: Appointment[],
  block: { fromKey: string; toKey: string; allDay: boolean; from?: string; to?: string },
) {
  const start = block.from ? minutesOf(block.from) : 0;
  const end = block.to ? minutesOf(block.to) : 24 * 60;
  return appts
    .filter((a) => {
      if (a.dateKey < block.fromKey || a.dateKey > block.toKey) return false;
      if (a.status !== 'upcoming' && a.status !== 'waiting') return false;
      if (block.allDay) return true;
      return minutesOf(a.time) < end && minutesOf(a.endTime) > start;
    })
    .sort(byDateThenTime);
}

export const bookedThisWeek = (appts: Appointment[]) =>
  appts.filter((a) => {
    const diff = daysBetween(TODAY_KEY, a.dateKey);
    return a.status === 'upcoming' && diff > 0 && diff <= 6;
  }).length;

export const blockedDayKeys = (blocked: BlockedTime[]) => {
  const keys = new Set<string>();
  blocked.forEach((b) => {
    if (!b.allDay) return;
    for (let d = b.fromKey; d <= b.toKey; d = addDays(d, 1)) keys.add(d);
  });
  return keys;
};

export function slotSummary(day: WorkingDay | undefined, duration: number, activeToday: number) {
  const minutes = (day?.sessions ?? []).reduce((sum, s) => sum + (minutesOf(s.to) - minutesOf(s.from)), 0);
  // Calibrated so the default eight-hour Monday at 15 minutes reads 18 bookable slots.
  const total = Math.round((18 * 15 * (minutes / 480)) / duration);
  const booked = Math.max(0, 9 + (activeToday - 8));
  const blocked = Math.min(2, total);
  return { total, booked: Math.min(booked, total), blocked, open: Math.max(0, total - booked - blocked) };
}
