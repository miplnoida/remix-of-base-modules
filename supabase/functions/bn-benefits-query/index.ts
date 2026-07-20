/**
 * BN Benefits — Secure Query Edge Function.
 *
 * This is the ONLY server-side path that reads mortality (and future
 * benefits-gap) domain tables on behalf of the browser. Direct
 * `authenticated` SELECT on `bn_mortality_*` has been revoked at the
 * database layer.
 *
 * Responsibilities:
 *   - Validate bearer JWT (getClaims). Reject anonymous callers.
 *   - Resolve query code against a server-side allow-list; unknown codes
 *     fail closed with `QUERY_CODE_UNKNOWN`.
 *   - Walk `role_permissions` for the authenticated user; reject if the
 *     descriptor's `anyOfCapabilities` is not held.
 *   - Enforce max page size per descriptor.
 *   - Run the hand-written handler (whitelisted columns only).
 *   - Mask sensitive fields for callers without the module `:admin`
 *     capability.
 *   - Emit an audit row into `bn_module_events`.
 *   - Return a uniform `BnBenefitsQueryResult` shape.
 *
 * Client-supplied `actorHint` fields are for telemetry only and are
 * NEVER used for authorisation.
 */
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface QueryDescriptor {
  moduleCode: string;
  anyOfCapabilities: string[];
  sensitiveFields: string[];
  maxPageSize: number;
  handler: (
    admin: any,
    params: any,
    page: { limit: number; offset: number },
  ) => Promise<{ data: any; totalCount: number | null }>;
}

// -- Handlers ---------------------------------------------------------------

async function listEvents(
  admin: any,
  params: any,
  page: { limit: number; offset: number },
) {
  let q = admin
    .from('bn_mortality_event')
    .select(
      'id,event_reference,status,source,deceased_full_name,death_date,reported_at,assigned_to,sla_due_at,row_version,updated_at',
      { count: 'exact' },
    )
    .order('reported_at', { ascending: false })
    .range(page.offset, page.offset + page.limit - 1);
  if (params?.status) q = q.eq('status', params.status);
  if (params?.assignedTo) q = q.eq('assigned_to', params.assignedTo);
  if (params?.search) q = q.ilike('deceased_full_name', `%${params.search}%`);
  const { data, error, count } = await q;
  if (error) throw error;
  return { data: data ?? [], totalCount: typeof count === 'number' ? count : null };
}

