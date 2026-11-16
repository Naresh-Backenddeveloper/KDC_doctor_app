import type { VerificationService } from '../verification';
import { ServiceError } from '../mock';
import { api, request, upload } from './http';
import { formatSize, loadVerification } from './sync-account';

/**
 * Documents are uploaded (POST /files, purpose doctor_document) and attached by type;
 * the app's document ids are the backend's types (registration, qualification, photo,
 * government_id, other). The declaration names the council and specialty, which the
 * server takes by id: they're matched by name against the public lists.
 */
export const liveVerificationService: VerificationService = {
  async uploadDocument(docId, file, onProgress) {
    onProgress(0);
    const uploaded = await upload('doctor_document', file, onProgress);
    await api.put(`doctor/verification/documents/${encodeURIComponent(docId)}`, { fileId: uploaded.id });
    void loadVerification().catch(() => undefined);
    return { file: uploaded.name, size: formatSize(uploaded.sizeBytes) };
  },
  async submitDeclaration(details) {
    const [councils, specialties] = await Promise.all([
      request<{ id: number; name: string }[]>('GET', 'public/councils', undefined, { auth: false }),
      request<{ id: number; name: string; practitionerTitle: string }[]>('GET', 'public/specialties', undefined, { auth: false }),
    ]);
    const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
    const council = councils.find((c) => same(c.name, details.council));
    if (!council) throw new ServiceError('invalid', 'Choose your medical council from the list.', 'council');
    const specialty = specialties.find((s) => same(s.name, details.specialization) || same(s.practitionerTitle, details.specialization));
    if (!specialty) throw new ServiceError('invalid', 'Choose your specialization from the list.', 'specialization');
    await api.put('doctor/verification/declaration', {
      name: details.name.trim(),
      regNo: details.regNo.trim(),
      councilId: council.id,
      primarySpecialtyId: specialty.id,
      qualification: details.qualification.trim(),
      experienceYears: details.experience,
    });
    await loadVerification();
  },
  /** Sends the application for review (or back, after a documents request). The server lists anything missing. */
  async resubmit() {
    await api.post('doctor/verification/submit', {});
    await loadVerification();
  },
};

/** Removes an attached document before submission. */
export async function removeVerificationDocument(docId: string): Promise<void> {
  await api.del(`doctor/verification/documents/${encodeURIComponent(docId)}`);
  await loadVerification();
}
