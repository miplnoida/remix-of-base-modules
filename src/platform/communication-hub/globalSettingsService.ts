/**
 * CH-SIMPLE-P1 — Canonical Global Settings and Operating Mode
 *
 * The single, authoritative reader for the Communication Hub singleton
 * control-settings row and the sole entry point for transitioning the
 * operating mode.
 *
 * Rules:
 *   1. Always looks up by singleton_guard = 'primary'. Never orders.
 *   2. Never mutates recipient-approval fields (allowed_email_addresses,
 *      allowed_email_domains, recipient_release_mode). Those live in the
 *      recipient-policy layer (later prompt).
 *   3. Legacy compat booleans (dispatch_enabled, dry_run_only) are derived
 *      transactionally by the RPC from the target operating_mode.
 *   4. No pilot recipient (e.g. rohit@mishainfotech.com) is hardcoded
 *      anywhere in this module.
 */

import { supabase } from "@/integrations/supabase/client";

export const COMMUNICATION_SETTINGS_SINGLETON_GUARD = "primary" as const;

export type CommunicationOperatingMode =
  | "DRY_RUN"
  | "CONTROLLED_LIVE"
  | "MANUAL_PRODUCTION"
  | "AUTOMATED_PRODUCTION"
  | "EMERGENCY_STOP";

/** Modes an administrator is permitted to select. */
export const SELECTABLE_OPERATING_MODES: readonly CommunicationOperatingMode[] = [
  "DRY_RUN",
  "CONTROLLED_LIVE",
  "MANUAL_PRODUCTION",
  "EMERGENCY_STOP",
] as const;

/** Blocked mode kept in the enum for future activation; never selectable now. */
export const BLOCKED_OPERATING_MODES: readonly CommunicationOperatingMode[] = [
  "AUTOMATED_PRODUCTION",
] as const;

export interface CommunicationGlobalSettings {
  id: string;
  singletonGuard: "primary";
  operatingMode: CommunicationOperatingMode;
  previousOperatingMode: CommunicationOperatingMode | null;
  modeChangedAt: string;
  modeChangedBy: string | null;
  modeChangeReason: string | null;
  configurationVersion: number;
  /** Read-only compatibility booleans derived from operatingMode. */
  dispatchEnabled: boolean;
  dryRunOnly: boolean;
  emailLiveEnabled: boolean;
  smsLiveEnabled: boolean;
  whatsappLiveEnabled: boolean;
  printEnabled: boolean;
  letterEnabled: boolean;
  updatedAt: string;
}

/**
 * Canonical singleton read.
 *
 * MUST NOT use `.order(...)`. MUST filter on singleton_guard.
 */
export async function fetchGlobalSettings(): Promise<CommunicationGlobalSettings> {
  const { data, error } = await supabase
    .from("communication_hub_control_settings")
    .select(
      "id, singleton_guard, operating_mode, previous_operating_mode, mode_changed_at, mode_changed_by, mode_change_reason, configuration_version, dispatch_enabled, dry_run_only, email_live_enabled, sms_live_enabled, whatsapp_live_enabled, print_enabled, letter_enabled, updated_at"
    )
    .eq("singleton_guard", COMMUNICATION_SETTINGS_SINGLETON_GUARD)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("communication hub settings singleton is missing");

  return {
    id: data.id as string,
    singletonGuard: "primary",
    operatingMode: (data as any).operating_mode as CommunicationOperatingMode,
    previousOperatingMode: ((data as any).previous_operating_mode ?? null) as
      | CommunicationOperatingMode
      | null,
    modeChangedAt: (data as any).mode_changed_at as string,
    modeChangedBy: ((data as any).mode_changed_by ?? null) as string | null,
    modeChangeReason: ((data as any).mode_change_reason ?? null) as string | null,
    configurationVersion: Number((data as any).configuration_version ?? 0),
    dispatchEnabled: Boolean((data as any).dispatch_enabled),
    dryRunOnly: Boolean((data as any).dry_run_only),
    emailLiveEnabled: Boolean((data as any).email_live_enabled),
    smsLiveEnabled: Boolean((data as any).sms_live_enabled),
    whatsappLiveEnabled: Boolean((data as any).whatsapp_live_enabled),
    printEnabled: Boolean((data as any).print_enabled),
    letterEnabled: Boolean((data as any).letter_enabled),
    updatedAt: (data as any).updated_at as string,
  };
}

export interface OperatingModeTransitionResult {
  previousMode: CommunicationOperatingMode | null;
  newMode: CommunicationOperatingMode;
  configurationVersion: number;
  changedAt: string;
  actor: string | null;
  reason: string | null;
}

/**
 * Transactional operating-mode transition.
 * Recipient approval settings are never modified by this RPC.
 */
export async function setOperatingMode(
  newMode: CommunicationOperatingMode,
  reason?: string
): Promise<OperatingModeTransitionResult> {
  if (BLOCKED_OPERATING_MODES.includes(newMode)) {
    throw new Error(`operating mode ${newMode} is not available`);
  }
  const { data, error } = await (supabase.rpc as any)(
    "set_communication_operating_mode",
    { p_new_mode: newMode, p_reason: reason ?? null }
  );
  if (error) throw error;
  const row = data as any;
  return {
    previousMode: (row?.previous_mode ?? null) as CommunicationOperatingMode | null,
    newMode: row?.new_mode as CommunicationOperatingMode,
    configurationVersion: Number(row?.configuration_version ?? 0),
    changedAt: row?.changed_at as string,
    actor: (row?.actor ?? null) as string | null,
    reason: (row?.reason ?? null) as string | null,
  };
}

/**
 * Derive the read-only compatibility booleans from an operating mode.
 * Mirrors the CASE expressions inside set_communication_operating_mode
 * so UI and tests can predict transactional post-conditions without a
 * round-trip.
 */
export function deriveCompatBooleans(mode: CommunicationOperatingMode): {
  dispatchEnabled: boolean;
  dryRunOnly: boolean;
} {
  return {
    dispatchEnabled: mode !== "EMERGENCY_STOP",
    dryRunOnly: mode === "DRY_RUN" || mode === "EMERGENCY_STOP",
  };
}
