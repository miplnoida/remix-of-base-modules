/**
 * Communication Hub Control Center — operational visibility service.
 *
 * READ-ONLY. Never enqueues, dispatches, or sends. Fetches operational
 * status for the Operational Panel introduced in Phase 1C-B7-D.
 *
 * Env hard-gate values (COMMUNICATION_HUB_*) are NEVER exposed to the
 * browser, so this layer returns "unknown" for them.
 */
import { supabase } from "@/integrations/supabase/client";
import { sanitizeProviderResponse } from "../utils/mask";

export interface CronStatus {
  exists: boolean;
  jobid?: number;
  jobname?: string;
  schedule?: string;
  active?: boolean;
  recent_runs?: Array<{
    runid: number;
    status: string;
    return_message: string;
    start_time: string;
    end_time: string | null;
  }>;
}

export interface SafetyCounts {
  queued_test: number;
  queued_live: number;
  sending: number;
  stale_locks: number;
  failed_24h: number;
  suppressed_24h: number;
  accidental_live_sends_24h: number;
  legacy_notification_queue_window: number;
  legacy_notification_logs_window: number;
  window_minutes: number;
}

export interface RecentMessageRow {
  id: string;
  request_id: string;
  request_no: string | null;
  channel: string;
  test_mode: boolean;
  status: string;
  attempt_count: number;
  sent_at: string | null;
  next_attempt_at: string | null;
  provider_message_id: string | null;
  error_code: string | null;
  created_at: string;
  delivery_status: string | null;
  delivered_at: string | null;
  bounced_at: string | null;
  complained_at: string | null;
  delivery_last_event_at: string | null;
  delivery_last_event_type: string | null;
}


export interface RecentAttemptRow {
  id: string;
  message_id: string;
  attempt_no: number;
  status: string;
  provider_id: string | null;
  provider_message_id: string | null;
  error_code: string | null;
  started_at: string;
  finished_at: string | null;
  provider_response: unknown;
}

export async function fetchCronStatus(): Promise<CronStatus> {
  const { data, error } = await (supabase as any).rpc("get_comm_hub_cron_status");
  if (error) throw error;
  return data as CronStatus;
}

export async function fetchSafetyCounts(windowMinutes = 1440): Promise<SafetyCounts> {
  const { data, error } = await (supabase as any).rpc("get_comm_hub_safety_counts", {
    window_minutes: windowMinutes,
  });
  if (error) throw error;
  return data as SafetyCounts;
}

export async function fetchRecentMessages(params: {
  status?: string;
  testMode?: "all" | "true" | "false";
  channel?: string;
  windowMinutes?: number;
  limit?: number;
}): Promise<RecentMessageRow[]> {
  const windowMinutes = params.windowMinutes ?? 1440;
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  let q = (supabase as any)
    .from("communication_message")
    .select("id, request_id, channel, test_mode, status, attempt_count, sent_at, next_attempt_at, provider_message_id, error_code, created_at, delivery_status, delivered_at, bounced_at, complained_at, delivery_last_event_at, delivery_last_event_type")
    .gte("created_at", since)
    .order("created_at", { ascending: false })

    .limit(params.limit ?? 20);
  if (params.status && params.status !== "all") q = q.eq("status", params.status);
  if (params.channel && params.channel !== "all") q = q.eq("channel", params.channel);
  if (params.testMode === "true") q = q.eq("test_mode", true);
  else if (params.testMode === "false") q = q.eq("test_mode", false);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as any[];
  const reqIds = Array.from(new Set(rows.map(r => r.request_id).filter(Boolean)));
  let reqMap: Record<string, string> = {};
  if (reqIds.length > 0) {
    const { data: reqs } = await (supabase as any)
      .from("communication_request")
      .select("id, request_no")
      .in("id", reqIds);
    (reqs ?? []).forEach((r: any) => { reqMap[r.id] = r.request_no; });
  }
  return rows.map(r => ({ ...r, request_no: reqMap[r.request_id] ?? null }));
}

export async function fetchRecentAttempts(limit = 20): Promise<RecentAttemptRow[]> {
  const { data, error } = await (supabase as any)
    .from("communication_delivery_attempt")
    .select("id, message_id, attempt_no, status, provider_id, provider_message_id, error_code, started_at, finished_at, provider_response")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as any[]).map(r => ({
    ...r,
    provider_response: sanitizeProviderResponse(r.provider_response),
  }));
}

export interface LiveWindowStatus {
  live_eligible_after: string | null;
  live_eligible_max_age_minutes: number;
  db_dispatch_enabled: boolean;
  db_dry_run_only: boolean;
  db_email_live_enabled: boolean;
  queued_live_inside_window: number;
  queued_live_outside_window: number;
  outside_window_preview: Array<{
    id: string;
    request_no: string | null;
    created_at: string;
    status: string;
    test_mode: boolean;
    subject: string | null;
    recipient_masked: string | null;
    reason: string;
  }>;
  generated_at: string;
}

export async function fetchLiveWindowStatus(): Promise<LiveWindowStatus> {
  const { data, error } = await (supabase as any).rpc("get_comm_hub_live_window_status");
  if (error) throw error;
  return data as LiveWindowStatus;
}


export interface DeliveryWebhookSummary {
  window_minutes: number;
  events_total: number;
  by_type: Record<string, number>;
  last_event_at: string | null;
  sent_no_webhook_24h: number;
}

/**
 * Read-only summary of Resend delivery webhook activity for the ops panel.
 * Uses only the admin-readable communication_hub_delivery_event table.
 */
export async function fetchDeliveryWebhookSummary(windowMinutes = 1440): Promise<DeliveryWebhookSummary> {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { data: events, error } = await (supabase as any)
    .from("communication_hub_delivery_event")
    .select("event_type, occurred_at")
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  const rows = (events ?? []) as Array<{ event_type: string; occurred_at: string }>;
  const by_type: Record<string, number> = {};
  for (const r of rows) by_type[r.event_type] = (by_type[r.event_type] ?? 0) + 1;

  // Live email messages sent in the last 24h with no webhook update yet.
  const sinceDay = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const { count: sentNoWebhook } = await (supabase as any)
    .from("communication_message")
    .select("id", { count: "exact", head: true })
    .eq("channel", "email")
    .eq("test_mode", false)
    .eq("status", "sent")
    .is("delivery_last_event_at", null)
    .gte("sent_at", sinceDay);

  return {
    window_minutes: windowMinutes,
    events_total: rows.length,
    by_type,
    last_event_at: rows[0]?.occurred_at ?? null,
    sent_no_webhook_24h: sentNoWebhook ?? 0,
  };
}

/** Truncate provider message id for display (never a secret, but keeps rows compact). */
export function truncPmid(v: string | null | undefined): string {
  if (!v) return "—";
  if (v.length <= 14) return v;
  return `${v.slice(0, 10)}…`;
}

