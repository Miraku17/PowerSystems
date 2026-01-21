import Dexie, { Table } from 'dexie';

export type FormType = 'deutz-service' | 'deutz-commissioning' | 'grindex-service' | 'weda-service';
export type SubmissionStatus = 'pending' | 'syncing' | 'failed' | 'conflict';

export interface OfflineAttachment {
  id: string;
  file: Blob;
  filename: string;
  title: string;
  mimeType: string;
}

export interface PendingSubmission {
  id?: number;
  localId: string;
  formType: FormType;
  formData: Record<string, unknown>;
  attachments: OfflineAttachment[];
  createdAt: Date;
  lastAttempt?: Date;
  retryCount: number;
  status: SubmissionStatus;
  errorMessage?: string;
}

export interface CachedReferenceData {
  key: string;
  data: unknown[];
  cachedAt: Date;
  expiresAt: Date;
}

class OfflineDatabase extends Dexie {
  pendingSubmissions!: Table<PendingSubmission>;
  cachedReferenceData!: Table<CachedReferenceData>;

  constructor() {
    super('PowerSystemsOffline');

    this.version(1).stores({
      pendingSubmissions: '++id, localId, formType, status, createdAt',
      cachedReferenceData: 'key, expiresAt'
    });
  }
}

export const offlineDb = new OfflineDatabase();

export const formTypeLabels: Record<FormType, string> = {
  'deutz-service': 'Deutz Service',
  'deutz-commissioning': 'Deutz Commissioning',
  'grindex-service': 'Grindex Service',
  'weda-service': 'Weda Service',
};

export const formTypeEndpoints: Record<FormType, string> = {
  'deutz-service': '/forms/deutz-service',
  'deutz-commissioning': '/forms/deutz-commissioning',
  'grindex-service': '/forms/grindex-service',
  'weda-service': '/forms/weda-service',
};
