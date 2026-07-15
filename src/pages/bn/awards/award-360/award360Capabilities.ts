/**
 * Award 360 capability registry — BN-AWARD360-B3.
 *
 * Authoritative mapping from Award 360 UI capabilities to the *canonical* live
 * `app_modules` / `module_actions` rows. Do NOT introduce generic module names
 * that are not registered in the database (e.g. `bn_awards`, `bn_audit`,
 * `bn_payments`, `bn_communications`). Every capability lists a real module
 * verified against the live registry; when a module or action is missing the
 * resolver returns a diagnostic result and denies the capability.
 *
 * Verified live registry rows (queried 2026-07-15):
 *   bn_awards_list, bn_awards_group, bn_award_suspension, bn_audit_history,
 *   bn_life_certificates, bn_medical_reviews, bn_overpayments,
 *   bn_payment_history, bn_payment_profiles, bn_person_360,
 *   bn_product_catalog, bn_claim_worklist,
 *   communication_hub_lifecycle_log, communication_hub_delivery_monitor,
 *   communication_hub_dispatch_register.
 *
 * Communication *content* visibility (rendered subject/body) is intentionally
 * denied for every user (including admin) because no dedicated action such as
 * `view_content` / `view_sensitive` / `preview_rendered_content` currently
 * exists in the registry. A future migration may add it. Do NOT fall back to
 * metadata-view or template-configuration permission as a substitute.
 */

export type Award360Capability =
  | 'AWARD_VIEW'
  | 'PENSIONER_VIEW'
  | 'CLAIM_VIEW'
  | 'CLAIM_EVIDENCE_VIEW'
  | 'CLAIM_WORKFLOW_VIEW'
  | 'PRODUCT_VIEW'
  | 'PRODUCT_CONFIGURATION_VIEW'
  | 'PAYMENT_PROFILE_VIEW'
  | 'PAYMENT_HISTORY_VIEW'
  | 'PAYMENT_SERVICING_VIEW'
  | 'LIFE_CERTIFICATE_VIEW'
  | 'MEDICAL_REVIEW_VIEW'
  | 'OVERPAYMENT_VIEW'
  | 'SUSPENSION_VIEW'
  | 'COMMUNICATION_METADATA_VIEW'
  | 'COMMUNICATION_CONTENT_VIEW'
  | 'CENTRAL_AUDIT_VIEW'
  | 'AUDIT_EXPORT'
  // Action-specific capabilities — BN-AWARD360-2.1F2. Bound to specialist
  // module actions. Where the action is not registered the resolver returns
  // { permissionGranted: false, reason: 'Registered action not found: …' } and
  // admin does NOT bypass. Suspension propose/approve are NEVER borrowed.
  | 'BENEFICIARY_WORKSPACE_VIEW'
  | 'BENEFICIARY_ADD'
  | 'BENEFICIARY_AMEND'
  | 'BENEFICIARY_END'
  | 'OVERPAYMENT_WORKSPACE_VIEW'
  | 'OVERPAYMENT_CONFIGURE_RECOVERY'
  | 'OVERPAYMENT_REQUEST_WAIVER'
  | 'COMMUNICATION_HUB_VIEW'
  | 'COMMUNICATION_DELIVERY_VIEW'
  | 'COMMUNICATION_RETRY_QUEUE_VIEW'
  | 'COMMUNICATION_SEND'
  | 'COMMUNICATION_RETRY'
  | 'PAYMENT_CANCEL'
  | 'PAYMENT_REISSUE'
  | 'LIFE_CERTIFICATE_RECORD_RECEIPT'
  | 'LIFE_CERTIFICATE_VERIFY'
  | 'LIFE_CERTIFICATE_SEND_REMINDER'
  | 'MEDICAL_REVIEW_SCHEDULE'
  | 'MEDICAL_REVIEW_RECORD_OUTCOME'
  | 'MEDICAL_REVIEW_REFER_BOARD'
  | 'SUSPENSION_PROPOSE'
  | 'SUSPENSION_APPROVE'
  | 'SUSPENSION_RESUME_PROPOSE';

export interface Award360CapabilityBinding {
  capability: Award360Capability;
  /** Canonical module name in `app_modules`. `null` means intentionally unmapped. */
  moduleName: string | null;
  /** Action name in `module_actions`. `null` means no action currently exists. */
  action: string | null;
  /** When true, the capability is denied for every user regardless of admin. */
  denyForAll?: boolean;
  /** Human-readable note explaining the mapping/absence. */
  note?: string;
}

