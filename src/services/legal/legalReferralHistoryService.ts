/**
 * Officer / Compliance / Benefits history aggregator for the Legal Referral
 * wizards' Step 4 (and the Legal Intake screen's packet view).
 *
 * Defensive: if a table is missing or a query fails we skip that source so
 * the wizard never blocks the user.
 */
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface HistoryEvent {
  key: string;
  occurred_at: string | null;
  category:
    | "OFFICER"
    | "NOTICE"
    | "VISIT"
    | "AUDIT"
    | "INSPECTION"
    | "RESPONSE"
    | "ARRANGEMENT"
    | "BREACH"
    | "CLAIM"
    | "AWARD"
    | "OVERPAYMENT"
    | "COMMUNICATION"
    | "OTHER";
  title: string;
  description?: string | null;
  reference_no?: string | null;
  actor?: string | null;
  raw?: any;
}

export interface ComplianceContext {
  assigned_officer?: { code: string | null; name: string | null } | null;
  inspector?: { code: string | null; name: string | null } | null;
  supervisor?: { code: string | null; name: string | null } | null;
  notices_count: number;
  visits_count: number;
  arrangements_count: number;
  breaches_count: number;
  audits_count: number;
  inspections_count: number;
  events: HistoryEvent[];
}

export async function loadComplianceHistory(params: {
  employerId?: string | null;
  ceCaseId?: string | null;
}): Promise<ComplianceContext> {
  const events: HistoryEvent[] = [];
  let assigned_officer: ComplianceContext["assigned_officer"] = null;
  let inspector: ComplianceContext["inspector"] = null;
  const supervisor: ComplianceContext["supervisor"] = null;
  let notices_count = 0;
  let visits_count = 0;
  let arrangements_count = 0;
  let breaches_count = 0;
  let audits_count = 0;
  let inspections_count = 0;

  if (params.ceCaseId) {
    try {
      const { data: cs } = await sb
        .from("ce_cases")
        .select("assigned_officer_id, assigned_officer_name")
        .eq("id", params.ceCaseId)
        .maybeSingle();
      if (cs) {
        assigned_officer = {
          code: cs.assigned_officer_id ?? null,
          name: cs.assigned_officer_name ?? null,
        };
      }
      const { data: assigns } = await sb
        .from("ce_case_assignments")
        .select("id, assigned_to_id, assigned_to_name, role, assigned_at, removed_at")
        .eq("case_id", params.ceCaseId)
        .order("assigned_at", { ascending: false });
      for (const a of assigns ?? []) {
        events.push({
          key: `ASN:${a.id}`,
          occurred_at: a.assigned_at ?? null,
          category: "OFFICER",
          title: `${a.role ?? "Assignment"}: ${a.assigned_to_name ?? a.assigned_to_id ?? "—"}`,
          actor: a.assigned_to_name ?? a.assigned_to_id ?? null,
        });
      }
    } catch { /* optional */ }
  }

  if (params.employerId) {
    try {
      const { data: ns } = await sb
        .from("ce_notices")
        .select("id, notice_number, notice_type, issue_date, status")
        .eq("employer_id", params.employerId)
        .order("issue_date", { ascending: false })
        .limit(100);
      notices_count = (ns ?? []).length;
      for (const n of ns ?? []) {
        events.push({
          key: `NTC:${n.id}`,
          occurred_at: n.issue_date ?? null,
          category: "NOTICE",
          title: `${n.notice_type ?? "Notice"} issued`,
          reference_no: n.notice_number ?? null,
          description: n.status ? `Status: ${n.status}` : null,
        });
      }
    } catch { /* optional */ }

    try {
      const { data: vs } = await sb
        .from("ce_field_activities")
        .select("id, activity_type, activity_date, officer_name, employer_id, outcome")
        .eq("employer_id", params.employerId)
        .order("activity_date", { ascending: false })
        .limit(100);
      visits_count = (vs ?? []).length;
      for (const v of vs ?? []) {
        events.push({
          key: `VST:${v.id}`,
          occurred_at: v.activity_date ?? null,
          category: "VISIT",
          title: `${v.activity_type ?? "Field activity"}${v.outcome ? ` — ${v.outcome}` : ""}`,
          actor: v.officer_name ?? null,
        });
      }
    } catch { /* optional */ }

    try {
      const { data: insp } = await sb
        .from("ce_inspections")
        .select("id, inspection_number, scheduled_date, status, lead_inspector_id, lead_inspector_name")
        .eq("employer_id", params.employerId)
        .order("scheduled_date", { ascending: false })
        .limit(50);
      inspections_count = (insp ?? []).length;
      if ((insp ?? []).length && !inspector) {
        const i0 = insp[0];
        inspector = { code: i0.lead_inspector_id ?? null, name: i0.lead_inspector_name ?? null };
      }
      for (const i of insp ?? []) {
        events.push({
          key: `INS:${i.id}`,
          occurred_at: i.scheduled_date ?? null,
          category: "INSPECTION",
          title: `Inspection ${i.inspection_number ?? ""} — ${i.status ?? "OPEN"}`,
          reference_no: i.inspection_number ?? null,
          actor: i.lead_inspector_name ?? null,
        });
      }
    } catch { /* optional */ }

    try {
      const { data: au } = await sb
        .from("ce_employer_audit_reports")
        .select("id, report_number, status, created_at, report_type")
        .eq("employer_id", params.employerId)
        .order("created_at", { ascending: false })
        .limit(50);
      audits_count = (au ?? []).length;
      for (const r of au ?? []) {
        events.push({
          key: `AUD:${r.id}`,
          occurred_at: r.created_at ?? null,
          category: "AUDIT",
          title: `Audit Report ${r.report_number ?? ""} — ${r.report_type ?? r.status ?? ""}`,
          reference_no: r.report_number ?? null,
        });
      }
    } catch { /* optional */ }

    try {
      const { data: ar } = await sb
        .from("ce_payment_arrangements")
        .select("id, arrangement_number, status, created_at, total_amount, default_date")
        .eq("employer_id", params.employerId)
        .order("created_at", { ascending: false })
        .limit(50);
      arrangements_count = (ar ?? []).length;
      for (const a of ar ?? []) {
        events.push({
          key: `ARR:${a.id}`,
          occurred_at: a.created_at ?? null,
          category: "ARRANGEMENT",
          title: `Arrangement ${a.arrangement_number ?? ""} — ${a.status ?? ""}`,
          reference_no: a.arrangement_number ?? null,
        });
        if (a.default_date) {
          events.push({
            key: `ARR_DFL:${a.id}`,
            occurred_at: a.default_date,
            category: "BREACH",
            title: `Arrangement defaulted: ${a.arrangement_number ?? ""}`,
          });
        }
      }
      const { data: br } = await sb
        .from("ce_arrangement_breaches")
        .select("id, arrangement_id, breach_date, breach_type, breach_description")
        .order("breach_date", { ascending: false })
        .limit(50);
      breaches_count = (br ?? []).length;
      for (const b of br ?? []) {
        events.push({
          key: `BRE:${b.id}`,
          occurred_at: b.breach_date ?? null,
          category: "BREACH",
          title: `${b.breach_type ?? "Breach"}: ${b.breach_description ?? ""}`.trim(),
        });
      }
    } catch { /* optional */ }

    try {
      const { data: er } = await sb
        .from("ce_audit_employer_responses")
        .select("id, response_type, response_date, response_summary, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      for (const r of er ?? []) {
        events.push({
          key: `RSP:${r.id}`,
          occurred_at: r.response_date ?? r.created_at ?? null,
          category: "RESPONSE",
          title: `${r.response_type ?? "Employer response"}`,
          description: r.response_summary ?? null,
        });
      }
    } catch { /* optional */ }
  }

  events.sort((a, b) => (b.occurred_at ?? "").localeCompare(a.occurred_at ?? ""));

  return {
    assigned_officer,
    inspector,
    supervisor,
    notices_count,
    visits_count,
    arrangements_count,
    breaches_count,
    audits_count,
    inspections_count,
    events,
  };
}

