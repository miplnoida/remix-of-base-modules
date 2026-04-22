// ============================================
// useEmployerSelectionOrchestrator
// Adds the three controlled employer-selection paths to a weekly plan:
//   1. Recommended  (system intelligence — already wired via addCandidateToDay)
//   2. Direct       (operator picks any employer from Employer Master)
//   3. Exception    (controlled override with category + reason note + audit + approval)
//
// All paths route through the existing `addManualItem` mutation but enrich the
// request with `selection_mode` + exception metadata, and append an audit row
// to `ce_weekly_plan_item_audit`. NO free-text employer entry is allowed —
// employer details always come from `er_master`.
// ============================================
import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DayOfWeek } from '@/hooks/useWeeklyPlanBuilder';
import {
  CreatePlanItemRequest,
  PlanItemPriority,
  PlanItemType,
  PlanVisitType,
  WeeklyPlanItem,
} from '@/types/weeklyPlan';
import type { EmployerMasterRecord } from '@/components/compliance/weekly-plan/EmployerMasterSearch';

export type SelectionMode = 'RECOMMENDED' | 'DIRECT' | 'EXCEPTION';

export const EXCEPTION_CATEGORIES = [
  { value: 'COMPLAINT_BASED',         label: 'Complaint-based',                requiresNote: false },
  { value: 'MANAGEMENT_INSTRUCTION',  label: 'Management instruction',         requiresNote: true  },
  { value: 'LEGAL_REFERRAL',          label: 'Legal referral',                 requiresNote: true  },
  { value: 'REGULATORY_REQUEST',      label: 'Regulatory request',             requiresNote: true  },
  { value: 'PRIOR_AUDIT_FOLLOW_UP',   label: 'Follow-up from prior audit',     requiresNote: false },
  { value: 'FIELD_OFFICER_RECO',      label: 'Field officer recommendation',   requiresNote: false },
  { value: 'SPECIAL_DRIVE',           label: 'Special drive / campaign',       requiresNote: false },
  { value: 'DATA_CORRECTION',         label: 'Data correction / missed by engine', requiresNote: false },
  { value: 'OTHER',                   label: 'Other',                          requiresNote: true  },
] as const;

export type ExceptionCategory = typeof EXCEPTION_CATEGORIES[number]['value'];

/** Categories that require Senior/Manager approval before they reach a plan submission. */
const APPROVAL_REQUIRED: Set<ExceptionCategory> = new Set([
  'MANAGEMENT_INSTRUCTION',
  'LEGAL_REFERRAL',
  'REGULATORY_REQUEST',
  'OTHER',
]);

export function isApprovalRequired(category: ExceptionCategory) {
  return APPROVAL_REQUIRED.has(category);
}

export function isNoteRequired(category: ExceptionCategory) {
  return EXCEPTION_CATEGORIES.find(c => c.value === category)?.requiresNote ?? false;
}

// ---------- Validation against existing plan items ----------
export interface EmployerValidationResult {
  duplicate: boolean;            // already in this week's plan
  inactive: boolean;             // employer status != 'A'
  recentlyAuditedDays: number | null; // days since last completed visit (any plan)
  warnings: string[];
  blocking: string[];
}

export function validateEmployerForPlan(
  employer: EmployerMasterRecord,
  existingItems: WeeklyPlanItem[],
  recentVisits?: { scheduled_date: string | null; execution_status: string }[],
): EmployerValidationResult {
  const warnings: string[] = [];
  const blocking: string[] = [];

  const duplicate = existingItems.some(
    i => (i.employer_id || '').trim() === (employer.regno || '').trim() && !!employer.regno,
  );
  if (duplicate) blocking.push('Employer is already in this weekly plan.');

  const inactive = employer.status !== 'A';
  if (inactive) {
    warnings.push(
      employer.status === 'D'
        ? 'Employer is deregistered in Employer Master.'
        : 'Employer is not active in Employer Master.',
    );
  }

  let recentlyAuditedDays: number | null = null;
  if (recentVisits?.length) {
    const completed = recentVisits
      .filter(v => v.execution_status === 'COMPLETED' && v.scheduled_date)
      .map(v => new Date(v.scheduled_date as string).getTime())
      .sort((a, b) => b - a);
    if (completed[0]) {
      recentlyAuditedDays = Math.floor((Date.now() - completed[0]) / 86400000);
      if (recentlyAuditedDays >= 0 && recentlyAuditedDays < 60) {
        warnings.push(`Employer was audited ${recentlyAuditedDays} days ago — confirm a fresh visit is justified.`);
      }
    }
  }

  return { duplicate, inactive, recentlyAuditedDays, warnings, blocking };
}