export interface Award360CapabilityResult {
  capability: Award360Capability;
  moduleName: string | null;
  action: string | null;
  moduleExists: boolean;
  moduleEnabled: boolean;
  routeEnabled: boolean;
  actionExists: boolean;
  actionEnabled: boolean;
  permissionGranted: boolean;
  /**
   * Effective read-only access. Combines module/route/action existence and
   * enable flags with the user's permission or admin override. Note that
   * `actions_enabled=false` does NOT block read-only tab access — only the
   * ability to invoke mutation actions.
   */
  effectiveAccess: boolean;
  reason: string;
}

export interface Award360ModuleRegistryState {
  moduleName: string;
  moduleExists: boolean;
  moduleEnabled: boolean;
  routesEnabled: boolean;
  actionsEnabled: boolean;
  showInMenu: boolean;
  rolloutState: string | null;
  internalOnly: boolean;
}

/**
 * Canonical mapping. Every entry references a real live registry row unless
 * `moduleName` is `null` (which signals an intentional deny-for-all until a
 * dedicated action is registered).
 */
export const AWARD_360_CAPABILITY_REGISTRY: Record<Award360Capability, Award360CapabilityBinding> = {
  AWARD_VIEW:                  { capability: 'AWARD_VIEW',                  moduleName: 'bn_awards_list',       action: 'view' },
  PENSIONER_VIEW:              { capability: 'PENSIONER_VIEW',              moduleName: 'bn_person_360',        action: 'view' },
  CLAIM_VIEW:                  { capability: 'CLAIM_VIEW',                  moduleName: 'bn_claim_worklist',    action: 'view' },
  CLAIM_EVIDENCE_VIEW:         { capability: 'CLAIM_EVIDENCE_VIEW',         moduleName: 'bn_claim_worklist',    action: 'view',
    note: 'No dedicated evidence action registered; reuses claim view.' },
  CLAIM_WORKFLOW_VIEW:         { capability: 'CLAIM_WORKFLOW_VIEW',         moduleName: 'bn_claim_worklist',    action: 'view',
    note: 'No dedicated workflow action registered; reuses claim view.' },
  PRODUCT_VIEW:                { capability: 'PRODUCT_VIEW',                moduleName: 'bn_product_catalog',   action: 'view' },
  PRODUCT_CONFIGURATION_VIEW:  { capability: 'PRODUCT_CONFIGURATION_VIEW',  moduleName: 'bn_product_catalog',   action: 'view',
    note: 'No dedicated configuration action registered; reuses catalog view.' },
  PAYMENT_PROFILE_VIEW:        { capability: 'PAYMENT_PROFILE_VIEW',        moduleName: 'bn_payment_profiles',  action: 'view' },
  PAYMENT_HISTORY_VIEW:        { capability: 'PAYMENT_HISTORY_VIEW',        moduleName: 'bn_payment_history',   action: 'view' },
  PAYMENT_SERVICING_VIEW:      { capability: 'PAYMENT_SERVICING_VIEW',      moduleName: 'bn_payment_history',   action: 'view',
    note: 'Servicing view reuses payment-history read; no separate servicing module registered.' },
  LIFE_CERTIFICATE_VIEW:       { capability: 'LIFE_CERTIFICATE_VIEW',       moduleName: 'bn_life_certificates', action: 'view' },
  MEDICAL_REVIEW_VIEW:         { capability: 'MEDICAL_REVIEW_VIEW',         moduleName: 'bn_medical_reviews',   action: 'view' },
  OVERPAYMENT_VIEW:            { capability: 'OVERPAYMENT_VIEW',            moduleName: 'bn_overpayments',      action: 'view' },
  SUSPENSION_VIEW:             { capability: 'SUSPENSION_VIEW',             moduleName: 'bn_award_suspension',  action: 'view' },
  COMMUNICATION_METADATA_VIEW: { capability: 'COMMUNICATION_METADATA_VIEW', moduleName: 'communication_hub_lifecycle_log', action: 'view',
    note: 'Metadata-only. Delivery Monitor is a valid alternative but Lifecycle Log is the canonical read.' },
  COMMUNICATION_CONTENT_VIEW:  { capability: 'COMMUNICATION_CONTENT_VIEW',  moduleName: null, action: null, denyForAll: true,
    note: 'No dedicated view_content / view_sensitive / preview_rendered_content action currently exists. Deny for every user, including admin, until registered.' },
  CENTRAL_AUDIT_VIEW:          { capability: 'CENTRAL_AUDIT_VIEW',          moduleName: 'bn_audit_history',     action: 'view' },
  AUDIT_EXPORT:                { capability: 'AUDIT_EXPORT',                moduleName: 'bn_audit_history',     action: 'view',
    note: 'No dedicated export action registered; reuses audit view.' },

  // ---- Action-specific capabilities (BN-AWARD360-2.1F2) ----
  // Beneficiaries — owning module bn_survivors currently registers NO actions.
  BENEFICIARY_WORKSPACE_VIEW: { capability: 'BENEFICIARY_WORKSPACE_VIEW', moduleName: 'bn_survivors', action: 'view',
    note: 'Owning module for beneficiary workspace navigation.' },
  BENEFICIARY_ADD:            { capability: 'BENEFICIARY_ADD',            moduleName: 'bn_survivors', action: 'add' },
  BENEFICIARY_AMEND:          { capability: 'BENEFICIARY_AMEND',          moduleName: 'bn_survivors', action: 'amend' },
  BENEFICIARY_END:            { capability: 'BENEFICIARY_END',            moduleName: 'bn_survivors', action: 'end' },

  // Overpayments — only "view" registered.
  OVERPAYMENT_WORKSPACE_VIEW:      { capability: 'OVERPAYMENT_WORKSPACE_VIEW',      moduleName: 'bn_overpayments', action: 'view' },
  OVERPAYMENT_CONFIGURE_RECOVERY:  { capability: 'OVERPAYMENT_CONFIGURE_RECOVERY',  moduleName: 'bn_overpayments', action: 'configure_recovery' },
  OVERPAYMENT_REQUEST_WAIVER:      { capability: 'OVERPAYMENT_REQUEST_WAIVER',      moduleName: 'bn_overpayments', action: 'request_waiver' },

  // Communication Hub — only "view" registered on each Hub module.
  COMMUNICATION_HUB_VIEW:            { capability: 'COMMUNICATION_HUB_VIEW',            moduleName: 'communication_hub_lifecycle_log',    action: 'view' },
  COMMUNICATION_DELIVERY_VIEW:       { capability: 'COMMUNICATION_DELIVERY_VIEW',       moduleName: 'communication_hub_delivery_monitor', action: 'view' },
  COMMUNICATION_RETRY_QUEUE_VIEW:    { capability: 'COMMUNICATION_RETRY_QUEUE_VIEW',    moduleName: 'communication_hub_retry_queue',      action: 'view' },
  COMMUNICATION_SEND:                { capability: 'COMMUNICATION_SEND',                moduleName: 'communication_hub_dispatch_register', action: 'send' },
  COMMUNICATION_RETRY:               { capability: 'COMMUNICATION_RETRY',               moduleName: 'communication_hub_retry_queue',      action: 'retry' },

  // Payments — only CRUD on bn_payment_history is registered.
  PAYMENT_CANCEL:  { capability: 'PAYMENT_CANCEL',  moduleName: 'bn_payment_history', action: 'cancel' },
  PAYMENT_REISSUE: { capability: 'PAYMENT_REISSUE', moduleName: 'bn_payment_history', action: 'reissue' },

  // Life Certificates — only "view" registered.
  LIFE_CERTIFICATE_RECORD_RECEIPT: { capability: 'LIFE_CERTIFICATE_RECORD_RECEIPT', moduleName: 'bn_life_certificates', action: 'record_receipt' },
  LIFE_CERTIFICATE_VERIFY:         { capability: 'LIFE_CERTIFICATE_VERIFY',         moduleName: 'bn_life_certificates', action: 'verify' },
  LIFE_CERTIFICATE_SEND_REMINDER:  { capability: 'LIFE_CERTIFICATE_SEND_REMINDER',  moduleName: 'bn_life_certificates', action: 'send_reminder' },

  // Medical Reviews — only "view" registered.
  MEDICAL_REVIEW_SCHEDULE:        { capability: 'MEDICAL_REVIEW_SCHEDULE',        moduleName: 'bn_medical_reviews', action: 'schedule' },
  MEDICAL_REVIEW_RECORD_OUTCOME:  { capability: 'MEDICAL_REVIEW_RECORD_OUTCOME',  moduleName: 'bn_medical_reviews', action: 'record_outcome' },
  MEDICAL_REVIEW_REFER_BOARD:     { capability: 'MEDICAL_REVIEW_REFER_BOARD',     moduleName: 'bn_medical_reviews', action: 'refer_board' },

  // Suspensions — full lifecycle actions registered.
  SUSPENSION_PROPOSE:         { capability: 'SUSPENSION_PROPOSE',         moduleName: 'bn_award_suspension', action: 'propose' },
  SUSPENSION_APPROVE:         { capability: 'SUSPENSION_APPROVE',         moduleName: 'bn_award_suspension', action: 'approve' },
  SUSPENSION_RESUME_PROPOSE:  { capability: 'SUSPENSION_RESUME_PROPOSE',  moduleName: 'bn_award_suspension', action: 'resume_propose' },
};

