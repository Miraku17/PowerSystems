'use client';

import { useEffect, useState } from 'react';
import { useIsOnline } from '@/stores/networkStore';
import { usePendingCount, useIsSyncing } from '@/stores/syncStore';
import {
  WifiIcon,
  SignalSlashIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function OfflineIndicator() {
  const isOnline = useIsOnline();
  const pendingCount = usePendingCount();
  const isSyncing = useIsSyncing();
  const [showBanner, setShowBanner] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Show banner when offline or when we have pending items
    if (!isOnline) {
      setShowBanner(true);
      setWasOffline(true);
    } else if (wasOffline && pendingCount > 0) {
      // Still show banner if we just came back online and have pending items
      setShowBanner(true);
    } else if (pendingCount === 0 && wasOffline) {
      // Hide banner after all items synced
      const timer = setTimeout(() => {
        setShowBanner(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingCount, wasOffline]);

  // Also show if there are pending items even if we never went offline this session
  useEffect(() => {
    if (pendingCount > 0) {
      setShowBanner(true);
    }
  }, [pendingCount]);

  if (!showBanner && pendingCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          !isOnline
            ? 'bg-amber-500 text-white'
            : isSyncing
              ? 'bg-blue-500 text-white'
              : pendingCount > 0
                ? 'bg-orange-500 text-white'
                : 'bg-green-500 text-white'
        }`}
      >
        {!isOnline ? (
          <>
            <SignalSlashIcon className="h-5 w-5" />
            <div>
              <p className="font-medium text-sm">You&apos;re offline</p>
              {pendingCount > 0 && (
                <p className="text-xs opacity-90">
                  {pendingCount} form{pendingCount !== 1 ? 's' : ''} saved locally
                </p>
              )}
            </div>
          </>
        ) : isSyncing ? (
          <>
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
            <div>
              <p className="font-medium text-sm">Syncing forms...</p>
              <p className="text-xs opacity-90">
                {pendingCount} remaining
              </p>
            </div>
          </>
        ) : pendingCount > 0 ? (
          <>
            <CloudArrowUpIcon className="h-5 w-5" />
            <div>
              <p className="font-medium text-sm">
                {pendingCount} form{pendingCount !== 1 ? 's' : ''} pending
              </p>
              <Link
                href="/dashboard/pending-forms"
                className="text-xs underline opacity-90 hover:opacity-100"
              >
                View pending forms
              </Link>
            </div>
          </>
        ) : (
          <>
            <WifiIcon className="h-5 w-5" />
            <p className="font-medium text-sm">All forms synced</p>
          </>
        )}
      </div>
    </div>
  );
}
