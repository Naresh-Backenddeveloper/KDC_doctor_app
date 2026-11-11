import type { ConsultationDraft } from '../types';
import { simulate } from './mock';

export interface RecordsService {
  markReportReviewed(id: string, note: string): Promise<void>;
  saveConsultationDraft(draft: ConsultationDraft): Promise<void>;
}

export const mockRecordsService: RecordsService = {
  async markReportReviewed() {
    await simulate('records.reviewed', 300);
  },
  async saveConsultationDraft() {
    await simulate('records.draft', 200);
  },
};