/**
 * A user permission listing — the shape produced by `fetchAllUserPermissions`
 * inside `useNavigationMenu`. Kept explicit so the resolver is trivially
 * testable in isolation.
 */
export interface UserPermissionRecord {
  module_name: string;
  action_name: string;
}

export interface RegistrySnapshot {
  modules: ReadonlySet<string>;
  /** Map of `moduleName` → set of action_name. */
  actionsByModule: ReadonlyMap<string, ReadonlySet<string>>;
}

export interface ResolveCapabilitiesInput {
  registry: RegistrySnapshot;
  userPermissions: readonly UserPermissionRecord[];
  isAdmin: boolean;
  /** When true, emit console warnings for missing modules/actions. */
  warn?: (msg: string) => void;
}

/**
 * Pure resolver. Given a registry snapshot and a user permission listing,
 * evaluate every Award 360 capability.
 */
export function resolveAward360Capabilities(
  input: ResolveCapabilitiesInput,
): Record<Award360Capability, Award360CapabilityResult> {
  const { registry, userPermissions, isAdmin, warn } = input;
  const grantedIndex = new Map<string, Set<string>>();
  for (const p of userPermissions) {
    let set = grantedIndex.get(p.module_name);
    if (!set) {
      set = new Set();
      grantedIndex.set(p.module_name, set);
    }
    set.add(p.action_name);
  }

  const out = {} as Record<Award360Capability, Award360CapabilityResult>;
  for (const cap of Object.keys(AWARD_360_CAPABILITY_REGISTRY) as Award360Capability[]) {
    const binding = AWARD_360_CAPABILITY_REGISTRY[cap];

    if (binding.denyForAll) {
      out[cap] = {
        capability: cap,
        moduleName: binding.moduleName,
        action: binding.action,
        moduleExists: false,
        actionExists: false,
        permissionGranted: false,
        reason: binding.note ?? 'Capability is denied for every user by policy.',
      };
      continue;
    }

    const moduleName = binding.moduleName;
    const action = binding.action;
    if (!moduleName || !action) {
      out[cap] = {
        capability: cap,
        moduleName,
        action,
        moduleExists: false,
        actionExists: false,
        permissionGranted: false,
        reason: 'Capability has no module/action binding.',
      };
      continue;
    }

    const moduleExists = registry.modules.has(moduleName);
    if (!moduleExists) {
      const reason = `Registered module not found: ${moduleName}`;
      if (warn) warn(`[Award360] ${cap}: ${reason}`);
      out[cap] = { capability: cap, moduleName, action, moduleExists: false, actionExists: false, permissionGranted: false, reason };
      continue;
    }

    const actions = registry.actionsByModule.get(moduleName) ?? new Set<string>();
    const actionExists = actions.has(action);
    if (!actionExists) {
      const reason = `Registered action not found: ${moduleName}.${action}`;
      if (warn) warn(`[Award360] ${cap}: ${reason}`);
      out[cap] = { capability: cap, moduleName, action, moduleExists: true, actionExists: false, permissionGranted: false, reason };
      continue;
    }

    const granted = isAdmin || (grantedIndex.get(moduleName)?.has(action) ?? false);
    out[cap] = {
      capability: cap,
      moduleName,
      action,
      moduleExists: true,
      actionExists: true,
      permissionGranted: granted,
      reason: granted
        ? (isAdmin ? 'Granted via admin override.' : `Granted via ${moduleName}.${action}.`)
        : `User lacks ${moduleName}.${action}.`,
    };
  }
  return out;
}
