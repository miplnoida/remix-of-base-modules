/**
 * DEPRECATED — re-exports from the central core reference hooks.
 *
 * Reference data is now hosted by `core_reference_group` / `core_reference_value`.
 * New code should import from `@/hooks/core/useCoreReferenceData`.
 *
 * `useReferenceValues` is kept as a thin alias of `useCoreReferenceValues`
 * (with the same legacy signature: groupCode + fallback array) so existing
 * screens compile unchanged during the transition.
 */
import {
  useCoreReferenceValues,
  useCoreReferenceGroups,
  type ReferenceOption,
} from '@/hooks/core/useCoreReferenceData';

export type { ReferenceOption };
export { useCoreReferenceValues, useCoreReferenceGroups };

export function useReferenceValues(groupCode: string, fallback: ReferenceOption[] = []) {
  return useCoreReferenceValues(groupCode, { fallback });
}

export const useReferenceGroups = useCoreReferenceGroups;
