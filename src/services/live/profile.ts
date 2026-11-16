import type { ProfileService } from '../profile';
import type { DoctorProfile, Qualification } from '../../types';
import { ServiceError } from '../mock';
import { api } from './http';
import { loadProfile } from './sync-account';

/**
 * PATCH /doctor/me takes practice, contact, fees and consultation types. Name,
 * registration, council, specialty and qualification are part of the verification
 * declaration (services/live/verification.ts) and aren't sent from here.
 */
function body(p: Partial<DoctorProfile>) {
  const out: Record<string, unknown> = {};
  const text = (v: string | undefined) => (v === undefined ? undefined : v.trim() || null);
  if (p.title !== undefined) out.title = text(p.title);
  if (p.subSpecialization !== undefined) out.subSpecialty = p.subSpecialization === 'None' ? null : text(p.subSpecialization);
  if (p.experience !== undefined) out.experienceYears = p.experience;
  if (p.languages !== undefined) out.languages = p.languages;
  if (p.about !== undefined) out.about = text(p.about);
  if (p.hospital !== undefined) out.hospital = text(p.hospital);
  if (p.clinic !== undefined) out.clinicName = text(p.clinic);
  if (p.address !== undefined) out.clinicAddress = text(p.address);
  if (p.city !== undefined) out.city = text(p.city);
  if (p.pin !== undefined) out.pincode = text(p.pin);
  if (p.clinicPhone !== undefined) out.clinicPhone = p.clinicPhone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '') || null;
  if (p.email !== undefined) out.email = text(p.email);
  if (p.fees !== undefined) out.fees = { video: p.fees.video, audio: p.fees.audio, clinic: p.fees.clinic };
  if (p.modesEnabled !== undefined) out.modes = { ...p.modesEnabled };
  else if (p.acceptsInPerson !== undefined) out.modes = { clinic: p.acceptsInPerson };
  if (p.freeFollowUp !== undefined) out.freeFollowUp = p.freeFollowUp;
  return out;
}

/** "2009 – 2012" or "2016 – Present". */
function years(text: string): { yearFrom: number; yearTo: number | null } {
  const [from, to] = text.split(/\s*[–-]\s*/);
  const yearFrom = Number(from);
  if (!Number.isInteger(yearFrom)) throw new ServiceError('invalid', `“${text}” isn’t a year range like 2009 – 2012.`, 'years');
  const yearTo = !to || /present/i.test(to) ? null : Number(to);
  if (yearTo !== null && !Number.isInteger(yearTo)) throw new ServiceError('invalid', `“${text}” isn’t a year range like 2009 – 2012.`, 'years');
  return { yearFrom, yearTo };
}

export const liveProfileService: ProfileService = {
  async save(patch) {
    const b = body(patch);
    if (Object.keys(b).length) await api.patch('doctor/me', b);
    await loadProfile();
  },
  async saveQualifications(items: Qualification[]) {
    await api.put('doctor/me/qualifications', { items: items.map((q) => ({ degree: q.degree.trim(), institution: q.org.trim(), ...years(q.years) })) });
    await loadProfile();
  },
};
