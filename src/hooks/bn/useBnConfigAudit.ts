/**
 * useBnConfigAudit — non-blocking audit trail writer for BN config changes.
 * Captures before/after snapshots into system_audit_trail tagged with user_code.
 */
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

export interface BnAuditEntry {
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'PUBLISH' | 'RETIRE';
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  notes?: string;
}

export function useBnConfigAudit() {
  const { profile } = useSupabaseAuth();
  const userCode = profile?.user_code ?? 'system';

  const log = (entry: BnAuditEntry): void => {
    // Fire-and-forget (non-blocking). Failures are logged but never thrown.
    (async () => {
      try {
        await (supabase.from('system_audit_trail' as any) as any).insert({
          entity_type: entry.entityType,
          entity_id: entry.entityId,
          action: entry.action,
          before_state: entry.before ?? null,
          after_state: entry.after ?? null,
          notes: entry.notes ?? null,
          performed_by: userCode,
          performed_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('[useBnConfigAudit] audit log failed (non-blocking):', e);
      }
    })();
  };

  return { log, userCode };
}
