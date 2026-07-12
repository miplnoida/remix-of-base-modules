/**
 * EPIC CH-RECIPIENT-1 — Recipient Control Center service layer.
 *
 * Reads/writes `communication_hub_control_settings.recipient_release_mode`
 * and the two allowlist arrays. All mutations flow through the existing
 * `updateControlSettings` service so the audit trail lives in
 * `communication_hub_control_audit` (no parallel audit).
 *
 * SAFETY:
 *  - Never sends email.
 *  - Never creates communication_request / communication_message.
 *  - Never writes notification_queue / notification_logs / legacy tables.
 *  - Never enables cron or bulk.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  fetchControlSettings as fetchBaseSettings,
  updateControlSettings,
  type CommHubControlSettings,
} from "../controlCenter/controlCenterService";

export type RecipientReleaseMode =
  | "single_recipient_pilot"
  | "internal_named_users"
  | "internal_domain_pilot"
  | "internal_production"
  | "approved_external_domains"
  | "approved_user_segments"
  | "full_production_controlled";

export interface RecipientReleaseModeStage {
  mode: RecipientReleaseMode;
  label: string;
  shortLabel: string;
  description: string;
  typedConfirmation: string | null; // null for future/locked stages
  locked: boolean;                    // true => cannot be selected in this epic
  order: number;
}

export const RECIPIENT_MODE_STAGES: RecipientReleaseModeStage[] = [
  {
    mode: "single_recipient_pilot",
    label: "Single Recipient Pilot",
    shortLabel: "Single Recipient",
    description: "Only rohit@mishainfotech.com may receive live email.",
    typedConfirmation: "SET RECIPIENT MODE SINGLE RECIPIENT PILOT",
    locked: false,
    order: 1,
  },
  {
    mode: "internal_named_users",
    label: "Internal Named Users",
    shortLabel: "Internal Named",
    description: "Approved individual @mishainfotech.com addresses only.",
    typedConfirmation: "SET RECIPIENT MODE INTERNAL NAMED USERS",
    locked: false,
    order: 2,
  },
  {
    mode: "internal_domain_pilot",
    label: "Internal Domain Pilot",
    shortLabel: "Internal Domain",
    description: "Allow the entire mishainfotech.com internal domain.",
    typedConfirmation: "SET RECIPIENT MODE INTERNAL DOMAIN PILOT",
    locked: false,
    order: 3,
  },
  {
    mode: "internal_production",
    label: "Internal Production",
    shortLabel: "Internal Prod",
    description: "Approved internal domains plus internal role resolvers.",
    typedConfirmation: "SET RECIPIENT MODE INTERNAL PRODUCTION",
    locked: false,
    order: 4,
  },
  {
    mode: "approved_external_domains",
    label: "Approved External Domains",
    shortLabel: "External Domains",
    description: "Future phase — approved external domains. Not enabled yet.",
    typedConfirmation: null,
    locked: true,
    order: 5,
  },
  {
    mode: "approved_user_segments",
    label: "Approved User Segments",
    shortLabel: "User Segments",
    description: "Future phase — approved user segments. Not enabled yet.",
    typedConfirmation: null,
    locked: true,
    order: 6,
  },
  {
    mode: "full_production_controlled",
    label: "Full Production Controlled",
    shortLabel: "Full Production",
    description: "Future phase — controlled production for all users. Not enabled yet.",
    typedConfirmation: null,
    locked: true,
    order: 7,
  },
];

export function getStage(mode: RecipientReleaseMode): RecipientReleaseModeStage {
  return RECIPIENT_MODE_STAGES.find(s => s.mode === mode) ?? RECIPIENT_MODE_STAGES[0];
}

export interface RecipientReleaseSettings extends CommHubControlSettings {
  recipient_release_mode: RecipientReleaseMode;
}

export async function fetchRecipientSettings(): Promise<RecipientReleaseSettings> {
  const s = await fetchBaseSettings();
  const mode = ((s as any).recipient_release_mode ?? "single_recipient_pilot") as RecipientReleaseMode;
  return { ...s, recipient_release_mode: mode };
}

export interface ValidatorBlocker { code: string; message: string }
export interface ValidatorResult {
  ok: boolean;
  mode: RecipientReleaseMode;
  allowed_email_addresses: string[];
  allowed_email_domains: string[];
  blockers: ValidatorBlocker[];
}

export async function validateRecipientMode(params: {
  mode: RecipientReleaseMode;
  addresses: string[];
  domains: string[];
}): Promise<ValidatorResult> {
  const { data, error } = await (supabase as any).rpc(
    "validate_comm_hub_recipient_release_mode",
    {
      p_mode: params.mode,
      p_allowed_email_addresses: params.addresses,
      p_allowed_email_domains: params.domains,
    },
  );
  if (error) throw error;
  return data as ValidatorResult;
}

/** Persist a mode change (and optionally allowlist changes) with typed confirmation. */
export async function applyRecipientModeChange(params: {
  current: RecipientReleaseSettings;
  nextMode: RecipientReleaseMode;
  nextAddresses?: string[];
  nextDomains?: string[];
  reason: string;
  typedConfirmation: string;
}): Promise<void> {
  const stage = getStage(params.nextMode);
  if (stage.locked) {
    throw new Error(`${stage.label} is a future phase and cannot be activated.`);
  }
  if (!stage.typedConfirmation || params.typedConfirmation !== stage.typedConfirmation) {
    throw new Error(`Typed confirmation must equal: ${stage.typedConfirmation}`);
  }
  if (!params.reason.trim()) {
    throw new Error("A reason is required.");
  }

  const patch: Partial<CommHubControlSettings> & { recipient_release_mode?: RecipientReleaseMode } = {
    recipient_release_mode: params.nextMode,
  };
  if (params.nextAddresses) patch.allowed_email_addresses = params.nextAddresses;
  if (params.nextDomains) patch.allowed_email_domains = params.nextDomains;

  // Pre-validate server-side to surface friendly errors early.
  const check = await validateRecipientMode({
    mode: params.nextMode,
    addresses: patch.allowed_email_addresses ?? params.current.allowed_email_addresses,
    domains: patch.allowed_email_domains ?? params.current.allowed_email_domains,
  });
  if (!check.ok) {
    throw new Error(check.blockers.map(b => `${b.code}: ${b.message}`).join(" | "));
  }

  await updateControlSettings({
    current: params.current,
    patch: patch as Partial<CommHubControlSettings>,
    reason: `[recipient-mode: ${params.nextMode}] ${params.reason.trim()}`,
  });
}

/** Update allowlists only (used from Recipient Control Center manage sections). */
export async function updateAllowlists(params: {
  current: RecipientReleaseSettings;
  nextAddresses?: string[];
  nextDomains?: string[];
  reason: string;
}): Promise<void> {
  if (!params.reason.trim()) throw new Error("A reason is required.");
  const patch: Partial<CommHubControlSettings> = {};
  if (params.nextAddresses) patch.allowed_email_addresses = params.nextAddresses;
  if (params.nextDomains) patch.allowed_email_domains = params.nextDomains;

  const check = await validateRecipientMode({
    mode: params.current.recipient_release_mode,
    addresses: patch.allowed_email_addresses ?? params.current.allowed_email_addresses,
    domains: patch.allowed_email_domains ?? params.current.allowed_email_domains,
  });
  if (!check.ok) {
    throw new Error(check.blockers.map(b => `${b.code}: ${b.message}`).join(" | "));
  }

  await updateControlSettings({
    current: params.current,
    patch,
    reason: `[recipient-allowlist] ${params.reason.trim()}`,
  });
}

export const FUTURE_BLOCKED_DOMAINS_HINT = [
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com",
  "aol.com", "icloud.com", "protonmail.com",
];
