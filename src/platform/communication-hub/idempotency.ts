/**
 * Enterprise Communication Hub — idempotency helper.
 *
 * `communication_request.idempotency_key` is UNIQUE. Callers that pass the
 * same key twice (e.g. a retried UI action) receive the original request
 * back instead of creating a duplicate.
 */
import { supabase } from '@/integrations/supabase/client';

const db: any = supabase;

export interface ExistingRequest {
  id: string;
  request_no: string;
  status: string;
  correlation_id?: string | null;
}

export async function findRequestByIdempotencyKey(key: string): Promise<ExistingRequest | null> {
  if (!key) return null;
  const { data, error } = await db
    .from('communication_request')
    .select('id, request_no, status, context')
    .eq('idempotency_key', key)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    request_no: data.request_no,
    status: data.status,
    correlation_id: (data.context as any)?.correlation_id ?? null,
  };
}

export async function listMessageIdsForRequest(requestId: string): Promise<string[]> {
  const { data, error } = await db
    .from('communication_message')
    .select('id')
    .eq('request_id', requestId);
  if (error || !data) return [];
  return data.map((r: any) => r.id as string);
}

export function generateCorrelationId(): string {
  // crypto.randomUUID is available in modern browsers / Deno / Node 19+.
  const g: any = globalThis as any;
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `corr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
