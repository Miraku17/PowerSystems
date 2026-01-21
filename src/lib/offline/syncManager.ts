import { offlineDb, PendingSubmission, formTypeEndpoints } from './db';
import { updateSubmissionStatus, incrementRetryCount } from './syncQueue';
import apiClient from '@/lib/axios';

const MAX_RETRIES = 3;

export interface SyncResult {
  success: boolean;
  localId: string;
  errorMessage?: string;
}

export async function syncSubmission(submission: PendingSubmission): Promise<SyncResult> {
  const { localId, formType, formData, attachments } = submission;

  try {
    await updateSubmissionStatus(localId, 'syncing');

    const data = new FormData();

    // Append form fields
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        data.append(key, String(value));
      }
    });

    // Append attachments
    for (const att of attachments) {
      const file = new File([att.file], att.filename, { type: att.mimeType });
      data.append('attachment_files', file);
      data.append('attachment_titles', att.title);
    }

    const endpoint = formTypeEndpoints[formType];
    const response = await apiClient.post(endpoint, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (response.status === 201 || response.status === 200) {
      await offlineDb.pendingSubmissions.where('localId').equals(localId).delete();
      return { success: true, localId };
    }

    throw new Error(`Unexpected response: ${response.status}`);
  } catch (error: unknown) {
    const axiosError = error as { response?: { status: number; data?: { error?: string } }; message?: string };
    const errorMessage = axiosError.response?.data?.error || axiosError.message || 'Unknown error';

    // Check for conflict (duplicate job_order)
    if (axiosError.response?.status === 400 && errorMessage.includes('already exists')) {
      await updateSubmissionStatus(localId, 'conflict', errorMessage);
      return { success: false, localId, errorMessage };
    }

    // Increment retry count
    await incrementRetryCount(localId);
    const updated = await offlineDb.pendingSubmissions.where('localId').equals(localId).first();

    if (updated && updated.retryCount >= MAX_RETRIES) {
      await updateSubmissionStatus(localId, 'failed', errorMessage);
    } else {
      await updateSubmissionStatus(localId, 'pending', errorMessage);
    }

    return { success: false, localId, errorMessage };
  }
}

export interface SyncAllResult {
  synced: number;
  failed: number;
  results: SyncResult[];
}

export async function syncAllPending(): Promise<SyncAllResult> {
  const pending = await offlineDb.pendingSubmissions
    .where('status')
    .anyOf(['pending', 'failed'])
    .toArray();

  let synced = 0;
  let failed = 0;
  const results: SyncResult[] = [];

  for (const submission of pending) {
    if (submission.retryCount < MAX_RETRIES) {
      const result = await syncSubmission(submission);
      results.push(result);

      if (result.success) {
        synced++;
      } else {
        failed++;
      }

      // Small delay between submissions
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return { synced, failed, results };
}

export async function retrySingleSubmission(localId: string): Promise<SyncResult> {
  const submission = await offlineDb.pendingSubmissions.where('localId').equals(localId).first();

  if (!submission) {
    return { success: false, localId, errorMessage: 'Submission not found' };
  }

  // Reset retry count for manual retry
  await offlineDb.pendingSubmissions
    .where('localId')
    .equals(localId)
    .modify({ retryCount: 0, status: 'pending' });

  const updatedSubmission = await offlineDb.pendingSubmissions.where('localId').equals(localId).first();

  if (!updatedSubmission) {
    return { success: false, localId, errorMessage: 'Submission not found after update' };
  }

  return syncSubmission(updatedSubmission);
}
