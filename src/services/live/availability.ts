import type { AvailabilityService } from '../availability';
import type { BlockedTime, WorkingDay } from '../../types';
import { useAvailability } from '../../store/availability';
import { api } from './http';
import { to24, weekdayOf, type ApiBlock } from './sync-schedule';

/** PUT /doctor/availability: the weekly sessions, slot length and break (the server checks overlaps and offered modes). */
export async function saveScheduleLive(week: WorkingDay[], duration: number, breakFrom?: string, breakTo?: string) {
  await api.put('doctor/availability', {
    slotMinutes: duration,
    breakFrom: breakFrom ? to24(breakFrom) : null,
    breakTo: breakTo ? to24(breakTo) : null,
    days: week
      .filter((d) => d.on && d.sessions.length)
      .map((d) => ({ weekday: weekdayOf(d.short), sessions: d.sessions.map((s) => ({ from: to24(s.from), to: to24(s.to) })), modes: d.modes })),
  });
}

/** POST /doctor/blocks. The server cancels and refunds appointments inside the block; their codes come back. */
export async function addBlockLive(block: BlockedTime): Promise<ApiBlock & { cancelledAppointments: string[] }> {
  return api.post('doctor/blocks', {
    reason: block.reason.toLowerCase(),
    fromDate: block.fromKey,
    toDate: block.toKey,
    allDay: block.allDay,
    ...(block.allDay ? {} : { startTime: to24(block.from ?? ''), endTime: to24(block.to ?? '') }),
    ...(block.note ? { note: block.note } : {}),
  });
}

export const liveAvailabilityService: AvailabilityService = {
  async saveSchedule(week, duration) {
    const { breakFrom, breakTo } = useAvailability.getState();
    await saveScheduleLive(week, duration, breakFrom, breakTo);
  },
  async addBlock(block) {
    await addBlockLive(block);
  },
  async removeBlock(id) {
    await api.del(`doctor/blocks/${encodeURIComponent(id)}`);
  },
};
