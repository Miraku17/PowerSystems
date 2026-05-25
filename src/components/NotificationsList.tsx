"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Notification, useNotificationsStore } from '@/stores/notificationsStore';

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m} min${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  if (d < 30)  return `${d} day${d === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
}

interface NotificationsListProps {
  notifications: Notification[];
  onItemClick?: () => void;
  emptyText?: string;
}

export default function NotificationsList({
  notifications,
  onItemClick,
  emptyText = "You're all caught up 🎉",
}: NotificationsListProps) {
  const router = useRouter();
  const markRead = useNotificationsStore(s => s.markRead);

  if (notifications.length === 0) {
    return <div className="px-4 py-8 text-center text-sm text-gray-500">{emptyText}</div>;
  }

  return (
    <ul className="divide-y divide-gray-100">
      {notifications.map(n => {
        const unread = !n.read_at;
        return (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => {
                if (unread) markRead(n.id);
                onItemClick?.();
                if (n.link) router.push(n.link);
              }}
              className={`w-full text-left px-4 py-3 hover:bg-blue-50/60 transition-colors flex items-start gap-3 ${unread ? 'bg-blue-50/30' : ''}`}
            >
              <div className="flex-shrink-0 mt-1">
                {unread
                  ? <span className="block w-2 h-2 rounded-full bg-blue-600" />
                  : <span className="block w-2 h-2" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm text-gray-900 ${unread ? 'font-semibold' : 'font-normal'}`}>{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{relativeTime(n.created_at)}</p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
