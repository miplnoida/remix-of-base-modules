/**
 * AW360-WAVE-1-C1 Stage D8 — Read-only Wave 1 diagnostics summary.
 *
 * Aggregates the pilot substrates into a single non-sensitive snapshot for
 * the admin diagnostics panel. No production records, PII, secrets, or
 * runbook actions are exposed.
 */
import { AWARD_PILOT_SLO_THRESHOLDS } from './awardPilotSlo';
import { AWARD_PILOT_EVIDENCE_WINDOW } from './awardPilotEvidenceWindow';
import { AWARD_PILOT_RATE_LIMIT_RULES } from './awardPilotRateLimiter';
import { VOLUME_RAMP_STAGE_ORDER } from './awardPilotVolumeRamp';
import { AWARD_PILOT_MULTI_INSTANCE_SCENARIOS } from './awardPilotMultiInstance';
import { DR_REQUIRED_DATASETS } from './awardPilotDisasterRecovery';
import { SECURITY_REQUIRED_CONTROLS } from './awardPilotSecurityCertification';
import { PILOT_IDEMPOTENCY_MIGRATION } from './awardPilotSupabaseIdempotency';
import { APPROVED_PILOT_ACTIONS } from './awardPilotScopeFreeze';

export const AWARD_PILOT_WAVE1_DIAGNOSTICS = {
  idempotencyMigration: PILOT_IDEMPOTENCY_MIGRATION,
  approvedActions: APPROVED_PILOT_ACTIONS,
  evidenceWindow: AWARD_PILOT_EVIDENCE_WINDOW,
  sloThresholds: AWARD_PILOT_SLO_THRESHOLDS,
  rateLimitRuleCount: AWARD_PILOT_RATE_LIMIT_RULES.length,
  volumeRampStages: VOLUME_RAMP_STAGE_ORDER,
  multiInstanceScenarios: AWARD_PILOT_MULTI_INSTANCE_SCENARIOS.map((s) => s.id),
  drRequiredDatasets: DR_REQUIRED_DATASETS,
  securityControls: SECURITY_REQUIRED_CONTROLS,
} as const;
