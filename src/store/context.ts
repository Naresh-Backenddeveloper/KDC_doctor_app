import { DEFAULT_APPT_ID } from '../mock-data/seed';
import { useAppointments } from './appointments';
import { useRecords } from './records';
import { useSelection } from './selection';

/** The appointment the current screen is about; `fallback` is the blueprint default. */
export function useCurrentAppointment(fallback = DEFAULT_APPT_ID) {
  const selected = useSelection((s) => s.apptId);
  const appointments = useAppointments((s) => s.appointments);
  return appointments.find((a) => a.id === (selected ?? fallback)) ?? appointments[2];
}

export function useCurrentPatient(fallback?: string) {
  const selected = useSelection((s) => s.patientId);
  const patients = useRecords((s) => s.patients);
  const id = selected ?? fallback ?? patients[0].id;
  return patients.find((p) => p.id === id) ?? patients[0];
}

export function useCurrentRxKey() {
  return useSelection((s) => s.rxKey) ?? DEFAULT_APPT_ID;
}
