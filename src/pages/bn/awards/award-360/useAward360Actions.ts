/**
 * Award 360 shared action hook — BN-AWARD360-2.1F / 2.1F2.
 *
 * Computes the full action-availability matrix once, at Award 360 page level.
 * - Per-module rollout is fetched from the live `app_modules` table (keyed by
 *   canonical module name) via react-query.
 * - Action-specific capability results are supplied from
 *   `useAward360Permissions`. Mutation permission checks are driven by these
 *   capability results — suspension propose/approve are NEVER borrowed for
 *   unrelated actions.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  getAllAwardActions,
  getAwardActionAvailability,
  AWARD_ACTION_BINDINGS,
  type AwardActionAvailability,
  type AwardActionContext,
  type AwardActionFeatureFlags,
  type AwardActionInput,
  type AwardActionKey,
  type AwardActionPermissions,
  type AwardActionRolloutState,
  type AwardModuleRollout,
  type CapabilityResultLike,
  type CapabilityRolloutState,
} from '@/services/bn/awards/awardActionAvailability';

/**
 * Canonical specialist modules whose rollout state governs Award 360 actions.
 * Every owning module referenced by `AWARD_ACTION_BINDINGS` must appear here.
 */
const SPECIALIST_MODULE_NAMES = Array.from(
  new Set(
    Object.values(AWARD_ACTION_BINDINGS)
      .map((b) => b.owningModule)
      .filter((v): v is string => !!v),
  ),
);

interface ModuleRolloutRow {
  name: string;
  is_enabled: boolean | null;
  routes_enabled: boolean | null;
  actions_enabled: boolean | null;
  show_in_menu?: boolean | null;
}

async function fetchRolloutSnapshot(): Promise<Record<string, ModuleRolloutRow>> {
  const { data, error } = await supabase
    .from('app_modules')
    .select('name, is_enabled, routes_enabled, actions_enabled, show_in_menu')
    .in('name', SPECIALIST_MODULE_NAMES);
  if (error) throw error;
  const out: Record<string, ModuleRolloutRow> = {};
  for (const row of (data ?? []) as ModuleRolloutRow[]) {
    out[row.name] = row;
  }
  return out;
}

function toRollout(name: string, row: ModuleRolloutRow | undefined): AwardModuleRollout {
  if (!row) {
    return {
      moduleName: name,
      moduleExists: false,
      isEnabled: false,
      routesEnabled: false,
      actionsEnabled: false,
      showInMenu: false,
    };
  }
  return {
    moduleName: name,
    moduleExists: true,
    isEnabled: row.is_enabled !== false,
    routesEnabled: row.routes_enabled !== false,
    actionsEnabled: row.actions_enabled === true,
    showInMenu: row.show_in_menu !== false,
  };
}

function buildRollout(snapshot: Record<string, ModuleRolloutRow>): Record<string, AwardModuleRollout> {
  const out: Record<string, AwardModuleRollout> = {};
  for (const name of SPECIALIST_MODULE_NAMES) {
    out[name] = toRollout(name, snapshot[name]);
  }
  return out;
}

/**
 * Compat: derive the legacy per-capability rollout state from the per-module
 * rollout so callers that still pass `rolloutStates` keep working. This mirrors
 * the old capability→module wiring for the aggregate `beneficiaries`,
 * `overpayments`, `communications`, `payments`, etc. buckets.
 */
const LEGACY_CAPABILITY_TO_MODULE: Record<string, string> = {
  award: 'bn_awards_list',
  beneficiaries: 'bn_survivors',
  overpayments: 'bn_overpayments',
  communications: 'communication_hub_lifecycle_log',
  payments: 'bn_payment_history',
  lifeCertificates: 'bn_life_certificates',
  medicalReviews: 'bn_medical_reviews',
  suspensions: 'bn_award_suspension',
  audit: 'bn_audit_history',
};

function buildLegacyRolloutStates(rollout: Record<string, AwardModuleRollout>): AwardActionRolloutState {
  const toState = (m: AwardModuleRollout | undefined): CapabilityRolloutState => ({
    moduleExists: !!m?.moduleExists,
    moduleEnabled: !!m?.isEnabled,
    routesEnabled: !!m?.routesEnabled,
    actionsEnabled: !!m?.actionsEnabled,
  });
  const out = {} as AwardActionRolloutState;
  (Object.keys(LEGACY_CAPABILITY_TO_MODULE) as (keyof AwardActionRolloutState)[]).forEach((cap) => {
    out[cap] = toState(rollout[LEGACY_CAPABILITY_TO_MODULE[cap as string]]);
  });
  return out;
}

