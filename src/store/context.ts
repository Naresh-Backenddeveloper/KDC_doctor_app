import { DEFAULT_APPT_ID } from '../mock-data/seed';
import { LIVE } from '../services/config';
import type { Appointment, Patient } from '../types';
import { TODAY_KEY } from '../utils/date';
import { useAppointments } from './appointments';
import { useRecords } from './records';
import { useSelection } from './selection';

/**
 * Live: what a screen shows when nothing is selected and the stores are empty (a new
 * doctor, or before the first load). Blank, never a demo patient.
 */
export const NO_APPOINTMENT: Appointment = { id: '', patientId: '', mode: 'video', time: '', endTime: '', date: '', dateKey: TODAY_KEY, status: 'upcoming', reason: '', fee: 0, isFollowUp: false };
export const NO_PATIENT: Patient = { id: '', name: '', age: 0, gender: 'Male', blood: '', mobileMasked: '', city: '', conditions: [], allergies: [], lastConsult: '', consults: 0, since: '' };

/** The appointment the current screen is about; `fallback` is the blueprint default (demo). */
export function useCurrentAppointment(fallback = DEFAULT_APPT_ID) {
  const selected = useSelection((s) => s.apptId);
  const appointments = useAppointments((s) => s.appointments);
  if (LIVE) return appointments.find((a) => a.id === selected) ?? appointments[0] ?? NO_APPOINTMENT;
  return appointments.find((a) => a.id === (selected ?? fallback)) ?? appointments[2];
}

export function useCurrentPatient(fallback?: string) {
  const selected = useSelection((s) => s.patientId);
  const patients = useRecords((s) => s.patients);
  if (LIVE) {
    const id = selected ?? fallback;
    return patients.find((p) => p.id === id) ?? patients[0] ?? NO_PATIENT;
  }
  const id = selected ?? fallback ?? patients[0].id;
  return patients.find((p) => p.id === id) ?? patients[0];
}

export function useCurrentRxKey() {
  const key = useSelection((s) => s.rxKey);
  return key ?? (LIVE ? '' : DEFAULT_APPT_ID);
}
