import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserCode } from '@/hooks/useUserCode';
import { notifyPlanSubmitted, notifyTeamConflict } from '@/services/iaNotificationService';

type AnnualPlanEngagementRecord = {
  id: string;
  annual_plan_id: string | null;
  department_id?: string | null;
  function_id?: string | null;
  lead_auditor_id?: string | null;
  planned_start_date?: string | null;
  quarter?: string | null;
  estimated_days?: number | null;
  estimated_hours?: number | null;
  is_active?: boolean | null;
};

const ANNUAL_PLAN_ENGAGEMENT_SELECT = [
  'id',
  'annual_plan_id',
  'department_id',
  'function_id',
  'lead_auditor_id',
  'planned_start_date',
  'quarter',
  'estimated_days',
  'estimated_hours',
  'is_active',
].join(', ');

export interface AnnualPlanReadinessCheck {
  label: string;
  passed: boolean;
  detail?: string;
}

export interface AnnualPlanReadinessSummary {
  ready: boolean;
  failedChecks: string[];
  reason?: string;
}

function withDetail(label: string, detail?: string) {
  return detail ? `${label}: ${detail}` : label;
}

export function getAnnualPlanReadinessChecks(plan: any, engagements: any[] = []): AnnualPlanReadinessCheck[] {
  const checks: AnnualPlanReadinessCheck[] = [];

  checks.push({
    label: 'Fiscal year is set',
    passed: !!plan?.fiscal_year,
    detail: !plan?.fiscal_year ? 'Set the fiscal year in plan details.' : undefined,
  });

  checks.push({
    label: 'Plan title is set',
    passed: !!plan?.title?.trim(),
    detail: !plan?.title?.trim() ? 'Enter the annual plan title.' : undefined,
  });

  const hasNarrative = Boolean(
    plan?.executive_summary?.trim() ||
      plan?.objective?.trim() ||
      plan?.methodology?.trim() ||
      plan?.planning_assumptions?.trim()
  );

  checks.push({
    label: 'Planning narrative is complete',
    passed: hasNarrative,
    detail: !hasNarrative ? 'Add the executive summary, objective, methodology, or planning assumptions.' : undefined,
  });

  checks.push({
    label: 'At least one engagement exists',
    passed: engagements.length > 0,
    detail: engagements.length === 0 ? 'Add at least one engagement to the plan.' : `${engagements.length} engagement(s) linked.`,
  });

  const missingDept = engagements.filter((e: any) => !e.department_id && !e.department_name);
  checks.push({
    label: 'All engagements have a department',
    passed: missingDept.length === 0,
    detail: missingDept.length > 0 ? `${missingDept.length} engagement(s) missing department.` : undefined,
  });

  const missingFunction = engagements.filter((e: any) => !e.business_function_id && !e.function_id && !e.function_name);
  checks.push({
    label: 'All engagements have a business function',
    passed: missingFunction.length === 0,
    detail: missingFunction.length > 0 ? `${missingFunction.length} engagement(s) missing function.` : undefined,
  });

  const missingLead = engagements.filter((e: any) => !e.lead_auditor && !e.lead_auditor_id);
  checks.push({
    label: 'All engagements have a lead auditor',
    passed: missingLead.length === 0,
    detail: missingLead.length > 0 ? `${missingLead.length} engagement(s) missing lead auditor.` : undefined,
  });

  const missingSchedule = engagements.filter(
    (e: any) => !e.planned_start_date && !e.start_date && !e.planned_quarter && !e.quarter,
  );
  checks.push({
    label: 'All engagements have schedule',
    passed: missingSchedule.length === 0,
    detail: missingSchedule.length > 0 ? `${missingSchedule.length} engagement(s) missing dates or quarter.` : undefined,
  });

  const missingEffort = engagements.filter((e: any) => !e.estimated_days && !e.estimated_hours);
  checks.push({
    label: 'All engagements have estimated effort',
    passed: missingEffort.length === 0,
    detail: missingEffort.length > 0 ? `${missingEffort.length} engagement(s) missing days or hours.` : undefined,
  });

  return checks;
}

export function summarizeAnnualPlanReadiness(checks: AnnualPlanReadinessCheck[]): AnnualPlanReadinessSummary {
  const failedChecks = checks.filter((check) => !check.passed).map((check) => withDetail(check.label, check.detail));

  return {
    ready: failedChecks.length === 0,
    failedChecks,
    reason: failedChecks.length > 0 ? failedChecks.slice(0, 3).join(' ') : undefined,
  };
}

export function getAnnualPlanReadinessSummary(plan: any, engagements: any[] = []): AnnualPlanReadinessSummary {
  return summarizeAnnualPlanReadiness(getAnnualPlanReadinessChecks(plan, engagements));
}

export function useAuditAnnualPlanReadinessMap(plans: any[] = []) {
  const planIds = useMemo(() => plans.map((plan) => plan.id).filter(Boolean), [plans]);

  const { data = {}, isLoading } = useQuery({
    queryKey: ['ia_annual_plan_readiness_map', planIds],
    queryFn: async () => {
      if (planIds.length === 0) return {} as Record<string, AnnualPlanReadinessSummary>;

      const { data, error } = await supabase
        .from('ia_audit_engagements' as any)
        .select(ANNUAL_PLAN_ENGAGEMENT_SELECT)
        .in('annual_plan_id', planIds);

      if (error) throw error;

      const grouped = new Map<string, any[]>();
      (((data || []) as unknown) as AnnualPlanEngagementRecord[])
        .filter((engagement: any) => engagement.is_active !== false)
        .forEach((engagement: any) => {
          const key = engagement.annual_plan_id;
          if (!key) return;
          const current = grouped.get(key) || [];
          current.push(engagement);
          grouped.set(key, current);
        });

      return plans.reduce<Record<string, AnnualPlanReadinessSummary>>((acc, plan) => {
        acc[plan.id] = getAnnualPlanReadinessSummary(plan, grouped.get(plan.id) || []);
        return acc;
      }, {});
    },
    enabled: planIds.length > 0,
  });

  return { readinessMap: data, isLoading };
}

