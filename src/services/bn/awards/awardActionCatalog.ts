/**
 * AW360-WAVE-1-C1 Slice B — Canonical Award 360 action definition.
 *
 * This is the SINGLE source of truth for action documentation, tests, and the
 * generated `docs/bn/award360-action-matrix.md`. It composes existing pieces
 * (`AWARD_ACTION_BINDINGS` + resolver route/mutation rules) rather than
 * duplicating them, so drift is impossible: change the resolver, the doc
 * regenerates from the same object.
 */
import {
  AWARD_ACTION_BINDINGS,
  AWARD_ACTION_IS_MUTATION,
  AWARD_ACTION_SERVER_COMMAND_AVAILABLE,
  AWARD_ACTION_RULE_DESCRIPTION,
  fullyRolledOutState,
  getAwardActionAvailability,
  type AwardActionKey,
  type AwardActionInput,
  type AwardActionCapability,
} from './awardActionAvailability';

export type AwardActionType = 'NAVIGATION' | 'MUTATION';

export interface AwardActionDefinition {
  key: AwardActionKey;
  capabilityGroup: AwardActionCapability;
  requiredCapability: string | null;
  additionalRequiredCapabilities: string[];
  owningModule: string | null;
  routeTemplate: string;
  fallbackRouteTemplate?: string;
  isMutation: boolean;
  serverCommandAvailable: boolean;
  featureFlag:
    | 'lifeCert'
    | 'medicalReview'
    | 'overpayment'
    | 'awardSuspension'
    | 'payments'
    | null;
  description: string;
  businessEligibilityCode: string;
  businessEligibilityDescription: string;
}

/**
 * Business eligibility descriptors — human-readable summary of the row-context
 * gate encoded in the resolver's `requiresBusinessEligible`. If you change the
 * resolver rule, update this description in the same PR (the contract test
 * proves every action has one).
 */
const BUSINESS_ELIGIBILITY: Record<
  AwardActionKey,
  { code: string; description: string }
