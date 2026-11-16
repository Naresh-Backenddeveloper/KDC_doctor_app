/* eslint-disable @typescript-eslint/no-require-imports -- lazy requires break import cycles between stores and live services */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { seed } from '../mock-data/seed';
import { services } from '../services';
import { verification as seedVerification } from '../mock-data/mock';
import type { DeclaredDetails, PickedFile, VerificationDocument, VerificationStatus } from '../types';
import { recordDate, TODAY_KEY } from '../utils/date';
import { persistStorage } from './storage';
import { LIVE } from '../services/config';

/** Live builds start empty; the application comes from the server (services/live/sync-account.ts). */
export const EMPTY_DECLARED: DeclaredDetails = { name: '', regNo: '', council: '', specialization: '', qualification: '', experience: 0 };

interface VerificationState {
  status: VerificationStatus;
  /** Live: the server's stage (draft, submitted, in_review, docs_requested, ready, approved, rejected). */
  serverStatus: string;
  /** Live: the doctor can send the application now (a draft, or after a documents request). */
  canSubmit: boolean;
  /** Live: what still stops submission, as the server words it. */
  missingItems: string[];
  submitted: string;
  expected: string;
  rejectionReason: string;
  declared: DeclaredDetails;
  documents: VerificationDocument[];
  uploadError: { id: string; message: string } | null;
  upload: (docId: string, file: PickedFile) => Promise<void>;
  removeDocument: (docId: string) => void;
  saveDeclared: (declared: DeclaredDetails) => Promise<void>;
  resubmit: () => Promise<void>;
  /** Demo control: lets the approved and rejected states be shown without a reviewer. */
  setStatus: (status: VerificationStatus) => void;
}

const REJECTION = 'Your profile photograph is unclear. Upload a recent, front-facing photo.';

const patchDoc = (docs: VerificationDocument[], id: string, patch: Partial<VerificationDocument>) =>
  docs.map((d) => (d.id === id ? { ...d, ...patch } : d));

export const useVerification = create<VerificationState>()(
  persist(
    (set) => ({
      status: seedVerification.status,
      serverStatus: LIVE ? 'draft' : 'submitted',
      canSubmit: false,
      missingItems: [],
      submitted: LIVE ? '' : seedVerification.submitted,
      expected: LIVE ? '' : seedVerification.expected,
      rejectionReason: '',
      declared: LIVE ? EMPTY_DECLARED : seed.declared(),
      documents: LIVE ? [] : seed.documents(),
      uploadError: null,
      upload: async (docId, file) => {
        set((s) => ({ uploadError: null, documents: patchDoc(s.documents, docId, { progress: 0 }) }));
        try {
          const uploaded = await services.verification.uploadDocument(docId, file, (pct) =>
            set((s) => ({ documents: patchDoc(s.documents, docId, { progress: pct }) })),
          );
          set((s) => ({
            documents: patchDoc(s.documents, docId, { ...uploaded, state: 'review', userUploaded: true, progress: undefined }),
          }));
        } catch (e) {
          set((s) => ({
            uploadError: { id: docId, message: e instanceof Error ? e.message : 'Upload failed' },
            documents: patchDoc(s.documents, docId, { progress: undefined }),
          }));
        }
      },
      removeDocument: (docId) => {
        if (LIVE) {
          // Live: removed on the server, then the application is reloaded.
          void Promise.resolve(require('../services/live/verification') as typeof import('../services/live/verification')).then((m) => m.removeVerificationDocument(docId)).catch((e: Error) => set({ uploadError: { id: docId, message: e.message } }));
          return;
        }
        set((s) => ({
          documents: patchDoc(s.documents, docId, { file: '', size: '', state: 'missing', userUploaded: false, progress: undefined }),
        }));
      },
      saveDeclared: async (declared) => {
        await services.verification.submitDeclaration(declared);
        set({ declared });
      },
      resubmit: async () => {
        await services.verification.resubmit();
        // Live: the service reloads the application with the server's new stage.
        if (LIVE) return;
        set((s) => ({
          status: 'pending',
          rejectionReason: '',
          submitted: recordDate(TODAY_KEY),
          documents: s.documents.map((d) => (d.state === 'rejected' ? { ...d, state: 'missing', file: '', size: '' } : d)),
        }));
      },
      // Demo only (long-press on the status card): there's no reviewer. Live: the review team decides.
      setStatus: (status) =>
        set((s) => {
          if (LIVE) return s;
          if (status === 'approved') {
            return {
              status,
              rejectionReason: '',
              documents: s.documents.map((d) => (d.state === 'missing' ? d : { ...d, state: 'verified' as const })),
            };
          }
          if (status === 'rejected') {
            return {
              status,
              rejectionReason: REJECTION,
              documents: s.documents.map((d) => (d.id === 'd3' ? { ...d, state: 'rejected' as const } : d)),
            };
          }
          return {
            status,
            rejectionReason: '',
            documents: seed.documents().map((d) => s.documents.find((x) => x.id === d.id && x.userUploaded) ?? d),
          };
        }),
    }),
    {
      name: 'verification',
      storage: persistStorage,
      partialize: ({ status, submitted, expected, rejectionReason, declared, documents }) => (LIVE ? {} : {
        status, submitted, expected, rejectionReason, declared,
        // A half-finished upload does not survive a restart.
        documents: documents.map((d) => ({ ...d, progress: undefined })),
      }),
    },
  ),
);