export async function submitAnnualPlanWorkflow(params: {
  planId: string;
  userCode: string;
  fullName?: string;
  plan?: any;
  engagements?: any[];
  isRevision?: boolean;
}) {
  const [planResult, engagementResult] = await Promise.all([
    params.plan
      ? Promise.resolve({ data: params.plan, error: null })
      : supabase.from('ia_annual_plans' as any).select('*').eq('id', params.planId).single(),
    params.engagements
      ? Promise.resolve({ data: params.engagements, error: null })
      : supabase
          .from('ia_audit_engagements' as any)
          .select(ANNUAL_PLAN_ENGAGEMENT_SELECT)
          .eq('annual_plan_id', params.planId),
  ]);

  if (planResult.error) throw planResult.error;
  if (engagementResult.error) throw engagementResult.error;

  const plan = planResult.data;
  const engagements = (engagementResult.data || []).filter((engagement: any) => engagement.is_active !== false);
  const readiness = getAnnualPlanReadinessSummary(plan, engagements);

  if (!readiness.ready) {
    throw new Error(readiness.reason || 'Plan readiness checks failed.');
  }

  const { data: conflicts, error: conflictError } = await supabase.rpc('ia_validate_team_availability', {
    p_plan_id: params.planId,
    p_engagement_id: null,
    p_auditor_ids: null,
    p_date_from: null,
    p_date_to: null,
  });

  if (conflictError) throw conflictError;

  if ((conflicts as any)?.has_blocking) {
    notifyTeamConflict(params.planId, {
      plan_title: plan?.title || 'Audit Plan',
      conflict_type: 'multiple',
      auditor_name: 'Team',
      conflict_dates: 'See details',
      severity: 'blocking',
    });

    throw new Error(`Team availability check failed with ${(conflicts as any)?.total_conflicts || 0} blocking conflict(s).`);
  }

  const { data: result, error } = await supabase.rpc('ia_start_plan_approval_workflow', {
    p_plan_id: params.planId,
    p_submitted_by: params.userCode,
    p_is_revision: params.isRevision || false,
  });

  if (error) throw error;
  if (!(result as any)?.success) {
    throw new Error((result as any)?.error || 'Failed to start the annual plan approval workflow.');
  }

  const { data: refreshedPlanData, error: refreshedPlanError } = await supabase
    .from('ia_annual_plans' as any)
    .select('workflow_instance_id, current_version_number')
    .eq('id', params.planId)
    .single();

  if (refreshedPlanError) throw refreshedPlanError;

  const refreshedPlan = (refreshedPlanData || {}) as {
    workflow_instance_id?: string | null;
    current_version_number?: number | null;
  };

  const { error: engagementUpdateError } = await supabase
    .from('ia_audit_engagements' as any)
    .update({
      workflow_instance_id: refreshedPlan?.workflow_instance_id || null,
      approved_by: null,
      approved_at: null,
      approved_plan_version: null,
      updated_by: params.userCode,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('annual_plan_id', params.planId);

  if (engagementUpdateError) throw engagementUpdateError;

  notifyPlanSubmitted(params.planId, {
    plan_title: plan?.title || 'Audit Plan',
    fiscal_year: plan?.fiscal_year || '',
    submitted_by: params.userCode,
    submitted_by_name: params.fullName || undefined,
    plan_id: params.planId,
    department_name: '',
    risk_level: '',
  });

  return {
    ...(result as any),
    workflow_instance_id: refreshedPlan?.workflow_instance_id || null,
    current_version_number: refreshedPlan?.current_version_number || null,
  };
}

export function useSubmitAnnualPlanWorkflow() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { userCode, fullName } = useUserCode();

  return useMutation({
    mutationKey: ['InternalAudit', 'ia_annual_plans', 'mutation'],
    mutationFn: async (params: {
      planId: string;
      plan?: any;
      engagements?: any[];
      isRevision?: boolean;
    }) => {
      if (!userCode) {
        throw new Error('Current user identity is unavailable. Please sign in again.');
      }

      const result = await submitAnnualPlanWorkflow({
        ...params,
        userCode,
        fullName: fullName || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['ia_annual_plans'] });
      queryClient.invalidateQueries({ queryKey: ['ia_plan_versions'] });
      queryClient.invalidateQueries({ queryKey: ['workflow_instances'] });
      queryClient.invalidateQueries({ queryKey: ['ia_plan_approval_history'] });
      queryClient.invalidateQueries({ queryKey: ['ia_plan_engagements', params.planId] });

      return result;
    },
    onSuccess: (result: any) => {
      toast({
        title: 'Plan Submitted',
        description: `Plan submitted for approval${result?.version_number ? ` (v${result.version_number})` : ''}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Submission Failed',
        description: error?.message || 'Unable to submit the annual plan for approval.',
        variant: 'destructive',
      });
    },
  });
}