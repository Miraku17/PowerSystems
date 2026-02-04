import apiClient from '@/lib/axios';
import {
  getPendingSubmissions,
  getPendingSubmission,
  updatePendingSubmission,
  removePendingSubmission,
  getPendingCount,
  storableToFile,
  PendingSubmission,
  FormType,
} from '@/lib/offlineDb';
import { useSyncStore } from '@/stores/syncStore';
import { useNetworkStore } from '@/stores/networkStore';

// Map form types to their respective endpoints
const formTypeEndpoints: Record<FormType, string> = {
  'deutz-commissioning': '/forms/deutz-commissioning',
  'deutz-service': '/forms/deutz-service',
  'engine-teardown': '/forms/engine-teardown',
  'electric-surface-pump-teardown': '/forms/electric-surface-pump-teardown',
  'electric-surface-pump-service': '/forms/electric-surface-pump-service',
  'electric-surface-pump-commissioning': '/forms/electric-surface-pump-commissioning',
  'engine-surface-pump-service': '/forms/engine-surface-pump-service',
  'engine-surface-pump-commissioning': '/forms/engine-surface-pump-commissioning',
  'submersible-pump-commissioning': '/forms/submersible-pump-commissioning',
  'submersible-pump-service': '/forms/submersible-pump-service',
  'submersible-pump-teardown': '/forms/submersible-pump-teardown',
  'engine-inspection-receiving': '/forms/engine-inspection-receiving',
  'components-teardown-measuring': '/forms/components-teardown-measuring',
  'job-order-request': '/forms/job-order-request',
};

// Retry delays in milliseconds (exponential backoff)
const RETRY_DELAYS = [1000, 5000, 30000, 60000, 300000]; // 1s, 5s, 30s, 1min, 5min
const MAX_RETRIES = 5;

class OfflineSyncService {
  private isSyncing = false;
  private syncTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Submit a single form
  private async submitForm(submission: PendingSubmission): Promise<boolean> {
    const endpoint = formTypeEndpoints[submission.formType];
    if (!endpoint) {
      console.error(`Unknown form type: ${submission.formType}`);
      return false;
    }

    try {
      // Create FormData
      const formDataToSubmit = new FormData();

      // Append all form fields
      Object.entries(submission.formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formDataToSubmit.append(key, String(value));
        }
      });

      // Convert and append attachments
      for (const storable of submission.attachments) {
        const file = storableToFile(storable);
        formDataToSubmit.append('attachment_files', file);
        formDataToSubmit.append('attachment_titles', storable.title);
      }

      await apiClient.post(endpoint, formDataToSubmit, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return true;
    } catch (error: unknown) {
      console.error(`Failed to submit form ${submission.id}:`, error);

      // Check if it's a client error (400-499) - don't retry these
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } };
        const status = axiosError.response?.status;
        if (status && status >= 400 && status < 500) {
          // Mark as failed, don't retry
          await updatePendingSubmission(submission.id, {
            status: 'failed',
            errorMessage: `Server rejected submission (${status})`,
          });
          return false;
        }
      }

      throw error; // Re-throw for retry logic
    }
  }

  // Sync a single submission with retry logic
  private async syncSubmission(submission: PendingSubmission): Promise<boolean> {
    // Skip if already at max retries
    if (submission.retryCount >= MAX_RETRIES) {
      await updatePendingSubmission(submission.id, {
        status: 'failed',
        errorMessage: 'Maximum retry attempts reached',
      });
      return false;
    }

    // Mark as syncing
    await updatePendingSubmission(submission.id, { status: 'syncing' });

    try {
      const success = await this.submitForm(submission);

      if (success) {
        // Remove from queue
        await removePendingSubmission(submission.id);
        return true;
      }

      return false;
    } catch {
      // Update retry count and schedule next retry
      const newRetryCount = submission.retryCount + 1;
      await updatePendingSubmission(submission.id, {
        status: newRetryCount >= MAX_RETRIES ? 'failed' : 'pending',
        retryCount: newRetryCount,
        lastRetryAt: Date.now(),
        errorMessage: newRetryCount >= MAX_RETRIES
          ? 'Maximum retry attempts reached'
          : undefined,
      });
      return false;
    }
  }

  // Sync all pending submissions
  async syncAll(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) {
      return { synced: 0, failed: 0 };
    }

    // Check if online
    const isOnline = useNetworkStore.getState().isOnline;
    if (!isOnline) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    useSyncStore.getState().setSyncing(true);

    let synced = 0;
    let failed = 0;

    try {
      const submissions = await getPendingSubmissions();

      // Filter to only pending submissions (not already failed)
      const pendingSubmissions = submissions.filter(
        (s) => s.status === 'pending' || s.status === 'syncing'
      );

      for (const submission of pendingSubmissions) {
        // Check if still online before each submission
        if (!useNetworkStore.getState().isOnline) {
          break;
        }

        const success = await this.syncSubmission(submission);
        if (success) {
          synced++;
        } else {
          // Check if it was marked as failed
          const updated = await getPendingSubmission(submission.id);
          if (updated?.status === 'failed') {
            failed++;
          }
        }
      }

      // Update pending count
      const count = await getPendingCount();
      useSyncStore.getState().setPendingCount(count);
      useSyncStore.getState().setLastSyncAt(Date.now());
      useSyncStore.getState().setSyncError(null);
    } catch (error) {
      console.error('Sync error:', error);
      useSyncStore.getState().setSyncError('Failed to sync forms');
    } finally {
      this.isSyncing = false;
      useSyncStore.getState().setSyncing(false);
    }

    return { synced, failed };
  }

  // Start auto-sync when online
  startAutoSync() {
    // Clear any existing timeout
    if (this.syncTimeoutId) {
      clearTimeout(this.syncTimeoutId);
    }

    const scheduleSync = async () => {
      const isOnline = useNetworkStore.getState().isOnline;
      const pendingCount = await getPendingCount();

      if (isOnline && pendingCount > 0 && !this.isSyncing) {
        await this.syncAll();
      }

      // Schedule next check (every 30 seconds)
      this.syncTimeoutId = setTimeout(scheduleSync, 30000);
    };

    // Start the sync loop
    scheduleSync();
  }

  // Stop auto-sync
  stopAutoSync() {
    if (this.syncTimeoutId) {
      clearTimeout(this.syncTimeoutId);
      this.syncTimeoutId = null;
    }
  }

  // Trigger sync when coming back online
  async onOnline() {
    // Wait a bit to ensure stable connection
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (useNetworkStore.getState().isOnline) {
      return this.syncAll();
    }

    return { synced: 0, failed: 0 };
  }

  // Get retry delay for a submission
  getRetryDelay(retryCount: number): number {
    return RETRY_DELAYS[Math.min(retryCount, RETRY_DELAYS.length - 1)];
  }

  // Retry a specific failed submission
  async retrySubmission(submissionId: string): Promise<boolean> {
    const submission = await getPendingSubmission(submissionId);

    if (!submission) {
      return false;
    }

    // Reset status and retry count for manual retry
    await updatePendingSubmission(submissionId, {
      status: 'pending',
      retryCount: 0,
      errorMessage: undefined,
    });

    return this.syncSubmission(submission);
  }
}

// Singleton instance
export const offlineSyncService = new OfflineSyncService();

// Initialize pending count on load
export async function initializeSyncState(): Promise<void> {
  try {
    const count = await getPendingCount();
    useSyncStore.getState().setPendingCount(count);
  } catch (error) {
    console.error('Failed to initialize sync state:', error);
  }
}
