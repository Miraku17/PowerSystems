import { offlineDb, CachedReferenceData } from './db';
import apiClient from '@/lib/axios';

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function getCachedOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T[]>
): Promise<T[]> {
  // Try to get from cache first
  const cached = await offlineDb.cachedReferenceData.get(key);

  if (cached && new Date(cached.expiresAt) > new Date()) {
    return cached.data as T[];
  }

  // If online, fetch fresh data
  if (navigator.onLine) {
    try {
      const data = await fetchFn();

      // Store in IndexedDB cache
      await offlineDb.cachedReferenceData.put({
        key,
        data,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + CACHE_DURATION_MS),
      });

      return data;
    } catch (error) {
      console.error(`Failed to fetch ${key}:`, error);
      // If fetch fails but we have stale cache, use it
      if (cached) {
        return cached.data as T[];
      }
      throw error;
    }
  }

  // Offline with stale cache - use stale data
  if (cached) {
    return cached.data as T[];
  }

  // Offline with no cache
  return [];
}

export async function getCachedCustomers() {
  return getCachedOrFetch('customers', async () => {
    const response = await apiClient.get('/customers');
    return response.data.success ? response.data.data : [];
  });
}

export async function getCachedEngines() {
  return getCachedOrFetch('engines', async () => {
    const response = await apiClient.get('/engines');
    return response.data.success ? response.data.data : [];
  });
}

export async function getCachedPumps() {
  return getCachedOrFetch('pumps', async () => {
    const response = await apiClient.get('/pumps');
    return response.data.success ? response.data.data : [];
  });
}

export async function getCachedUsers() {
  return getCachedOrFetch('users', async () => {
    const response = await apiClient.get('/users');
    return response.data.success ? response.data.data : [];
  });
}

export async function getCachedCompanies() {
  return getCachedOrFetch('companies', async () => {
    const response = await apiClient.get('/companies');
    return response.data.success ? response.data.data : [];
  });
}

export async function refreshReferenceData(): Promise<void> {
  if (!navigator.onLine) return;

  await Promise.allSettled([
    getCachedCustomers(),
    getCachedEngines(),
    getCachedPumps(),
    getCachedUsers(),
    getCachedCompanies(),
  ]);
}

export async function clearReferenceCache(): Promise<void> {
  await offlineDb.cachedReferenceData.clear();
}
