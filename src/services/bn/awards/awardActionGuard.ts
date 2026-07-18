/**
 * AW360-WAVE-1-C1 Stage D4 — Canonical Award 360 runtime execution guard.
 *
 * Single source of truth for state-changing (and, when forced, navigation)
 * Award 360 execution paths. This module MUST be called by every mutation
 * handler, background job, deep-link acceptor, keyboard-shortcut executor
 * or bulk-action driver that touches an Award 360 action. Client-side
 * button visibility / disabled state is NOT a substitute for this guard.
 *
 * Contract:
 *   1. Recomputes availability at execution time from the canonical resolver
 *      (`getAwardActionAvailability`) — never trusts a cached UI decision.
 *   2. Emits a stable, machine-readable `reasonCode` for every denial, so
 *      audit, logging, and negative-security tests can assert exact codes.
 *   3. `assertAwardActionExecutable(...)` throws `AwardActionGuardError` on
 *      denial. Callers MAY catch and translate; they MUST NOT proceed with
 *      the underlying mutation when the guard denies.
 *   4. The guard never elevates. It cannot say "allowed" for an action the
 *      resolver reports as DISABLED — parity is enforced by unit tests.
 *
 * Non-goals:
 *   - The guard does NOT own permission or rollout state; those are supplied
 *     by the caller (typically `useAward360Actions` at UI level, or a
 *     server-side resolver at execution time). This keeps a single resolver.
 *   - The guard does NOT introduce a second registry, reason-code map, or
 *     screen-specific action metadata.
 */
import {
  AWARD_ACTION_BINDINGS,
  AWARD_ACTION_IS_MUTATION,
  AWARD_ACTION_SERVER_COMMAND_AVAILABLE,
  getAwardActionAvailability,
  type AwardActionAvailability,
  type AwardActionInput,
  type AwardActionKey,
} from './awardActionAvailability';

/**
 * Stable, machine-readable denial codes. Do NOT rename or repurpose; audit
 * pipelines depend on the exact string values.
 */
export type AwardActionGuardReasonCode =
  | 'ALLOWED'
  | 'UNKNOWN_ACTION'
  | 'REGISTRATION_MISSING'
  | 'MODULE_DISABLED'
  | 'ROUTES_DISABLED'
  | 'FEATURE_FLAG_OFF'
  | 'PERMISSION_DENIED'
  | 'BUSINESS_INELIGIBLE'
  | 'MUTATION_DARK_LAUNCH'
  | 'SERVER_COMMAND_UNAVAILABLE';

export interface AwardActionGuardDecision {
  readonly action: AwardActionKey;
  readonly allowed: boolean;
  readonly reasonCode: AwardActionGuardReasonCode;
  readonly reason: string;
  readonly availability: AwardActionAvailability;
}

export class AwardActionGuardError extends Error {
  readonly action: AwardActionKey;
  readonly reasonCode: AwardActionGuardReasonCode;
  readonly availability: AwardActionAvailability;
  constructor(decision: AwardActionGuardDecision) {
    super(`Award action ${decision.action} blocked: ${decision.reasonCode} — ${decision.reason}`);
    this.name = 'AwardActionGuardError';
    this.action = decision.action;
    this.reasonCode = decision.reasonCode;
    this.availability = decision.availability;
  }
}

/**
 * Map a resolver `AwardActionAvailability` result to a stable reason code.
 * The resolver produces a human-readable `reason` string; the guard needs a
 * machine-readable code so audit/log/test assertions can be exact.
 */
