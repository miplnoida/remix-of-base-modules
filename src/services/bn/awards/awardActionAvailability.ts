/**
 * Award 360 action availability matrix.
 *
 * BN-AWARD360-V2.1.
 *
 * Rules:
 * - Never returns enabled:true unless an accepted server command exists
 *   AND the caller holds the required permission
 *   AND feature/rollout is enabled
 *   AND the target award is business-eligible for the action.
 * - Every action carries a canonical specialist-workspace route so the UI can
 *   fall back to NAVIGATE when SERVER_COMMAND is not enabled.
 * - Routes are validated against src/components/routing/AppRoutes.tsx —
 *   no /bn/servicing/* placeholders.
 */

export type AwardActionKey =
  | 'OPEN_PERSON_360'
  | 'OPEN_CLAIM'
  | 'OPEN_PRODUCT'
  | 'OPEN_PAYMENT_PROFILE'
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
  | 'SEND_AWARD_COMMUNICATION'
  | 'RETRY_COMMUNICATION'
  | 'EXPORT_AUDIT';

export type AwardActionExecutionMode = 'NAVIGATE' | 'SERVER_COMMAND' | 'DISABLED';

export interface AwardActionAvailability {
  action: AwardActionKey;
  visible: boolean;
  enabled: boolean;
  permissionGranted: boolean;
  rolloutEnabled: boolean;
  businessEligible: boolean;
  reason: string;
  targetRoute?: string;
  executionMode: AwardActionExecutionMode;
}

export interface AwardActionInput {
  action: AwardActionKey;
  awardId: string;
  awardStatus?: string | null;
  pensionerDeceased?: boolean;
  hasClaimId?: boolean;
  hasProductVersion?: boolean;
  permissions: {
    // canonical module/action pairs — resolved by the caller via useModulePermissions
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
  };
  featureEnabled: {
    lifeCert: boolean;
    medicalReview: boolean;
    overpayment: boolean;
    awardSuspension: boolean;
    payments: boolean;
  };
  actionsEnabled: boolean; // app_modules.actions_enabled composite
}

interface Rule {
  route: (awardId: string, extra?: { claimId?: string | null }) => string;
  requiresPermission: (p: AwardActionInput['permissions']) => boolean;
  requiresFeature: (f: AwardActionInput['featureEnabled']) => boolean;
  requiresBusinessEligible: (i: AwardActionInput) => boolean;
  // Whether a server-authorised command is available today.
  serverCommandAvailable: boolean;
  // If false, the button is a pure NAVIGATE (open workspace) — no maker/checker gating.
  isMutation: boolean;
  description: string;
}

const NAV_ONLY = { serverCommandAvailable: false, isMutation: false } as const;