> = {
  OPEN_PERSON_360: { code: 'PERSON_LINKED', description: 'Requires a canonical personId when opened from a beneficiary row.' },
  OPEN_CLAIM: { code: 'ALWAYS_WITH_FALLBACK', description: 'Navigation always allowed; deep-links to /bn/claims/:claimId when linked, otherwise falls back to /bn/claims worklist.' },
  OPEN_PRODUCT: { code: 'ALWAYS', description: 'Always eligible while award is loaded.' },
  OPEN_PAYMENT_PROFILE: { code: 'NOT_BENEFICIARY_CONTEXT', description: 'Disabled from a beneficiary row until canonical beneficiary→payment-profile link exists.' },
  OPEN_SURVIVORS_WORKSPACE: { code: 'ALWAYS', description: 'Always eligible.' },
  ADD_BENEFICIARY: { code: 'PENSIONER_ALIVE', description: 'Blocked when pensioner is deceased.' },
  AMEND_BENEFICIARY: { code: 'BENEFICIARY_ACTIVE', description: 'Requires a selected beneficiary that is not ENDED/INACTIVE/TERMINATED.' },
  END_BENEFICIARY: { code: 'BENEFICIARY_ACTIVE', description: 'Requires a selected beneficiary that is not already ended.' },
  OPEN_PAYMENT_SCHEDULE: { code: 'ALWAYS', description: 'Always eligible.' },
  OPEN_PAYMENT_INSTRUCTION: { code: 'ALWAYS', description: 'Always eligible.' },
  OPEN_PAYMENT_BATCH: { code: 'ALWAYS', description: 'Always eligible.' },
  OPEN_PAYMENT_EXCEPTION: { code: 'ALWAYS', description: 'Always eligible.' },
  CANCEL_PAYMENT: { code: 'ALWAYS', description: 'Row-level cancel gates enforced by the specialist workspace.' },
  REISSUE_PAYMENT: { code: 'ALWAYS', description: 'Row-level reissue gates enforced by the specialist workspace.' },
  VERIFY_LIFE_CERTIFICATE: { code: 'ALWAYS', description: 'Row-level verification gates enforced by the LC workspace.' },
  RECORD_LIFE_CERTIFICATE_RECEIPT: { code: 'ALWAYS', description: 'Row-level receipt gates enforced by the LC workspace.' },
  SEND_LIFE_CERTIFICATE_REMINDER: { code: 'ALWAYS', description: 'Row-level reminder gates enforced by the LC workspace.' },
  SCHEDULE_MEDICAL_REVIEW: { code: 'ALWAYS', description: 'Row-level scheduling gates enforced by the Medical workspace.' },
  RECORD_MEDICAL_OUTCOME: { code: 'ALWAYS', description: 'Row-level outcome gates enforced by the Medical workspace.' },
  REFER_MEDICAL_BOARD: { code: 'ALWAYS', description: 'Row-level referral gates enforced by the Medical workspace.' },
  OPEN_MEDICAL_REVIEW_WORKSPACE: { code: 'ALWAYS', description: 'Always eligible.' },
  PROPOSE_SUSPENSION: { code: 'AWARD_NOT_SUSPENDED_OR_TERMINATED', description: 'Blocked when award status is SUSPENDED or TERMINATED.' },
  REVIEW_SUSPENSION: { code: 'ALWAYS', description: 'Row-level approval gates enforced by the Suspension workspace.' },
  PROPOSE_RESUMPTION: { code: 'AWARD_SUSPENDED', description: 'Requires award status = SUSPENDED.' },
  OPEN_OVERPAYMENT: { code: 'ALWAYS', description: 'Always eligible when award has any overpayment.' },
  CONFIGURE_RECOVERY_PLAN: { code: 'OVERPAYMENT_ACTIVE', description: 'Requires outstanding > 0 and non-terminal recovery status.' },
  REQUEST_OVERPAYMENT_WAIVER: { code: 'OVERPAYMENT_ACTIVE', description: 'Requires outstanding > 0 and non-terminal recovery status.' },
  OPEN_COMMUNICATION_HUB: { code: 'ALWAYS', description: 'Always eligible.' },
  OPEN_COMMUNICATION_DELIVERY_MONITOR: { code: 'ALWAYS', description: 'Always eligible.' },
  OPEN_COMMUNICATION_RETRY_QUEUE: { code: 'ALWAYS', description: 'Always eligible.' },
  SEND_AWARD_COMMUNICATION: { code: 'ALWAYS', description: 'Row-level send gates enforced by the Comm Hub façade.' },
  RETRY_COMMUNICATION: { code: 'COMMUNICATION_FAILED', description: 'Requires communication status in FAILED/RETRY/RETRYING/PENDING_RETRY/ERROR.' },
  EXPORT_AUDIT: { code: 'ALWAYS', description: 'Always eligible; navigation-only surface for audit export.' },
};

/**
 * Feature-flag mapping — the flag key the resolver reads for this action.
 * Actions without a feature flag are pure Award-360-shell navigation.
 */
const FEATURE_FLAG: Record<AwardActionKey, AwardActionDefinition['featureFlag']> = {
  OPEN_PERSON_360: null,
  OPEN_CLAIM: null,
  OPEN_PRODUCT: null,
  OPEN_PAYMENT_PROFILE: 'payments',
  OPEN_SURVIVORS_WORKSPACE: null,
  ADD_BENEFICIARY: null,
  AMEND_BENEFICIARY: null,
  END_BENEFICIARY: null,
  OPEN_PAYMENT_SCHEDULE: 'payments',
  OPEN_PAYMENT_INSTRUCTION: 'payments',
  OPEN_PAYMENT_BATCH: 'payments',
  OPEN_PAYMENT_EXCEPTION: 'payments',
  CANCEL_PAYMENT: 'payments',
  REISSUE_PAYMENT: 'payments',
  VERIFY_LIFE_CERTIFICATE: 'lifeCert',
  RECORD_LIFE_CERTIFICATE_RECEIPT: 'lifeCert',
  SEND_LIFE_CERTIFICATE_REMINDER: 'lifeCert',
  SCHEDULE_MEDICAL_REVIEW: 'medicalReview',
  RECORD_MEDICAL_OUTCOME: 'medicalReview',
  REFER_MEDICAL_BOARD: 'medicalReview',
  OPEN_MEDICAL_REVIEW_WORKSPACE: 'medicalReview',
  PROPOSE_SUSPENSION: 'awardSuspension',
  REVIEW_SUSPENSION: 'awardSuspension',
  PROPOSE_RESUMPTION: 'awardSuspension',
  OPEN_OVERPAYMENT: 'overpayment',
  CONFIGURE_RECOVERY_PLAN: 'overpayment',
  REQUEST_OVERPAYMENT_WAIVER: 'overpayment',
  OPEN_COMMUNICATION_HUB: null,
  OPEN_COMMUNICATION_DELIVERY_MONITOR: null,
  OPEN_COMMUNICATION_RETRY_QUEUE: null,
  SEND_AWARD_COMMUNICATION: null,
  RETRY_COMMUNICATION: null,
  EXPORT_AUDIT: null,
};

