// ============================================
// WEEKLY PLAN BUILDER HOOK - DB-BACKED
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useUserCode } from '@/hooks/useUserCode';
import { supabase } from '@/integrations/supabase/client';
import { weeklyPlanService, planItemService } from '@/services/weeklyPlanService';
import { planCandidateService } from '@/services/planCandidateService';
import { inspectionNominationService } from '@/services/inspectionNominationService';
import {
  WeeklyPlan,
  WeeklyPlanItem,
  WeeklyPlanStatus,
  PlanCandidate,
  PlanCandidateV3,
  CreateWeeklyPlanRequest,
  CreatePlanItemRequest,
  PlanItemExecutionStatus,
} from '@/types/weeklyPlan';
import { CANDIDATE_REASON_LABELS } from '@/services/planCandidateService';
import { startOfWeek, endOfWeek, addDays, format } from 'date-fns';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
export type DayOfWeek = typeof DAYS_OF_WEEK[number];

export function getWeekDates(refDate: Date = new Date()) {
  const weekStart = startOfWeek(refDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(refDate, { weekStartsOn: 1 });
  const days = DAYS_OF_WEEK.map((name, i) => ({
    name,
    date: format(addDays(weekStart, i), 'yyyy-MM-dd'),
    label: format(addDays(weekStart, i), 'MMM d'),
  }));
  return {
    weekStart: format(weekStart, 'yyyy-MM-dd'),
    weekEnd: format(addDays(weekStart, 4), 'yyyy-MM-dd'), // Friday
    weekEndSunday: format(weekEnd, 'yyyy-MM-dd'),
    days,
  };
}

export interface GroupedCandidates {
  VIOLATION: PlanCandidate[];
  FOLLOW_UP: PlanCandidate[];
  SCOUTING_LEAD: PlanCandidate[];
  CASE: PlanCandidate[];
  NOTICE: PlanCandidate[];
}

export type CandidatesByBucket = Record<PlanCandidateV3['bucket'], PlanCandidateV3[]>;
export type CandidatesByMandatoryClass = Record<
  PlanCandidateV3['mandatory_class'],
  PlanCandidateV3[]
>;

const EMPTY_BUCKETS: CandidatesByBucket = {
  MUST_SCHEDULE: [],
  REACTIVE_ENFORCEMENT: [],
  RISK_MONITORING: [],
  ROUTINE_COVERAGE: [],
  CAMPAIGN_INTEL: [],
};

export function useWeeklyPlanBuilder() {
  const { toast } = useToast();
  const { userCode, userId, fullName, isLoading: userLoading } = useUserCode();
  const queryClient = useQueryClient();

  // Resolve ce_inspectors.id from the user's profile_id
  const inspectorQuery = useQuery({
    queryKey: ['ce-inspector-for-user', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('ce_inspectors' as any)
        .select('id, inspector_code')
        .eq('profile_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as { id: string; inspector_code: string } | null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
  const inspectorId = inspectorQuery.data?.id ?? null;

  // Week selection
  const [selectedWeekRef, setSelectedWeekRef] = useState(new Date());
  const week = useMemo(() => getWeekDates(selectedWeekRef), [selectedWeekRef]);

  // Active plan for this week
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  // Check if a plan already exists for this week.
  // Prefer the real active/current version that matches the unique active-plan
  // rule, then fall back to editable drafts. This avoids selecting a withdrawn
  // historical row when an approved/current version already exists.
  const existingPlanQuery = useQuery({
    queryKey: ['weekly-plan-existing', week.weekStart, inspectorId],
    queryFn: async () => {
      if (!inspectorId) return null;
      const plans = await weeklyPlanService.getAll({
        inspectorId,
        weekStartDate: week.weekStart,
      });
      if (plans.length === 0) return null;

      const activeCurrent = plans.find((p: any) =>
        p.is_current_version === true && !['WITHDRAWN', 'SUPERSEDED'].includes(p.status)
      );
      if (activeCurrent) return activeCurrent;

      const editableFallback = plans.find((p: any) =>
        [WeeklyPlanStatus.DRAFT, WeeklyPlanStatus.NEEDS_CHANGES, WeeklyPlanStatus.WITHDRAWN].includes(p.status)
      );
      return editableFallback ?? plans[0];
    },
    enabled: !!inspectorId,
  });

  // Set active plan when found
  useEffect(() => {
    if (existingPlanQuery.data) {
      setActivePlanId(existingPlanQuery.data.id);
    } else {
      setActivePlanId(null);
    }
  }, [existingPlanQuery.data]);

  const activePlan = existingPlanQuery.data ?? null;

  // Plan items
  const planItemsQuery = useQuery({
    queryKey: ['weekly-plan-items', activePlanId],
    queryFn: () => planItemService.getByPlanId(activePlanId!),
    enabled: !!activePlanId,
  });

  const planItems = planItemsQuery.data ?? [];

  // Items grouped by day
  const itemsByDay = useMemo(() => {
    const map: Record<DayOfWeek, WeeklyPlanItem[]> = {
      Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [],
    };
    for (const item of planItems) {
      const dow = (item.day_of_week as DayOfWeek) || null;
      if (dow && map[dow]) {
        map[dow].push(item);
      }
    }
    // Sort each day by scheduled_start_time
    for (const day of DAYS_OF_WEEK) {
      map[day].sort((a, b) => (a.scheduled_start_time || '').localeCompare(b.scheduled_start_time || ''));
    }
    return map;
  }, [planItems]);

  // Candidates — Phase 3: V3 engine.
  // NOTE: Zone filter intentionally disabled for now (per request).
  // We do NOT pass inspectorId/zoneId so the RPC returns candidates across
  // all zones. Re-enable by passing { inspectorId } when zone scoping is wanted.
  const candidatesQuery = useQuery({
    queryKey: ['plan-candidates-v3', 'no-zone-filter', inspectorId],
    queryFn: () =>
      planCandidateService.getScoredCandidatesV3({
        zoneId: null,
        inspectorId: null,
        limit: 500,
      }),
    enabled: !!inspectorId,
    staleTime: 60_000,
  });

  const candidatesV3: PlanCandidateV3[] = candidatesQuery.data ?? [];

  // Map V3 → legacy PlanCandidate shape (kept for downstream UI compatibility),
  // preserving why_selected / mandatory_class / bucket via reason labels.
  const candidates = useMemo<PlanCandidate[]>(() => {
    return candidatesV3.map((v): PlanCandidate => {
      const reasonLabel =
        CANDIDATE_REASON_LABELS[v.candidate_reason] || v.candidate_reason;
      return {
        source_type: v.candidate_source,
        source_id: `${v.employer_id}-${v.candidate_source}`,
        source_ref: v.employer_id,
        employer_id: v.employer_id,
        employer_name: v.employer_name,
        territory: v.territory,
        priority: v.derived_priority,
        source_status: v.candidate_reason,
        financial_exposure: v.financial_exposure,
        due_date: v.next_due_date,
        assigned_to_user_id: null,
        source_created_at: new Date().toISOString(),
        description: v.why_selected || reasonLabel,
        recommendation_score: v.audit_priority_score,
      };
    });
  }, [candidatesV3]);

  const groupedCandidates = useMemo<GroupedCandidates>(() => {
    const groups: GroupedCandidates = {
      VIOLATION: [], FOLLOW_UP: [], SCOUTING_LEAD: [], CASE: [], NOTICE: [],
    };
    for (const c of candidates) {
      const key = c.source_type as keyof GroupedCandidates;
      if (groups[key]) groups[key].push(c);
    }
    return groups;
  }, [candidates]);

  // Phase 3: bucket allocation grouping (Must Schedule / Reactive / etc.)
  const candidatesByBucket = useMemo<CandidatesByBucket>(() => {
    const groups: CandidatesByBucket = {
      MUST_SCHEDULE: [],
      REACTIVE_ENFORCEMENT: [],
      RISK_MONITORING: [],
      ROUTINE_COVERAGE: [],
      CAMPAIGN_INTEL: [],
    };
    for (const v of candidatesV3) {
      (groups[v.bucket] ?? groups.CAMPAIGN_INTEL).push(v);
    }
    return groups;
  }, [candidatesV3]);

  // Phase 3: mandatory class grouping
  const candidatesByMandatoryClass = useMemo<CandidatesByMandatoryClass>(() => {
    const groups: CandidatesByMandatoryClass = {
      MANDATORY: [], PRIORITY: [], WATCHLIST: [],
    };
    for (const v of candidatesV3) {
      (groups[v.mandatory_class] ?? groups.WATCHLIST).push(v);
    }
    return groups;
  }, [candidatesV3]);

  // Already-added source IDs (to prevent duplicates)
  const addedSourceIds = useMemo(
    () => new Set(planItems.map(i => i.source_id).filter(Boolean)),
    [planItems]
  );

  // ---------- Mutations ----------

  // Create plan
  const createPlanMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !fullName) throw new Error('Not authenticated');
      if (!inspectorId) throw new Error('No inspector profile found for your account. Please contact an administrator.');
      const req: CreateWeeklyPlanRequest = {
        inspector_id: inspectorId,
        inspector_name: fullName,
        week_start_date: week.weekStart,
        week_end_date: week.weekEndSunday,
        created_by: userCode || userId,
      };
      return weeklyPlanService.create(req);
    },
    onSuccess: (plan) => {
      setActivePlanId(plan.id);
      queryClient.invalidateQueries({ queryKey: ['weekly-plan-existing'] });
      toast({ title: 'Plan Created', description: `Draft plan ${plan.plan_number} created for this week.` });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Failed to create plan', variant: 'destructive' });
    },
  });

  // Add item
  const addItemMutation = useMutation({
    mutationFn: (req: CreatePlanItemRequest) => planItemService.create(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-plan-items', activePlanId] });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Failed to add item', variant: 'destructive' });
    },
  });

  // Remove item
  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => planItemService.delete(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-plan-items', activePlanId] });
    },
  });

  // Update item (move day, edit)
  const updateItemMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<WeeklyPlanItem> & { updated_by: string } }) =>
      planItemService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-plan-items', activePlanId] });
    },
  });

  // Submit (first submission)
  const submitMutation = useMutation({
    mutationFn: async (narrative?: string) => {
      if (!activePlanId || !userId) throw new Error('No active plan');
      if (narrative) {
        await weeklyPlanService.update(activePlanId, { narrative, updated_by: userCode || userId });
      }
      await weeklyPlanService.submit(activePlanId, userCode || userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-plan-existing'] });
      toast({ title: 'Plan Submitted', description: 'Your weekly plan has been submitted for supervisor review.' });
    },
    onError: (err: any) => {
      toast({ title: 'Submission Failed', description: err.message, variant: 'destructive' });
    },
  });

  // Resubmit (after changes requested)
  const resubmitMutation = useMutation({
    mutationFn: async (narrative?: string) => {
      if (!activePlanId || !userId) throw new Error('No active plan');
      await weeklyPlanService.resubmit(activePlanId, userCode || userId, narrative);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-plan-existing'] });
      toast({ title: 'Plan Resubmitted', description: 'Your updated plan has been resubmitted for review.' });
    },
    onError: (err: any) => {
      toast({ title: 'Resubmission Failed', description: err.message, variant: 'destructive' });
    },
  });

  // Save narrative (draft update)
  const saveNarrativeMutation = useMutation({
    mutationFn: (narrative: string) => {
      if (!activePlanId) throw new Error('No active plan');
      return weeklyPlanService.update(activePlanId, {
        narrative,
        updated_by: userCode || userId || '',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-plan-existing'] });
      toast({ title: 'Draft Saved', description: 'Plan narrative saved.' });
    },
  });

  // ---------- Actions ----------

  const ensurePlan = useCallback(async (): Promise<string> => {
    if (activePlanId) return activePlanId;
    const plan = await createPlanMutation.mutateAsync();
    return plan.id;
  }, [activePlanId, createPlanMutation]);

  const addCandidateToDay = useCallback(
    async (candidate: PlanCandidate, day: DayOfWeek, extras?: Partial<CreatePlanItemRequest>) => {
      const planId = await ensurePlan();
      const dayInfo = week.days.find(d => d.name === day);
      await addItemMutation.mutateAsync({
        plan_id: planId,
        item_type: candidate.source_type === 'SCOUTING_LEAD' ? 'SCOUTING' : 'EMPLOYER_VISIT',
        day_of_week: day,
        scheduled_date: dayInfo?.date,
        source_type: candidate.source_type,
        source_id: candidate.source_id,
        source_ref: candidate.source_ref,
        employer_id: candidate.employer_id || undefined,
        employer_name: candidate.employer_name || undefined,
        territory: candidate.territory || undefined,
        priority: candidate.priority || 'MEDIUM',
        recommendation_score: candidate.recommendation_score,
        purpose: candidate.description,
        created_by: userCode || userId || '',
        ...extras,
      });
      toast({ title: 'Item Added', description: `Added to ${day}` });
    },
    [ensurePlan, addItemMutation, week.days, userCode, userId, toast]
  );

  const addManualItem = useCallback(
    async (item: Omit<CreatePlanItemRequest, 'plan_id' | 'created_by'>) => {
      const planId = await ensurePlan();
      await addItemMutation.mutateAsync({
        ...item,
        plan_id: planId,
        created_by: userCode || userId || '',
      });
      toast({ title: 'Item Added', description: 'Manual item added to plan.' });
    },
    [ensurePlan, addItemMutation, userCode, userId, toast]
  );

  const moveItemToDay = useCallback(
    async (itemId: string, newDay: DayOfWeek) => {
      const dayInfo = week.days.find(d => d.name === newDay);
      await updateItemMutation.mutateAsync({
        id: itemId,
        updates: {
          day_of_week: newDay,
          scheduled_date: dayInfo?.date || null,
          updated_by: userCode || userId || '',
        },
      });
    },
    [updateItemMutation, week.days, userCode, userId]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      await removeItemMutation.mutateAsync(itemId);
      toast({ title: 'Item Removed' });
    },
    [removeItemMutation, toast]
  );

  const isNeedsChanges = activePlan?.status === WeeklyPlanStatus.NEEDS_CHANGES;
  const isWithdrawn = activePlan?.status === WeeklyPlanStatus.WITHDRAWN;
  const canEdit = !activePlan || activePlan.status === WeeklyPlanStatus.DRAFT || isNeedsChanges || isWithdrawn;

  return {
    // Auth
    userId,
    userCode,
    fullName,
    userLoading,
    inspectorId,
    // Week
    week,
    selectedWeekRef,
    setSelectedWeekRef,
    // Plan
    activePlan,
    activePlanId,
    planItems,
    itemsByDay,
    canEdit,
    isNeedsChanges,
    isLoading: existingPlanQuery.isLoading || planItemsQuery.isLoading,
    // Candidates
    candidates,
    candidatesV3,
    groupedCandidates,
    candidatesByBucket,
    candidatesByMandatoryClass,
    candidatesLoading: candidatesQuery.isLoading,
    addedSourceIds,
    // Actions
    addCandidateToDay,
    addManualItem,
    moveItemToDay,
    removeItem,
    submitPlan: submitMutation.mutateAsync,
    resubmitPlan: resubmitMutation.mutateAsync,
    saveNarrative: saveNarrativeMutation.mutateAsync,
    isSubmitting: submitMutation.isPending || resubmitMutation.isPending,
    isSaving: saveNarrativeMutation.isPending || addItemMutation.isPending,
    // Refresh
    refreshCandidates: () =>
      queryClient.invalidateQueries({ queryKey: ['plan-candidates-v3'] }),
    refreshPlan: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-plan-existing'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-plan-items'] });
    },
  };
}
