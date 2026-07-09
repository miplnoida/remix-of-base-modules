/**
 * Communication Hub Control Center — service layer.
 *
 * Reads/writes the singleton `communication_hub_control_settings` row and
 * appends an entry to `communication_hub_control_audit` on every update.
 *
 * IMPORTANT:
 *  - This module does NOT change dispatcher behavior. It only persists
 *    admin-controlled settings and their audit trail. Phase 1C-B7-B will
 *    wire the dispatcher to read these values.
 *  - Secrets (EMAIL_LIVE env, Resend key, dispatch secret, service role
 *    key, Vault entries) are NEVER stored or returned here.
 */
import { supabase } from "@/integrations/supabase/client";

export type TrackingPolicyMode = "off_by_default" | "provider_default" | "explicit_per_event";

export interface CommHubControlSettings {
  id: string;
  dispatch_enabled: boolean;
  dry_run_only: boolean;
  email_live_enabled: boolean;
  sms_live_enabled: boolean;
  whatsapp_live_enabled: boolean;
  print_enabled: boolean;
  letter_enabled: boolean;
  allowed_email_addresses: string[];
  allowed_email_domains: string[];
  batch_size: number;
  cron_desired_enabled: boolean;
  max_attempts: number;
  retry_base_seconds: number;
  retry_max_seconds: number;
  live_eligible_after: string | null;
  live_eligible_max_age_minutes: number;
  notes: string | null;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
  // Phase 1C-B8-F — email tracking policy (defaults OFF)
  email_open_tracking_default: boolean;
  email_click_tracking_default: boolean;
  tracking_policy_mode: TrackingPolicyMode;
}

export interface CommHubControlAuditRow {
  id: string;
  setting_key: string;
  old_value: unknown;
  new_value: unknown;
  reason: string | null;
  changed_by: string | null;
  changed_at: string;
  source: string | null;
}

const HIGH_RISK_KEYS = new Set([
  "email_live_enabled",
  "dry_run_only",
  "allowed_email_domains",
  "dispatch_enabled",
  "cron_desired_enabled",
  "live_eligible_after",
  "live_eligible_max_age_minutes",
  // Phase 1C-B8-F — any change to tracking policy is high-risk (privacy/consent)
  "email_open_tracking_default",
  "email_click_tracking_default",
  "tracking_policy_mode",
]);

export function isHighRiskKey(k: string): boolean {
  return HIGH_RISK_KEYS.has(k);
}


export async function fetchControlSettings(): Promise<CommHubControlSettings> {
  const { data, error } = await (supabase as any)
    .from("communication_hub_control_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Control settings row missing — contact platform admin.");
  return data as CommHubControlSettings;
}

export async function fetchRecentAudit(limit = 50): Promise<CommHubControlAuditRow[]> {
  const { data, error } = await (supabase as any)
    .from("communication_hub_control_audit")
    .select("*")
    .order("changed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as CommHubControlAuditRow[];
}

export interface UpdateChange {
  key: keyof CommHubControlSettings;
  oldValue: unknown;
  newValue: unknown;
}

/**
 * Persist a settings update and one audit row per changed key.
 *
 * Callers should pass ONLY the keys the user actually changed to keep the
 * audit trail useful and minimal.
 */
export async function updateControlSettings(params: {
  current: CommHubControlSettings;
  patch: Partial<CommHubControlSettings>;
  reason: string;
}): Promise<CommHubControlSettings> {
  const { current, patch, reason } = params;

  // Compute effective changes.
  const changes: UpdateChange[] = [];
  for (const k of Object.keys(patch) as (keyof CommHubControlSettings)[]) {
    const oldV = (current as any)[k];
    const newV = (patch as any)[k];
    if (JSON.stringify(oldV) !== JSON.stringify(newV)) {
      changes.push({ key: k, oldValue: oldV, newValue: newV });
    }
  }
  if (changes.length === 0) return current;

  // Client-side validations (mirrors DB trigger for a nicer message).
  const merged = { ...current, ...patch };
  if (merged.email_live_enabled) {
    if ((merged.allowed_email_addresses?.length ?? 0) === 0
        && (merged.allowed_email_domains?.length ?? 0) === 0) {
      throw new Error("Cannot enable live email while both allowlist arrays are empty.");
    }
  }
  if (merged.batch_size < 1 || merged.batch_size > 50) {
    throw new Error("batch_size must be between 1 and 50.");
  }
  if (merged.live_eligible_max_age_minutes < 1 || merged.live_eligible_max_age_minutes > 1440) {
    throw new Error("live_eligible_max_age_minutes must be between 1 and 1440.");
  }


  const requiresReason = changes.some(c => isHighRiskKey(String(c.key)));
  if (requiresReason && !reason.trim()) {
    throw new Error("A reason/comment is required when changing high-risk settings.");
  }

  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id ?? null;

  const { data: updated, error } = await (supabase as any)
    .from("communication_hub_control_settings")
    .update({ ...patch, updated_by: uid })
    .eq("id", current.id)
    .select("*")
    .maybeSingle();
  if (error) throw error;

  // Write one audit row per changed key.
  const auditRows = changes.map(c => ({
    setting_key: String(c.key),
    old_value: c.oldValue as any,
    new_value: c.newValue as any,
    reason: reason || null,
    changed_by: uid,
    source: "communication-hub-control-center",
  }));
  const { error: auditErr } = await (supabase as any)
    .from("communication_hub_control_audit")
    .insert(auditRows);
  if (auditErr) {
    // Audit failure is non-fatal to the user's data but must be surfaced.
    console.error("[control-center] audit insert failed", auditErr);
  }

  return updated as CommHubControlSettings;
}

/** Basic domain validation — no wildcards, no leading '@'. */
export function validateDomain(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (!v) throw new Error("Empty domain.");
  if (v.startsWith("@")) throw new Error("Store domain without leading '@' (e.g. 'example.com').");
  if (v.includes("*")) throw new Error("Wildcard domains are not allowed.");
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(v)) throw new Error("Invalid domain format.");
  return v;
}

export function validateEmail(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (!v) throw new Error("Empty email.");
  if (v.includes("*")) throw new Error("Wildcard emails are not allowed.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Error("Invalid email format.");
  return v;
}
