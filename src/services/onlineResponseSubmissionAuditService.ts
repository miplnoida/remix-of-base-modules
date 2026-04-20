/**
 * Phase 6 — Online-response submission audit + workflow routing.
 *
 * Every employer portal submission (acknowledgment, response, dispute,
 * upload, clarification, etc.) is recorded in
 * public.ce_online_response_submission_audit together with the FROZEN
 * snapshot of the policy that was in force when the employer acted.
 *
 * If the snapshot's review block requests a workflow, we kick off a
 * workflow_instance against it so reviewers (inspector / lead / legal)
 * are routed automatically.
 */
import { supabase } from '@/integrations/supabase/client';

export type OnlineResponseSubmissionKind =
  | 'acknowledgment'
  | 'response'
  | 'dispute'
  | 'upload'
  | 'clarification'
  | 'corrective_action'
  | 'payment';

export interface FrozenSnapshot {
  enabled?: boolean | null;
  mode?: string | null;
  permissions?: Record<string, unknown> | null;
  review?: Record<string, unknown> | null;
  matched_policy_id?: string | null;
}

export interface SubmissionAuditInput {
  acknowledgmentId?: string | null;
  communicationId?: string | null;
  inspectionId?: string | null;
  reportId?: string | null;
  kind: OnlineResponseSubmissionKind;
  submissionId?: string | null;
  submitterName?: string | null;
  submitterEmail?: string | null;
  snapshot: FrozenSnapshot;
}

/**
 * Pull the FROZEN snapshot off the parent record (ack or communication),
 * so the caller never has to assemble it manually.
 */
export async function loadAcknowledgmentSnapshot(ackId: string): Promise<FrozenSnapshot & { inspection_id?: string; report_id?: string }> {
  const { data: ack } = await (supabase as any)
    .from('ce_audit_report_acknowledgments')
    .select('id, report_id, portal_resolved_enabled, portal_resolved_mode, portal_resolved_permissions_json, portal_resolved_review_json, portal_matched_policy_id')
    .eq('id', ackId)
    .maybeSingle();
  if (!ack) return { enabled: false, mode: 'NONE' };

  let inspection_id: string | undefined;
  if (ack.report_id) {
    const { data: rep } = await (supabase as any)
      .from('ce_employer_audit_reports')
      .select('inspection_id')
      .eq('id', ack.report_id)
      .maybeSingle();
    inspection_id = rep?.inspection_id ?? undefined;
  }

  return {
    enabled: ack.portal_resolved_enabled,
    mode: ack.portal_resolved_mode,
    permissions: ack.portal_resolved_permissions_json,
    review: ack.portal_resolved_review_json,
    matched_policy_id: ack.portal_matched_policy_id,
    inspection_id,
    report_id: ack.report_id,
  };
}

/**
 * Logs the submission and (if review.workflow_id is present in snapshot)
 * starts a workflow_instance to route the submission to officers.
 * Returns the audit row id and the workflow instance id (if any).
 */
export async function recordOnlineResponseSubmission(
  input: SubmissionAuditInput,
): Promise<{ auditId: string | null; workflowInstanceId: string | null }> {
  const review = (input.snapshot.review || {}) as Record<string, any>;
  const workflowId: string | null =
    typeof review.workflow_id === 'string' && review.workflow_id ? review.workflow_id : null;

  let workflowInstanceId: string | null = null;
  if (workflowId) {
    workflowInstanceId = await maybeStartWorkflow({
      workflowId,
      sourceModule: 'compliance_online_response',
      sourceRecordId: input.submissionId ?? input.acknowledgmentId ?? null,
      sourceRecordName: input.submitterName ?? `${input.kind} submission`,
      metadata: {
        kind: input.kind,
        inspection_id: input.inspectionId,
        report_id: input.reportId,
        acknowledgment_id: input.acknowledgmentId,
        submitter_name: input.submitterName,
        matched_policy_id: input.snapshot.matched_policy_id,
        mode: input.snapshot.mode,
      },
    });
  }

  let auditId: string | null = null;
  try {
    const { data, error } = await (supabase as any)
      .from('ce_online_response_submission_audit')
      .insert({
        acknowledgment_id: input.acknowledgmentId ?? null,
        communication_id: input.communicationId ?? null,
        inspection_id: input.inspectionId ?? null,
        report_id: input.reportId ?? null,
        submission_kind: input.kind,
        submission_id: input.submissionId ?? null,
        submitter_name: input.submitterName ?? null,
        submitter_email: input.submitterEmail ?? null,
        resolved_mode: input.snapshot.mode ?? null,
        matched_policy_id: input.snapshot.matched_policy_id ?? null,
        resolved_permissions_json: input.snapshot.permissions ?? null,
        resolved_review_json: input.snapshot.review ?? null,
        workflow_instance_id: workflowInstanceId,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      })
      .select('id')
      .single();
    if (error) throw error;
    auditId = data?.id ?? null;
  } catch (e) {
    // Audit failures must not break the user-facing submission.
    console.warn('[onlineResponseSubmissionAudit] failed:', e);
  }

  return { auditId, workflowInstanceId };
}

