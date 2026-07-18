/**
 * AW360-WAVE-1-C1 Stage D6 — Rollback / compensation registry.
 *
 * Documents the recovery model for each pilot action. Compensation is
 * audit-preserving: historical evidence is never deleted.
 */
import type { AwardActionKey } from '../awardActionAvailability';

export type CompensationModel =
  | 'REVERSIBLE_VIA_COMPENSATION'
  | 'IDEMPOTENT_NOOP'
  | 'IRREVERSIBLE_NOTE_ONLY';

export interface PilotCompensationEntry {
  readonly action: AwardActionKey;
  readonly model: CompensationModel;
  readonly compensatingActionKey: string;
  readonly requiredRole: string;
  readonly auditTreatment: 'PRESERVE_ORIGINAL_APPEND_COMPENSATION';
  readonly idempotent: boolean;
  readonly requiresConcurrencyToken: boolean;
  readonly prohibitsDeletion: true;
  readonly notes: string;
}

export const PILOT_COMPENSATION_REGISTRY: Readonly<
  Record<AwardActionKey, PilotCompensationEntry | null>
> = {
  SEND_LIFE_CERTIFICATE_REMINDER: {
    action: 'SEND_LIFE_CERTIFICATE_REMINDER',
    model: 'IRREVERSIBLE_NOTE_ONLY',
    compensatingActionKey: 'RECORD_LIFE_CERT_REMINDER_RETRACTION_NOTE',
    requiredRole: 'benefits_officer',
    auditTreatment: 'PRESERVE_ORIGINAL_APPEND_COMPENSATION',
    idempotent: true,
    requiresConcurrencyToken: true,
    prohibitsDeletion: true,
    notes:
      'External delivery cannot be un-sent. Compensation records a retract-reminder note; original audit is preserved.',
  },
  SCHEDULE_MEDICAL_REVIEW: {
    action: 'SCHEDULE_MEDICAL_REVIEW',
    model: 'REVERSIBLE_VIA_COMPENSATION',
    compensatingActionKey: 'CANCEL_OR_RESCHEDULE_MEDICAL_REVIEW',
    requiredRole: 'medical_officer',
    auditTreatment: 'PRESERVE_ORIGINAL_APPEND_COMPENSATION',
    idempotent: true,
    requiresConcurrencyToken: true,
    prohibitsDeletion: true,
    notes: 'Cancel or reschedule the review row; original schedule record kept for audit.',
  },
  PROPOSE_SUSPENSION: {
    action: 'PROPOSE_SUSPENSION',
    model: 'REVERSIBLE_VIA_COMPENSATION',
    compensatingActionKey: 'WITHDRAW_SUSPENSION_PROPOSAL',
    requiredRole: 'benefits_supervisor',
    auditTreatment: 'PRESERVE_ORIGINAL_APPEND_COMPENSATION',
    idempotent: true,
    requiresConcurrencyToken: true,
    prohibitsDeletion: true,
    notes: 'Withdrawal moves proposal to WITHDRAWN state; original proposal row is preserved.',
  },
  PROPOSE_RESUMPTION: {
    action: 'PROPOSE_RESUMPTION',
    model: 'REVERSIBLE_VIA_COMPENSATION',
    compensatingActionKey: 'WITHDRAW_RESUMPTION_PROPOSAL',
    requiredRole: 'benefits_supervisor',
    auditTreatment: 'PRESERVE_ORIGINAL_APPEND_COMPENSATION',
    idempotent: true,
    requiresConcurrencyToken: true,
    prohibitsDeletion: true,
    notes: 'Withdrawal moves proposal to WITHDRAWN state; original proposal row is preserved.',
  },
} as Record<AwardActionKey, PilotCompensationEntry | null> as any;
