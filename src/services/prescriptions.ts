import type { Prescription } from '../types';
import { simulate } from './mock';

export interface PrescriptionsService {
  send(rx: Prescription): Promise<{ sentAt: string }>;
}

export const mockPrescriptionsService: PrescriptionsService = {
  async send() {
    await simulate('prescriptions.send', 700);
    return { sentAt: new Date().toISOString() };
  },
};
