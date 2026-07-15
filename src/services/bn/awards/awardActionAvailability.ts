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

/**
 * Legacy tab-visibility permission surface (BN-AWARD360-2.1G).
 *
 * Generic `canPropose` / `canApprove` were removed — they were incorrectly
 * reused by non-Suspension actions. Suspension actions retain a legacy fallback
 * via the explicit `canProposeSuspension` / `canApproveSuspension` fields, and
 * all other action rules authorize exclusively through `input.capabilities`.
 *
 * These fields still drive tab visibility and view-only navigation. They must
 * NOT be used to authorize any mutation whose owning module is not
 * `bn_award_suspension`.
 */
export interface AwardActionPermissions {
  canViewAward: boolean;
  canViewCentralAudit: boolean;
  canServiceLifeCert: boolean;
  canServiceMedical: boolean;
  canServiceOverpayment: boolean;
  canServiceSuspension: boolean;
  canServicePayments: boolean;
  canServiceCommunications: boolean;
  /** Legacy fallback for SUSPENSION_PROPOSE / SUSPENSION_RESUME_PROPOSE only. */
  canProposeSuspension: boolean;
  /** Legacy fallback for SUSPENSION_APPROVE only. */
  canApproveSuspension: boolean;
}

export interface AwardActionFeatureFlags {
  lifeCert: boolean;
  medicalReview: boolean;
  overpayment: boolean;
  awardSuspension: boolean;
  payments: boolean;
}

/**
 * Per-module rollout — sourced from live app_modules rows keyed by module name.
 * Overrides `rolloutStates` when supplied.
 */
export interface AwardModuleRollout {
  moduleName: string;
  moduleExists: boolean;
  isEnabled: boolean;
  routesEnabled: boolean;
  actionsEnabled: boolean;
  showInMenu: boolean;
}

/**
 * Typed capability result surfaced from useAward360Permissions. Kept as a
 * loose shape here to avoid a cross-package cycle; the required properties
 * match `Award360CapabilityResult`.
 */
export interface CapabilityResultLike {
  moduleName: string | null;
  action: string | null;
  moduleExists: boolean;
  actionExists: boolean;
  permissionGranted: boolean;
  reason: string;
}

/**
 * Row-context passed at call time for row-specific business eligibility.
 */
