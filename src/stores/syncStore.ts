import { create } from 'zustand';

interface SyncState {
  pendingCount: number;
  isSyncing: boolean;
  lastSyncAt: number | null;
  syncError: string | null;
  setPendingCount: (count: number) => void;
  incrementPendingCount: () => void;
  decrementPendingCount: () => void;
  setSyncing: (syncing: boolean) => void;
  setLastSyncAt: (timestamp: number | null) => void;
  setSyncError: (error: string | null) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  pendingCount: 0,
  isSyncing: false,
  lastSyncAt: null,
  syncError: null,
  setPendingCount: (count) => set({ pendingCount: count }),
  incrementPendingCount: () =>
    set((state) => ({ pendingCount: state.pendingCount + 1 })),
  decrementPendingCount: () =>
    set((state) => ({ pendingCount: Math.max(0, state.pendingCount - 1) })),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setLastSyncAt: (timestamp) => set({ lastSyncAt: timestamp }),
  setSyncError: (error) => set({ syncError: error }),
}));

// Selectors
export const usePendingCount = () => useSyncStore((state) => state.pendingCount);
export const useIsSyncing = () => useSyncStore((state) => state.isSyncing);
export const useLastSyncAt = () => useSyncStore((state) => state.lastSyncAt);
export const useSyncError = () => useSyncStore((state) => state.syncError);
