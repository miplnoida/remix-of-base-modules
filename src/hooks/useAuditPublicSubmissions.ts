/**
 * Phase F — Officer-facing hooks to list and manage online employer
 * submissions (responses & disputes) attached to inspections / findings.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listResponseSubmissionsForInspection,
  listDisputeSubmissionsForInspection,
  listResponseSubmissionsForFinding,
  listDisputeSubmissionsForFinding,
  updateResponseSubmissionStatus,
  updateDisputeSubmissionStatus,
} from '@/services/auditPublicResponseService';
import type {
  FindingResponseSubmission,
  FindingDisputeSubmission,
  FindingResponseStatus,
  FindingDisputeStatus,
} from '@/types/auditPublicSubmissions';

export function useInspectionResponseSubmissions(inspectionId: string | null | undefined) {
  return useQuery<FindingResponseSubmission[]>({
    queryKey: ['inspection-response-submissions', inspectionId],
    queryFn: () => listResponseSubmissionsForInspection(inspectionId!),
    enabled: !!inspectionId,
    staleTime: 30_000,
  });
}

export function useInspectionDisputeSubmissions(inspectionId: string | null | undefined) {
  return useQuery<FindingDisputeSubmission[]>({
    queryKey: ['inspection-dispute-submissions', inspectionId],
    queryFn: () => listDisputeSubmissionsForInspection(inspectionId!),
    enabled: !!inspectionId,
    staleTime: 30_000,
  });
}

export function useFindingResponseSubmissions(findingId: string | null | undefined) {
  return useQuery<FindingResponseSubmission[]>({
    queryKey: ['finding-response-submissions', findingId],
    queryFn: () => listResponseSubmissionsForFinding(findingId!),
    enabled: !!findingId,
    staleTime: 30_000,
  });
}

export function useFindingDisputeSubmissions(findingId: string | null | undefined) {
  return useQuery<FindingDisputeSubmission[]>({
    queryKey: ['finding-dispute-submissions', findingId],
    queryFn: () => listDisputeSubmissionsForFinding(findingId!),
    enabled: !!findingId,
    staleTime: 30_000,
  });
}

export function useUpdateResponseSubmissionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; status: FindingResponseStatus; reviewerNotes?: string; reviewedBy?: string }) =>
      updateResponseSubmissionStatus(vars.id, vars.status, vars.reviewerNotes ?? null, vars.reviewedBy ?? null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspection-response-submissions'] });
      qc.invalidateQueries({ queryKey: ['finding-response-submissions'] });
    },
  });
}

export function useUpdateDisputeSubmissionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; status: FindingDisputeStatus; reviewerNotes?: string; reviewedBy?: string }) =>
      updateDisputeSubmissionStatus(vars.id, vars.status, vars.reviewerNotes ?? null, vars.reviewedBy ?? null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspection-dispute-submissions'] });
      qc.invalidateQueries({ queryKey: ['finding-dispute-submissions'] });
    },
  });
}
