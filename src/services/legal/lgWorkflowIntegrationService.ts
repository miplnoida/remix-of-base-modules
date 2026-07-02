/**
 * LG Workflow Integration Service
 * -------------------------------
 * Bridges the Legal module to the enterprise workflow engine
 * (workflow_definitions / workflow_instances / workflow_tasks /
 *  workflow_steps / workflow_step_actions / workflow_triggers /
 *  workflow_logs). Mirrors bnWorkflowIntegrationService.
 *
 * Legal does NOT get its own workflow engine — this service only
 * translates LG domain events into central engine primitives.
 */

import { supabase } from "@/integrations/supabase/client";
import { resolveReportingManagerForTask } from "@/services/resolveReportingManager";
import { logLgActivity } from "./lgAuditService";

const db = supabase as any;

// Source-module identifiers used by workflow_triggers.source_module
// and workflow_instances.source_module. Must match the values seeded
// in Phase 1 migration.
export const LG_WORKFLOW_MODULES = {
  CASE:       "lg_case",
  INTAKE:     "lg_case_intake",
  REFERRAL:   "lg_case_referral",
  FEE_WAIVER: "lg_fee_waiver",
  HEARING:    "lg_hearing",
  OPINION:    "lg_advice_assignment",
} as const;

export type LgWorkflowModule =
  typeof LG_WORKFLOW_MODULES[keyof typeof LG_WORKFLOW_MODULES];

// Map generic engine end-states back to LG domain status codes.
export const WORKFLOW_END_STATE_MAP: Record<string, Record<string, string>> = {
  lg_case:         { Approved: "CLOSED",   Rejected: "CLOSED_REJECTED" },
  lg_case_intake:  { Approved: "ACCEPTED", Rejected: "REJECTED" },
  lg_case_referral:{ Approved: "ACCEPTED", Rejected: "REJECTED" },
  lg_fee_waiver:   { Approved: "APPROVED", Rejected: "REJECTED" },
  lg_hearing:      { Approved: "CONCLUDED",Rejected: "ADJOURNED" },
};

export interface LgTriggerWorkflowParams {
  sourceModule: LgWorkflowModule;
  entityId: string;
  entityName: string;
  actionName?: string;              // defaults to "submit"
  userId: string;
  lgCaseId?: string | null;         // for audit linkage
  metadata?: Record<string, any>;
}

export async function triggerLgWorkflow(
  params: LgTriggerWorkflowParams
): Promise<string | null> {
  const {
    sourceModule, entityId, entityName,
    actionName = "submit", userId, lgCaseId, metadata,
  } = params;

  try {
    // 1. Duplicate guard — reuse open instance if one exists.
    const { data: existing } = await db
      .from("workflow_instances")
      .select("id")
      .eq("source_module", sourceModule)
      .eq("source_record_id", entityId)
      .not("status", "in", '("Completed","Rejected","Cancelled")')
      .limit(1);

    if (existing && existing.length > 0) {
      return existing[0].id;
    }

    // 2. Find matching trigger.
    const { data: triggers } = await db
      .from("workflow_triggers")
      .select("id, workflow_id, action_name, is_active")
      .eq("action_name", actionName)
      .eq("is_active", true)
      .eq("source_module", sourceModule);

    if (!triggers || triggers.length === 0) {
      return null;
    }

    const trigger = triggers[0];

    // 3. Workflow definition + steps.
    const { data: workflow } = await db
      .from("workflow_definitions")
      .select("id, name, default_sla_hours, maker_checker_enabled")
      .eq("id", trigger.workflow_id)
      .eq("is_active", true)
      .single();
    if (!workflow) return null;

    const { data: steps } = await db
      .from("workflow_steps")
      .select("id, step_name, step_number, sla_hours, approver_type, approver_role_ids, approver_designation_ids, approver_user_ids")
      .eq("workflow_id", workflow.id)
      .order("step_number", { ascending: true });
    if (!steps || steps.length === 0) return null;

    const { data: profile } = await db
      .from("profiles")
      .select("full_name, user_code")
      .eq("id", userId)
      .single();

    const firstStep = steps[0];
    const dueAt = new Date();
    dueAt.setHours(dueAt.getHours() + (workflow.default_sla_hours || 72));

    // 4. Instance.
    const { data: instance, error: instErr } = await db
      .from("workflow_instances")
      .insert({
        workflow_id: workflow.id,
        workflow_name: workflow.name,
        source_module: sourceModule,
        source_record_id: entityId,
        source_record_name: entityName,
        current_step_id: firstStep.id,
        status: "InProgress",
        started_by: userId,
        started_by_name: profile?.full_name || "System",
        due_at: dueAt.toISOString(),
        metadata: { lg_case_id: lgCaseId ?? null, ...(metadata || {}) },
      })
      .select("id")
      .single();

    if (instErr || !instance) {
      console.error("[lgWorkflow] instance creation failed", instErr);
      return null;
    }

    // 5. First task.
    const taskDueAt = new Date();
    taskDueAt.setHours(taskDueAt.getHours() + (firstStep.sla_hours || 72));
    const assignment = await resolveStepAssignment(firstStep, userId, instance.id);

    const { data: taskData } = await db
      .from("workflow_tasks")
      .insert({
        instance_id: instance.id,
        step_id: firstStep.id,
        step_name: firstStep.step_name,
        assigned_role: assignment.assigned_role || null,
        assigned_designation: assignment.assigned_designation || null,
        assigned_to: assignment.assigned_to || null,
        status: "Pending",
        due_at: taskDueAt.toISOString(),
      })
      .select("id")
      .single();

    // 6. Log.
    await db.from("workflow_logs").insert({
      instance_id: instance.id,
      step_id: firstStep.id,
      step_name: firstStep.step_name,
      action: "workflow_started",
      performed_by: userId,
      performed_by_name: profile?.full_name || "System",
      details: `LG workflow started: ${sourceModule} — ${entityName}`,
    });

    // 7. Notify.
    if (taskData?.id) {
      supabase.functions
        .invoke("workflow-process-notifications", {
          body: { instance_id: instance.id, step_id: firstStep.id, trigger: "step_entry" },
        })
        .catch((err) =>
          console.warn("[lgWorkflow] step notification failed (non-critical)", err),
        );
    }

    // 8. LG audit.
    await logLgWorkflowEvent({
      entityId,
      sourceModule,
      action: "WORKFLOW_TRIGGERED",
      performedBy: profile?.user_code || userId,
      narrative: `Workflow "${workflow.name}" triggered — instance ${instance.id}`,
      workflowInstanceId: instance.id,
      lgCaseId,
    });

    return instance.id;
  } catch (err) {
    console.error("[lgWorkflow] triggerLgWorkflow error", err);
    return null;
  }
}

