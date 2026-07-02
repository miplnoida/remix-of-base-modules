/**
 * EPIC-06B.1 — Rule-based follow-up task automation for Judicial Orders,
 * Appeals and Enforcement. All calls are non-blocking (fire-and-forget from
 * the caller) and each creation writes to the case audit trail via
 * lg_case_activity.
 */
import { supabase } from "@/integrations/supabase/client";
import { logLgActivity } from "@/services/legal/lgAuditService";
import { getSlaDays } from "@/services/legal/lgSlaPolicyService";

const sb = supabase as any;

function addDays(base: string | Date | null | undefined, days: number): string {
  const d = base ? new Date(base) : new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

interface TaskSpec {
  lg_case_id: string;
  title: string;
  description?: string | null;
  task_type_code: string;
  task_kind?: string;
  priority_code?: string;
  due_date?: string | null;
  created_by?: string | null;
  origin: string; // e.g. ORDER_ACTIVE, APPEAL_FILED, BREACH_RECORDED
  entity_ref?: string | null;
}

async function insertTask(spec: TaskSpec) {
  try {
    const { data, error } = await sb
      .from("lg_case_task")
      .insert({
        lg_case_id: spec.lg_case_id,
        title: spec.title,
        description: spec.description ?? null,
        task_type_code: spec.task_type_code,
        task_kind: spec.task_kind ?? "AUTO",
        priority_code: spec.priority_code ?? "MEDIUM",
        due_date: spec.due_date ?? null,
        status: "OPEN",
        sla_status: "ON_TRACK",
        created_by: spec.created_by ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;

    await logLgActivity({
      lg_case_id: spec.lg_case_id,
      activity_type: "AUTO_TASK_CREATED",
      description: `Auto-task: ${spec.title} (${spec.origin})`,
      performed_by: spec.created_by ?? null,
      payload: {
        task_id: data?.id,
        origin: spec.origin,
        entity_ref: spec.entity_ref ?? null,
      },
    }).catch(() => {});
    return data?.id ?? null;
  } catch {
    return null;
  }
}

/** After an order becomes ACTIVE / GRANTED. */
export async function autoTaskOnOrderActive(input: {
  case_id: string;
  order_id: string;
  order_no?: string | null;
  compliance_date?: string | null;
  created_by?: string | null;
}) {
  const due = input.compliance_date ?? addDays(new Date(), 14);
  return insertTask({
    lg_case_id: input.case_id,
    title: `Compliance follow-up for order ${input.order_no ?? input.order_id.slice(0, 8)}`,
    description: "Verify compliance with court order terms and record outcome.",
    task_type_code: "ORDER_COMPLIANCE_FOLLOWUP",
    priority_code: "HIGH",
    due_date: due,
    created_by: input.created_by ?? null,
    origin: "ORDER_ACTIVE",
    entity_ref: input.order_id,
  });
}

/** After an appeal is filed — remind ~7 days before deadline. */
export async function autoTaskOnAppealFiled(input: {
  case_id: string;
  appeal_id: string;
  appeal_no?: string | null;
  appeal_deadline?: string | null;
  created_by?: string | null;
}) {
  if (!input.appeal_deadline) return null;
  const reminder = addDays(input.appeal_deadline, -7);
  return insertTask({
    lg_case_id: input.case_id,
    title: `Appeal deadline reminder — ${input.appeal_no ?? input.appeal_id.slice(0, 8)}`,
    description: `Appeal deadline ${input.appeal_deadline}. Prepare filings.`,
    task_type_code: "APPEAL_DEADLINE_REMINDER",
    priority_code: "HIGH",
    due_date: reminder,
    created_by: input.created_by ?? null,
    origin: "APPEAL_FILED",
    entity_ref: input.appeal_id,
  });
}

/** When a compliance event of type BREACH_RECORDED / MISSED_DEADLINE lands. */
export async function autoTaskOnOrderBreach(input: {
  case_id: string;
  order_id: string;
  order_no?: string | null;
  created_by?: string | null;
}) {
  return insertTask({
    lg_case_id: input.case_id,
    title: `Breach review — order ${input.order_no ?? input.order_id.slice(0, 8)}`,
    description: "Review the breach, notify parties, decide next enforcement step.",
    task_type_code: "ORDER_BREACH_REVIEW",
    priority_code: "URGENT",
    due_date: addDays(new Date(), 3),
    created_by: input.created_by ?? null,
    origin: "BREACH_RECORDED",
    entity_ref: input.order_id,
  });
}

/** After enforcement is created — preparation task for the officer/agency. */
export async function autoTaskOnEnforcementCreated(input: {
  case_id: string;
  enforcement_id: string;
  enforcement_no?: string | null;
  enforcement_type?: string | null;
  created_by?: string | null;
}) {
  return insertTask({
    lg_case_id: input.case_id,
    title: `Prepare ${input.enforcement_type ?? "enforcement"} ${input.enforcement_no ?? ""}`.trim(),
    description: "Assemble enforcement packet, coordinate with external agency, confirm target.",
    task_type_code: "ENFORCEMENT_PREPARATION",
    priority_code: "HIGH",
    due_date: addDays(new Date(), 5),
    created_by: input.created_by ?? null,
    origin: "ENFORCEMENT_CREATED",
    entity_ref: input.enforcement_id,
  });
}

/** Ongoing payment monitoring after order goes ACTIVE with monetary component. */
export async function autoTaskOnPaymentMonitoring(input: {
  case_id: string;
  order_id: string;
  order_no?: string | null;
  created_by?: string | null;
}) {
  return insertTask({
    lg_case_id: input.case_id,
    title: `Monitor payments for order ${input.order_no ?? input.order_id.slice(0, 8)}`,
    description: "Track scheduled installments and flag missed payments.",
    task_type_code: "ORDER_PAYMENT_MONITORING",
    priority_code: "MEDIUM",
    due_date: addDays(new Date(), 30),
    created_by: input.created_by ?? null,
    origin: "PAYMENT_MONITORING",
    entity_ref: input.order_id,
  });
}
