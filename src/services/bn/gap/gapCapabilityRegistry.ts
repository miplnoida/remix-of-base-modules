/**
 * BN Gap Modules — Granular capability registry.
 *
 * `benefits_management` is TOO COARSE for the gap modules. Each module owns
 * its own read, write, decide and admin capabilities. Server-side command
 * authorisation walks this map to derive the required capability from
 * `commandName` and the caller's roles are checked against
 * `role_permissions` (existing platform tables).
 */
import type { BnGapModuleCode } from '@/types/bn/gap/commandEnvelope';

export type BnGapCapabilityVerb = 'read' | 'write' | 'decide' | 'admin';

/** Fully-qualified capability id: `{module}:{verb}`. */
export type BnGapCapability = `${BnGapModuleCode}:${BnGapCapabilityVerb}`;

export const BN_GAP_CAPABILITIES: readonly BnGapCapability[] = [
  'bn_mortality:read', 'bn_mortality:write', 'bn_mortality:decide', 'bn_mortality:admin',
  'bn_overpayments:read', 'bn_overpayments:write', 'bn_overpayments:decide', 'bn_overpayments:admin',
  'bn_appeals:read', 'bn_appeals:write', 'bn_appeals:decide', 'bn_appeals:admin',
  'bn_means_tests:read', 'bn_means_tests:write', 'bn_means_tests:decide', 'bn_means_tests:admin',
  'bn_risk_management:read', 'bn_risk_management:write', 'bn_risk_management:decide', 'bn_risk_management:admin',
  'bn_uprating:read', 'bn_uprating:write', 'bn_uprating:decide', 'bn_uprating:admin',
] as const;

/**
 * Command → required capability. Every registered command MUST appear here
 * or the pipeline denies with `CAPABILITY_UNMAPPED` (fail-closed).
 */
export const BN_GAP_COMMAND_CAPABILITY: Readonly<Record<string, BnGapCapability>> = {
  // Programme foundation — harmless proof command.
  BN_GAP_PING: 'bn_mortality:read',
} as const;

export function requiredCapabilityFor(commandName: string): BnGapCapability | null {
  return BN_GAP_COMMAND_CAPABILITY[commandName] ?? null;
}
