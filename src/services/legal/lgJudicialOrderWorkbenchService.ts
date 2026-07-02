/**
 * EPIC-06B — Judicial Orders Workbench aggregation service.
 * Pulls orders with case + hearing + liability rollups and computes KPIs / filters.
 */
import { supabase } from "@/integrations/supabase/client";
import type { LgOrderRecord } from "@/types/legal/judicial";

const sb = supabase as any;

export interface OrderWorkbenchRow extends LgOrderRecord {
  lg_case_no?: string | null;
  case_summary?: string | null;
  assigned_officer?: string | null;
  primary_party_name?: string | null;
  liability_count?: number;
  liability_outstanding?: number;
  liability_ordered?: number;
  liability_paid?: number;
  recovery_impact?: number;
  last_activity_at?: string | null;
}

export interface OrderWorkbenchFilters {
  order_type?: string;
  court?: string;
  officer?: string;
  compliance_status?: string;
  appeal_status?: string;
  enforcement_status?: string;
  status?: string;
  fund_type?: string;
  liability_type?: string;
  due_date_from?: string;
  due_date_to?: string;
  high_value_only?: boolean;
}

export interface OrderWorkbenchKpis {
  active: number;
  due_for_compliance: number;
  breached: number;
  under_appeal: number;
  pending_enforcement: number;
  amount_ordered: number;
  amount_recovered: number;
  closing_this_month: number;
}

