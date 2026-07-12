/**
 * EPIC CH-TRACE-1 — Trace Center data service (read-only).
 */
import { supabase } from "@/integrations/supabase/client";

export interface TraceUnifiedRow {
  trace_id: string;
  trace_no: string;
  trace_kind: "native" | "reconstructed";
  module_code: string | null;
  event_code: string | null;
  channel: string | null;
  entity_type: string | null;
  entity_id: string | null;
  reference_no: string | null;
  recipient_email_masked: string | null;
  recipient_domain: string | null;
  status: string;
  current_stage: string | null;
  blocked_stage: string | null;
  blocker_codes: string[];
  request_id: string | null;
  request_no: string | null;
  message_id: string | null;
  provider_message_id: string | null;
  correlation_id: string | null;
  source_module: string | null;
  created_at: string;
  updated_at: string;
  reconstructed_note: string | null;
}

export interface TraceStepRow {
  id: string;
  trace_id: string;
  stage_code: string;
  stage_name: string;
  status: string;
  blocker_codes: string[];
  warnings: string[];
  plain_summary: string | null;
  fix_href: string | null;
  request_id: string | null;
  message_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface TraceListFilters {
  moduleCode?: string;
  eventCode?: string;
  status?: string;
  blockedOnly?: boolean;
  recipientDomain?: string;
  requestNo?: string;
  messageId?: string;
  entityType?: string;
  entityId?: string;
  referenceNo?: string;
  blockerCode?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

const db = supabase as any;

export async function listTraces(filters: TraceListFilters = {}): Promise<TraceUnifiedRow[]> {
  let q = db.from("communication_hub_trace_unified_view").select("*").order("created_at", { ascending: false }).limit(filters.limit ?? 200);
  if (filters.moduleCode) q = q.eq("module_code", filters.moduleCode);
  if (filters.eventCode) q = q.eq("event_code", filters.eventCode);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.blockedOnly) q = q.eq("status", "blocked");
  if (filters.recipientDomain) q = q.eq("recipient_domain", filters.recipientDomain.toLowerCase());
  if (filters.requestNo) q = q.eq("request_no", filters.requestNo);
  if (filters.messageId) q = q.eq("message_id", filters.messageId);
  if (filters.entityType) q = q.eq("entity_type", filters.entityType);
  if (filters.entityId) q = q.eq("entity_id", filters.entityId);
  if (filters.referenceNo) q = q.eq("reference_no", filters.referenceNo);
  if (filters.blockerCode) q = q.contains("blocker_codes", [filters.blockerCode]);
  if (filters.fromDate) q = q.gte("created_at", filters.fromDate);
  if (filters.toDate) q = q.lte("created_at", filters.toDate);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as TraceUnifiedRow[];
}

export async function getTrace(traceId: string): Promise<TraceUnifiedRow | null> {
  const { data, error } = await db.from("communication_hub_trace_unified_view").select("*").eq("trace_id", traceId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as TraceUnifiedRow) ?? null;
}

export async function listTraceSteps(traceId: string): Promise<TraceStepRow[]> {
  const { data, error } = await db.from("communication_hub_trace_step").select("*").eq("trace_id", traceId).order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as TraceStepRow[];
}

export interface DeliveryAttemptLite {
  id: string;
  message_id: string;
  attempt_no: number | null;
  status: string;
  provider_id: string | null;
  provider_message_id: string | null;
  error_code: string | null;
  error_message: string | null;
  retry_reason: string | null;
  started_at: string;
  finished_at: string | null;
  provider_response: unknown;
}

export async function listDeliveryAttemptsForRequest(requestId: string): Promise<DeliveryAttemptLite[]> {
  const { data: msgs } = await db.from("communication_message").select("id").eq("request_id", requestId);
  const ids: string[] = (msgs ?? []).map((r: any) => r.id);
  if (ids.length === 0) return [];
  const { data, error } = await db
    .from("communication_delivery_attempt")
    .select("id,message_id,attempt_no,status,provider_id,provider_message_id,error_code,error_message,retry_reason,started_at,finished_at,provider_response")
    .in("message_id", ids)
    .order("started_at", { ascending: true });
  if (error) return [];
  return (data ?? []) as DeliveryAttemptLite[];
}

export interface EventLogLite {
  id: string;
  request_id: string | null;
  stage: string;
  status: string;
  message: string | null;
  created_at: string;
}

export async function listEventLogForRequest(requestId: string): Promise<EventLogLite[]> {
  const { data, error } = await db.from("communication_event_log").select("*").eq("request_id", requestId).order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []) as EventLogLite[];
}
