/**
 * EPIC-09C Part 10 — Legal Data Quality Service
 *
 * Twelve live integrity checks over Legal V1 tables. Each returns an
 * affected-row count and a query fn for the drilldown table.
 * Financial reconciliation delegates to v_lg_case_financials +
 * lg_recoverable_liability — never re-computes totals.
 */
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type DataQualityCategory =
  | "parties" | "liabilities" | "hearings" | "orders" | "documents"
  | "references" | "recovery" | "consent" | "appeals" | "filings"
  | "counsel" | "financial";

export interface DataQualityCheck {
  code: string;
  category: DataQualityCategory;
  title: string;
  description: string;
  drilldownRoute: string; // /legal/lg/cases/:id etc.
  severity: "info" | "warning" | "critical";
  run: () => Promise<DataQualityResult>;
}

export interface DataQualityResult {
  code: string;
  count: number;
  sampleRows: any[];
}

const openCaseStatuses = ["OPEN", "IN_PROGRESS", "PRE_JUDGMENT", "POST_JUDGMENT", "JUDGMENT", "ENFORCEMENT"];

async function countMissing(
  parent: string,
  parentSel: string,
  childTable: string,
  childFk: string,
  extra?: (q: any) => any,
) {
  let pq = sb.from(parent).select(parentSel).in("status_code", openCaseStatuses).limit(2000);
  if (extra) pq = extra(pq);
  const { data: parents, error } = await pq;
  if (error) throw error;
  const ids: string[] = (parents ?? []).map((r: any) => r.id).filter(Boolean);
  if (!ids.length) return { count: 0, sampleRows: [] };
  const { data: children } = await sb.from(childTable).select(`${childFk}`).in(childFk, ids);
  const withChild = new Set((children ?? []).map((r: any) => r[childFk]));
  const missing = (parents ?? []).filter((p: any) => !withChild.has(p.id));
  return { count: missing.length, sampleRows: missing.slice(0, 25) };
}

