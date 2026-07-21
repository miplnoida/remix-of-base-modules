/**
 * CH-SIMPLE-P3F-UX.2 — Canonical Go Live blocker catalogue.
 *
 * Central operator-facing dictionary that maps the canonical blocker
 * codes returned by `evaluate_comm_hub_send_decision` (and the legacy
 * pilot evaluators) to a plain-language title, explanation, single
 * "Fix now" route and a lifecycle group.
 *
 * Every entry must satisfy:
 *   - a plain-language title (no `xxx_yyy_zzz`)
 *   - a simple explanation of why this blocks progress
 *   - one canonical fix route (single next action)
 *   - a group: "platform" | "event" | "test"
 *
 * The frontend NEVER reproduces server rules; this file only translates
 * codes returned by the server into operator language. Server-provided
 * `message` and `fix_route` values override the defaults when present.
 */
import type { SendDecisionBlocker } from "@/platform/communication-hub/sendDecisionService";

export type BlockerGroup = "platform" | "event" | "test";

export interface CanonicalBlockerEntry {
  code: string;
  title: string;
  explanation: string;
  whyItBlocks: string;
  fixLabel: string;
  fixRoute: string;
  group: BlockerGroup;
  severity: "critical" | "high" | "medium" | "low";
}

/** Canonical fix routes reused across many blockers. Single source of truth. */
export const FIX_ROUTES = {
  recipientPolicy: "/admin/communication-hub/recipient-policy",
  eventTemplateMapping: "/admin/communication-hub/onboarding/event-template-wizard",
  templateDesign: "/admin/communication-hub/design",
  senderProfiles: "/admin/communication-hub/design/sender-profiles",
  senderVerification: "/admin/communication-hub/design/sender-verification",
  providerSettings: "/admin/notifications/providers",
  sendPolicy: "/admin/communication-hub/governance/send-policies",
  reviewPolicy: "/admin/communication-hub/governance",
  operatingMode: "/admin/communication-hub/control-center",
  emergencyStop: "/admin/communication-hub/control-center",
  previewStep: "#go-live-step-preview",
  dryRunStep: "#go-live-step-dry-run",
  controlledLiveStep: "#go-live-step-controlled-live",
} as const;

const RECIPIENT_POLICY: CanonicalBlockerEntry = {
  code: "recipient_policy_denied",
  title: "Test recipient is not approved",
  explanation:
    "The selected recipient is not permitted by the current Recipient Policy.",
  whyItBlocks:
    "Every send is validated against Recipient Policy. If the recipient is not on the approved list, the Hub blocks the send before anything reaches the provider.",
  fixLabel: "Configure Recipient Policy",
  fixRoute: FIX_ROUTES.recipientPolicy,
  group: "platform",
  severity: "high",
};

const TEMPLATE_NOT_MAPPED: CanonicalBlockerEntry = {
  code: "template_not_mapped",
  title: "Template is not configured",
  explanation:
    "No template is currently linked to this event.",
  whyItBlocks: "The Hub cannot render a message without an active template for this event.",
  fixLabel: "Open Event–Template Mapping",
  fixRoute: FIX_ROUTES.eventTemplateMapping,
  group: "event",
  severity: "high",
};

const TEMPLATE_NOT_APPROVED: CanonicalBlockerEntry = {
  code: "template_not_approved",
  title: "Template is not approved",
  explanation:
    "The template linked to this event still needs an approval before it can be used.",
  whyItBlocks: "Only approved template versions may be rendered for live events.",
  fixLabel: "Open Template Management",
  fixRoute: FIX_ROUTES.templateDesign,
  group: "event",
  severity: "high",
};

const SENDER_NOT_READY: CanonicalBlockerEntry = {
  code: "sender_not_ready",
  title: "Sender is not ready",
  explanation: "No verified sender profile is available for this channel.",
  whyItBlocks: "Emails can only be sent from a verified sender identity.",
  fixLabel: "Open Sender Profiles",
  fixRoute: FIX_ROUTES.senderProfiles,
  group: "platform",
  severity: "high",
};

const PROVIDER_NOT_READY: CanonicalBlockerEntry = {
  code: "provider_not_ready",
  title: "Email provider is not ready",
  explanation: "No active email provider is configured for the Hub.",
  whyItBlocks: "Without an active provider, the dispatcher cannot deliver messages.",
  fixLabel: "Open Provider Settings",
  fixRoute: FIX_ROUTES.providerSettings,
  group: "platform",
  severity: "critical",
};

const PREVIEW_REQUIRED: CanonicalBlockerEntry = {
  code: "preview_approval_required",
  title: "Preview approval is required",
  explanation: "This event needs a signed-off preview snapshot before any test send.",
  whyItBlocks: "Preview approval creates the audit anchor every downstream step relies on.",
  fixLabel: "Go to Preview & Approve step",
  fixRoute: FIX_ROUTES.previewStep,
  group: "test",
  severity: "medium",
};

