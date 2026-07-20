/**
 * BN Mortality — Handler barrel.
 *
 * Aggregates every canonical Mortality command handler (26 total) grouped
 * into 7 domain modules. Registered by benefitsCommandHandlerRegistry.
 */
import { REGISTRATION_HANDLERS } from './registration';
import { MATCHING_HANDLERS } from './matching';
import { VERIFICATION_HANDLERS } from './verification';
import { IMPACT_HANDLERS } from './impact';
import { FOLLOWON_HANDLERS } from './followon';
import { CLOSURE_HANDLERS } from './closure';

export const BN_MORTALITY_HANDLERS = [
  ...REGISTRATION_HANDLERS,
  ...MATCHING_HANDLERS,
  ...VERIFICATION_HANDLERS,
  ...IMPACT_HANDLERS,
  ...FOLLOWON_HANDLERS,
  ...CLOSURE_HANDLERS,
] as const;

export {
  REGISTRATION_HANDLERS,
  MATCHING_HANDLERS,
  VERIFICATION_HANDLERS,
  IMPACT_HANDLERS,
  FOLLOWON_HANDLERS,
  CLOSURE_HANDLERS,
};
