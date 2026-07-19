/**
 * AW360-WAVE-1-C1 Stage D9 — Read-only runtime attestation diagnostics.
 *
 * Aggregates D9 substrates into a non-sensitive snapshot for admin
 * diagnostics. No production records, PII, tokens, secrets, or runbook
 * actions are exposed.
 */
import { AWARD360_RUNTIME_ATTESTATION, AWARD360_RUNTIME_ATTESTATION_VERSION } from './awardRuntimeAttestation';
import { REQUIRED_TENANT_POLICY_SCENARIOS } from './awardPilotDatabaseVerification';
import { RUNTIME_MI_EXPECTATIONS } from './awardPilotRuntimeMultiInstance';
import { REQUIRED_ALERT_INSTANCES } from './awardPilotAlertDelivery';
import { REQUIRED_OPERATIONAL_DRILLS } from './awardPilotOperationalDrills';
import { RUNTIME_DR_DATASETS } from './awardPilotRuntimeDR';
import { RUNTIME_SECURITY_CONTROLS } from './awardPilotRuntimeSecurity';
import { RUNTIME_SLO_DEFAULTS } from './awardPilotRuntimeSlo';
import { ROLLOUT_PHASE_ORDER } from './awardPilotNamedUserRollout';
import { LIVE_EVIDENCE_REQUIRED_FIELDS } from './awardPilotLiveEvidence';
import { PRODUCTION_ROLLBACK_RUNBOOK } from './awardPilotProductionRollback';

export const AWARD_PILOT_D9_DIAGNOSTICS = {
  runtimeAttestation: AWARD360_RUNTIME_ATTESTATION,
  runtimeAttestationVersion: AWARD360_RUNTIME_ATTESTATION_VERSION,
  requiredTenantPolicyScenarios: REQUIRED_TENANT_POLICY_SCENARIOS,
  runtimeMultiInstanceScenarios: RUNTIME_MI_EXPECTATIONS.map((e) => e.scenario),
  requiredAlertInstances: REQUIRED_ALERT_INSTANCES,
  requiredOperationalDrills: REQUIRED_OPERATIONAL_DRILLS,
  drRequiredDatasets: RUNTIME_DR_DATASETS,
  runtimeSecurityControls: RUNTIME_SECURITY_CONTROLS,
  runtimeSloThresholds: RUNTIME_SLO_DEFAULTS,
  rolloutPhaseOrder: ROLLOUT_PHASE_ORDER,
  liveEvidenceRequiredFieldCount: LIVE_EVIDENCE_REQUIRED_FIELDS.length,
  preservationRollbackStepCount: PRODUCTION_ROLLBACK_RUNBOOK.length,
  readOnly: true,
} as const;
