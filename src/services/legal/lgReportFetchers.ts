/**
 * EPIC-09A Phase 2 — Report fetchers
 *
 * One fetcher per implemented report code. Rows are enriched here (never in
 * ReportViewer) and financial figures always come from v_lg_case_financials
 * or lg_recoverable_liability — reports never recompute totals.
 */
import { supabase } from "@/integrations/supabase/client";
import { fetchCaseFinancials, type LgReportFilters } from "./lgReportingService";

const sb = supabase as any;

const inRange = (q: any, col: string, f: LgReportFilters) => {
  if (f.dateFrom) q = q.gte(col, f.dateFrom);
  if (f.dateTo) q = q.lte(col, f.dateTo);
  return q;
};

async function fetchCases(f: LgReportFilters, extra?: (q: any) => any) {
  let q = sb.from("lg_case").select("*");
  if (extra) q = extra(q);
  if (f.employerId) q = q.eq("primary_entity_id", f.employerId);
  if (f.officerId) q = q.eq("assigned_legal_officer_id", f.officerId);
  if (f.stage) q = q.eq("current_stage_code", f.stage);
  if (f.status) q = q.eq("status_code", f.status);
  if (f.priority) q = q.eq("priority_code", f.priority);
  if (f.matterType) q = q.eq("case_type_code", f.matterType);
  if (f.territory) q = q.eq("country_code", f.territory);
  if (f.courtId) q = q.eq("court_code", f.courtId);
  const { data, error } = await q.order("opened_date", { ascending: false }).limit(5000);
  if (error) throw error;
  return data ?? [];
}

async function joinFinancials(cases: any[]) {
  if (!cases.length) return cases;
  const ids = cases.map((c) => c.id);
  const fins = await fetchCaseFinancials(ids);
  const byId = new Map<string, any>(fins.map((r: any) => [r.lg_case_id, r]));
  return cases.map((c) => {
    const fin = byId.get(c.id);
    return {
      ...c,
      total_assessed: fin?.total_assessed ?? 0,
      total_paid: fin?.total_paid ?? 0,
      total_outstanding: fin?.total_outstanding ?? 0,
    };
  });
}


// ============================================================
// FINANCIAL
// ============================================================
export async function fetchCaseSummary(f: LgReportFilters) {
  const cases = await fetchCases(f);
  return joinFinancials(cases);
}

export async function fetchOutstandingByEmployer(f: LgReportFilters) {
  const cases = await fetchCases(f);
  const withFin = await joinFinancials(cases);
  const map = new Map<string, any>();
  for (const c of withFin) {
    const key = c.primary_entity_id || c.employer_id || "UNKNOWN";
    const label =
      c.legacy_primary_entity_name || c.legacy_employer_name || c.employer_account_no || key;
    const row = map.get(key) ?? {
      employer_id: key,
      employer_name: label,
      matter_count: 0,
      total_assessed: 0,
      total_paid: 0,
      total_outstanding: 0,
    };
    row.matter_count += 1;
    row.total_assessed += Number(c.total_assessed ?? 0);
    row.total_paid += Number(c.total_paid ?? 0);
    row.total_outstanding += Number(c.total_outstanding ?? 0);
    map.set(key, row);
  }
  return Array.from(map.values()).sort((a, b) => b.total_outstanding - a.total_outstanding);
}

