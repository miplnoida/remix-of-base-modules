/**
 * EPIC 2B — Read-only operations service for the Communication Hub
 * consoles (Delivery Monitor, Lifecycle Log, Dispatch Register,
 * Failed & Retry Queue, Print Queue).
 *
 * All queries are read-only, never touch provider secrets, and rely on
 * existing RLS on communication_* tables. Results are sanitized before
 * they reach the UI via mask helpers in ./mask.
 */
import { supabase } from "@/integrations/supabase/client";

const db: any = supabase;

export interface DeliveryMonitorRow {
  message_id: string;
  request_id: string;
  request_no: string;
  module_code: string;
  event_code: string;
  entity_type: string | null;
  entity_id: string | null;
  reference_no: string | null;
  channel: string;
  test_mode: boolean;
  message_status: string;
  provider_message_id: string | null;
  attempt_count: number | null;
  sent_at: string | null;
  delivered_at: string | null;
  bounced_at: string | null;
  complained_at: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  recipient_name: string | null;
  delivery_last_event_type: string | null;
  delivery_last_event_at: string | null;
  error_code: string | null;
  error_message: string | null;
  locked_at: string | null;
  locked_by: string | null;
  next_attempt_at: string | null;
  created_at: string;
  from_email: string | null;
  from_display_name: string | null;
  reply_to_email: string | null;
  sender_profile_id: string | null;
}


export interface DeliveryFilter {
  moduleCode?: string;
  eventCode?: string;
  channel?: string;
  testMode?: "all" | "test" | "live";
  status?: string;
  requestNo?: string;
  createdFrom?: string;
  createdTo?: string;
  limit?: number;
}

async function fetchRequestsIndex(requestIds: string[]) {
  if (!requestIds.length) return {};
  const { data, error } = await db
    .from("communication_request")
    .select("id, request_no, module_code, event_code, entity_type, entity_id, reference_no, requested_by, status, created_at")
    .in("id", requestIds);
  if (error) throw error;
  const map: Record<string, any> = {};
  for (const r of data ?? []) map[r.id] = r;
  return map;
}

async function fetchRecipientsIndex(recipientIds: string[]) {
  if (!recipientIds.length) return {};
  const { data, error } = await db
    .from("communication_recipient")
    .select("id, email, phone, name")
    .in("id", recipientIds);
  if (error) throw error;
  const map: Record<string, any> = {};
  for (const r of data ?? []) map[r.id] = r;
  return map;
}

async function fetchLastDeliveryEvents(messageIds: string[]) {
  if (!messageIds.length) return {};
  const { data, error } = await db
    .from("communication_hub_delivery_event")
    .select("message_id, event_type, occurred_at")
    .in("message_id", messageIds)
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  const map: Record<string, { event_type: string; occurred_at: string }> = {};
  for (const e of data ?? []) if (!map[e.message_id]) map[e.message_id] = { event_type: e.event_type, occurred_at: e.occurred_at };
  return map;
}

