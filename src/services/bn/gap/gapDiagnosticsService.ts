/**
 * BN Gap Modules — Diagnostics service.
 *
 * Extends Benefits Diagnostics with a consolidated snapshot of the gap-module
 * platform: registration, capability coverage, integration health, and
 * recent command failures.
 *
 * Read-only. Uses the injected `BenefitsGapApiClient` for module rollout;
 * counts and health probes are pulled from Supabase read queries.
 *
 * IMPORTANT: This service is NEVER used for mutation.
 */
import type { BenefitsGapApiClient } from './benefitsGapApiClient';
import type { BnGapModuleCode } from '@/types/bn/gap/commandEnvelope';
import { BN_GAP_MODULES } from '@/types/bn/gap/moduleCodes';
import { BN_GAP_COMMAND_CAPABILITY, referencedCapabilities } from './gapCapabilityRegistry';
import { BN_GAP_INTEGRATION_FLOWS } from './contract-tests/integrationFlows';

export interface GapModuleDiagnosticRow {
  readonly moduleCode: BnGapModuleCode;
  readonly displayName: string;
  readonly exists: boolean;
  readonly isEnabled: boolean;
  readonly routesEnabled: boolean;
  readonly actionsEnabled: boolean;
  readonly showInMenu: boolean;
  readonly rolloutState: string;
  readonly commandCount: number;
  readonly capabilityCount: number;
  readonly integrationFlows: number;
}

export interface GapDiagnosticsSnapshot {
  readonly capturedAt: string;
  readonly contractVersion: string;
  readonly commandEndpoint: 'bn-gap-command';
  readonly commandEndpointHealthy: boolean | 'unknown';
  readonly modules: readonly GapModuleDiagnosticRow[];
  readonly totals: {
    readonly modules: number;
    readonly enabledModules: number;
    readonly actionsEnabledModules: number;
    readonly commands: number;
    readonly capabilities: number;
    readonly integrationFlows: number;
  };
  readonly integrations: {
    readonly workflow: 'wired' | 'not_wired' | 'unknown';
    readonly communicationHub: 'wired' | 'not_wired' | 'unknown';
    readonly finance: 'wired' | 'not_wired' | 'unknown';
    readonly legal: 'wired' | 'not_wired' | 'unknown';
    readonly dms: 'wired' | 'not_wired' | 'unknown';
    readonly ipModule: 'read_only' | 'unknown';
  };
  readonly recentCommandFailures: number | 'unknown';
  readonly idempotencyConflicts: number | 'unknown';
  readonly staleVersionConflicts: number | 'unknown';
  readonly unresolvedExceptions: number | 'unknown';
}

export const BN_GAP_CONTRACT_VERSION = 'v0.2.0-integration-certification';

function countCommandsPerModule(module: BnGapModuleCode): number {
  return Object.entries(BN_GAP_COMMAND_CAPABILITY).filter(([, cap]) =>
    cap.startsWith(`${module}:`),
  ).length;
}

function countCapabilitiesPerModule(module: BnGapModuleCode): number {
  return referencedCapabilities().filter((c) => c.startsWith(`${module}:`)).length;
}

function countFlowsPerModule(module: BnGapModuleCode): number {
  return BN_GAP_INTEGRATION_FLOWS.filter((f) => f.modulesInvolved.includes(module)).length;
}

/**
 * Compose a snapshot. Health checks that need DB access are stubbed to
 * `'unknown'` when no adapter is supplied; wire real probes at the call site.
 */
export async function buildGapDiagnosticsSnapshot(
  api: Pick<BenefitsGapApiClient, 'getAllModuleRolloutStates'>,
): Promise<GapDiagnosticsSnapshot> {
  const rolloutStates = await api.getAllModuleRolloutStates();

  const modules: GapModuleDiagnosticRow[] = BN_GAP_MODULES.map((m) => {
    const rs = rolloutStates.find((r) => r.moduleCode === m.code);
    return {
      moduleCode: m.code,
      displayName: m.displayName,
      exists: rs?.exists ?? false,
      isEnabled: rs?.isEnabled ?? false,
      routesEnabled: rs?.routesEnabled ?? false,
      actionsEnabled: rs?.actionsEnabled ?? false,
      showInMenu: rs?.showInMenu ?? false,
      rolloutState: rs?.rolloutState ?? 'unknown',
      commandCount: countCommandsPerModule(m.code),
      capabilityCount: countCapabilitiesPerModule(m.code),
      integrationFlows: countFlowsPerModule(m.code),
    };
  });

  return {
    capturedAt: new Date().toISOString(),
    contractVersion: BN_GAP_CONTRACT_VERSION,
    commandEndpoint: 'bn-gap-command',
    commandEndpointHealthy: 'unknown',
    modules,
    totals: {
      modules: modules.length,
      enabledModules: modules.filter((m) => m.isEnabled).length,
      actionsEnabledModules: modules.filter((m) => m.actionsEnabled).length,
      commands: Object.keys(BN_GAP_COMMAND_CAPABILITY).length,
      capabilities: referencedCapabilities().length,
      integrationFlows: BN_GAP_INTEGRATION_FLOWS.length,
    },
    integrations: {
      workflow: 'unknown',
      communicationHub: 'unknown',
      finance: 'unknown',
      legal: 'unknown',
      dms: 'unknown',
      ipModule: 'read_only',
    },
    recentCommandFailures: 'unknown',
    idempotencyConflicts: 'unknown',
    staleVersionConflicts: 'unknown',
    unresolvedExceptions: 'unknown',
  };
}
