/**
 * BN Benefits — Query capability registry.
 *
 * Server-authoritative map from {@link BnBenefitsQueryCode} to the
 * capability required to execute the query and the list of fields that
 * MUST be masked unless the caller additionally holds
 * `<module>:admin`.
 *
 * This registry is imported by BOTH the browser client (for optimistic
 * denial UX) and the edge function (for the actual server-side gate).
 * The edge function ALSO re-checks capabilities against
 * `role_permissions` — this map alone is never sufficient.
 */
import type { BnBenefitsQueryCode } from '@/types/bn/queries/queryCodes';

export interface BnBenefitsQueryDescriptor {
  readonly queryCode: BnBenefitsQueryCode;
  readonly moduleCode: string;
  /** Any of these capabilities is sufficient. */
  readonly anyOfCapabilities: readonly string[];
  /** Fields masked unless caller also holds the module `:admin` capability. */
  readonly sensitiveFields: readonly string[];
  /** Maximum page size the server will honour. */
  readonly maxPageSize: number;
}

export const BN_BENEFITS_QUERY_REGISTRY: Readonly<
  Record<BnBenefitsQueryCode, BnBenefitsQueryDescriptor>
> = {
  BN_MORTALITY_GET_SUMMARY: {
    queryCode: 'BN_MORTALITY_GET_SUMMARY',
    moduleCode: 'bn_mortality',
    anyOfCapabilities: ['bn_mortality:view', 'bn_mortality:read'],
    sensitiveFields: [],
    maxPageSize: 1,
  },
  BN_MORTALITY_LIST_EVENTS: {
    queryCode: 'BN_MORTALITY_LIST_EVENTS',
    moduleCode: 'bn_mortality',
    anyOfCapabilities: ['bn_mortality:view', 'bn_mortality:read'],
    sensitiveFields: ['nationalIdMasked', 'sourcePayload'],
    maxPageSize: 100,
  },
  BN_MORTALITY_GET_EVENT: {
    queryCode: 'BN_MORTALITY_GET_EVENT',
    moduleCode: 'bn_mortality',
    anyOfCapabilities: ['bn_mortality:view', 'bn_mortality:read'],
    sensitiveFields: ['sourcePayload', 'externalReferenceRaw', 'diagnostics'],
    maxPageSize: 1,
  },
  BN_MORTALITY_SEARCH_PERSON_MATCHES: {
    queryCode: 'BN_MORTALITY_SEARCH_PERSON_MATCHES',
    moduleCode: 'bn_mortality',
    anyOfCapabilities: ['bn_mortality:read'],
    sensitiveFields: ['nationalIdMasked', 'dateOfBirth', 'contact', 'confidenceInternals'],
    maxPageSize: 50,
  },
  BN_MORTALITY_GET_AFFECTED_AWARDS: {
    queryCode: 'BN_MORTALITY_GET_AFFECTED_AWARDS',
    moduleCode: 'bn_mortality',
    anyOfCapabilities: ['bn_mortality:read'],
    sensitiveFields: ['overpaymentAmountMinor', 'holdReasonInternal'],
    maxPageSize: 100,
  },
  BN_MORTALITY_GET_EVENT_HISTORY: {
    queryCode: 'BN_MORTALITY_GET_EVENT_HISTORY',
    moduleCode: 'bn_mortality',
    anyOfCapabilities: ['bn_mortality:read'],
    sensitiveFields: ['diagnostics', 'internalReason'],
    maxPageSize: 200,
  },
  BN_MORTALITY_GET_REFERRALS: {
    queryCode: 'BN_MORTALITY_GET_REFERRALS',
    moduleCode: 'bn_mortality',
    anyOfCapabilities: ['bn_mortality:read'],
    sensitiveFields: ['contact'],
    maxPageSize: 100,
  },
  BN_MORTALITY_GET_AWARD_IMPACTS: {
    queryCode: 'BN_MORTALITY_GET_AWARD_IMPACTS',
    moduleCode: 'bn_mortality',
    anyOfCapabilities: ['bn_mortality:read'],
    sensitiveFields: ['overpaymentAmountMinor', 'ledgerDetail'],
    maxPageSize: 100,
  },
  BN_MORTALITY_GET_EVIDENCE_LINKS: {
    queryCode: 'BN_MORTALITY_GET_EVIDENCE_LINKS',
    moduleCode: 'bn_mortality',
    anyOfCapabilities: ['bn_mortality:read'],
    sensitiveFields: ['sourcePayload'],
    maxPageSize: 100,
  },
  BN_MORTALITY_GET_COMMUNICATIONS: {
    queryCode: 'BN_MORTALITY_GET_COMMUNICATIONS',
    moduleCode: 'bn_mortality',
    anyOfCapabilities: ['bn_mortality:read'],
    sensitiveFields: ['recipientContact'],
    maxPageSize: 100,
  },
  BN_MORTALITY_PREVIEW_REGISTRATION_IMPACT: {
    queryCode: 'BN_MORTALITY_PREVIEW_REGISTRATION_IMPACT',
    moduleCode: 'bn_mortality',
    anyOfCapabilities: ['bn_mortality:read', 'bn_mortality:write'],
    sensitiveFields: [],
    maxPageSize: 100,
  },
  BN_MORTALITY_GET_ACTION_AVAILABILITY: {
    queryCode: 'BN_MORTALITY_GET_ACTION_AVAILABILITY',
    moduleCode: 'bn_mortality',
    anyOfCapabilities: ['bn_mortality:view', 'bn_mortality:read'],
    sensitiveFields: [],
    maxPageSize: 1,
  },
};


export function getBenefitsQueryDescriptor(
  code: string,
): BnBenefitsQueryDescriptor | null {
  return (BN_BENEFITS_QUERY_REGISTRY as Record<string, BnBenefitsQueryDescriptor>)[code] ?? null;
}
