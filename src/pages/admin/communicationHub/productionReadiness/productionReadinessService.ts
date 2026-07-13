/**
 * EPIC PROD-1 — Production Readiness Command Center service.
 *
 * READ-ONLY aggregator. Composes existing Communication Hub services and
 * queries into a single readiness snapshot. Never sends email, never
 * mutates gates, policies, senders, recipients or automation. Never reads
 * or exposes edge-function secrets — runtime env is reported as
 * "needs runtime verification".
 */
import { supabase } from "@/integrations/supabase/client";
import { fetchControlSettings, type CommHubControlSettings } from "../controlCenter/controlCenterService";
import {
  fetchCronStatus,
  fetchSafetyCounts,
  fetchDeliveryWebhookSummary,
  type CronStatus,
  type SafetyCounts,
  type DeliveryWebhookSummary,
} from "../controlCenter/operationalService";
import {
  fetchRecipientSettings,
  getStage,
  type RecipientReleaseSettings,
  type RecipientReleaseModeStage,
} from "../recipientControl/recipientControlService";
import { loadAllEventsReadiness, type ReadinessRow } from "../liveReadiness/allEventsLiveReadinessService";

export type CategoryStatus = "pass" | "warning" | "blocked" | "unknown";
export type OverallStatus =
  | "not_ready"
  | "ready_dry_run"
  | "ready_internal_live_test"
  | "ready_wider_rollout";

export interface SenderReadiness {
  total: number;
  enabled: number;
  disabled: number;
  domain_verified: number;
  provider_verified: number;
  pending: number;
  usable: number; // enabled AND domain_verified AND provider verified
}

export interface Blocker {
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  code: string;
  message: string;
  fix_href?: string;
  fix_label?: string;
}

export interface ReadinessSnapshot {
  generated_at: string;

  // raw sources
  control_settings: CommHubControlSettings;
  recipient: RecipientReleaseSettings;
  recipient_stage: RecipientReleaseModeStage;
  cron: CronStatus;
  safety: SafetyCounts;
  delivery: DeliveryWebhookSummary;
  events: ReadinessRow[];
  senders: SenderReadiness;

  // per-category
  categories: Record<
    | "db_gates"
    | "runtime"
    | "senders"
    | "templates"
    | "policies"
    | "recipients"
    | "events"
    | "dispatcher"
    | "delivery",
    { status: CategoryStatus; facts: string[] }
  >;

  // rollup
  event_stats: {
    total: number;
    eligible: number;
    live_manual: number;
    blocked: number;
    high_risk: number;
    missing_template: number;
    missing_sender: number;
    missing_send_policy: number;
    missing_review_policy: number;
  };

  blockers: Blocker[];
  overall: OverallStatus;
  overall_reason: string;
  next_action: { label: string; href?: string; detail: string };
}

async function fetchSenderReadiness(): Promise<SenderReadiness> {
  const { data, error } = await (supabase as any)
    .from("communication_hub_sender_profile")
    .select("id, is_enabled, domain_verified, provider_identity_status");
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    is_enabled: boolean | null;
    domain_verified: boolean | null;
    provider_identity_status: string | null;
  }>;
  const enabled = rows.filter((r) => !!r.is_enabled).length;
  const domain = rows.filter((r) => !!r.domain_verified).length;
  const providerVerified = rows.filter((r) => r.provider_identity_status === "verified").length;
  const usable = rows.filter(
    (r) => !!r.is_enabled && !!r.domain_verified && r.provider_identity_status === "verified",
  ).length;
  return {
    total: rows.length,
    enabled,
    disabled: rows.length - enabled,
    domain_verified: domain,
    provider_verified: providerVerified,
    pending: rows.length - providerVerified,
    usable,
  };
}

