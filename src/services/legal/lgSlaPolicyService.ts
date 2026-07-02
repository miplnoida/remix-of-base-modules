/**
 * EPIC-06C Phase 1 — Configurable Judicial SLA policies.
 *
 * Replaces hardcoded hours across judicial automation. Every scope has a
 * safe default hardcoded here so behaviour is preserved when the DB row
 * is missing or unreachable.
 */
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type SlaScopeCode =
  | "ORDER_REVIEW"
  | "APPEAL_FILING"
  | "COMPLIANCE_REVIEW"
  | "COMPLIANCE_FOLLOWUP"
  | "BREACH_REVIEW"
  | "ENFORCEMENT_PREP"
  | "ORDER_CLOSURE"
  | "SETTLEMENT_REVIEW";

export interface SlaPolicy {
  scope_code: SlaScopeCode;
  scope_label: string;
  hours: number;
  reminder_frequency_hours: number | null;
  escalation_level_1_hours: number | null;
  escalation_level_2_hours: number | null;
  active: boolean;
}

/** Hardcoded fallbacks — mirror the seeded defaults in the Phase 1 migration. */
export const SLA_DEFAULTS: Record<SlaScopeCode, number> = {
  ORDER_REVIEW: 48,
  APPEAL_FILING: 336,
  COMPLIANCE_REVIEW: 72,
  COMPLIANCE_FOLLOWUP: 168,
  BREACH_REVIEW: 24,
  ENFORCEMENT_PREP: 72,
  ORDER_CLOSURE: 120,
  SETTLEMENT_REVIEW: 96,
};

let cache: Map<SlaScopeCode, SlaPolicy> | null = null;
let cacheAt = 0;
const TTL_MS = 60_000;

async function loadAll(): Promise<Map<SlaScopeCode, SlaPolicy>> {
  const now = Date.now();
  if (cache && now - cacheAt < TTL_MS) return cache;
  try {
    const { data } = await sb.from("lg_sla_policy").select("*").eq("active", true);
    const m = new Map<SlaScopeCode, SlaPolicy>();
    (data ?? []).forEach((r: any) => m.set(r.scope_code as SlaScopeCode, r));
    cache = m;
    cacheAt = now;
    return m;
  } catch {
    return new Map();
  }
}

export async function getSlaPolicy(scope: SlaScopeCode): Promise<SlaPolicy | null> {
  const m = await loadAll();
  return m.get(scope) ?? null;
}

export async function getSlaHours(scope: SlaScopeCode, fallback?: number): Promise<number> {
  const p = await getSlaPolicy(scope);
  return p?.hours ?? fallback ?? SLA_DEFAULTS[scope];
}

export async function getSlaDays(scope: SlaScopeCode, fallbackDays?: number): Promise<number> {
  const hours = await getSlaHours(scope, fallbackDays ? fallbackDays * 24 : undefined);
  return Math.max(1, Math.round(hours / 24));
}

/** Invalidate the cache (call after an admin edits SLA policy rows). */
export function invalidateSlaCache(): void {
  cache = null;
  cacheAt = 0;
}

export async function listSlaPolicies(): Promise<SlaPolicy[]> {
  const { data, error } = await sb.from("lg_sla_policy").select("*").order("scope_code");
  if (error) throw error;
  return (data ?? []) as SlaPolicy[];
}