export interface BenefitsContext {
  claim_officer?: { code: string | null; name: string | null } | null;
  payments_count: number;
  overpayments_count: number;
  appeals_count: number;
  events: HistoryEvent[];
}

export async function loadBenefitsHistory(params: {
  claimId?: string | null;
  ssn?: string | null;
}): Promise<BenefitsContext> {
  const events: HistoryEvent[] = [];
  let claim_officer: BenefitsContext["claim_officer"] = null;
  let payments_count = 0;
  let overpayments_count = 0;
  const appeals_count = 0;

  if (params.claimId) {
    try {
      const { data: cl } = await sb
        .from("bn_claim")
        .select("id, claim_number, ssn, status, assigned_to, claim_date, submission_date")
        .eq("id", params.claimId)
        .maybeSingle();
      if (cl) {
        claim_officer = { code: cl.assigned_to ?? null, name: cl.assigned_to ?? null };
        events.push({
          key: `CLM:${cl.id}`,
          occurred_at: cl.claim_date ?? cl.submission_date ?? null,
          category: "CLAIM",
          title: `Claim ${cl.claim_number ?? ""} — ${cl.status ?? ""}`,
          reference_no: cl.claim_number ?? null,
        });
      }
      const { data: ev } = await sb
        .from("bn_claim_event")
        .select("id, claim_id, event_type, event_date, description")
        .eq("claim_id", params.claimId)
        .order("event_date", { ascending: false })
        .limit(100);
      for (const e of ev ?? []) {
        events.push({
          key: `EVT:${e.id}`,
          occurred_at: e.event_date ?? null,
          category: "CLAIM",
          title: e.event_type ?? "Event",
          description: e.description ?? null,
        });
      }
    } catch { /* optional */ }
  }

  if (params.ssn) {
    try {
      const { data: aw } = await sb
        .from("bn_award")
        .select("id, ssn, award_number, status, created_at")
        .eq("ssn", params.ssn)
        .limit(50);
      for (const a of aw ?? []) {
        events.push({
          key: `AWD:${a.id}`,
          occurred_at: a.created_at ?? null,
          category: "AWARD",
          title: `Award ${a.award_number ?? ""} — ${a.status ?? ""}`,
        });
      }

      const { data: ops } = await sb
        .from("bn_overpayment")
        .select("id, outstanding_amount, status, created_at, period_from, period_to")
        .limit(50);
      overpayments_count = (ops ?? []).length;
      for (const o of ops ?? []) {
        events.push({
          key: `OVP:${o.id}`,
          occurred_at: o.created_at ?? null,
          category: "OVERPAYMENT",
          title: `Overpayment ${o.status ?? ""}: ${o.outstanding_amount ?? 0}`,
        });
      }
    } catch { /* optional */ }
  }

  if (params.claimId) {
    try {
      const { data: ins } = await sb
        .from("bn_payment_instruction")
        .select("id, claim_id, amount, status, scheduled_date")
        .eq("claim_id", params.claimId)
        .limit(200);
      payments_count = (ins ?? []).length;
      for (const p of ins ?? []) {
        events.push({
          key: `PAY:${p.id}`,
          occurred_at: p.scheduled_date ?? null,
          category: "AWARD",
          title: `Payment ${p.status ?? ""}: ${p.amount ?? 0}`,
        });
      }
    } catch { /* optional */ }
  }

  events.sort((a, b) => (b.occurred_at ?? "").localeCompare(a.occurred_at ?? ""));
  return { claim_officer, payments_count, overpayments_count, appeals_count, events };
}
