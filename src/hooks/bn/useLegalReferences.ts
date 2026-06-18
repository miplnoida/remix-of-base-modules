/**
 * useLegalReferences — react-query hooks for the new `bn_legal_reference`
 * master. Used by the Country Pack Legal References screen and by any
 * future selectors (Product Catalog, letters, decision recordings…).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteLegalReference,
  getLegalReference,
  listLegalReferences,
  setLegalReferenceStatus,
  upsertLegalReference,
  type BnLegalReference,
  type LegalRefStatus,
} from '@/services/bn/legalReferenceService';

const KEY = (countryCode?: string) => ['bn', 'legal-references', countryCode] as const;

export function useLegalReferences(countryCode: string | undefined, opts?: { includeInactive?: boolean }) {
  return useQuery({
    queryKey: [...KEY(countryCode), opts?.includeInactive ?? false],
    queryFn: () => listLegalReferences(countryCode!, opts),
    enabled: !!countryCode,
    staleTime: 60_000,
  });
}

export function useLegalReference(id: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'legal-reference', id],
    queryFn: () => getLegalReference(id!),
    enabled: !!id,
  });
}

export function useUpsertLegalReference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { ref: Partial<BnLegalReference> & { country_code: string; ref_code: string; short_title: string; effective_from: string }; userCode?: string }) =>
      upsertLegalReference(input.ref, input.userCode),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'legal-references'] }),
  });
}

export function useDeleteLegalReference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLegalReference(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'legal-references'] }),
  });
}

export function useSetLegalReferenceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; status: LegalRefStatus; userCode?: string }) =>
      setLegalReferenceStatus(input.id, input.status, input.userCode),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'legal-references'] }),
  });
}