/**
 * Placeholder tokens used in the generated route templates.
 * `:awardId` / `:claimId` are the canonical parameterised route markers.
 */
const AWARD_TOKEN = ':awardId';
const CLAIM_TOKEN = ':claimId';

function baseInput(action: AwardActionKey): AwardActionInput {
  return {
    action,
    awardId: AWARD_TOKEN,
    awardStatus: 'ACTIVE',
    hasClaimId: true,
    claimId: CLAIM_TOKEN,
    hasProductVersion: true,
    pensionerDeceased: false,
    permissions: {
      canViewAward: true,
      canViewCentralAudit: true,
      canServiceLifeCert: true,
      canServiceMedical: true,
      canServiceOverpayment: true,
      canServiceSuspension: true,
      canServicePayments: true,
      canServiceCommunications: true,
      canProposeSuspension: true,
      canApproveSuspension: true,
    },
    featureEnabled: {
      lifeCert: true,
      medicalReview: true,
      overpayment: true,
      awardSuspension: true,
      payments: true,
    },
    rolloutStates: fullyRolledOutState(),
  };
}

/**
 * Extract the canonical route template for an action by asking the resolver
 * to render it against known tokens. This guarantees the doc row always
 * matches the resolver's actual output.
 */
function routeFor(action: AwardActionKey, opts?: { withClaim: boolean }): string {
  const input = baseInput(action);
  if (opts && !opts.withClaim) {
    input.claimId = null;
    input.hasClaimId = false;
  }
  return getAwardActionAvailability(input).targetRoute ?? '';
}

/**
 * The canonical action-definition list. Iterate this — never re-declare
 * routes, capabilities, or module ownership elsewhere for documentation.
 */
export const AWARD_ACTION_DEFINITIONS: readonly AwardActionDefinition[] =
  (Object.keys(AWARD_ACTION_BINDINGS) as AwardActionKey[]).map((key) => {
    const binding = AWARD_ACTION_BINDINGS[key];
    const sample = getAwardActionAvailability(baseInput(key));
    const businessEligibility = BUSINESS_ELIGIBILITY[key];
    const isMutation = AWARD_ACTION_IS_MUTATION[key];
    const serverCommandAvailable = AWARD_ACTION_SERVER_COMMAND_AVAILABLE[key];
    const routeTemplate = routeFor(key);
    const fallbackRouteTemplate =
      key === 'OPEN_CLAIM' ? routeFor(key, { withClaim: false }) : undefined;
    return {
      key,
      capabilityGroup: sample.capability,
      requiredCapability: binding.requiredCapability,
      additionalRequiredCapabilities: binding.additionalRequiredCapabilities ?? [],
      owningModule: binding.owningModule,
      routeTemplate,
      fallbackRouteTemplate,
      isMutation,
      serverCommandAvailable,
      featureFlag: FEATURE_FLAG[key],
      description: AWARD_ACTION_RULE_DESCRIPTION[key],
      businessEligibilityCode: businessEligibility.code,
      businessEligibilityDescription: businessEligibility.description,
    };
  });

export function getAwardActionDefinition(key: AwardActionKey): AwardActionDefinition {
  const def = AWARD_ACTION_DEFINITIONS.find((d) => d.key === key);
  if (!def) throw new Error(`Unknown Award action: ${key}`);
  return def;
}

