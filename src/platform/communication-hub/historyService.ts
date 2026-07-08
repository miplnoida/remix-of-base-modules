/**
 * Enterprise Communication Hub — request history read helper.
 *
 * Thin read facade over `communication_request` and its children so UIs
 * can show what the façade produced without duplicating query logic.
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
  created_at: string;
}

export async function getRequest(id: string) {
  const { data, error } = await db.from('communication_request').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listRecentRequests(opts: {
  moduleCode?: string;
  eventCode?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
} = {}): Promise<CommunicationRequestHistoryRow[]> {
  let q = db
    .from('communication_request')
    .select('id, request_no, module_code, event_code, status, channels, entity_type, entity_id, reference_no, created_at')
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 50);
  if (opts.moduleCode) q = q.eq('module_code', opts.moduleCode);
  if (opts.eventCode) q = q.eq('event_code', opts.eventCode);
  if (opts.entityType) q = q.eq('entity_type', opts.entityType);
  if (opts.entityId) q = q.eq('entity_id', opts.entityId);
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

export async function listEventsForRequest(requestId: string) {
  const { data, error } = await db
    .from('communication_event_log')
    .select('*')
    .eq('request_id', requestId)
    .order('occurred_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export const communicationHubHistoryService = {
  getRequest,
  listRecentRequests,
  listMessagesForRequest,
  listEventsForRequest,
};
