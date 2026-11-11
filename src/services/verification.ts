import type { DeclaredDetails, PickedFile } from '../types';
import { mockControl, simulate } from './mock';

export interface VerificationService {
  uploadDocument(docId: string, file: PickedFile, onProgress: (pct: number) => void): Promise<{ file: string; size: string }>;
  submitDeclaration(details: DeclaredDetails): Promise<void>;
  resubmit(): Promise<void>;
}

export function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export const mockVerificationService: VerificationService = {
  async uploadDocument(docId, file, onProgress) {
    for (const pct of [15, 40, 65, 85, 100]) {
      if (mockControl.latency > 0) await new Promise<void>((r) => setTimeout(r, 180 * mockControl.latency));
      onProgress(pct);
    }
    await simulate(`verification.upload.${docId}`, 120);
    return { file: file.name, size: formatSize(file.size) };
  },
  async submitDeclaration() {
    await simulate('verification.declare', 500);
  },
  async resubmit() {
    await simulate('verification.resubmit', 500);
  },
};