const DRY_RUN_REQUIRED: CanonicalBlockerEntry = {
  code: "dry_run_certification_required",
  title: "Dry Test must be completed again",
  explanation: "A current DRY_RUN_PASSED certification is required before a controlled live test.",
  whyItBlocks: "The certification proves the render/dispatch path succeeded end-to-end with no provider call.",
  fixLabel: "Run the Dry Test step",
  fixRoute: FIX_ROUTES.dryRunStep,
  group: "test",
  severity: "medium",
};

const CONTROLLED_LIVE_REQUIRED: CanonicalBlockerEntry = {
  code: "controlled_live_grant_required",
  title: "Controlled Live grant is required",
  explanation: "A platform-issued Controlled Live grant is required for this attempt.",
  whyItBlocks: "Controlled Live sends are gated by a one-off grant to ensure a safe first real send.",
  fixLabel: "Go to Controlled Live step",
  fixRoute: FIX_ROUTES.controlledLiveStep,
  group: "test",
  severity: "medium",
};

const OPERATING_MODE: CanonicalBlockerEntry = {
  code: "operating_mode_denied",
  title: "Current operating mode does not permit this step",
  explanation: "The Communication Hub operating mode blocks this action.",
  whyItBlocks: "The mode determines which stages are permitted (DRY_RUN, CONTROLLED_LIVE, MANUAL_PRODUCTION).",
  fixLabel: "Open Operating Mode settings",
  fixRoute: FIX_ROUTES.operatingMode,
  group: "platform",
  severity: "high",
};

const EMERGENCY_STOP: CanonicalBlockerEntry = {
  code: "emergency_stop_active",
  title: "Communication sending is stopped",
  explanation: "Emergency Stop is active. No communication can be sent while it is engaged.",
  whyItBlocks: "Emergency Stop is a platform-wide safety switch that overrides every other setting.",
  fixLabel: "Open Emergency Stop controls",
  fixRoute: FIX_ROUTES.emergencyStop,
  group: "platform",
  severity: "critical",
};

const SEND_POLICY_DENIED: CanonicalBlockerEntry = {
  code: "send_policy_denied",
  title: "Send policy is not live",
  explanation: "The event's send policy is not approved for the requested stage.",
  whyItBlocks: "Send policy defines when this event may be sent live.",
  fixLabel: "Open Send Policies",
  fixRoute: FIX_ROUTES.sendPolicy,
  group: "event",
  severity: "high",
};

const REVIEW_POLICY_DENIED: CanonicalBlockerEntry = {
  code: "review_policy_denied",
  title: "Review approval is required",
  explanation: "The review policy requires an approver's sign-off for this event.",
  whyItBlocks: "Review policy adds a second-person check before certain events go live.",
  fixLabel: "Open Review Policies",
  fixRoute: FIX_ROUTES.reviewPolicy,
  group: "event",
  severity: "high",
};

const CATALOGUE_LIST: CanonicalBlockerEntry[] = [
  RECIPIENT_POLICY,
  TEMPLATE_NOT_MAPPED,
  TEMPLATE_NOT_APPROVED,
  SENDER_NOT_READY,
  PROVIDER_NOT_READY,
  PREVIEW_REQUIRED,
  DRY_RUN_REQUIRED,
  CONTROLLED_LIVE_REQUIRED,
  OPERATING_MODE,
  EMERGENCY_STOP,
  SEND_POLICY_DENIED,
  REVIEW_POLICY_DENIED,
];

/** Alias table — old / evaluator-specific codes that mean the same thing. */
const ALIASES: Record<string, string> = {
  // Recipient
  recipient_not_allowlisted: "recipient_policy_denied",
  recipient_domain_not_allowlisted: "recipient_policy_denied",
  recipient_not_db_allowlisted: "recipient_policy_denied",
  recipient_release_mode_invalid: "recipient_policy_denied",
  single_recipient_required: "recipient_policy_denied",
  internal_email_required: "recipient_policy_denied",
  internal_domain_required: "recipient_policy_denied",
  // Template
  template_missing: "template_not_mapped",
  no_active_template: "template_not_mapped",
  dummy_template_wording_detected: "template_not_approved",
  // Sender
  sender_not_verified: "sender_not_ready",
  sender_profile_missing: "sender_not_ready",
  // Provider
  provider_config_missing: "provider_not_ready",
  no_active_provider: "provider_not_ready",
  // Preview
  review_required: "preview_approval_required",
  preview_missing: "preview_approval_required",
  // Dry run
  dry_run_required: "dry_run_certification_required",
  // Controlled live
  controlled_live_required: "controlled_live_grant_required",
  // Operating mode
  global_dry_run_only: "operating_mode_denied",
  email_live_disabled: "operating_mode_denied",
  dispatch_disabled: "operating_mode_denied",
  live_preflight_failed: "operating_mode_denied",
  // Emergency stop
  emergency_stop_engaged: "emergency_stop_active",
  // Send / review policy
  policy_not_approved: "send_policy_denied",
  send_policy_not_live: "send_policy_denied",
};

