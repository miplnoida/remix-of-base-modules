/**
 * EPIC-04A §7 — Unified Matter Timeline service.
 *
 * Combines events across the whole matter lifecycle into one chronological
 * feed. All sources are live tables — no mock data. Missing tables are
 * silently skipped (returns [] on error) so a partial schema still renders.
 */
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type TimelineKind =
  | "REFERRAL"
  | "INTAKE"
  | "CASE"
  | "STAGE"
  | "HEARING"
  | "ORDER"
  | "PAYMENT"
  | "ARRANGEMENT"
  | "DOCUMENT"
  | "NOTICE"
  | "LETTER"
  | "SETTLEMENT"
  | "TASK"
  | "AUDIT";

export interface TimelineEvent {
  id: string;
  ts: string;                     // ISO timestamp
  kind: TimelineKind;
  title: string;
  detail?: string | null;
  actor?: string | null;
  entity_id?: string | null;
}

const safe = async <T,>(p: Promise<{ data: T | null }>): Promise<T | null> => {
  try { const { data } = await p; return data ?? null; } catch { return null; }
};

export async function loadUnifiedTimeline(caseId: string): Promise<TimelineEvent[]> {
  const [
    lgCase, referrals, intakes, stageHist,
    hearings, orders, arrangements, docs,
    notices, letters, settlements, tasks, activity,
  ] = await Promise.all([
    safe<any>(sb.from("lg_case").select("id, opened_date, created_at, closed_date, closure_reason").eq("id", caseId).maybeSingle()),
    safe<any[]>(sb.from("lg_case_referral").select("id, referral_type_code, referral_reason, referred_at, created_at").eq("lg_case_id", caseId)),
    safe<any[]>(sb.from("lg_case_intake").select("id, decision_code, decision_at, created_at").eq("lg_case_id", caseId)),
    safe<any[]>(sb.from("lg_case_stage_history").select("id, from_stage_code, to_stage_code, changed_by, created_at").eq("lg_case_id", caseId)),
    safe<any[]>(sb.from("lg_hearing").select("id, hearing_type_code, hearing_date, outcome_code, status, created_at").eq("lg_case_id", caseId)),
    safe<any[]>(sb.from("lg_order").select("id, order_no, order_type_code, issued_date, status, amount_ordered, created_at").eq("lg_case_id", caseId)),
    safe<any[]>(sb.from("lg_payment_arrangement_link").select("id, link_type, active, arranged_amount, paid_amount, updated_at, created_at").eq("lg_case_id", caseId)),
    safe<any[]>(sb.from("lg_document_link").select("id, display_name, document_type_code, created_at").eq("lg_case_id", caseId)),
    safe<any[]>(sb.from("lg_notice").select("id, notice_no, notice_type_code, status, issued_date, created_at, delivery_channel").eq("lg_case_id", caseId)),
    safe<any[]>(sb.from("core_generated_document").select("id, document_no, document_type_code, status, created_at").eq("owner_entity_id", caseId).eq("owner_entity_table", "lg_case")),
    safe<any[]>(sb.from("lg_settlement").select("id, status, proposed_amount, agreed_amount, proposed_at, created_at").eq("lg_case_id", caseId)),
    safe<any[]>(sb.from("lg_case_task").select("id, title, status, due_date, created_at, updated_at").eq("lg_case_id", caseId)),
    safe<any[]>(sb.from("lg_case_activity").select("id, activity_type, description, performed_by, performed_at, entity_type").eq("lg_case_id", caseId)),
  ]);

  const evts: TimelineEvent[] = [];
  const push = (e: TimelineEvent | null | undefined) => { if (e && e.ts) evts.push(e); };

  if (lgCase) {
    push({
      id: `case-open-${lgCase.id}`,
      ts: lgCase.opened_date ?? lgCase.created_at,
      kind: "CASE",
      title: "Case opened",
    });
    if (lgCase.closed_date) {
      push({
        id: `case-close-${lgCase.id}`,
        ts: lgCase.closed_date,
        kind: "CASE",
        title: "Case closed",
        detail: lgCase.closure_reason ?? null,
      });
    }
  }

  (referrals ?? []).forEach((r) => push({
    id: `ref-${r.id}`, ts: r.referred_at ?? r.created_at, kind: "REFERRAL",
    title: `Referral · ${r.referral_type_code ?? "—"}`, detail: r.referral_reason ?? null,
  }));
  (intakes ?? []).forEach((r) => push({
    id: `intake-${r.id}`, ts: r.decision_at ?? r.created_at, kind: "INTAKE",
    title: `Intake · ${r.decision_code ?? "recorded"}`,
  }));
  (stageHist ?? []).forEach((r) => push({
    id: `stage-${r.id}`, ts: r.created_at, kind: "STAGE",
    title: `Stage: ${r.from_stage_code ?? "—"} → ${r.to_stage_code ?? "—"}`, actor: r.changed_by,
  }));
  (hearings ?? []).forEach((r) => push({
    id: `hr-${r.id}`, ts: r.hearing_date ?? r.created_at, kind: "HEARING",
    title: `Hearing · ${r.hearing_type_code ?? "—"}`, detail: r.outcome_code ?? r.status ?? null,
  }));
  (orders ?? []).forEach((r) => push({
    id: `ord-${r.id}`, ts: r.issued_date ?? r.created_at, kind: "ORDER",
    title: `Order ${r.order_no ?? ""} · ${r.order_type_code ?? "—"}`,
    detail: r.status ? `${r.status}${r.amount_ordered ? ` · ${Number(r.amount_ordered).toFixed(2)}` : ""}` : null,
  }));
  (arrangements ?? []).forEach((r) => push({
    id: `arr-${r.id}`, ts: r.created_at, kind: "ARRANGEMENT",
    title: `Arrangement ${r.link_type ?? "linked"}`,
    detail: `Arranged ${Number(r.arranged_amount ?? 0).toFixed(2)} · Paid ${Number(r.paid_amount ?? 0).toFixed(2)}`,
  }));
  (arrangements ?? []).filter((r) => Number(r.paid_amount ?? 0) > 0).forEach((r) => push({
    id: `pay-${r.id}`, ts: r.updated_at ?? r.created_at, kind: "PAYMENT",
    title: `Payment received`, detail: `${Number(r.paid_amount ?? 0).toFixed(2)}`,
  }));
  (docs ?? []).forEach((r) => push({
    id: `doc-${r.id}`, ts: r.created_at, kind: "DOCUMENT",
    title: `Document · ${r.document_type_code ?? "linked"}`, detail: r.display_name ?? null,
  }));
  (notices ?? []).forEach((r) => push({
    id: `not-${r.id}`, ts: r.issued_date ?? r.created_at, kind: "NOTICE",
    title: `Notice ${r.notice_no ?? ""} · ${r.notice_type_code ?? "—"}`,
    detail: `${r.status ?? ""}${r.delivery_channel ? ` · ${r.delivery_channel}` : ""}`,
  }));
  (letters ?? []).forEach((r) => push({
    id: `let-${r.id}`, ts: r.created_at, kind: "LETTER",
    title: `Letter ${r.document_no ?? ""} · ${r.document_type_code ?? "—"}`,
    detail: r.status ?? null,
  }));
  (settlements ?? []).forEach((r) => push({
    id: `set-${r.id}`, ts: r.proposed_at ?? r.created_at, kind: "SETTLEMENT",
    title: `Settlement · ${r.status ?? "proposed"}`,
    detail: `Proposed ${Number(r.proposed_amount ?? 0).toFixed(2)}${r.agreed_amount ? ` · Agreed ${Number(r.agreed_amount).toFixed(2)}` : ""}`,
  }));
  (tasks ?? []).forEach((r) => push({
    id: `task-${r.id}`, ts: r.created_at, kind: "TASK",
    title: `Task · ${r.title ?? "—"}`, detail: `${r.status ?? ""}${r.due_date ? ` · due ${r.due_date}` : ""}`,
  }));
  (activity ?? []).forEach((r) => push({
    id: `act-${r.id}`, ts: r.performed_at, kind: "AUDIT",
    title: r.activity_type, detail: r.description ?? null, actor: r.performed_by,
    entity_id: r.entity_type ?? null,
  }));

  return evts
    .filter((e) => e.ts)
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
}
