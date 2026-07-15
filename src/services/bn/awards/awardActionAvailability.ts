/**
 * Award 360 action availability matrix.
 *
 * BN-AWARD360-2.1F.
 *
 * Rules:
 * - Never returns enabled:true unless (for mutations) an accepted server
 *   command exists AND the caller holds the required permission AND
 *   the *specialist* capability's `actionsEnabled` is true AND the target
 *   award is business-eligible.
 * - Every action carries an explicit `capability` so per-module rollout state
 *   (moduleEnabled / routesEnabled / actionsEnabled) is applied only to the
 *   owning specialist workspace. Turning off e.g. `overpayments.actionsEnabled`
 *   must NOT dark-launch beneficiary or communication actions.
 * - Every action carries a canonical specialist-workspace route. Routes are
 *   validated against `src/components/routing/AppRoutes.tsx`.
 * - Row-specific business eligibility (e.g. only failed communications are
 *   retry-eligible) is expressed through `context`.
 */

export type AwardActionKey =
  | 'OPEN_PERSON_360'
  | 'OPEN_CLAIM'
  | 'OPEN_PRODUCT'
  | 'OPEN_PAYMENT_PROFILE'
  | 'OPEN_SURVIVORS_WORKSPACE'
  | 'ADD_BENEFICIARY'
  | 'AMEND_BENEFICIARY'
  | 'END_BENEFICIARY'
  | 'OPEN_PAYMENT_SCHEDULE'
  | 'OPEN_PAYMENT_INSTRUCTION'
  | 'OPEN_PAYMENT_BATCH'
  | 'OPEN_PAYMENT_EXCEPTION'
  | 'CANCEL_PAYMENT'
  | 'REISSUE_PAYMENT'
  | 'VERIFY_LIFE_CERTIFICATE'
  | 'RECORD_LIFE_CERTIFICATE_RECEIPT'
  | 'SEND_LIFE_CERTIFICATE_REMINDER'
  | 'SCHEDULE_MEDICAL_REVIEW'
  | 'RECORD_MEDICAL_OUTCOME'
  | 'REFER_MEDICAL_BOARD'
  | 'PROPOSE_SUSPENSION'
  | 'REVIEW_SUSPENSION'
  | 'PROPOSE_RESUMPTION'
  | 'OPEN_OVERPAYMENT'
  | 'CONFIGURE_RECOVERY_PLAN'
  | 'REQUEST_OVERPAYMENT_WAIVER'
  | 'OPEN_COMMUNICATION_HUB'
  | 'OPEN_COMMUNICATION_DELIVERY_MONITOR'
  | 'OPEN_COMMUNICATION_RETRY_QUEUE'
  | 'SEND_AWARD_COMMUNICATION'
  | 'RETRY_COMMUNICATION'
  | 'EXPORT_AUDIT';

export type AwardActionExecutionMode = 'NAVIGATE' | 'SERVER_COMMAND' | 'DISABLED';

/**
 * Capability = the owning specialist module whose rollout gates this action.
 * `award` covers pure Award-360-shell navigation that doesn't belong to a
 * dedicated specialist workspace.
 */
export type AwardActionCapability =
  | 'award'
  | 'beneficiaries'
  | 'overpayments'
  | 'communications'
  | 'payments'
  | 'lifeCertificates'
  | 'medicalReviews'
  | 'suspensions'
  | 'audit';

export interface CapabilityRolloutState {
  moduleExists: boolean;
  moduleEnabled: boolean;
  routesEnabled: boolean;
  actionsEnabled: boolean;
}

export interface AwardActionRolloutState {
  award: CapabilityRolloutState;
  beneficiaries: CapabilityRolloutState;
  overpayments: CapabilityRolloutState;
  communications: CapabilityRolloutState;
  payments: CapabilityRolloutState;
  lifeCertificates: CapabilityRolloutState;
  medicalReviews: CapabilityRolloutState;
  suspensions: CapabilityRolloutState;
  audit: CapabilityRolloutState;
}

export interface AwardActionAvailability {
  action: AwardActionKey;
  capability: AwardActionCapability;
  visible: boolean;
  enabled: boolean;
  permissionGranted: boolean;
  rolloutEnabled: boolean;
  businessEligible: boolean;
  reason: string;
  targetRoute?: string;
  executionMode: AwardActionExecutionMode;
}