const RULES: Record<AwardActionKey, Rule> = {
  OPEN_PERSON_360: {
    route: () => `/bn/person-360`,
    requiresPermission: (p) => p.canViewAward,
    requiresFeature: () => true,
    requiresBusinessEligible: () => true,
    ...NAV_ONLY,
    description: 'Open Person 360 profile',
  },
  OPEN_CLAIM: {
    route: (_a, extra) => (extra?.claimId ? `/bn/claims/${extra.claimId}` : `/bn/claims`),
    requiresPermission: (p) => p.canViewAward,
    requiresFeature: () => true,
    requiresBusinessEligible: (i) => Boolean(i.hasClaimId),
    ...NAV_ONLY,
    description: 'Open the source claim workbench',
  },
  OPEN_PRODUCT: {
    route: () => `/bn/config/products`,
    requiresPermission: (p) => p.canViewAward,
    requiresFeature: () => true,
    requiresBusinessEligible: () => true,
    ...NAV_ONLY,
    description: 'Open product catalog',
  },
  OPEN_PAYMENT_PROFILE: {
    route: () => `/bn/payment-profiles`,
    requiresPermission: (p) => p.canViewAward,
    requiresFeature: (f) => f.payments,
    requiresBusinessEligible: () => true,
    ...NAV_ONLY,
    description: 'Open payment profile management',
  },
  ADD_BENEFICIARY: {
    route: (a) => `/bn/survivors?awardId=${a}`,
    requiresPermission: (p) => p.canPropose,
    requiresFeature: () => true,
    requiresBusinessEligible: (i) => !i.pensionerDeceased,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Add beneficiary — must be routed through survivors workspace',
  },
  AMEND_BENEFICIARY: {
    route: (a) => `/bn/survivors?awardId=${a}`,
    requiresPermission: (p) => p.canPropose,
    requiresFeature: () => true,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Amend beneficiary — survivors workspace',
  },
  END_BENEFICIARY: {
    route: (a) => `/bn/survivors?awardId=${a}`,
    requiresPermission: (p) => p.canPropose,
    requiresFeature: () => true,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'End beneficiary — survivors workspace',
  },
  OPEN_PAYMENT_SCHEDULE: {
    route: (a) => `/bn/schedules?awardId=${a}`,
    requiresPermission: (p) => p.canServicePayments,
    requiresFeature: (f) => f.payments,
    requiresBusinessEligible: () => true,
    ...NAV_ONLY,
    description: 'Open payment schedule',
  },
  OPEN_PAYMENT_INSTRUCTION: {
    route: (a) => `/bn/payables?awardId=${a}`,
    requiresPermission: (p) => p.canServicePayments,
    requiresFeature: (f) => f.payments,
    requiresBusinessEligible: () => true,
    ...NAV_ONLY,
    description: 'Open payables queue',
  },
  OPEN_PAYMENT_BATCH: {
    route: () => `/bn/batches`,
    requiresPermission: (p) => p.canServicePayments,
    requiresFeature: (f) => f.payments,
    requiresBusinessEligible: () => true,
    ...NAV_ONLY,
    description: 'Open batch operations',
  },
  OPEN_PAYMENT_EXCEPTION: {
    route: () => `/bn/exceptions`,
    requiresPermission: (p) => p.canServicePayments,
    requiresFeature: (f) => f.payments,
    requiresBusinessEligible: () => true,
    ...NAV_ONLY,
    description: 'Open payment exceptions',
  },
  CANCEL_PAYMENT: {
    route: (a) => `/bn/payables?awardId=${a}`,
    requiresPermission: (p) => p.canServicePayments && p.canPropose,
    requiresFeature: (f) => f.payments,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Cancel queued payment instruction',
  },
  REISSUE_PAYMENT: {
    route: () => `/bn/issue`,
    requiresPermission: (p) => p.canServicePayments && p.canPropose,
    requiresFeature: (f) => f.payments,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Reissue failed/returned payment',
  },
  VERIFY_LIFE_CERTIFICATE: {
    route: (a) => `/bn/life-certificates?awardId=${a}`,
    requiresPermission: (p) => p.canServiceLifeCert && p.canApprove,
    requiresFeature: (f) => f.lifeCert,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Verify life certificate submission',
  },
  RECORD_LIFE_CERTIFICATE_RECEIPT: {
    route: (a) => `/bn/life-certificates?awardId=${a}`,
    requiresPermission: (p) => p.canServiceLifeCert,
    requiresFeature: (f) => f.lifeCert,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Record life certificate receipt',
  },
  SEND_LIFE_CERTIFICATE_REMINDER: {
    route: (a) => `/bn/life-certificates?awardId=${a}`,
    requiresPermission: (p) => p.canServiceLifeCert && p.canServiceCommunications,
    requiresFeature: (f) => f.lifeCert,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Trigger life certificate reminder via Communication Hub',
  },
  SCHEDULE_MEDICAL_REVIEW: {
    route: (a) => `/bn/medical-reviews?awardId=${a}`,
    requiresPermission: (p) => p.canServiceMedical,
    requiresFeature: (f) => f.medicalReview,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Schedule medical review',
  },
  RECORD_MEDICAL_OUTCOME: {
    route: (a) => `/bn/medical-reviews?awardId=${a}`,
    requiresPermission: (p) => p.canServiceMedical && p.canApprove,
    requiresFeature: (f) => f.medicalReview,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Record medical review outcome',
  },
  REFER_MEDICAL_BOARD: {
    route: (a) => `/bn/medical-reviews?awardId=${a}`,
    requiresPermission: (p) => p.canServiceMedical && p.canPropose,
    requiresFeature: (f) => f.medicalReview,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Refer to medical board',
  },
  PROPOSE_SUSPENSION: {
    route: (a) => `/bn/award-suspension?awardId=${a}`,
    requiresPermission: (p) => p.canServiceSuspension && p.canPropose,
    requiresFeature: (f) => f.awardSuspension,
    requiresBusinessEligible: (i) => i.awardStatus !== 'SUSPENDED' && i.awardStatus !== 'TERMINATED',
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Propose new suspension request',
  },
  REVIEW_SUSPENSION: {
    route: (a) => `/bn/award-suspension?awardId=${a}`,
    requiresPermission: (p) => p.canServiceSuspension && p.canApprove,
    requiresFeature: (f) => f.awardSuspension,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Review a suspension approval',
  },
  PROPOSE_RESUMPTION: {
    route: (a) => `/bn/award-suspension?awardId=${a}`,
    requiresPermission: (p) => p.canServiceSuspension && p.canPropose,
    requiresFeature: (f) => f.awardSuspension,
    requiresBusinessEligible: (i) => i.awardStatus === 'SUSPENDED',
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Propose resumption from suspension',
  },
  OPEN_OVERPAYMENT: {
    route: (a) => `/bn/overpayments?awardId=${a}`,
    requiresPermission: (p) => p.canServiceOverpayment,
    requiresFeature: (f) => f.overpayment,
    requiresBusinessEligible: () => true,
    ...NAV_ONLY,
    description: 'Open overpayment recovery',
  },
  CONFIGURE_RECOVERY_PLAN: {
    route: (a) => `/bn/overpayments?awardId=${a}`,
    requiresPermission: (p) => p.canServiceOverpayment && p.canPropose,
    requiresFeature: (f) => f.overpayment,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Configure overpayment recovery plan',
  },
  REQUEST_OVERPAYMENT_WAIVER: {
    route: (a) => `/bn/overpayments?awardId=${a}`,
    requiresPermission: (p) => p.canServiceOverpayment && p.canPropose,
    requiresFeature: (f) => f.overpayment,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Request overpayment waiver',
  },
  SEND_AWARD_COMMUNICATION: {
    route: () => `/admin/communication-hub`,
    requiresPermission: (p) => p.canServiceCommunications,
    requiresFeature: () => true,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Send award communication via Communication Hub façade',
  },
  RETRY_COMMUNICATION: {
    route: () => `/admin/communication-hub/retry-queue`,
    requiresPermission: (p) => p.canServiceCommunications,
    requiresFeature: () => true,
    requiresBusinessEligible: () => true,
    serverCommandAvailable: false,
    isMutation: true,
    description: 'Retry failed communication via Communication Hub',
  },
  EXPORT_AUDIT: {
    route: () => `/bn/audit-history`,
    requiresPermission: (p) => p.canViewCentralAudit,
    requiresFeature: () => true,
    requiresBusinessEligible: () => true,
    ...NAV_ONLY,
    description: 'Export audit timeline',
  },
};

