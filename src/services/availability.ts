import type { BlockedTime, WorkingDay } from '../types';
import { simulate } from './mock';

export interface AvailabilityService {
  saveSchedule(week: WorkingDay[], duration: number): Promise<void>;
  addBlock(block: BlockedTime): Promise<void>;
  removeBlock(id: string): Promise<void>;
}

export const mockAvailabilityService: AvailabilityService = {
  async saveSchedule() {
    await simulate('availability.save', 400);
  },
  async addBlock() {
    await simulate('availability.block', 450);
  },
  async removeBlock() {
    await simulate('availability.unblock', 250);
  },
};
