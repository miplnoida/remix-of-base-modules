/**
 * Compliance Feature Flag Bridge — runtime cache
 *
 * Phase 1: bridges the static `isComplianceFeatureEnabled` helper to the
 * DB-backed `public.feature_flags` table (rows with `compliance.*` keys),
 * which is the same source written by the Setup → Feature Toggles UI.
 *
 * This is NOT a new toggle system. It's a one-way runtime cache so the
 * existing synchronous helper can consult the canonical DB values.
 *
 * Fallback behavior (documented):
 *   - cache UNSET (initial load, query failed, etc.) → returns `undefined`
 *     and callers fall back to DEFAULT_TOGGLES so the UI does NOT
 *     unexpectedly disappear during a transient flag-load failure.
 *   - cache SET and key MISSING → returns `undefined` (same fallback).
 *   - cache SET and key PRESENT → returns the DB `is_enabled` value.
 */

type DbFlagMap = Record<string, boolean>;

let dbFlagCache: DbFlagMap | null = null;
const listeners = new Set<() => void>();

export function setComplianceDbFlags(map: DbFlagMap): void {
  dbFlagCache = { ...map };
  listeners.forEach((l) => {
    try { l(); } catch { /* ignore */ }
  });
}

export function getComplianceDbFlag(key: string): boolean | undefined {
  if (!dbFlagCache) return undefined;
  return dbFlagCache[key];
}

export function hasComplianceDbFlagsLoaded(): boolean {
  return dbFlagCache !== null;
}

export function subscribeComplianceDbFlags(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
