'use client';

import { useEffect, useRef } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { offlineSyncService, initializeSyncState } from '@/services/offlineSync';
import { useNetworkStore } from '@/stores/networkStore';
import OfflineIndicator from './OfflineIndicator';
import toast from 'react-hot-toast';

interface OfflineProviderProps {
  children: React.ReactNode;
}

export default function OfflineProvider({ children }: OfflineProviderProps) {
  // Initialize network status monitoring
  useNetworkStatus();

  // Initialize service worker
  const { isUpdateAvailable, updateServiceWorker, isRegistered } = useServiceWorker();

  // Track previous online state for notifications
  const prevOnlineRef = useRef<boolean | null>(null);

  // Initialize sync state and start auto-sync
  useEffect(() => {
    initializeSyncState();
    offlineSyncService.startAutoSync();

    return () => {
      offlineSyncService.stopAutoSync();
    };
  }, []);

  // Cache authenticated pages for offline use
  useEffect(() => {
    if (isRegistered && navigator.serviceWorker.controller) {
      // Small delay to ensure page is fully loaded
      const timer = setTimeout(() => {
        navigator.serviceWorker.controller?.postMessage({ type: 'CACHE_PAGES' });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isRegistered]);

  // Handle online/offline transitions
  useEffect(() => {
    const unsubscribe = useNetworkStore.subscribe((state) => {
      const isOnline = state.isOnline;

      // Skip first run
      if (prevOnlineRef.current === null) {
        prevOnlineRef.current = isOnline;
        return;
      }

      // Coming back online
      if (isOnline && !prevOnlineRef.current) {
        toast.success('Back online! Syncing pending forms...', {
          duration: 3000,
          icon: '🌐',
        });
        offlineSyncService.onOnline().then(({ synced }) => {
          if (synced > 0) {
            toast.success(`Synced ${synced} form${synced !== 1 ? 's' : ''} successfully!`, {
              duration: 4000,
            });
          }
        });
      }

      // Going offline
      if (!isOnline && prevOnlineRef.current) {
        toast('You are offline. Forms will be saved locally.', {
          duration: 4000,
          icon: '📴',
        });
      }

      prevOnlineRef.current = isOnline;
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle service worker updates
  useEffect(() => {
    if (isUpdateAvailable) {
      toast(
        (t) => (
          <div className="flex flex-col gap-2">
            <p className="font-medium">App update available</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  updateServiceWorker();
                  toast.dismiss(t.id);
                }}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Update now
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
              >
                Later
              </button>
            </div>
          </div>
        ),
        {
          duration: Infinity,
          position: 'top-center',
        }
      );
    }
  }, [isUpdateAvailable, updateServiceWorker]);

  return (
    <>
      {children}
      <OfflineIndicator />
    </>
  );
}