export async function listDeliveryMonitor(opts: DeliveryFilter = {}): Promise<DeliveryMonitorRow[]> {
  let q = db.from("communication_message")
    .select("id, request_id, recipient_id, channel, test_mode, status, provider_message_id, attempt_count, sent_at, delivered_at, bounced_at, complained_at, error_code, error_message, locked_at, locked_by, next_attempt_at, created_at, from_email, from_display_name, reply_to_email, sender_profile_id")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.channel && opts.channel !== "all") q = q.eq("channel", opts.channel);
  if (opts.status && opts.status !== "all") q = q.eq("status", opts.status);
  if (opts.testMode === "test") q = q.eq("test_mode", true);
  if (opts.testMode === "live") q = q.eq("test_mode", false);
  if (opts.createdFrom) q = q.gte("created_at", opts.createdFrom);
  if (opts.createdTo) q = q.lte("created_at", opts.createdTo);
  const { data: msgs, error } = await q;
  if (error) throw error;
  const messages = (msgs ?? []) as any[];
  const reqIdx = await fetchRequestsIndex([...new Set(messages.map(m => m.request_id))]);
  // Filter by module/event/requestNo after join since those live on request.
  const filtered = messages.filter(m => {
    const r = reqIdx[m.request_id];
    if (!r) return false;
    if (opts.moduleCode && r.module_code !== opts.moduleCode) return false;
    if (opts.eventCode && r.event_code !== opts.eventCode) return false;
    if (opts.requestNo && !r.request_no?.toLowerCase().includes(opts.requestNo.toLowerCase())) return false;
    return true;
  });
  const recIdx = await fetchRecipientsIndex([...new Set(filtered.map(m => m.recipient_id).filter(Boolean))]);
  const evIdx = await fetchLastDeliveryEvents(filtered.map(m => m.id));
  return filtered.map(m => {
    const r = reqIdx[m.request_id] ?? {};
    const rec = recIdx[m.recipient_id] ?? {};
    const ev = evIdx[m.id];
    return {
      message_id: m.id,
      request_id: m.request_id,
      request_no: r.request_no ?? "—",
      module_code: r.module_code ?? "—",
      event_code: r.event_code ?? "—",
      entity_type: r.entity_type ?? null,
      entity_id: r.entity_id ?? null,
      reference_no: r.reference_no ?? null,
      channel: m.channel,
      test_mode: m.test_mode,

      message_status: m.status,
      provider_message_id: m.provider_message_id,
      attempt_count: m.attempt_count,
      sent_at: m.sent_at,
      delivered_at: m.delivered_at,
      bounced_at: m.bounced_at,
      complained_at: m.complained_at,
      recipient_email: rec.email ?? null,
      recipient_phone: rec.phone ?? null,
      recipient_name: rec.name ?? null,
      delivery_last_event_type: ev?.event_type ?? null,
      delivery_last_event_at: ev?.occurred_at ?? null,
      error_code: m.error_code,
      error_message: m.error_message,
      locked_at: m.locked_at,
      locked_by: m.locked_by,
      next_attempt_at: m.next_attempt_at,
      created_at: m.created_at,
      from_email: m.from_email ?? null,
      from_display_name: m.from_display_name ?? null,
      reply_to_email: m.reply_to_email ?? null,
      sender_profile_id: m.sender_profile_id ?? null,
    };
  });
}

export interface LifecycleEventRow {
  id: string;
  occurred_at: string;
  request_id: string | null;
  message_id: string | null;
  request_no: string | null;
  module_code: string | null;
  event_code: string | null;
  event_type: string;
  stage: string | null;
  source: string | null;
  actor_user_id: string | null;
  payload: Record<string, unknown> | null;
}

export interface LifecycleFilter {
  requestNo?: string;
  moduleCode?: string;
  eventCode?: string;
  eventType?: string;
  stage?: string;
  source?: string;
  messageId?: string;
  createdFrom?: string;
  createdTo?: string;
  limit?: number;
}