export interface AwardActionPermissions {
  canViewAward: boolean;
  canViewCentralAudit: boolean;
  canPropose: boolean;
  canApprove: boolean;
  canServiceLifeCert: boolean;
  canServiceMedical: boolean;
  canServiceOverpayment: boolean;
  canServiceSuspension: boolean;
  canServicePayments: boolean;
  canServiceCommunications: boolean;
}

export interface AwardActionFeatureFlags {
  lifeCert: boolean;
  medicalReview: boolean;
  overpayment: boolean;
  awardSuspension: boolean;
  payments: boolean;
}

/**
 * Row-context passed at call time for row-specific business eligibility.
 */
export interface AwardActionContext {
  /** Status of the communication row when evaluating RETRY_COMMUNICATION. */
  communicationStatus?: string | null;
}

export interface AwardActionInput {
  action: AwardActionKey;
  awardId: string;
  awardStatus?: string | null;
  pensionerDeceased?: boolean;
  hasClaimId?: boolean;
  hasProductVersion?: boolean;
  claimId?: string | null;
  permissions: AwardActionPermissions;
  featureEnabled: AwardActionFeatureFlags;
  rolloutStates: AwardActionRolloutState;
  context?: AwardActionContext;
}

interface Rule {
  capability: AwardActionCapability;
  route: (awardId: string, extra: { claimId?: string | null }) => string;
  requiresPermission: (p: AwardActionPermissions) => boolean;
  requiresFeature: (f: AwardActionFeatureFlags) => boolean;
  requiresBusinessEligible: (i: AwardActionInput) => boolean;
  serverCommandAvailable: boolean;
  isMutation: boolean;
  description: string;
}

/** Communication statuses that are considered retryable. */
const RETRYABLE_COMMUNICATION_STATUSES = new Set([
  'FAILED', 'RETRY', 'RETRYING', 'PENDING_RETRY', 'ERROR',
]);

const NAV_ONLY = { serverCommandAvailable: false, isMutation: false } as const;

