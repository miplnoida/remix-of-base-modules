/**
 * BN Uprating — Policy type enums and exception codes (Slice 1).
 */

export type BnUpratingPolicyType =
  | 'PERCENTAGE'
  | 'FIXED_AMOUNT'
  | 'INDEX_FACTOR'
  | 'PERCENTAGE_PLUS_FIXED'
  | 'TIERED'
  | 'FORMULA_DRIVEN'
  | 'MANUAL_IMPORT';

export const BN_UPRATING_POLICY_TYPES: readonly BnUpratingPolicyType[] = [
  'PERCENTAGE',
  'FIXED_AMOUNT',
  'INDEX_FACTOR',
  'PERCENTAGE_PLUS_FIXED',
  'TIERED',
  'FORMULA_DRIVEN',
  'MANUAL_IMPORT',
] as const;

export type BnUpratingRoundingMode =
  | 'NONE'
  | 'NEAREST_1'
  | 'NEAREST_10'
  | 'NEAREST_100'
  | 'DOWN'
  | 'UP'
  | 'HALF_EVEN';

export type BnUpratingExceptionCode =
  | 'MISSING_PRODUCT_VERSION'
  | 'UNSUPPORTED_FREQUENCY'
  | 'SUSPENDED_AWARD'
  | 'TERMINATED_AWARD'
  | 'INVALID_BASE_AMOUNT'
  | 'CONFLICTING_RATE_HISTORY'
  | 'PENDING_APPEAL'
  | 'PENDING_MORTALITY_EVENT'
  | 'UNRESOLVED_OVERPAYMENT_POLICY_CONFLICT'
  | 'PAYMENT_ALREADY_ISSUED_FOR_PERIOD'
  | 'MISSING_PAYMENT_PROFILE'
  | 'CONCURRENT_AWARD_AMENDMENT'
  | 'STALE_ROW_VERSION';

export const BN_UPRATING_EXCEPTION_CODES: readonly BnUpratingExceptionCode[] = [
  'MISSING_PRODUCT_VERSION',
  'UNSUPPORTED_FREQUENCY',
  'SUSPENDED_AWARD',
  'TERMINATED_AWARD',
  'INVALID_BASE_AMOUNT',
  'CONFLICTING_RATE_HISTORY',
  'PENDING_APPEAL',
  'PENDING_MORTALITY_EVENT',
  'UNRESOLVED_OVERPAYMENT_POLICY_CONFLICT',
  'PAYMENT_ALREADY_ISSUED_FOR_PERIOD',
  'MISSING_PAYMENT_PROFILE',
  'CONCURRENT_AWARD_AMENDMENT',
  'STALE_ROW_VERSION',
] as const;

/** Whether an exception blocks the run item from executing without resolution. */
export function isBlockingException(code: BnUpratingExceptionCode): boolean {
  // Every listed exception blocks by default — the epic requires that no
  // exception is silently ignored. Non-blocking exceptions must be declared
  // explicitly by future policy configuration (added in Slice 2).
  return true;
}