export async function listLifecycleEvents(opts: LifecycleFilter = {}): Promise<LifecycleEventRow[]> {
  let q = db.from("communication_event_log")
    .select("id, occurred_at, request_id, message_id, event_type, source, payload, actor_user_id")
    .order("occurred_at", { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.eventType) q = q.eq("event_type", opts.eventType);
  if (opts.source) q = q.eq("source", opts.source);
  if (opts.messageId) q = q.eq("message_id", opts.messageId);
  if (opts.createdFrom) q = q.gte("occurred_at", opts.createdFrom);
  if (opts.createdTo) q = q.lte("occurred_at", opts.createdTo);
  const { data, error } = await q;
  if (error) throw error;
  const events = (data ?? []) as any[];
  const reqIdx = await fetchRequestsIndex([...new Set(events.map(e => e.request_id).filter(Boolean))]);
  return events
    .map(e => {
      const r = e.request_id ? reqIdx[e.request_id] : null;
      const stage = (e.payload && typeof e.payload === "object" && "stage" in e.payload) ? String((e.payload as any).stage) : null;
      return {
        id: e.id,
        occurred_at: e.occurred_at,
        request_id: e.request_id,
        message_id: e.message_id,
        request_no: r?.request_no ?? null,
        module_code: r?.module_code ?? null,
        event_code: r?.event_code ?? null,
        event_type: e.event_type,
        stage,
        source: e.source,
        actor_user_id: e.actor_user_id,
        payload: e.payload ?? null,
      } as LifecycleEventRow;
    })
    .filter(row => {
      if (opts.requestNo && !row.request_no?.toLowerCase().includes(opts.requestNo.toLowerCase())) return false;
      if (opts.moduleCode && row.module_code !== opts.moduleCode) return false;
      if (opts.eventCode && row.event_code !== opts.eventCode) return false;
      if (opts.stage && row.stage !== opts.stage) return false;
      return true;
    });
}

export interface DispatchRegisterRow {
  request_id: string;
  request_no: string;
  module_code: string;
  event_code: string;
  entity_type: string | null;
  entity_id: string | null;
  reference_no: string | null;
  channels: string[];
  request_status: string;
  requested_by: string | null;
  created_at: string;
  message_id: string | null;
  channel: string | null;
  message_status: string | null;
  template_version_id: string | null;
  test_mode: boolean | null;
  sent_at: string | null;
  delivered_at: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  provider_message_id: string | null;
}

export async function listDispatchRegister(opts: DeliveryFilter = {}): Promise<DispatchRegisterRow[]> {
  // Start from requests, then enrich with the first message per request.
  let rq = db.from("communication_request")
    .select("id, request_no, module_code, event_code, entity_type, entity_id, reference_no, channels, status, requested_by, created_at")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.moduleCode) rq = rq.eq("module_code", opts.moduleCode);
  if (opts.eventCode) rq = rq.eq("event_code", opts.eventCode);
  if (opts.requestNo) rq = rq.ilike("request_no", `%${opts.requestNo}%`);
  if (opts.createdFrom) rq = rq.gte("created_at", opts.createdFrom);
  if (opts.createdTo) rq = rq.lte("created_at", opts.createdTo);
  const { data: reqs, error } = await rq;
  if (error) throw error;
  const requests = (reqs ?? []) as any[];
  const ids = requests.map(r => r.id);
  if (!ids.length) return [];
  const { data: msgs } = await db.from("communication_message")
    .select("id, request_id, recipient_id, channel, status, template_version_id, test_mode, sent_at, delivered_at, provider_message_id, created_at")
    .in("request_id", ids)
    .order("created_at", { ascending: true });
  const msgByReq: Record<string, any[]> = {};
  for (const m of (msgs ?? []) as any[]) (msgByReq[m.request_id] ||= []).push(m);
  const allMsgs = (msgs ?? []) as any[];
  const recIdx = await fetchRecipientsIndex([...new Set(allMsgs.map(m => m.recipient_id).filter(Boolean))]);
  const rows: DispatchRegisterRow[] = [];
  for (const r of requests) {
    const list = msgByReq[r.id] ?? [];
    const filtered = list.filter(m => {
      if (opts.channel && opts.channel !== "all" && m.channel !== opts.channel) return false;
      if (opts.status && opts.status !== "all" && m.status !== opts.status) return false;
      if (opts.testMode === "test" && m.test_mode !== true) return false;
      if (opts.testMode === "live" && m.test_mode !== false) return false;
      return true;
    });
    const first = filtered[0] ?? list[0] ?? null;
    if (!first && (opts.channel || opts.status || opts.testMode && opts.testMode !== "all")) continue;
    const rec = first ? recIdx[first.recipient_id] : null;
    rows.push({
      request_id: r.id,
      request_no: r.request_no,
      module_code: r.module_code,
      event_code: r.event_code,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      reference_no: r.reference_no,
      channels: r.channels ?? [],
      request_status: r.status,
      requested_by: r.requested_by,
      created_at: r.created_at,
      message_id: first?.id ?? null,
      channel: first?.channel ?? null,
      message_status: first?.status ?? null,
      template_version_id: first?.template_version_id ?? null,
      test_mode: first?.test_mode ?? null,
      sent_at: first?.sent_at ?? null,
      delivered_at: first?.delivered_at ?? null,
      recipient_email: rec?.email ?? null,
      recipient_phone: rec?.phone ?? null,
      provider_message_id: first?.provider_message_id ?? null,
    });
  }
  return rows;
}

