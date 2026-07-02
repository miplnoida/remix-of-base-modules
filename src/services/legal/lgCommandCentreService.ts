/**
 * EPIC-06C Phase 2 — Executive Legal Command Centre aggregation.
 *
 * Single service that returns all 20 operational widgets from live tables.
 * No mock data, no AI. Every count is a Supabase read; all failures return 0
 * so partial schemas do not break the dashboard.
 */
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface CommandCentreMetrics {
  // Judicial
  activeOrders: number;
  complianceDue7d: number;
  breaches: number;
  appealsFiled30d: number;
  appealsPendingDecision: number;
  enforcementInProgress: number;
  enforcementCompleted30d: number;
  ordersAwaitingIssue: number;
  // Recovery
  totalOutstanding: number;
  recoveryPct: number;
  recoveryDelta30d: number;
  breachedArrangements: number;
  highRiskLiabilities: number;
  // Operational
  slaOnTimePct: number;
  atRiskTasks: number;
  overdueTasks: number;
  escalatedItems: number;
  myActions: number;
  teamQueueDepth: number;
  avgJudicialCycleDays: number;
}

const ZERO: CommandCentreMetrics = {
  activeOrders: 0, complianceDue7d: 0, breaches: 0, appealsFiled30d: 0,
  appealsPendingDecision: 0, enforcementInProgress: 0, enforcementCompleted30d: 0,
  ordersAwaitingIssue: 0, totalOutstanding: 0, recoveryPct: 0, recoveryDelta30d: 0,
  breachedArrangements: 0, highRiskLiabilities: 0, slaOnTimePct: 0, atRiskTasks: 0,
  overdueTasks: 0, escalatedItems: 0, myActions: 0, teamQueueDepth: 0,
  avgJudicialCycleDays: 0,
};

async function count(table: string, filter: (q: any) => any): Promise<number> {
  try {
    const q = sb.from(table).select("*", { count: "exact", head: true });
    const { count: c } = await filter(q);
    return Number(c || 0);
  } catch { return 0; }
}

async function sum(table: string, col: string, filter?: (q: any) => any): Promise<number> {
  try {
    let q = sb.from(table).select(col);
    if (filter) q = filter(q);
    const { data } = await q;
    return (data ?? []).reduce((s: number, r: any) => s + Number(r[col] || 0), 0);
  } catch { return 0; }
}

