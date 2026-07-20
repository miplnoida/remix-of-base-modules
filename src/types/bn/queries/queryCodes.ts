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
  'BN_MORTALITY_GET_ASSIGNABLE_USERS',
] as const;

export type BnMortalityQueryCode = (typeof BN_MORTALITY_QUERY_CODES)[number];

/**
 * BN-AP-00 — Appeals & Disputes secure query codes.
 *
 * The claimant-facing `BN_APPEAL_GET_MY_APPEALS` derives ownership from the
 * caller's verified SSN linkage in `external_user_person_link` — it never
 * trusts a client-supplied claim id list.
 *
 * Staff queries are registered so the edge function can gate the module
 * capability walk end-to-end, but their handlers remain read-only stubs
 * until AP-01 delivers the operational workspace.
 */
export const BN_APPEAL_QUERY_CODES = [
  // Claimant self-service
  'BN_APPEAL_GET_MY_APPEALS',
  'BN_APPEAL_GET_MY_APPEAL_DETAIL',
  // Staff read surfaces (AP-01)
  'BN_APPEAL_GET_SUMMARY',
  'BN_APPEAL_LIST',
  'BN_APPEAL_GET',
  'BN_APPEAL_GET_GROUNDS',
  'BN_APPEAL_GET_EVIDENCE',
  'BN_APPEAL_GET_EVENTS',
  'BN_APPEAL_GET_HEARINGS',
  'BN_APPEAL_GET_DECISION_SNAPSHOT',
  'BN_APPEAL_GET_SOURCE_DECISION',
  'BN_APPEAL_GET_ACTION_AVAILABILITY',
] as const;

export type BnAppealQueryCode = (typeof BN_APPEAL_QUERY_CODES)[number];

export const BN_BENEFITS_QUERY_CODES = [
  ...BN_MORTALITY_QUERY_CODES,
  ...BN_APPEAL_QUERY_CODES,
] as const;

export type BnBenefitsQueryCode = (typeof BN_BENEFITS_QUERY_CODES)[number];

export function isBnBenefitsQueryCode(x: unknown): x is BnBenefitsQueryCode {
  return typeof x === 'string' && (BN_BENEFITS_QUERY_CODES as readonly string[]).includes(x);
}
