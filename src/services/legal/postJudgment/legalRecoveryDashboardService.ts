/**
 * EPIC-07 Phase 4 — Legal Recovery Dashboard Service
 * Aggregates portfolio-wide KPIs directly from post-judgment tables.
 * All figures are computed server-side (via Supabase queries) — no mocks.
 */
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface RecoveryKpi {
  key: string;
  label: string;
  value: number;
  format?: "count" | "currency" | "percent";
  tone?: "default" | "success" | "warning" | "destructive";
  /** Deep-link URL to a filtered workbench / list. */
  linkTo?: string;
}

export interface LegalRecoveryDashboardData {
  kpis: RecoveryKpi[];
  breakdowns: {
    complianceByStatus: Array<{ status: string; count: number }>;
    consentByStatus: Array<{ status: string; count: number }>;
    filingsByStatus: Array<{ status: string; count: number }>;
    costsByType: Array<{ type: string; incurred: number; recovered: number }>;
    counselUtilisation: Array<{ engagement: string; estimate: number; incurred: number }>;
  };
  totals: {
    total_ordered: number;
    total_paid: number;
    total_outstanding: number;
    total_costs_incurred: number;
    total_costs_recovered: number;
    total_counsel_estimate: number;
    total_counsel_incurred: number;
  };
}

async function countBy<T extends string>(
  table: string, column: string, filter?: (q: any) => any,
): Promise<Array<{ status: T; count: number }>> {
  let q = sb.from(table).select(`${column}`);
  if (filter) q = filter(q);
  const { data, error } = await q;
  if (error) return [];
  const map = new Map<string, number>();
  for (const r of data ?? []) {
    const k = String((r as any)[column] ?? "UNKNOWN");
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([status, count]) => ({ status: status as T, count }));
}