export async function listOrderWorkbench(filters: OrderWorkbenchFilters = {}): Promise<{ rows: OrderWorkbenchRow[]; kpis: OrderWorkbenchKpis }> {
  // Fetch orders (no embedded FK — resilient to relation-name changes).
  let q = sb.from("lg_order").select("*").order("issued_date", { ascending: false });

  if (filters.order_type) q = q.eq("order_type_code", filters.order_type);
  if (filters.court) q = q.eq("issued_by_court", filters.court);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.compliance_status) q = q.eq("compliance_status", filters.compliance_status);
  if (filters.appeal_status) q = q.eq("appeal_status", filters.appeal_status);
  if (filters.enforcement_status) q = q.eq("enforcement_status", filters.enforcement_status);
  if (filters.due_date_from) q = q.gte("compliance_date", filters.due_date_from);
  if (filters.due_date_to) q = q.lte("compliance_date", filters.due_date_to);
  if (filters.high_value_only) q = q.gte("ordered_amount", 10000);

  const { data, error } = await q.limit(1000);
  if (error) throw error;

  const orders = (data ?? []) as any[];
  const orderIds = orders.map((o) => o.id);
  const caseIds = Array.from(new Set(orders.map((o) => o.lg_case_id).filter(Boolean)));

  // Sidecar case lookup — uses real column names (assigned_legal_officer_id, not assigned_officer_code).
  const caseMap = new Map<string, { lg_case_no: string | null; summary: string | null; officer: string | null }>();
  if (caseIds.length) {
    const { data: cases } = await sb
      .from("lg_case")
      .select("id, lg_case_no, summary, assigned_legal_officer_id")
      .in("id", caseIds);
    for (const c of (cases ?? []) as any[]) {
      caseMap.set(c.id, {
        lg_case_no: c.lg_case_no ?? null,
        summary: c.summary ?? null,
        officer: c.assigned_legal_officer_id ?? null,
      });
    }
  }

  const liabsByOrder = new Map<string, { count: number; outstanding: number; ordered: number; paid: number }>();
  let links: any[] = [];
  if (orderIds.length) {
    const { data: linkData } = await sb
      .from("lg_order_liability")
      .select("order_id, liability_id, amount_ordered")
      .in("order_id", orderIds);
    links = (linkData ?? []) as any[];

    const liabIds = Array.from(new Set(links.map((l) => l.liability_id).filter(Boolean)));
    const liabMap = new Map<string, { paid: number; outstanding: number; fund_type: string | null; liability_type: string | null }>();
    if (liabIds.length) {
      const { data: liabs } = await sb
        .from("lg_recoverable_liability")
        .select("id, paid, outstanding, fund_type, liability_type")
        .in("id", liabIds);
      for (const l of (liabs ?? []) as any[]) {
        liabMap.set(l.id, {
          paid: Number(l.paid ?? 0),
          outstanding: Number(l.outstanding ?? 0),
          fund_type: l.fund_type ?? null,
          liability_type: l.liability_type ?? null,
        });
      }
    }

    for (const l of links) {
      const cur = liabsByOrder.get(l.order_id) ?? { count: 0, outstanding: 0, ordered: 0, paid: 0 };
      const liab = liabMap.get(l.liability_id);
      cur.count += 1;
      cur.outstanding += liab?.outstanding ?? 0;
      cur.paid += liab?.paid ?? 0;
      cur.ordered += Number(l.amount_ordered ?? 0);
      liabsByOrder.set(l.order_id, cur);
      // annotate for post-hoc filtering
      (l as any)._liab = liab;
    }

    if (filters.fund_type || filters.liability_type) {
      const kept = new Set<string>();
      for (const l of links) {
        const liab = (l as any)._liab;
        if (filters.fund_type && liab?.fund_type !== filters.fund_type) continue;
        if (filters.liability_type && liab?.liability_type !== filters.liability_type) continue;
        kept.add(l.order_id);
      }
      const filtered = orders.filter((o) => kept.has(o.id));
      return finalize(filtered, liabsByOrder, caseMap);
    }
  }
  return finalize(orders, liabsByOrder, caseMap);

  function finalize(
    list: any[],
    map: Map<string, { count: number; outstanding: number; ordered: number; paid: number }>,
    cmap: Map<string, { lg_case_no: string | null; summary: string | null; officer: string | null }>,
  ) {
    const rows: OrderWorkbenchRow[] = list.map((o) => {
      const l = map.get(o.id);
      const c = cmap.get(o.lg_case_id);
      return {
        ...o,
        lg_case_no: c?.lg_case_no ?? null,
        case_summary: c?.summary ?? null,
        assigned_officer: c?.officer ?? null,
        liability_count: l?.count ?? 0,
        liability_outstanding: l?.outstanding ?? 0,
        liability_ordered: l?.ordered ?? 0,
        liability_paid: l?.paid ?? 0,
        recovery_impact: l ? l.paid : 0,
      };
    });
    const today = new Date().toISOString().slice(0, 10);
    const monthEnd = new Date(); monthEnd.setMonth(monthEnd.getMonth() + 1, 0);
    const monthEndStr = monthEnd.toISOString().slice(0, 10);
    const kpis: OrderWorkbenchKpis = {
      active: rows.filter((r) => ["ACTIVE","PARTIALLY_COMPLIED"].includes(r.status)).length,
      due_for_compliance: rows.filter((r) => r.compliance_date && r.compliance_date >= today && r.compliance_date <= monthEndStr && r.compliance_status !== "COMPLIED").length,
      breached: rows.filter((r) => r.status === "BREACHED" || r.compliance_status === "BREACHED").length,
      under_appeal: rows.filter((r) => r.status === "UNDER_APPEAL" || (r.appeal_status && !["NONE","","REJECTED","DISMISSED","WITHDRAWN","CLOSED"].includes(r.appeal_status))).length,
      pending_enforcement: rows.filter((r) => r.enforcement_required && !["EXECUTED","CLOSED","CANCELLED"].includes(r.enforcement_status ?? "")).length,
      amount_ordered: rows.reduce((s, r) => s + Number(r.ordered_amount ?? 0), 0),
      amount_recovered: rows.reduce((s, r) => s + Number(r.recovery_impact ?? 0), 0),
      closing_this_month: rows.filter((r) => r.expiry_date && r.expiry_date >= today && r.expiry_date <= monthEndStr).length,
    };
    return { rows, kpis };
  }
}