const RULES: Record<AwardActionKey, Rule> = {
  OPEN_PERSON_360: {
    capability: 'award',
    route: () => `/bn/person-360`,
    requiresPermission: (p) => p.canViewAward,
    requiresFeature: () => true,
    requiresBusinessEligible: () => true,
    ...NAV_ONLY,
    description: 'Open Person 360 profile',
  },
  OPEN_CLAIM: {
    capability: 'award',
    route: (_a, extra) => (extra.claimId ? `/bn/claims/${extra.claimId}` : `/bn/claims`),
    requiresPermission: (p) => p.canViewAward,
    requiresFeature: () => true,
    requiresBusinessEligible: (i) => Boolean(i.hasClaimId),
    ...NAV_ONLY,
    description: 'Open the source claim workbench',
  },
  OPEN_PRODUCT: {
    capability: 'award',
    route: () => `/bn/config/products`,
    requiresPermission: (p) => p.canViewAward,
    requiresFeature: () => true,
    requiresBusinessEligible: () => true,
    ...NAV_ONLY,
    description: 'Open product catalog',
  },
  OPEN_PAYMENT_PROFILE: {
    capability: 'payments',
    route: () => `/bn/payment-profiles`,
    requiresPermission: (p) => p.canServicePayments,
    requiresFeature: (f) => f.payments,
    requiresBusinessEligible: () => true,
    ...NAV_ONLY,
    description: 'Open payment profile management',
  },
  OPEN_SURVIVORS_WORKSPACE: {
    capability: 'beneficiaries',
    route: (a) => `/bn/survivors?awardId=${a}`,
    requiresPermission: (p) => p.canViewAward,
    requiresFeature: () => true,
    requiresBusinessEligible: () => true,
    ...NAV_ONLY,
    description: 'Open Survivors Processing workspace',
  },
  ADD_BENEFICIARY: {
    capability: 'beneficiaries',
    route: (a) => `/bn/survivors?awardId=${a}`,
    requiresPermission: (p) => p.canPropose,
    requiresFeature: () => true,
    requiresBusinessEligible: (i) => !i.pensionerDeceased,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Add beneficiary — routed through Survivors workspace',
  },
  AMEND_BENEFICIARY: {
    capability: 'beneficiaries',
    route: (a) => `/bn/survivors?awardId=${a}`,
    requiresPermission: (p) => p.canPropose,
    requiresFeature: () => true,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Amend beneficiary — Survivors workspace',
  },
  END_BENEFICIARY: {
    capability: 'beneficiaries',
    route: (a) => `/bn/survivors?awardId=${a}`,
    requiresPermission: (p) => p.canPropose,
    requiresFeature: () => true,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'End beneficiary — Survivors workspace',
  },
  OPEN_PAYMENT_SCHEDULE: {
    capability: 'payments',
    route: (a) => `/bn/schedules?awardId=${a}`,
    requiresPermission: (p) => p.canServicePayments,
    requiresFeature: (f) => f.payments,
    requiresBusinessEligible: () => true,
    ...NAV_ONLY,
    description: 'Open payment schedule',
  },
  OPEN_PAYMENT_INSTRUCTION: {
    capability: 'payments',
    route: (a) => `/bn/payables?awardId=${a}`,
    requiresPermission: (p) => p.canServicePayments,
    requiresFeature: (f) => f.payments,
    requiresBusinessEligible: () => true,
    ...NAV_ONLY,
    description: 'Open payables queue',
  },
  OPEN_PAYMENT_BATCH: {
    capability: 'payments',
    route: () => `/bn/batches`,
    requiresPermission: (p) => p.canServicePayments,
    requiresFeature: (f) => f.payments,
    requiresBusinessEligible: () => true,
    ...NAV_ONLY,
    description: 'Open batch operations',
  },
  OPEN_PAYMENT_EXCEPTION: {
    capability: 'payments',
    route: () => `/bn/exceptions`,
    requiresPermission: (p) => p.canServicePayments,
    requiresFeature: (f) => f.payments,
    requiresBusinessEligible: () => true,
    ...NAV_ONLY,
    description: 'Open payment exceptions',
  },
  CANCEL_PAYMENT: {
    capability: 'payments',
    route: (a) => `/bn/payables?awardId=${a}`,
    requiresPermission: (p) => p.canServicePayments && p.canPropose,
    requiresFeature: (f) => f.payments,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Cancel queued payment instruction',
  },
  REISSUE_PAYMENT: {
    capability: 'payments',
    route: () => `/bn/issue`,
    requiresPermission: (p) => p.canServicePayments && p.canPropose,
    requiresFeature: (f) => f.payments,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Reissue failed/returned payment',
  },
  VERIFY_LIFE_CERTIFICATE: {
    capability: 'lifeCertificates',
    route: (a) => `/bn/life-certificates?awardId=${a}`,
    requiresPermission: (p) => p.canServiceLifeCert && p.canApprove,
    requiresFeature: (f) => f.lifeCert,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Verify life certificate submission',
  },
  RECORD_LIFE_CERTIFICATE_RECEIPT: {
    capability: 'lifeCertificates',
    route: (a) => `/bn/life-certificates?awardId=${a}`,
    requiresPermission: (p) => p.canServiceLifeCert,
    requiresFeature: (f) => f.lifeCert,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Record life certificate receipt',
  },
  SEND_LIFE_CERTIFICATE_REMINDER: {
    capability: 'lifeCertificates',
    route: (a) => `/bn/life-certificates?awardId=${a}`,
    requiresPermission: (p) => p.canServiceLifeCert && p.canServiceCommunications,
    requiresFeature: (f) => f.lifeCert,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Trigger life certificate reminder via Communication Hub',
  },
  SCHEDULE_MEDICAL_REVIEW: {
    capability: 'medicalReviews',
    route: (a) => `/bn/medical-reviews?awardId=${a}`,
    requiresPermission: (p) => p.canServiceMedical,
    requiresFeature: (f) => f.medicalReview,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Schedule medical review',
  },
  RECORD_MEDICAL_OUTCOME: {
    capability: 'medicalReviews',
    route: (a) => `/bn/medical-reviews?awardId=${a}`,
    requiresPermission: (p) => p.canServiceMedical && p.canApprove,
    requiresFeature: (f) => f.medicalReview,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Record medical review outcome',
  },
  REFER_MEDICAL_BOARD: {
    capability: 'medicalReviews',
    route: (a) => `/bn/medical-reviews?awardId=${a}`,
    requiresPermission: (p) => p.canServiceMedical && p.canPropose,
    requiresFeature: (f) => f.medicalReview,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Refer to medical board',
  },
  PROPOSE_SUSPENSION: {
    capability: 'suspensions',
    route: (a) => `/bn/award-suspension?awardId=${a}`,
    requiresPermission: (p) => p.canServiceSuspension && p.canPropose,
    requiresFeature: (f) => f.awardSuspension,
    requiresBusinessEligible: (i) => i.awardStatus !== 'SUSPENDED' && i.awardStatus !== 'TERMINATED',
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Propose new suspension request',
  },
  REVIEW_SUSPENSION: {
    capability: 'suspensions',
    route: (a) => `/bn/award-suspension?awardId=${a}`,
    requiresPermission: (p) => p.canServiceSuspension && p.canApprove,
    requiresFeature: (f) => f.awardSuspension,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Review a suspension approval',
  },
  PROPOSE_RESUMPTION: {
    capability: 'suspensions',
    route: (a) => `/bn/award-suspension?awardId=${a}`,
    requiresPermission: (p) => p.canServiceSuspension && p.canPropose,
    requiresFeature: (f) => f.awardSuspension,
    requiresBusinessEligible: (i) => i.awardStatus === 'SUSPENDED',
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Propose resumption from suspension',
  },
  OPEN_OVERPAYMENT: {
    capability: 'overpayments',
    route: (a) => `/bn/overpayments?awardId=${a}`,
    requiresPermission: (p) => p.canServiceOverpayment,
    requiresFeature: (f) => f.overpayment,
    requiresBusinessEligible: () => true,
    ...NAV_ONLY,
    description: 'Open overpayment recovery',
  },
  CONFIGURE_RECOVERY_PLAN: {
    capability: 'overpayments',
    route: (a) => `/bn/overpayments?awardId=${a}`,
    requiresPermission: (p) => p.canServiceOverpayment && p.canPropose,
    requiresFeature: (f) => f.overpayment,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Configure overpayment recovery plan',
  },
  REQUEST_OVERPAYMENT_WAIVER: {
    capability: 'overpayments',
    route: (a) => `/bn/overpayments?awardId=${a}`,
    requiresPermission: (p) => p.canServiceOverpayment && p.canPropose,
    requiresFeature: (f) => f.overpayment,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Request overpayment waiver',
  },
  OPEN_COMMUNICATION_HUB: {
    capability: 'communications',
    route: () => `/admin/communication-hub`,
    requiresPermission: (p) => p.canServiceCommunications,
    requiresFeature: () => true,
    requiresBusinessEligible: () => true,
    ...NAV_ONLY,
    description: 'Open Communication Hub',
  },
  OPEN_COMMUNICATION_DELIVERY_MONITOR: {
    capability: 'communications',
    route: () => `/admin/communication-hub/delivery-monitor`,
    requiresPermission: (p) => p.canServiceCommunications,
    requiresFeature: () => true,
    requiresBusinessEligible: () => true,
    ...NAV_ONLY,
    description: 'Open Communication Hub delivery monitor',
  },
  OPEN_COMMUNICATION_RETRY_QUEUE: {
    capability: 'communications',
    route: () => `/admin/communication-hub/retry-queue`,
    requiresPermission: (p) => p.canServiceCommunications,
    requiresFeature: () => true,
    requiresBusinessEligible: () => true,
    ...NAV_ONLY,
    description: 'Open Communication Hub retry queue',
  },
  SEND_AWARD_COMMUNICATION: {
    capability: 'communications',
    route: () => `/admin/communication-hub`,
    requiresPermission: (p) => p.canServiceCommunications,
    requiresFeature: () => true,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Send award communication via Communication Hub façade',
  },
  RETRY_COMMUNICATION: {
    capability: 'communications',
    route: () => `/admin/communication-hub/retry-queue`,
    requiresPermission: (p) => p.canServiceCommunications,
    requiresFeature: () => true,
    requiresBusinessEligible: (i) => {
      const s = (i.context?.communicationStatus ?? '').toUpperCase();
      if (!s) return false;
      return RETRYABLE_COMMUNICATION_STATUSES.has(s);
    },
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Retry failed communication via Communication Hub',
  },
  EXPORT_AUDIT: {
    capability: 'audit',
    route: () => `/bn/audit-history`,
    requiresPermission: (p) => p.canViewCentralAudit,
    requiresFeature: () => true,
    requiresBusinessEligible: () => true,
    ...NAV_ONLY,
    description: 'Export audit timeline',
  },
};

