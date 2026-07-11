/**
 * EPIC CH-SAFE-1 — Plain-language blocker dictionary.
 *
 * Maps the technical blocker codes returned by the send-policy / review-policy
 * evaluators (and the pilot runtime) to human-friendly explanations that we
 * can show admins in the Safety Switchboard, event readiness cards, and any
 * toast surfaced from a blocked send attempt.
 *
 * No runtime side-effects. Pure data + lookup helpers.
 */

export type BlockerCode =
  | "global_dry_run_only"
  | "email_live_disabled"
  | "dispatch_disabled"
  | "cron_disabled"
  | "policy_not_approved"
  | "send_policy_not_live"
  | "review_required"
  | "template_not_approved"
  | "sender_not_verified"
  | "recipient_domain_not_allowlisted"
  | "recipient_not_allowlisted"
  | "duplicate_send_blocked"
  | "dummy_template_wording_detected"
  | "automation_prepare_only"
  | "trigger_not_wired"
  | "bulk_disabled"
  | "max_recipients_exceeded"
  | "emergency_stop_engaged"
  | "typed_confirmation_required"
  | "unknown";

export interface BlockerExplanation {
  code: string;
  headline: string;
  message: string;
  fixHint: string;
  fixHref?: string;
  severity: "low" | "medium" | "high" | "critical";
}

