/**
 * EPIC-07 — External Counsel Engine
 * Deterministic engagement + invoice lifecycle and fee tracking.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  ExternalCounsel, ExternalCounselEngagement, ExternalCounselInvoice,
  CounselEngagementStatus, CounselInvoiceStatus,
} from "@/types/legal/postJudgment";

const sb = supabase as any;

const ENGAGEMENT_TRANSITIONS: Record<CounselEngagementStatus, CounselEngagementStatus[]> = {
  ACTIVE:     ["CONCLUDED", "TERMINATED"],
  CONCLUDED:  [],
  TERMINATED: [],
};

const INVOICE_TRANSITIONS: Record<CounselInvoiceStatus, CounselInvoiceStatus[]> = {
  RECEIVED: ["APPROVED", "DISPUTED"],
  APPROVED: ["PAID", "DISPUTED"],
  DISPUTED: ["APPROVED", "RECEIVED"],
  PAID:     [],
};

export function canTransitionEngagement(from: string, to: CounselEngagementStatus) {
  const cur = (from ?? "ACTIVE") as CounselEngagementStatus;
  if (cur === to) return { allowed: false, reason: "Already in this status" };
  return ENGAGEMENT_TRANSITIONS[cur]?.includes(to)
    ? { allowed: true } : { allowed: false, reason: `Cannot move engagement from ${cur} to ${to}` };
}
export function canTransitionInvoice(from: string, to: CounselInvoiceStatus) {
  const cur = (from ?? "RECEIVED") as CounselInvoiceStatus;
  if (cur === to) return { allowed: false, reason: "Already in this status" };
  return INVOICE_TRANSITIONS[cur]?.includes(to)
    ? { allowed: true } : { allowed: false, reason: `Cannot move invoice from ${cur} to ${to}` };
}

// ---------- Fee calculations ----------
export interface CounselFeeSummary {
  total_estimate: number;
  total_incurred: number;
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
  utilisation_pct: number;   // incurred / estimate
  is_over_budget: boolean;
}

export function summariseCounselFees(
  engagement: Pick<ExternalCounselEngagement, "fee_estimate" | "fee_incurred">,
  invoices: ExternalCounselInvoice[],
): CounselFeeSummary {
  const est = Number(engagement.fee_estimate || 0);
  const incurred = Number(engagement.fee_incurred || 0);
  const invoiced = invoices.reduce(
    (s, i) => s + Number(i.amount || 0) + Number(i.tax_amount || 0), 0);
  const paid = invoices
    .filter((i) => i.status === "PAID")
    .reduce((s, i) => s + Number(i.amount || 0) + Number(i.tax_amount || 0), 0);
  return {
    total_estimate: est,
    total_incurred: incurred,
    total_invoiced: invoiced,
    total_paid: paid,
    total_outstanding: Math.max(invoiced - paid, 0),
    utilisation_pct: est > 0 ? Math.min(100, (incurred / est) * 100) : 0,
    is_over_budget: est > 0 && incurred > est,
  };
}

// ---------- Validations ----------
export function validateCounsel(input: Partial<ExternalCounsel>): string[] {
  const e: string[] = [];
  if (!input.law_firm_name) e.push("Law firm name is required");
  if (!input.code) e.push("Code is required");
  return e;
}
export function validateEngagement(input: Partial<ExternalCounselEngagement>): string[] {
  const e: string[] = [];
  if (!input.case_id) e.push("case_id is required");
  if (!input.counsel_id) e.push("counsel_id is required");
  return e;
}
export function validateInvoice(input: Partial<ExternalCounselInvoice>): string[] {
  const e: string[] = [];
  if (!input.engagement_id) e.push("engagement_id is required");
  if (!input.invoice_number) e.push("Invoice number is required");
  if ((input.amount ?? 0) <= 0) e.push("Amount must be > 0");
  return e;
}

// ---------- CRUD ----------
export async function listCounsel(): Promise<ExternalCounsel[]> {
  const { data, error } = await sb.from("lg_external_counsel")
    .select("*").order("law_firm_name");
  if (error) throw error;
  return data ?? [];
}
export async function listEngagements(caseId: string): Promise<ExternalCounselEngagement[]> {
  const { data, error } = await sb.from("lg_external_counsel_engagement")
    .select("*").eq("case_id", caseId).order("engaged_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function listInvoices(engagementId: string): Promise<ExternalCounselInvoice[]> {
  const { data, error } = await sb.from("lg_external_counsel_invoice")
    .select("*").eq("engagement_id", engagementId).order("invoice_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createCounsel(input: Partial<ExternalCounsel>) {
  const errs = validateCounsel(input);
  if (errs.length) throw new Error(errs.join("; "));
  const { data, error } = await sb.from("lg_external_counsel")
    .insert({ is_active: true, ...input }).select("*").single();
  if (error) throw error;
  return data;
}

export async function createEngagement(input: Partial<ExternalCounselEngagement>) {
  const errs = validateEngagement(input);
  if (errs.length) throw new Error(errs.join("; "));
  const { data, error } = await sb.from("lg_external_counsel_engagement")
    .insert({
      status: "ACTIVE",
      engaged_at: new Date().toISOString(),
      fee_incurred: 0,
      deliverables: [],
      ...input,
    }).select("*").single();
  if (error) throw error;
  return data;
}

export async function transitionEngagement(
  id: string, to: CounselEngagementStatus, patch: Partial<ExternalCounselEngagement> = {},
) {
  const { data: cur, error } = await sb.from("lg_external_counsel_engagement")
    .select("status").eq("id", id).single();
  if (error) throw error;
  const r = canTransitionEngagement(cur.status, to);
  if (!r.allowed) throw new Error(r.reason);
  const stamp: Record<string, unknown> = {};
  if (to !== "ACTIVE") stamp.disengaged_at = new Date().toISOString();
  const { data, error: e2 } = await sb.from("lg_external_counsel_engagement")
    .update({ ...patch, ...stamp, status: to }).eq("id", id).select("*").single();
  if (e2) throw e2;
  return data;
}

export async function createInvoice(input: Partial<ExternalCounselInvoice>) {
  const errs = validateInvoice(input);
  if (errs.length) throw new Error(errs.join("; "));
  const { data, error } = await sb.from("lg_external_counsel_invoice")
    .insert({ status: "RECEIVED", tax_amount: 0, is_recoverable: true, ...input })
    .select("*").single();
  if (error) throw error;
  return data;
}

export async function transitionInvoice(
  id: string, to: CounselInvoiceStatus, patch: Partial<ExternalCounselInvoice> = {},
) {
  const { data: cur, error } = await sb.from("lg_external_counsel_invoice")
    .select("status").eq("id", id).single();
  if (error) throw error;
  const r = canTransitionInvoice(cur.status, to);
  if (!r.allowed) throw new Error(r.reason);
  const stamp: Record<string, unknown> = {};
  if (to === "PAID") stamp.paid_at = new Date().toISOString();
  const { data, error: e2 } = await sb.from("lg_external_counsel_invoice")
    .update({ ...patch, ...stamp, status: to }).eq("id", id).select("*").single();
  if (e2) throw e2;
  return data;
}
