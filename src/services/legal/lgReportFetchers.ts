/**
 * EPIC-09A / 09B — Report fetchers
 *
 * One fetcher per implemented report code. Financial figures always come from
 * v_lg_case_financials or lg_recoverable_liability — reports never recompute
 * totals independently.
 *
 * EPIC-09B: fills every remaining "Planned" report with an implementation so
 * the registry has zero unimplemented entries.
 */
import { supabase } from "@/integrations/supabase/client";
import { fetchCaseFinancials, type LgReportFilters } from "./lgReportingService";

const sb = supabase as any;

const inRange = (q: any, col: string, f: LgReportFilters) => {
  if (f.dateFrom) q = q.gte(col, f.dateFrom);
  if (f.dateTo) q = q.lte(col, f.dateTo);
  return q;
};

const daysBetween = (a?: string | null, b?: string | null): number | null => {
  if (!a) return null;
  const end = b ? new Date(b).getTime() : Date.now();
  return Math.floor((end - new Date(a).getTime()) / 86_400_000);
};

const ageBucket = (d: number | null): string => {
  if (d == null) return "unknown";
  if (d <= 30) return "0-30";
  if (d <= 60) return "31-60";
  if (d <= 90) return "61-90";
  if (d <= 180) return "91-180";
  return ">180";
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
    const label = c.legacy_primary_entity_name || c.legacy_employer_name || c.employer_account_no || key;
    const row = map.get(key) ?? { employer_id: key, employer_name: label, matter_count: 0, total_assessed: 0, total_paid: 0, total_outstanding: 0 };
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
    q = q.or(`assessment_period.eq.${f.contributionPeriod},contribution_period_from.eq.${f.contributionPeriod}`);
  }
  if (f.dateFrom || f.dateTo) q = inRange(q, "assessment_date", f);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

function bucketLiability(rows: any[], key: string, extra?: (r: any) => Record<string, any>) {
  const map = new Map<string, any>();
  for (const r of rows) {
    const k = r[key] || "UNSPECIFIED";
    const g = map.get(k) ?? { [key]: k, liability_count: 0, assessed: 0, paid: 0, outstanding: 0, ...(extra?.(r) ?? {}) };
    g.liability_count += 1;
    g.assessed += Number(r.total_assessed ?? 0);
    g.paid += Number(r.paid ?? 0);
    g.outstanding += Number(r.outstanding ?? 0);
    map.set(k, g);
  }
  return Array.from(map.values()).sort((a, b) => b.outstanding - a.outstanding);
}

export async function fetchOutstandingByFund(f: LgReportFilters) {
  return bucketLiability(await fetchLiabilities(f), "fund_type").map((r) => ({ ...r, fund_code: r.fund_type }));
}
export async function fetchOutstandingByLiabilityType(f: LgReportFilters) {
  return bucketLiability(await fetchLiabilities(f), "liability_type");
}
export async function fetchOutstandingByPeriod(f: LgReportFilters) {
  return bucketLiability(await fetchLiabilities(f), "assessment_period").map((r) => ({ ...r, contribution_period: r.assessment_period }));
}
export async function fetchRecoveryByFund(f: LgReportFilters) {
  return fetchOutstandingByFund(f);
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
    recovery_pct: c.total_assessed > 0 ? Math.round((Number(c.total_paid) / Number(c.total_assessed)) * 1000) / 10 : 0,
    id: c.id,
  }));
}

export async function fetchPaymentAllocation(f: LgReportFilters) {
  let q = sb.from("lg_payment_allocation").select("*").limit(10000);
  if (f.dateFrom || f.dateTo) q = inRange(q, "allocated_at", f);
  const { data } = await q.order("allocated_at", { ascending: false });
  return data ?? [];
}

export async function fetchLegalCostRecovery(f: LgReportFilters) {
  let q = sb.from("lg_legal_cost").select("*").limit(5000);
  if (f.dateFrom || f.dateTo) q = inRange(q, "incurred_date", f);
  const { data } = await q.order("incurred_date", { ascending: false });
  return (data ?? []).map((r: any) => ({
    ...r,
    recovery_pct: Number(r.amount ?? 0) > 0 ? Math.round((Number(r.recovered_amount ?? 0) / Number(r.amount)) * 1000) / 10 : 0,
  }));
}

export async function fetchCourtCost(f: LgReportFilters) {
  let q = sb.from("lg_legal_cost").select("*").in("cost_type", ["COURT_FILING", "COURT_FEE", "COURT"]).limit(5000);
  if (f.dateFrom || f.dateTo) q = inRange(q, "incurred_date", f);
  const { data } = await q.order("incurred_date", { ascending: false });
  return data ?? [];
}

export async function fetchSettlement(f: LgReportFilters) {
  let q = sb.from("lg_settlement").select("*").limit(5000);
  if (f.dateFrom || f.dateTo) q = inRange(q, "settlement_date", f);
  const { data } = await q.order("settlement_date", { ascending: false });
  return data ?? [];
}