function isNavRolloutOk(state: CapabilityRolloutState): boolean {
  return state.moduleExists && state.moduleEnabled && state.routesEnabled;
}

function isMutationRolloutOk(state: CapabilityRolloutState): boolean {
  return state.moduleExists && state.moduleEnabled && state.routesEnabled && state.actionsEnabled;
}

export function getAwardActionAvailability(input: AwardActionInput): AwardActionAvailability {
  const rule = RULES[input.action];
  const capability = rule.capability;
  const rollout = input.rolloutStates[capability];
  const permissionGranted = rule.requiresPermission(input.permissions);
  const featureEnabled = rule.requiresFeature(input.featureEnabled);
  const businessEligible = rule.requiresBusinessEligible(input);
  const targetRoute = rule.route(input.awardId, { claimId: input.claimId ?? null });

  let enabled = false;
  let executionMode: AwardActionExecutionMode = 'DISABLED';
  let reason = rule.description;
  let rolloutEnabled = featureEnabled;

  if (!rule.isMutation) {
    rolloutEnabled = featureEnabled && isNavRolloutOk(rollout);
    if (!rollout.moduleExists) {
      reason = `${capability}: registered capability module is not available`;
    } else if (!rollout.moduleEnabled) {
      reason = `${capability}: capability module is disabled in the current environment`;
    } else if (!rollout.routesEnabled) {
      reason = `${capability}: capability route is not enabled`;
    } else if (!featureEnabled) {
      reason = `${capability}: workspace is not enabled by feature flag`;
    } else if (!permissionGranted) {
      reason = 'You do not have permission to open this workspace';
    } else if (!businessEligible) {
      reason = 'This action does not apply to the current record';
    } else {
      enabled = true;
      executionMode = 'NAVIGATE';
      reason = rule.description;
    }
  } else {
    rolloutEnabled = featureEnabled && isMutationRolloutOk(rollout);
    if (!rollout.moduleExists) {
      reason = `${capability}: registered capability module is not available`;
    } else if (!rollout.moduleEnabled) {
      reason = `${capability}: capability module is disabled in the current environment`;
    } else if (!rollout.routesEnabled) {
      reason = `${capability}: capability route is not enabled`;
    } else if (!featureEnabled) {
      reason = `${capability}: workspace is not enabled by feature flag`;
    } else if (!permissionGranted) {
      reason = 'You do not have permission for this action';
    } else if (!businessEligible) {
      reason = 'This action does not apply to the current record';
    } else if (!rollout.actionsEnabled) {
      reason = `${capability}: actions_enabled is false — mutation controls are dark-launched`;
    } else if (!rule.serverCommandAvailable) {
      reason = `${rule.description}: no server-authorised command is enabled — open the specialist workspace to perform the action`;
    } else {
      enabled = true;
      executionMode = 'SERVER_COMMAND';
      reason = rule.description;
    }
  }

  return {
    action: input.action,
    capability,
    visible: true,
    enabled,
    permissionGranted,
    rolloutEnabled,
    businessEligible,
    reason,
    targetRoute,
    executionMode,
  };
}

