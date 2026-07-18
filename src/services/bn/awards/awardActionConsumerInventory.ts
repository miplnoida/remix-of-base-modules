/**
 * AW360-WAVE-1-C1 Stage D4 — Award 360 action consumer inventory.
 *
 * Static, canonical map linking every registered `AwardActionKey` to:
 *   - UI consumer surfaces (file paths where the action is rendered);
 *   - the mutation handler (if any) that would execute it;
 *   - whether the canonical availability resolver is wired;
 *   - whether the canonical runtime guard (`awardActionGuard`) protects the
 *     handler;
 *   - the audit event emitted on execution (if any);
 *   - the certification suite that covers it.
 *
 * Wave 1 posture: every mutation resolves to `executionMode = DISABLED`
 * (dark launch) and the Award 360 tree contains zero direct writes (see
 * `safety.test.ts`). The `mutationHandler` field is therefore intentionally
 * `null` for every mutation key — there is no server-authorised command to
 * dispatch. The runtime guard remains wired so that any future handler
 * added in a later wave inherits the guard automatically.
 *
 * This module is a leaf: it must not import from `awardActionCatalog.ts`
 * or any UI surface, only from the resolver.
 */
import {
  AWARD_ACTION_BINDINGS,
  AWARD_ACTION_IS_MUTATION,
  type AwardActionKey,
} from './awardActionAvailability';

export type ActionCoverageSuite =
  | 'permissions.test.ts'
  | 'sharedActionResolver.test.ts'
  | 'actionCertificationMatrix.test.ts'
  | 'awardActionGuardCertification.test.ts'
  | 'awardActionNegativeSecurity.test.ts'
  | 'awardActionUIRuntimeParity.test.ts';

export interface AwardActionConsumerEntry {
  readonly action: AwardActionKey;
  readonly uiSurfaces: readonly string[];
  readonly mutationHandler: string | null;
  readonly canonicalAvailabilityWired: boolean;
  readonly guardWired: boolean;
  readonly auditEvent: string | null;
  readonly certificationSuites: readonly ActionCoverageSuite[];
  readonly notes?: string;
}

// UI surface roots that consume actions via `useAward360Actions.evaluate`
// and/or `Award360ActionButton`.
const SHELL_HEADER = 'src/pages/bn/awards/award-360/Award360Header.tsx';
const TAB_BENEFICIARIES = 'src/pages/bn/awards/award-360/tabs/AwardBeneficiariesTab.tsx';
const TAB_PAYMENTS = 'src/pages/bn/awards/award-360/tabs/AwardPaymentsTab.tsx';
const TAB_SCHEDULE = 'src/pages/bn/awards/award-360/tabs/AwardScheduleTab.tsx';
const TAB_LIFECERT = 'src/pages/bn/awards/award-360/tabs/AwardLifeCertificatesTab.tsx';
const TAB_MEDICAL = 'src/pages/bn/awards/award-360/tabs/AwardMedicalReviewsTab.tsx';
const TAB_SUSPENSIONS = 'src/pages/bn/awards/award-360/tabs/AwardSuspensionsTab.tsx';
const TAB_OVERPAYMENTS = 'src/pages/bn/awards/award-360/tabs/AwardOverpaymentsTab.tsx';
const TAB_COMMUNICATIONS = 'src/pages/bn/awards/award-360/tabs/AwardCommunicationsTab.tsx';
const TAB_AUDIT = 'src/pages/bn/awards/award-360/tabs/AwardAuditTab.tsx';
const TAB_PENSIONER = 'src/pages/bn/awards/award-360/tabs/AwardPensionerTab.tsx';
const TAB_CLAIM = 'src/pages/bn/awards/award-360/tabs/AwardClaimTab.tsx';
const TAB_PRODUCT = 'src/pages/bn/awards/award-360/tabs/AwardProductTab.tsx';

const CORE_SUITES: readonly ActionCoverageSuite[] = [
  'actionCertificationMatrix.test.ts',
  'awardActionGuardCertification.test.ts',
  'awardActionNegativeSecurity.test.ts',
  'awardActionUIRuntimeParity.test.ts',
];

/**
 * The canonical inventory. Every registered action MUST have an entry; the
 * reconciliation test fails when the set of entry keys differs from the
 * set of `AwardActionKey`s.
 */
