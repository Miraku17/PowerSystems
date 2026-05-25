import { create } from 'zustand';
import apiClient from '@/lib/axios';

export interface Notification {
  id: string;
  event_type: string;
  title: string;
  link: string | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isLoaded: boolean;

  fetch: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  pushIncoming: (n: Notification) => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoaded: false,

  fetch: async () => {
    try {
      const resp = await apiClient.get('/notifications');
      const data = resp.data as { unread_count: number; notifications: Notification[] };
      set({
        notifications: data.notifications,
        unreadCount: data.unread_count,
        isLoaded: true,
      });
    } catch (err) {
      console.error('notifications fetch failed:', err);
    }
  },

  markRead: async (id) => {
    // Optimistic update
    const now = new Date().toISOString();
    const before = get().notifications;
    const target = before.find(n => n.id === id);
    if (!target || target.read_at) return;
    set({
      notifications: before.map(n => n.id === id ? { ...n, read_at: now } : n),
      unreadCount: Math.max(0, get().unreadCount - 1),
    });
    try {
      await apiClient.patch(`/notifications/${id}/read`);
    } catch (err) {
      console.error('markRead failed, reverting:', err);
      set({ notifications: before, unreadCount: get().unreadCount + 1 });
    }
  },

  markAllRead: async () => {
    const before = get().notifications;
    const beforeCount = get().unreadCount;
    const now = new Date().toISOString();
    set({
      notifications: before.map(n => n.read_at ? n : { ...n, read_at: now }),
      unreadCount: 0,
    });
    try {
      await apiClient.post('/notifications/read-all');
    } catch (err) {
      console.error('markAllRead failed, reverting:', err);
      set({ notifications: before, unreadCount: beforeCount });
    }
  },

  pushIncoming: (n) => {
    const existing = get().notifications;
    if (existing.some(x => x.id === n.id)) return;
    set({
      notifications: [n, ...existing],
      unreadCount: get().unreadCount + (n.read_at ? 0 : 1),
    });
  },
}));
