import { supabase } from "@/integrations/supabase/client";
import type {
  RecoveryCampaign, RecoveryStrategyType, RecoveryCampaignType, RecoveryWorkloadRule,
} from "@/types/legal/recoveryAssignment";

const sb = supabase as any;

// ----- Campaigns -----
export async function listCampaigns(): Promise<RecoveryCampaign[]> {
  const { data, error } = await sb.from("lg_recovery_campaign").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RecoveryCampaign[];
}

export async function upsertCampaign(input: Partial<RecoveryCampaign>, actor: string): Promise<RecoveryCampaign> {
  const payload = { ...input, updated_by: actor, updated_at: new Date().toISOString() };
  if (!input.id) (payload as any).created_by = actor;
  const q = input.id
    ? sb.from("lg_recovery_campaign").update(payload).eq("id", input.id).select("*").single()
    : sb.from("lg_recovery_campaign").insert(payload).select("*").single();
  const { data, error } = await q;
  if (error) throw error;
  return data as RecoveryCampaign;
}

export async function recomputeCampaignRollup(campaignId: string): Promise<void> {
  const { data, error } = await sb
    .from("lg_recovery_assignment")
    .select("total_paid")
    .eq("campaign_id", campaignId);
  if (error) throw error;
  const recovered = (data ?? []).reduce((s: number, r: any) => s + Number(r.total_paid ?? 0), 0);
  const count = (data ?? []).length;
  await sb.from("lg_recovery_campaign").update({
    actual_recovered_amount: recovered,
    actual_assignment_count: count,
    updated_at: new Date().toISOString(),
  }).eq("id", campaignId);
}

// ----- Strategy types -----
export async function listStrategyTypes(): Promise<RecoveryStrategyType[]> {
  const { data, error } = await sb
    .from("lg_recovery_strategy_type")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as RecoveryStrategyType[];
}

export async function upsertStrategyType(input: Partial<RecoveryStrategyType>, actor: string): Promise<RecoveryStrategyType> {
  const payload = { ...input, updated_by: actor, updated_at: new Date().toISOString() };
  if (!input.id) (payload as any).created_by = actor;
  const q = input.id
    ? sb.from("lg_recovery_strategy_type").update(payload).eq("id", input.id).select("*").single()
    : sb.from("lg_recovery_strategy_type").insert(payload).select("*").single();
  const { data, error } = await q;
  if (error) throw error;
  return data as RecoveryStrategyType;
}

// ----- Campaign types -----
export async function listCampaignTypes(): Promise<RecoveryCampaignType[]> {
  const { data, error } = await sb.from("lg_recovery_campaign_type").select("*").eq("is_active", true).order("name");
  if (error) throw error;
  return (data ?? []) as RecoveryCampaignType[];
}

export async function upsertCampaignType(input: Partial<RecoveryCampaignType>, actor: string): Promise<RecoveryCampaignType> {
  const payload = { ...input, updated_by: actor, updated_at: new Date().toISOString() };
  if (!input.id) (payload as any).created_by = actor;
  const q = input.id
    ? sb.from("lg_recovery_campaign_type").update(payload).eq("id", input.id).select("*").single()
    : sb.from("lg_recovery_campaign_type").insert(payload).select("*").single();
  const { data, error } = await q;
  if (error) throw error;
  return data as RecoveryCampaignType;
}

// ----- Workload rules -----
export async function listWorkloadRules(): Promise<RecoveryWorkloadRule[]> {
  const { data, error } = await sb.from("lg_recovery_workload_rule").select("*").eq("is_active", true).order("name");
  if (error) throw error;
  return (data ?? []) as RecoveryWorkloadRule[];
}

export async function upsertWorkloadRule(input: Partial<RecoveryWorkloadRule>, actor: string): Promise<RecoveryWorkloadRule> {
  const payload = { ...input, updated_by: actor, updated_at: new Date().toISOString() };
  if (!input.id) (payload as any).created_by = actor;
  const q = input.id
    ? sb.from("lg_recovery_workload_rule").update(payload).eq("id", input.id).select("*").single()
    : sb.from("lg_recovery_workload_rule").insert(payload).select("*").single();
  const { data, error } = await q;
  if (error) throw error;
  return data as RecoveryWorkloadRule;
}

// ----- Officer workload lookup -----
export async function getOfficerWorkload(officerId: string): Promise<{
  officer_id: string;
  active_count: number;
  high_priority_count: number;
  total_outstanding: number;
  capacity_pct: number;
  capacity_state: "OK" | "WARNING" | "CRITICAL";
}> {
  const { data, error } = await sb
    .from("lg_recovery_assignment")
    .select("id, status, priority, total_outstanding")
    .eq("assigned_officer_id", officerId);
  if (error) throw error;
  const rows = data ?? [];
  const active = rows.filter((r: any) => ["ASSIGNED", "ACTIVE", "ESCALATED"].includes(r.status));
  const highPri = active.filter((r: any) => ["HIGH", "URGENT"].includes(r.priority));
  const outstanding = active.reduce((s: number, r: any) => s + Number(r.total_outstanding ?? 0), 0);

  const rules = await listWorkloadRules();
  const rule = rules.find((r) => r.is_default) ?? rules[0];
  const max = rule?.max_active_assignments ?? 50;
  const warnPct = rule?.warning_threshold_pct ?? 80;
  const critPct = rule?.critical_threshold_pct ?? 100;
  const pct = max > 0 ? Math.round((active.length / max) * 100) : 0;
  const state: "OK" | "WARNING" | "CRITICAL" = pct >= critPct ? "CRITICAL" : pct >= warnPct ? "WARNING" : "OK";
  return {
    officer_id: officerId,
    active_count: active.length,
    high_priority_count: highPri.length,
    total_outstanding: outstanding,
    capacity_pct: pct,
    capacity_state: state,
  };
}
