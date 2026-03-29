/**
 * React hooks for Internal Audit workflow gates, conflict checks,
 * and plan approval workflow integration.
 *
 * Calls the ia_* RPC functions created in Phase 2/3.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ============= Types =============

export interface AvailabilityConflict {
  type: 'holiday' | 'leave' | 'engagement_overlap';
  auditor_id?: string;
  auditor_name?: string;
  date?: string;
  date_start?: string;
  date_end?: string;
  leave_type?: string;
  reference?: string;
  severity: 'warning' | 'blocking';
  affects_all?: boolean;
}

export interface AvailabilityResult {
  valid: boolean;
  conflicts: AvailabilityConflict[];
  total_conflicts: number;
  has_blocking: boolean;
  message?: string;
}

export interface EngagementGateResult {
  can_start: boolean;
  reasons: string[];
  engagement_status?: string;
  plan_status?: string;
}

export interface CompletenessResult {
  passed: boolean;
  evidence_count: number;
  working_papers_count: number;
  findings_count: number;
  reasons: string[];
  checked_at?: string;
}

export interface ReportGateResult {
  can_issue: boolean;
  reasons: string[];
  evidence_count: number;
  working_papers_count: number;
  findings_count: number;
}

export interface WorkflowStartResult {
  success: boolean;
  error?: string;
  workflow_instance_id?: string;
  task_id?: string;
  version_number?: number;
  new_status?: string;
  conflicts?: AvailabilityResult;
}

export interface PlanRevisionResult {
  success: boolean;
  error?: string;
  requires_reapproval?: boolean;
  message?: string;
  workflow_instance_id?: string;
}

// ============= Team Availability Check =============

export function useTeamAvailabilityCheck() {
  const { toast } = useToast();

  return useMutation({
    mutationKey: ['InternalAudit', 'ia_execution_gates', 'mutation'],
    mutationFn: async (params: {
      planId?: string;
      engagementId?: string;
      auditorIds?: string[];
      dateFrom?: string;
      dateTo?: string;
    }): Promise<AvailabilityResult> => {
      const { data, error } = await supabase.rpc('ia_validate_team_availability', {
        p_plan_id: params.planId || null,
        p_engagement_id: params.engagementId || null,
        p_auditor_ids: params.auditorIds || null,
        p_date_from: params.dateFrom || null,
        p_date_to: params.dateTo || null,
      });
      if (error) throw error;
      return data as unknown as AvailabilityResult;
    },
    onError: (e: any) => {
      toast({ title: 'Availability Check Failed', description: e.message, variant: 'destructive' });
    },
  });
}

/** Query-based version — auto-fetches conflicts for a given plan or engagement */
export function useAvailabilityConflicts(planId?: string, engagementId?: string) {
  return useQuery({
    queryKey: ['ia_availability_conflicts', planId, engagementId],
    queryFn: async () => {
      let q = supabase.from('ia_availability_conflicts' as any).select('*').eq('resolved', false);
      if (planId) q = q.eq('plan_id', planId);
      if (engagementId) q = q.eq('engagement_id', engagementId);
      q = q.order('created_at', { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!(planId || engagementId),
  });
}

// ============= Engagement Execution Gate =============

export function useCanStartEngagement(engagementId?: string) {
  return useQuery({
    queryKey: ['ia_can_start_engagement', engagementId],
    queryFn: async (): Promise<EngagementGateResult> => {
      const { data, error } = await supabase.rpc('ia_can_start_engagement', {
        p_engagement_id: engagementId!,
      });
      if (error) throw error;
      return data as unknown as EngagementGateResult;
    },
    enabled: !!engagementId,
  });
}

// ============= Engagement Completeness Check =============

export function useEngagementCompleteness(engagementId?: string) {
  return useQuery({
    queryKey: ['ia_engagement_completeness', engagementId],
    queryFn: async (): Promise<CompletenessResult> => {
      const { data, error } = await supabase.rpc('ia_check_engagement_completeness', {
        p_engagement_id: engagementId!,
      });
      if (error) throw error;
      return data as unknown as CompletenessResult;
    },
    enabled: !!engagementId,
  });
}

export function useCheckEngagementCompleteness() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationKey: ['InternalAudit', 'ia_execution_gates', 'mutation'],
    mutationFn: async (engagementId: string): Promise<CompletenessResult> => {
      const { data, error } = await supabase.rpc('ia_check_engagement_completeness', {
        p_engagement_id: engagementId,
      });
      if (error) throw error;
      return data as unknown as CompletenessResult;
    },
    onSuccess: (result, engagementId) => {
      queryClient.invalidateQueries({ queryKey: ['ia_engagement_completeness', engagementId] });
      if (result.passed) {
        toast({ title: 'Completeness Check Passed', description: 'All required artefacts are present.' });
      } else {
        toast({
          title: 'Completeness Check Failed',
          description: result.reasons.join('; '),
          variant: 'destructive',
        });
      }
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });
}

// ============= Report Issuance Gate =============

export function useCanIssueReport(reportId?: string) {
  return useQuery({
    queryKey: ['ia_can_issue_report', reportId],
    queryFn: async (): Promise<ReportGateResult> => {
      const { data, error } = await supabase.rpc('ia_can_issue_report', {
        p_report_id: reportId!,
      });
      if (error) throw error;
      return data as unknown as ReportGateResult;
    },
    enabled: !!reportId,
  });
}

// ============= Plan Approval Workflow =============

export function useStartPlanApproval() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationKey: ['InternalAudit', 'ia_execution_gates', 'mutation'],
    mutationFn: async (params: {
      planId: string;
      submittedBy: string;
      isRevision?: boolean;
    }): Promise<WorkflowStartResult> => {
      const { data, error } = await supabase.rpc('ia_start_plan_approval_workflow', {
        p_plan_id: params.planId,
        p_submitted_by: params.submittedBy,
        p_is_revision: params.isRevision || false,
      });
      if (error) throw error;
      return data as unknown as WorkflowStartResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ia_annual_plans'] });
      queryClient.invalidateQueries({ queryKey: ['ia_plan_versions'] });
      queryClient.invalidateQueries({ queryKey: ['workflow_instances'] });

      if (result.success) {
        toast({
          title: 'Plan Submitted',
          description: `Plan submitted for approval (v${result.version_number}). Workflow started.`,
        });
      } else {
        toast({ title: 'Submission Failed', description: result.error, variant: 'destructive' });
      }
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });
}