export async function loadReadinessSnapshot(): Promise<ReadinessSnapshot> {
  const [control, recipient, cron, safety, delivery, events, senders] = await Promise.all([
    fetchControlSettings(),
    fetchRecipientSettings(),
    fetchCronStatus().catch<CronStatus>(() => ({ exists: false })),
    fetchSafetyCounts().catch<SafetyCounts>(() => ({
      queued_test: 0, queued_live: 0, sending: 0, stale_locks: 0,
      failed_24h: 0, suppressed_24h: 0, accidental_live_sends_24h: 0,
      legacy_notification_queue_window: 0, legacy_notification_logs_window: 0,
      window_minutes: 1440,
    })),
    fetchDeliveryWebhookSummary().catch<DeliveryWebhookSummary>(() => ({
      window_minutes: 1440, events_total: 0, by_type: {}, last_event_at: null, sent_no_webhook_24h: 0,
    })),
    loadAllEventsReadiness().catch<ReadinessRow[]>(() => []),
    fetchSenderReadiness().catch<SenderReadiness>(() => ({
      total: 0, enabled: 0, disabled: 0, domain_verified: 0, provider_verified: 0, pending: 0, usable: 0,
    })),
  ]);

  const recipientStage = getStage(recipient.recipient_release_mode);

  const event_stats = {
    total: events.length,
    eligible: events.filter((e) => e.eligible).length,
    live_manual: events.filter((e) => e.live_control_status === "live_manual_only").length,
    blocked: events.filter((e) => !e.eligible).length,
    high_risk: events.filter((e) => e.is_high_risk).length,
    missing_template: events.filter((e) => !e.template_mapped || !e.template_version_ok).length,
    missing_sender: events.filter((e) => !e.sender_mapped || !e.sender_enabled).length,
    missing_send_policy: events.filter((e) => !e.send_policy_exists || !e.send_policy_approved).length,
    missing_review_policy: events.filter((e) => !e.review_policy_exists).length,
  };

  const blockers: Blocker[] = [];

  // DB gates
  const dbFacts: string[] = [
    `Dispatch enabled: ${control.dispatch_enabled ? "yes" : "no"}`,
    `Email live: ${control.email_live_enabled ? "yes" : "no"}`,
    `Dry-run only: ${control.dry_run_only ? "yes" : "no"}`,
    `Allowlist: ${control.allowed_email_addresses.length} address(es), ${control.allowed_email_domains.length} domain(s)`,
  ];
  let dbStatus: CategoryStatus = "pass";
  if (!control.dispatch_enabled) {
    dbStatus = "blocked";
    blockers.push({
      category: "DB gates", severity: "critical", code: "dispatch_disabled",
      message: "Master dispatch is disabled — no send path can run.",
      fix_href: "/admin/communication-hub/control-center", fix_label: "Open Control Center",
    });
  }
  if (control.dry_run_only) {
    dbStatus = dbStatus === "blocked" ? "blocked" : "warning";
    blockers.push({
      category: "DB gates", severity: "high", code: "dry_run_only",
      message: "Dry-run-only is active — live send is blocked at the DB gate.",
      fix_href: "/admin/communication-hub/control-center", fix_label: "Open Control Center",
    });
  }
  if (!control.email_live_enabled) {
    dbStatus = dbStatus === "blocked" ? "blocked" : "warning";
    blockers.push({
      category: "DB gates", severity: "high", code: "email_live_disabled",
      message: "Email live channel is disabled at the DB gate.",
      fix_href: "/admin/communication-hub/control-center", fix_label: "Open Control Center",
    });
  }
  if (control.allowed_email_addresses.length === 0 && control.allowed_email_domains.length === 0) {
    dbStatus = "blocked";
    blockers.push({
      category: "Recipients", severity: "critical", code: "no_allowlist",
      message: "No allowed addresses or domains configured — every live send would be suppressed.",
      fix_href: "/admin/communication-hub/recipient-control", fix_label: "Recipient Control",
    });
  }

  // Runtime — always unknown from browser
  const runtimeFacts = [
    "COMMUNICATION_HUB_DISPATCH_ENABLED, COMMUNICATION_HUB_EMAIL_LIVE, and provider secrets are enforced by the dispatcher edge function.",
    "Runtime values cannot be read from the browser.",
    "Verify via a controlled internal live test in Test & Diagnostics.",
  ];
  blockers.push({
    category: "Runtime", severity: "medium", code: "runtime_unknown",
    message: "Runtime environment variables and provider secrets must be verified via a controlled dispatcher call.",
    fix_href: "/admin/communication-hub/test-diagnostics", fix_label: "Test & Diagnostics",
  });

  // Senders
  const senderFacts = [
    `Total sender profiles: ${senders.total}`,
    `Enabled: ${senders.enabled} · Disabled: ${senders.disabled}`,
    `Domain verified: ${senders.domain_verified} · Provider verified: ${senders.provider_verified}`,
    `Usable for live: ${senders.usable}`,
  ];
  let senderStatus: CategoryStatus = "pass";
  if (senders.total === 0) {
    senderStatus = "blocked";
    blockers.push({
      category: "Senders", severity: "critical", code: "no_sender_profiles",
      message: "No sender profiles exist.",
      fix_href: "/admin/communication-hub/design/sender-profiles", fix_label: "Sender Profiles",
    });
  } else if (senders.usable === 0) {
    senderStatus = "blocked";
    blockers.push({
      category: "Senders", severity: "critical", code: "no_verified_sender",
      message: "No sender profile is both enabled AND verified (domain/provider).",
      fix_href: "/admin/communication-hub/design/sender-verification", fix_label: "Sender Verification",
    });
  } else if (senders.usable < senders.total) {
    senderStatus = "warning";
  }

  // Templates
  let templateStatus: CategoryStatus = "pass";
  const templateFacts = [
    `Mapped events: ${event_stats.total}`,
    `Missing template / unapproved version: ${event_stats.missing_template}`,
  ];
  if (event_stats.total === 0) {
    templateStatus = "blocked";
    blockers.push({
      category: "Templates", severity: "critical", code: "no_event_mappings",
      message: "No event → template mappings exist.",
      fix_href: "/admin/communication-hub/design", fix_label: "Event → Template mapping",
    });
  } else if (event_stats.missing_template > 0) {
    templateStatus = "warning";
    blockers.push({
      category: "Templates", severity: "medium", code: "templates_incomplete",
      message: `${event_stats.missing_template} event(s) have a missing template or unapproved version.`,
      fix_href: "/admin/communication-hub/design", fix_label: "Event → Template mapping",
    });
  }

  // Policies
  let policyStatus: CategoryStatus = "pass";
  const policyFacts = [
    `Send policy approved: ${event_stats.total - event_stats.missing_send_policy}/${event_stats.total}`,
    `Missing / unapproved send policy: ${event_stats.missing_send_policy}`,
    `Missing review policy: ${event_stats.missing_review_policy}`,
  ];
  if (event_stats.total > 0 && event_stats.missing_send_policy === event_stats.total) {
    policyStatus = "blocked";
    blockers.push({
      category: "Policies", severity: "critical", code: "no_send_policy",
      message: "No event has an approved send policy.",
      fix_href: "/admin/communication-hub/governance/send-policies", fix_label: "Send Policies",
    });
  } else if (event_stats.missing_send_policy > 0) {
    policyStatus = "warning";
    blockers.push({
      category: "Policies", severity: "medium", code: "send_policy_incomplete",
      message: `${event_stats.missing_send_policy} event(s) are missing an approved send policy.`,
      fix_href: "/admin/communication-hub/governance/send-policies", fix_label: "Send Policies",
    });
  }

  // Recipients
  const recipientFacts = [
    `Release mode: ${recipientStage.label}`,
    `Allowed addresses: ${control.allowed_email_addresses.length}`,
    `Allowed domains: ${control.allowed_email_domains.length}`,
    `Posture: ${recipientStage.shortLabel}`,
  ];
  const recipientStatus: CategoryStatus =
    control.allowed_email_addresses.length + control.allowed_email_domains.length === 0
      ? "blocked"
      : recipientStage.locked
        ? "warning"
        : "pass";

  // Events
  const eventFacts = [
    `Total: ${event_stats.total} · Eligible: ${event_stats.eligible}`,
    `Live-manual: ${event_stats.live_manual} · Blocked: ${event_stats.blocked}`,
    `High-risk: ${event_stats.high_risk}`,
  ];
  let eventsStatus: CategoryStatus;
  if (event_stats.total === 0) eventsStatus = "unknown";
  else if (event_stats.eligible === 0) eventsStatus = "blocked";
  else if (event_stats.live_manual === 0) eventsStatus = "warning";
  else eventsStatus = "pass";
  if (event_stats.total > 0 && event_stats.eligible === 0) {
    blockers.push({
      category: "Events", severity: "critical", code: "no_eligible_event",
      message: "No event is eligible for controlled live promotion.",
      fix_href: "/admin/communication-hub/live-readiness/all-events", fix_label: "All Events Live Readiness",
    });
  }

  // Dispatcher / cron
  const dispatcherFacts = [
    `Cron exists: ${cron.exists ? "yes" : "no"}${cron.active === undefined ? "" : ` · active: ${cron.active ? "yes" : "no"}`}`,
    `Queued test: ${safety.queued_test} · Queued live: ${safety.queued_live}`,
    `Stale locks: ${safety.stale_locks} · Failed 24h: ${safety.failed_24h}`,
    `Accidental live sends 24h: ${safety.accidental_live_sends_24h}`,
  ];
  let dispatcherStatus: CategoryStatus = "pass";
  if (safety.stale_locks > 0) {
    dispatcherStatus = "blocked";
    blockers.push({
      category: "Dispatcher", severity: "critical", code: "stale_locks",
      message: `${safety.stale_locks} stale lock(s) detected — dispatcher may be wedged.`,
      fix_href: "/admin/communication-hub/control-center", fix_label: "Control Center",
    });
  }
  if (safety.accidental_live_sends_24h > 0) {
    dispatcherStatus = "blocked";
    blockers.push({
      category: "Dispatcher", severity: "critical", code: "accidental_live",
      message: `${safety.accidental_live_sends_24h} accidental live send(s) recorded in the last 24h.`,
      fix_href: "/admin/communication-hub/traces", fix_label: "Trace Center",
    });
  }
  if (safety.failed_24h > 0 && dispatcherStatus !== "blocked") {
    dispatcherStatus = "warning";
  }

  // Delivery / webhooks
  const deliveryFacts = [
    `Delivery events (${delivery.window_minutes}m): ${delivery.events_total}`,
    `Last event: ${delivery.last_event_at ?? "—"}`,
    `Sent w/o webhook 24h: ${delivery.sent_no_webhook_24h}`,
  ];
  let deliveryStatus: CategoryStatus;
  if (delivery.last_event_at) deliveryStatus = "pass";
  else if (delivery.events_total === 0) deliveryStatus = "unknown";
  else deliveryStatus = "warning";
  if (delivery.sent_no_webhook_24h > 0) {
    blockers.push({
      category: "Delivery", severity: "medium", code: "no_webhook_events",
      message: `${delivery.sent_no_webhook_24h} live email(s) sent in the last 24h with no webhook confirmation.`,
      fix_href: "/admin/communication-hub/delivery-monitor", fix_label: "Delivery Monitor",
    });
  }

  const categories: ReadinessSnapshot["categories"] = {
    db_gates:   { status: dbStatus,         facts: dbFacts },
    runtime:    { status: "unknown",        facts: runtimeFacts },
    senders:    { status: senderStatus,     facts: senderFacts },
    templates:  { status: templateStatus,   facts: templateFacts },
    policies:   { status: policyStatus,     facts: policyFacts },
    recipients: { status: recipientStatus,  facts: recipientFacts },
    events:     { status: eventsStatus,     facts: eventFacts },
    dispatcher: { status: dispatcherStatus, facts: dispatcherFacts },
    delivery:   { status: deliveryStatus,   facts: deliveryFacts },
  };

  // Overall scoring
  const anyBlocked = Object.values(categories).some((c) => c.status === "blocked");
  const criticalReady =
    !anyBlocked &&
    control.dispatch_enabled &&
    senders.usable > 0 &&
    event_stats.eligible > 0 &&
    event_stats.live_manual > 0 &&
    safety.stale_locks === 0 &&
    safety.accidental_live_sends_24h === 0 &&
    (control.allowed_email_addresses.length + control.allowed_email_domains.length) > 0;

  let overall: OverallStatus;
  let overall_reason: string;
  let next_action: ReadinessSnapshot["next_action"];

  if (anyBlocked) {
    overall = "not_ready";
    const first = blockers.find((b) => b.severity === "critical") ?? blockers[0];
    overall_reason = first ? `Blocked: ${first.message}` : "One or more critical checks are blocked.";
    next_action = {
      label: first?.fix_label ?? "Review blockers",
      href: first?.fix_href,
      detail: first?.message ?? "Resolve the blockers listed below.",
    };
  } else if (!criticalReady) {
    overall = "ready_dry_run";
    overall_reason = "Configuration is coherent enough to run dry-run tests; not yet cleared for controlled live.";
    next_action = {
      label: "Run dry-run test",
      href: "/admin/communication-hub/test-diagnostics",
      detail: "Use Test & Diagnostics dry-run to exercise the send path without producing live email.",
    };
  } else {
    overall = "ready_internal_live_test";
    overall_reason = "All critical gates pass. Runtime env still requires a controlled verification send.";
    next_action = {
      label: "Run controlled internal live test",
      href: "/admin/communication-hub/test-diagnostics",
      detail: "Send one controlled internal live message from Test & Diagnostics and confirm webhook delivery.",
    };
  }

  return {
    generated_at: new Date().toISOString(),
    control_settings: control,
    recipient,
    recipient_stage: recipientStage,
    cron,
    safety,
    delivery,
    events,
    senders,
    categories,
    event_stats,
    blockers,
    overall,
    overall_reason,
    next_action,
  };
}

