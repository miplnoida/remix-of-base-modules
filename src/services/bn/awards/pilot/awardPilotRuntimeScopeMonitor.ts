/**
 * AW360-WAVE-1-C1 Stage D9 — Runtime scope drift monitor.
 *
 * Periodically re-verifies the frozen pilot scope inside the running
 * application, cross-checks against the deployed manifest, and raises an
 * immediate alert with cohort-expansion suspension when drift appears.
 */
import type { AwardActionKey } from '../awardActionAvailability';
import { APPROVED_PILOT_ACTIONS } from './awardPilotScopeFreeze';
import { AWARD_COMMAND_REGISTRY } from './awardPilotHandlers';

export type ScopeDriftKind =
  | 'REGISTRY_SIZE_DRIFT'
  | 'UNAPPROVED_HANDLER'
  | 'MISSING_APPROVED_HANDLER'
  | 'INVENTORY_REGISTRY_MISMATCH'
  | 'MANIFEST_RUNTIME_MISMATCH';

export interface ScopeDriftFinding {
  readonly kind: ScopeDriftKind;
  readonly detail: string;
}

export interface RuntimeScopeCheckInput {
  readonly runtimeManifestStatus: string;
  readonly runtimeManifestVersion: string;
  readonly expectedManifestStatus: string;
  readonly expectedManifestVersion: string;
  readonly runtimeActions: readonly AwardActionKey[];
  readonly inventoryActions: readonly AwardActionKey[];
}

export interface RuntimeScopeCheckResult {
  readonly checkedAt: string;
  readonly frozen: boolean;
  readonly findings: readonly ScopeDriftFinding[];
  readonly cohortExpansionAllowed: boolean;
  readonly requiredAlert: boolean;
}

export function runRuntimeScopeCheck(input: RuntimeScopeCheckInput, at: string = new Date().toISOString()): RuntimeScopeCheckResult {
  const findings: ScopeDriftFinding[] = [];
  const approved = new Set<string>(APPROVED_PILOT_ACTIONS);
  const runtime = new Set<string>(input.runtimeActions);
  const inventory = new Set<string>(input.inventoryActions);

  if (input.runtimeActions.length !== APPROVED_PILOT_ACTIONS.length)
    findings.push({ kind: 'REGISTRY_SIZE_DRIFT', detail: `size=${input.runtimeActions.length} expected=${APPROVED_PILOT_ACTIONS.length}` });
  for (const a of runtime) if (!approved.has(a)) findings.push({ kind: 'UNAPPROVED_HANDLER', detail: a });
  for (const a of approved) if (!runtime.has(a)) findings.push({ kind: 'MISSING_APPROVED_HANDLER', detail: a });
  for (const a of runtime) if (!inventory.has(a)) findings.push({ kind: 'INVENTORY_REGISTRY_MISMATCH', detail: `runtime action ${a} not in inventory` });
  for (const a of inventory) if (!runtime.has(a)) findings.push({ kind: 'INVENTORY_REGISTRY_MISMATCH', detail: `inventory action ${a} not in runtime` });
  if (input.runtimeManifestStatus !== input.expectedManifestStatus || input.runtimeManifestVersion !== input.expectedManifestVersion)
    findings.push({ kind: 'MANIFEST_RUNTIME_MISMATCH',
      detail: `runtime=${input.runtimeManifestStatus}/${input.runtimeManifestVersion} expected=${input.expectedManifestStatus}/${input.expectedManifestVersion}` });

  const frozen = findings.length === 0;
  return {
    checkedAt: at,
    frozen,
    findings,
    cohortExpansionAllowed: frozen,
    requiredAlert: !frozen,
  };
}

/** Convenience helper: uses the in-process AWARD_COMMAND_REGISTRY as the runtime source. */
export function runInProcessScopeCheck(
  runtimeManifestStatus: string,
  runtimeManifestVersion: string,
  expectedManifestStatus: string,
  expectedManifestVersion: string,
  inventoryActions: readonly AwardActionKey[],
): RuntimeScopeCheckResult {
  const runtimeActions = [...AWARD_COMMAND_REGISTRY.keys()] as AwardActionKey[];
  return runRuntimeScopeCheck({
    runtimeManifestStatus, runtimeManifestVersion,
    expectedManifestStatus, expectedManifestVersion,
    runtimeActions, inventoryActions,
  });
}
