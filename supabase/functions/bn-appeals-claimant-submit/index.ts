/**
 * BN Appeals — Server-authorised command boundary for claimant submissions.
 *
 * Why a dedicated function rather than reusing `bn-gap-command`?
 * The generic gap pipeline authorises via `role_permissions`, but claimants
 * are not granted `bn_appeals:*` platform capabilities. Their authority to
 * appeal derives from OWNERSHIP of the disputed decision — captured in the
 * SSN linkage between `auth.users` and `ip_master` via
 * `external_user_person_link`. This function enforces ownership and delegates
 * the atomic multi-row write to the `bn_appeal_submit_claimant` RPC.
 *
 * Idempotency and audit are recorded to the same tables the gap pipeline
 * uses (`bn_gap_idempotency`, `bn_gap_command_log`) so appeals appear in the
 * unified command log alongside every other gap-module command.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Envelope {
  commandName: string;
  commandVersion: number;
  idempotencyKey: string;
  correlationId: string;
  moduleCode: string;
  entityType: string;
  entityId: string | null;
  actorUserId: string;
  actorUserCode: string;
  actorRoles: string[];
  requestedAtUtc: string;
  payload: {
    bnClaimId: string;
    appealTypeCode: string;
    reasonSummary: string;
    grounds: { groundCode: string; groundText: string }[];
    decisionSnapshot: Record<string, unknown> | null;
  };
}

function coded(code: string, message: string) {
  return { code, message };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace('Bearer ', '');
  const { data: claimsRes, error: claimsErr } = await supabase.auth.getClaims(token);
  if (claimsErr || !claimsRes?.claims?.sub) return json({ error: 'Unauthorized' }, 401);
  const jwtSub: string = claimsRes.claims.sub;

  let envelope: Envelope;
  try {
    envelope = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  // Force actorUserId from JWT — never trust the wire.
  envelope = { ...envelope, actorUserId: jwtSub };

  // ── Structural validation (mirrors client-side rules) ───────────────────
  const errors: { code: string; message: string; field?: string }[] = [];
  if (envelope.commandName !== 'BN_APPEAL_SUBMIT_CLAIMANT') errors.push(coded('WRONG_COMMAND', 'This endpoint only accepts BN_APPEAL_SUBMIT_CLAIMANT.'));
  if (envelope.moduleCode !== 'bn_appeals') errors.push(coded('WRONG_MODULE', 'moduleCode must be bn_appeals.'));
  if (!envelope.idempotencyKey) errors.push(coded('MISSING_IDEMPOTENCY_KEY', 'idempotencyKey is required.'));
  if (!envelope.correlationId) errors.push(coded('MISSING_CORRELATION_ID', 'correlationId is required.'));
  if (!envelope.actorUserCode || envelope.actorUserCode.trim().toUpperCase() === 'SYSTEM') errors.push(coded('INVALID_USER_CODE', 'A real user code is required.'));
  const p = envelope.payload;
  if (!p?.bnClaimId) errors.push(coded('MISSING_CLAIM', 'bnClaimId is required.'));
  if (!p?.appealTypeCode) errors.push(coded('MISSING_APPEAL_TYPE', 'appealTypeCode is required.'));
  const reason = (p?.reasonSummary ?? '').trim();
  if (reason.length < 10) errors.push(coded('REASON_TOO_SHORT', 'reasonSummary must be at least 10 characters.'));
  if (reason.length > 2000) errors.push(coded('REASON_TOO_LONG', 'reasonSummary must be at most 2000 characters.'));
  if (!Array.isArray(p?.grounds) || p.grounds.length === 0) errors.push(coded('MISSING_GROUNDS', 'At least one ground is required.'));

  if (errors.length > 0) {
    return json({
      success: false,
      commandId: crypto.randomUUID(),
      correlationId: envelope.correlationId ?? crypto.randomUUID(),
      entityId: null,
      entityVersion: null,
      status: 'INVALID',
      warnings: [],
      validationErrors: errors,
      businessErrors: [],
      auditEventId: null,
      data: null,
    }, 200);
  }

  // ── Module rollout gate ─────────────────────────────────────────────────
  const { data: mod } = await supabase
    .from('app_modules')
    .select('is_enabled, actions_enabled')
    .eq('name', 'bn_appeals')
    .maybeSingle();
  if (!mod?.is_enabled || !mod.actions_enabled) {
    return json({
      success: false,
      commandId: crypto.randomUUID(),
      correlationId: envelope.correlationId,
      entityId: null, entityVersion: null,
      status: 'DENIED',
      warnings: [],
      validationErrors: [],
      businessErrors: [coded('MODULE_NOT_ACTIVE', 'The appeals module is not currently accepting submissions.')],
      auditEventId: null,
      data: null,
    }, 200);
  }

  // ── Idempotency replay ─────────────────────────────────────────────────
  const { data: existing } = await supabase
    .from('bn_gap_idempotency')
    .select('result_json')
    .eq('idempotency_key', envelope.idempotencyKey)
    .maybeSingle();
  if (existing?.result_json) {
    return json({ ...(existing.result_json as any), status: 'REPLAYED' }, 200);
  }

  // ── Invoke atomic RPC (ownership check + all inserts) ───────────────────
  const commandId = crypto.randomUUID();
  const { data: rpcData, error: rpcErr } = await supabase.rpc('bn_appeal_submit_claimant', {
    p_actor_user_id: jwtSub,
    p_actor_user_code: envelope.actorUserCode.trim(),
    p_correlation_id: envelope.correlationId,
    p_command_id: commandId,
    p_bn_claim_id: p.bnClaimId,
    p_appeal_type_code: p.appealTypeCode,
    p_reason_summary: reason,
    p_grounds: p.grounds,
    p_decision_snapshot: p.decisionSnapshot,
  });

  if (rpcErr) {
    const msg = rpcErr.message || 'Unknown error';
    const code =
      msg.includes('BN_APPEAL_CLAIM_NOT_OWNED') ? 'CLAIM_NOT_OWNED' :
      msg.includes('BN_APPEAL_CLAIM_NOT_FOUND') ? 'CLAIM_NOT_FOUND' :
      msg.includes('BN_APPEAL_SUBMIT_MISSING_INPUT') ? 'MISSING_INPUT' :
      'RPC_ERROR';
    const userMsg =
      code === 'CLAIM_NOT_OWNED' ? 'You cannot appeal a claim that is not linked to your identity.' :
      code === 'CLAIM_NOT_FOUND' ? 'The selected claim could not be located.' :
      code === 'MISSING_INPUT'   ? 'One or more required fields were missing.' :
                                   'The appeal could not be recorded. Please try again.';
    const result = {
      success: false,
      commandId,
      correlationId: envelope.correlationId,
      entityId: null, entityVersion: null,
      status: code === 'CLAIM_NOT_OWNED' ? 'DENIED' : 'FAILED',
      warnings: [],
      validationErrors: [],
      businessErrors: [coded(code, userMsg)],
      auditEventId: null,
      data: null,
    };
    await writeAudit(supabase, commandId, envelope, 'REJECTED', code);
    return json(result, 200);
  }

  const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
  const appealId: string = row?.appeal_id;
  const appealNumber: string = row?.appeal_number;

  const result = {
    success: true,
    commandId,
    correlationId: envelope.correlationId,
    entityId: appealId,
    entityVersion: '1',
    status: 'EXECUTED',
    warnings: [],
    validationErrors: [],
    businessErrors: [],
    auditEventId: commandId,
    data: { appealId, appealNumber },
  };

  await writeAudit(supabase, commandId, envelope, 'EXECUTED', null, appealId);

  // Save idempotency AFTER the write so a duplicate replay returns the same
  // successful result. On unique-key conflict we ignore and return the prior
  // record on the next replay.
  await supabase.from('bn_gap_idempotency').insert({
    idempotency_key: envelope.idempotencyKey,
    command_name: envelope.commandName,
    correlation_id: envelope.correlationId,
    result_json: result,
  }).then(() => null, () => null);

  return json(result, 200);
});

async function writeAudit(
  supabase: any,
  commandId: string,
  envelope: Envelope,
  outcome: 'EXECUTED' | 'REJECTED' | 'DENIED' | 'FAILED',
  reasonCode: string | null,
  entityId?: string,
) {
  try {
    await supabase.from('bn_gap_command_log').insert({
      command_id: commandId,
      command_name: envelope.commandName,
      command_version: envelope.commandVersion,
      module_code: envelope.moduleCode,
      entity_type: envelope.entityType,
      entity_id: entityId ?? null,
      correlation_id: envelope.correlationId,
      causation_id: null,
      actor_user_id: envelope.actorUserId,
      actor_user_code: envelope.actorUserCode,
      reason_code: reasonCode,
      justification: null,
      outcome,
      before_value: null,
      after_value: outcome === 'EXECUTED' ? { entityId } : null,
      requested_at: envelope.requestedAtUtc,
    });
  } catch (e) {
    console.log(JSON.stringify({ evt: 'audit_write_failed', error: String(e) }));
  }
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}
