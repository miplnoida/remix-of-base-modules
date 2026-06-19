import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface LgArrangementLink {
  id: string;
  lg_case_id: string;
  payment_arrangement_id: string;
  source_module: string;
  link_type: string;
  link_reason: string | null;
  default_monitoring_required: boolean;
  notes: string | null;
  linked_by: string | null;
  linked_at: string;
}

export interface ArrangementSummary {
  arrangement: any;
  installments: any[];
  breaches: any[];
  totals: {
    total_debt: number;
    total_paid: number;
    outstanding: number;
    installments_total: number;
    installments_paid: number;
    installments_overdue: number;
    is_defaulted: boolean;
  };
}

export async function listArrangementLinks(lgCaseId: string): Promise<LgArrangementLink[]> {
  const { data, error } = await sb
    .from("lg_payment_arrangement_link")
    .select("*")
    .eq("lg_case_id", lgCaseId)
    .order("linked_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function linkArrangement(input: {
  lg_case_id: string;
  payment_arrangement_id: string;
  source_module?: string;
  link_type?: string;
  link_reason?: string | null;
  default_monitoring_required?: boolean;
  linked_by?: string | null;
}): Promise<LgArrangementLink> {
  const { data, error } = await sb
    .from("lg_payment_arrangement_link")
    .insert({
      source_module: "COMPLIANCE",
      link_type: "PRIMARY",
      default_monitoring_required: true,
      ...input,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getArrangementSummary(arrangementId: string): Promise<ArrangementSummary> {
  const { data: arrangement, error: aErr } = await sb
    .from("ce_payment_arrangements")
    .select("*")
    .eq("id", arrangementId)
    .maybeSingle();
  if (aErr) throw aErr;
  if (!arrangement) throw new Error("Arrangement not found");

  const { data: installments } = await sb
    .from("ce_installments")
    .select("*")
    .eq("arrangement_id", arrangementId)
    .order("installment_number", { ascending: true });

  const { data: breaches } = await sb
    .from("ce_arrangement_breaches")
    .select("*")
    .eq("arrangement_id", arrangementId)
    .order("detected_at", { ascending: false });

  const list = installments ?? [];
  const total_debt = Number(arrangement.total_debt ?? 0);
  const total_paid = Number(arrangement.total_paid ?? 0);
  const overdue = list.filter((i: any) => i.is_overdue || (i.status && i.status !== "PAID" && new Date(i.due_date) < new Date()));
  const paidCount = list.filter((i: any) => (i.status ?? "").toUpperCase() === "PAID").length;

  return {
    arrangement,
    installments: list,
    breaches: breaches ?? [],
    totals: {
      total_debt,
      total_paid,
      outstanding: Math.max(0, total_debt - total_paid),
      installments_total: list.length,
      installments_paid: paidCount,
      installments_overdue: overdue.length,
      is_defaulted: Boolean(arrangement.breach_detected) || overdue.length >= Number(arrangement.max_missed_before_breach ?? 2),
    },
  };
}

/** Detect newly defaulted arrangements that need a Legal task. */
export async function detectDefaultsAndCreateTasks(lgCaseId: string): Promise<{ created: number }> {
  const links = await listArrangementLinks(lgCaseId);
  let created = 0;
  for (const link of links) {
    if (!link.default_monitoring_required) continue;
    const summary = await getArrangementSummary(link.payment_arrangement_id);
    if (!summary.totals.is_defaulted) continue;

    // Avoid duplicate open task for the same arrangement
    const { data: existing } = await sb
      .from("lg_case_task")
      .select("id")
      .eq("lg_case_id", lgCaseId)
      .eq("task_type_code", "PAYMENT_DEFAULT_REVIEW")
      .neq("status_code", "DONE")
      .limit(1);
    if (existing && existing.length > 0) continue;

    await sb.from("lg_case_task").insert({
      lg_case_id: lgCaseId,
      task_type_code: "PAYMENT_DEFAULT_REVIEW",
      title: `Payment arrangement ${summary.arrangement.arrangement_number} in default`,
      description: `Outstanding ${summary.totals.outstanding.toFixed(2)} · ${summary.totals.installments_overdue} overdue installment(s)`,
      status_code: "OPEN",
      priority_code: "HIGH",
    });

    await sb.from("lg_case_activity").insert({
      lg_case_id: lgCaseId,
      activity_type: "PAYMENT_DEFAULT_DETECTED",
      description: `Arrangement ${summary.arrangement.arrangement_number} defaulted`,
    });

    created += 1;
  }
  return { created };
}
