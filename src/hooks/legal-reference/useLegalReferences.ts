/**
 * Shared react-query hooks for the central legal_reference master.
 * Consumed by Benefits, Legal and any future module.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteLegalReference,
  getLegalReference,
  listLegalReferences,
  listLegalReferenceTypes,
  setLegalReferenceStatus,
  upsertLegalReference,
} from '@/services/legal-reference/legalReferenceService';
import type { LegalReference, LegalRefStatus } from '@/services/legal-reference/types';

const KEY = (countryCode?: string) => ['legal-reference', 'list', countryCode] as const;

export function useLegalReferences(
  countryCode: string | undefined,
  opts?: { includeInactive?: boolean; tags?: string[] },
) {
  return useQuery({
    queryKey: [...KEY(countryCode), opts?.includeInactive ?? false, opts?.tags?.join(',') ?? ''],
    queryFn: () => listLegalReferences(countryCode!, opts),
    enabled: !!countryCode,
    staleTime: 60_000,
  });
}

export function useLegalReference(id: string | undefined) {
  return useQuery({
    queryKey: ['legal-reference', 'detail', id],
    queryFn: () => getLegalReference(id!),
    enabled: !!id,
  });
}

export function useLegalReferenceTypes() {
  return useQuery({
    queryKey: ['legal-reference', 'types'],
    queryFn: listLegalReferenceTypes,
    staleTime: 5 * 60_000,
  });
}

export function useUpsertLegalReference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      ref: Partial<LegalReference> & {
        country_code: string;
        ref_code: string;
        short_title: string;
        effective_from: string;
      };
      userCode?: string;
    }) => upsertLegalReference(input.ref, input.userCode),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['legal-reference'] }),
  });
}

export function useDeleteLegalReference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLegalReference(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['legal-reference'] }),
  });
}

export function useSetLegalReferenceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; status: LegalRefStatus; userCode?: string }) =>
      setLegalReferenceStatus(input.id, input.status, input.userCode),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['legal-reference'] }),
  });
}
