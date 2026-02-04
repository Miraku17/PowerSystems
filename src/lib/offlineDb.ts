import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Form type identifiers that match API endpoints
export type FormType =
  | 'job-order-request'
  | 'deutz-commissioning'
  | 'deutz-service'
  | 'engine-teardown'
  | 'electric-surface-pump-teardown'
  | 'electric-surface-pump-service'
  | 'electric-surface-pump-commissioning'
  | 'engine-surface-pump-service'
  | 'engine-surface-pump-commissioning'
  | 'submersible-pump-commissioning'
  | 'submersible-pump-service'
  | 'submersible-pump-teardown'
  | 'engine-inspection-receiving'
  | 'components-teardown-measuring';

// Storable attachment (files converted to ArrayBuffer)
export interface StorableAttachment {
  title: string;
  fileName: string;
  mimeType: string;
  data: ArrayBuffer;
  size: number;
}

// Pending submission stored in IndexedDB
export interface PendingSubmission {
  id: string;
  formType: FormType;
  formData: Record<string, unknown>;
  attachments: StorableAttachment[];
  createdAt: number;
  retryCount: number;
  lastRetryAt: number | null;
  status: 'pending' | 'syncing' | 'failed';
  errorMessage?: string;
}

// Cached reference data
export interface CachedData {
  key: string;
  data: unknown;
  cachedAt: number;
  expiresAt: number;
}

// Database schema
interface OfflineDBSchema extends DBSchema {
  pendingSubmissions: {
    key: string;
    value: PendingSubmission;
    indexes: {
      'by-status': string;
      'by-created': number;
    };
  };
  cachedData: {
    key: string;
    value: CachedData;
  };
}

const DB_NAME = 'psi-offline-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<OfflineDBSchema> | null = null;

// Initialize database
export async function getDb(): Promise<IDBPDatabase<OfflineDBSchema>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<OfflineDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create pending submissions store
      if (!db.objectStoreNames.contains('pendingSubmissions')) {
        const submissionsStore = db.createObjectStore('pendingSubmissions', {
          keyPath: 'id',
        });
        submissionsStore.createIndex('by-status', 'status');
        submissionsStore.createIndex('by-created', 'createdAt');
      }

      // Create cached data store
      if (!db.objectStoreNames.contains('cachedData')) {
        db.createObjectStore('cachedData', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// Convert File to storable format (ArrayBuffer)
export async function fileToStorable(
  file: File,
  title: string
): Promise<StorableAttachment> {
  const arrayBuffer = await file.arrayBuffer();
  return {
    title,
    fileName: file.name,
    mimeType: file.type,
    data: arrayBuffer,
    size: file.size,
  };
}

// Convert storable format back to File
export function storableToFile(storable: StorableAttachment): File {
  const blob = new Blob([storable.data], { type: storable.mimeType });
  return new File([blob], storable.fileName, { type: storable.mimeType });
}

// Add a pending submission to the queue
export async function addPendingSubmission(
  formType: FormType,
  formData: Record<string, unknown>,
  attachments: StorableAttachment[]
): Promise<string> {
  const db = await getDb();
  const id = generateId();

  const submission: PendingSubmission = {
    id,
    formType,
    formData,
    attachments,
    createdAt: Date.now(),
    retryCount: 0,
    lastRetryAt: null,
    status: 'pending',
  };

  await db.put('pendingSubmissions', submission);
  return id;
}

// Get all pending submissions
export async function getPendingSubmissions(): Promise<PendingSubmission[]> {
  const db = await getDb();
  return db.getAllFromIndex('pendingSubmissions', 'by-created');
}

// Get pending submissions by status
export async function getPendingSubmissionsByStatus(
  status: PendingSubmission['status']
): Promise<PendingSubmission[]> {
  const db = await getDb();
  return db.getAllFromIndex('pendingSubmissions', 'by-status', status);
}

// Get a single pending submission
export async function getPendingSubmission(
  id: string
): Promise<PendingSubmission | undefined> {
  const db = await getDb();
  return db.get('pendingSubmissions', id);
}

// Update a pending submission
export async function updatePendingSubmission(
  id: string,
  updates: Partial<Omit<PendingSubmission, 'id'>>
): Promise<void> {
  const db = await getDb();
  const submission = await db.get('pendingSubmissions', id);

  if (submission) {
    await db.put('pendingSubmissions', { ...submission, ...updates });
  }
}

// Remove a pending submission
export async function removePendingSubmission(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('pendingSubmissions', id);
}

// Get count of pending submissions
export async function getPendingCount(): Promise<number> {
  const db = await getDb();
  return db.count('pendingSubmissions');
}

// Cache reference data
export async function cacheData(
  key: string,
  data: unknown,
  ttlMs: number = 24 * 60 * 60 * 1000 // Default 24 hours
): Promise<void> {
  const db = await getDb();
  const now = Date.now();

  await db.put('cachedData', {
    key,
    data,
    cachedAt: now,
    expiresAt: now + ttlMs,
  });
}

// Get cached reference data
export async function getCachedData<T>(key: string): Promise<T | null> {
  const db = await getDb();
  const cached = await db.get('cachedData', key);

  if (!cached) {
    return null;
  }

  // Check if expired
  if (Date.now() > cached.expiresAt) {
    await db.delete('cachedData', key);
    return null;
  }

  return cached.data as T;
}

// Clear expired cache entries
export async function clearExpiredCache(): Promise<void> {
  const db = await getDb();
  const allCached = await db.getAll('cachedData');
  const now = Date.now();

  for (const entry of allCached) {
    if (now > entry.expiresAt) {
      await db.delete('cachedData', entry.key);
    }
  }
}

// Clear all cached data
export async function clearAllCache(): Promise<void> {
  const db = await getDb();
  await db.clear('cachedData');
}

// Clear all pending submissions
export async function clearAllPendingSubmissions(): Promise<void> {
  const db = await getDb();
  await db.clear('pendingSubmissions');
}

// Reference data cache keys
export const CACHE_KEYS = {
  CUSTOMERS: 'customers',
  ENGINES: 'engines',
  USERS: 'users',
  COMPANIES: 'companies',
  FORM_TYPES: 'form-types',
} as const;
