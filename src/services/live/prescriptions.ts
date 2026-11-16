import { knownMedicine } from '../../domain/medicines';
import { ServiceError } from '../mock';
import type { PrescriptionsService } from '../prescriptions';
import type { Prescription } from '../../types';
import { api } from './http';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Mon, 2 Nov 2026" (the app's follow-up label) → "2026-11-02". */
export function keyOfLongDate(label: string): string | undefined {
  const m = /(\d{1,2})\s+([A-Za-z]{3})\w*\s+(\d{4})/.exec(label);
  if (!m) return undefined;
  const month = MONTHS.indexOf(m[2].slice(0, 3));
  return month < 0 ? undefined : `${m[3]}-${String(month + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

/** The appointment a prescription belongs to: every prescription is written in a consultation. */
export function consultationOf(rx: Pick<Prescription, 'apptId' | 'key'>): string | undefined {
  if (rx.apptId) return rx.apptId;
  return rx.key.startsWith('pt:') ? undefined : rx.key;
}

export const NO_CONSULTATION =
  'Prescriptions are written in a consultation. Open the patient’s appointment (or start one) and write it there.';

/** The body of PUT /doctor/consultations/:code/prescription. */
export function draftBody(rx: Prescription) {
  const followDate = rx.followUp.required ? keyOfLongDate(rx.followUp.date) : undefined;
  return {
    diagnosis: rx.diagnosis.map((d) => d.trim()).filter((d) => d.length >= 2),
    items: rx.medicines.map((m) => {
      const known = knownMedicine(m.name);
      return {
        ...(known ? { medicineCode: known.code } : {}),
        name: m.name.trim(),
        ...(m.strength.trim() ? { strength: m.strength.trim() } : {}),
        // The composition: the allergy check on the server reads it.
        generic: (known?.salts.length ? known.salts.join(' + ') : known?.generic || m.name).slice(0, 200),
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        ...(m.food ? { food: m.food } : {}),
        ...(m.instructions?.trim() ? { instructions: m.instructions.trim().slice(0, 240) } : {}),
        ...(m.allergyOverride ? { allergyOverride: { allergens: m.allergyOverride.allergens, reason: m.allergyOverride.reason, confirmed: true } } : {}),
      };
    }),
    advice: rx.advice.map((a) => a.trim()).filter((a) => a.length >= 2),
    investigations: rx.investigations.map((a) => a.trim()).filter((a) => a.length >= 2),
    followUp: {
      required: rx.followUp.required,
      ...(followDate ? { date: followDate } : {}),
      ...(rx.followUp.required ? { mode: rx.followUp.mode } : {}),
      ...(rx.followUp.note?.trim() ? { note: rx.followUp.note.trim().slice(0, 240) } : {}),
    },
  };
}

interface DraftReply {
  code: string;
  conflicts: { medicine: string; allergen: string; overridden: boolean }[];
}

/**
 * Live: save the draft on the consultation, then issue it. The server runs the allergy
 * check again; an unresolved conflict stops the send with its own message. Issuing also
 * completes the consultation. Resolves with the prescription's code as well.
 */
export const livePrescriptionsService: PrescriptionsService = {
  async send(rx) {
    const appointment = consultationOf(rx);
    if (!appointment) throw new ServiceError('no_consultation', NO_CONSULTATION);
    const draft = await api.put<DraftReply>(`doctor/consultations/${encodeURIComponent(appointment)}/prescription`, draftBody(rx));
    const open = draft.conflicts.filter((c) => !c.overridden);
    if (open.length) {
      throw new ServiceError('allergy', `Allergy not overridden: ${open.map((c) => `${c.medicine} — ${c.allergen}`).join('; ')}. Edit the medicine to continue.`);
    }
    const issued = await api.post<{ code: string; issuedAt: string | null }>(`doctor/consultations/${encodeURIComponent(appointment)}/prescription/issue`, {});
    return { sentAt: issued.issuedAt ?? new Date().toISOString(), code: issued.code } as { sentAt: string };
  },
};
