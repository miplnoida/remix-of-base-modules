/**
 * BN Gap Modules — Canonical module code catalogue.
 *
 * These are the six enterprise capability modules being prepared by the
 * Programme Foundation. Each is registered in `app_modules` under exactly
 * this `name`. The list is closed — adding a module requires an additive
 * migration AND an update here.
 */
import type { BnGapModuleCode } from './commandEnvelope';

export const BN_GAP_MODULES: readonly {
  readonly code: BnGapModuleCode;
  readonly displayName: string;
  readonly description: string;
  readonly baseRoute: string;
}[] = [
  {
    code: 'bn_mortality',
    displayName: 'Death & Mortality Processing',
    description: 'Death notifications, verification, award closure, survivor referral.',
    baseRoute: '/bn/mortality',
  },
  {
    code: 'bn_overpayments',
    displayName: 'Overpayment Recovery',
    description: 'Detection, calculation, notification, arrangement, ledger recovery.',
    baseRoute: '/bn/overpayments',
  },
  {
    code: 'bn_appeals',
    displayName: 'Appeals & Disputes',
    description: 'Appeal intake, panel scheduling, hearing outcome, remedy execution.',
    baseRoute: '/bn/appeals',
  },
  {
    code: 'bn_means_tests',
    displayName: 'Means-Test Assessment',
    description: 'Household composition, income evidence, eligibility scoring, review.',
    baseRoute: '/bn/means-tests',
  },
  {
    code: 'bn_risk_management',
    displayName: 'Fraud, Error & Risk',
    description: 'Risk indicators, investigation, referral to Legal, remedial actions.',
    baseRoute: '/bn/risk',
  },
  {
    code: 'bn_uprating',
    displayName: 'Uprating & Indexation',
    description: 'Rate table uplifts, effective-date scheduling, batch re-award.',
    baseRoute: '/bn/uprating',
  },
] as const;

export const BN_GAP_MODULE_CODES: readonly BnGapModuleCode[] =
  BN_GAP_MODULES.map((m) => m.code);

export function isBnGapModuleCode(x: unknown): x is BnGapModuleCode {
  return typeof x === 'string' && (BN_GAP_MODULE_CODES as readonly string[]).includes(x);
}
