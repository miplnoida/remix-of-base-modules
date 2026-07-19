/**
 * BN Gap Modules — Public barrel.
 *
 * Consumers of the gap-modules foundation import from `@/services/bn/gap`
 * ONLY. The concrete adapter is chosen here; swapping to
 * `DotNetBenefitsGapAdapter` in the future is a one-line change.
 */
import { SupabaseBenefitsCommandAdapter } from './supabaseBenefitsCommandAdapter';
import type { BenefitsCommandClient } from './benefitsCommandClient';

export type {
  BenefitsCommandClient,
  BnGapListQuery,
  BnGapListResult,
  BnGapModuleRolloutState,
} from './benefitsCommandClient';
export type { BnGapCapability, BnGapCapabilityBaseVerb } from './benefitsCapabilityRegistry';
export {
  BN_GAP_CAPABILITIES,
  BN_GAP_BASE_CAPABILITIES,
  BN_GAP_EXTENDED_CAPABILITIES,
  BN_GAP_COMMAND_CAPABILITY,
  requiredCapabilityFor,
  referencedCapabilities,
} from './benefitsCapabilityRegistry';
export { createBenefitsCommandPipeline } from './benefitsCommandPipeline';
export type {
  CommandHandler,
  HandlerRegistry,
  BenefitsCommandPipelineDeps,
  ModuleRegistrationStore,
  RoleCapabilityChecker,
  IdempotencyStore,
  VersionStore,
  AuditWriter,
  TransactionRunner,
  TelemetrySink,
} from './benefitsCommandPipeline';
export { benefitsCommandHandlerRegistry, BN_GAP_REGISTERED_COMMANDS } from './benefitsCommandHandlerRegistry';
export { BN_GAP_PING_HANDLER } from './pingCommand';
export type { BnGapPingPayload, BnGapPingData } from './pingCommand';

let singleton: BenefitsCommandClient | null = null;

/** Default DI. Overridable in tests via `setBenefitsCommandClient`. */
export function getBenefitsCommandClient(): BenefitsCommandClient {
  if (!singleton) singleton = new SupabaseBenefitsCommandAdapter();
  return singleton;
}

export function setBenefitsCommandClient(client: BenefitsCommandClient | null): void {
  singleton = client;
}