/** Rows that need attention: failed, bounced, cancelled, stuck, etc. */
export async function listRetryQueue(opts: DeliveryFilter = {}): Promise<DeliveryMonitorRow[]> {
  const all = await listDeliveryMonitor({ ...opts, limit: opts.limit ?? 200 });
  const cutoff = Date.now() - 30 * 60 * 1000;
  return all.filter(r => {
    if (["failed", "cancelled", "suppressed"].includes(r.message_status)) return true;
    if (r.bounced_at || r.complained_at) return true;
    if (r.locked_at && new Date(r.locked_at).getTime() < cutoff) return true;
    if (r.message_status === "queued" && new Date(r.created_at).getTime() < cutoff) return true;
    if (r.error_code) return true;
    return false;
  });
}

export function retryRecommendedAction(row: DeliveryMonitorRow): { retryable: boolean; action: string } {
  if (row.message_status === "cancelled") return { retryable: false, action: "Review lifecycle. No retry — message cancelled." };
  if (row.message_status === "suppressed") return { retryable: false, action: "Recipient suppressed. Investigate suppression source." };
  if (row.bounced_at) return { retryable: false, action: "Hard bounce recorded. Verify recipient before any retry." };
  if (row.complained_at) return { retryable: false, action: "Recipient complained. Do not retry." };
  if (row.locked_at && Date.now() - new Date(row.locked_at).getTime() > 30 * 60 * 1000) {
    return { retryable: true, action: "Stale sending lock — clear lock in EPIC 2C retry tooling." };
  }
  if (row.message_status === "queued" && Date.now() - new Date(row.created_at).getTime() > 30 * 60 * 1000) {
    return { retryable: true, action: "Queued too long — dispatcher may be paused." };
  }
  if (row.message_status === "failed") {
    return { retryable: true, action: "Failed. Review error before retry." };
  }
  return { retryable: false, action: "Review manually." };
}

export interface PrintQueueRow {
  message_id: string;
  request_id: string;
  request_no: string;
  module_code: string;
  event_code: string;
  channel: string;
  status: string;
  template_version_id: string | null;
  generated_document_id: string | null;
  rendered_at: string | null;
  sent_at: string | null;
  created_at: string;
  recipient_name: string | null;
  recipient_email: string | null;
}

export async function listPrintQueue(opts: DeliveryFilter = {}): Promise<PrintQueueRow[]> {
  const { data: msgs, error } = await db
    .from("communication_message")
    .select("id, request_id, recipient_id, channel, status, template_version_id, generated_document_id, rendered_at, sent_at, created_at")
    .in("channel", ["print", "letter"])
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (error) throw error;
  const messages = (msgs ?? []) as any[];
  if (!messages.length) return [];
  const reqIdx = await fetchRequestsIndex([...new Set(messages.map(m => m.request_id))]);
  const recIdx = await fetchRecipientsIndex([...new Set(messages.map(m => m.recipient_id).filter(Boolean))]);
  return messages.map(m => {
    const r = reqIdx[m.request_id] ?? {};
    const rec = recIdx[m.recipient_id] ?? {};
    return {
      message_id: m.id,
      request_id: m.request_id,
      request_no: r.request_no ?? "—",
      module_code: r.module_code ?? "—",
      event_code: r.event_code ?? "—",
      channel: m.channel,
      status: m.status,
      template_version_id: m.template_version_id,
      generated_document_id: m.generated_document_id,
      rendered_at: m.rendered_at,
      sent_at: m.sent_at,
      created_at: m.created_at,
      recipient_name: rec.name ?? null,
      recipient_email: rec.email ?? null,
    };
  });
}
