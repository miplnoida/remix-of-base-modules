/**
 * useBnConfigAudit — UI helper that records BN configuration changes
 * through the central `bnAuditService` so writes land in the correct
 * `system_audit_trail` columns (before_value / after_value) and follow
 * the same critical / non-critical policy as service-layer audits.
 *
 * Behaviour:
 *  - `log(entry)` is fire-and-forget for backwards compatibility with the
 *    UI helper contract (returns void). Failures of CRITICAL actions are
 *    surfaced as console errors so they show up in monitoring; the central
 *    service still enforces the strict path for service-layer mutations.
 *  - For mutations that must fail when audit fails, call the service-layer
 *    helpers in `@/services/bn/audit/bnAuditService` directly (awaited).
 */
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import {
  writeBnAudit,
  type BnAuditInput,
} from '@/services/bn/audit/bnAuditService';

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
  const userCode = profile?.user_code ?? '';

  const log = (entry: BnAuditEntry): void => {
    const input: BnAuditInput = {
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      beforeValue: entry.before ?? null,
      afterValue: entry.after ?? null,
      notes: entry.notes ?? null,
      performedBy: userCode,
      module: 'BN_CONFIG',
    };
    // Fire-and-forget UI convenience. The central service still throws
    // for critical actions; we capture and log that loudly so it is not
    // silently lost from the UI path.
    writeBnAudit(input).catch((e) => {
      console.error('[useBnConfigAudit] audit write failed:', e);
    });
  };

  /** Awaited variant — use when the UI must wait for audit before navigating. */
  const logAwait = (entry: BnAuditEntry): Promise<void> =>
    writeBnAudit({
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      beforeValue: entry.before ?? null,
      afterValue: entry.after ?? null,
      notes: entry.notes ?? null,
      performedBy: userCode,
      module: 'BN_CONFIG',
    });

  return { log, logAwait, userCode };
}