export async function loadCommandCentreMetrics(userCode?: string): Promise<CommandCentreMetrics> {
  const now = Date.now();
  const in7d = new Date(now + 7 * 86_400_000).toISOString();
  const ago30d = new Date(now - 30 * 86_400_000).toISOString();

  try {
    const [
      activeOrders, complianceDue7d, breaches, appealsFiled30d, appealsPendingDecision,
      enfInProgress, enfCompleted30d, ordersAwaitingIssue,
      totalOutstanding, totalPaid, totalAssessed, breachedArr, highRisk,
      atRisk, overdue, escalated, teamOpen, myOpen,
    ] = await Promise.all([
      count("lg_order", (q) => q.in("status", ["ACTIVE", "GRANTED"])),
      count("lg_order", (q) => q.lte("compliance_date", in7d).in("status", ["ACTIVE", "GRANTED"])),
      count("lg_order", (q) => q.eq("status", "BREACHED")),
      count("lg_appeal", (q) => q.gte("filed_date", ago30d)),
      count("lg_appeal", (q) => q.in("status", ["FILED", "UNDER_REVIEW"])),
      count("lg_enforcement_action", (q) => q.in("status", ["INITIATED", "IN_PROGRESS"])),
      count("lg_enforcement_action", (q) => q.eq("status", "COMPLETED").gte("updated_at", ago30d)),
      count("lg_order", (q) => q.eq("status", "DRAFT")),
      sum("lg_recoverable_liability", "outstanding", (q) => q.eq("status", "ACTIVE")),
      sum("lg_recoverable_liability", "paid", (q) => q.eq("status", "ACTIVE")),
      sum("lg_recoverable_liability", "total_assessed", (q) => q.eq("status", "ACTIVE")),
      count("lg_payment_arrangement_link", (q) => q.eq("active", true).eq("compliance_status", "BREACHED")),
      count("lg_recoverable_liability", (q) => q.in("risk_level", ["HIGH", "CRITICAL"]).eq("status", "ACTIVE")),
      count("lg_case_task", (q) => q.eq("sla_status", "AT_RISK").in("status", ["OPEN", "IN_PROGRESS"])),
      count("lg_case_task", (q) => q.eq("sla_status", "OVERDUE").in("status", ["OPEN", "IN_PROGRESS"])),
      count("lg_case_task", (q) => q.eq("sla_status", "ESCALATED").in("status", ["OPEN", "IN_PROGRESS"])),
      count("lg_case_task", (q) => q.in("status", ["OPEN", "IN_PROGRESS"])),
      userCode
        ? count("lg_case_task", (q) => q.eq("assigned_to", userCode).in("status", ["OPEN", "IN_PROGRESS"]))
        : Promise.resolve(0),
    ]);

    const totalActive = teamOpen;
    const onTime = Math.max(0, totalActive - atRisk - overdue - escalated);
    const slaOnTimePct = totalActive > 0 ? (onTime / totalActive) * 100 : 100;

    let recoveryDelta30d = 0;
    try {
      const { data } = await sb
        .from("lg_payment_allocation")
        .select("amount")
        .gte("created_at", ago30d);
      recoveryDelta30d = (data ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    } catch { /* zero */ }

    let avgJudicialCycleDays = 0;
    try {
      const { data } = await sb
        .from("lg_order")
        .select("issued_date, closed_date")
        .not("closed_date", "is", null)
        .gte("closed_date", ago30d);
      const diffs = (data ?? [])
        .filter((r: any) => r.issued_date && r.closed_date)
        .map((r: any) => (new Date(r.closed_date).getTime() - new Date(r.issued_date).getTime()) / 86_400_000);
      if (diffs.length > 0) avgJudicialCycleDays = diffs.reduce((s: number, d: number) => s + d, 0) / diffs.length;
    } catch { /* zero */ }

    return {
      activeOrders, complianceDue7d, breaches, appealsFiled30d, appealsPendingDecision,
      enforcementInProgress: enfInProgress, enforcementCompleted30d: enfCompleted30d,
      ordersAwaitingIssue,
      totalOutstanding, totalPaid,
      recoveryPct: totalAssessed > 0 ? (totalPaid / totalAssessed) * 100 : 0,
      recoveryDelta30d,
      breachedArrangements: breachedArr, highRiskLiabilities: highRisk,
      slaOnTimePct, atRiskTasks: atRisk, overdueTasks: overdue, escalatedItems: escalated,
      myActions: myOpen, teamQueueDepth: teamOpen, avgJudicialCycleDays,
    } as any;
  } catch {
    return ZERO;
  }
}

/** Judicial efficiency KPIs — separate query, cached independently. */
export interface JudicialEfficiencyMetrics {
  avgOrderCycleDays: number;
  avgAppealResolutionDays: number;
  enforcementCompletionRate: number;
  complianceAdherencePct: number;
}

export async function loadJudicialEfficiency(): Promise<JudicialEfficiencyMetrics> {
  const ago90d = new Date(Date.now() - 90 * 86_400_000).toISOString();
  try {
    const [orders, appeals, enf] = await Promise.all([
      sb.from("lg_order").select("issued_date, closed_date, status").gte("created_at", ago90d).then((r: any) => r.data ?? []),
      sb.from("lg_appeal").select("filed_date, decision_date, status").gte("created_at", ago90d).then((r: any) => r.data ?? []),
      sb.from("lg_enforcement_action").select("status").gte("created_at", ago90d).then((r: any) => r.data ?? []),
    ]);

    const orderCycles = orders
      .filter((r: any) => r.issued_date && r.closed_date)
      .map((r: any) => (new Date(r.closed_date).getTime() - new Date(r.issued_date).getTime()) / 86_400_000);
    const appealCycles = appeals
      .filter((r: any) => r.filed_date && r.decision_date)
      .map((r: any) => (new Date(r.decision_date).getTime() - new Date(r.filed_date).getTime()) / 86_400_000);
    const enfTotal = enf.length;
    const enfCompleted = enf.filter((r: any) => r.status === "COMPLETED").length;
    const orderTotal = orders.length;
    const complied = orders.filter((r: any) => r.status === "COMPLIED").length;

    return {
      avgOrderCycleDays: orderCycles.length ? orderCycles.reduce((a: number, b: number) => a + b, 0) / orderCycles.length : 0,
      avgAppealResolutionDays: appealCycles.length ? appealCycles.reduce((a: number, b: number) => a + b, 0) / appealCycles.length : 0,
      enforcementCompletionRate: enfTotal ? (enfCompleted / enfTotal) * 100 : 0,
      complianceAdherencePct: orderTotal ? (complied / orderTotal) * 100 : 0,
    };
  } catch {
    return { avgOrderCycleDays: 0, avgAppealResolutionDays: 0, enforcementCompletionRate: 0, complianceAdherencePct: 0 };
  }
}
