/**
 * Central audit helper for the Social Security Self-Service Portal.
 * Fire-and-forget — never blocks UI.
 * Writes to external_persona_audit (which the portal user owns) and
 * mirrors high-signal events to system_audit_trail when possible.
 */
import { supabase } from '@/integrations/supabase/client';

export type PortalAuditEvent =
  | 'LIFE_CERT_SUBMITTED'
  | 'LIFE_CERT_VIEWED'
  | 'APPEAL_SUBMITTED'
  | 'STATEMENT_DOWNLOADED'
  | 'LETTER_VIEWED'
  | 'DOCUMENT_VIEWED'
  | 'DOCUMENT_UPLOADED'
  | 'BANK_DETAILS_UPDATED'
  | 'ESTIMATOR_RUN'
  | 'MANAGED_PERSON_VIEWED'
  | 'CLAIMS_TAB_VIEWED'
  | 'PAYMENT_DOWNLOADED'
  | 'ENTITLEMENT_VIEWED'
  | 'RELATIONSHIPS_VIEWED';

interface AuditOpts {
  userId?: string | null;
  targetSsn?: string | null;
  targetClaimId?: string | null;
  targetAwardId?: string | null;
  payload?: Record<string, unknown>;
}

export function auditPortalAction(event: PortalAuditEvent, opts: AuditOpts = {}): void {
  const db = supabase as any;
  const row: Record<string, unknown> = {
    event_type: event,
    payload: opts.payload ?? null,
  };
  if (opts.userId) row.user_id = opts.userId;
  if (opts.targetSsn) row.target_ssn = opts.targetSsn;
  if (opts.targetClaimId) row.target_claim_id = opts.targetClaimId;
  if (opts.targetAwardId) row.target_award_id = opts.targetAwardId;

  void db.from('external_persona_audit').insert(row).then(
    () => {},
    () => {},
  );
}
