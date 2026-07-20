/**
 * BN Appeals — Server-authorised command boundary for claimant submissions.
 *
 * BN-AP-01 §A: the claimant path is gated INDEPENDENTLY of the staff
 * `actions_enabled` flag. Claimants can submit as long as:
 *   - the module is enabled (`app_modules.is_enabled = true`),
 *   - routes are enabled (`app_modules.routes_enabled = true`),
 *   - the `claimant_submit` module action exists and is enabled,
 *   - the caller passes the identity/ownership check.
 *
 * Idempotency: the envelope carries an optional `payloadHash`. Replay with
 *   - same idempotency key + same hash → return the original result.
 *   - same idempotency key + different hash → return
 *     IDEMPOTENCY_PAYLOAD_MISMATCH (status=INVALID).
 */
// deno-lint-ignore-file no-explicit-any
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
  /** BN-AP-01 §A: optional stable content hash for idempotency-replay verification. */
  payloadHash?: string | null;
  payload: {
    bnClaimId: string;
    appealTypeCode: string;
    reasonSummary: string;
    grounds: { groundCode: string; groundText: string }[];
    /** Kept for wire-compat — the RPC IGNORES this; snapshot is captured server-side. */
    decisionSnapshot: Record<string, unknown> | null;
  };
}

function coded(code: string, message: string) {
  return { code, message };
}

async function computePayloadHash(payload: unknown): Promise<string> {
  // Stable stringify — sort object keys so equivalent payloads hash the same.
  const canonical = stableStringify(payload);
  const buf = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  const keys = Object.keys(v as Record<string, unknown>).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify((v as any)[k])).join(',') + '}';
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

  // ── Structural validation ─────────────────────────────────────────────
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
      entityId: null, entityVersion: null,
      status: 'INVALID',
      warnings: [], validationErrors: errors, businessErrors: [],
      auditEventId: null, data: null,
    }, 200);
  }

  // BN-AP-01 §A.4: canonical server-computed content hash.
  const serverHash = await computePayloadHash({
    bnClaimId: p.bnClaimId,
    appealTypeCode: p.appealTypeCode,
    reasonSummary: reason,
    grounds: p.grounds,
    actorUserId: jwtSub,
  });
  const clientHash = typeof envelope.payloadHash === 'string' && envelope.payloadHash.length > 0
    ? envelope.payloadHash.toLowerCase()
    : serverHash;

  // ── Module rollout gate — decoupled from staff `actions_enabled` ──────
  const { data: mod, error: modErr } = await supabase
    .from('app_modules')
    .select('id, is_enabled, routes_enabled, rollout_state')
    .eq('name', 'bn_appeals')
    .maybeSingle();
  if (modErr || !mod?.is_enabled || !mod?.routes_enabled) {
    return json({
      success: false,
      commandId: crypto.randomUUID(),
      correlationId: envelope.correlationId,
      entityId: null, entityVersion: null,
      status: 'DENIED',
      warnings: [], validationErrors: [],
      businessErrors: [coded('MODULE_NOT_ACTIVE', 'The appeals module is not currently accepting submissions.')],
      auditEventId: null, data: null,
    }, 200);
  }

  // BN-AP-01 §A.1: check the `claimant_submit` action row explicitly.
  const { data: action } = await supabase
    .from('module_actions')
    .select('is_enabled')
    .eq('module_id', mod.id)
    .eq('action_name', 'claimant_submit')
    .maybeSingle();
  if (!action?.is_enabled) {
    return json({
      success: false,
      commandId: crypto.randomUUID(),
      correlationId: envelope.correlationId,
      entityId: null, entityVersion: null,
      status: 'DENIED',
      warnings: [], validationErrors: [],
      businessErrors: [coded('CLAIMANT_SUBMIT_DISABLED', 'Claimant submission is currently disabled.')],
      auditEventId: null, data: null,
    }, 200);
  }

  // ── Idempotency replay ─────────────────────────────────────────────────
  const { data: existing } = await supabase
    .from('bn_gap_idempotency')
    .select('result_json, payload_hash')
    .eq('idempotency_key', envelope.idempotencyKey)
    .maybeSingle();
  if (existing?.result_json) {
    // BN-AP-01 §A.5: same key with DIFFERENT hash must be rejected.
    if (existing.payload_hash && existing.payload_hash !== clientHash) {
      return json({
        success: false,
        commandId: crypto.randomUUID(),
        correlationId: envelope.correlationId,
        entityId: null, entityVersion: null,
        status: 'INVALID',
        warnings: [],
        validationErrors: [coded('IDEMPOTENCY_PAYLOAD_MISMATCH', 'idempotencyKey was already used with a different payload.')],
        businessErrors: [],
        auditEventId: null, data: null,
      }, 200);
    }
    return json({ ...(existing.result_json as any), status: 'REPLAYED' }, 200);
  }

  // ── Invoke atomic RPC (ownership, source-decision, snapshot, inserts) ──
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
    p_client_snapshot: p.decisionSnapshot, // Ignored server-side; kept for wire compat.
  });

  if (rpcErr) {
    const msg = rpcErr.message || 'Unknown error';
    const code =
      msg.includes('BN_APPEAL_CLAIM_NOT_OWNED')          ? 'CLAIM_NOT_OWNED' :
      msg.includes('BN_APPEAL_CLAIM_NOT_FOUND')          ? 'CLAIM_NOT_FOUND' :
      msg.includes('BN_APPEAL_TYPE_NOT_CONFIGURED')      ? 'APPEAL_TYPE_NOT_CONFIGURED' :
      msg.includes('BN_APPEAL_DUPLICATE_ACTIVE')         ? 'DUPLICATE_ACTIVE' :
      msg.includes('BN_APPEAL_SUBMIT_MISSING_INPUT')     ? 'MISSING_INPUT' :
                                                            'RPC_ERROR';
    const userMsg =
      code === 'CLAIM_NOT_OWNED'            ? 'You cannot appeal a claim that is not linked to your identity.' :
      code === 'CLAIM_NOT_FOUND'            ? 'The selected claim could not be located.' :
      code === 'APPEAL_TYPE_NOT_CONFIGURED' ? 'That appeal type is not currently configured.' :
      code === 'DUPLICATE_ACTIVE'           ? 'An active appeal already exists for that decision.' :
      code === 'MISSING_INPUT'              ? 'One or more required fields were missing.' :
                                              'The appeal could not be recorded. Please try again.';
    const result = {
      success: false,
      commandId,
      correlationId: envelope.correlationId,
      entityId: null, entityVersion: null,
      status: code === 'CLAIM_NOT_OWNED' ? 'DENIED' : 'FAILED',
      warnings: [], validationErrors: [],
      businessErrors: [coded(code, userMsg)],
      auditEventId: null, data: null,
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
    warnings: [], validationErrors: [], businessErrors: [],
    auditEventId: commandId,
    data: { appealId, appealNumber },
  };

  await writeAudit(supabase, commandId, envelope, 'EXECUTED', null, appealId);

  // Save idempotency AFTER the write so a duplicate replay returns the same
  // successful result. On unique-key conflict we ignore.
  await supabase.from('bn_gap_idempotency').insert({
    idempotency_key: envelope.idempotencyKey,
    command_name: envelope.commandName,
    correlation_id: envelope.correlationId,
    result_json: result,
    payload_hash: clientHash,
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