const BY_CODE = new Map<string, CanonicalBlockerEntry>(
  CATALOGUE_LIST.map((e) => [e.code, e]),
);

/** Deterministic count of canonical entries plus recognised aliases. */
export function catalogueSize(): { canonical: number; aliases: number } {
  return { canonical: CATALOGUE_LIST.length, aliases: Object.keys(ALIASES).length };
}

export function resolveCanonicalBlocker(code: string | null | undefined): CanonicalBlockerEntry | null {
  if (!code) return null;
  const trimmed = String(code).trim();
  if (!trimmed) return null;
  const direct = BY_CODE.get(trimmed);
  if (direct) return direct;
  const aliased = ALIASES[trimmed];
  if (aliased) return BY_CODE.get(aliased) ?? null;
  return null;
}

export interface ResolvedBlocker {
  code: string;
  originalCode: string;
  title: string;
  explanation: string;
  whyItBlocks: string;
  fixLabel: string;
  fixRoute: string;
  group: BlockerGroup;
  severity: "critical" | "high" | "medium" | "low";
  isUnknown: boolean;
  serverMessage?: string;
  stage?: string;
  currentValue?: unknown;
  requiredValue?: unknown;
}

/** Safe fallback text for a blocker code that is not in the catalogue.
 *  Never uses "not yet mapped" wording — the operator gets an actionable
 *  reference-code message and the platform team can look it up. */
function unknownFallback(code: string): ResolvedBlocker {
  return {
    code,
    originalCode: code,
    title: "Readiness check could not be completed",
    explanation:
      "We could not complete this readiness check. Share the reference code with the Communication Hub administrator.",
    whyItBlocks: "The server returned a blocker we do not recognise. It is being surfaced with its reference code so it can be traced.",
    fixLabel: "Contact Hub administrator",
    fixRoute: "/admin/communication-hub",
    group: "platform",
    severity: "medium",
    isUnknown: true,
  };
}

/** Merge a server-issued blocker with the operator catalogue.
 *  Server-provided `message` / `fix_route` override defaults when present. */
export function resolveBlocker(
  input: SendDecisionBlocker | { code: string } | string,
): ResolvedBlocker {
  const raw = typeof input === "string" ? { code: input } : input;
  const originalCode = String(raw?.code ?? "");
  const entry = resolveCanonicalBlocker(originalCode);
  const serverMessage = (raw as SendDecisionBlocker)?.message?.trim();
  const serverFix = (raw as SendDecisionBlocker)?.fix_route?.trim();
  const stage = (raw as SendDecisionBlocker)?.stage;
  const currentValue = (raw as SendDecisionBlocker)?.current_value;
  const requiredValue = (raw as SendDecisionBlocker)?.required_value;

  if (!entry) {
    const fallback = unknownFallback(originalCode);
    return {
      ...fallback,
      explanation: serverMessage || fallback.explanation,
      fixRoute: serverFix || fallback.fixRoute,
      serverMessage,
      stage,
      currentValue,
      requiredValue,
    };
  }
  return {
    code: entry.code,
    originalCode,
    title: entry.title,
    explanation: entry.explanation,
    whyItBlocks: entry.whyItBlocks,
    fixLabel: entry.fixLabel,
    fixRoute: entry.fixRoute,
    group: entry.group,
    severity: entry.severity,
    isUnknown: false,
    serverMessage,
    stage,
    currentValue,
    requiredValue,
  };
}

export function resolveBlockers(
  input: Array<SendDecisionBlocker | string> | null | undefined,
): ResolvedBlocker[] {
  if (!input) return [];
  const seen = new Set<string>();
  const out: ResolvedBlocker[] = [];
  for (const b of input) {
    const resolved = resolveBlocker(b);
    if (!resolved.code) continue;
    if (seen.has(resolved.code)) continue;
    seen.add(resolved.code);
    out.push(resolved);
  }
  return out;
}

export const GROUP_LABEL: Record<BlockerGroup, string> = {
  platform: "Platform setup",
  event: "Event setup",
  test: "Current test",
};

/** Build a single "next action" sentence for the operator. Highest-severity
 *  platform blocker wins, otherwise the first canonical blocker. */
export function pickNextAction(resolved: ResolvedBlocker[]): ResolvedBlocker | null {
  if (resolved.length === 0) return null;
  const order: BlockerGroup[] = ["platform", "event", "test"];
  const rank = (s: string) =>
    s === "critical" ? 0 : s === "high" ? 1 : s === "medium" ? 2 : 3;
  const sorted = [...resolved].sort((a, b) => {
    const g = order.indexOf(a.group) - order.indexOf(b.group);
    if (g !== 0) return g;
    return rank(a.severity) - rank(b.severity);
  });
  return sorted[0];
}
