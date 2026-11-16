import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { seed } from '../mock-data/seed';
import { services } from '../services';
import type { DoctorNotification } from '../types';
import { nowTime } from '../utils/date';
import { persistStorage } from './storage';
import { LIVE } from '../services/config';

interface NotificationsState {
  items: DoctorNotification[];
  unreadCount: () => number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  add: (n: Pick<DoctorNotification, 'category' | 'title' | 'body' | 'action' | 'screen'>) => void;
}

export const useNotifications = create<NotificationsState>()(
  persist(
    (set, get) => ({
      items: LIVE ? [] : seed.notifications(),
      unreadCount: () => get().items.filter((n) => n.unread).length,
      markRead: (id) => {
        if (!get().items.find((n) => n.id === id)?.unread) return;
        set((s) => ({ items: s.items.map((n) => (n.id === id ? { ...n, unread: false } : n)) }));
        services.notifications.markRead([id]).catch(() => undefined);
      },
      markAllRead: () => {
        const ids = get().items.filter((n) => n.unread).map((n) => n.id);
        set((s) => ({ items: s.items.map((n) => ({ ...n, unread: false })) }));
        services.notifications.markRead(ids).catch(() => undefined);
      },
      // Live: the inbox is only what the server sent (it's reloaded); nothing local is added.
      add: (n) => {
        if (LIVE) return;
        set((s) => ({ items: [{ id: `n-${Date.now()}`, group: 'Today', time: nowTime(), unread: true, ...n }, ...s.items] }));
      },
    }),
    { name: 'notifications', storage: persistStorage, partialize: ({ items }) => (LIVE ? {} : { items }) },
  ),
);
