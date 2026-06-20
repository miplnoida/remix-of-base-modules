/**
 * Hooks for attaching/detaching Legal References to any module entity.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  attachLegalReference,
  detachLegalReference,
  listEntityLegalReferences,
  type EntityKey,
} from '@/services/legal-reference/moduleMappingService';

const KEY = (k?: EntityKey) =>
  ['legal-reference', 'entity', k?.moduleCode, k?.entityTable, k?.entityId] as const;

export function useEntityLegalReferences(key: EntityKey | undefined) {
  return useQuery({
    queryKey: KEY(key),
    queryFn: () => listEntityLegalReferences(key!),
    enabled: !!key && !!key.entityId,
  });
}

export function useAttachLegalReference(key: EntityKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      legalReferenceId: string;
      role?: string;
      notes?: string;
      userCode?: string;
    }) => attachLegalReference(key, input.legalReferenceId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(key) }),
  });
}

export function useDetachLegalReference(key: EntityKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mappingId: string) => detachLegalReference(mappingId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(key) }),
  });
}
