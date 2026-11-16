import type { SupportService } from '../support';
import { api } from './http';
import { loadTicket } from './sync-account';

/** Support tickets (/me/support-tickets). The app's form has no topic picker, so tickets are filed under "Other". */
export const liveSupportService: SupportService = {
  async reply(ticketId, text) {
    await api.post(`me/support-tickets/${encodeURIComponent(ticketId)}/messages`, { text });
    await loadTicket(ticketId);
  },
  async create(subject, description) {
    const t = await api.post<{ id: string }>('me/support-tickets', { subject: subject.trim(), category: 'Other', description: description.trim() });
    await loadTicket(t.id);
    return { id: t.id };
  },
};