// ============= Plan Revision =============

export function useApplyPlanRevision() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationKey: ['InternalAudit', 'ia_execution_gates', 'mutation'],
    mutationFn: async (params: {
      planId: string;
      changes: Record<string, any>;
      requestedBy: string;
      reason?: string;
    }): Promise<PlanRevisionResult> => {
      const { data, error } = await supabase.rpc('ia_apply_plan_revision', {
        p_plan_id: params.planId,
        p_changes: params.changes,
        p_requested_by: params.requestedBy,
        p_reason: params.reason || null,
      });
      if (error) throw error;
      return data as unknown as PlanRevisionResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ia_annual_plans'] });
      queryClient.invalidateQueries({ queryKey: ['ia_plan_change_log'] });

      if (result.success) {
        if (result.requires_reapproval !== false) {
          toast({
            title: 'Revision Submitted',
            description: 'Material changes detected — revision sent for re-approval.',
          });
        } else {
          toast({
            title: 'Changes Saved',
            description: result.message || 'Minor changes logged without re-approval.',
          });
        }
      } else {
        toast({ title: 'Revision Failed', description: result.error, variant: 'destructive' });
      }
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });
}

// ============= Plan Versions =============

export function usePlanVersions(planId?: string) {
  return useQuery({
    queryKey: ['ia_plan_versions', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_plan_versions' as any)
        .select('*')
        .eq('plan_id', planId!)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!planId,
  });
}

// ============= Execution Gate Config =============

export function useExecutionGateConfig() {
  return useQuery({
    queryKey: ['ia_execution_gate_config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_execution_gate_config' as any)
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data as any[];
    },
  });
}