export interface AwardActionContext {
  /** Status of the communication row when evaluating RETRY_COMMUNICATION. */
  communicationStatus?: string | null;
  beneficiaryId?: string;
  beneficiaryStatus?: string | null;
  overpaymentId?: string;
  overpaymentOutstanding?: number | null;
  overpaymentRecoveryStatus?: string | null;
  communicationId?: string;
  claimId?: string;
  personId?: string;
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
  /**
   * NEW (BN-AWARD360-2.1F2). Action-specific capability results keyed by
   * `Award360Capability`. When provided, permission granting is derived from
   * these entries — the legacy `permissions` field is ignored for the affected
   * rule. Admin does NOT bypass a missing action registration.
   */
  capabilities?: Record<string, CapabilityResultLike>;
  /**
   * NEW (BN-AWARD360-2.1F2). Per-module rollout keyed by canonical
   * `app_modules.name`. When provided, rollout gating is derived from the
   * rule's `owningModule` entry — the legacy `rolloutStates[capability]` is
   * ignored for the affected rule.
   */
  rollout?: Record<string, AwardModuleRollout>;
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

/** Overpayment recovery statuses that block further recovery configuration/waiver. */
const OVERPAYMENT_TERMINAL_STATUSES = new Set([
  'RECOVERED', 'FULLY_RECOVERED', 'WAIVED', 'WRITTEN_OFF', 'CLOSED',
]);

/** Beneficiary statuses considered already terminated. */
const BENEFICIARY_ENDED_STATUSES = new Set(['ENDED', 'INACTIVE', 'TERMINATED']);

/**
 * Action-specific capability + owning-module map (BN-AWARD360-2.1F2).
 * When the caller provides `input.capabilities` / `input.rollout` these
 * bindings are consulted directly. Actions with `owningModule: null` are
 * pure Award-360 shell nav and reuse the legacy `award` rollout capability.
 */
export const AWARD_ACTION_BINDINGS: Record<
  AwardActionKey,
  { requiredCapability: string | null; additionalRequiredCapabilities?: string[]; owningModule: string | null }
> = {
  OPEN_PERSON_360:                     { requiredCapability: 'PENSIONER_VIEW',                 owningModule: 'bn_person_360' },
  OPEN_CLAIM:                          { requiredCapability: 'CLAIM_VIEW',                     owningModule: 'bn_claim_worklist' },
  OPEN_PRODUCT:                        { requiredCapability: 'PRODUCT_VIEW',                   owningModule: 'bn_product_catalog' },
  OPEN_PAYMENT_PROFILE:                { requiredCapability: 'PAYMENT_PROFILE_VIEW',           owningModule: 'bn_payment_profiles' },
  OPEN_SURVIVORS_WORKSPACE:            { requiredCapability: 'BENEFICIARY_WORKSPACE_VIEW',     owningModule: 'bn_survivors' },
  ADD_BENEFICIARY:                     { requiredCapability: 'BENEFICIARY_ADD',                owningModule: 'bn_survivors' },
  AMEND_BENEFICIARY:                   { requiredCapability: 'BENEFICIARY_AMEND',              owningModule: 'bn_survivors' },
  END_BENEFICIARY:                     { requiredCapability: 'BENEFICIARY_END',                owningModule: 'bn_survivors' },
  OPEN_PAYMENT_SCHEDULE:               { requiredCapability: 'PAYMENT_HISTORY_VIEW',           owningModule: 'bn_payment_history' },
  OPEN_PAYMENT_INSTRUCTION:            { requiredCapability: 'PAYMENT_HISTORY_VIEW',           owningModule: 'bn_payment_history' },
  OPEN_PAYMENT_BATCH:                  { requiredCapability: 'PAYMENT_HISTORY_VIEW',           owningModule: 'bn_payment_history' },
  OPEN_PAYMENT_EXCEPTION:              { requiredCapability: 'PAYMENT_HISTORY_VIEW',           owningModule: 'bn_payment_history' },
  CANCEL_PAYMENT:                      { requiredCapability: 'PAYMENT_CANCEL',                 owningModule: 'bn_payment_history' },
  REISSUE_PAYMENT:                     { requiredCapability: 'PAYMENT_REISSUE',                owningModule: 'bn_payment_history' },
  VERIFY_LIFE_CERTIFICATE:             { requiredCapability: 'LIFE_CERTIFICATE_VERIFY',        owningModule: 'bn_life_certificates' },
  RECORD_LIFE_CERTIFICATE_RECEIPT:     { requiredCapability: 'LIFE_CERTIFICATE_RECORD_RECEIPT', owningModule: 'bn_life_certificates' },
  SEND_LIFE_CERTIFICATE_REMINDER:      { requiredCapability: 'LIFE_CERTIFICATE_SEND_REMINDER', owningModule: 'bn_life_certificates' },
  SCHEDULE_MEDICAL_REVIEW:             { requiredCapability: 'MEDICAL_REVIEW_SCHEDULE',        owningModule: 'bn_medical_reviews' },
  RECORD_MEDICAL_OUTCOME:              { requiredCapability: 'MEDICAL_REVIEW_RECORD_OUTCOME',  owningModule: 'bn_medical_reviews' },
  REFER_MEDICAL_BOARD:                 { requiredCapability: 'MEDICAL_REVIEW_REFER_BOARD',     owningModule: 'bn_medical_reviews' },
  PROPOSE_SUSPENSION:                  { requiredCapability: 'SUSPENSION_PROPOSE',             owningModule: 'bn_award_suspension' },
  REVIEW_SUSPENSION:                   { requiredCapability: 'SUSPENSION_APPROVE',             owningModule: 'bn_award_suspension' },
  PROPOSE_RESUMPTION:                  { requiredCapability: 'SUSPENSION_RESUME_PROPOSE',      owningModule: 'bn_award_suspension' },
  OPEN_OVERPAYMENT:                    { requiredCapability: 'OVERPAYMENT_WORKSPACE_VIEW',     owningModule: 'bn_overpayments' },
  CONFIGURE_RECOVERY_PLAN:             { requiredCapability: 'OVERPAYMENT_CONFIGURE_RECOVERY', owningModule: 'bn_overpayments' },
  REQUEST_OVERPAYMENT_WAIVER:          { requiredCapability: 'OVERPAYMENT_REQUEST_WAIVER',     owningModule: 'bn_overpayments' },
  OPEN_COMMUNICATION_HUB:              { requiredCapability: 'COMMUNICATION_HUB_VIEW',         owningModule: 'communication_hub_lifecycle_log' },
  OPEN_COMMUNICATION_DELIVERY_MONITOR: { requiredCapability: 'COMMUNICATION_DELIVERY_VIEW',    owningModule: 'communication_hub_delivery_monitor' },
  OPEN_COMMUNICATION_RETRY_QUEUE:      { requiredCapability: 'COMMUNICATION_RETRY_QUEUE_VIEW', owningModule: 'communication_hub_retry_queue' },
  SEND_AWARD_COMMUNICATION:            { requiredCapability: 'COMMUNICATION_SEND',             owningModule: 'communication_hub_dispatch_register' },
  RETRY_COMMUNICATION:                 { requiredCapability: 'COMMUNICATION_RETRY',            owningModule: 'communication_hub_retry_queue' },
  EXPORT_AUDIT:                        { requiredCapability: 'AUDIT_EXPORT',                   owningModule: 'bn_audit_history' },
};

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
    requiresPermission: (p) => false /* BN-2.1G: legacy fallback disabled; use capabilities */,
    requiresFeature: () => true,
    requiresBusinessEligible: (i) => !i.pensionerDeceased,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Add beneficiary — routed through Survivors workspace',
  },
  AMEND_BENEFICIARY: {
    capability: 'beneficiaries',
    route: (a) => `/bn/survivors?awardId=${a}`,
    requiresPermission: (p) => false /* BN-2.1G */,
    requiresFeature: () => true,
    requiresBusinessEligible: (i) => {
      // Requires a selected beneficiary and not already ended.
      const s = (i.context?.beneficiaryStatus ?? '').toUpperCase();
      if (!i.context?.beneficiaryId) return false;
      return !BENEFICIARY_ENDED_STATUSES.has(s);
    },
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Amend beneficiary — Survivors workspace',
  },
  END_BENEFICIARY: {
    capability: 'beneficiaries',
    route: (a) => `/bn/survivors?awardId=${a}`,
    requiresPermission: (p) => false /* BN-2.1G */,
    requiresFeature: () => true,
    requiresBusinessEligible: (i) => {
      const s = (i.context?.beneficiaryStatus ?? '').toUpperCase();
      if (!i.context?.beneficiaryId) return false;
      return !BENEFICIARY_ENDED_STATUSES.has(s);
    },
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
    requiresPermission: (p) => false /* BN-2.1G: capability PAYMENT_CANCEL */,
    requiresFeature: (f) => f.payments,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Cancel queued payment instruction',
  },
  REISSUE_PAYMENT: {
    capability: 'payments',
    route: () => `/bn/issue`,
    requiresPermission: (p) => false /* BN-2.1G: capability PAYMENT_REISSUE */,
    requiresFeature: (f) => f.payments,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Reissue failed/returned payment',
  },
  VERIFY_LIFE_CERTIFICATE: {
    capability: 'lifeCertificates',
    route: (a) => `/bn/life-certificates?awardId=${a}`,
    requiresPermission: (p) => false /* BN-2.1G: capability LIFE_CERTIFICATE_VERIFY */,
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
    requiresPermission: (p) => false /* BN-2.1G: capability MEDICAL_REVIEW_RECORD_OUTCOME */,
    requiresFeature: (f) => f.medicalReview,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Record medical review outcome',
  },
  REFER_MEDICAL_BOARD: {
    capability: 'medicalReviews',
    route: (a) => `/bn/medical-reviews?awardId=${a}`,
    requiresPermission: (p) => false /* BN-2.1G: capability MEDICAL_REVIEW_REFER_BOARD */,
    requiresFeature: (f) => f.medicalReview,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Refer to medical board',
  },
  PROPOSE_SUSPENSION: {
    capability: 'suspensions',
    route: (a) => `/bn/award-suspension?awardId=${a}`,
    requiresPermission: (p) => p.canServiceSuspension && p.canProposeSuspension,
    requiresFeature: (f) => f.awardSuspension,
    requiresBusinessEligible: (i) => i.awardStatus !== 'SUSPENDED' && i.awardStatus !== 'TERMINATED',
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Propose new suspension request',
  },
  REVIEW_SUSPENSION: {
    capability: 'suspensions',
    route: (a) => `/bn/award-suspension?awardId=${a}`,
    requiresPermission: (p) => p.canServiceSuspension && p.canApproveSuspension,
    requiresFeature: (f) => f.awardSuspension,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Review a suspension approval',
  },
  PROPOSE_RESUMPTION: {
    capability: 'suspensions',
    route: (a) => `/bn/award-suspension?awardId=${a}`,
    requiresPermission: (p) => p.canServiceSuspension && p.canProposeSuspension,
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
    requiresPermission: (p) => false /* BN-2.1G: capability OVERPAYMENT_CONFIGURE_RECOVERY */,
    requiresFeature: (f) => f.overpayment,
    requiresBusinessEligible: (i) => {
      const c = i.context;
      if (!c?.overpaymentId) return false;
      if ((c.overpaymentOutstanding ?? 0) <= 0) return false;
      const s = (c.overpaymentRecoveryStatus ?? '').toUpperCase();
      return !OVERPAYMENT_TERMINAL_STATUSES.has(s);
    },
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Configure overpayment recovery plan',
  },
  REQUEST_OVERPAYMENT_WAIVER: {
    capability: 'overpayments',
    route: (a) => `/bn/overpayments?awardId=${a}`,
    requiresPermission: (p) => false /* BN-2.1G: capability OVERPAYMENT_REQUEST_WAIVER */,
    requiresFeature: (f) => f.overpayment,
    requiresBusinessEligible: (i) => {
      const c = i.context;
      if ((c?.overpaymentOutstanding ?? 0) <= 0) return false;
      const s = (c?.overpaymentRecoveryStatus ?? '').toUpperCase();
      return !OVERPAYMENT_TERMINAL_STATUSES.has(s);
    },
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

/**
 * Convert an `AwardModuleRollout` (BN-AWARD360-2.1F2 shape) into a
 * `CapabilityRolloutState` for the shared gating logic below.
 */
function rolloutToState(r: AwardModuleRollout | undefined): CapabilityRolloutState {
  if (!r) return { moduleExists: false, moduleEnabled: false, routesEnabled: false, actionsEnabled: false };
  return {
    moduleExists: r.moduleExists,
    moduleEnabled: r.isEnabled,
    routesEnabled: r.routesEnabled,
    actionsEnabled: r.actionsEnabled,
  };
}

export function getAwardActionAvailability(input: AwardActionInput): AwardActionAvailability {
  const rule = RULES[input.action];
  const capability = rule.capability;
  const binding = AWARD_ACTION_BINDINGS[input.action];

  // Prefer per-module rollout from the new `rollout` map when supplied,
  // keyed by the rule's owning module. Fall back to the legacy capability
  // rollout so existing callers keep working.
  let rollout: CapabilityRolloutState;
  if (input.rollout && binding?.owningModule) {
    rollout = rolloutToState(input.rollout[binding.owningModule]);
  } else {
    rollout = input.rolloutStates[capability];
  }

  // Permission gating. Prefer the action-specific capability result when the
  // caller wires the new `capabilities` map. Admin does NOT bypass a missing
  // action registration — the resolver's own `permissionGranted` already
  // reflects that.
  let permissionGranted: boolean;
  let capabilityReason: string | null = null;
  if (input.capabilities && binding?.requiredCapability) {
    const cap = input.capabilities[binding.requiredCapability];
    if (cap) {
      permissionGranted = cap.permissionGranted;
      capabilityReason = permissionGranted ? null : cap.reason;
    } else {
      permissionGranted = false;
      capabilityReason = `Capability ${binding.requiredCapability} not resolved`;
    }
  } else {
    permissionGranted = rule.requiresPermission(input.permissions);
  }

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
      reason = capabilityReason ?? 'You do not have permission to open this workspace';
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
      reason = capabilityReason ?? 'You do not have permission for this action';
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
