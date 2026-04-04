import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as claimService from '@/services/bn/claimService';
import type { BnClaim, BnClaimNote, BnClaimEvent } from '@/types/bn';

export function useBnClaims(filters?: Parameters<typeof claimService.fetchClaims>[0]) {
  return useQuery({
    queryKey: ['bn', 'claims', filters],
    queryFn: () => claimService.fetchClaims(filters),
  });
}

export function useBnClaim(id: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'claim', id],
    queryFn: () => claimService.fetchClaimById(id!),
    enabled: !!id,
  });
}

export function useBnClaimEvents(claimId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'claim-events', claimId],
    queryFn: () => claimService.fetchClaimEvents(claimId!),
    enabled: !!claimId,
  });
}

export function useBnClaimNotes(claimId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'claim-notes', claimId],
    queryFn: () => claimService.fetchClaimNotes(claimId!),
    enabled: !!claimId,
  });
}

export function useBnClaimEligibility(claimId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'claim-eligibility', claimId],
    queryFn: () => claimService.fetchClaimEligibility(claimId!),
    enabled: !!claimId,
  });
}

export function useBnClaimCalculations(claimId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'claim-calculations', claimId],
    queryFn: () => claimService.fetchClaimCalculations(claimId!),
    enabled: !!claimId,
  });
}

export function useBnClaimDocuments(claimId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'claim-documents', claimId],
    queryFn: () => claimService.fetchClaimDocuments(claimId!),
    enabled: !!claimId,
  });
}

export function useCreateBnClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['bn', 'claim', 'create'],
    mutationFn: (claim: Partial<BnClaim>) => claimService.createClaim(claim),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'claims'] }),
  });
}

export function useUpdateBnClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['bn', 'claim', 'update'],
    mutationFn: ({ id, updates }: { id: string; updates: Partial<BnClaim> }) =>
      claimService.updateClaim(id, updates),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['bn', 'claims'] });
      qc.invalidateQueries({ queryKey: ['bn', 'claim', id] });
    },
  });
}

export function useAddBnClaimNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['bn', 'claim-note', 'create'],
    mutationFn: (note: Partial<BnClaimNote>) => claimService.addClaimNote(note),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['bn', 'claim-notes', vars.claim_id] }),
  });
}

export function useAddBnClaimEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['bn', 'claim-event', 'create'],
    mutationFn: (event: Partial<BnClaimEvent>) => claimService.addClaimEvent(event),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['bn', 'claim-events', vars.claim_id] }),
  });
}
