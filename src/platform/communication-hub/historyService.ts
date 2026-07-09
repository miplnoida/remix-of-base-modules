/**
 * Enterprise Communication Hub — request history read helper.
 *
 * Thin read facade over `communication_request` and its children so UIs
 * can show what the façade produced without duplicating query logic.
 * Read-only; never writes and never touches provider secrets.
 */
import { supabase } from '@/integrations/supabase/client';

const db: any = supabase;

export interface CommunicationRequestHistoryRow {
  id: string;
  request_no: string;
  module_code: string;
  event_code: string;
  status: string;
  channels: string[];
  entity_type: string | null;
  entity_id: string | null;
  reference_no: string | null;
  priority: string | null;
  department_code: string | null;
  requested_by: string | null;
  idempotency_key: string | null;
  context: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
}

export interface ListRequestsOptions {
  moduleCode?: string;
  eventCode?: string;
  entityType?: string;
  entityId?: string;
  status?: string;
  channel?: string;
  requestNo?: string;
  createdFrom?: string;
  createdTo?: string;
  limit?: number;
  offset?: number;
}

export async function getRequest(id: string) {
  const { data, error } = await db.from('communication_request').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listRecentRequests(
  opts: ListRequestsOptions = {},
): Promise<CommunicationRequestHistoryRow[]> {
  let q = db
    .from('communication_request')
    .select(
      'id, request_no, module_code, event_code, status, channels, entity_type, entity_id, reference_no, priority, department_code, requested_by, idempotency_key, context, created_at, updated_at',
    )
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 50);
  if (opts.offset) q = q.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1);
  if (opts.moduleCode) q = q.eq('module_code', opts.moduleCode);
  if (opts.eventCode) q = q.eq('event_code', opts.eventCode);
  if (opts.entityType) q = q.eq('entity_type', opts.entityType);
  if (opts.entityId) q = q.eq('entity_id', opts.entityId);
  if (opts.status) q = q.eq('status', opts.status);
  if (opts.channel) q = q.contains('channels', [opts.channel]);
  if (opts.requestNo) q = q.ilike('request_no', `%${opts.requestNo}%`);
  if (opts.createdFrom) q = q.gte('created_at', opts.createdFrom);
  if (opts.createdTo) q = q.lte('created_at', opts.createdTo);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as CommunicationRequestHistoryRow[];
}

export async function listMessagesForRequest(requestId: string) {
  const { data, error } = await db
    .from('communication_message')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listRecipientsForRequest(requestId: string) {
  const { data, error } = await db
    .from('communication_recipient')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listAttemptsForRequest(requestId: string) {
  // Two-step: fetch message ids first (RLS reads via request), then attempts.
  const { data: msgs, error: mErr } = await db
    .from('communication_message')
    .select('id')
    .eq('request_id', requestId);
  if (mErr) throw mErr;
  const ids = (msgs ?? []).map((m: any) => m.id);
  if (ids.length === 0) return [];
  const { data, error } = await db
    .from('communication_delivery_attempt')
    .select('*')
    .in('message_id', ids)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listEventsForRequest(requestId: string) {
  const { data, error } = await db
    .from('communication_event_log')
    .select('*')
    .eq('request_id', requestId)
    .order('occurred_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Aggregated counts per request id for the list view. */
export async function getMessageCountsForRequests(
  requestIds: string[],
): Promise<Record<string, { total: number; sent: number; failed: number; queued: number; live: number }>> {
  if (requestIds.length === 0) return {};
  const { data, error } = await db
    .from('communication_message')
    .select('request_id, status, test_mode')
    .in('request_id', requestIds);
  if (error) throw error;
  const out: Record<string, { total: number; sent: number; failed: number; queued: number; live: number }> = {};
  for (const id of requestIds) out[id] = { total: 0, sent: 0, failed: 0, queued: 0, live: 0 };
  for (const row of (data ?? []) as Array<{ request_id: string; status: string; test_mode: boolean }>) {
    const b = out[row.request_id];
    if (!b) continue;
    b.total += 1;
    if (row.status === 'sent' || row.status === 'delivered') b.sent += 1;
    else if (row.status === 'failed') b.failed += 1;
    else if (row.status === 'queued' || row.status === 'sending' || row.status === 'pending') b.queued += 1;
    if (row.test_mode === false) b.live += 1;
  }
  return out;
}

export const communicationHubHistoryService = {
  getRequest,
  listRecentRequests,
  listMessagesForRequest,
  listRecipientsForRequest,
  listAttemptsForRequest,
  listEventsForRequest,
  getMessageCountsForRequests,
};
