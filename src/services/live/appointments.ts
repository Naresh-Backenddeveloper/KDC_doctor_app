import type { AppointmentsService } from '../appointments';
import { api } from './http';
import { loadAppointments, to24 } from './sync-schedule';

/** Doctor-initiated cancellations need a reason the patient sees. */
const DOCTOR_CANCEL = 'Cancelled by the doctor';

export const liveAppointmentsService: AppointmentsService = {
  list: () => loadAppointments(),
  /**
   * The app's single status setter, on the server's actions: cancel, no-show, start.
   * Completion happens when the prescription is issued (or the consultation completed),
   * so "completed" here is already done server-side.
   */
  async update(id, patch) {
    const code = encodeURIComponent(id);
    if (patch.status === 'cancelled') await api.post(`doctor/appointments/${code}/cancel`, { reason: patch.reason?.trim() || DOCTOR_CANCEL });
    else if (patch.status === 'no-show') await api.post(`doctor/appointments/${code}/no-show`, {});
    else if (patch.status === 'in-progress') await api.post(`doctor/consultations/${code}/start`, {});
  },
  async setOnDuty(on) {
    await api.put('doctor/duty', { onDuty: on });
  },
  async reschedule(id, date) {
    await api.post(`doctor/appointments/${encodeURIComponent(id)}/reschedule`, { date: date.key, time: to24(date.time) });
  },
  async notifyRunningLate(minutes) {
    await api.put('doctor/running-late', { minutes: Math.max(0, Math.min(120, Math.round(minutes))) });
  },
};