// ──────────────────────────────────────────────────────────────────
// Internal: minimal workflow trigger using the existing engine.
// Mirrors the patterns in workflowTriggerService / bnWorkflowIntegration.
// Kept defensive — if the workflow definition or steps are missing we
// silently skip and return null so submission flow continues.
// ──────────────────────────────────────────────────────────────────
interface StartArgs {
  workflowId: string;
  sourceModule: string;
  sourceRecordId: string | null;
  sourceRecordName: string;
  metadata: Record<string, unknown>;
}

async function maybeStartWorkflow(args: StartArgs): Promise<string | null> {
  try {
    const { data: wf } = await (supabase as any)
      .from('workflow_definitions')
      .select('id, name, default_sla_hours, is_active')
      .eq('id', args.workflowId)
      .maybeSingle();
    if (!wf || wf.is_active === false) return null;

    const { data: steps } = await (supabase as any)
      .from('workflow_steps')
      .select('id, step_name, step_number, sla_hours, approver_type, approver_role_ids, approver_designation_ids, approver_user_ids')
      .eq('workflow_id', wf.id)
      .order('step_number', { ascending: true });
    const firstStep = steps?.[0];
    if (!firstStep) return null;

    const dueAt = new Date();
    dueAt.setHours(dueAt.getHours() + (wf.default_sla_hours || 24));

    const { data: instance, error } = await (supabase as any)
      .from('workflow_instances')
      .insert({
        workflow_id: wf.id,
        workflow_name: wf.name,
        source_module: args.sourceModule,
        source_record_id: args.sourceRecordId,
        source_record_name: args.sourceRecordName,
        current_step_id: firstStep.id,
        status: 'InProgress',
        started_by_name: 'Employer Portal',
        due_at: dueAt.toISOString(),
        metadata: args.metadata,
      })
      .select('id')
      .single();
    if (error || !instance) return null;

    const taskDueAt = new Date();
    taskDueAt.setHours(taskDueAt.getHours() + (firstStep.sla_hours || wf.default_sla_hours || 24));

    // Single-target assignment when possible; otherwise leave open for the
    // workflow inbox to pick up by role/designation.
    const assignment: Record<string, any> = {};
    const at = firstStep.approver_type || 'role';
    if (at === 'role' && firstStep.approver_role_ids?.length === 1) {
      const { data: roleData } = await (supabase as any)
        .from('roles').select('role_name').eq('id', firstStep.approver_role_ids[0]).maybeSingle();
      if (roleData?.role_name) assignment.assigned_role = roleData.role_name;
    } else if (at === 'designation' && firstStep.approver_designation_ids?.length === 1) {
      assignment.assigned_designation = firstStep.approver_designation_ids[0];
    } else if ((at === 'user' || at === 'specific_users') && firstStep.approver_user_ids?.length === 1) {
      assignment.assigned_to = firstStep.approver_user_ids[0];
    }

    await (supabase as any).from('workflow_tasks').insert({
      instance_id: instance.id,
      step_id: firstStep.id,
      step_name: firstStep.step_name,
      assigned_role: assignment.assigned_role || null,
      assigned_designation: assignment.assigned_designation || null,
      assigned_to: assignment.assigned_to || null,
      status: 'Pending',
      due_at: taskDueAt.toISOString(),
    });

    return instance.id;
  } catch (e) {
    console.warn('[onlineResponseSubmissionAudit] workflow start failed:', e);
    return null;
  }
}
