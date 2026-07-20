/**
 * BN Benefits — Registered query codes.
 *
 * This list is CLOSED. Adding a code requires:
 *   1. Add here.
 *   2. Add capability mapping in `benefitsQueryRegistry.ts`.
 *   3. Implement a hand-written handler in the edge function.
 *   4. Publish a request/response DTO.
 */

export const BN_MORTALITY_QUERY_CODES = [
  'BN_MORTALITY_GET_SUMMARY',
  'BN_MORTALITY_LIST_EVENTS',
  'BN_MORTALITY_GET_EVENT',
  'BN_MORTALITY_SEARCH_PERSON_MATCHES',
  'BN_MORTALITY_GET_AFFECTED_AWARDS',
  'BN_MORTALITY_GET_EVENT_HISTORY',
  'BN_MORTALITY_GET_REFERRALS',
  'BN_MORTALITY_GET_AWARD_IMPACTS',
  'BN_MORTALITY_GET_EVIDENCE_LINKS',
  'BN_MORTALITY_GET_COMMUNICATIONS',
  'BN_MORTALITY_PREVIEW_REGISTRATION_IMPACT',
  'BN_MORTALITY_GET_ACTION_AVAILABILITY',
] as const;

export type BnMortalityQueryCode = (typeof BN_MORTALITY_QUERY_CODES)[number];

export const BN_BENEFITS_QUERY_CODES = [...BN_MORTALITY_QUERY_CODES] as const;

export type BnBenefitsQueryCode = (typeof BN_BENEFITS_QUERY_CODES)[number];

export function isBnBenefitsQueryCode(x: unknown): x is BnBenefitsQueryCode {
  return typeof x === 'string' && (BN_BENEFITS_QUERY_CODES as readonly string[]).includes(x);
}
