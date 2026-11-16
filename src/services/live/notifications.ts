import type { NotificationsService } from '../notifications';
import { api } from './http';

/** The doctor's inbox (/me/notifications): one call per notification, or "all read" when many. */
export const liveNotificationsService: NotificationsService = {
  async markRead(ids) {
    if (ids.length > 3) {
      await api.post('me/notifications/read-all', {});
      return;
    }
    await Promise.all(ids.map((id) => api.post(`me/notifications/${encodeURIComponent(id)}/read`, { read: true })));
  },
};
