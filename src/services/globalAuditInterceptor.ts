/**
 * Global Audit Interceptor Service
 * 
 * Centralized, non-hook audit write service used by:
 * 1. MutationCache global interceptor (App.tsx)
 * 2. SystemLoggingProvider for navigation events
 * 3. useAuditedMutation for enriched per-mutation logging
 * 
 * Writes to system_audit_trail. Resolves user identity automatically.
 * Never throws — failures are logged to console only.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  getCorrelationId,
  getSessionId,
  getDeviceInfo,
} from '@/services/correlationIdService';

interface AuditInterceptorEntry {
  action: string;
  entityType?: string;
  entityId?: string;
  module?: string;
  route?: string;
  beforeValue?: Record<string, any> | null;
  afterValue?: Record<string, any> | null;
  description?: string;
  metadata?: Record<string, any> | null;
}

// Cache user identity to avoid repeated DB calls
let cachedUserId: string | null = null;
let cachedUserCode: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 1 minute

async function resolveUserIdentity(): Promise<{ userId: string | null; userCode: string | null }> {
  const now = Date.now();
  if (cachedUserId && now - cacheTimestamp < CACHE_TTL) {
    return { userId: cachedUserId, userCode: cachedUserCode };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { userId: null, userCode: null };

    cachedUserId = user.id;
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_code, full_name')
      .eq('id', user.id)
      .single();

    cachedUserCode = profile?.user_code || profile?.full_name || user.email || null;
    cacheTimestamp = now;

    return { userId: cachedUserId, userCode: cachedUserCode };
  } catch {
    return { userId: cachedUserId, userCode: cachedUserCode };
  }
}

/** Clear cached identity on auth state change */
export function clearAuditUserCache() {
  cachedUserId = null;
  cachedUserCode = null;
  cacheTimestamp = 0;
}

/**
 * Write an audit entry to system_audit_trail.
 * Non-blocking — never throws.
 */
export async function logAuditEntry(entry: AuditInterceptorEntry): Promise<void> {
  try {
    const { userId, userCode } = await resolveUserIdentity();

    await supabase.from('system_audit_trail').insert({
      correlation_id: getCorrelationId(),
      session_id: getSessionId(),
      user_id: userId,
      user_name: userCode || 'SYSTEM',
      device_info: getDeviceInfo(),
      timestamp: new Date().toISOString(),
      action: entry.action,
      entity_type: entry.entityType || null,
      entity_id: entry.entityId || null,
      module: entry.module || null,
      route: entry.route || null,
      before_value: entry.beforeValue || null,
      after_value: entry.afterValue || null,
      payload_json: entry.metadata || null,
      severity: 'info',
    });
  } catch (err) {
    console.error('[GlobalAuditInterceptor] Failed to write audit entry:', err);
  }
}

/**
 * Parse a mutation key into structured audit metadata.
 * Convention: mutationKey = ['module', 'entity', 'action']
 * Falls back to joining the key as a description.
 */
export function parseMutationKey(
  mutationKey: readonly unknown[] | undefined
): { module?: string; entityType?: string; action: string } {
  if (!mutationKey || mutationKey.length === 0) {
    return { action: 'mutation' };
  }

  const parts = mutationKey.map(String);

  if (parts.length >= 3) {
    return {
      module: parts[0],
      entityType: parts[1],
      action: parts[2],
    };
  }

  if (parts.length === 2) {
    return {
      module: parts[0],
      action: parts[1],
    };
  }

  return { action: parts[0] };
}

/**
 * Extract a likely entity ID from mutation variables.
 * Checks common patterns: id, entityId, batchNumber, etc.
 */
export function extractEntityId(variables: unknown): string | undefined {
  if (!variables || typeof variables !== 'object') return undefined;
  const v = variables as Record<string, any>;
  return (
    v.id || v.entityId || v.entity_id ||
    v.batchNumber || v.batch_number ||
    v.registrationId || v.registration_id ||
    v.receiptId || v.receipt_id ||
    v.ssn || v.regno ||
    undefined
  );
}
