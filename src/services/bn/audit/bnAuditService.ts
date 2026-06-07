/**
 * BN Central Audit Service
 *
 * Single, awaited entry point for every BN mutation that must leave a
 * permanent audit trail in `system_audit_trail`.
 *
 * Design rules:
 *  - For CRITICAL actions (publish/retire/delete/approve/deny/submit/decision/
 *    suspension/payment), the audit insert MUST succeed. If it fails the
 *    helper throws so the calling mutation can roll back / surface the
 *    failure to the user. No silent loss.
 *  - For non-critical traces (eligibility/calculation runs, simulations,
 *    notifications) the helper logs a console warning on failure but does
 *    not block — the underlying business write is the system of record.
 *
 * `useBnConfigAudit` (UI helper) now delegates here so writes go to the
 * correct columns (before_value / after_value, not before_state /
 * after_state) and so failures of critical actions are no longer swallowed.
 */
import { supabase } from '@/integrations/supabase/client';
import { requireUserCode } from '@/lib/bn/requireUserCode';

const db = supabase as any;

export type BnAuditSeverity = 'info' | 'warning' | 'critical';

export interface BnAuditInput {
  entityType: string;
  entityId?: string | null;
  action: string;
  beforeValue?: Record<string, any> | null;
  afterValue?: Record<string, any> | null;
  notes?: string | null;
  performedBy: string;
  /** Logical BN sub-module: 'BN_CONFIG' | 'BN_CLAIM' | 'BN_AWARD' | 'BN_SUBMISSION' | etc. */
  module?: string;
  correlationId?: string | null;
  severity?: BnAuditSeverity;
  /** If true, audit insert failure throws and aborts the parent mutation. */
  critical?: boolean;
  route?: string | null;
  payload?: Record<string, any> | null;
}

const CRITICAL_ACTIONS = new Set([
  'PUBLISH',
  'RETIRE',
  'DELETE',
  'APPROVE',
  'REJECT',
  'DENY',
  'SUBMIT_DECISION',
  'APPROVE_CLAIM',
  'DENY_CLAIM',
  'RULE_VERSION_PUBLISHED',
  'RULE_VERSION_RETIRED',
  'RULE_VERSION_APPROVED',
  'RULE_VERSION_REJECTED',
  'RULE_VERSION_SUBMITTED',
  'CLAIM_DECISION_FINALISED',
  'CONFIG_DELETE',
  'CHANNEL_CONFIG_CHANGED',
  'CLAIM_SUBMITTED',
  'AWARD_SUSPENDED',
  'AWARD_REINSTATED',
  'PAYMENT_ISSUED',
  // Phase G hardening — amendments, communications, template & contact changes
  'CLAIM_FIELD_AMENDED',
  'CLAIM_AMENDMENT',
  'CLAIM_CORRECTION_REQUESTED',
  'COMMUNICATION_DISPATCHED',
  'COMMUNICATION_BLOCKED',
  'COMMUNICATION_RETRIED',
  'COMMUNICATION_MANUALLY_DISPATCHED',
  'LETTER_GENERATED',
  'TEMPLATE_UPDATED',
  'TEMPLATE_ENABLED',
  'TEMPLATE_DISABLED',
  'CONTACT_UPDATED',
  'RECIPIENT_OVERRIDDEN',
  // Post-approval orchestration
  'SUBMITTED_FOR_DECISION',
  'CLAIM_APPROVED',
  'CLAIM_DENIED',
  'AWARD_CREATED',
  'ENTITLEMENT_CREATED',
  'PAYMENT_INSTRUCTION_CREATED',
  'PAYABLE_QUEUED',
  'BATCH_CREATED',
  'PAYMENT_ISSUED',
]);

function isCritical(input: BnAuditInput): boolean {
  if (input.critical === true) return true;
  if (input.critical === false) return false;
  return CRITICAL_ACTIONS.has(input.action);
}

/**
 * Write one row to system_audit_trail. Awaited.
 *
 * Throws on insert failure for critical actions; warns otherwise.
 */
export async function writeBnAudit(input: BnAuditInput): Promise<void> {
  const critical = isCritical(input);
  const performedBy = requireUserCode(input.performedBy, input.action);

  const row = {
    timestamp: new Date().toISOString(),
    module: input.module ?? 'BN',
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    action: input.action,
    before_value: input.beforeValue ?? null,
    after_value: input.afterValue ?? null,
    user_name: performedBy,
    severity: input.severity ?? (critical ? 'critical' : 'info'),
    correlation_id: input.correlationId ?? null,
    route: input.route ?? null,
    payload_json: input.payload ?? (input.notes ? { notes: input.notes } : null),
  };

  const { error } = await db.from('system_audit_trail').insert(row);
  if (error) {
    if (critical) {
      // Surface to caller so the mutation can be reported as failed.
      throw new Error(
        `[BN-Audit] CRITICAL audit write failed for ${input.action} on ${input.entityType}/${input.entityId ?? ''}: ${error.message}`,
      );
    }
    console.warn('[BN-Audit] Non-critical audit write failed (non-blocking):', error);
  }
}

// ─── Convenience wrappers ────────────────────────────────────────────────

export const auditConfigChange = (i: Omit<BnAuditInput, 'module'>) =>
  writeBnAudit({ ...i, module: 'BN_CONFIG' });

export const auditClaimAction = (i: Omit<BnAuditInput, 'module'>) =>
  writeBnAudit({ ...i, module: 'BN_CLAIM' });

export const auditSubmission = (i: Omit<BnAuditInput, 'module'>) =>
  writeBnAudit({ ...i, module: 'BN_SUBMISSION', critical: i.critical ?? true });

export const auditWorkflowAction = (i: Omit<BnAuditInput, 'module'>) =>
  writeBnAudit({ ...i, module: 'BN_WORKFLOW' });

export const auditCommunicationAction = (i: Omit<BnAuditInput, 'module'>) =>
  writeBnAudit({ ...i, module: 'BN_COMMUNICATION' });

export const auditDocumentAction = (i: Omit<BnAuditInput, 'module'>) =>
  writeBnAudit({ ...i, module: 'BN_DOCUMENT' });

export const auditAwardAction = (i: Omit<BnAuditInput, 'module'>) =>
  writeBnAudit({ ...i, module: 'BN_AWARD' });