async function fetchLiabilities(f: LgReportFilters) {
  let q = sb.from("lg_recoverable_liability").select("*").limit(10000);
  if (f.employerId) q = q.eq("employer_id", f.employerId);
  if (f.fundCode) q = q.eq("fund_type", f.fundCode);
  if (f.liabilityType) q = q.eq("liability_type", f.liabilityType);
  if (f.contributionPeriod) {
    q = q.or(
      `assessment_period.eq.${f.contributionPeriod},contribution_period_from.eq.${f.contributionPeriod}`,
    );
  }
  if (f.dateFrom || f.dateTo) q = inRange(q, "assessment_date", f);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchOutstandingByFund(f: LgReportFilters) {
  const rows = await fetchLiabilities(f);
  const map = new Map<string, any>();
  for (const r of rows) {
    const key = r.fund_type || "UNSPECIFIED";
    const g = map.get(key) ?? {
      fund_code: key,
      liability_count: 0,
      assessed: 0,
      paid: 0,
      outstanding: 0,
    };
    g.liability_count += 1;
    g.assessed += Number(r.total_assessed ?? 0);
    g.paid += Number(r.paid ?? 0);
    g.outstanding += Number(r.outstanding ?? 0);
    map.set(key, g);
  }
  return Array.from(map.values()).sort((a, b) => b.outstanding - a.outstanding);
}

export async function fetchOutstandingByLiabilityType(f: LgReportFilters) {
  const rows = await fetchLiabilities(f);
  const map = new Map<string, any>();
  for (const r of rows) {
    const key = r.liability_type || "UNSPECIFIED";
    const g = map.get(key) ?? {
      liability_type: key,
      liability_count: 0,
      assessed: 0,
      paid: 0,
      outstanding: 0,
    };
    g.liability_count += 1;
    g.assessed += Number(r.total_assessed ?? 0);
    g.paid += Number(r.paid ?? 0);
    g.outstanding += Number(r.outstanding ?? 0);
    map.set(key, g);
  }
  return Array.from(map.values()).sort((a, b) => b.outstanding - a.outstanding);
}

export async function fetchRecoveryCollection(f: LgReportFilters) {
  const cases = await fetchCases(f);
  const withFin = await joinFinancials(cases);
  return withFin.map((c) => ({
    lg_case_no: c.lg_case_no,
    opened_date: c.opened_date,
    status_code: c.status_code,
    total_assessed: c.total_assessed,
    total_paid: c.total_paid,
    total_outstanding: c.total_outstanding,
    recovery_pct:
      c.total_assessed > 0
        ? Math.round((Number(c.total_paid) / Number(c.total_assessed)) * 1000) / 10
        : 0,
    id: c.id,
  }));
}

// ============================================================
// COMPLIANCE REFERRAL
// ============================================================
export async function fetchReferralRegister(f: LgReportFilters) {
  let q = sb.from("core_legal_referral").select("*").limit(5000);
  q = inRange(q, "referred_at", f);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchReferralItems(f: LgReportFilters) {
  let q = sb.from("core_legal_referral_item").select("*").limit(10000);
  if (f.fundCode) q = q.eq("fund_code", f.fundCode);
  q = inRange(q, "created_at", f);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchReferralConversion(f: LgReportFilters) {
  const [refs, cases] = await Promise.all([
    fetchReferralRegister(f),
    sb.from("lg_case").select("id, compliance_referral_id").not("compliance_referral_id", "is", null),
  ]);
  const converted = new Set((cases.data ?? []).map((c: any) => c.compliance_referral_id));
  return refs.map((r: any) => ({
    id: r.id,
    referral_no: r.referral_no ?? r.reference_no ?? r.id,
    referred_at: r.referred_at ?? r.created_at,
    status: r.status,
    converted: converted.has(r.id) ? "YES" : "NO",
  }));
}

export async function fetchReferralVsLiability(f: LgReportFilters) {
  const [items, liabs] = await Promise.all([
    fetchReferralItems(f),
    sb.from("lg_recoverable_liability").select("source_reference, total_assessed, source_module").eq("source_module", "LEGAL_REFERRAL"),
  ]);
  const liabByRef = new Map<string, number>();
  for (const l of liabs.data ?? []) {
    liabByRef.set(l.source_reference, (liabByRef.get(l.source_reference) ?? 0) + Number(l.total_assessed ?? 0));
  }
  return items.map((it: any) => {
    const referred = Number(it.amount_referred ?? it.total_amount ?? 0);
    const created = liabByRef.get(it.id) ?? 0;
    const diff = created - referred;
    return {
      id: it.id,
      debtor_name: it.debtor_name,
      fund_code: it.fund_code,
      period_from: it.period_from,
      referred_amount: referred,
      liability_created: created,
      variance: diff,
      status: Math.abs(diff) < 0.005 ? "MATCH" : "MISMATCH",
    };
  });
}

// ============================================================
// OPERATIONAL
// ============================================================
export async function fetchOpenMatters(f: LgReportFilters) {
  const cases = await fetchCases(f, (q) => q.not("status_code", "in", '("CLOSED","CANCELLED")'));
  return joinFinancials(cases);
}

export async function fetchClosedMatters(f: LgReportFilters) {
  const cases = await fetchCases(f, (q) => q.in("status_code", ["CLOSED", "CANCELLED"]));
  return joinFinancials(cases);
}

export async function fetchHearingsRegister(f: LgReportFilters) {
  let q = sb.from("lg_hearing").select("*").limit(5000);
  if (f.courtId) q = q.eq("court_code", f.courtId);
  if (f.officerId) q = q.eq("officer_code", f.officerId);
  q = inRange(q, "scheduled_at", f);
  const { data, error } = await q.order("scheduled_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchOrdersRegister(f: LgReportFilters) {
  let q = sb.from("lg_order").select("*").limit(5000);
  if (f.courtId) q = q.eq("issued_by_court", f.courtId);
  if (f.status) q = q.eq("status", f.status);
  q = inRange(q, "issued_date", f);
  const { data, error } = await q.order("issued_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchRecoveryAssignmentRegister(f: LgReportFilters) {
  let q = sb.from("lg_recovery_assignment").select("*").limit(5000);
  if (f.officerId) q = q.eq("assigned_officer_id", f.officerId);
  if (f.stage) q = q.eq("status", f.stage);
  q = inRange(q, "created_at", f);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ============================================================
// POST-JUDGMENT
// ============================================================
export async function fetchAppealsRegister(f: LgReportFilters) {
  let q = sb.from("lg_appeal").select("*").limit(5000);
  if (f.status) q = q.eq("status", f.status);
  q = inRange(q, "filing_date", f);
  const { data, error } = await q.order("filing_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchEnforcementRegister(f: LgReportFilters) {
  let q = sb.from("lg_enforcement_action").select("*").limit(5000);
  if (f.status) q = q.eq("status", f.status);
  if (f.officerId) q = q.eq("officer_code", f.officerId);
  q = inRange(q, "requested_date", f);
  const { data, error } = await q.order("requested_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchConsentOrderRegister(f: LgReportFilters) {
  let q = sb.from("lg_consent_order").select("*").limit(5000);
  if (f.status) q = q.eq("status", f.status);
  q = inRange(q, "start_date", f);
  const { data, error } = await q.order("start_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ============================================================
// LEGAL COSTS / COUNSEL
// ============================================================
export async function fetchExternalCounselRegister(f: LgReportFilters) {
  let q = sb.from("lg_external_counsel_engagement").select("*, lg_external_counsel(code, law_firm_name, primary_attorney)").limit(5000);
  if (f.counselId) q = q.eq("counsel_id", f.counselId);
  q = inRange(q, "engaged_at", f);
  const { data, error } = await q.order("engaged_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ...r,
    law_firm_name: r.lg_external_counsel?.law_firm_name ?? "—",
    primary_attorney: r.lg_external_counsel?.primary_attorney ?? "—",
  }));
}

export async function fetchLegalCostRegister(f: LgReportFilters) {
  let q = sb.from("lg_legal_cost").select("*").limit(5000);
  if (f.status) q = q.eq("status", f.status);
  q = inRange(q, "incurred_date", f);
  const { data, error } = await q.order("incurred_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ============================================================
// Registry
// ============================================================
export const REPORT_FETCHERS: Record<string, (f: LgReportFilters) => Promise<any[]>> = {
  FIN_CASE_SUMMARY: fetchCaseSummary,
  FIN_OUTSTANDING_BY_EMPLOYER: fetchOutstandingByEmployer,
  FIN_OUTSTANDING_BY_FUND: fetchOutstandingByFund,
  FIN_OUTSTANDING_BY_LIABILITY_TYPE: fetchOutstandingByLiabilityType,
  FIN_RECOVERY_COLLECTION: fetchRecoveryCollection,
  FIN_LEGAL_COST_REGISTER: fetchLegalCostRegister,

  CR_REFERRAL_REGISTER: fetchReferralRegister,
  CR_REFERRAL_ITEMS: fetchReferralItems,
  CR_CONVERSION_RATE: fetchReferralConversion,
  CR_REFERRED_VS_LIABILITY: fetchReferralVsLiability,

  OPS_OPEN_MATTERS: fetchOpenMatters,
  OPS_CLOSED_MATTERS: fetchClosedMatters,
  OPS_HEARINGS_REGISTER: fetchHearingsRegister,
  OPS_ORDERS_REGISTER: fetchOrdersRegister,
  OPS_RECOVERY_ASSIGNMENT_REGISTER: fetchRecoveryAssignmentRegister,

  OPS_APPEALS_REGISTER: fetchAppealsRegister,
  OPS_ENFORCEMENT_REGISTER: fetchEnforcementRegister,
  OPS_CONSENT_ORDER_REGISTER: fetchConsentOrderRegister,

  EC_ENGAGEMENT_REGISTER: fetchExternalCounselRegister,
};
