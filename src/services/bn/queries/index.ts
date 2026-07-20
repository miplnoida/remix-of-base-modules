import { SupabaseBenefitsQueryAdapter } from './supabaseBenefitsQueryAdapter';
import type { BenefitsQueryClient } from './benefitsQueryClient';

export type { BenefitsQueryClient } from './benefitsQueryClient';
export { buildQueryEnvelope } from './benefitsQueryClient';
export { SupabaseBenefitsQueryAdapter } from './supabaseBenefitsQueryAdapter';
export {
  BN_BENEFITS_QUERY_REGISTRY,
  getBenefitsQueryDescriptor,
} from './benefitsQueryRegistry';
export type { BnBenefitsQueryDescriptor } from './benefitsQueryRegistry';

let singleton: BenefitsQueryClient | null = null;

export function getBenefitsQueryClient(): BenefitsQueryClient {
  if (!singleton) singleton = new SupabaseBenefitsQueryAdapter();
  return singleton;
}

export function setBenefitsQueryClient(client: BenefitsQueryClient | null): void {
  singleton = client;
}
