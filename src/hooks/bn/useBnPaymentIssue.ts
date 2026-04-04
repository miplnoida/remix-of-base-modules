/**
 * Payment Issue Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as svc from '@/services/bn/paymentIssueService';

export function useBnIssueRecords(filters: svc.IssueFilters = {}) {
  return useQuery({
    queryKey: ['bn', 'issue-records', filters],
    queryFn: () => svc.fetchIssueRecords(filters),
    refetchInterval: 15_000,
  });
}

export function useBnIssueRecordDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'issue-record', id],
    queryFn: () => svc.fetchIssueRecordDetail(id!),
    enabled: !!id,
  });
}

export function useBnIssueSummary(batchId?: string) {
  return useQuery({
    queryKey: ['bn', 'issue-summary', batchId],
    queryFn: () => svc.fetchIssueSummary(batchId),
    refetchInterval: 15_000,
  });
}

export function usePrepareIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, userCode }: { batchId: string; userCode: string }) =>
      svc.prepareIssueFromBatch(batchId, userCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bn', 'issue-records'] });
      qc.invalidateQueries({ queryKey: ['bn', 'issue-summary'] });
      qc.invalidateQueries({ queryKey: ['bn', 'batch-items'] });
    },
  });
}

export function useExecuteIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ issueIds, userCode }: { issueIds: string[]; userCode: string }) =>
      svc.executeIssue(issueIds, userCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bn', 'issue-records'] });
      qc.invalidateQueries({ queryKey: ['bn', 'issue-summary'] });
      qc.invalidateQueries({ queryKey: ['bn', 'batches'] });
      qc.invalidateQueries({ queryKey: ['bn', 'batch-items'] });
      qc.invalidateQueries({ queryKey: ['bn', 'payables'] });
    },
  });
}

export function useExecuteIssueAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: svc.ExecuteIssueActionParams) => svc.executeIssueAction(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bn', 'issue-records'] });
      qc.invalidateQueries({ queryKey: ['bn', 'issue-record'] });
      qc.invalidateQueries({ queryKey: ['bn', 'issue-summary'] });
    },
  });
}

export function useReleaseHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ issueId, userCode, reason }: { issueId: string; userCode: string; reason?: string }) =>
      svc.releaseHoldingPayment(issueId, userCode, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bn', 'issue-records'] });
      qc.invalidateQueries({ queryKey: ['bn', 'issue-record'] });
      qc.invalidateQueries({ queryKey: ['bn', 'issue-summary'] });
    },
  });
}
