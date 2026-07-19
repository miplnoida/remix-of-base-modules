/**
 * AW360-WAVE-1-C1 Stage D9 — Executed disaster-recovery attestation.
 *
 * Records the outcome of a real backup/restore drill against the pilot
 * datasets and certifies the resulting system meets replay-safety,
 * traceability, and scope guarantees.
 */
export type DRDataset =
  | 'AWARD_STATE'
  | 'IDEMPOTENCY_RECORDS'
  | 'COMMAND_OUTCOMES'
  | 'AUDITS'
  | 'RECONCILIATION_HISTORY'
  | 'INCIDENT_RECORDS'
  | 'PILOT_EVIDENCE'
  | 'PROVIDER_REFERENCES';

export const RUNTIME_DR_DATASETS: readonly DRDataset[] = [
  'AWARD_STATE', 'IDEMPOTENCY_RECORDS', 'COMMAND_OUTCOMES', 'AUDITS',
  'RECONCILIATION_HISTORY', 'INCIDENT_RECORDS', 'PILOT_EVIDENCE', 'PROVIDER_REFERENCES',
];

export interface DRRuntimeCertification {
  readonly backedUpDatasets: readonly DRDataset[];
  readonly restoredDatasets: readonly DRDataset[];
  readonly completedCommandsReplaySafe: boolean;
  readonly businessCommandsReExecuted: number;    // must be 0
  readonly auditRelationshipsIntact: boolean;
  readonly reconciliationSucceededAfterRestore: boolean;
  readonly providerReferencesTraceable: boolean;
  readonly killSwitchesSafeAfterRestore: boolean;
  readonly registryAndManifestCompatible: boolean;
  readonly drillDate: string;
  readonly owner: string;
}

export interface DRRuntimeReport {
  readonly passed: boolean;
  readonly failures: readonly string[];
}

export function evaluateRuntimeDR(cert: DRRuntimeCertification): DRRuntimeReport {
  const f: string[] = [];
  const backed = new Set(cert.backedUpDatasets);
  const restored = new Set(cert.restoredDatasets);
  for (const d of RUNTIME_DR_DATASETS) {
    if (!backed.has(d)) f.push(`not backed up: ${d}`);
    if (!restored.has(d)) f.push(`not restored: ${d}`);
  }
  if (!cert.completedCommandsReplaySafe) f.push('completed commands not replay-safe');
  if (cert.businessCommandsReExecuted !== 0) f.push(`business commands re-executed=${cert.businessCommandsReExecuted}`);
  if (!cert.auditRelationshipsIntact) f.push('audit relationships not intact');
  if (!cert.reconciliationSucceededAfterRestore) f.push('reconciliation failed after restore');
  if (!cert.providerReferencesTraceable) f.push('provider references not traceable');
  if (!cert.killSwitchesSafeAfterRestore) f.push('kill switches not safe');
  if (!cert.registryAndManifestCompatible) f.push('registry/manifest incompatible after restore');
  return { passed: f.length === 0, failures: f };
}