const DICT: Record<string, BlockerExplanation> = {
  global_dry_run_only: {
    code: "global_dry_run_only",
    headline: "System is in Dry Run Only mode",
    message: "The Communication Hub is currently simulating sends. No live email leaves the system.",
    fixHint: "Turn Dry Run Only off in the Safety Switchboard when you are ready for live sending.",
    fixHref: "/admin/communication-hub/safety",
    severity: "critical",
  },
  email_live_disabled: {
    code: "email_live_disabled",
    headline: "Live email is switched off",
    message: "The email provider connection is disabled globally. All email sends are held.",
    fixHint: "Enable Live Email in the Safety Switchboard.",
    fixHref: "/admin/communication-hub/safety",
    severity: "critical",
  },
  dispatch_disabled: {
    code: "dispatch_disabled",
    headline: "Dispatcher is off",
    message: "The Communication Hub dispatcher is disabled — nothing will be processed.",
    fixHint: "Enable the dispatcher in Control Center.",
    fixHref: "/admin/communication-hub/control-center",
    severity: "critical",
  },
  cron_disabled: {
    code: "cron_disabled",
    headline: "Scheduler is off",
    message: "The scheduler / cron is not running, so queued items will not auto-drain.",
    fixHint: "Enable the Scheduler in the Safety Switchboard.",
    fixHref: "/admin/communication-hub/safety",
    severity: "high",
  },
  policy_not_approved: {
    code: "policy_not_approved",
    headline: "Event send policy is not approved",
    message: "This event's send policy has not been approved yet, so live sends are held.",
    fixHint: "Approve the policy on the Send Policies page.",
    fixHref: "/admin/communication-hub/governance/send-policies",
    severity: "high",
  },
  send_policy_not_live: {
    code: "send_policy_not_live",
    headline: "Event is in prepare-only mode",
    message: "The event is currently set to prepare_only (or manual_review), so nothing is sent automatically.",
    fixHint: "Promote the send policy to manual_live or auto_live_internal when ready.",
    fixHref: "/admin/communication-hub/governance/send-policies",
    severity: "high",
  },
  review_required: {
    code: "review_required",
    headline: "Preview / review required",
    message: "This event requires a preview or reviewer approval before it can be sent live.",
    fixHint: "Open the request and complete the preview / approval step.",
    fixHref: "/admin/communication-hub/requests",
    severity: "medium",
  },
  template_not_approved: {
    code: "template_not_approved",
    headline: "Template is not approved",
    message: "The active template version is still in draft. Live sends require an approved template.",
    fixHint: "Approve the template version in Template Management.",
    fixHref: "/admin/communication-hub/design",
    severity: "high",
  },
  sender_not_verified: {
    code: "sender_not_verified",
    headline: "Sender is not verified",
    message: "The sender profile has not been verified with the email provider (SPF/DKIM/DMARC).",
    fixHint: "Complete sender verification in Design → Sender Verification.",
    fixHref: "/admin/communication-hub/design/sender-verification",
    severity: "high",
  },
  recipient_domain_not_allowlisted: {
    code: "recipient_domain_not_allowlisted",
    headline: "Recipient domain is not allowlisted",
    message: "The recipient's email domain is not in the approved list, so the send is blocked.",
    fixHint: "Add the domain to the recipient allowlist in Control Center.",
    fixHref: "/admin/communication-hub/control-center",
    severity: "high",
  },
  recipient_not_allowlisted: {
    code: "recipient_not_allowlisted",
    headline: "Recipient address is not allowlisted",
    message: "During pilot mode, only specific addresses are allowed to receive live email.",
    fixHint: "Add the address to the allowlist in Control Center, or remove the address-level allowlist.",
    fixHref: "/admin/communication-hub/control-center",
    severity: "medium",
  },
  duplicate_send_blocked: {
    code: "duplicate_send_blocked",
    headline: "Duplicate send blocked",
    message: "A similar notice was already prepared or sent according to the event's duplicate rule.",
    fixHint: "Wait until the duplicate window elapses, or adjust the duplicate scope on the send policy.",
    fixHref: "/admin/communication-hub/governance/send-policies",
    severity: "medium",
  },
  dummy_template_wording_detected: {
    code: "dummy_template_wording_detected",
    headline: "Template contains placeholder wording",
    message: "The template appears to contain test or placeholder wording (e.g. 'Lorem ipsum', 'TEST').",
    fixHint: "Review and update the template content before enabling live sending.",
    fixHref: "/admin/communication-hub/design",
    severity: "high",
  },
  automation_prepare_only: {
    code: "automation_prepare_only",
    headline: "Module automation is in prepare-only",
    message: "The module is configured to only prepare notices, not send them.",
    fixHint: "Change automation to auto_live_internal in Automation Settings (requires typed confirmation).",
    fixHref: "/admin/communication-hub/governance/automation-settings",
    severity: "medium",
  },
  trigger_not_wired: {
    code: "trigger_not_wired",
    headline: "Business trigger is not wired",
    message: "The business event (e.g. case assignment) does not call the Communication Hub yet.",
    fixHint: "Wire the module adapter to call sendCommunication for this event.",
    fixHref: "/admin/communication-hub/onboarding/module-adapter-tests",
    severity: "high",
  },
  bulk_disabled: {
    code: "bulk_disabled",
    headline: "Bulk sending is disabled",
    message: "Batch / bulk sends are off by default to protect the platform.",
    fixHint: "Enable bulk sending in the Safety Switchboard (requires typed confirmation).",
    fixHref: "/admin/communication-hub/safety",
    severity: "high",
  },
  max_recipients_exceeded: {
    code: "max_recipients_exceeded",
    headline: "Too many recipients",
    message: "This send has more recipients than the configured cap.",
    fixHint: "Reduce recipients, or increase the cap in the Safety Switchboard (requires typed confirmation).",
    fixHref: "/admin/communication-hub/safety",
    severity: "medium",
  },
  emergency_stop_engaged: {
    code: "emergency_stop_engaged",
    headline: "Emergency stop is engaged",
    message: "Dispatcher, live email and scheduler are all off. Nothing will send.",
    fixHint: "Disengage Emergency Stop from the Safety Switchboard when the incident is resolved.",
    fixHref: "/admin/communication-hub/safety",
    severity: "critical",
  },
  typed_confirmation_required: {
    code: "typed_confirmation_required",
    headline: "Typed confirmation required",
    message: "This action requires the exact confirmation phrase before it can proceed.",
    fixHint: "Type the confirmation phrase shown in the dialog and press Confirm.",
    severity: "medium",
  },
  unknown: {
    code: "unknown",
    headline: "Send blocked",
    message: "The send was blocked by a Communication Hub safety gate.",
    fixHint: "Open the Safety Switchboard to see which gate is blocking the send.",
    fixHref: "/admin/communication-hub/safety",
    severity: "medium",
  },
};

export function explainBlocker(code: string | null | undefined): BlockerExplanation {
  if (!code) return DICT.unknown;
  return DICT[code] ?? { ...DICT.unknown, code };
}

export function allBlockerExplanations(): BlockerExplanation[] {
  return Object.values(DICT);
}