export function getAllAwardActions(
  input: Omit<AwardActionInput, 'action'>,
): Record<AwardActionKey, AwardActionAvailability> {
  const out = {} as Record<AwardActionKey, AwardActionAvailability>;
  (Object.keys(RULES) as AwardActionKey[]).forEach((k) => {
    out[k] = getAwardActionAvailability({ ...input, action: k });
  });
  return out;
}

/**
 * Convenience: build a rollout state where every capability is treated as
 * fully rolled out. Useful for unit tests that only care about permission /
 * business logic.
 */
export function fullyRolledOutState(): AwardActionRolloutState {
  const on: CapabilityRolloutState = {
    moduleExists: true,
    moduleEnabled: true,
    routesEnabled: true,
    actionsEnabled: true,
  };
  return {
    award: on,
    beneficiaries: on,
    overpayments: on,
    communications: on,
    payments: on,
    lifeCertificates: on,
    medicalReviews: on,
    suspensions: on,
    audit: on,
  };
}

/**
 * Convenience: build a rollout state where every capability is rolled out
 * for navigation only (actions_enabled=false). This matches the current
 * production posture — read-only Award 360 with all mutations dark-launched.
 */
export function navigateOnlyRolloutState(): AwardActionRolloutState {
  const nav: CapabilityRolloutState = {
    moduleExists: true,
    moduleEnabled: true,
    routesEnabled: true,
    actionsEnabled: false,
  };
  return {
    award: nav,
    beneficiaries: nav,
    overpayments: nav,
    communications: nav,
    payments: nav,
    lifeCertificates: nav,
    medicalReviews: nav,
    suspensions: nav,
    audit: nav,
  };
}

export const AWARD_ACTION_ROUTES: Record<AwardActionKey, string> = Object.fromEntries(
  (Object.keys(RULES) as AwardActionKey[]).map((k) => [k, RULES[k].route('SAMPLE', { claimId: null })]),
) as Record<AwardActionKey, string>;

export function getAwardActionCapability(action: AwardActionKey): AwardActionCapability {
  return RULES[action].capability;
}
