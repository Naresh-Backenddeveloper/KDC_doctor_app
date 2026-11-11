import type { DoctorProfile, Qualification } from '../types';
import { simulate } from './mock';

export interface ProfileService {
  save(patch: Partial<DoctorProfile>): Promise<void>;
  saveQualifications(items: Qualification[]): Promise<void>;
}

export const mockProfileService: ProfileService = {
  async save() {
    await simulate('profile.save', 400);
  },
  async saveQualifications() {
    await simulate('profile.qualifications', 300);
  },
};