export const AWARD_ACTION_CONSUMER_INVENTORY: Readonly<Record<AwardActionKey, AwardActionConsumerEntry>> = {
  OPEN_PERSON_360: {
    action: 'OPEN_PERSON_360',
    uiSurfaces: [TAB_PENSIONER, TAB_BENEFICIARIES],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  OPEN_CLAIM: {
    action: 'OPEN_CLAIM',
    uiSurfaces: [SHELL_HEADER, TAB_CLAIM],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  OPEN_PRODUCT: {
    action: 'OPEN_PRODUCT',
    uiSurfaces: [TAB_PRODUCT],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  OPEN_PAYMENT_PROFILE: {
    action: 'OPEN_PAYMENT_PROFILE',
    uiSurfaces: [TAB_PENSIONER],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  OPEN_SURVIVORS_WORKSPACE: {
    action: 'OPEN_SURVIVORS_WORKSPACE',
    uiSurfaces: [TAB_BENEFICIARIES],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  ADD_BENEFICIARY: {
    action: 'ADD_BENEFICIARY',
    uiSurfaces: [TAB_BENEFICIARIES],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
    notes: 'Dark-launched — routed to Survivors workspace; no direct handler in Award 360.',
  },
  AMEND_BENEFICIARY: {
    action: 'AMEND_BENEFICIARY',
    uiSurfaces: [TAB_BENEFICIARIES],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  END_BENEFICIARY: {
    action: 'END_BENEFICIARY',
    uiSurfaces: [TAB_BENEFICIARIES],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  OPEN_PAYMENT_SCHEDULE: {
    action: 'OPEN_PAYMENT_SCHEDULE',
    uiSurfaces: [TAB_SCHEDULE],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  OPEN_PAYMENT_INSTRUCTION: {
    action: 'OPEN_PAYMENT_INSTRUCTION',
    uiSurfaces: [TAB_PAYMENTS],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  OPEN_PAYMENT_BATCH: {
    action: 'OPEN_PAYMENT_BATCH',
    uiSurfaces: [TAB_PAYMENTS],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  OPEN_PAYMENT_EXCEPTION: {
    action: 'OPEN_PAYMENT_EXCEPTION',
    uiSurfaces: [TAB_PAYMENTS],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  CANCEL_PAYMENT: {
    action: 'CANCEL_PAYMENT',
    uiSurfaces: [TAB_PAYMENTS],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
    notes: 'Dark-launched — executed inside /bn/payables specialist workspace.',
  },
  REISSUE_PAYMENT: {
    action: 'REISSUE_PAYMENT',
    uiSurfaces: [TAB_PAYMENTS],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
    notes: 'Dark-launched — executed inside /bn/issue specialist workspace.',
  },
  VERIFY_LIFE_CERTIFICATE: {
    action: 'VERIFY_LIFE_CERTIFICATE',
    uiSurfaces: [TAB_LIFECERT],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  RECORD_LIFE_CERTIFICATE_RECEIPT: {
    action: 'RECORD_LIFE_CERTIFICATE_RECEIPT',
    uiSurfaces: [TAB_LIFECERT],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  SEND_LIFE_CERTIFICATE_REMINDER: {
    action: 'SEND_LIFE_CERTIFICATE_REMINDER',
    uiSurfaces: [TAB_LIFECERT],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
    notes: 'Send routed through Communication Hub façade; no direct enqueue.',
  },
  SCHEDULE_MEDICAL_REVIEW: {
    action: 'SCHEDULE_MEDICAL_REVIEW',
    uiSurfaces: [TAB_MEDICAL],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  RECORD_MEDICAL_OUTCOME: {
    action: 'RECORD_MEDICAL_OUTCOME',
    uiSurfaces: [TAB_MEDICAL],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  REFER_MEDICAL_BOARD: {
    action: 'REFER_MEDICAL_BOARD',
    uiSurfaces: [TAB_MEDICAL],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  OPEN_MEDICAL_REVIEW_WORKSPACE: {
    action: 'OPEN_MEDICAL_REVIEW_WORKSPACE',
    uiSurfaces: [TAB_MEDICAL],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  PROPOSE_SUSPENSION: {
    action: 'PROPOSE_SUSPENSION',
    uiSurfaces: [TAB_SUSPENSIONS],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  REVIEW_SUSPENSION: {
    action: 'REVIEW_SUSPENSION',
    uiSurfaces: [TAB_SUSPENSIONS],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  PROPOSE_RESUMPTION: {
    action: 'PROPOSE_RESUMPTION',
    uiSurfaces: [TAB_SUSPENSIONS],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  OPEN_OVERPAYMENT: {
    action: 'OPEN_OVERPAYMENT',
    uiSurfaces: [TAB_OVERPAYMENTS],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  CONFIGURE_RECOVERY_PLAN: {
    action: 'CONFIGURE_RECOVERY_PLAN',
    uiSurfaces: [TAB_OVERPAYMENTS],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  REQUEST_OVERPAYMENT_WAIVER: {
    action: 'REQUEST_OVERPAYMENT_WAIVER',
    uiSurfaces: [TAB_OVERPAYMENTS],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  OPEN_COMMUNICATION_HUB: {
    action: 'OPEN_COMMUNICATION_HUB',
    uiSurfaces: [TAB_COMMUNICATIONS],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  OPEN_COMMUNICATION_DELIVERY_MONITOR: {
    action: 'OPEN_COMMUNICATION_DELIVERY_MONITOR',
    uiSurfaces: [TAB_COMMUNICATIONS],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  OPEN_COMMUNICATION_RETRY_QUEUE: {
    action: 'OPEN_COMMUNICATION_RETRY_QUEUE',
    uiSurfaces: [TAB_COMMUNICATIONS],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  SEND_AWARD_COMMUNICATION: {
    action: 'SEND_AWARD_COMMUNICATION',
    uiSurfaces: [TAB_COMMUNICATIONS],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
    notes: 'Send routed through Communication Hub façade; no direct enqueue.',
  },
  RETRY_COMMUNICATION: {
    action: 'RETRY_COMMUNICATION',
    uiSurfaces: [TAB_COMMUNICATIONS],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
  EXPORT_AUDIT: {
    action: 'EXPORT_AUDIT',
    uiSurfaces: [TAB_AUDIT],
    mutationHandler: null,
    canonicalAvailabilityWired: true,
    guardWired: true,
    auditEvent: null,
    certificationSuites: CORE_SUITES,
  },
};

export interface AwardActionInventorySummary {
  totalRegisteredActions: number;
  actionsWithUiConsumers: number;
  actionsWithMutationHandlers: number;
  actionsGuarded: number;
  navigationActions: number;
  mutationActions: number;
  orphanedRegistrations: readonly AwardActionKey[];
  unregisteredConsumers: readonly string[];
  unguardedMutations: readonly AwardActionKey[];
  /** AW360-WAVE-1-C1 Stage D5 — pilot actions registered in the command registry. */
  pilotActions: readonly AwardActionKey[];
  /** Mutations that remain dark-launched (no pilot handler). */
  darkLaunchedMutations: readonly AwardActionKey[];
}

/**
 * AW360-WAVE-1-C1 Stage D5 — resolved inventory view.
 *
 * Overlays the static UI/guard inventory with pilot command-registry
 * data so the manually maintained inventory never duplicates handler
 * status. If a pilot registry entry exists for an action, its handler
 * and audit event are surfaced here.
 */
export function getResolvedAwardActionInventory(): Readonly<
  Record<AwardActionKey, AwardActionConsumerEntry>
> {
  // Static import — awardPilotHandlers depends only on contracts + action
  // types, so there is no cycle back to this file.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('./pilot/awardPilotHandlers') as typeof import('./pilot/awardPilotHandlers');
  const registry = mod.AWARD_COMMAND_REGISTRY;
  const out = {} as Record<AwardActionKey, AwardActionConsumerEntry>;
  for (const key of Object.keys(AWARD_ACTION_CONSUMER_INVENTORY) as AwardActionKey[]) {
    const base = AWARD_ACTION_CONSUMER_INVENTORY[key];
    const pilot = registry.get(key);
    out[key] = pilot
      ? { ...base, mutationHandler: `pilot:${pilot.action}`, auditEvent: pilot.auditEventType }
      : base;
  }
  return out;
}


export function summariseAwardActionInventory(): AwardActionInventorySummary {
  const keys = Object.keys(AWARD_ACTION_BINDINGS) as AwardActionKey[];
  const resolved = getResolvedAwardActionInventory();
  const entries = keys.map((k) => resolved[k]);
  const orphaned = entries.filter((e) => e.uiSurfaces.length === 0).map((e) => e.action);
  const unguardedMutations = keys.filter(
    (k) => AWARD_ACTION_IS_MUTATION[k] && !resolved[k].guardWired,
  );
  const pilotActions = keys.filter((k) => resolved[k].mutationHandler !== null);
  const darkLaunchedMutations = keys.filter(
    (k) => AWARD_ACTION_IS_MUTATION[k] && resolved[k].mutationHandler === null,
  );
  return {
    totalRegisteredActions: keys.length,
    actionsWithUiConsumers: entries.filter((e) => e.uiSurfaces.length > 0).length,
    actionsWithMutationHandlers: entries.filter((e) => e.mutationHandler !== null).length,
    actionsGuarded: entries.filter((e) => e.guardWired).length,
    navigationActions: keys.filter((k) => !AWARD_ACTION_IS_MUTATION[k]).length,
    mutationActions: keys.filter((k) => AWARD_ACTION_IS_MUTATION[k]).length,
    orphanedRegistrations: orphaned,
    unregisteredConsumers: [],
    unguardedMutations,
    pilotActions,
    darkLaunchedMutations,
  };
}

