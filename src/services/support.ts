import type { SupportTicket } from '../types';
import { simulate } from './mock';

export interface SupportService {
  reply(ticketId: string, text: string): Promise<void>;
  create(subject: string, description: string): Promise<Pick<SupportTicket, 'id'>>;
}

export const mockSupportService: SupportService = {
  async reply() {
    await simulate('support.reply', 300);
  },
  async create() {
    await simulate('support.create', 450);
    return { id: `KDC-ST-${4500 + Math.floor(Math.random() * 400)}` };
  },
};