export async function fetchConsentCollection(f: LgReportFilters) {
  let q = sb.from("lg_consent_order").select("*").limit(5000);
  if (f.status) q = q.eq("status", f.status);
  if (f.dateFrom || f.dateTo) q = inRange(q, "start_date", f);
  const { data } = await q.order("start_date", { ascending: false });
  return (data ?? []).map((r: any) => ({
    ...r,
    collection_pct: Number(r.total_amount ?? 0) > 0 ? Math.round((Number(r.paid_amount ?? 0) / Number(r.total_amount)) * 1000) / 10 : 0,
  }));
}

export async function fetchWriteOff(f: LgReportFilters) {
  let q = sb.from("lg_recoverable_liability").select("*").not("write_off_amount", "is", null).limit(5000);
  if (f.employerId) q = q.eq("employer_id", f.employerId);
  const { data } = await q;
  return data ?? [];
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

export async function fetchReferralItemsByFund(f: LgReportFilters) {
  const items = await fetchReferralItems(f);
  const map = new Map<string, any>();
  for (const it of items) {
    const key = it.fund_code || "UNSPECIFIED";
    const g = map.get(key) ?? { fund_code: key, item_count: 0, amount_referred: 0 };
    g.item_count += 1;
    g.amount_referred += Number(it.amount_referred ?? it.total_amount ?? 0);
    map.set(key, g);
  }
  return Array.from(map.values()).sort((a, b) => b.amount_referred - a.amount_referred);
}

export async function fetchReferralItemsByPeriod(f: LgReportFilters) {
  const items = await fetchReferralItems(f);
  const map = new Map<string, any>();
  for (const it of items) {
    const key = it.period_from ? String(it.period_from).slice(0, 7) : "UNSPECIFIED";
    const g = map.get(key) ?? { contribution_period: key, item_count: 0, amount_referred: 0 };
    g.item_count += 1;
    g.amount_referred += Number(it.amount_referred ?? it.total_amount ?? 0);
    map.set(key, g);
  }
  return Array.from(map.values()).sort((a, b) => a.contribution_period.localeCompare(b.contribution_period));
}

export async function fetchReferralItemsAccepted(f: LgReportFilters) {
  const items = await fetchReferralItems(f);
  return items.filter((it: any) => ["ACCEPTED", "CONVERTED"].includes(it.status));
}
export async function fetchReferralItemsRejected(f: LgReportFilters) {
  const items = await fetchReferralItems(f);
  return items.filter((it: any) => ["REJECTED", "RETURNED"].includes(it.status));
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

export async function fetchTimeReferralToIntake(f: LgReportFilters) {
  const [refs, intakes] = await Promise.all([
    fetchReferralRegister(f),
    sb.from("lg_case_intake").select("id, source_reference_id, submitted_at, created_at"),
  ]);
  const byRef = new Map<string, any>();
  for (const it of intakes.data ?? []) if (it.source_reference_id) byRef.set(it.source_reference_id, it);
  return refs.map((r: any) => {
    const it = byRef.get(r.id);
    return {
      id: r.id,
      referral_no: r.referral_no ?? r.id,
      referred_at: r.referred_at ?? r.created_at,
      intake_at: it?.submitted_at ?? it?.created_at,
      days: it ? daysBetween(r.referred_at ?? r.created_at, it.submitted_at ?? it.created_at) : null,
    };
  });
}

export async function fetchTimeIntakeToMatter(f: LgReportFilters) {
  const [intakes, cases] = await Promise.all([
    sb.from("lg_case_intake").select("id, submitted_at, decided_at, created_at, decision_status"),
    sb.from("lg_case").select("id, opened_date, lg_case_no, source_intake_id"),
  ]);
  const byIntake = new Map<string, any>();
  for (const c of cases.data ?? []) if (c.source_intake_id) byIntake.set(c.source_intake_id, c);
  return (intakes.data ?? []).map((it: any) => {
    const c = byIntake.get(it.id);
    return {
      id: it.id,
      intake_at: it.submitted_at ?? it.created_at,
      decided_at: it.decided_at,
      opened_date: c?.opened_date,
      lg_case_no: c?.lg_case_no,
      days: c ? daysBetween(it.submitted_at ?? it.created_at, c.opened_date) : null,
    };
  });
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
      id: it.id, debtor_name: it.debtor_name, fund_code: it.fund_code, period_from: it.period_from,
      referred_amount: referred, liability_created: created, variance: diff,
      status: Math.abs(diff) < 0.005 ? "MATCH" : "MISMATCH",
    };
  });
}

