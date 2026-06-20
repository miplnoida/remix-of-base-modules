/**
 * useCoreReferenceValues / useCoreReferenceGroups — react-query hooks for
 * the central core_reference_group / core_reference_value tables.
 *
 * Used by Benefits, Legal, Compliance, Country Pack, Payments, etc.
 * Pass `moduleCode` to scope to a module (COMMON groups are always included
 * as a fallback so cross-cutting masters like country/currency stay visible).
 */
import { useQuery } from '@tanstack/react-query';
import {
  listReferenceGroups,
  listReferenceValues,
  type CoreReferenceValue,
} from '@/services/core/coreReferenceDataService';

export interface ReferenceOption {
  value: string;
  label: string;
  description?: string | null;
  is_default?: boolean;
  is_system?: boolean;
  metadata?: Record<string, unknown> | null;
}

export function useCoreReferenceValues(
  groupCode: string,
  opts?: { fallback?: ReferenceOption[]; moduleCode?: string | string[]; includeRetired?: boolean },
) {
  const moduleKey = Array.isArray(opts?.moduleCode) ? opts!.moduleCode.join(',') : (opts?.moduleCode ?? 'ANY');
  const q = useQuery({
    queryKey: ['core-ref-values', groupCode, moduleKey, !!opts?.includeRetired],
    queryFn: () => listReferenceValues(groupCode, {
      moduleCode: opts?.moduleCode,
      includeInactive: opts?.includeRetired,
    }),
    staleTime: 5 * 60_000,
  });
  const all: ReferenceOption[] = (q.data ?? []).map(toOption);
  const selectable = (q.data ?? []).filter(v => v.is_active).map(toOption);
  return {
    /** Active-only options for dropdowns. */
    options: selectable.length > 0 ? selectable : (opts?.fallback ?? []),
    /** All values (including retired) — retired are readable but not selectable. */
    allOptions: all,
    isLoading: q.isLoading,
    error: q.error,
    raw: q.data ?? [],
    refetch: q.refetch,
  };
}

export function useCoreReferenceGroups(moduleCode?: string | string[]) {
  const key = Array.isArray(moduleCode) ? moduleCode.join(',') : (moduleCode ?? 'ALL');
  return useQuery({
    queryKey: ['core-ref-groups', key],
    queryFn: () => listReferenceGroups({ moduleCode }),
    staleTime: 5 * 60_000,
  });
}

function toOption(v: CoreReferenceValue): ReferenceOption {
  return {
    value: v.value_code,
    label: v.value_label,
    description: v.value_description ?? v.description ?? null,
    is_default: v.is_default,
    is_system: v.is_system,
    metadata: v.metadata_json ?? null,
  };
}
