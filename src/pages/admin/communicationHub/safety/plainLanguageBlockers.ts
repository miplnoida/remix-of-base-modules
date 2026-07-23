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
  | "recipient_release_mode_invalid"
  | "single_recipient_required"
  | "internal_email_required"
  | "internal_domain_required"
  | "external_domain_phase_not_enabled"
  | "user_segment_phase_not_enabled"
  | "full_production_phase_not_enabled"
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
  controlled_live_provider_mode_inactive: {
    code: "controlled_live_provider_mode_inactive",
    headline: "Legacy Controlled Stub configuration detected",
    message: "This older path still expects an environment provider mode. Use the current Go Live Controlled Stub action.",
    fixHint: "Return to Go Live and run the Controlled Stub stage. It selects the simulator automatically.",
    fixHref: "/admin/communication-hub/go-live",
    severity: "medium",
  },
  legacy_stub_mode_required: {
    code: "legacy_stub_mode_required",
    headline: "Legacy Controlled Stub configuration detected",
    message: "The dispatcher fell back to the legacy stub path. Use the current Go Live Controlled Stub action instead.",
    fixHint: "Return to Go Live and run the Controlled Stub stage.",
    fixHref: "/admin/communication-hub/go-live",
    severity: "medium",
  },
  provider_mode_not_stub: {
    code: "provider_mode_not_stub",
    headline: "Legacy Controlled Stub configuration detected",
    message: "A legacy dispatcher path required COMM_HUB_PROVIDER_MODE=stub. Use the current Go Live Controlled Stub action instead.",
    fixHint: "Return to Go Live and run the Controlled Stub stage.",
    fixHref: "/admin/communication-hub/go-live",
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
  recipient_release_mode_invalid: {
    code: "recipient_release_mode_invalid",
    headline: "Recipient release mode is missing or invalid",
    message: "The Communication Hub could not determine which recipients are currently permitted.",
    fixHint: "Set a valid recipient release mode in the Recipient Control Center.",
    fixHref: "/admin/communication-hub/recipient-control",
    severity: "high",
  },
  single_recipient_required: {
    code: "single_recipient_required",
    headline: "Single Recipient Pilot requires exactly one address",
    message: "Only rohit@mishainfotech.com may be allowlisted and no domains are permitted in this mode.",
    fixHint: "Clear domains and keep rohit@mishainfotech.com as the sole address, or change mode.",
    fixHref: "/admin/communication-hub/recipient-control",
    severity: "high",
  },
  internal_email_required: {
    code: "internal_email_required",
    headline: "Only internal @mishainfotech.com addresses are permitted",
    message: "This recipient mode restricts individual addresses to @mishainfotech.com.",
    fixHint: "Remove non-internal addresses, or move to a mode that permits domains.",
    fixHref: "/admin/communication-hub/recipient-control",
    severity: "high",
  },
  internal_domain_required: {
    code: "internal_domain_required",
    headline: "Only the mishainfotech.com internal domain is permitted",
    message: "External domains are not allowed in this recipient mode.",
    fixHint: "Remove external domains from the allowlist.",
    fixHref: "/admin/communication-hub/recipient-control",
    severity: "high",
  },
  external_domain_phase_not_enabled: {
    code: "external_domain_phase_not_enabled",
    headline: "External domain phase is not enabled yet",
    message: "Approved External Domains is a future phase and cannot be activated.",
    fixHint: "Stay on an internal recipient mode until the external phase is enabled.",
    fixHref: "/admin/communication-hub/recipient-control",
    severity: "high",
  },
  user_segment_phase_not_enabled: {
    code: "user_segment_phase_not_enabled",
    headline: "User segments phase is not enabled yet",
    message: "Approved User Segments is a future phase and cannot be activated.",
    fixHint: "Stay on an internal recipient mode until the segments phase is enabled.",
    fixHref: "/admin/communication-hub/recipient-control",
    severity: "high",
  },
  full_production_phase_not_enabled: {
    code: "full_production_phase_not_enabled",
    headline: "Full production phase is not enabled yet",
    message: "Full Production Controlled is a future phase and cannot be activated.",
    fixHint: "Stay on an internal recipient mode until full production is enabled.",
    fixHref: "/admin/communication-hub/recipient-control",
    severity: "high",
  },
  no_assigned_user_id: { code: "no_assigned_user_id", headline: "No assigned user on this record", message: "The workflow could not resolve an internal user to notify.", fixHint: "Assign a user before triggering the notice.", severity: "high" },
  automation_disabled: { code: "automation_disabled", headline: "Automation is off for this module", message: "Communication automation is disabled for this module, so no notice was queued.", fixHint: "Enable module automation in Governance → Automation Settings.", fixHref: "/admin/communication-hub/governance/automation-settings", severity: "medium" },
  recipient_resolution_failed: { code: "recipient_resolution_failed", headline: "Recipient could not be resolved", message: "The workflow did not find an email address for the assigned party.", fixHint: "Ensure the assigned user has a valid email on their profile.", severity: "high" },
  recipient_not_internal: { code: "recipient_not_internal", headline: "Recipient is not an internal user", message: "The recipient email is not part of the internal organisation, and the current mode blocks external recipients.", fixHint: "Assign an internal user, or change recipient mode in the Control Center.", fixHref: "/admin/communication-hub/recipient-control", severity: "high" },
  duplicate_suppressed_local: { code: "duplicate_suppressed_local", headline: "Duplicate suppressed by the module", message: "The module detected that an identical notice was already sent for this assignment.", fixHint: "Wait for the duplicate window, or change the module's duplicate policy.", severity: "medium" },
  live_preflight_failed: { code: "live_preflight_failed", headline: "Live preflight failed", message: "The event's live gate (window/policy) is not currently open.", fixHint: "Open a live window or promote the send policy in Control Center.", fixHref: "/admin/communication-hub/control-center", severity: "high" },
  send_policy_denied: { code: "send_policy_denied", headline: "Send policy denied this attempt", message: "The event's send policy rejected this send.", fixHint: "Review the send policy on Governance → Send Policies.", fixHref: "/admin/communication-hub/governance/send-policies", severity: "high" },
  review_policy_denied: { code: "review_policy_denied", headline: "Review policy denied this attempt", message: "The event requires review/approval before it can be sent live.", fixHint: "Approve the pending review, or adjust the review policy.", severity: "high" },
  db_policy_guard_blocked: { code: "db_policy_guard_blocked", headline: "Database policy guard blocked the request", message: "A server-side safety guard rejected the request during creation.", fixHint: "Inspect the guard reason in the trace payload.", severity: "high" },
  request_create_failed: { code: "request_create_failed", headline: "Failed to create communication request", message: "The Communication Hub could not persist the request row.", fixHint: "Check server logs; retry the send.", severity: "critical" },
  message_create_failed: { code: "message_create_failed", headline: "Failed to create outbound message", message: "The Communication Hub created the request but could not create a message.", fixHint: "Check template resolution and channel adapter configuration.", severity: "critical" },
  target_not_found: { code: "target_not_found", headline: "Dispatcher target not found", message: "The dispatcher could not find the target message to send.", fixHint: "The message may have been cancelled or already completed.", severity: "medium" },
  target_not_queued: { code: "target_not_queued", headline: "Dispatcher target is not queued", message: "The message is not in a queued/dispatchable state.", fixHint: "Requeue the message or investigate its current status.", severity: "medium" },
  target_not_claimable: { code: "target_not_claimable", headline: "Dispatcher could not claim the target", message: "Another worker claimed the message, or it is locked.", fixHint: "This is usually transient; the dispatcher will retry.", severity: "low" },
  target_outside_live_window: { code: "target_outside_live_window", headline: "Live window expired", message: "The live window closed before the dispatcher claimed the message.", fixHint: "Open a new live window in the Control Center.", fixHref: "/admin/communication-hub/control-center", severity: "high" },
  event_live_status_not_allowed: { code: "event_live_status_not_allowed", headline: "Event live status does not permit live send", message: "The per-event live control is not set to allow live sending.", fixHint: "Update the event's live control status.", fixHref: "/admin/communication-hub/control-center", severity: "high" },
  recipient_not_db_allowlisted: { code: "recipient_not_db_allowlisted", headline: "Recipient is not in the DB allowlist", message: "The Recipient Control Center allowlist does not include this recipient (or their domain).", fixHint: "Add the recipient/domain in Recipient Control Center.", fixHref: "/admin/communication-hub/recipient-control", severity: "high" },
  provider_config_missing: { code: "provider_config_missing", headline: "No active email provider configured", message: "The dispatcher could not select an active provider for this channel.", fixHint: "Configure an active email provider in Design → Sender Profiles.", fixHref: "/admin/communication-hub/design/sender-profiles", severity: "critical" },
  provider_send_failed: { code: "provider_send_failed", headline: "Provider send failed", message: "The email provider returned an error when the dispatcher attempted to send.", fixHint: "Inspect the delivery attempt error message and provider status.", severity: "high" },
  subject_missing: { code: "subject_missing", headline: "Message subject is missing", message: "The rendered message has no subject line, so it cannot be sent.", fixHint: "Ensure the template resolves a subject for this event.", severity: "high" },
  body_missing: { code: "body_missing", headline: "Message body is missing", message: "The rendered message has no body content, so it cannot be sent.", fixHint: "Ensure the template renders content for this event.", severity: "high" },
  target_not_eligible_origin_or_channel: { code: "target_not_eligible_origin_or_channel", headline: "Message is not comm_hub email", message: "The dispatcher only handles origin='comm_hub' + channel='email' messages.", fixHint: "This message came from a legacy path; use the correct enqueue helper.", severity: "medium" },
  dispatch_invoke_failed: { code: "dispatch_invoke_failed", headline: "Dispatcher could not be invoked", message: "The upstream layer could not reach comm-hub-dispatch.", fixHint: "Check edge function health and network connectivity.", severity: "high" },

  // -------------------------------------------------------------------------
  // Phase 4B3 — Dry Run correlation-hotfix operator-facing catalogue.
  // These codes come from `inspect_comm_hub_dry_run_preflight` and
  // `begin_comm_hub_dry_run_v1`. They MUST NOT show the generic
  // "Contact Hub administrator" fallback.
  // -------------------------------------------------------------------------
  CORRELATION_ID_MISMATCH: {
    code: "CORRELATION_ID_MISMATCH",
    headline: "Approved Preview reference mismatch",
    message:
      "The Dry Run was not linked to the same correlation reference as the selected Preview and approval. No runtime records or provider calls were created.",
    fixHint: "Refresh Preview Evidence",
    fixHref: "/admin/communication-hub/control-center",
    severity: "high",
  },
  PREVIEW_CORRELATION_MISSING: {
    code: "PREVIEW_CORRELATION_MISSING",
    headline: "Preview has no correlation reference",
    message:
      "The selected Preview does not carry a correlation reference, so it cannot be paired with an approval or a Dry Run.",
    fixHint: "Refresh Preview Evidence",
    fixHref: "/admin/communication-hub/control-center",
    severity: "high",
  },
  APPROVAL_CORRELATION_MISSING: {
    code: "APPROVAL_CORRELATION_MISSING",
    headline: "Approval has no correlation reference",
    message:
      "The selected approval did not record a correlation reference at approval time, so it cannot be paired with this Preview.",
    fixHint: "Refresh Preview Evidence",
    fixHref: "/admin/communication-hub/control-center",
    severity: "high",
  },
  APPROVAL_PREVIEW_CORRELATION_MISMATCH: {
    code: "APPROVAL_PREVIEW_CORRELATION_MISMATCH",
    headline: "Approval and Preview references disagree",
    message:
      "The selected approval was captured against a different Preview correlation than the one you are trying to run. No runtime records or provider calls were created.",
    fixHint: "Refresh Preview Evidence",
    fixHref: "/admin/communication-hub/control-center",
    severity: "high",
  },
  CALLER_EXPECTED_CORRELATION_MISMATCH: {
    code: "CALLER_EXPECTED_CORRELATION_MISMATCH",
    headline: "Session expected a different Preview reference",
    message:
      "Your session was still holding a previous Preview reference. The server refused to start with an out-of-date correlation. No runtime records or provider calls were created.",
    fixHint: "Refresh Preview Evidence",
    fixHref: "/admin/communication-hub/control-center",
    severity: "high",
  },
};


export function explainBlocker(code: string | null | undefined): BlockerExplanation {
  if (!code) return DICT.unknown;
  const exact = DICT[code];
  if (exact) return exact;
  return {
    code,
    headline: "Readiness check could not be completed",
    message:
      "We could not complete this readiness check. Share the reference code with the Communication Hub administrator.",
    fixHint: `Reference code: ${code}. The platform team can trace this in the Send Decision log.`,
    fixHref: "/admin/communication-hub",
    severity: "medium",
  };
}

export function explainBlockers(codes: Array<string | null | undefined> | null | undefined): BlockerExplanation[] {
  const arr = (codes ?? []).filter((c): c is string => Boolean(c));
  const seen = new Set<string>();
  const out: BlockerExplanation[] = [];
  for (const c of arr) {
    if (seen.has(c)) continue;
    seen.add(c);
    out.push(explainBlocker(c));
  }
  return out;
}

export function allBlockerExplanations(): BlockerExplanation[] {
  return Object.values(DICT);
}