async function resolveStepAssignment(
  step: any,
  initiatorUserId: string,
  instanceId: string,
): Promise<{ assigned_role?: string; assigned_designation?: string; assigned_to?: string }> {
  const approverType = step.approver_type || "role";

  if (approverType === "role" && step.approver_role_ids?.length) {
    if (step.approver_role_ids.length === 1) {
      const { data: roleData } = await db
        .from("roles")
        .select("role_name")
        .eq("id", step.approver_role_ids[0])
        .single();
      return { assigned_role: roleData?.role_name || null };
    }
    return {};
  }

  if (approverType === "designation" && step.approver_designation_ids?.length) {
    return { assigned_designation: step.approver_designation_ids[0] };
  }

  if ((approverType === "user" || approverType === "specific_users") && step.approver_user_ids?.length) {
    return { assigned_to: step.approver_user_ids[0] };
  }

  if (approverType === "reporting_manager") {
    const resolved = await resolveReportingManagerForTask(
      initiatorUserId, instanceId, step.id, step.step_name,
    );
    if (resolved) return { assigned_to: resolved.managerId };
  }

  return {};
}

export async function checkLgWorkflowGovernance(
  sourceModule: LgWorkflowModule,
  entityId: string,
): Promise<{ governed: boolean; instanceId: string | null; workflowName: string | null }> {
  const { data } = await db
    .from("workflow_instances")
    .select("id, workflow_name")
    .eq("source_module", sourceModule)
    .eq("source_record_id", entityId)
    .not("status", "in", '("Completed","Rejected","Cancelled")')
    .order("started_at", { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    return { governed: true, instanceId: data[0].id, workflowName: data[0].workflow_name };
  }
  return { governed: false, instanceId: null, workflowName: null };
}

interface LgWorkflowEventParams {
  entityId: string;
  sourceModule: LgWorkflowModule;
  action: string;
  performedBy: string;
  narrative?: string;
  workflowInstanceId?: string;
  lgCaseId?: string | null;
}

export async function logLgWorkflowEvent(params: LgWorkflowEventParams) {
  // Prefer lg_case_activity when we have a case anchor.
  if (params.lgCaseId) {
    await logLgActivity({
      lg_case_id: params.lgCaseId,
      activity_type: params.action,
      description: params.narrative ?? null,
      payload: {
        source_module: params.sourceModule,
        workflow_instance_id: params.workflowInstanceId ?? null,
      },
      performed_by: params.performedBy,
    });
    return;
  }

  // Otherwise write to system_audit_trail (intake/referral before a case exists).
  db.from("system_audit_trail")
    .insert({
      module: "LG_WORKFLOW",
      action: params.action,
      entity_type: params.sourceModule,
      entity_id: params.entityId,
      severity: "info",
      user_name: params.performedBy,
      payload_json: {
        workflow_instance_id: params.workflowInstanceId ?? null,
        narrative: params.narrative ?? null,
      },
    })
    .then(() => undefined, () => undefined);
}

export async function checkLgEscalations(): Promise<Array<{
  taskId: string; instanceId: string; sourceModule: string;
  entityId: string; stepName: string; dueAt: string; hoursOverdue: number;
}>> {
  const now = new Date().toISOString();
  const { data } = await db
    .from("workflow_tasks")
    .select("id, instance_id, step_name, due_at, workflow_instance:workflow_instances(source_module, source_record_id)")
    .in("status", ["Pending", "InProgress"])
    .lt("due_at", now)
    .limit(200);

  if (!data) return [];

  const lgModules = new Set<string>(Object.values(LG_WORKFLOW_MODULES));
  return data
    .filter((t: any) => lgModules.has(t.workflow_instance?.source_module || ""))
    .map((t: any) => ({
      taskId: t.id,
      instanceId: t.instance_id,
      sourceModule: t.workflow_instance?.source_module || "",
      entityId: t.workflow_instance?.source_record_id || "",
      stepName: t.step_name || "",
      dueAt: t.due_at,
      hoursOverdue: Math.round((Date.now() - new Date(t.due_at).getTime()) / 3600000),
    }));
}
