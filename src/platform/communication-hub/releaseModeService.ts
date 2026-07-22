/**
 * CH-GL — Canonical operating-mode service.
 *
 * The single client entry point that changes the Communication Hub's
 * operating mode. Every mode transition goes through the server-side
 * `apply_communication_release_mode` RPC which:
 *   - authenticates and authorises the caller,
 *   - locks the settings singleton,
 *   - applies the entire mode profile atomically,
 *   - increments configuration_version once,
 *   - writes a single audit record,
 *   - and never contacts an email provider.
 *
 * The operator never picks individual technical switches. They pick a
 * named mode; the server applies the full profile.
 */
import { supabase } from "@/integrations/supabase/client";

export type CommunicationOperatingMode =
  | "DRY_RUN"
  | "CONTROLLED_LIVE"
  | "MANUAL_PRODUCTION"
  | "AUTOMATED_PRODUCTION"
  | "EMERGENCY_STOP";

export interface ModeProfile {
  operating_mode: CommunicationOperatingMode;
  display_name: string;
  summary: string;
  dispatch_enabled: boolean;
  dry_run_only: boolean;
  email_live_enabled: boolean;
  scheduler_enabled: boolean;
  automatic_triggers_enabled: boolean;
  retry_worker_enabled: boolean;
  batch_enabled: boolean;
  bulk_enabled: boolean;
  real_provider_available: boolean;
  requires_grant_for_real_email: boolean;
  eligible_release_stages: string[];
}

export interface ApplyReleaseModeResult {
  ok: boolean;
  previous_mode: CommunicationOperatingMode | null;
  new_mode: CommunicationOperatingMode;
  configuration_version: number;
  profile: ModeProfile;
  changed_at: string;
  actor: string | null;
  reason: string | null;
}

/**
 * Human-facing labels + short business description for the five mode
 * cards on the Go Live screen. Kept close to `communication_hub_mode_profile`
 * but rendered client-side so we can hide server-only technical fields.
 */
export const MODE_CARDS: Array<{
  mode: CommunicationOperatingMode;
  label: string;
  headline: string;
  detail: string;
  danger: boolean;
}> = [
  {
    mode: "DRY_RUN",
    label: "Safe Testing",
    headline: "Simulate every send. No real email leaves the system.",
    detail: "Dispatcher available for simulation. Scheduler, automation, batch and bulk are off. Real provider is unavailable.",
    danger: false,
  },
  {
    mode: "CONTROLLED_LIVE",
    label: "Controlled Testing",
    headline: "Rehearsed sends with strict server authorisation.",
    detail: "Preview, Dry Test, Controlled Stub and One Real Email (with a one-use server grant). No production queue, scheduler or automation.",
    danger: false,
  },
  {
    mode: "MANUAL_PRODUCTION",
    label: "Manual Production",
    headline: "Certified events send by explicit operator action only.",
    detail: "Real provider available for certified manual events. Scheduler, automation, batch and bulk disabled. Recipient policy enforced.",
    danger: true,
  },
  {
    mode: "AUTOMATED_PRODUCTION",
    label: "Automated Production",
    headline: "Certified events run automatically under policy.",
    detail: "Scheduler, retries and approved automatic triggers enabled. Batch and bulk permitted only where the event policy allows. Rate limits and quiet hours enforced.",
    danger: true,
  },
  {
    mode: "EMERGENCY_STOP",
    label: "Emergency Stop",
    headline: "Immediately block all new dispatch. Evidence preserved.",
    detail: "New dispatch, real provider, scheduler, automation, batch and bulk all blocked. Safe diagnostics remain available. Requires an authorised administrator to select a mode again to resume.",
    danger: true,
  },
];

/**
 * Apply a new operating mode. Reason is required for any change other
 * than moving out of Safe Testing back to Safe Testing.
 */
export async function applyReleaseMode(params: {
  newMode: CommunicationOperatingMode;
  reason: string;
  expectedVersion?: number;
  moduleCode?: string | null;
  eventCode?: string | null;
  channel?: string | null;
}): Promise<ApplyReleaseModeResult> {
  const { data, error } = await (supabase as any).rpc(
    "apply_communication_release_mode",
    {
      p_new_mode: params.newMode,
      p_reason: params.reason ?? null,
      p_expected_version: params.expectedVersion ?? null,
      p_module_code: params.moduleCode ?? null,
      p_event_code: params.eventCode ?? null,
      p_channel: params.channel ?? null,
    },
  );
  if (error) {
    // Map the structured server-side codes surfaced by the canonical
    // transition core + wrapper to human-readable operator guidance.
    // Never swallow the underlying message.
    const raw = String(error.message ?? "");
    const map: Record<string, string> = {
      authentication_required: "You must sign in again to change the operating mode.",
      not_authorised: "You don't have permission to change the operating mode.",
      unknown_operating_mode: "That operating mode is not recognised.",
      MODE_PROFILE_MISSING: "Operating-mode profile is missing on the server. Contact platform admin.",
      MODE_SETTINGS_SINGLETON_MISSING: "Communication Hub settings row is missing. Contact platform admin.",
      MODE_CONFIGURATION_VERSION_INVALID: "Configuration version is invalid on the server.",
      MODE_CHANGE_REASON_REQUIRED: "A reason is required to change the operating mode.",
      MODE_CHANGE_REASON_TOO_LONG: "Reason is too long (max 2000 characters).",
      CONFIGURATION_VERSION_CONFLICT:
        "Another operator changed the mode just now. Refresh and try again.",
      MODE_AUDIT_SCHEMA_MISMATCH:
        "Operating-mode audit table is out of sync with the transition contract. Contact platform admin — do not retry until schema is repaired.",
    };
    const matched = Object.keys(map).find((k) => raw.includes(k));
    throw new Error(matched ? map[matched] : (raw || "apply_communication_release_mode failed"));
  }
  return data as ApplyReleaseModeResult;
}


/**
 * Which modes require a typed confirmation phrase. Emergency Stop deliberately
 * does NOT require a typed phrase — Slice B replaces it with a single
 * impact-confirm dialog so operators can halt dispatch as fast as possible.
 */
export function requiresTypedConfirmation(mode: CommunicationOperatingMode): string | null {
  switch (mode) {
    case "MANUAL_PRODUCTION": return "ACTIVATE MANUAL PRODUCTION";
    case "AUTOMATED_PRODUCTION": return "ACTIVATE AUTOMATED PRODUCTION";
    default: return null;
  }
}
