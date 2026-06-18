/**
 * useReferenceData — react-query hooks for BN reference data.
 * Replaces hardcoded TypeScript enum arrays across BN config screens.
 */
import { useQuery } from '@tanstack/react-query';
import {
  listReferenceGroups,
  listReferenceValues,
  type BnReferenceValue,
} from '@/services/bn/referenceDataService';

export interface ReferenceOption {
  value: string;
  label: string;
  description?: string | null;
  is_default?: boolean;
  is_system?: boolean;
  metadata?: Record<string, unknown> | null;
}

/**
 * Pull all active values for a reference group.
 * @param fallback Optional fallback array if DB is empty / errors — used so screens
 *                 keep working before/during migration of all enums.
 */
export function useReferenceValues(groupCode: string, fallback: ReferenceOption[] = []) {
  const q = useQuery({
    queryKey: ['bn-ref-values', groupCode],
    queryFn: () => listReferenceValues(groupCode),
    staleTime: 5 * 60_000,
  });
  const options: ReferenceOption[] = (q.data ?? []).map(toOption);
  return {
    options: options.length > 0 ? options : fallback,
    isLoading: q.isLoading,
    error: q.error,
    raw: q.data ?? [],
    refetch: q.refetch,
  };
}

export function useReferenceGroups() {
  return useQuery({
    queryKey: ['bn-ref-groups'],
    queryFn: listReferenceGroups,
    staleTime: 5 * 60_000,
  });
}

function toOption(v: BnReferenceValue): ReferenceOption {
  return {
    value: v.value_code,
    label: v.value_label,
    description: v.description,
    is_default: v.is_default,
    is_system: v.is_system,
    metadata: v.metadata_json ?? null,
  };
}
