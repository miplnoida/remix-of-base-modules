/**
 * AW360-WAVE-1-C1 Stage D9 — Deployed-environment verification.
 *
 * Captures the identity of the running environment and validates that the
 * deployed artefacts match the certified code manifest. Activation MUST
 * fail on any drift.
 */
import type { AwardActionKey } from '../awardActionAvailability';
import { APPROVED_PILOT_ACTIONS } from './awardPilotScopeFreeze';
import { AWARD_COMMAND_REGISTRY } from './awardPilotHandlers';

export interface DeployedEnvironmentSnapshot {
  readonly environment: 'pilot' | 'staging' | 'production';
  readonly deploymentId: string;
  readonly commitSha: string;
  readonly manifestStatus: string;
  readonly manifestVersion: string;
  readonly migrationVersion: string;
  readonly databaseInstance: string;
  readonly commandRegistrySize: number;
  readonly registeredActions: readonly AwardActionKey[];
  readonly killSwitchState: 'ON' | 'OFF';
  readonly pilotCohort: readonly string[];
  readonly telemetryDestination: string;
  readonly reconciliationSchedulerState: 'ACTIVE' | 'PAUSED' | 'MISSING';
  readonly alertDestinations: readonly string[];
  readonly diagnosticsExposeMutations: boolean;
  readonly recordedAt: string;
}

export type DeploymentVerificationFailureCode =
  | 'COMMIT_MANIFEST_MISMATCH'
  | 'MIGRATION_MISSING'
  | 'REGISTRY_DRIFT'
  | 'UNAPPROVED_HANDLER'
  | 'KILL_SWITCH_STATE_INVALID'
  | 'DIAGNOSTICS_EXPOSE_MUTATIONS'
  | 'RECONCILIATION_SCHEDULER_MISSING'
  | 'ALERT_DESTINATIONS_EMPTY'
  | 'TELEMETRY_DESTINATION_MISSING';

export interface DeploymentVerificationResult {
  readonly passed: boolean;
  readonly failures: readonly { code: DeploymentVerificationFailureCode; detail: string }[];
}

export interface DeploymentVerificationInputs {
  readonly snapshot: DeployedEnvironmentSnapshot;
  readonly expectedManifestStatus: string;
  readonly expectedManifestVersion: string;
  readonly expectedCommitSha: string;
  readonly expectedMigrationVersion: string;
  readonly expectedKillSwitchStartState: 'ON' | 'OFF';
}

export function verifyDeployedEnvironment(
  input: DeploymentVerificationInputs,
): DeploymentVerificationResult {
  const { snapshot: s } = input;
  const failures: { code: DeploymentVerificationFailureCode; detail: string }[] = [];

  if (s.manifestStatus !== input.expectedManifestStatus || s.manifestVersion !== input.expectedManifestVersion
      || s.commitSha !== input.expectedCommitSha) {
    failures.push({ code: 'COMMIT_MANIFEST_MISMATCH',
      detail: `expected ${input.expectedManifestStatus}/${input.expectedManifestVersion}@${input.expectedCommitSha}, got ${s.manifestStatus}/${s.manifestVersion}@${s.commitSha}` });
  }
  if (s.migrationVersion !== input.expectedMigrationVersion) {
    failures.push({ code: 'MIGRATION_MISSING', detail: `expected ${input.expectedMigrationVersion}, got ${s.migrationVersion}` });
  }

  const approved = new Set<string>(APPROVED_PILOT_ACTIONS);
  const registered = new Set<string>(s.registeredActions);
  const extra = [...registered].filter((a) => !approved.has(a));
  const missing = [...approved].filter((a) => !registered.has(a));
  if (extra.length > 0) failures.push({ code: 'UNAPPROVED_HANDLER', detail: `extra: ${extra.join(', ')}` });
  if (missing.length > 0 || s.commandRegistrySize !== APPROVED_PILOT_ACTIONS.length) {
    failures.push({ code: 'REGISTRY_DRIFT',
      detail: `size=${s.commandRegistrySize} missing=[${missing.join(', ')}]` });
  }
  if (s.killSwitchState !== input.expectedKillSwitchStartState) {
    failures.push({ code: 'KILL_SWITCH_STATE_INVALID',
      detail: `expected ${input.expectedKillSwitchStartState}, got ${s.killSwitchState}` });
  }
  if (s.diagnosticsExposeMutations) {
    failures.push({ code: 'DIAGNOSTICS_EXPOSE_MUTATIONS', detail: 'diagnostics must remain read-only' });
  }
  if (s.reconciliationSchedulerState === 'MISSING') {
    failures.push({ code: 'RECONCILIATION_SCHEDULER_MISSING', detail: 'scheduler must be ACTIVE or PAUSED' });
  }
  if (s.alertDestinations.length === 0) {
    failures.push({ code: 'ALERT_DESTINATIONS_EMPTY', detail: 'at least one named alert destination is required' });
  }
  if (!s.telemetryDestination.trim()) {
    failures.push({ code: 'TELEMETRY_DESTINATION_MISSING', detail: 'telemetry destination must be configured' });
  }

  return { passed: failures.length === 0, failures };
}

/** Cross-checks the local process's command registry against the approved list. */
export function assertLocalRegistryMatchesApproved(): void {
  const size = AWARD_COMMAND_REGISTRY.size;
  const approved = new Set<string>(APPROVED_PILOT_ACTIONS);
  const local = new Set<string>(AWARD_COMMAND_REGISTRY.keys());
  const extra = [...local].filter((a) => !approved.has(a));
  const missing = [...approved].filter((a) => !local.has(a));
  if (size !== APPROVED_PILOT_ACTIONS.length || extra.length || missing.length) {
    throw new Error(`Local registry drift: size=${size} extra=[${extra.join(',')}] missing=[${missing.join(',')}]`);
  }
}
