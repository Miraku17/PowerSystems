"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BellIcon } from '@heroicons/react/24/outline';
import { useNotificationsStore } from '@/stores/notificationsStore';
import NotificationsList from './NotificationsList';

const DROPDOWN_LIMIT = 10;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAllRead } = useNotificationsStore();

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const recent = notifications.slice(0, DROPDOWN_LIMIT);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="relative p-1.5 text-blue-100/80 hover:text-white hover:bg-white/10 rounded-md transition-colors"
        aria-label="Notifications"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] bg-white rounded-lg shadow-2xl border border-gray-200 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-gray-900">Notifications</h4>
            <button
              type="button"
              onClick={() => markAllRead()}
              disabled={unreadCount === 0}
              className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Mark all as read
            </button>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            <NotificationsList notifications={recent} onItemClick={() => setOpen(false)} />
          </div>
          <div className="border-t border-gray-100">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="block px-4 py-3 text-center text-sm font-medium text-blue-600 hover:bg-blue-50/60 transition-colors"
            >
              See all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