// ---------- Recent-visit lookup (for downstream intelligence) ----------
export function useEmployerRecentVisits(regno: string | null) {
  return useQuery({
    queryKey: ['ce-wpi-recent', regno],
    queryFn: async () => {
      if (!regno) return [];
      const { data } = await supabase
        .from('ce_weekly_plan_items')
        .select('scheduled_date, execution_status, plan_id, item_type, visit_type, created_at')
        .eq('employer_id', regno)
        .order('scheduled_date', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!regno,
    staleTime: 60_000,
  });
}

// ---------- Audit-trail lookup ----------
export function usePlanItemAuditTrail(planId: string | null | undefined) {
  return useQuery({
    queryKey: ['ce-wpi-audit', planId],
    queryFn: async () => {
      if (!planId) return [];
      const { data } = await supabase
        .from('ce_weekly_plan_item_audit')
        .select('*')
        .eq('plan_id', planId)
        .order('performed_at', { ascending: false })
        .limit(200);
      return data || [];
    },
    enabled: !!planId,
    staleTime: 30_000,
  });
}

// ---------- Orchestrator ----------
export interface OrchestratorOptions {
  planId: string | null | undefined;
  weekDays: { name: DayOfWeek; date: string }[];
  userCode: string | null | undefined;
  /** Wraps the existing `addManualItem` mutation from useWeeklyPlanBuilder. */
  addItem: (item: Omit<CreatePlanItemRequest, 'plan_id' | 'created_by'>) => Promise<unknown>;
}

export function useEmployerSelectionOrchestrator(opts: OrchestratorOptions) {
  const { planId, weekDays, userCode, addItem } = opts;
  const { toast } = useToast();
  const qc = useQueryClient();

  const writeAudit = useCallback(
    async (row: {
      action: string;
      itemId?: string | null;
      employer?: EmployerMasterRecord | null;
      selection_mode?: SelectionMode;
      exception_category?: ExceptionCategory;
      exception_reason_note?: string;
      override_note?: string;
      snapshot?: Record<string, unknown>;
    }) => {
      if (!planId) return;
      try {
        await supabase.from('ce_weekly_plan_item_audit').insert({
          plan_id: planId,
          item_id: row.itemId ?? null,
          action: row.action,
          selection_mode: row.selection_mode ?? null,
          employer_id: row.employer?.regno ?? null,
          employer_name: row.employer?.name ?? row.employer?.trade_name ?? null,
          exception_category: row.exception_category ?? null,
          exception_reason_note: row.exception_reason_note ?? null,
          override_note: row.override_note ?? null,
          snapshot: row.snapshot ?? null,
          performed_by: userCode || 'unknown',
        });
        qc.invalidateQueries({ queryKey: ['ce-wpi-audit', planId] });
      } catch (e) {
        console.warn('[plan-audit] failed', e);
      }
    },
    [planId, userCode, qc],
  );

  const buildBaseRequest = useCallback(
    (
      employer: EmployerMasterRecord,
      day: DayOfWeek,
      visitType: string,
      priority: string,
      selectionMode: SelectionMode,
      extras?: Partial<CreatePlanItemRequest>,
    ): Omit<CreatePlanItemRequest, 'plan_id' | 'created_by'> => {
      const dayInfo = weekDays.find(d => d.name === day);
      return {
        item_type: PlanItemType.EMPLOYER_VISIT,
        day_of_week: day,
        scheduled_date: dayInfo?.date,
        visit_type: visitType,
        priority,
        employer_id: employer.regno,
        employer_name: employer.name || employer.trade_name || employer.regno,
        source_type: 'MANUAL',
        purpose: extras?.purpose,
        ...(extras ?? {}),
        // @ts-expect-error — extra DB columns not in CreatePlanItemRequest type
        selection_mode: selectionMode,
      };
    },
    [weekDays],
  );

  const addDirectEmployer = useCallback(
    async (params: {
      employer: EmployerMasterRecord;
      day: DayOfWeek;
      visitType?: string;
      priority?: string;
      purpose?: string;
    }) => {
      const req = buildBaseRequest(
        params.employer,
        params.day,
        params.visitType || PlanVisitType.AUDIT,
        params.priority || PlanItemPriority.MEDIUM,
        'DIRECT',
        { purpose: params.purpose },
      );
      await addItem(req);
      await writeAudit({
        action: 'ADDED_DIRECT',
        employer: params.employer,
        selection_mode: 'DIRECT',
        snapshot: req as Record<string, unknown>,
      });
      toast({
        title: 'Added to Plan',
        description: `${params.employer.name || params.employer.regno} (Direct selection)`,
      });
    },
    [addItem, buildBaseRequest, writeAudit, toast],
  );

  const addExceptionEmployer = useCallback(
    async (params: {
      employer: EmployerMasterRecord;
      day: DayOfWeek;
      category: ExceptionCategory;
      reasonNote?: string;
      visitType?: string;
      priority?: string;
      purpose?: string;
    }) => {
      const noteRequired = isNoteRequired(params.category);
      if (noteRequired && !(params.reasonNote || '').trim()) {
        throw new Error('A reason note is required for this exception category.');
      }
      const approvalRequired = isApprovalRequired(params.category);

      const req = buildBaseRequest(
        params.employer,
        params.day,
        params.visitType || PlanVisitType.AUDIT,
        params.priority || PlanItemPriority.HIGH,
        'EXCEPTION',
        {
          purpose: params.purpose,
          // @ts-expect-error extended columns
          exception_category: params.category,
          // @ts-expect-error extended columns
          exception_reason_note: params.reasonNote || null,
          // @ts-expect-error extended columns
          exception_status: approvalRequired ? 'PENDING_APPROVAL' : 'NOT_REQUIRED',
        },
      );
      await addItem(req);
      await writeAudit({
        action: 'ADDED_EXCEPTION',
        employer: params.employer,
        selection_mode: 'EXCEPTION',
        exception_category: params.category,
        exception_reason_note: params.reasonNote,
        snapshot: req as Record<string, unknown>,
      });
      toast({
        title: approvalRequired ? 'Exception Submitted for Approval' : 'Exception Added',
        description: approvalRequired
          ? 'Routed for supervisor approval per policy.'
          : 'Recorded with full audit trail.',
      });
    },
    [addItem, buildBaseRequest, writeAudit, toast],
  );

  const recordRecommendedAudit = useCallback(
    async (params: { employer: { regno: string | null; name: string | null }; itemId?: string | null }) => {
      await writeAudit({
        action: 'ADDED_RECOMMENDED',
        selection_mode: 'RECOMMENDED',
        employer: {
          regno: params.employer.regno || '',
          name: params.employer.name,
          trade_name: null,
          status: null,
          sector_code: null,
          activity_type: null,
          office_code: null,
          phone: null,
          email: null,
        },
        itemId: params.itemId,
      });
    },
    [writeAudit],
  );

  const approveException = useCallback(async (itemId: string, note?: string) => {
    const { error } = await supabase
      .from('ce_weekly_plan_items')
      .update({
        // @ts-expect-error extended columns
        exception_status: 'APPROVED',
        // @ts-expect-error extended columns
        exception_approved_by: userCode || 'unknown',
        // @ts-expect-error extended columns
        exception_approved_at: new Date().toISOString(),
      })
      .eq('id', itemId);
    if (error) throw error;
    await writeAudit({ action: 'EXCEPTION_APPROVED', itemId, override_note: note });
    qc.invalidateQueries({ queryKey: ['weekly-plan-items'] });
    toast({ title: 'Exception Approved' });
  }, [userCode, writeAudit, qc, toast]);

  const rejectException = useCallback(async (itemId: string, note?: string) => {
    const { error } = await supabase
      .from('ce_weekly_plan_items')
      .update({
        // @ts-expect-error extended columns
        exception_status: 'REJECTED',
        // @ts-expect-error extended columns
        exception_approved_by: userCode || 'unknown',
        // @ts-expect-error extended columns
        exception_approved_at: new Date().toISOString(),
      })
      .eq('id', itemId);
    if (error) throw error;
    await writeAudit({ action: 'EXCEPTION_REJECTED', itemId, override_note: note });
    qc.invalidateQueries({ queryKey: ['weekly-plan-items'] });
    toast({ title: 'Exception Rejected', variant: 'destructive' });
  }, [userCode, writeAudit, qc, toast]);

  return useMemo(
    () => ({
      addDirectEmployer,
      addExceptionEmployer,
      recordRecommendedAudit,
      approveException,
      rejectException,
      writeAudit,
    }),
    [addDirectEmployer, addExceptionEmployer, recordRecommendedAudit, approveException, rejectException, writeAudit],
  );
}
