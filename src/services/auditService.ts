/**
 * Centralized Audit Trail Service
 * 
 * All create, update, delete, approve, reject, verify, cancel, enable, disable,
 * and configuration change actions MUST use this service to write audit entries
 * to the `system_audit_trail` table.
 * 
 * Usage:
 *   import { logAuditTrail } from '@/services/auditService';
 *   await logAuditTrail({ action: 'update', entityType: 'system_setting', ... });
 */

import { supabase } from '@/integrations/supabase/client';
import {
  getCorrelationId,
  getSessionId,
  getDeviceInfo,
} from '@/services/correlationIdService';

export interface AuditTrailEntry {
  /** The action performed: create, update, delete, approve, reject, verify, cancel, enable, disable, etc. */
  action: string;
  /** The type of entity affected, e.g. 'system_setting', 'cloudflare', 'applicant' */
  entityType: string;
  /** A unique identifier for the affected record */
  entityId?: string;
  /** The module or source screen, e.g. 'Global Settings', 'Registration' */
  module?: string;
  /** JSON snapshot of the value before the change */
  beforeValue?: Record<string, any> | null;
  /** JSON snapshot of the value after the change */
  afterValue?: Record<string, any> | null;
  /** The user_code of the logged-in user performing the action */
  userCode?: string;
  /** The auth user UUID */
  userId?: string;
  /** Additional context as JSON */
  metadata?: Record<string, any>;
}

/**
 * Write an audit trail entry to system_audit_trail.
 * This is the ONLY approved way to create audit records.
 * Returns the inserted row id or null on failure.
 */
export async function logAuditTrail(entry: AuditTrailEntry): Promise<string | null> {
  try {
    // Try to get the current user if userId not provided
    let userId = entry.userId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }

    const { data, error } = await supabase.from('system_audit_trail').insert({
      correlation_id: getCorrelationId(),
      session_id: getSessionId(),
      user_id: userId,
      device_info: getDeviceInfo(),
      timestamp: new Date().toISOString(),
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId || null,
      module: entry.module || null,
      before_value: entry.beforeValue || null,
      after_value: entry.afterValue || null,
      user_name: entry.userCode || 'SYSTEM',
      payload_json: entry.metadata || null,
      severity: 'info',
    }).select('id').single();

    if (error) {
      console.error('[AuditService] Failed to write audit trail:', error);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.error('[AuditService] Unexpected error writing audit trail:', err);
    return null;
  }
}
