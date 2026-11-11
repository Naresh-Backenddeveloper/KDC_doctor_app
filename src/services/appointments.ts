import type { Appointment } from '../types';
import { seed } from '../mock-data/seed';
import { simulate } from './mock';

export interface AppointmentsService {
  list(): Promise<Appointment[]>;
  update(id: string, patch: Partial<Appointment>): Promise<void>;
  setOnDuty(on: boolean): Promise<void>;
  reschedule(id: string, date: { key: string; label: string; time: string; endTime: string }): Promise<void>;
  notifyRunningLate(minutes: number): Promise<void>;
}

export const mockAppointmentsService: AppointmentsService = {
  async list() {
    await simulate('appointments.list', 700);
    return seed.appointments();
  },
  async update() {
    await simulate('appointments.update', 250);
  },
  async setOnDuty() {
    await simulate('appointments.duty', 200);
  },
  async reschedule() {
    await simulate('appointments.reschedule', 400);
  },
  async notifyRunningLate() {
    await simulate('appointments.late', 400);
  },
};