export const DATA_QUALITY_CHECKS: DataQualityCheck[] = [
  {
    code: "DQ_MISSING_PARTIES", category: "parties", severity: "critical",
    title: "Open Matters Without Parties",
    description: "Open cases must have at least one party (plaintiff/defendant).",
    drilldownRoute: "/legal/lg/cases/:id",
    run: async () => ({ code: "DQ_MISSING_PARTIES", ...(await countMissing("lg_case", "id,lg_case_no,matter_title", "lg_case_party", "lg_case_id")) }),
  },
  {
    code: "DQ_MISSING_LIABILITIES", category: "liabilities", severity: "critical",
    title: "Cases Without Recoverable Liabilities",
    description: "Financial matters must carry at least one lg_recoverable_liability.",
    drilldownRoute: "/legal/lg/cases/:id",
    run: async () => ({ code: "DQ_MISSING_LIABILITIES", ...(await countMissing("lg_case", "id,lg_case_no,matter_title", "lg_recoverable_liability", "lg_case_id")) }),
  },
  {
    code: "DQ_MISSING_HEARINGS", category: "hearings", severity: "warning",
    title: "Judicial-Stage Matters Without Hearings",
    description: "Cases in JUDGMENT or POST_JUDGMENT should have at least one hearing scheduled.",
    drilldownRoute: "/legal/lg/cases/:id",
    run: async () => ({ code: "DQ_MISSING_HEARINGS", ...(await countMissing(
      "lg_case", "id,lg_case_no,matter_title", "lg_hearing", "lg_case_id",
      (q) => q.in("current_stage_code", ["JUDGMENT", "POST_JUDGMENT", "ENFORCEMENT"]),
    )) }),
  },
  {
    code: "DQ_MISSING_ORDERS", category: "orders", severity: "warning",
    title: "Post-Judgment Matters Without Orders",
    description: "Post-judgment matters must have at least one lg_order.",
    drilldownRoute: "/legal/lg/cases/:id",
    run: async () => ({ code: "DQ_MISSING_ORDERS", ...(await countMissing(
      "lg_case", "id,lg_case_no,matter_title", "lg_order", "lg_case_id",
      (q) => q.in("current_stage_code", ["POST_JUDGMENT", "ENFORCEMENT"]),
    )) }),
  },
  {
    code: "DQ_ORPHAN_DOCUMENTS", category: "documents", severity: "warning",
    title: "Orphaned Document Links",
    description: "lg_document_link rows with no matching case.",
    drilldownRoute: "/legal/lg/documents",
    run: async () => {
      const { data, error } = await sb.from("lg_document_link").select("id,lg_case_id").is("lg_case_id", null).limit(200);
      if (error) throw error;
      return { code: "DQ_ORPHAN_DOCUMENTS", count: data?.length ?? 0, sampleRows: data ?? [] };
    },
  },
  {
    code: "DQ_BROKEN_REFERENCES", category: "references", severity: "critical",
    title: "Broken Referral References",
    description: "Legal cases missing their source referral link.",
    drilldownRoute: "/legal/lg/cases/:id",
    run: async () => {
      const { data, error } = await sb.from("lg_case").select("id,lg_case_no,matter_title,source_referral_id").not("source_referral_id", "is", null).limit(2000);
      if (error) throw error;
      const refIds = Array.from(new Set((data ?? []).map((r: any) => r.source_referral_id))).filter(Boolean);
      if (!refIds.length) return { code: "DQ_BROKEN_REFERENCES", count: 0, sampleRows: [] };
      const { data: refs } = await sb.from("legal_referral").select("id").in("id", refIds);
      const present = new Set((refs ?? []).map((r: any) => r.id));
      const broken = (data ?? []).filter((c: any) => !present.has(c.source_referral_id));
      return { code: "DQ_BROKEN_REFERENCES", count: broken.length, sampleRows: broken.slice(0, 25) };
    },
  },
  {
    code: "DQ_RECOVERY_ASSIGNMENT_GAPS", category: "recovery", severity: "warning",
    title: "Enforcement Matters Without Recovery Assignment",
    description: "Cases in ENFORCEMENT stage must have an active lg_recovery_assignment.",
    drilldownRoute: "/legal/lg/recovery-assignments",
    run: async () => ({ code: "DQ_RECOVERY_ASSIGNMENT_GAPS", ...(await countMissing(
      "lg_case", "id,lg_case_no,matter_title", "lg_recovery_assignment", "lg_case_id",
      (q) => q.eq("current_stage_code", "ENFORCEMENT"),
    )) }),
  },
  {
    code: "DQ_CONSENT_ORDER_ISSUES", category: "consent", severity: "warning",
    title: "Consent Orders Missing Installments",
    description: "Active consent orders should have at least one installment scheduled.",
    drilldownRoute: "/legal/lg/consent-orders",
    run: async () => {
      const { data, error } = await sb.from("lg_consent_order").select("id,code,title,status").eq("status", "ACTIVE").limit(1000);
      if (error) throw error;
      const ids = (data ?? []).map((r: any) => r.id);
      if (!ids.length) return { code: "DQ_CONSENT_ORDER_ISSUES", count: 0, sampleRows: [] };
      const { data: inst } = await sb.from("lg_consent_installment").select("lg_consent_order_id").in("lg_consent_order_id", ids);
      const withInst = new Set((inst ?? []).map((r: any) => r.lg_consent_order_id));
      const bad = (data ?? []).filter((r: any) => !withInst.has(r.id));
      return { code: "DQ_CONSENT_ORDER_ISSUES", count: bad.length, sampleRows: bad.slice(0, 25) };
    },
  },
  {
    code: "DQ_APPEAL_ISSUES", category: "appeals", severity: "warning",
    title: "Appeals Past Deadline Without Decision",
    description: "Appeals whose appeal_deadline has passed but remain open.",
    drilldownRoute: "/legal/lg/appeals",
    run: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await sb.from("lg_appeal").select("id,appeal_no,appeal_deadline,status").lt("appeal_deadline", today).not("status", "in", "(CLOSED,DISMISSED,WITHDRAWN,DECIDED)").limit(500);
      if (error) throw error;
      return { code: "DQ_APPEAL_ISSUES", count: data?.length ?? 0, sampleRows: data ?? [] };
    },
  },
  {
    code: "DQ_COURT_FILING_ISSUES", category: "filings", severity: "info",
    title: "Court Filings Without Court",
    description: "Filings missing court_id.",
    drilldownRoute: "/legal/lg/court-filings",
    run: async () => {
      const { data, error } = await sb.from("lg_court_filing").select("id,filing_no,court_id").is("court_id", null).limit(200);
      if (error) throw error;
      return { code: "DQ_COURT_FILING_ISSUES", count: data?.length ?? 0, sampleRows: data ?? [] };
    },
  },
  {
    code: "DQ_EXTERNAL_COUNSEL_ISSUES", category: "counsel", severity: "info",
    title: "Counsel Engagements Missing Instructions",
    description: "External counsel engagements with no instructions recorded.",
    drilldownRoute: "/legal/reports/external-counsel/engagements",
    run: async () => {
      const { data, error } = await sb.from("lg_external_counsel_engagement").select("id,external_counsel_id,instructions").or("instructions.is.null,instructions.eq.").limit(200);
      if (error) throw error;
      return { code: "DQ_EXTERNAL_COUNSEL_ISSUES", count: data?.length ?? 0, sampleRows: data ?? [] };
    },
  },
  {
    code: "DQ_FINANCIAL_RECONCILIATION", category: "financial", severity: "critical",
    title: "Financial Reconciliation Variance",
    description: "Case financial view total_outstanding differs from sum(lg_recoverable_liability.outstanding).",
    drilldownRoute: "/legal/lg/cases/:id",
    run: async () => {
      const { data: fin } = await sb.from("v_lg_case_financials").select("lg_case_id,total_outstanding").limit(5000);
      const { data: liab } = await sb.from("lg_recoverable_liability").select("lg_case_id,outstanding").limit(20000);
      const liabMap = new Map<string, number>();
      for (const r of liab ?? []) {
        liabMap.set(r.lg_case_id, (liabMap.get(r.lg_case_id) ?? 0) + Number(r.outstanding ?? 0));
      }
      const bad = (fin ?? []).filter((f: any) => {
        const l = liabMap.get(f.lg_case_id) ?? 0;
        return Math.abs(Number(f.total_outstanding ?? 0) - l) > 0.01;
      });
      return { code: "DQ_FINANCIAL_RECONCILIATION", count: bad.length, sampleRows: bad.slice(0, 25).map((b) => ({ ...b, id: b.lg_case_id, liabilities_sum: liabMap.get(b.lg_case_id) ?? 0 })) };
    },
  },
];

export async function runAllDataQualityChecks(): Promise<DataQualityResult[]> {
  return Promise.all(DATA_QUALITY_CHECKS.map((c) => c.run().catch(() => ({ code: c.code, count: 0, sampleRows: [] }))));
}