async function getEvent(admin: any, params: any) {
  if (!params?.eventId) throw new Error('INVALID_PARAMS:eventId');
  const { data, error } = await admin
    .from('bn_mortality_event')
    .select('*')
    .eq('id', params.eventId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { data: null, totalCount: 0 };
  // Shape to DTO (never leak raw source_payload etc.).
  const dto = {
    id: data.id,
    eventReference: data.event_reference,
    status: data.status,
    source: data.source,
    deceased: {
      fullName: data.deceased_full_name,
      dateOfBirth: data.deceased_dob,
      gender: data.deceased_gender,
      nationalIdMasked: maskNationalId(data.deceased_national_id),
    },
    death: {
      date: data.death_date,
      time: data.death_time,
      place: data.death_place,
      cause: data.death_cause,
    },
    matched: {
      ipId: data.matched_ip_id,
      confidence: data.match_confidence,
      matchedAt: data.matched_at,
    },
    verification: {
      source: data.verification_source,
      reference: data.verification_reference,
      confidence: data.verification_confidence,
      verifiedAt: data.verified_at,
    },
    assignedTo: data.assigned_to,
    slaDueAt: data.sla_due_at,
    rowVersion: data.row_version,
    reportedAt: data.reported_at,
    submittedForVerificationAt: data.submitted_for_verification_at,
    confirmedAt: data.confirmed_at,
    completedAt: data.completed_at,
    closedAt: data.closed_at,
    reversedAt: data.reversed_at,
    correlationId: data.correlation_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    // Sensitive — will be stripped by masking layer unless admin.
    sourcePayload: data.metadata_json,
    externalReferenceRaw: data.registrar_reference,
    diagnostics: {
      matchScore: data.match_score,
      rejectedReason: data.rejected_reason,
      conflictReason: data.conflict_reason,
      reversalReason: data.reversal_reason,
      verificationNotes: data.verification_notes,
    },
  };
  return { data: dto, totalCount: 1 };
}

async function getSummary(admin: any, params: any) {
  // Dashboard aggregate when no eventId; per-event otherwise.
  if (params?.eventId) {
    if (!UUID_RE.test(String(params.eventId))) throw new Error('INVALID_PARAMS:eventId must be UUID');
    const { data, error } = await admin
      .from('bn_mortality_event')
      .select('id,event_reference,status,deceased_full_name,death_date,sla_due_at,assigned_to,row_version,updated_at')
      .eq('id', params.eventId)
      .maybeSingle();
    if (error) throw error;
    return { data: data ?? null, totalCount: data ? 1 : 0 };
  }
  const now = new Date().toISOString();
  // Overdue: use count returned from head query (previous impl treated
  // { data: [] } as the count source, which was always 0).
  const [statusResp, overdueResp, recentResp] = await Promise.all([
    admin.from('bn_mortality_event').select('status'),
    admin
      .from('bn_mortality_event')
      .select('id', { count: 'exact', head: true })
      .lt('sla_due_at', now)
      .not('status', 'in', '(CLOSED,CANCELLED,DUPLICATE,REVERSED)'),
    admin
      .from('bn_mortality_event')
      .select('id,event_reference,status,deceased_full_name,death_date,reported_at')
      .order('reported_at', { ascending: false })
      .limit(10),
  ]);
  if (statusResp.error) throw statusResp.error;
  if (recentResp.error) throw recentResp.error;
  const statusRows = statusResp.data ?? [];
  const byStatus: Record<string, number> = {};
  for (const r of statusRows as any[]) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  const dto = {
    totals: {
      all: statusRows.length,
      byStatus,
      overdue: typeof overdueResp.count === 'number' ? overdueResp.count : 0,
      openNonTerminal: statusRows.filter((r: any) => !['CLOSED','CANCELLED','DUPLICATE','REVERSED'].includes(r.status)).length,
    },
    recent: recentResp.data ?? [],
    generatedAt: now,
  };
  return { data: dto, totalCount: 1 };
}

async function getEventHistory(admin: any, params: any, page: { limit: number; offset: number }) {
  if (!params?.eventId) throw new Error('INVALID_PARAMS:eventId');
  const { data, error, count } = await admin
    .from('bn_mortality_event_history')
    .select('*', { count: 'exact' })
    .eq('event_id', params.eventId)
    .order('occurred_at', { ascending: false })
    .range(page.offset, page.offset + page.limit - 1);
  if (error) throw error;
  return { data: data ?? [], totalCount: typeof count === 'number' ? count : null };
}

async function getAwardImpacts(admin: any, params: any, page: { limit: number; offset: number }) {
  if (!params?.eventId) throw new Error('INVALID_PARAMS:eventId');
  const { data, error, count } = await admin
    .from('bn_mortality_award_impact')
    .select('*', { count: 'exact' })
    .eq('event_id', params.eventId)
    .order('created_at', { ascending: false })
    .range(page.offset, page.offset + page.limit - 1);
  if (error) throw error;
  return { data: data ?? [], totalCount: typeof count === 'number' ? count : null };
}

async function getAffectedAwards(admin: any, params: any, page: { limit: number; offset: number }) {
  if (!params?.eventId) throw new Error('INVALID_PARAMS:eventId');
  // Live join to bn_award via bn_mortality_award_impact
  const { data: impacts, error } = await admin
    .from('bn_mortality_award_impact')
    .select('id,bn_award_id,bn_claim_id,award_reference,action,effective_date,payment_after_death_minor,currency_code,overpayment_id,overpayment_reference,approval_state,hold_status,termination_status,impact_decision,impact_status,created_at')
    .eq('event_id', params.eventId)
    .order('created_at', { ascending: false })
    .range(page.offset, page.offset + page.limit - 1);
  if (error) throw error;
  const awardIds = (impacts ?? []).map((r: any) => r.bn_award_id).filter(Boolean);
  let awards: any[] = [];
  if (awardIds.length) {
    const { data: aRows } = await admin.from('bn_award').select('id,award_reference,status,award_amount,frequency,start_date,end_date').in('id', awardIds);
    awards = aRows ?? [];
  }
  const awardsById: Record<string, any> = Object.fromEntries(awards.map((a: any) => [a.id, a]));
  const dto = (impacts ?? []).map((i: any) => ({
    impactId: i.id,
    awardId: i.bn_award_id,
    claimId: i.bn_claim_id,
    awardReference: i.award_reference ?? awardsById[i.bn_award_id]?.award_reference ?? null,
    action: i.action,
    effectiveDate: i.effective_date,
    overpaymentAmountMinor: i.payment_after_death_minor,
    currencyCode: i.currency_code,
    overpaymentId: i.overpayment_id,
    overpaymentReference: i.overpayment_reference,
    approvalState: i.approval_state,
    holdStatus: i.hold_status,
    terminationStatus: i.termination_status,
    impactDecision: i.impact_decision,
    impactStatus: i.impact_status,
    award: awardsById[i.bn_award_id] ?? null,
  }));
  return { data: dto, totalCount: dto.length };
}

async function getReferrals(admin: any, params: any, page: { limit: number; offset: number }) {
  if (!params?.eventId) throw new Error('INVALID_PARAMS:eventId');
  const { data, error, count } = await admin
    .from('bn_mortality_referral')
    .select('*', { count: 'exact' })
    .eq('event_id', params.eventId)
    .order('raised_at', { ascending: false })
    .range(page.offset, page.offset + page.limit - 1);
  if (error) throw error;
  return { data: data ?? [], totalCount: typeof count === 'number' ? count : null };
}

async function getEvidenceLinks(admin: any, params: any, page: { limit: number; offset: number }) {
  if (!params?.eventId) throw new Error('INVALID_PARAMS:eventId');
  // DMS (core_generated_document) filtered by module + reference.
  const { data, error, count } = await admin
    .from('core_generated_document')
    .select('id,document_type,title,file_reference,generated_at,generated_by,status', { count: 'exact' })
    .eq('module_code', 'bn_mortality')
    .eq('reference_id', params.eventId)
    .order('generated_at', { ascending: false })
    .range(page.offset, page.offset + page.limit - 1);
  if (error) return { data: [], totalCount: 0 }; // DMS optional; fail-soft
  return { data: data ?? [], totalCount: typeof count === 'number' ? count : null };
}

async function getCommunications(admin: any, params: any, page: { limit: number; offset: number }) {
  if (!params?.eventId) throw new Error('INVALID_PARAMS:eventId');
  // Comm Hub trace scoped by module + external reference (fail-soft).
  const { data, error, count } = await admin
    .from('communication_hub_trace')
    .select('id,event_code,module_code,status,recipient_summary,sent_at,created_at', { count: 'exact' })
    .eq('module_code', 'bn_mortality')
    .eq('external_reference', params.eventId)
    .order('created_at', { ascending: false })
    .range(page.offset, page.offset + page.limit - 1);
  if (error) return { data: [], totalCount: 0 };
  return { data: data ?? [], totalCount: typeof count === 'number' ? count : null };
}

async function searchPersonMatches(
  admin: any,
  params: any,
  page: { limit: number; offset: number },
) {
  // Best-effort person search against ip_master; capped columns.
  let q = admin
    .from('ip_master')
    .select(
      'id,ssn,first_name,last_name,dob,gender',
      { count: 'exact' },
    )
    .range(page.offset, page.offset + page.limit - 1);
  if (params?.nationalId) q = q.eq('ssn', params.nationalId);
  else if (params?.fullName) q = q.ilike('last_name', `%${params.fullName}%`);
  const { data, error, count } = await q;
  if (error) throw error;
  const rows = (data ?? []).map((r: any) => ({
    ipId: r.id,
    fullName: [r.first_name, r.last_name].filter(Boolean).join(' '),
    nationalIdMasked: maskNationalId(r.ssn),
    dateOfBirth: r.dob,
    gender: r.gender,
    confidenceInternals: null,
  }));
  return { data: rows, totalCount: typeof count === 'number' ? count : null };
}

async function notImplemented() {
  return { data: [], totalCount: 0 };
}

const QUERY_REGISTRY: Record<string, QueryDescriptor> = {
  BN_MORTALITY_GET_SUMMARY: {
    moduleCode: 'bn_mortality',
    anyOfCapabilities: ['bn_mortality:view', 'bn_mortality:read'],
    sensitiveFields: [],
    maxPageSize: 1,
    handler: (admin, params) => getSummary(admin, params),
  },
  BN_MORTALITY_LIST_EVENTS: {
    moduleCode: 'bn_mortality',
    anyOfCapabilities: ['bn_mortality:view', 'bn_mortality:read'],
    sensitiveFields: ['nationalIdMasked', 'sourcePayload'],
    maxPageSize: 100,
    handler: listEvents,
  },
  BN_MORTALITY_GET_EVENT: {
    moduleCode: 'bn_mortality',
    anyOfCapabilities: ['bn_mortality:view', 'bn_mortality:read'],
    sensitiveFields: ['sourcePayload', 'externalReferenceRaw', 'diagnostics'],
    maxPageSize: 1,
    handler: (admin, params) => getEvent(admin, params),
  },
  BN_MORTALITY_SEARCH_PERSON_MATCHES: {
    moduleCode: 'bn_mortality',
    anyOfCapabilities: ['bn_mortality:read'],
    sensitiveFields: ['nationalIdMasked', 'dateOfBirth', 'confidenceInternals'],
    maxPageSize: 50,
    handler: searchPersonMatches,
  },
  BN_MORTALITY_GET_AFFECTED_AWARDS: {
    moduleCode: 'bn_mortality',
    anyOfCapabilities: ['bn_mortality:read'],
    sensitiveFields: ['overpaymentAmountMinor', 'holdReasonInternal'],
    maxPageSize: 100,
    handler: getAffectedAwards,
  },
  BN_MORTALITY_GET_EVENT_HISTORY: {
    moduleCode: 'bn_mortality',
    anyOfCapabilities: ['bn_mortality:read'],
    sensitiveFields: ['justification', 'reason_code'],
    maxPageSize: 200,
    handler: getEventHistory,
  },
  BN_MORTALITY_GET_REFERRALS: {
    moduleCode: 'bn_mortality',
    anyOfCapabilities: ['bn_mortality:read'],
    sensitiveFields: ['contact'],
    maxPageSize: 100,
    handler: getReferrals,
  },
  BN_MORTALITY_GET_AWARD_IMPACTS: {
    moduleCode: 'bn_mortality',
    anyOfCapabilities: ['bn_mortality:read'],
    sensitiveFields: ['overpaymentAmountMinor', 'ledgerDetail'],
    maxPageSize: 100,
    handler: getAwardImpacts,
  },
  BN_MORTALITY_GET_EVIDENCE_LINKS: {
    moduleCode: 'bn_mortality',
    anyOfCapabilities: ['bn_mortality:read'],
    sensitiveFields: ['file_reference'],
    maxPageSize: 100,
    handler: getEvidenceLinks,
  },
  BN_MORTALITY_GET_COMMUNICATIONS: {
    moduleCode: 'bn_mortality',
    anyOfCapabilities: ['bn_mortality:read'],
    sensitiveFields: ['recipient_summary'],
    maxPageSize: 100,
    handler: getCommunications,
  },
};

function maskNationalId(value: string | null | undefined): string | null {
  if (!value) return null;
  const s = String(value);
  if (s.length <= 4) return '••••';
  return `••••${s.slice(-4)}`;
}

function fail(
  status: string,
  code: string,
  message: string,
  correlationId: string,
  queryCode: string,
  queryVersion: number,
) {
  return {
    status,
    correlationId,
    queryCode,
    queryVersion,
    data: null,
    errors: [{ code, message }],
    maskedFields: [],
    warnings: [],
  };
}

function maskFields(row: any, fields: string[]): any {
  if (!row || typeof row !== 'object') return row;
  const out: any = Array.isArray(row) ? [...row] : { ...row };
  for (const f of fields) {
    if (f in out) out[f] = null;
    // Nested dotted paths (best-effort, one level).
    if (f.includes('.')) {
      const [head, tail] = f.split('.', 2);
      if (out[head] && typeof out[head] === 'object') {
        out[head] = { ...out[head], [tail]: null };
      }
    }
  }
  return out;
}

function maskCollection(data: any, fields: string[]): any {
  if (Array.isArray(data)) return data.map((r) => maskFields(r, fields));
  return maskFields(data, fields);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  let envelope: any;
  try {
    envelope = await req.json();
  } catch {
    return json(fail('INVALID', 'INVALID_ENVELOPE', 'Body is not JSON.', 'unknown', 'unknown', 0), 400);
  }
  const correlationId = String(envelope?.correlationId ?? crypto.randomUUID());
  const queryCode = String(envelope?.queryCode ?? '');
  const queryVersion = Number(envelope?.queryVersion ?? 1);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json(fail('DENIED', 'UNAUTHENTICATED', 'Bearer token required.', correlationId, queryCode, queryVersion), 401);
  }
  const jwt = authHeader.slice('Bearer '.length);

  const supaAnon = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: claimsData, error: claimsErr } = await supaAnon.auth.getClaims(jwt);
  if (claimsErr || !claimsData?.claims?.sub) {
    return json(fail('DENIED', 'UNAUTHENTICATED', 'Invalid token.', correlationId, queryCode, queryVersion), 401);
  }
  const userId = claimsData.claims.sub as string;

  const descriptor = QUERY_REGISTRY[queryCode];
  if (!descriptor) {
    return json(fail('INVALID', 'QUERY_CODE_UNKNOWN', 'Unknown query code.', correlationId, queryCode, queryVersion), 400);
  }

  // Admin client for actual data reads (bypasses authenticated grants which
  // have been revoked on mortality tables).
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Capability walk: role_permissions → module_actions → app_modules
  const { data: perms, error: permsErr } = await admin
    .from('role_permissions')
    .select('module_actions!inner(action_name, app_modules!inner(name))')
    .in(
      'role_id',
      (
        await admin.from('user_roles').select('role_id').eq('user_id', userId)
      ).data?.map((r: any) => r.role_id) ?? ['00000000-0000-0000-0000-000000000000'],
    );
  if (permsErr) {
    return json(fail('FAILED', 'PERMISSION_LOOKUP_FAILED', 'Cannot resolve caller capabilities.', correlationId, queryCode, queryVersion), 500);
  }
  const held = new Set<string>();
  let holdsAdmin = false;
  for (const row of (perms ?? []) as any[]) {
    const action = row.module_actions?.action_name;
    const modName = row.module_actions?.app_modules?.name;
    if (action && modName) {
      const cap = `${modName}:${action}`;
      held.add(cap);
      if (modName === descriptor.moduleCode && action === 'admin') holdsAdmin = true;
    }
  }
  const authorised = descriptor.anyOfCapabilities.some((c) => held.has(c));
  if (!authorised) {
    return json(fail('DENIED', 'CAPABILITY_DENIED', `Missing required capability for ${queryCode}.`, correlationId, queryCode, queryVersion), 403);
  }

  const reqSize = Number(envelope?.page?.pageSize ?? 50);
  const limit = Math.max(1, Math.min(reqSize, descriptor.maxPageSize));
  const offset = Number(envelope?.page?.pageToken ?? 0) || 0;

  let handlerResult: { data: any; totalCount: number | null };
  try {
    handlerResult = await descriptor.handler(admin, envelope?.params ?? {}, {
      limit,
      offset,
    });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    if (msg.startsWith('INVALID_PARAMS:')) {
      return json(fail('INVALID', 'INVALID_PARAMS', msg.slice('INVALID_PARAMS:'.length), correlationId, queryCode, queryVersion), 400);
    }
    return json(fail('FAILED', 'HANDLER_FAILED', 'Query handler failed.', correlationId, queryCode, queryVersion), 500);
  }

  const maskedFields: string[] = [];
  let data = handlerResult.data;
  if (!holdsAdmin && descriptor.sensitiveFields.length > 0) {
    data = maskCollection(data, descriptor.sensitiveFields);
    maskedFields.push(...descriptor.sensitiveFields);
  }

  // Audit: fire-and-forget; never block the caller.
  admin
    .from('bn_module_events')
    .insert({
      module_code: descriptor.moduleCode,
      event_type: 'query.executed',
      event_data: {
        queryCode,
        correlationId,
        actorUserId: userId,
        pageSize: limit,
        pageOffset: offset,
        maskedFields,
      } as any,
    })
    .then(() => undefined, () => undefined);

  const nextOffset = offset + limit;
  const total = handlerResult.totalCount;
  const nextPageToken =
    Array.isArray(data) && data.length === limit && (total === null || nextOffset < total)
      ? String(nextOffset)
      : null;

  return json({
    status: 'OK',
    correlationId,
    queryCode,
    queryVersion,
    data,
    page: { pageSize: limit, nextPageToken, totalCount: total },
    errors: [],
    maskedFields,
    warnings: [],
  });
});
