/**
 * AW360-WAVE-1-C1 Stage D8 — Disaster-recovery certification.
 *
 * Verifies that after a backup/restore of the pilot substrates, completed
 * commands remain replay-safe, idempotency results remain available, and
 * no completed command re-executes.
 */

export type DrDataset =
  | 'AWARD_STATE'
  | 'IDEMPOTENCY_RECORDS'
  | 'COMMAND_RECORDS'
  | 'AUDIT_RECORDS'
  | 'PILOT_EVIDENCE'
  | 'INCIDENT_RECORDS'
  | 'RECONCILIATION_HISTORY'
  | 'PROVIDER_REFERENCES';

export const DR_REQUIRED_DATASETS: readonly DrDataset[] = [
  'AWARD_STATE',
  'IDEMPOTENCY_RECORDS',
  'COMMAND_RECORDS',
  'AUDIT_RECORDS',
  'PILOT_EVIDENCE',
  'INCIDENT_RECORDS',
  'RECONCILIATION_HISTORY',
  'PROVIDER_REFERENCES',
];

export interface DrDrillResult {
  readonly drillId: string;
  readonly executedAt: string;
  readonly datasetsBackedUp: readonly DrDataset[];
  readonly datasetsRestored: readonly DrDataset[];
  readonly completedCommandsReplaySafe: boolean;
  readonly idempotencyResultsAvailable: boolean;
  readonly reconciliationSucceeds: boolean;
  readonly noCompletedCommandReExecuted: boolean;
  readonly killSwitchDefaultsSafe: boolean;
  readonly manifestRegistryCompatible: boolean;
}

export interface DrCertification {
  readonly passed: boolean;
  readonly missingDatasets: readonly DrDataset[];
  readonly failedInvariants: readonly string[];
}

export function certifyDrDrill(r: DrDrillResult): DrCertification {
  const missing = DR_REQUIRED_DATASETS.filter(
    (d) => !r.datasetsBackedUp.includes(d) || !r.datasetsRestored.includes(d),
  );
  const failed: string[] = [];
  if (!r.completedCommandsReplaySafe) failed.push('COMPLETED_COMMANDS_NOT_REPLAY_SAFE');
  if (!r.idempotencyResultsAvailable) failed.push('IDEMPOTENCY_RESULTS_LOST');
  if (!r.reconciliationSucceeds) failed.push('RECONCILIATION_FAILED_POST_RESTORE');
  if (!r.noCompletedCommandReExecuted) failed.push('COMPLETED_COMMAND_RE_EXECUTED');
  if (!r.killSwitchDefaultsSafe) failed.push('KILL_SWITCH_UNSAFE_DEFAULT');
  if (!r.manifestRegistryCompatible) failed.push('MANIFEST_REGISTRY_INCOMPATIBLE');
  return { passed: missing.length === 0 && failed.length === 0, missingDatasets: missing, failedInvariants: failed };
}
