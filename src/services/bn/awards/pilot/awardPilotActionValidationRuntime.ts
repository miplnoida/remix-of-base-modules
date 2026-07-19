/**
 * AW360-WAVE-1-C1 Stage D9 — Per-action operational validation contract.
 *
 * Defines the runtime checks each of the four approved actions must pass
 * against live evidence. Aggregate success cannot substitute for any
 * per-action attestation.
 */
import type { AwardActionKey } from '../awardActionAvailability';

export interface ReminderActionValidation {
  readonly action: 'SEND_LIFE_CERTIFICATE_REMINDER';
  readonly recipientCorrect: boolean;
  readonly awardCorrect: boolean;
  readonly templateCorrect: boolean;
  readonly queueEntryPresent: boolean;
  readonly providerAcceptance: boolean;
  readonly deliveryStatus: 'DELIVERED' | 'FAILED' | 'UNKNOWN';
  readonly providerReferencePresent: boolean;
  readonly duplicateProviderDeliveryAfterRetry: boolean;   // must be false
  readonly auditLinked: boolean;
  readonly telemetryLinked: boolean;
  readonly noteOnlyCorrectionOrSupersessionEvidenced: boolean;
}

export interface MedicalReviewActionValidation {
  readonly action: 'SCHEDULE_MEDICAL_REVIEW';
  readonly reviewDateCorrect: boolean;
  readonly responsibilityAssignmentCorrect: boolean;
  readonly duplicateScheduleAvoided: boolean;
  readonly cancellationOrRescheduleEvidenced: boolean;
  readonly versionConsistent: boolean;
  readonly auditComplete: boolean;
}

export interface ProposalActionValidation {
  readonly action: 'PROPOSE_SUSPENSION' | 'PROPOSE_RESUMPTION';
  readonly eligibilityCorrect: boolean;
  readonly proposalStateOnly: boolean;                     // no final state effect
  readonly noFinalEffectApplied: boolean;
  readonly authorisedWithdrawalEvidenced: boolean;
  readonly auditComplete: boolean;
  readonly telemetryComplete: boolean;
}

export type ActionValidation =
  | ReminderActionValidation
  | MedicalReviewActionValidation
  | ProposalActionValidation;

export interface ActionValidationResult {
  readonly action: AwardActionKey;
  readonly passed: boolean;
  readonly failures: readonly string[];
}

export function validateReminder(v: ReminderActionValidation): ActionValidationResult {
  const f: string[] = [];
  if (!v.recipientCorrect) f.push('recipient incorrect');
  if (!v.awardCorrect) f.push('award incorrect');
  if (!v.templateCorrect) f.push('template incorrect');
  if (!v.queueEntryPresent) f.push('queue entry missing');
  if (!v.providerAcceptance) f.push('provider not accepted');
  if (!['DELIVERED', 'FAILED', 'UNKNOWN'].includes(v.deliveryStatus)) f.push('delivery status invalid');
  if (!v.providerReferencePresent) f.push('provider reference missing');
  if (v.duplicateProviderDeliveryAfterRetry) f.push('duplicate provider delivery detected');
  if (!v.auditLinked) f.push('audit not linked');
  if (!v.telemetryLinked) f.push('telemetry not linked');
  if (!v.noteOnlyCorrectionOrSupersessionEvidenced) f.push('note-only correction/supersession not evidenced');
  return { action: v.action, passed: f.length === 0, failures: f };
}

export function validateMedicalReview(v: MedicalReviewActionValidation): ActionValidationResult {
  const f: string[] = [];
  if (!v.reviewDateCorrect) f.push('review date incorrect');
  if (!v.responsibilityAssignmentCorrect) f.push('responsibility incorrect');
  if (!v.duplicateScheduleAvoided) f.push('duplicate schedule detected');
  if (!v.cancellationOrRescheduleEvidenced) f.push('cancellation/reschedule not evidenced');
  if (!v.versionConsistent) f.push('version inconsistent');
  if (!v.auditComplete) f.push('audit incomplete');
  return { action: v.action, passed: f.length === 0, failures: f };
}

export function validateProposal(v: ProposalActionValidation): ActionValidationResult {
  const f: string[] = [];
  if (!v.eligibilityCorrect) f.push('eligibility incorrect');
  if (!v.proposalStateOnly) f.push('proposal state violated');
  if (!v.noFinalEffectApplied) f.push('final effect applied — proposal MUST NOT enact final state');
  if (!v.authorisedWithdrawalEvidenced) f.push('authorised withdrawal not evidenced');
  if (!v.auditComplete) f.push('audit incomplete');
  if (!v.telemetryComplete) f.push('telemetry incomplete');
  return { action: v.action, passed: f.length === 0, failures: f };
}
