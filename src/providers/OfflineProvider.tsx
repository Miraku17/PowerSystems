'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { offlineDb, PendingSubmission } from '@/lib/offline/db';
import { removeFromQueue } from '@/lib/offline/syncQueue';
import { syncAllPending, retrySingleSubmission, SyncResult } from '@/lib/offline/syncManager';
import { useLiveQuery } from 'dexie-react-hooks';
import toast from 'react-hot-toast';

interface OfflineContextType {
  isOnline: boolean;
  pendingCount: number;
  pendingSubmissions: PendingSubmission[];
  syncAll: () => Promise<void>;
  syncOne: (localId: string) => Promise<SyncResult>;
  removePending: (localId: string) => Promise<void>;
  isSyncing: boolean;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const isAutoSyncing = useRef(false);

  const pendingSubmissions = useLiveQuery(
    () => offlineDb.pendingSubmissions.orderBy('createdAt').toArray(),
    []
  ) ?? [];

  const pendingCount = pendingSubmissions.length;

  const syncAll = useCallback(async () => {
    if (isSyncing || !navigator.onLine) return;

    setIsSyncing(true);
    const toastId = toast.loading('Syncing forms...');

    try {
      const result = await syncAllPending();

      if (result.synced > 0 && result.failed === 0) {
        toast.success(`${result.synced} form(s) synced successfully!`, { id: toastId });
      } else if (result.synced > 0 && result.failed > 0) {
        toast.success(`${result.synced} synced, ${result.failed} failed`, { id: toastId });
      } else if (result.failed > 0) {
        toast.error(`Failed to sync ${result.failed} form(s)`, { id: toastId });
      } else {
        toast.dismiss(toastId);
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Sync failed. Please try again.', { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  const syncOne = useCallback(async (localId: string): Promise<SyncResult> => {
    if (!navigator.onLine) {
      toast.error('Cannot sync while offline');
      return { success: false, localId, errorMessage: 'Offline' };
    }

    const toastId = toast.loading('Syncing form...');

    try {
      const result = await retrySingleSubmission(localId);

      if (result.success) {
        toast.success('Form synced successfully!', { id: toastId });
      } else {
        toast.error(`Sync failed: ${result.errorMessage}`, { id: toastId });
      }

      return result;
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Sync failed. Please try again.', { id: toastId });
      return { success: false, localId, errorMessage: 'Unknown error' };
    }
  }, []);

  const removePending = useCallback(async (localId: string) => {
    await removeFromQueue(localId);
    toast.success('Pending form removed');
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);

      // Auto-sync with debounce to prevent multiple triggers
      if (!isAutoSyncing.current && pendingSubmissions.length > 0) {
        isAutoSyncing.current = true;
        toast('Back online! Syncing pending forms...', { icon: '🌐' });

        // Small delay to ensure network is stable
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await syncAll();
        isAutoSyncing.current = false;
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast('You are now offline', { icon: '📴' });
    };

    // Set initial state
    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncAll, pendingSubmissions.length]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingCount,
        pendingSubmissions,
        syncAll,
        syncOne,
        removePending,
        isSyncing,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
}