/**
 * Build the canonical Markdown doc from `AWARD_ACTION_DEFINITIONS`. Kept in
 * this module so the generator script and the drift test consume the same
 * rendering logic — the test compares its output to the checked-in file.
 */
export function renderAwardActionMatrixMarkdown(): string {
  const nav = AWARD_ACTION_DEFINITIONS.filter((d) => !d.isMutation);
  const mut = AWARD_ACTION_DEFINITIONS.filter((d) => d.isMutation);

  const cols = (d: AwardActionDefinition): string[] => [
    d.key,
    d.isMutation ? 'Mutation' : 'Navigation',
    d.isMutation ? 'DISABLED' : 'NAVIGATE',
    d.fallbackRouteTemplate
      ? `\`${d.routeTemplate}\` (fallback \`${d.fallbackRouteTemplate}\`)`
      : `\`${d.routeTemplate}\``,
    d.requiredCapability ?? '—',
    d.additionalRequiredCapabilities.length ? d.additionalRequiredCapabilities.join(', ') : '—',
    d.owningModule ?? '—',
    d.featureFlag ?? '—',
    d.businessEligibilityCode,
    d.serverCommandAvailable ? 'available' : 'unavailable',
    d.isMutation
      ? 'Disabled (dark-launched)'
      : d.fallbackRouteTemplate
        ? 'Navigation enabled (fallback route when linkage missing)'
        : 'Navigation enabled',
  ];

  const header = [
    'Action',
    'Type',
    'Execution',
    'Route',
    'Required capability',
    'Additional capabilities',
    'Owning module',
    'Feature flag',
    'Business eligibility',
    'Server command',
    'Current behaviour',
  ];
  const sep = header.map(() => '---');
  const row = (cells: string[]) => `| ${cells.join(' | ')} |`;

  const tableFor = (list: AwardActionDefinition[]) =>
    [row(header), row(sep), ...list.map((d) => row(cols(d)))].join('\n');

  const eligibilityRows = AWARD_ACTION_DEFINITIONS.map(
    (d) => `- **${d.key}** — ${d.businessEligibilityDescription}`,
  ).join('\n');

  return [
    '# Award 360 — Action Matrix (generated)',
    '',
    '<!--',
    'This document is generated from `src/services/bn/awards/awardActionCatalog.ts`.',
    'Do not edit action rows manually. Regenerate with:',
    '  bunx tsx scripts/generate-award360-action-matrix.ts',
    "The action-contract test asserts this file's content matches the generator.",
    '-->',
    '',
    '## Navigation actions',
    '',
    tableFor(nav),
    '',
    '## Dark-launched mutations',
    '',
    'Every mutation resolves to `executionMode = DISABLED` in Wave 1. The',
    '`serverCommandAvailable` flag is `false` for every entry — mutations must',
    'be performed inside the specialist workspace linked in the `Route` column.',
    '',
    tableFor(mut),
    '',
    '## Business eligibility summary',
    '',
    eligibilityRows,
    '',
    '## Cross-module handoffs',
    '',
    '- **Claim workbench:** deep-link only, no state pushed.',
    '- **Person 360:** disabled entirely (`canonicalPersonId=null`) when PERSON_360_VIEW absent.',
    '- **Comm Hub:** all sends route through `sendCommunication(...)`; Award 360 never enqueues directly.',
    '- **Legal referral:** surfaced as a read-only chip on the Claim tab.',
    '- **Workflow:** `core_workflow_task` visited only when a suspension carries `workflow_instance_id`.',
    '',
    '## Fail-closed rules',
    '',
    '- Missing capability registration → action disabled (Admin does not bypass).',
    '- Missing action registration → disabled.',
    '- Missing owning module row → disabled.',
    '- `moduleEnabled=false` / `routesEnabled=false` → navigation disabled.',
    '- `actions_enabled=false` → mutations disabled but read-only navigation preserved.',
    '- `serverCommandAvailable=false` → mutation stays DISABLED even when all gates pass.',
    '',
  ].join('\n') + '\n';
}