export function buildReadinessMarkdown(s: ReadinessSnapshot): string {
  const catLine = (name: string, key: keyof ReadinessSnapshot["categories"]) =>
    `- ${name}: **${s.categories[key].status.toUpperCase()}**`;
  const lines: string[] = [
    `# Communication Hub — Production Readiness`,
    ``,
    `Generated: ${s.generated_at}`,
    `Overall status: **${s.overall.replace(/_/g, " ")}**`,
    `Reason: ${s.overall_reason}`,
    ``,
    `## Categories`,
    catLine("DB Control Gates", "db_gates"),
    catLine("Runtime Environment", "runtime"),
    catLine("Senders", "senders"),
    catLine("Templates", "templates"),
    catLine("Policies", "policies"),
    catLine("Recipients", "recipients"),
    catLine("Event Live Control", "events"),
    catLine("Dispatcher / Cron", "dispatcher"),
    catLine("Delivery / Webhook", "delivery"),
    ``,
    `## Events`,
    `- Total: ${s.event_stats.total}`,
    `- Eligible: ${s.event_stats.eligible}`,
    `- Live-manual: ${s.event_stats.live_manual}`,
    `- Blocked: ${s.event_stats.blocked}`,
    `- High-risk: ${s.event_stats.high_risk}`,
    ``,
    `## Blockers (${s.blockers.length})`,
    ...s.blockers.map((b) => `- [${b.severity}] ${b.category} · ${b.code} — ${b.message}`),
    ``,
    `## Next recommended action`,
    `- ${s.next_action.label}${s.next_action.href ? ` (${s.next_action.href})` : ""}`,
    `  ${s.next_action.detail}`,
    ``,
  ];
  return lines.join("\n");
}
