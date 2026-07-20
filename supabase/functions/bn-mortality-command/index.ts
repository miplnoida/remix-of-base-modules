/**
 * BN Mortality — Server-authorised Command Executor.
 *
 * Only path that writes to bn_mortality_* tables. Enforces:
 *   1. Bearer JWT (getClaims). No anonymous callers.
 *   2. Envelope structural validation.
 *   3. Capability walk via role_permissions.
 *   4. Idempotency replay from bn_mortality_command_idempotency.
 *   5. Handler-agnostic transactional execution via
 *      bn_mortality_execute_command() RPC (SECURITY DEFINER, service_role only).
 *   6. Immutable history + audit trail row in bn_module_events.
 *
 * `authenticated` has no direct grants on mortality tables — every mutation
 * flows through this function's service-role client.
 */
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Capability + maker-checker matrix, kept in lock-step with
// src/types/bn/mortality/mortalityCommands.ts and MORTALITY_COMMAND_TRANSITION_MATRIX.md
const COMMAND_MATRIX: Record<string, { capability: string; makerChecker: boolean; requiresJustification: boolean }> = {
  BN_MORTALITY_DRAFT_SAVE:                   { capability: 'bn_mortality:write',          makerChecker: false, requiresJustification: false },
  BN_MORTALITY_REGISTER_REPORT:              { capability: 'bn_mortality:write',          makerChecker: false, requiresJustification: false },
  BN_MORTALITY_CANCEL:                       { capability: 'bn_mortality:write',          makerChecker: false, requiresJustification: true  },
  BN_MORTALITY_MATCH_PERSON:                 { capability: 'bn_mortality:write',          makerChecker: false, requiresJustification: false },
  BN_MORTALITY_MARK_DUPLICATE:               { capability: 'bn_mortality:write',          makerChecker: false, requiresJustification: true  },
  BN_MORTALITY_ASSIGN:                       { capability: 'bn_mortality:write',          makerChecker: false, requiresJustification: false },
  BN_MORTALITY_ATTACH_EVIDENCE:              { capability: 'bn_mortality:write',          makerChecker: false, requiresJustification: false },
  BN_MORTALITY_SUBMIT_FOR_VERIFICATION:      { capability: 'bn_mortality:write',          makerChecker: false, requiresJustification: false },
  BN_MORTALITY_PLACE_PROVISIONAL_HOLD:       { capability: 'bn_mortality:decide',         makerChecker: false, requiresJustification: true  },
  BN_MORTALITY_RELEASE_HOLD:                 { capability: 'bn_mortality:decide',         makerChecker: false, requiresJustification: true  },
  BN_MORTALITY_RECORD_CONFLICT:              { capability: 'bn_mortality:write',          makerChecker: false, requiresJustification: true  },
  BN_MORTALITY_RESOLVE_CONFLICT:             { capability: 'bn_mortality:decide',         makerChecker: false, requiresJustification: true  },
  BN_MORTALITY_CONFIRM_VERIFICATION:         { capability: 'bn_mortality:verify',         makerChecker: true,  requiresJustification: false },
  BN_MORTALITY_REJECT_REPORT:                { capability: 'bn_mortality:decide',         makerChecker: true,  requiresJustification: true  },
  BN_MORTALITY_PREPARE_IMPACT:               { capability: 'bn_mortality:write',          makerChecker: false, requiresJustification: false },
  BN_MORTALITY_SUBMIT_IMPACT:                { capability: 'bn_mortality:write',          makerChecker: false, requiresJustification: false },
  BN_MORTALITY_RETURN_IMPACT:                { capability: 'bn_mortality:decide',         makerChecker: false, requiresJustification: true  },
  BN_MORTALITY_APPROVE_IMPACT:               { capability: 'bn_mortality:approve_impact', makerChecker: true,  requiresJustification: false },
  BN_MORTALITY_TERMINATE_AWARD:              { capability: 'bn_mortality:decide',         makerChecker: true,  requiresJustification: true  },
  BN_MORTALITY_CREATE_PAD_OVERPAYMENT:       { capability: 'bn_mortality:decide',         makerChecker: true,  requiresJustification: true  },
  BN_MORTALITY_INITIATE_SURVIVOR_ASSESSMENT: { capability: 'bn_mortality:write',          makerChecker: false, requiresJustification: false },
  BN_MORTALITY_INITIATE_FUNERAL_GRANT:       { capability: 'bn_mortality:write',          makerChecker: false, requiresJustification: false },
  BN_MORTALITY_COMPLETE_FOLLOWON:            { capability: 'bn_mortality:decide',         makerChecker: false, requiresJustification: false },
  BN_MORTALITY_REFER_LEGAL:                  { capability: 'bn_mortality:decide',         makerChecker: true,  requiresJustification: true  },
  BN_MORTALITY_REVERSE_CONFIRMATION:         { capability: 'bn_mortality:reverse',        makerChecker: true,  requiresJustification: true  },
  BN_MORTALITY_CLOSE_EVENT:                  { capability: 'bn_mortality:decide',         makerChecker: false, requiresJustification: false },
};