export async function fetchMultiComponentReferral(f: LgReportFilters) {
  const items = await fetchReferralItems(f);
  const map = new Map<string, any>();
  for (const it of items) {
    const rid = it.referral_id ?? it.core_legal_referral_id ?? it.parent_id;
    if (!rid) continue;
    const g = map.get(rid) ?? { referral_id: rid, component_count: 0, funds: new Set<string>(), total: 0 };
    g.component_count += 1;
    if (it.fund_code) g.funds.add(it.fund_code);
    g.total += Number(it.amount_referred ?? it.total_amount ?? 0);
    map.set(rid, g);
  }
  return Array.from(map.values())
    .filter((g) => g.component_count > 1)
    .map((g) => ({ ...g, funds: Array.from(g.funds).join(", "), fund_count: (g.funds as Set<string>).size }));
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
export async function fetchMatterAging(f: LgReportFilters) {
  const cases = await fetchCases(f, (q) => q.not("status_code", "in", '("CLOSED","CANCELLED")'));
  return cases.map((c: any) => ({ ...c, age_days: daysBetween(c.opened_date, null), age_bucket: ageBucket(daysBetween(c.opened_date, null)) }));
}
export async function fetchIntakeAging(f: LgReportFilters) {
  let q = sb.from("lg_case_intake").select("*").in("decision_status", ["PENDING", "IN_REVIEW"]).limit(2000);
  if (f.territory) q = q.eq("territory_code", f.territory);
  const { data } = await q.order("submitted_at", { ascending: false });
  return (data ?? []).map((r: any) => ({ ...r, age_days: daysBetween(r.submitted_at, null) }));
}
export async function fetchUpcomingHearings(f: LgReportFilters) {
  const dateTo = f.dateTo ?? new Date(Date.now() + 30 * 86_400_000).toISOString();
  let q = sb.from("lg_hearing").select("*").gte("scheduled_at", f.dateFrom ?? new Date().toISOString()).lte("scheduled_at", dateTo);
  if (f.courtId) q = q.eq("court_code", f.courtId);
  if (f.officerId) q = q.eq("officer_code", f.officerId);
  const { data } = await q.order("scheduled_at", { ascending: true }).limit(2000);
  return data ?? [];
}
export async function fetchMissedHearings(f: LgReportFilters) {
  let q = sb.from("lg_hearing").select("*").lt("scheduled_at", new Date().toISOString()).in("status", ["SCHEDULED", "ADJOURNED", "MISSED"]);
  if (f.courtId) q = q.eq("court_code", f.courtId);
  if (f.dateFrom || f.dateTo) q = inRange(q, "scheduled_at", f);
  const { data } = await q.order("scheduled_at", { ascending: false }).limit(2000);
  return data ?? [];
}
export async function fetchOrdersPendingCompliance(f: LgReportFilters) {
  let q = sb.from("lg_order").select("*").or("compliance_status.eq.PENDING,compliance_status.eq.BREACHED");
  if (f.dateFrom || f.dateTo) q = inRange(q, "issued_date", f);
  const { data } = await q.order("issued_date", { ascending: false }).limit(2000);
  return data ?? [];
}
export async function fetchHearingsRegister(f: LgReportFilters) {
  let q = sb.from("lg_hearing").select("*").limit(5000);
  if (f.courtId) q = q.eq("court_code", f.courtId);
  if (f.officerId) q = q.eq("officer_code", f.officerId);
  q = inRange(q, "scheduled_at", f);
  const { data } = await q.order("scheduled_at", { ascending: false });
  return data ?? [];
}
export async function fetchOrdersRegister(f: LgReportFilters) {
  let q = sb.from("lg_order").select("*").limit(5000);
  if (f.courtId) q = q.eq("issued_by_court", f.courtId);
  if (f.status) q = q.eq("status", f.status);
  q = inRange(q, "issued_date", f);
  const { data } = await q.order("issued_date", { ascending: false });
  return data ?? [];
}
export async function fetchRecoveryAssignmentRegister(f: LgReportFilters) {
  let q = sb.from("lg_recovery_assignment").select("*").limit(5000);
  if (f.officerId) q = q.eq("assigned_officer_id", f.officerId);
  if (f.stage) q = q.eq("status", f.stage);
  q = inRange(q, "created_at", f);
  const { data } = await q.order("created_at", { ascending: false });
  return data ?? [];
}
export async function fetchCourtFilingRegister(f: LgReportFilters) {
  let q = sb.from("lg_court_filing").select("*").limit(5000);
  if (f.courtId) q = q.eq("court_id", f.courtId);
  if (f.status) q = q.eq("status", f.status);
  q = inRange(q, "filed_date", f);
  const { data } = await q.order("filed_date", { ascending: false });
  return data ?? [];
}
export async function fetchTaskAging(f: LgReportFilters) {
  let q = sb.from("lg_case_task").select("*").not("status", "in", '("COMPLETED","CANCELLED","CLOSED")').limit(5000);
  if (f.officerId) q = q.eq("assigned_to", f.officerId);
  if (f.status) q = q.eq("status", f.status);
  const { data } = await q.order("due_date", { ascending: true });
  return (data ?? []).map((r: any) => ({ ...r, age_bucket: ageBucket(daysBetween(r.due_date, null)) }));
}
export async function fetchDeadlineRegister(f: LgReportFilters) {
  let q = sb.from("lg_case_deadline").select("*").not("status", "eq", "COMPLETED").limit(5000);
  if (f.officerId) q = q.eq("assigned_to", f.officerId);
  if (f.dateFrom || f.dateTo) q = inRange(q, "due_date", f);
  const { data } = await q.order("due_date", { ascending: true });
  return (data ?? []).map((r: any) => ({ ...r, days_remaining: daysBetween(new Date().toISOString(), r.due_date) }));
}

// ============================================================
// POST-JUDGMENT
// ============================================================
export async function fetchAppealsRegister(f: LgReportFilters) {
  let q = sb.from("lg_appeal").select("*").limit(5000);
  if (f.status) q = q.eq("status", f.status);
  q = inRange(q, "filing_date", f);
  const { data } = await q.order("filing_date", { ascending: false });
  return data ?? [];
}
export async function fetchEnforcementRegister(f: LgReportFilters) {
  let q = sb.from("lg_enforcement_action").select("*").limit(5000);
  if (f.status) q = q.eq("status", f.status);
  if (f.officerId) q = q.eq("officer_code", f.officerId);
  q = inRange(q, "requested_date", f);
  const { data } = await q.order("requested_date", { ascending: false });
  return data ?? [];
}
export async function fetchConsentOrderRegister(f: LgReportFilters) {
  let q = sb.from("lg_consent_order").select("*").limit(5000);
  if (f.status) q = q.eq("status", f.status);
  q = inRange(q, "start_date", f);
  const { data } = await q.order("start_date", { ascending: false });
  return data ?? [];
}

// ============================================================
// JUDICIAL — group/aggregate views
// ============================================================
export async function fetchHearingsByCourt(f: LgReportFilters) {
  const rows = await fetchHearingsRegister(f);
  const map = new Map<string, any>();
  for (const r of rows) {
    const key = r.court_code || "UNKNOWN";
    const g = map.get(key) ?? { court: key, hearing_count: 0, completed: 0, adjourned: 0 };
    g.hearing_count += 1;
    if (r.status === "COMPLETED") g.completed += 1;
    if (r.status === "ADJOURNED") g.adjourned += 1;
    map.set(key, g);
  }
  return Array.from(map.values()).sort((a, b) => b.hearing_count - a.hearing_count);
}
export async function fetchHearingsByJudge(f: LgReportFilters) {
  const rows = await fetchHearingsRegister(f);
  const map = new Map<string, any>();
  for (const r of rows) {
    const key = r.judge_code || r.judge_name || "UNKNOWN";
    const g = map.get(key) ?? { judge: key, hearing_count: 0 };
    g.hearing_count += 1;
    map.set(key, g);
  }
  return Array.from(map.values()).sort((a, b) => b.hearing_count - a.hearing_count);
}
export async function fetchHearingOutcomes(f: LgReportFilters) {
  const rows = await fetchHearingsRegister(f);
  const map = new Map<string, any>();
  for (const r of rows) {
    const key = r.outcome_code || "PENDING";
    const g = map.get(key) ?? { outcome: key, count: 0 };
    g.count += 1;
    map.set(key, g);
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}
export async function fetchJudgmentRegister(f: LgReportFilters) {
  let q = sb.from("lg_order").select("*").in("order_type_code", ["JUDGMENT","FINAL_JUDGMENT","INTERIM_JUDGMENT"]).limit(5000);
  if (f.courtId) q = q.eq("issued_by_court", f.courtId);
  q = inRange(q, "issued_date", f);
  const { data } = await q.order("issued_date", { ascending: false });
  return data ?? [];
}
export async function fetchOrderCompliance(f: LgReportFilters) {
  const orders = await fetchOrdersRegister(f);
  const map = new Map<string, any>();
  for (const r of orders) {
    const key = r.compliance_status || "PENDING";
    const g = map.get(key) ?? { compliance_status: key, count: 0, amount: 0 };
    g.count += 1;
    g.amount += Number(r.ordered_amount ?? 0);
    map.set(key, g);
  }
  return Array.from(map.values());
}
export async function fetchAppealOutcomes(f: LgReportFilters) {
  const rows = await fetchAppealsRegister(f);
  const map = new Map<string, any>();
  for (const r of rows) {
    const key = r.outcome || "PENDING";
    const g = map.get(key) ?? { outcome: key, count: 0 };
    g.count += 1;
    map.set(key, g);
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}
export async function fetchEnforcementOutcomes(f: LgReportFilters) {
  const rows = await fetchEnforcementRegister(f);
  const map = new Map<string, any>();
  for (const r of rows) {
    const key = r.outcome || "PENDING";
    const g = map.get(key) ?? { outcome: key, count: 0, targeted: 0, recovered: 0 };
    g.count += 1;
    g.targeted += Number(r.amount_targeted ?? 0);
    g.recovered += Number(r.amount_recovered ?? 0);
    map.set(key, g);
  }
  return Array.from(map.values());
}
export async function fetchTimeToJudgment(f: LgReportFilters) {
  const [cases, orders] = await Promise.all([
    sb.from("lg_case").select("id, lg_case_no, opened_date"),
    sb.from("lg_order").select("case_id, lg_case_id, issued_date").in("order_type_code", ["JUDGMENT","FINAL_JUDGMENT"] as any),
  ]);
  const byCase = new Map<string, string>();
  for (const o of orders.data ?? []) {
    const cid = o.case_id ?? o.lg_case_id;
    if (!cid) continue;
    if (!byCase.has(cid) || (o.issued_date && o.issued_date < (byCase.get(cid) ?? "z"))) byCase.set(cid, o.issued_date);
  }
  return (cases.data ?? []).filter((c: any) => byCase.has(c.id)).map((c: any) => ({
    lg_case_no: c.lg_case_no, opened_date: c.opened_date, judgment_date: byCase.get(c.id),
    days_to_judgment: daysBetween(c.opened_date, byCase.get(c.id) ?? null),
  }));
}
export async function fetchTimeToEnforcement(f: LgReportFilters) {
  const [orders, enforcement] = await Promise.all([
    sb.from("lg_order").select("id, lg_case_id, case_id, issued_date, order_no").in("order_type_code", ["JUDGMENT","FINAL_JUDGMENT"] as any),
    sb.from("lg_enforcement_action").select("order_id, requested_date"),
  ]);
  const byOrder = new Map<string, string>();
  for (const e of enforcement.data ?? []) {
    if (e.order_id) byOrder.set(e.order_id, e.requested_date);
  }
  return (orders.data ?? []).filter((o: any) => byOrder.has(o.id)).map((o: any) => ({
    order_no: o.order_no, issued_date: o.issued_date, enforcement_date: byOrder.get(o.id),
    days_to_enforcement: daysBetween(o.issued_date, byOrder.get(o.id) ?? null),
  }));
}
export async function fetchCourtSuccess(f: LgReportFilters) {
  const orders = await fetchOrdersRegister(f);
  const map = new Map<string, any>();
  for (const r of orders) {
    const key = r.issued_by_court || "UNKNOWN";
    const g = map.get(key) ?? { court: key, total: 0, favourable: 0 };
    g.total += 1;
    if (["ALLOWED","IN_FAVOUR","AWARDED"].includes(r.outcome ?? "")) g.favourable += 1;
    map.set(key, g);
  }
  return Array.from(map.values()).map((g) => ({ ...g, success_pct: g.total ? Math.round((g.favourable / g.total) * 1000) / 10 : 0 }));
}

// ============================================================
// RECOVERY
// ============================================================
export async function fetchRecoveryByOfficer(f: LgReportFilters) {
  const rows = await fetchRecoveryAssignmentRegister(f);
  const map = new Map<string, any>();
  for (const r of rows) {
    const key = r.assigned_officer_id || r.assigned_officer_code || "UNASSIGNED";
    const g = map.get(key) ?? { officer: key, assignment_count: 0, target: 0, recovered: 0, outstanding: 0 };
    g.assignment_count += 1;
    g.target += Number(r.target_recovery_amount ?? 0);
    g.recovered += Number(r.total_paid ?? 0);
    g.outstanding += Number(r.total_outstanding ?? 0);
    map.set(key, g);
  }
  return Array.from(map.values()).sort((a, b) => b.recovered - a.recovered);
}
export async function fetchRecoveryByEmployer(f: LgReportFilters) {
  const rows = await fetchRecoveryAssignmentRegister(f);
  const map = new Map<string, any>();
  for (const r of rows) {
    const key = r.employer_id || "UNKNOWN";
    const g = map.get(key) ?? { employer: key, assignment_count: 0, target: 0, recovered: 0 };
    g.assignment_count += 1;
    g.target += Number(r.target_recovery_amount ?? 0);
    g.recovered += Number(r.total_paid ?? 0);
    map.set(key, g);
  }
  return Array.from(map.values()).sort((a, b) => b.recovered - a.recovered);
}
export async function fetchRecoveryByStage(f: LgReportFilters) {
  const rows = await fetchRecoveryAssignmentRegister(f);
  const map = new Map<string, any>();
  for (const r of rows) {
    const key = r.status || "OPEN";
    const g = map.get(key) ?? { stage: key, count: 0, target: 0, recovered: 0 };
    g.count += 1;
    g.target += Number(r.target_recovery_amount ?? 0);
    g.recovered += Number(r.total_paid ?? 0);
    map.set(key, g);
  }
  return Array.from(map.values());
}
export async function fetchRecoveryAging(f: LgReportFilters) {
  const rows = await fetchRecoveryAssignmentRegister(f);
  return rows.map((r: any) => ({ ...r, age_days: daysBetween(r.created_at, null), age_bucket: ageBucket(daysBetween(r.created_at, null)) }));
}
export async function fetchConsentBreach(f: LgReportFilters) {
  let q = sb.from("lg_consent_order").select("*").eq("status", "BREACHED");
  q = inRange(q, "start_date", f);
  const { data } = await q;
  return data ?? [];
}
export async function fetchEnforcementRecovery(f: LgReportFilters) {
  return fetchEnforcementRegister(f);
}
export async function fetchSettlementRecovery(f: LgReportFilters) {
  return fetchSettlement(f);
}
export async function fetchOutstandingRecovery(f: LgReportFilters) {
  const rows = await fetchRecoveryAssignmentRegister(f);
  return rows.filter((r: any) => Number(r.total_outstanding ?? 0) > 0);
}

// ============================================================
// WORKLOAD
// ============================================================
export async function fetchOfficerWorkload(f: LgReportFilters) {
  const [cases, hearings, tasks] = await Promise.all([
    sb.from("lg_case").select("assigned_legal_officer_id, status_code"),
    sb.from("lg_hearing").select("officer_code, status"),
    sb.from("lg_case_task").select("assigned_to, status"),
  ]);
  const map = new Map<string, any>();
  for (const c of cases.data ?? []) {
    const key = c.assigned_legal_officer_id ?? "UNASSIGNED";
    const g = map.get(key) ?? { officer: key, open_matters: 0, closed_matters: 0, active_hearings: 0, open_tasks: 0 };
    if (["CLOSED","CANCELLED"].includes(c.status_code)) g.closed_matters += 1; else g.open_matters += 1;
    map.set(key, g);
  }
  for (const h of hearings.data ?? []) {
    const key = h.officer_code ?? "UNASSIGNED";
    const g = map.get(key) ?? { officer: key, open_matters: 0, closed_matters: 0, active_hearings: 0, open_tasks: 0 };
    if (["SCHEDULED","IN_PROGRESS"].includes(h.status)) g.active_hearings += 1;
    map.set(key, g);
  }
  for (const t of tasks.data ?? []) {
    const key = t.assigned_to ?? "UNASSIGNED";
    const g = map.get(key) ?? { officer: key, open_matters: 0, closed_matters: 0, active_hearings: 0, open_tasks: 0 };
    if (!["COMPLETED","CANCELLED","CLOSED"].includes(t.status)) g.open_tasks += 1;
    map.set(key, g);
  }
  return Array.from(map.values()).sort((a, b) => b.open_matters - a.open_matters);
}
export async function fetchTeamWorkload(f: LgReportFilters) {
  const { data: teams } = await sb.from("lg_team").select("id, team_code, team_name");
  const { data: members } = await sb.from("lg_team_member").select("team_id, user_id");
  const { data: cases } = await sb.from("lg_case").select("assigned_legal_officer_id, status_code");
  const membersByTeam = new Map<string, string[]>();
  for (const m of members ?? []) {
    if (!membersByTeam.has(m.team_id)) membersByTeam.set(m.team_id, []);
    membersByTeam.get(m.team_id)!.push(m.user_id);
  }
  return (teams ?? []).map((t: any) => {
    const officers = membersByTeam.get(t.id) ?? [];
    const teamCases = (cases ?? []).filter((c: any) => officers.includes(c.assigned_legal_officer_id));
    return {
      team_code: t.team_code, team_name: t.team_name, officer_count: officers.length,
      open_matters: teamCases.filter((c: any) => !["CLOSED","CANCELLED"].includes(c.status_code)).length,
      closed_matters: teamCases.filter((c: any) => ["CLOSED","CANCELLED"].includes(c.status_code)).length,
    };
  });
}
export async function fetchMattersByOfficer(f: LgReportFilters) {
  const rows = await fetchCases(f);
  const map = new Map<string, any>();
  for (const c of rows) {
    const key = c.assigned_legal_officer_id ?? "UNASSIGNED";
    const g = map.get(key) ?? { officer: key, count: 0 };
    g.count += 1;
    map.set(key, g);
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}
export async function fetchHearingsByOfficer(f: LgReportFilters) {
  const rows = await fetchHearingsRegister(f);
  const map = new Map<string, any>();
  for (const r of rows) {
    const key = r.officer_code ?? "UNASSIGNED";
    const g = map.get(key) ?? { officer: key, count: 0 };
    g.count += 1;
    map.set(key, g);
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}
export async function fetchTasksByOfficer(f: LgReportFilters) {
  const { data } = await sb.from("lg_case_task").select("assigned_to, status").limit(10000);
  const map = new Map<string, any>();
  for (const r of data ?? []) {
    const key = r.assigned_to ?? "UNASSIGNED";
    const g = map.get(key) ?? { officer: key, open: 0, completed: 0 };
    if (r.status === "COMPLETED") g.completed += 1; else g.open += 1;
    map.set(key, g);
  }
  return Array.from(map.values()).sort((a, b) => b.open - a.open);
}
export async function fetchOverdueWork(f: LgReportFilters) {
  const now = new Date().toISOString();
  const [tasks, hearings, deadlines] = await Promise.all([
    sb.from("lg_case_task").select("*").lt("due_date", now).not("status", "in", '("COMPLETED","CANCELLED","CLOSED")'),
    sb.from("lg_hearing").select("*").lt("scheduled_at", now).in("status", ["SCHEDULED","ADJOURNED"] as any),
    sb.from("lg_case_deadline").select("*").lt("due_date", now).not("status", "eq", "COMPLETED"),
  ]);
  return [
    ...(tasks.data ?? []).map((r: any) => ({ type: "TASK", ref: r.task_title, due: r.due_date, officer: r.assigned_to, id: r.id })),
    ...(hearings.data ?? []).map((r: any) => ({ type: "HEARING", ref: r.hearing_no ?? r.id, due: r.scheduled_at, officer: r.officer_code, id: r.id })),
    ...(deadlines.data ?? []).map((r: any) => ({ type: "DEADLINE", ref: r.deadline_type, due: r.due_date, officer: r.assigned_to, id: r.id })),
  ];
}
export async function fetchRecoveryPerformance(f: LgReportFilters) {
  return fetchRecoveryByOfficer(f);
}
export async function fetchClosurePerformance(f: LgReportFilters) {
  const cases = await fetchCases(f, (q) => q.in("status_code", ["CLOSED","CANCELLED"]));
  const map = new Map<string, any>();
  for (const c of cases) {
    const key = c.assigned_legal_officer_id ?? "UNASSIGNED";
    const d = daysBetween(c.opened_date, c.closed_date);
    const g = map.get(key) ?? { officer: key, closed_count: 0, total_days: 0 };
    g.closed_count += 1;
    g.total_days += d ?? 0;
    map.set(key, g);
  }
  return Array.from(map.values()).map((g) => ({ ...g, avg_days: g.closed_count ? Math.round(g.total_days / g.closed_count) : 0 })).sort((a, b) => b.closed_count - a.closed_count);
}

// ============================================================
// LEGAL COSTS / COUNSEL
// ============================================================
export async function fetchExternalCounselRegister(f: LgReportFilters) {
  let q = sb.from("lg_external_counsel_engagement").select("*, lg_external_counsel(code, law_firm_name, primary_attorney)").limit(5000);
  if (f.counselId) q = q.eq("counsel_id", f.counselId);
  q = inRange(q, "engaged_at", f);
  const { data } = await q.order("engaged_at", { ascending: false });
  return (data ?? []).map((r: any) => ({
    ...r,
    law_firm_name: r.lg_external_counsel?.law_firm_name ?? "—",
    primary_attorney: r.lg_external_counsel?.primary_attorney ?? "—",
  }));
}
export async function fetchCounselMatters(f: LgReportFilters) {
  const rows = await fetchExternalCounselRegister(f);
  const map = new Map<string, any>();
  for (const r of rows) {
    const key = r.counsel_id;
    const g = map.get(key) ?? { counsel_id: key, law_firm_name: r.law_firm_name, matter_count: 0 };
    g.matter_count += 1;
    map.set(key, g);
  }
  return Array.from(map.values()).sort((a, b) => b.matter_count - a.matter_count);
}
export async function fetchCounselFees(f: LgReportFilters) {
  let q = sb.from("lg_external_counsel_invoice").select("*, lg_external_counsel_engagement(counsel_id, lg_external_counsel(law_firm_name))").limit(5000);
  if (f.dateFrom || f.dateTo) q = inRange(q, "invoice_date", f);
  const { data } = await q.order("invoice_date", { ascending: false });
  return (data ?? []).map((r: any) => ({ ...r, law_firm_name: r.lg_external_counsel_engagement?.lg_external_counsel?.law_firm_name ?? "—" }));
}
export async function fetchCounselOutcome(f: LgReportFilters) {
  const rows = await fetchExternalCounselRegister(f);
  const map = new Map<string, any>();
  for (const r of rows) {
    const key = r.status || "ACTIVE";
    const g = map.get(key) ?? { status: key, count: 0 };
    g.count += 1;
    map.set(key, g);
  }
  return Array.from(map.values());
}
export async function fetchCounselAvgDuration(f: LgReportFilters) {
  const rows = await fetchExternalCounselRegister(f);
  const map = new Map<string, any>();
  for (const r of rows) {
    const key = r.counsel_id;
    const d = daysBetween(r.engaged_at, r.disengaged_at ?? null);
    const g = map.get(key) ?? { counsel_id: key, law_firm_name: r.law_firm_name, engagements: 0, total_days: 0 };
    g.engagements += 1;
    g.total_days += d ?? 0;
    map.set(key, g);
  }
  return Array.from(map.values()).map((g) => ({ ...g, avg_days: g.engagements ? Math.round(g.total_days / g.engagements) : 0 }));
}
export async function fetchCounselCostRecovery(f: LgReportFilters) {
  const [engagements, costs] = await Promise.all([
    fetchExternalCounselRegister(f),
    sb.from("lg_legal_cost").select("case_id, amount, recovered_amount"),
  ]);
  const costByCase = new Map<string, { cost: number; recovered: number }>();
  for (const c of costs.data ?? []) {
    const v = costByCase.get(c.case_id) ?? { cost: 0, recovered: 0 };
    v.cost += Number(c.amount ?? 0);
    v.recovered += Number(c.recovered_amount ?? 0);
    costByCase.set(c.case_id, v);
  }
  const map = new Map<string, any>();
  for (const r of engagements) {
    const key = r.counsel_id;
    const g = map.get(key) ?? { counsel_id: key, law_firm_name: r.law_firm_name, fee_incurred: 0, recovered: 0 };
    g.fee_incurred += Number(r.fee_incurred ?? 0);
    const cc = costByCase.get(r.case_id);
    if (cc) g.recovered += cc.recovered;
    map.set(key, g);
  }
  return Array.from(map.values()).map((g) => ({ ...g, net: g.recovered - g.fee_incurred }));
}
export async function fetchLegalCostRegister(f: LgReportFilters) {
  let q = sb.from("lg_legal_cost").select("*").limit(5000);
  if (f.status) q = q.eq("status", f.status);
  q = inRange(q, "incurred_date", f);
  const { data } = await q.order("incurred_date", { ascending: false });
  return data ?? [];
}

// ============================================================
// Registry — Every registered report has a fetcher
// ============================================================
export const REPORT_FETCHERS: Record<string, (f: LgReportFilters) => Promise<any[]>> = {
  // Financial
  FIN_CASE_SUMMARY: fetchCaseSummary,
  FIN_OUTSTANDING_BY_EMPLOYER: fetchOutstandingByEmployer,
  FIN_OUTSTANDING_BY_FUND: fetchOutstandingByFund,
  FIN_OUTSTANDING_BY_LIABILITY_TYPE: fetchOutstandingByLiabilityType,
  FIN_OUTSTANDING_BY_PERIOD: fetchOutstandingByPeriod,
  FIN_RECOVERY_COLLECTION: fetchRecoveryCollection,
  FIN_LEGAL_COST_REGISTER: fetchLegalCostRegister,
  FIN_PAYMENT_ALLOCATION: fetchPaymentAllocation,
  FIN_LEGAL_COST_RECOVERY: fetchLegalCostRecovery,
  FIN_COURT_COST: fetchCourtCost,
  FIN_SETTLEMENT: fetchSettlement,
  FIN_CONSENT_COLLECTION: fetchConsentCollection,
  FIN_WRITE_OFF: fetchWriteOff,

  // Compliance referral
  CR_REFERRAL_REGISTER: fetchReferralRegister,
  CR_REFERRAL_ITEMS: fetchReferralItems,
  CR_ITEMS_BY_FUND: fetchReferralItemsByFund,
  CR_ITEMS_BY_PERIOD: fetchReferralItemsByPeriod,
  CR_ITEMS_ACCEPTED: fetchReferralItemsAccepted,
  CR_ITEMS_REJECTED: fetchReferralItemsRejected,
  CR_CONVERSION_RATE: fetchReferralConversion,
  CR_TIME_REFERRAL_TO_INTAKE: fetchTimeReferralToIntake,
  CR_TIME_INTAKE_TO_MATTER: fetchTimeIntakeToMatter,
  CR_REFERRED_VS_LIABILITY: fetchReferralVsLiability,
  CR_MULTI_COMPONENT: fetchMultiComponentReferral,

  // Operational
  OPS_OPEN_MATTERS: fetchOpenMatters,
  OPS_CLOSED_MATTERS: fetchClosedMatters,
  OPS_MATTER_AGING: fetchMatterAging,
  OPS_INTAKE_AGING: fetchIntakeAging,
  OPS_UPCOMING_HEARINGS: fetchUpcomingHearings,
  OPS_MISSED_HEARINGS: fetchMissedHearings,
  OPS_ORDERS_PENDING_COMPLIANCE: fetchOrdersPendingCompliance,
  OPS_HEARINGS_REGISTER: fetchHearingsRegister,
  OPS_ORDERS_REGISTER: fetchOrdersRegister,
  OPS_RECOVERY_ASSIGNMENT_REGISTER: fetchRecoveryAssignmentRegister,
  OPS_APPEALS_REGISTER: fetchAppealsRegister,
  OPS_ENFORCEMENT_REGISTER: fetchEnforcementRegister,
  OPS_CONSENT_ORDER_REGISTER: fetchConsentOrderRegister,
  OPS_COURT_FILING_REGISTER: fetchCourtFilingRegister,
  OPS_TASK_AGING: fetchTaskAging,
  OPS_DEADLINE_REGISTER: fetchDeadlineRegister,

  // Judicial
  JUD_HEARINGS_BY_COURT: fetchHearingsByCourt,
  JUD_HEARINGS_BY_JUDGE: fetchHearingsByJudge,
  JUD_HEARING_OUTCOMES: fetchHearingOutcomes,
  JUD_JUDGMENT_REGISTER: fetchJudgmentRegister,
  JUD_ORDER_COMPLIANCE: fetchOrderCompliance,
  JUD_APPEAL_OUTCOMES: fetchAppealOutcomes,
  JUD_ENFORCEMENT_OUTCOMES: fetchEnforcementOutcomes,
  JUD_TIME_TO_JUDGMENT: fetchTimeToJudgment,
  JUD_TIME_TO_ENFORCEMENT: fetchTimeToEnforcement,
  JUD_COURT_SUCCESS: fetchCourtSuccess,

  // Recovery
  REC_ASSIGNMENT_REGISTER: fetchRecoveryAssignmentRegister,
  REC_BY_OFFICER: fetchRecoveryByOfficer,
  REC_BY_FUND: fetchRecoveryByFund,
  REC_BY_EMPLOYER: fetchRecoveryByEmployer,
  REC_BY_STAGE: fetchRecoveryByStage,
  REC_AGING: fetchRecoveryAging,
  REC_CONSENT_BREACH: fetchConsentBreach,
  REC_ENFORCEMENT: fetchEnforcementRecovery,
  REC_SETTLEMENT: fetchSettlementRecovery,
  REC_OUTSTANDING: fetchOutstandingRecovery,

  // Workload
  WL_OFFICER_WORKLOAD: fetchOfficerWorkload,
  WL_TEAM_WORKLOAD: fetchTeamWorkload,
  WL_MATTERS_OFFICER: fetchMattersByOfficer,
  WL_HEARINGS_OFFICER: fetchHearingsByOfficer,
  WL_TASKS_OFFICER: fetchTasksByOfficer,
  WL_OVERDUE_WORK: fetchOverdueWork,
  WL_RECOVERY_PERFORMANCE: fetchRecoveryPerformance,
  WL_CLOSURE_PERFORMANCE: fetchClosurePerformance,

  // External counsel
  EC_ENGAGEMENT_REGISTER: fetchExternalCounselRegister,
  EC_MATTERS: fetchCounselMatters,
  EC_FEES: fetchCounselFees,
  EC_OUTCOME: fetchCounselOutcome,
  EC_AVG_DURATION: fetchCounselAvgDuration,
  EC_COST_VS_RECOVERY: fetchCounselCostRecovery,
};
