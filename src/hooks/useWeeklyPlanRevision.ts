// ============================================
// PHASE 3 — Approved Plan Revision Hooks
// ============================================
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { weeklyPlanService } from '@/services/weeklyPlanService';
import { useUserCode } from '@/hooks/useUserCode';
import { useToast } from '@/hooks/use-toast';
import type { WeeklyPlan } from '@/types/weeklyPlan';

export function useWeeklyPlanRevision() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { userCode, userId } = useUserCode();
  const { toast } = useToast();
  const actor = userCode || userId || '';

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['my-weekly-plans'] });
    queryClient.invalidateQueries({ queryKey: ['plan-version-history'] });
    queryClient.invalidateQueries({ queryKey: ['plan-compare'] });
  };

  const requestRevision = useMutation({
    mutationFn: async (vars: { planId: string; reasonCode: string; reasonText: string }) => {
      if (!actor) throw new Error('You must be signed in to request a revision.');
      return weeklyPlanService.requestRevision(vars.planId, vars.reasonCode, vars.reasonText, actor);
    },
    onSuccess: (newRevisionId) => {
      toast({ title: 'Revision Created', description: 'Edit the new draft revision and submit for re-approval.' });
      invalidate();
      navigate(`/compliance/audit-planning/weekly-plan-builder?planId=${newRevisionId}`);
    },
    onError: (err: any) => toast({ title: 'Could not start revision', description: err?.message || 'Unknown error', variant: 'destructive' }),
  });

  const submitRevision = useMutation({
    mutationFn: async (revisionId: string) => weeklyPlanService.submitRevision(revisionId, actor),
    onSuccess: () => { toast({ title: 'Revision Submitted', description: 'Sent to manager for re-approval.' }); invalidate(); },
    onError: (err: any) => toast({ title: 'Submit failed', description: err?.message, variant: 'destructive' }),
  });

  const approveRevision = useMutation({
    mutationFn: async (vars: { revisionId: string; notes: string }) =>
      weeklyPlanService.approveRevision(vars.revisionId, vars.notes, actor),
    onSuccess: () => { toast({ title: 'Revision Approved', description: 'Previous version superseded.' }); invalidate(); },
    onError: (err: any) => toast({ title: 'Approve failed', description: err?.message, variant: 'destructive' }),
  });

  const rejectRevision = useMutation({
    mutationFn: async (vars: { revisionId: string; notes: string }) =>
      weeklyPlanService.rejectRevision(vars.revisionId, vars.notes, actor),
    onSuccess: () => { toast({ title: 'Revision Rejected', description: 'Previous approved version restored.' }); invalidate(); },
    onError: (err: any) => toast({ title: 'Reject failed', description: err?.message, variant: 'destructive' }),
  });

  const queryRevision = useMutation({
    mutationFn: async (vars: { revisionId: string; notes: string }) =>
      weeklyPlanService.queryRevision(vars.revisionId, vars.notes, actor),
    onSuccess: () => { toast({ title: 'Revision Queried', description: 'Sent back to inspector for changes.' }); invalidate(); },
    onError: (err: any) => toast({ title: 'Query failed', description: err?.message, variant: 'destructive' }),
  });

  const promoteRevision = useMutation({
    mutationFn: async (revisionId: string) => weeklyPlanService.promoteRevision(revisionId, actor),
    onSuccess: () => { toast({ title: 'Revision Promoted' }); invalidate(); },
    onError: (err: any) => toast({ title: 'Promote failed', description: err?.message, variant: 'destructive' }),
  });

  return { requestRevision, submitRevision, approveRevision, rejectRevision, queryRevision, promoteRevision };
}

export function usePlanVersionHistory(planId: string | null | undefined) {
  return useQuery<WeeklyPlan[]>({
    queryKey: ['plan-version-history', planId],
    queryFn: () => weeklyPlanService.getVersionHistory(planId as string),
    enabled: !!planId,
  });
}

export function usePlanCompare(baseId: string | null | undefined, revisedId: string | null | undefined) {
  return useQuery<any>({
    queryKey: ['plan-compare', baseId, revisedId],
    queryFn: () => weeklyPlanService.comparePlanVersions(baseId as string, revisedId as string),
    enabled: !!baseId && !!revisedId,
  });
}

export function useRevisionReasons() {
  return useQuery({
    queryKey: ['plan-revision-reasons'],
    queryFn: () => weeklyPlanService.getRevisionReasons(),
    staleTime: 5 * 60_000,
  });
}
