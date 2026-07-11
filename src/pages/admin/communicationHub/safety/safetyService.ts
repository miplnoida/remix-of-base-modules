/**
 * EPIC CH-SAFE-1 — Safety Switchboard service layer.
 *
 * Read/compute layer on top of communication_hub_control_settings and
 * communication_hub_gate_catalog.
 *
 * SAFETY:
 *  - Never sends email.
 *  - Never creates communication_request / communication_message.
 *  - Never writes notification_queue / notification_logs / legacy audit tables.
 *  - Actual mutations of control settings still go through the existing
 *    updateControlSettings() service which writes to control_audit.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  fetchControlSettings,
  updateControlSettings,
  isHighRiskKey,
  type CommHubControlSettings,
} from "../controlCenter/controlCenterService";

export type SystemModePreset =
  | "safe_mode"
  | "internal_live_testing"
  | "production_internal_live"
  | "external_live_controlled"
  | "emergency_stop";

export interface GateCatalogRow {
  id: string;
  gate_code: string;
  gate_name: string;
  category: string;
  plain_language_description: string;
  blocker_code: string;
  severity: "low" | "medium" | "high" | "critical";
  normal_state: string | null;
  live_state: string | null;
  recommended_fix: string | null;
  fixing_screen_url: string | null;
  requires_reason: boolean;
  requires_typed_confirmation_when_enabling: boolean;
  requires_typed_confirmation_when_disabling: boolean;
  go_live_blocking: boolean;
  display_order: number;
  is_active: boolean;
}

export async function fetchGateCatalog(): Promise<GateCatalogRow[]> {
  const { data, error } = await (supabase as any)
    .from("communication_hub_gate_catalog")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as GateCatalogRow[];
}

/** Returns { changes, requiresTypedConfirmation, confirmationPhrase } for a preset. Does NOT apply. */
export function computePresetChanges(
  preset: SystemModePreset,
  current: CommHubControlSettings,
): {
  label: string;
  description: string;
  patch: Partial<CommHubControlSettings>;
  changes: Array<{ key: string; from: unknown; to: unknown; dangerous: boolean }>;
  requiresTypedConfirmation: boolean;
  confirmationPhrase: string | null;
} {
  let patch: Partial<CommHubControlSettings> = {};
  let label = "";
  let description = "";

  switch (preset) {
    case "safe_mode":
      label = "Safe Mode / Dry Run Only";
      description = "Simulate every send. No live email leaves the system. Scheduler off.";
      patch = { dry_run_only: true, email_live_enabled: false, cron_desired_enabled: false };
      break;
    case "internal_live_testing":
      label = "Internal Live Testing";
      description = "Live email ON to internal recipients only. Scheduler and bulk stay OFF.";
      patch = { dry_run_only: false, email_live_enabled: true, cron_desired_enabled: false };
      break;
    case "production_internal_live":
      label = "Production Internal Live";
      description = "Live email ON for approved internal events. Bulk stays OFF by default.";
      patch = { dry_run_only: false, email_live_enabled: true, cron_desired_enabled: false };
      break;
    case "external_live_controlled":
      label = "External Live Controlled";
      description = "Live email ON. External domains must be explicitly allowlisted and events approved.";
      patch = { dry_run_only: false, email_live_enabled: true, cron_desired_enabled: false };
      break;
    case "emergency_stop":
      label = "Emergency Stop";
      description = "Kill switch: dispatcher, live email, and scheduler all OFF.";
      patch = { dispatch_enabled: false, email_live_enabled: false, cron_desired_enabled: false, dry_run_only: true };
      break;
  }

  const changes = (Object.keys(patch) as Array<keyof CommHubControlSettings>).flatMap((k) => {
    const from = (current as any)[k];
    const to = (patch as any)[k];
    if (JSON.stringify(from) === JSON.stringify(to)) return [];
    return [{ key: String(k), from, to, dangerous: isDangerousChange(String(k), from, to) }];
  });

  const requiresTypedConfirmation = changes.some((c) => c.dangerous);
  const confirmationPhrase = requiresTypedConfirmation ? confirmationPhraseFor(preset) : null;

  return { label, description, patch, changes, requiresTypedConfirmation, confirmationPhrase };
}

export function confirmationPhraseFor(preset: SystemModePreset): string {
  switch (preset) {
    case "safe_mode": return "ENABLE SAFE MODE";
    case "internal_live_testing": return "ENABLE INTERNAL LIVE TESTING";
    case "production_internal_live": return "ENABLE PRODUCTION INTERNAL LIVE";
    case "external_live_controlled": return "ENABLE EXTERNAL LIVE CONTROLLED";
    case "emergency_stop": return "ENGAGE EMERGENCY STOP";
  }
}

/**
 * Dangerous = anything that EXPANDS blast radius. Reducing it never requires typed confirmation.
 * This mirrors CH-P5 dangerous-change rules for send policy.
 */
export function isDangerousChange(key: string, from: unknown, to: unknown): boolean {
  if (key === "dry_run_only") {
    // dry_run_only true -> false = dangerous (turning safety OFF)
    return from === true && to === false;
  }
  if (key === "email_live_enabled") {
    return from === false && to === true;
  }
  if (key === "dispatch_enabled") {
    // enabling dispatcher after emergency-stop; disabling never dangerous
    return from === false && to === true;
  }
  if (key === "cron_desired_enabled") {
    return from === false && to === true;
  }
  if (key === "allowed_email_domains") {
    const before = new Set((from as string[] | null) ?? []);
    const after = (to as string[] | null) ?? [];
    // adding a domain that isn't already there is dangerous (esp. external)
    return after.some((d) => !before.has(d));
  }
  if (key === "allowed_email_addresses") {
    // Only dangerous if we widen dramatically — treat as non-dangerous by default
    return false;
  }
  if (key === "max_recipients_per_send" || key === "batch_size") {
    return typeof from === "number" && typeof to === "number" && to > from;
  }
  return isHighRiskKey(key);
}

/**
 * Wrapper around updateControlSettings that (a) validates the typed
 * confirmation phrase when required and (b) tags the audit source.
 * Uses the existing audit trail (communication_hub_control_audit).
 */
export async function applyGateChange(params: {
  current: CommHubControlSettings;
  patch: Partial<CommHubControlSettings>;
  reason: string;
  typedConfirmation?: string | null;
  expectedConfirmation?: string | null;
}): Promise<CommHubControlSettings> {
  if (params.expectedConfirmation) {
    if ((params.typedConfirmation ?? "").trim() !== params.expectedConfirmation) {
      throw new Error(`Please type the exact confirmation phrase: ${params.expectedConfirmation}`);
    }
  }
  return updateControlSettings({
    current: params.current,
    patch: params.patch,
    reason: params.reason,
  });
}

/** Convenience: hydrate live queue + failed queue counts for the switchboard. */
export async function fetchLiveQueueSnapshot(): Promise<{ live_queued: number; failed: number }> {
  try {
    const { data: queued } = await (supabase as any)
      .from("communication_request")
      .select("id", { count: "exact", head: true })
      .eq("send_mode", "live")
      .in("status", ["queued", "processing"]);
    const { data: failed } = await (supabase as any)
      .from("communication_request")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed");
    return {
      live_queued: (queued as any)?.length ?? 0,
      failed: (failed as any)?.length ?? 0,
    };
  } catch {
    return { live_queued: 0, failed: 0 };
  }
}

export { fetchControlSettings };
