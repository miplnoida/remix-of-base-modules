/**
 * React hooks for the Approval / Override Policy framework.
 *
 * Components should never query bn_approval_policy or bn_override_request
 * directly — go through these hooks so caching, invalidation and audit
 * are consistent.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  evaluatePolicy,
  getProductPolicies,
  getPolicy,
} from '@/services/bn/policies/bnPolicyEvaluator';
import {
  submitOverrideRequest,
  reviewOverrideRequest,
  cancelOverrideRequest,
  revokeOverrideRequest,
  listOverrideRequests,
} from '@/services/bn/policies/bnPolicyActionHandler';
import type {
  PolicyArea,
  PolicyContext,
  ReviewOverrideInput,
  SubmitOverrideInput,
} from '@/services/bn/policies/types';

export function useProductPolicies(productVersionId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'approval-policies', productVersionId],
    queryFn: () => getProductPolicies(productVersionId!),
    enabled: !!productVersionId,
  });
}

export function usePolicy(
  productVersionId: string | undefined,
  area: PolicyArea | undefined,
  actionCode = 'DEFAULT',
) {
  return useQuery({
    queryKey: ['bn', 'approval-policy', productVersionId, area, actionCode],
    queryFn: () => getPolicy(productVersionId!, area!, actionCode),
    enabled: !!productVersionId && !!area,
  });
}

export function usePolicyDecision(ctx: PolicyContext | null) {
  return useQuery({
    queryKey: ['bn', 'policy-decision', ctx],
    queryFn: () => evaluatePolicy(ctx as PolicyContext),
    enabled: !!ctx && !!ctx.productVersionId && !!ctx.area && !!ctx.userId,
  });
}

export function usePendingOverrides(claimId: string | undefined, area?: PolicyArea) {
  return useQuery({
    queryKey: ['bn', 'override-requests', claimId, area ?? 'ALL'],
    queryFn: () => listOverrideRequests(claimId!, area),
    enabled: !!claimId,
  });
}

export function useSubmitOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitOverrideInput) => submitOverrideRequest(input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['bn', 'override-requests', vars.claimId] });
      qc.invalidateQueries({ queryKey: ['bn', 'claim-events', vars.claimId] });
    },
  });
}

export function useReviewOverride(claimId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewOverrideInput) => reviewOverrideRequest(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bn', 'override-requests', claimId] });
      qc.invalidateQueries({ queryKey: ['bn', 'claim-events', claimId] });
    },
  });
}

export function useCancelOverride(claimId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { requestId: string; cancelledBy: string; notes?: string }) =>
      cancelOverrideRequest(vars.requestId, vars.cancelledBy, vars.notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bn', 'override-requests', claimId] });
    },
  });
}

export function useRevokeOverride(claimId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { requestId: string; revokedBy: string; reason: string }) =>
      revokeOverrideRequest(vars.requestId, vars.revokedBy, vars.reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bn', 'override-requests', claimId] });
      qc.invalidateQueries({ queryKey: ['bn', 'claim-eligibility', claimId] });
      qc.invalidateQueries({ queryKey: ['bn', 'claim-events', claimId] });
    },
  });
}