function classify(input: AwardActionInput, av: AwardActionAvailability): AwardActionGuardReasonCode {
  if (av.enabled) return 'ALLOWED';

  const binding = AWARD_ACTION_BINDINGS[input.action];
  const isMutation = AWARD_ACTION_IS_MUTATION[input.action];
  const serverCommandAvailable = AWARD_ACTION_SERVER_COMMAND_AVAILABLE[input.action];

  // Prefer per-module rollout (BN-AWARD360-2.1F2) when supplied.
  const modRollout = binding.owningModule && input.rollout
    ? input.rollout[binding.owningModule]
    : undefined;

  if (modRollout) {
    if (!modRollout.moduleExists) return 'REGISTRATION_MISSING';
    if (!modRollout.isEnabled) return 'MODULE_DISABLED';
    if (!modRollout.routesEnabled) return 'ROUTES_DISABLED';
  }

  if (!av.rolloutEnabled) {
    // The resolver folds feature-flag + rollout into rolloutEnabled.
    // Distinguish by inspecting featureEnabled directly.
    // If feature is off, that is the code; otherwise route/module was the block.
    const flag = input.featureEnabled;
    // If any relevant feature is off we surface FEATURE_FLAG_OFF; otherwise
    // it's a module/route rollout block that the modRollout branch above
    // couldn't observe (e.g. legacy rolloutStates path).
    // Heuristic: if reason mentions "feature" or "workspace is not enabled by feature",
    // classify as FEATURE_FLAG_OFF.
    if (/feature/i.test(av.reason)) return 'FEATURE_FLAG_OFF';
    if (/routes?_enabled|route is not enabled/i.test(av.reason)) return 'ROUTES_DISABLED';
    if (/module is disabled|not available/i.test(av.reason)) return av.reason.includes('not available')
      ? 'REGISTRATION_MISSING'
      : 'MODULE_DISABLED';
    void flag;
  }

  if (!av.permissionGranted) return 'PERMISSION_DENIED';
  if (!av.businessEligible) return 'BUSINESS_INELIGIBLE';

  if (isMutation) {
    // Mutation-specific dark-launch codes.
    if (modRollout && modRollout.actionsEnabled === false) return 'MUTATION_DARK_LAUNCH';
    if (!serverCommandAvailable) return 'SERVER_COMMAND_UNAVAILABLE';
    if (/actions_enabled is false|dark-launched/i.test(av.reason)) return 'MUTATION_DARK_LAUNCH';
    if (/no server-authorised command/i.test(av.reason)) return 'SERVER_COMMAND_UNAVAILABLE';
  }

  // Fallback — should not occur if resolver output is well-formed.
  return 'PERMISSION_DENIED';
}

/**
 * Non-throwing form. Prefer this when the caller wants to log the decision
 * (e.g. for negative-security audit) before deciding whether to abort.
 */
export function evaluateAwardActionGuard(input: AwardActionInput): AwardActionGuardDecision {
  if (!(input.action in AWARD_ACTION_BINDINGS)) {
    const stub: AwardActionAvailability = {
      action: input.action,
      capability: 'award',
      visible: false,
      enabled: false,
      permissionGranted: false,
      rolloutEnabled: false,
      businessEligible: false,
      reason: `Unknown Award action: ${String(input.action)}`,
      executionMode: 'DISABLED',
    };
    return {
      action: input.action,
      allowed: false,
      reasonCode: 'UNKNOWN_ACTION',
      reason: stub.reason,
      availability: stub,
    };
  }
  const av = getAwardActionAvailability(input);
  const reasonCode = classify(input, av);
  return {
    action: input.action,
    allowed: reasonCode === 'ALLOWED',
    reasonCode,
    reason: av.reason,
    availability: av,
  };
}

/**
 * Throwing form. Callers performing a real state change MUST use this at the
 * top of the mutation handler.
 *
 *   const decision = assertAwardActionExecutable({ action: 'CANCEL_PAYMENT', ... });
 *   // proceeds only when allowed; throws AwardActionGuardError otherwise.
 */
export function assertAwardActionExecutable(input: AwardActionInput): AwardActionGuardDecision {
  const decision = evaluateAwardActionGuard(input);
  if (!decision.allowed) throw new AwardActionGuardError(decision);
  return decision;
}

/**
 * Convenience listing of every reason code — used by diagnostics and the
 * negative-security test to iterate exhaustively.
 */
export const AWARD_ACTION_GUARD_REASON_CODES: readonly AwardActionGuardReasonCode[] = [
  'ALLOWED',
  'UNKNOWN_ACTION',
  'REGISTRATION_MISSING',
  'MODULE_DISABLED',
  'ROUTES_DISABLED',
  'FEATURE_FLAG_OFF',
  'PERMISSION_DENIED',
  'BUSINESS_INELIGIBLE',
  'MUTATION_DARK_LAUNCH',
  'SERVER_COMMAND_UNAVAILABLE',
];
