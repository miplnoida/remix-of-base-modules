/**
 * Award 360 shared action hook — BN-AWARD360-2.1F.
 *
 * Computes the full action-availability matrix once, at Award 360 page level.
 * Each capability's rollout state (`moduleExists`/`moduleEnabled`/
 * `routesEnabled`/`actionsEnabled`) is resolved from the live `app_modules`
 * table via react-query.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  getAllAwardActions,
  getAwardActionAvailability,
  type AwardActionAvailability,
  type AwardActionCapability,
  type AwardActionContext,
  type AwardActionFeatureFlags,
  type AwardActionInput,
  type AwardActionKey,
  type AwardActionPermissions,
  type AwardActionRolloutState,
  type CapabilityRolloutState,
} from '@/services/bn/awards/awardActionAvailability';

/**
 * Map from Award 360 capability → the canonical `app_modules.name` whose
 * rollout state gates that capability. `award` and `audit` reuse the award-
 * list + audit-history modules; specialist capabilities own their route.
 */
const CAPABILITY_MODULE: Record<AwardActionCapability, string> = {
  award: 'bn_awards_list',
  beneficiaries: 'bn_awards_list',
  overpayments: 'bn_overpayments',
  communications: 'communication_hub_lifecycle_log',
  payments: 'bn_payment_history',
  lifeCertificates: 'bn_life_certificates',
  medicalReviews: 'bn_medical_reviews',
  suspensions: 'bn_award_suspension',
  audit: 'bn_audit_history',
};

interface ModuleRolloutRow {
  name: string;
  is_enabled: boolean | null;
  routes_enabled: boolean | null;
  actions_enabled: boolean | null;
}

async function fetchRolloutSnapshot(): Promise<Record<string, ModuleRolloutRow>> {
  const names = Array.from(new Set(Object.values(CAPABILITY_MODULE)));
  const { data, error } = await supabase
    .from('app_modules')
    .select('name, is_enabled, routes_enabled, actions_enabled')
    .in('name', names);
  if (error) throw error;
  const out: Record<string, ModuleRolloutRow> = {};
  for (const row of (data ?? []) as ModuleRolloutRow[]) {
    out[row.name] = row;
  }
  return out;
}

function toState(row: ModuleRolloutRow | undefined): CapabilityRolloutState {
  if (!row) return { moduleExists: false, moduleEnabled: false, routesEnabled: false, actionsEnabled: false };
  return {
    moduleExists: true,
    moduleEnabled: row.is_enabled !== false,
    routesEnabled: row.routes_enabled !== false,
    actionsEnabled: row.actions_enabled === true,
  };
}

function buildRolloutStates(snapshot: Record<string, ModuleRolloutRow>): AwardActionRolloutState {
  const state = {} as AwardActionRolloutState;
  (Object.keys(CAPABILITY_MODULE) as AwardActionCapability[]).forEach((cap) => {
    state[cap] = toState(snapshot[CAPABILITY_MODULE[cap]]);
  });
  return state;
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
}

export interface UseAward360ActionsResult {
  actions: Record<AwardActionKey, AwardActionAvailability>;
  rolloutStates: AwardActionRolloutState;
  isLoading: boolean;
  /**
   * Evaluate a single action with a row-specific context override (e.g. the
   * status of the communication row when deciding RETRY_COMMUNICATION).
   */
  evaluate: (action: AwardActionKey, context?: AwardActionContext) => AwardActionAvailability;
}

export function useAward360Actions(input: UseAward360ActionsInput): UseAward360ActionsResult {
  const rolloutQ = useQuery({
    queryKey: ['award360-rollout-snapshot'],
    queryFn: fetchRolloutSnapshot,
    staleTime: 5 * 60_000,
  });

  const rolloutStates = useMemo(
    () => buildRolloutStates(rolloutQ.data ?? {}),
    [rolloutQ.data],
  );

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
    ],
  );

  const actions = useMemo(() => getAllAwardActions(baseInput), [baseInput]);

  const evaluate = useMemo(
    () => (action: AwardActionKey, context?: AwardActionContext) =>
      getAwardActionAvailability({ ...baseInput, action, context }),
    [baseInput],
  );

  return {
    actions,
    rolloutStates,
    isLoading: rolloutQ.isLoading,
    evaluate,
  };
}
