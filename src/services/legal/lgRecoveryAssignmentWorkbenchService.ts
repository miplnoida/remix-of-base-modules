import { supabase } from "@/integrations/supabase/client";
import type { RecoveryAssignment } from "@/types/legal/recoveryAssignment";

const sb = supabase as any;

export interface AssignmentWorkbenchRow extends RecoveryAssignment {
  is_overdue_action: boolean;
  is_stale: boolean;
  campaign_name: string | null;
  strategy_name: string | null;
}

export interface AssignmentKpis {
  total: number;
  active: number;
  at_risk: number;
  critical: number;
  overdue_actions: number;
  pending_transfers: number;
  recovery_pct: number;
  workload_pct: number;
}

export async function loadAssignmentWorkbench(): Promise<{ rows: AssignmentWorkbenchRow[]; kpis: AssignmentKpis }> {
  const [{ data: assignments, error: e1 }, campaigns, strategies, transfers] = await Promise.all([
    sb.from("lg_recovery_assignment").select("*").order("created_at", { ascending: false }),
    sb.from("lg_recovery_campaign").select("id, name"),
    sb.from("lg_recovery_strategy_type").select("code, name"),
    sb.from("lg_recovery_assignment_transfer").select("id").eq("approval_state", "PENDING"),
  ]);
  if (e1) throw e1;

  const campaignById = new Map<string, string>((campaigns.data ?? []).map((c: any) => [c.id, c.name]));
  const strategyByCode = new Map<string, string>((strategies.data ?? []).map((s: any) => [s.code, s.name]));

  const now = Date.now();
  const staleThresholdMs = 14 * 24 * 60 * 60 * 1000;

  const rows: AssignmentWorkbenchRow[] = (assignments ?? []).map((a: RecoveryAssignment) => {
    const overdue = a.next_action_due_at ? new Date(a.next_action_due_at).getTime() < now : false;
    const stale = a.last_action_at ? now - new Date(a.last_action_at).getTime() > staleThresholdMs : true;
    return {
      ...a,
      is_overdue_action: overdue,
      is_stale: stale,
      campaign_name: a.campaign_id ? campaignById.get(a.campaign_id) ?? null : null,
      strategy_name: a.strategy_type_code ? strategyByCode.get(a.strategy_type_code) ?? null : null,
    };
  });

  const active = rows.filter((r) => ["ASSIGNED", "ACTIVE", "ESCALATED"].includes(r.status));
  const totalAssessed = rows.reduce((s, r) => s + Number(r.total_assessed ?? 0), 0);
  const totalPaid = rows.reduce((s, r) => s + Number(r.total_paid ?? 0), 0);

  const kpis: AssignmentKpis = {
    total: rows.length,
    active: active.length,
    at_risk: rows.filter((r) => r.health === "AT_RISK").length,
    critical: rows.filter((r) => r.health === "CRITICAL").length,
    overdue_actions: rows.filter((r) => r.is_overdue_action).length,
    pending_transfers: (transfers.data ?? []).length,
    recovery_pct: totalAssessed > 0 ? Math.round((totalPaid / totalAssessed) * 10000) / 100 : 0,
    workload_pct: 0,
  };

  return { rows, kpis };
}