export function getAwardActionAvailability(input: AwardActionInput): AwardActionAvailability {
  const rule = RULES[input.action];
  const permissionGranted = rule.requiresPermission(input.permissions);
  const rolloutEnabled = rule.requiresFeature(input.featureEnabled);
  const businessEligible = rule.requiresBusinessEligible(input);
  const targetRoute = rule.route(input.awardId);

  let enabled = false;
  let executionMode: AwardActionExecutionMode = 'DISABLED';
  let reason = rule.description;

  if (!rule.isMutation) {
    // NAVIGATE actions: enabled when permission + feature + business eligible.
    if (permissionGranted && rolloutEnabled && businessEligible) {
      enabled = true;
      executionMode = 'NAVIGATE';
      reason = rule.description;
    } else if (!permissionGranted) {
      reason = 'You do not have permission to open this workspace';
    } else if (!rolloutEnabled) {
      reason = 'This workspace is not enabled in the current environment';
    } else if (!businessEligible) {
      reason = 'This action does not apply to the current award state';
    }
  } else {
    // Mutations always require a server command + actions_enabled + all gates.
    if (!permissionGranted) {
      reason = 'You do not have permission for this action';
    } else if (!rolloutEnabled) {
      reason = 'The specialist workspace is not enabled in the current environment';
    } else if (!businessEligible) {
      reason = 'This action does not apply to the current award state';
    } else if (!input.actionsEnabled) {
      reason = 'app_modules.actions_enabled is false — mutation controls are dark-launched';
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

export function getAllAwardActions(input: Omit<AwardActionInput, 'action'>): Record<AwardActionKey, AwardActionAvailability> {
  const out = {} as Record<AwardActionKey, AwardActionAvailability>;
  (Object.keys(RULES) as AwardActionKey[]).forEach((k) => {
    out[k] = getAwardActionAvailability({ ...input, action: k });
  });
  return out;
}

export const AWARD_ACTION_ROUTES: Record<AwardActionKey, string> = Object.fromEntries(
  (Object.keys(RULES) as AwardActionKey[]).map((k) => [k, RULES[k].route('SAMPLE')]),
) as Record<AwardActionKey, string>;
