import { offlineDb, PendingSubmission, OfflineAttachment, FormType, SubmissionStatus } from './db';
import { v4 as uuidv4 } from 'uuid';

export interface AttachmentInput {
  file: File;
  title: string;
}

export async function addToSyncQueue<T extends object>(
  formType: FormType,
  formData: T,
  attachments: AttachmentInput[]
): Promise<string> {
  const localId = uuidv4();

  const offlineAttachments: OfflineAttachment[] = attachments.map((att) => ({
    id: uuidv4(),
    file: att.file,
    filename: att.file.name,
    title: att.title,
    mimeType: att.file.type,
  }));

  await offlineDb.pendingSubmissions.add({
    localId,
    formType,
    formData: formData as Record<string, unknown>,
    attachments: offlineAttachments,
    createdAt: new Date(),
    retryCount: 0,
    status: 'pending',
  });

  return localId;
}

export async function updateSubmissionStatus(
  localId: string,
  status: SubmissionStatus,
  errorMessage?: string
): Promise<void> {
  await offlineDb.pendingSubmissions
    .where('localId')
    .equals(localId)
    .modify({
      status,
      errorMessage,
      lastAttempt: new Date(),
    });
}

export async function incrementRetryCount(localId: string): Promise<void> {
  await offlineDb.pendingSubmissions
    .where('localId')
    .equals(localId)
    .modify((submission) => {
      submission.retryCount++;
      submission.lastAttempt = new Date();
    });
}

export async function removeFromQueue(localId: string): Promise<void> {
  await offlineDb.pendingSubmissions.where('localId').equals(localId).delete();
}

export async function getPendingSubmissions(): Promise<PendingSubmission[]> {
  return offlineDb.pendingSubmissions.toArray();
}

export async function getPendingCount(): Promise<number> {
  return offlineDb.pendingSubmissions.count();
}

export async function getSubmissionByLocalId(localId: string): Promise<PendingSubmission | undefined> {
  return offlineDb.pendingSubmissions.where('localId').equals(localId).first();
}
