import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { seed } from '../mock-data/seed';
import { services } from '../services';
import { verification as seedVerification } from '../mock-data/mock';
import type { DeclaredDetails, PickedFile, VerificationDocument, VerificationStatus } from '../types';
import { recordDate, TODAY_KEY } from '../utils/date';
import { persistStorage } from './storage';

interface VerificationState {
  status: VerificationStatus;
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
    (set, get) => ({
      status: seedVerification.status,
      submitted: seedVerification.submitted,
      expected: seedVerification.expected,
      rejectionReason: '',
      declared: seed.declared(),
      documents: seed.documents(),
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
      removeDocument: (docId) =>
        set((s) => ({
          documents: patchDoc(s.documents, docId, { file: '', size: '', state: 'missing', userUploaded: false, progress: undefined }),
        })),
      saveDeclared: async (declared) => {
        await services.verification.submitDeclaration(declared);
        set({ declared });
      },
      resubmit: async () => {
        await services.verification.resubmit();
        set((s) => ({
          status: 'pending',
          rejectionReason: '',
          submitted: recordDate(TODAY_KEY),
          documents: s.documents.map((d) => (d.state === 'rejected' ? { ...d, state: 'missing', file: '', size: '' } : d)),
        }));
      },
      setStatus: (status) =>
        set((s) => {
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
      partialize: ({ status, submitted, expected, rejectionReason, declared, documents }) => ({
        status, submitted, expected, rejectionReason, declared,
        // A half-finished upload does not survive a restart.
        documents: documents.map((d) => ({ ...d, progress: undefined })),
      }),
    },
  ),
);
