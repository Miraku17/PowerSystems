'use client';

import { useState, useEffect, useCallback } from 'react';
import { useIsOnline } from '@/stores/networkStore';
import { cacheData, getCachedData, CACHE_KEYS } from '@/lib/offlineDb';
import apiClient from '@/lib/axios';

interface CacheConfig {
  key: string;
  endpoint: string;
  ttlMs?: number; // Cache TTL in milliseconds
}

// Default cache TTL: 24 hours
const DEFAULT_TTL = 24 * 60 * 60 * 1000;

export function useOfflineData<T>(config: CacheConfig) {
  const { key, endpoint, ttlMs = DEFAULT_TTL } = config;
  const isOnline = useIsOnline();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Try to get from cache first
      const cached = await getCachedData<T>(key);

      if (cached !== null) {
        setData(cached);
        setLoading(false);

        // If online, refresh cache in background
        if (isOnline) {
          refreshCache();
        }
        return;
      }

      // No cache, need to fetch
      if (isOnline) {
        await refreshCache();
      } else {
        // Offline and no cache
        setLoading(false);
        setError(new Error('No cached data available offline'));
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err as Error);
      setLoading(false);
    }
  }, [key, isOnline]);

  const refreshCache = async () => {
    try {
      const response = await apiClient.get(endpoint);
      if (response.data.success && response.data.data) {
        const freshData = response.data.data as T;
        setData(freshData);

        // Cache the data
        await cacheData(key, freshData, ttlMs);
      }
    } catch (err) {
      console.error('Failed to refresh cache:', err);
      // If we already have data from cache, don't throw
      if (!data) {
        throw err;
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
    isFromCache: !isOnline && data !== null,
  };
}

// Pre-configured hooks for common data types
export function useOfflineCustomers() {
  return useOfflineData<
    Array<{
      id: string;
      name: string;
      customer: string;
      contactPerson?: string;
      address?: string;
      email?: string;
      phone?: string;
      equipment?: string;
    }>
  >({
    key: CACHE_KEYS.CUSTOMERS,
    endpoint: '/customers',
  });
}

export function useOfflineEngines() {
  return useOfflineData<
    Array<{
      id: string;
      model: string;
      serialNo: string;
      equipModel?: string;
      equipSerialNo?: string;
      company?: { name: string };
      rating?: string;
      rpm?: string;
      runHours?: string;
      lubeOil?: string;
      fuelType?: string;
      coolantAdditive?: string;
      fuelPumpSN?: string;
      fuelPumpCode?: string;
      turboModel?: string;
      turboSN?: string;
    }>
  >({
    key: CACHE_KEYS.ENGINES,
    endpoint: '/engines',
  });
}

export function useOfflineUsers() {
  return useOfflineData<
    Array<{
      id: string;
      fullName: string;
    }>
  >({
    key: CACHE_KEYS.USERS,
    endpoint: '/users',
  });
}

export function useOfflineCompanies() {
  return useOfflineData<
    Array<{
      id: string;
      name: string;
    }>
  >({
    key: CACHE_KEYS.COMPANIES,
    endpoint: '/companies',
  });
}
