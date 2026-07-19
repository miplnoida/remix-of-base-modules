/**
 * BN Appeals — Claimant submission client-side service.
 *
 * This is the ONLY client-side entry-point for a claimant to submit an
 * appeal. It never touches `bn_appeal*` tables directly — instead it POSTs
 * an envelope to the `bn-appeals-claimant-submit` edge function, which
 * performs JWT authentication, ownership validation (via SSN linkage), and
 * atomic multi-row insertion through the `bn_appeal_submit_claimant` RPC.
 *
 * See docs/bn/gap-modules/APPEALS_MODULE.md for the end-to-end contract.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  BnGapCommandEnvelope,
} from '@/types/bn/gap/commandEnvelope';
import type { BnGapCommandResult } from '@/types/bn/gap/commandResult';
import {
  BN_APPEAL_TYPE_CATALOG,
  BN_APPEAL_GROUND_CODES,
  isValidAppealTypeCode,
} from '@/types/bn/gap/appeals/appealStateMachine';

export interface SubmitClaimantAppealInput {
  readonly bnClaimId: string;
  readonly appealTypeCode: string;
  readonly reasonSummary: string;
  readonly grounds: readonly {
    readonly groundCode: string;
    readonly groundText: string;
  }[];
  /** Optional immutable snapshot of the decision the appellant is disputing. */
  readonly decisionSnapshot?: Record<string, unknown>;
  /** BN audit user_code (never 'SYSTEM'). */
  readonly actorUserCode: string;
  /** Client-generated idempotency key; replays with the same key are safe. */
  readonly idempotencyKey: string;
  readonly correlationId: string;
}

export interface SubmitClaimantAppealResult {
  readonly appealId: string;
  readonly appealNumber: string;
}

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 2000;

/**
 * Structural validation performed BEFORE the network hop. Server-side
 * validation always re-runs the same checks (fail-closed at the boundary).
 */
export function validateSubmitClaimantAppealInput(
  input: SubmitClaimantAppealInput,
): { readonly ok: true } | { readonly ok: false; readonly code: string; readonly message: string } {
  if (!input.bnClaimId) return { ok: false, code: 'MISSING_CLAIM', message: 'A claim must be selected.' };
  if (!isValidAppealTypeCode(input.appealTypeCode)) {
    return { ok: false, code: 'INVALID_APPEAL_TYPE', message: 'Unrecognised appeal type.' };
  }
  const reason = input.reasonSummary?.trim() ?? '';
  if (reason.length < MIN_REASON_LENGTH) {
    return { ok: false, code: 'REASON_TOO_SHORT', message: `Reason must be at least ${MIN_REASON_LENGTH} characters.` };
  }
  if (reason.length > MAX_REASON_LENGTH) {
    return { ok: false, code: 'REASON_TOO_LONG', message: `Reason must be at most ${MAX_REASON_LENGTH} characters.` };
  }
  if (!input.grounds || input.grounds.length === 0) {
    return { ok: false, code: 'MISSING_GROUNDS', message: 'At least one ground is required.' };
  }
  for (const g of input.grounds) {
    if (!BN_APPEAL_GROUND_CODES.includes(g.groundCode)) {
      return { ok: false, code: 'UNKNOWN_GROUND', message: `Unknown ground code: ${g.groundCode}` };
    }
  }
  if (!input.actorUserCode || input.actorUserCode.trim().toUpperCase() === 'SYSTEM') {
    return { ok: false, code: 'INVALID_USER_CODE', message: 'A real user code is required.' };
  }
  if (!input.idempotencyKey || !input.correlationId) {
    return { ok: false, code: 'MISSING_TRACE_IDS', message: 'Idempotency key and correlation id are required.' };
  }
  return { ok: true };
}

/** Build the transport-neutral command envelope. */
export function buildSubmitClaimantAppealEnvelope(
  input: SubmitClaimantAppealInput,
  actorUserId: string,
): BnGapCommandEnvelope<{
  bnClaimId: string;
  appealTypeCode: string;
  reasonSummary: string;
  grounds: readonly { groundCode: string; groundText: string }[];
  decisionSnapshot: Record<string, unknown> | null;
}> {
  return {
    commandName: 'BN_APPEAL_SUBMIT_CLAIMANT',
    commandVersion: 1,
    idempotencyKey: input.idempotencyKey,
    correlationId: input.correlationId,
    moduleCode: 'bn_appeals',
    entityType: 'bn_appeal',
    entityId: null,
    actorUserId,
    actorUserCode: input.actorUserCode.trim(),
    actorRoles: [], // ignored by server
    requestedAtUtc: new Date().toISOString(),
    payload: {
      bnClaimId: input.bnClaimId,
      appealTypeCode: input.appealTypeCode,
      reasonSummary: input.reasonSummary.trim(),
      grounds: input.grounds,
      decisionSnapshot: input.decisionSnapshot ?? null,
    },
  };
}

/**
 * Invoke the server boundary. Throws with a coded error on failure so the
 * UI can localise the message. Never inserts directly into any bn_appeal*
 * table — that would violate the architecture rule enforced by the
 * `architectureNoDirectMutation` test suite.
 */
export async function submitClaimantAppeal(
  input: SubmitClaimantAppealInput,
): Promise<SubmitClaimantAppealResult> {
  const validation = validateSubmitClaimantAppealInput(input);
  if (validation.ok === false) {
    const err = new Error(validation.message);
    (err as any).code = validation.code;
    throw err;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const jwt = sessionData?.session?.access_token;
  const userId = sessionData?.session?.user?.id;
  if (!jwt || !userId) {
    const err = new Error('You must be signed in to submit an appeal.');
    (err as any).code = 'NOT_AUTHENTICATED';
    throw err;
  }

  const envelope = buildSubmitClaimantAppealEnvelope(input, userId);

  const { data, error } = await supabase.functions.invoke<BnGapCommandResult<SubmitClaimantAppealResult>>(
    'bn-appeals-claimant-submit',
    { body: envelope },
  );

  if (error) {
    const wrapped = new Error(error.message || 'Failed to submit appeal.');
    (wrapped as any).code = 'BOUNDARY_ERROR';
    throw wrapped;
  }
  if (!data || !data.success) {
    const first =
      data?.businessErrors?.[0] ??
      data?.validationErrors?.[0] ??
      { code: 'UNKNOWN', message: 'Appeal submission was rejected.' };
    const wrapped = new Error(first.message);
    (wrapped as any).code = first.code;
    throw wrapped;
  }
  return data.data as SubmitClaimantAppealResult;
}

export { BN_APPEAL_TYPE_CATALOG, BN_APPEAL_GROUND_CODES };
