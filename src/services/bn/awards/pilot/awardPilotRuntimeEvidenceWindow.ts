/**
 * AW360-WAVE-1-C1 Stage D9 — Controlled runtime evidence window.
 *
 * Represents the operational envelope inside which real pilot commands are
 * accepted and evidence is collected. Runtime attestation moves from
 * NOT_STARTED → IN_PROGRESS only after every field here is approved by the
 * named owners.
 */
import type { AwardActionKey } from '../awardActionAvailability';

export interface RuntimeEvidenceWindowConfig {
  readonly approvedTenant: string;
  readonly approvedUsers: readonly string[];
  readonly approvedRoles: readonly string[];
  readonly startAt: string;
  readonly endAt: string;
  readonly minimumDurationHours: number;
  readonly maxDailyCommandsByAction: Readonly<Record<AwardActionKey, number>>;
  readonly minimumEvidenceVolumeByAction: Readonly<Record<AwardActionKey, number>>;
  readonly reconciliationFrequencyHours: number;
  readonly businessReviewFrequencyDays: number;
  readonly killSwitchDrillDate: string;
  readonly providerDegradationDrillDate: string;
  readonly technicalOwner: string;
  readonly businessOwner: string;
  readonly operationsOwner: string;
  readonly securityReviewer: string;
  readonly incidentOwner: string;
  readonly promotionReviewDate: string;
  readonly approvedAt: string | null;
  readonly approvedBy: readonly string[];  // technical, business, operations, security
}

export interface EvidenceWindowValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

const REQUIRED_APPROVERS = ['TECHNICAL', 'BUSINESS', 'OPERATIONS', 'SECURITY'] as const;

export function validateRuntimeEvidenceWindow(cfg: RuntimeEvidenceWindowConfig): EvidenceWindowValidationResult {
  const errors: string[] = [];
  if (!cfg.approvedTenant) errors.push('approvedTenant missing');
  if (cfg.approvedUsers.length === 0) errors.push('approvedUsers empty');
  if (new Date(cfg.endAt).getTime() <= new Date(cfg.startAt).getTime()) errors.push('endAt must be after startAt');
  const durationHours = (new Date(cfg.endAt).getTime() - new Date(cfg.startAt).getTime()) / 3.6e6;
  if (durationHours < cfg.minimumDurationHours) errors.push(`duration ${durationHours}h < minimum ${cfg.minimumDurationHours}h`);
  if (cfg.reconciliationFrequencyHours <= 0) errors.push('reconciliationFrequencyHours must be > 0');
  if (cfg.businessReviewFrequencyDays <= 0) errors.push('businessReviewFrequencyDays must be > 0');
  for (const o of ['technicalOwner', 'businessOwner', 'operationsOwner', 'securityReviewer', 'incidentOwner'] as const) {
    if (!cfg[o]) errors.push(`${o} missing`);
  }
  for (const approver of REQUIRED_APPROVERS) {
    if (!cfg.approvedBy.includes(approver)) errors.push(`missing approver: ${approver}`);
  }
  if (!cfg.approvedAt) errors.push('approvedAt missing');
  return { valid: errors.length === 0, errors };
}

export interface EvidenceWindowProgress {
  readonly elapsedHours: number;
  readonly minimumDurationHours: number;
  readonly requiredDrillsComplete: boolean;
  readonly minimumVolumeMetByAction: Readonly<Record<AwardActionKey, boolean>>;
  readonly complete: boolean;
}

export interface EvidenceWindowProgressInput {
  readonly config: RuntimeEvidenceWindowConfig;
  readonly nowIso: string;
  readonly killSwitchDrillCompleted: boolean;
  readonly providerDegradationDrillCompleted: boolean;
  readonly volumeByAction: Readonly<Record<AwardActionKey, number>>;
}

export function evaluateEvidenceWindowProgress(input: EvidenceWindowProgressInput): EvidenceWindowProgress {
  const { config } = input;
  const elapsedHours = Math.max(0, (new Date(input.nowIso).getTime() - new Date(config.startAt).getTime()) / 3.6e6);
  const volumeMet: Record<string, boolean> = {};
  for (const [action, min] of Object.entries(config.minimumEvidenceVolumeByAction)) {
    volumeMet[action] = (input.volumeByAction[action as AwardActionKey] ?? 0) >= min;
  }
  const drillsDone = input.killSwitchDrillCompleted && input.providerDegradationDrillCompleted;
  const complete = elapsedHours >= config.minimumDurationHours
    && drillsDone
    && Object.values(volumeMet).every(Boolean);
  return {
    elapsedHours,
    minimumDurationHours: config.minimumDurationHours,
    requiredDrillsComplete: drillsDone,
    minimumVolumeMetByAction: volumeMet as Record<AwardActionKey, boolean>,
    complete,
  };
}
