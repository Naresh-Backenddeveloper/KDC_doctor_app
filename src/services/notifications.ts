import { simulate } from './mock';

export interface NotificationsService {
  markRead(ids: string[]): Promise<void>;
}

export const mockNotificationsService: NotificationsService = {
  async markRead() {
    await simulate('notifications.read', 150);
  },
};