export interface UseAward360ActionsInput {
  awardId: string;
  awardStatus?: string | null;
  pensionerDeceased?: boolean;
  hasClaimId?: boolean;
  hasProductVersion?: boolean;
  claimId?: string | null;
  permissions: AwardActionPermissions;
  featureFlags: AwardActionFeatureFlags;
  /**
   * Typed capability map from `useAward360Permissions`. When present, action
   * permission gating is driven by the specific capability referenced by each
   * rule (see `AWARD_ACTION_BINDINGS`).
   */
  capabilities?: Record<string, CapabilityResultLike>;
}

export interface UseAward360ActionsResult {
  actions: Record<AwardActionKey, AwardActionAvailability>;
  rollout: Record<string, AwardModuleRollout>;
  rolloutStates: AwardActionRolloutState;
  isLoading: boolean;
  /** Evaluate one action with a row-scoped context override. */
  evaluate: (action: AwardActionKey, context?: AwardActionContext) => AwardActionAvailability;
  /** Convenience: evaluate every action for a beneficiary row. */
  forBeneficiary: (ctx: AwardActionContext) => Partial<Record<AwardActionKey, AwardActionAvailability>>;
  forOverpayment: (ctx: AwardActionContext) => Partial<Record<AwardActionKey, AwardActionAvailability>>;
  forCommunication: (ctx: AwardActionContext) => Partial<Record<AwardActionKey, AwardActionAvailability>>;
}

export function useAward360Actions(input: UseAward360ActionsInput): UseAward360ActionsResult {
  const rolloutQ = useQuery({
    queryKey: ['award360-rollout-snapshot', 'v2'],
    queryFn: fetchRolloutSnapshot,
    staleTime: 5 * 60_000,
  });

  const rollout = useMemo(() => buildRollout(rolloutQ.data ?? {}), [rolloutQ.data]);
  const rolloutStates = useMemo(() => buildLegacyRolloutStates(rollout), [rollout]);

  const baseInput = useMemo<Omit<AwardActionInput, 'action'>>(
    () => ({
      awardId: input.awardId,
      awardStatus: input.awardStatus ?? null,
      pensionerDeceased: input.pensionerDeceased ?? false,
      hasClaimId: input.hasClaimId ?? false,
      hasProductVersion: input.hasProductVersion ?? false,
      claimId: input.claimId ?? null,
      permissions: input.permissions,
      featureEnabled: input.featureFlags,
      rolloutStates,
      rollout,
      capabilities: input.capabilities,
    }),
    [
      input.awardId,
      input.awardStatus,
      input.pensionerDeceased,
      input.hasClaimId,
      input.hasProductVersion,
      input.claimId,
      input.permissions,
      input.featureFlags,
      rolloutStates,
      rollout,
      input.capabilities,
    ],
  );

  const actions = useMemo(() => getAllAwardActions(baseInput), [baseInput]);

  const evaluate = useMemo(
    () => (action: AwardActionKey, context?: AwardActionContext) =>
      getAwardActionAvailability({ ...baseInput, action, context }),
    [baseInput],
  );

  const forBeneficiary = useMemo(
    () => (ctx: AwardActionContext) => ({
      AMEND_BENEFICIARY: evaluate('AMEND_BENEFICIARY', ctx),
      END_BENEFICIARY: evaluate('END_BENEFICIARY', ctx),
      OPEN_PERSON_360: evaluate('OPEN_PERSON_360', ctx),
      OPEN_PAYMENT_PROFILE: evaluate('OPEN_PAYMENT_PROFILE', ctx),
      OPEN_SURVIVORS_WORKSPACE: evaluate('OPEN_SURVIVORS_WORKSPACE', ctx),
    }),
    [evaluate],
  );

  const forOverpayment = useMemo(
    () => (ctx: AwardActionContext) => ({
      OPEN_OVERPAYMENT: evaluate('OPEN_OVERPAYMENT', ctx),
      CONFIGURE_RECOVERY_PLAN: evaluate('CONFIGURE_RECOVERY_PLAN', ctx),
      REQUEST_OVERPAYMENT_WAIVER: evaluate('REQUEST_OVERPAYMENT_WAIVER', ctx),
    }),
    [evaluate],
  );

  const forCommunication = useMemo(
    () => (ctx: AwardActionContext) => ({
      RETRY_COMMUNICATION: evaluate('RETRY_COMMUNICATION', ctx),
      OPEN_COMMUNICATION_HUB: evaluate('OPEN_COMMUNICATION_HUB', ctx),
      OPEN_COMMUNICATION_DELIVERY_MONITOR: evaluate('OPEN_COMMUNICATION_DELIVERY_MONITOR', ctx),
      OPEN_COMMUNICATION_RETRY_QUEUE: evaluate('OPEN_COMMUNICATION_RETRY_QUEUE', ctx),
    }),
    [evaluate],
  );

  return {
    actions,
    rollout,
    rolloutStates,
    isLoading: rolloutQ.isLoading,
    evaluate,
    forBeneficiary,
    forOverpayment,
    forCommunication,
  };
}
