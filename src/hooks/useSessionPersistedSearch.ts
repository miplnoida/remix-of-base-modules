import { useCallback, useRef } from 'react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

interface PersistedData<F, R> {
  filters: F;
  results: R;
  timestamp: number;
}

/**
 * Hook for persisting search criteria and results in sessionStorage,
 * scoped by screen key and authenticated user ID.
 *
 * - `save(filters, results)` fully replaces any prior data (no merging).
 * - `load()` returns the stored data or null.
 * - `clear()` removes the stored data.
 * - Data is automatically cleared when the browser tab closes.
 */
export function useSessionPersistedSearch<F = Record<string, string>, R = unknown[]>(screenKey: string) {
  const { user } = useSupabaseAuth();
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  const getStorageKey = useCallback(() => {
    const uid = userIdRef.current;
    if (!uid) return null;
    return `c3_search_${screenKey}_${uid}`;
  }, [screenKey]);

  const save = useCallback((filters: F, results: R) => {
    const key = getStorageKey();
    if (!key) return;
    try {
      const payload: PersistedData<F, R> = { filters, results, timestamp: Date.now() };
      sessionStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // sessionStorage full or unavailable — silently ignore
    }
  }, [getStorageKey]);

  const load = useCallback((): PersistedData<F, R> | null => {
    const key = getStorageKey();
    if (!key) return null;
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as PersistedData<F, R>;
    } catch {
      return null;
    }
  }, [getStorageKey]);

  const clear = useCallback(() => {
    const key = getStorageKey();
    if (!key) return;
    sessionStorage.removeItem(key);
  }, [getStorageKey]);

  return { save, load, clear };
}