function result(status: string, code: string, message: string, envelope: any, extra: Record<string, unknown> = {}) {
  return {
    success: status === 'EXECUTED' || status === 'REPLAYED',
    commandId: crypto.randomUUID(),
    correlationId: envelope?.correlationId ?? null,
    entityId: envelope?.entityId ?? null,
    entityVersion: null,
    status,
    warnings: [],
    validationErrors: status === 'INVALID' ? [{ code, message }] : [],
    businessErrors: status === 'INVALID' ? [] : [{ code, message }],
    auditEventId: null,
    data: null,
    ...extra,
  };
}

function envelopeErrors(env: any): string[] {
  const e: string[] = [];
  if (!env?.commandName) e.push('commandName');
  if (!env?.commandVersion || env.commandVersion < 1) e.push('commandVersion');
  if (!env?.idempotencyKey || !UUID_RE.test(env.idempotencyKey)) e.push('idempotencyKey');
  if (!env?.correlationId || !UUID_RE.test(env.correlationId)) e.push('correlationId');
  if (env?.moduleCode !== 'bn_mortality') e.push('moduleCode');
  if (!env?.actorUserCode || env.actorUserCode === 'SYSTEM') e.push('actorUserCode');
  if (!env?.requestedAtUtc) e.push('requestedAtUtc');
  return e;
}

