"use client";

import React, { useState } from 'react';
import { useNotificationsStore } from '@/stores/notificationsStore';
import NotificationsList from '@/components/NotificationsList';

type Tab = 'all' | 'unread';

export default function NotificationsPage() {
  const [tab, setTab] = useState<Tab>('all');
  const { notifications, unreadCount, markAllRead } = useNotificationsStore();

  const visible = tab === 'unread' ? notifications.filter(n => !n.read_at) : notifications;

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
        <button
          type="button"
          onClick={() => markAllRead()}
          disabled={unreadCount === 0}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          Mark all as read ({unreadCount})
        </button>
      </div>
      <div className="px-6 pt-3 border-b border-gray-100 flex gap-4">
        {(['all', 'unread'] as Tab[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`pb-3 text-sm capitalize border-b-2 transition-colors ${
              tab === t
                ? 'border-blue-600 text-blue-700 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <NotificationsList notifications={visible} />
    </div>
  );
}