export async function loadLegalRecoveryDashboard(): Promise<LegalRecoveryDashboardData> {
  const [
    compliance,
    consentOrders,
    consentInst,
    settlements,
    enforcement,
    filings,
    counselEng,
    counselInv,
    costs,
  ] = await Promise.all([
    sb.from("lg_judgment_compliance").select("id,compliance_status,total_ordered,paid_amount,compliance_due_date"),
    sb.from("lg_consent_order").select("id,status"),
    sb.from("lg_consent_installment").select("id,status,due_date"),
    sb.from("lg_settlement").select("id,status,agreed_amount,paid_amount"),
    sb.from("lg_enforcement_action").select("id,status"),
    sb.from("lg_court_filing").select("id,status,filing_type,deadline"),
    sb.from("lg_external_counsel_engagement").select("id,status,fee_estimate,fee_incurred"),
    sb.from("lg_external_counsel_invoice").select("id,status,amount,tax_amount"),
    sb.from("lg_legal_cost").select("id,status,cost_type,amount,recovered_amount"),
  ]);

  const comp = (compliance.data ?? []) as any[];
  const co = (consentOrders.data ?? []) as any[];
  const ci = (consentInst.data ?? []) as any[];
  const st = (settlements.data ?? []) as any[];
  const enf = (enforcement.data ?? []) as any[];
  const fl = (filings.data ?? []) as any[];
  const eng = (counselEng.data ?? []) as any[];
  const inv = (counselInv.data ?? []) as any[];
  const cs = (costs.data ?? []) as any[];

  const now = Date.now();
  const sum = (xs: any[], k: string) => xs.reduce((s, x) => s + Number(x?.[k] ?? 0), 0);

  const total_ordered = sum(comp, "total_ordered");
  const total_paid = sum(comp, "paid_amount");
  const total_outstanding = Math.max(total_ordered - total_paid, 0);

  const complianceOverdue = comp.filter(
    (c) => c.compliance_due_date &&
      new Date(c.compliance_due_date).getTime() < now &&
      !["COMPLIED", "CLOSED"].includes(String(c.compliance_status)),
  ).length;
  const complied = comp.filter((c) => c.compliance_status === "COMPLIED").length;
  const compliancePct = comp.length > 0 ? (complied / comp.length) * 100 : 0;

  const consentBreached = co.filter((c) => c.status === "BREACHED").length;
  const consentActive = co.filter((c) => c.status === "ACTIVE").length;

  const missedInstallments = ci.filter(
    (i) => i.status === "MISSED" ||
      (i.due_date && new Date(i.due_date).getTime() < now && i.status === "PENDING"),
  ).length;

  const settlementsExecuted = st.filter((s) =>
    ["EXECUTED", "COURT_APPROVED", "APPROVED", "ACTIVE"].includes(String(s.status)),
  ).length;
  const settlementsBreached = st.filter((s) => s.status === "BREACHED").length;
  const settlementSuccessPct = st.length > 0
    ? (settlementsExecuted / st.length) * 100
    : 0;

  const enforcementActive = enf.filter((e) =>
    ["INITIATED", "IN_PROGRESS", "ACTIVE"].includes(String(e.status).toUpperCase()),
  ).length;
  const enforcementSuccess = enf.filter((e) =>
    ["SUCCESSFUL", "COMPLETED"].includes(String(e.status).toUpperCase()),
  ).length;
  const enforcementSuccessPct = enf.length > 0
    ? (enforcementSuccess / enf.length) * 100
    : 0;

  const filingsOverdue = fl.filter(
    (f) => f.deadline &&
      new Date(f.deadline).getTime() < now &&
      !["ACCEPTED", "WITHDRAWN"].includes(String(f.status)),
  ).length;
  const filingsPending = fl.filter((f) =>
    ["DRAFT", "FILED", "SERVED"].includes(String(f.status)),
  ).length;

  const total_counsel_estimate = sum(eng, "fee_estimate");
  const total_counsel_incurred = sum(eng, "fee_incurred");
  const counselOverBudget = eng.filter(
    (e) => Number(e.fee_estimate ?? 0) > 0 && Number(e.fee_incurred ?? 0) > Number(e.fee_estimate),
  ).length;
  const invoicesDisputed = inv.filter((i) => i.status === "DISPUTED").length;

  const total_costs_incurred = sum(cs, "amount");
  const total_costs_recovered = sum(cs, "recovered_amount");
  const costsRecoveryPct = total_costs_incurred > 0
    ? (total_costs_recovered / total_costs_incurred) * 100
    : 0;

  const kpis: RecoveryKpi[] = [
    { key: "judgments", label: "Judgments Under Compliance", value: comp.length, format: "count", linkTo: "/legal/lg/orders?order_type=JUDGMENT" },
    { key: "compliance_overdue", label: "Compliance Overdue", value: complianceOverdue, format: "count", tone: complianceOverdue > 0 ? "destructive" : "default" },
    { key: "compliance_pct", label: "Compliance Rate", value: Math.round(compliancePct), format: "percent", tone: compliancePct >= 75 ? "success" : compliancePct >= 40 ? "warning" : "destructive" },
    { key: "consent_active", label: "Active Consent Orders", value: consentActive, format: "count" },
    { key: "consent_breached", label: "Breached Consent Orders", value: consentBreached, format: "count", tone: consentBreached > 0 ? "destructive" : "default" },
    { key: "installments_missed", label: "Missed Installments", value: missedInstallments, format: "count", tone: missedInstallments > 0 ? "warning" : "default" },
    { key: "settlements", label: "Legal Settlements", value: st.length, format: "count" },
    { key: "settlement_success", label: "Settlement Success %", value: Math.round(settlementSuccessPct), format: "percent", tone: settlementSuccessPct >= 60 ? "success" : "warning" },
    { key: "settlement_breached", label: "Breached Settlements", value: settlementsBreached, format: "count", tone: settlementsBreached > 0 ? "destructive" : "default" },
    { key: "enforcement_active", label: "Active Enforcement", value: enforcementActive, format: "count" },
    { key: "enforcement_success", label: "Enforcement Success %", value: Math.round(enforcementSuccessPct), format: "percent", tone: enforcementSuccessPct >= 50 ? "success" : "warning" },
    { key: "filings_pending", label: "Court Filings Pending", value: filingsPending, format: "count" },
    { key: "filings_overdue", label: "Court Filings Overdue", value: filingsOverdue, format: "count", tone: filingsOverdue > 0 ? "destructive" : "default" },
    { key: "counsel_engagements", label: "Counsel Engagements", value: eng.filter((e) => e.status === "ACTIVE").length, format: "count" },
    { key: "counsel_over_budget", label: "Counsel Over Budget", value: counselOverBudget, format: "count", tone: counselOverBudget > 0 ? "warning" : "default" },
    { key: "invoices_disputed", label: "Disputed Invoices", value: invoicesDisputed, format: "count", tone: invoicesDisputed > 0 ? "warning" : "default" },
    { key: "outstanding", label: "Total Outstanding", value: total_outstanding, format: "currency" },
    { key: "ordered", label: "Total Ordered", value: total_ordered, format: "currency" },
    { key: "costs_recovery", label: "Legal Costs Recovery %", value: Math.round(costsRecoveryPct), format: "percent", tone: costsRecoveryPct >= 60 ? "success" : "warning" },
    { key: "costs_outstanding", label: "Legal Costs Outstanding", value: Math.max(total_costs_incurred - total_costs_recovered, 0), format: "currency" },
  ];

  const groupCount = (rows: any[], k: string) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const key = String(r?.[k] ?? "UNKNOWN");
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return Array.from(m.entries()).map(([status, count]) => ({ status, count }));
  };

  const costsByTypeMap = new Map<string, { incurred: number; recovered: number }>();
  for (const c of cs) {
    const k = String(c.cost_type ?? "OTHER");
    const cur = costsByTypeMap.get(k) ?? { incurred: 0, recovered: 0 };
    cur.incurred += Number(c.amount ?? 0);
    cur.recovered += Number(c.recovered_amount ?? 0);
    costsByTypeMap.set(k, cur);
  }

  return {
    kpis,
    breakdowns: {
      complianceByStatus: groupCount(comp, "compliance_status"),
      consentByStatus: groupCount(co, "status"),
      filingsByStatus: groupCount(fl, "status"),
      costsByType: Array.from(costsByTypeMap.entries()).map(
        ([type, v]) => ({ type, ...v }),
      ),
      counselUtilisation: eng.slice(0, 10).map((e) => ({
        engagement: String(e.id).slice(0, 8),
        estimate: Number(e.fee_estimate ?? 0),
        incurred: Number(e.fee_incurred ?? 0),
      })),
    },
    totals: {
      total_ordered,
      total_paid,
      total_outstanding,
      total_costs_incurred,
      total_costs_recovered,
      total_counsel_estimate,
      total_counsel_incurred,
    },
  };
}