async function payloadHash(payload: unknown): Promise<string> {
  const s = JSON.stringify(payload ?? {});
  const buf = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  let envelope: any;
  try { envelope = await req.json(); }
  catch { return json(result('INVALID', 'ENVELOPE_JSON', 'Body is not JSON.', {}), 400); }

  const structural = envelopeErrors(envelope);
  if (structural.length) {
    return json(result('INVALID', 'ENVELOPE_STRUCTURE', `Missing/invalid: ${structural.join(', ')}`, envelope), 400);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json(result('DENIED', 'UNAUTHENTICATED', 'Bearer token required.', envelope), 401);
  }
  const jwt = authHeader.slice(7);

  const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claims, error: claimsErr } = await anon.auth.getClaims(jwt);
  if (claimsErr || !claims?.claims?.sub) {
    return json(result('DENIED', 'UNAUTHENTICATED', 'Invalid token.', envelope), 401);
  }
  const actorUserId = claims.claims.sub as string;

  const spec = COMMAND_MATRIX[envelope.commandName];
  if (!spec) {
    return json(result('DENIED', 'CAPABILITY_UNMAPPED', 'Command has no capability mapping.', envelope), 403);
  }
  if (spec.requiresJustification && !envelope.justification) {
    return json(result('INVALID', 'JUSTIFICATION_REQUIRED', 'Justification is required.', envelope), 400);
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Idempotency replay
  const hash = await payloadHash(envelope.payload);
  const { data: cached } = await admin
    .from('bn_mortality_command_idempotency')
    .select('*')
    .eq('idempotency_key', envelope.idempotencyKey)
    .eq('command_name', envelope.commandName)
    .maybeSingle();
  if (cached) {
    const prior = cached.result_json as any;
    return json({ ...prior, status: 'REPLAYED' });
  }

  // Capability walk
  const { data: roleRows } = await admin.from('user_roles').select('role_id').eq('user_id', actorUserId);
  const roleIds = (roleRows ?? []).map((r: any) => r.role_id);
  const { data: perms } = await admin
    .from('role_permissions')
    .select('module_actions!inner(action_name, app_modules!inner(name))')
    .in('role_id', roleIds.length ? roleIds : ['00000000-0000-0000-0000-000000000000']);
  const held = new Set<string>();
  for (const row of (perms ?? []) as any[]) {
    const a = row.module_actions?.action_name;
    const m = row.module_actions?.app_modules?.name;
    if (a && m) held.add(`${m}:${a}`);
  }
  if (!held.has(spec.capability) && !held.has('bn_mortality:admin')) {
    return json(result('DENIED', 'CAPABILITY_DENIED', `Missing ${spec.capability}.`, envelope), 403);
  }

  // Maker-checker: forbid same actor as prior state change on this entity
  if (spec.makerChecker && envelope.entityId) {
    const { data: last } = await admin
      .from('bn_mortality_event_history')
      .select('actor_user_id')
      .eq('event_id', envelope.entityId)
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last?.actor_user_id === actorUserId) {
      return json(result('REJECTED', 'MAKER_CHECKER', 'A different user must approve this command.', envelope));
    }
  }

  // Execute the transactional RPC
  const { data: rpcData, error: rpcErr } = await admin.rpc('bn_mortality_execute_command', {
    p_command_name: envelope.commandName,
    p_entity_id: envelope.entityId,
    p_actor_user_id: actorUserId,
    p_actor_user_code: envelope.actorUserCode,
    p_correlation_id: envelope.correlationId,
    p_expected_row_version: envelope.expectedRowVersion ? Number(envelope.expectedRowVersion) : null,
    p_reason_code: envelope.reasonCode ?? null,
    p_justification: envelope.justification ?? null,
    p_payload: envelope.payload ?? {},
    p_payload_hash: hash,
  });

  if (rpcErr) {
    const msg = String((rpcErr as any).message ?? '');
    if (msg.includes('ROW_VERSION_CONFLICT')) {
      const r = result('CONFLICT', 'ROW_VERSION_CONFLICT', msg, envelope);
      return json(r, 409);
    }
    if (msg.includes('STATE_INVALID_TRANSITION') || msg.includes('STATE_TERMINAL') || msg.includes('ENTITY_NOT_FOUND') || msg.includes('COMMAND_UNKNOWN') || msg.includes('ENTITY_REQUIRED')) {
      return json(result('REJECTED', msg.split(':')[0], msg, envelope));
    }
    return json(result('FAILED', 'HANDLER_FAILED', 'Server error.', envelope), 500);
  }

  const data = rpcData as any;
  const finalResult = {
    success: true,
    commandId: crypto.randomUUID(),
    correlationId: envelope.correlationId,
    entityId: data.entity_id,
    entityVersion: data.entity_version ? String(data.entity_version) : null,
    status: 'EXECUTED' as const,
    warnings: [],
    validationErrors: [],
    businessErrors: [],
    auditEventId: null as string | null,
    data,
  };

  // Idempotency store
  await admin.from('bn_mortality_command_idempotency').insert({
    idempotency_key: envelope.idempotencyKey,
    command_name: envelope.commandName,
    payload_hash: hash,
    entity_id: data.entity_id,
    entity_version: data.entity_version,
    result_json: finalResult as any,
  });

  // Audit
  const { data: audit } = await admin
    .from('bn_module_events')
    .insert({
      module_code: 'bn_mortality',
      event_type: 'command.executed',
      event_data: {
        commandName: envelope.commandName,
        commandVersion: envelope.commandVersion,
        correlationId: envelope.correlationId,
        idempotencyKey: envelope.idempotencyKey,
        actorUserId,
        actorUserCode: envelope.actorUserCode,
        entityId: data.entity_id,
        entityVersion: data.entity_version,
        reasonCode: envelope.reasonCode ?? null,
        payloadHash: hash,
      } as any,
    })
    .select('id')
    .maybeSingle();
  if (audit?.id) finalResult.auditEventId = audit.id as string;

  return json(finalResult);
});
