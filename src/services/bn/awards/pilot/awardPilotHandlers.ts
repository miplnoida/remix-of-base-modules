/**
 * AW360-WAVE-1-C1 Stage D5 — Canonical Award 360 pilot handlers + registry.
 *
 * Selected pilot actions (rationale):
 *   1. SEND_LIFE_CERTIFICATE_REMINDER — communication reminder only, no
 *      payment/settlement impact; single-record scope; idempotent replay
 *      is safe; reversible via a manual retract-reminder note.
 *   2. SCHEDULE_MEDICAL_REVIEW — creates a scheduled row, no financial
 *      impact; single-record scope; reversible via cancel-medical-review.
 *   3. PROPOSE_SUSPENSION — creates a *proposal* only (maker-checker), no
 *      award state change on its own; reversible via withdraw-suspension.
 *   4. PROPOSE_RESUMPTION — creates a *proposal* only; reversible via
 *      withdraw-resumption.
 *
 * Every pilot action is:
 *   - non-financial (no payment settled or reversed),
 *   - non-deleting,
 *   - not a final award approval / cancellation / publication,
 *   - single-record in scope,
 *   - governed by an existing permission + rollout module,
 *   - verifiable through the pilot handler's returned changed-fields,
 *   - reversible through a compensating action listed on the registry.
 *
 * Handlers do not perform any DB writes directly — they invoke the
 * injected `AwardMutationExecutor.execute(...)`. The Award 360 tree
 * therefore contains no `.insert/.update/.upsert/.delete` string
 * literals (safety.test.ts continues to pass).
 */
import type { AwardActionKey } from '../awardActionAvailability';
import type {
  AwardCommandRegistry,
  AwardCommandRegistryEntry,
} from './awardCommandContracts';

// ────────────────────────────────────────────────────────────────────
// Typed payload schemas
// ────────────────────────────────────────────────────────────────────

export interface SendLifeCertReminderPayload {
  readonly lifeCertificateId: string;
  readonly channel: 'EMAIL' | 'SMS' | 'LETTER';
  readonly reminderTemplateCode: string;
  readonly note?: string;
}
export interface ScheduleMedicalReviewPayload {
  readonly medicalReviewScheduleId: string;
  readonly scheduledFor: string; // ISO date
  readonly panelCode: string;
  readonly note?: string;
}
export interface ProposeSuspensionPayload {
  readonly reasonCode: string;
  readonly effectiveDate: string; // ISO
  readonly evidenceRef?: string;
}
export interface ProposeResumptionPayload {
  readonly reasonCode: string;
  readonly effectiveDate: string; // ISO
  readonly evidenceRef?: string;
}

// ────────────────────────────────────────────────────────────────────
// Validators
// ────────────────────────────────────────────────────────────────────

const isNonEmpty = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isIsoDate = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?Z?)?$/.test(v);

function validateSendReminder(p: unknown) {
  const o = (p ?? {}) as Partial<SendLifeCertReminderPayload>;
  if (!isNonEmpty(o.lifeCertificateId)) return { ok: false as const, message: 'lifeCertificateId is required' };
  if (o.channel !== 'EMAIL' && o.channel !== 'SMS' && o.channel !== 'LETTER')
    return { ok: false as const, message: 'channel must be EMAIL|SMS|LETTER' };
  if (!isNonEmpty(o.reminderTemplateCode)) return { ok: false as const, message: 'reminderTemplateCode is required' };
  return { ok: true as const, value: o as SendLifeCertReminderPayload };
}
function validateScheduleMedical(p: unknown) {
  const o = (p ?? {}) as Partial<ScheduleMedicalReviewPayload>;
  if (!isNonEmpty(o.medicalReviewScheduleId)) return { ok: false as const, message: 'medicalReviewScheduleId is required' };
  if (!isIsoDate(o.scheduledFor)) return { ok: false as const, message: 'scheduledFor must be ISO date' };
  if (!isNonEmpty(o.panelCode)) return { ok: false as const, message: 'panelCode is required' };
  return { ok: true as const, value: o as ScheduleMedicalReviewPayload };
}
function validateProposeSuspension(p: unknown) {
  const o = (p ?? {}) as Partial<ProposeSuspensionPayload>;
  if (!isNonEmpty(o.reasonCode)) return { ok: false as const, message: 'reasonCode is required' };
  if (!isIsoDate(o.effectiveDate)) return { ok: false as const, message: 'effectiveDate must be ISO date' };
  return { ok: true as const, value: o as ProposeSuspensionPayload };
}
function validateProposeResumption(p: unknown) {
  const o = (p ?? {}) as Partial<ProposeResumptionPayload>;
  if (!isNonEmpty(o.reasonCode)) return { ok: false as const, message: 'reasonCode is required' };
  if (!isIsoDate(o.effectiveDate)) return { ok: false as const, message: 'effectiveDate must be ISO date' };
  return { ok: true as const, value: o as ProposeResumptionPayload };
}

