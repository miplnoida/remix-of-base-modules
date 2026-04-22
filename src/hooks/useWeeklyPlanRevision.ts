// ============================================
// PHASE 3 — Approved Plan Revision Hook
// ============================================
// Wraps the revision RPCs (fn_ce_create_plan_revision / fn_ce_promote_plan_revision)
// and exposes a typed React Query interface for UI components.
//
// Reuses existing tables: ce_weekly_plans, ce_weekly_plan_items, ce_weekly_plan_reviews.
// No new data model — only versioning columns added in Phase 1.
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

  const requestRevision = useMutation({
    mutationFn: async (vars: { planId: string; reason: string }) => {
      if (!actor) throw new Error('You must be signed in to request a revision.');
      return weeklyPlanService.requestRevision(vars.planId, vars.reason, actor);
    },
    onSuccess: (newRevisionId) => {
      toast({
        title: 'Revision Created',
        description: 'A new draft revision has been created. Update it and resubmit for approval.',
      });
      queryClient.invalidateQueries({ queryKey: ['my-weekly-plans'] });
      queryClient.invalidateQueries({ queryKey: ['plan-version-history'] });
      // Navigate the inspector into the builder to edit the new draft.
      navigate(`/compliance/audit-planning/weekly-plan-builder?planId=${newRevisionId}`);
    },
    onError: (err: any) => {
      toast({ title: 'Could not start revision', description: err?.message || 'Unknown error', variant: 'destructive' });
    },
  });

  const promoteRevision = useMutation({
    mutationFn: async (revisionId: string) => {
      if (!actor) throw new Error('You must be signed in to promote a revision.');
      await weeklyPlanService.promoteRevision(revisionId, actor);
    },
    onSuccess: () => {
      toast({ title: 'Revision Promoted', description: 'The revision is now the current approved plan.' });
      queryClient.invalidateQueries({ queryKey: ['my-weekly-plans'] });
      queryClient.invalidateQueries({ queryKey: ['plan-version-history'] });
    },
    onError: (err: any) => {
      toast({ title: 'Could not promote revision', description: err?.message || 'Unknown error', variant: 'destructive' });
    },
  });

  return { requestRevision, promoteRevision };
}

/** Version history of an entire plan family (root + revisions). */
export function usePlanVersionHistory(planId: string | null | undefined) {
  return useQuery<WeeklyPlan[]>({
    queryKey: ['plan-version-history', planId],
    queryFn: () => weeklyPlanService.getVersionHistory(planId as string),
    enabled: !!planId,
  });
}
