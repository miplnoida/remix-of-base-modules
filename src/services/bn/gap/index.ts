/**
 * BN Gap Modules — Public barrel.
 *
 * Consumers of the gap-modules foundation import from `@/services/bn/gap`
 * ONLY. The concrete adapter is chosen here; swapping to
 * `DotNetBenefitsGapAdapter` in the future is a one-line change.
 */
import { SupabaseBenefitsGapAdapter } from './supabaseBenefitsGapAdapter';
import type { BenefitsGapApiClient } from './benefitsGapApiClient';

export type {
  BenefitsGapApiClient,
  BnGapListQuery,
  BnGapListResult,
  BnGapModuleRolloutState,
} from './benefitsGapApiClient';
export type { BnGapCapability, BnGapCapabilityBaseVerb } from './gapCapabilityRegistry';
export {
  BN_GAP_CAPABILITIES,
  BN_GAP_BASE_CAPABILITIES,
  BN_GAP_EXTENDED_CAPABILITIES,
  BN_GAP_COMMAND_CAPABILITY,
  requiredCapabilityFor,
  referencedCapabilities,
} from './gapCapabilityRegistry';
export { createGapCommandPipeline } from './gapCommandPipeline';
export type {
  CommandHandler,
  HandlerRegistry,
  GapCommandPipelineDeps,
  ModuleRegistrationStore,
  RoleCapabilityChecker,
  IdempotencyStore,
  VersionStore,
  AuditWriter,
  TransactionRunner,
  TelemetrySink,
} from './gapCommandPipeline';
export { bnGapHandlerRegistry, BN_GAP_REGISTERED_COMMANDS } from './gapHandlerRegistry';
export { BN_GAP_PING_HANDLER } from './pingCommand';
export type { BnGapPingPayload, BnGapPingData } from './pingCommand';

let singleton: BenefitsGapApiClient | null = null;

/** Default DI. Overridable in tests via `setBenefitsGapApiClient`. */
export function getBenefitsGapApiClient(): BenefitsGapApiClient {
  if (!singleton) singleton = new SupabaseBenefitsGapAdapter();
  return singleton;
}

export function setBenefitsGapApiClient(client: BenefitsGapApiClient | null): void {
  singleton = client;
}