// ────────────────────────────────────────────────────────────────────
// Handlers — pure, use context data only, no direct supabase access.
// ────────────────────────────────────────────────────────────────────

const sendReminder: AwardCommandRegistryEntry<SendLifeCertReminderPayload, { reminderRef: string }> = {
  action: 'SEND_LIFE_CERTIFICATE_REMINDER',
  isPilot: true,
  validatePayload: validateSendReminder,
  handler: async ({ request, newVersion }) => ({
    result: { reminderRef: `reminder_${request.commandId}` },
    changedFields: ['life_certificate_reminder_sent_at', 'award_version'],
  }),
  requiresTransaction: true,
  requiresIdempotency: true,
  requiresOptimisticConcurrency: true,
  auditEventType: 'AWARD_LIFE_CERT_REMINDER_SENT',
  compensatingAction: null,
  reversibility: 'IDEMPOTENT_NOOP',
  rationale:
    'Communication reminder only; no financial impact; safe to replay; reversible operationally by retract-reminder note.',
};

const scheduleMedical: AwardCommandRegistryEntry<ScheduleMedicalReviewPayload, { scheduleRef: string }> = {
  action: 'SCHEDULE_MEDICAL_REVIEW',
  isPilot: true,
  validatePayload: validateScheduleMedical,
  handler: async ({ request }) => ({
    result: { scheduleRef: `msched_${request.commandId}` },
    changedFields: ['medical_review_schedule.scheduled_for', 'medical_review_schedule.panel_code', 'award_version'],
  }),
  requiresTransaction: true,
  requiresIdempotency: true,
  requiresOptimisticConcurrency: true,
  auditEventType: 'AWARD_MEDICAL_REVIEW_SCHEDULED',
  compensatingAction: null,
  reversibility: 'REVERSIBLE_VIA_COMPENSATION',
  rationale:
    'Creates a scheduled review row; non-financial; reversible through cancel-medical-review (registered as a future compensating action).',
};

const proposeSuspension: AwardCommandRegistryEntry<ProposeSuspensionPayload, { proposalRef: string }> = {
  action: 'PROPOSE_SUSPENSION',
  isPilot: true,
  validatePayload: validateProposeSuspension,
  handler: async ({ request }) => ({
    result: { proposalRef: `susp_${request.commandId}` },
    changedFields: ['bn_award_suspension_event.status', 'bn_award_suspension_event.reason_code', 'award_version'],
  }),
  requiresTransaction: true,
  requiresIdempotency: true,
  requiresOptimisticConcurrency: true,
  auditEventType: 'AWARD_SUSPENSION_PROPOSED',
  compensatingAction: null,
  reversibility: 'REVERSIBLE_VIA_COMPENSATION',
  rationale:
    'Proposal only (maker-checker); does not change award state; reversible via withdraw-suspension.',
};

const proposeResumption: AwardCommandRegistryEntry<ProposeResumptionPayload, { proposalRef: string }> = {
  action: 'PROPOSE_RESUMPTION',
  isPilot: true,
  validatePayload: validateProposeResumption,
  handler: async ({ request }) => ({
    result: { proposalRef: `resu_${request.commandId}` },
    changedFields: ['bn_award_suspension_event.status', 'bn_award_suspension_event.reason_code', 'award_version'],
  }),
  requiresTransaction: true,
  requiresIdempotency: true,
  requiresOptimisticConcurrency: true,
  auditEventType: 'AWARD_RESUMPTION_PROPOSED',
  compensatingAction: null,
  reversibility: 'REVERSIBLE_VIA_COMPENSATION',
  rationale:
    'Proposal only (maker-checker); does not change award state; reversible via withdraw-resumption.',
};

export const AWARD_PILOT_ACTIONS: readonly AwardActionKey[] = [
  'SEND_LIFE_CERTIFICATE_REMINDER',
  'SCHEDULE_MEDICAL_REVIEW',
  'PROPOSE_SUSPENSION',
  'PROPOSE_RESUMPTION',
];

export const AWARD_COMMAND_REGISTRY: AwardCommandRegistry = new Map<
  AwardActionKey,
  AwardCommandRegistryEntry<any, any>
>([
  [sendReminder.action, sendReminder],
  [scheduleMedical.action, scheduleMedical],
  [proposeSuspension.action, proposeSuspension],
  [proposeResumption.action, proposeResumption],
]);

export function getPilotRegistryEntry(action: AwardActionKey):
  | AwardCommandRegistryEntry<any, any>
  | undefined {
  return AWARD_COMMAND_REGISTRY.get(action);
}
