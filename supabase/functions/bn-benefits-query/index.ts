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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_STATUSES = new Set([
  'DRAFT','REPORTED','VERIFICATION_PENDING','PROVISIONALLY_HELD','CONFLICT',
  'VERIFIED','REJECTED','CANCELLED','DUPLICATE','IMPACT_REVIEW','APPROVAL_PENDING',
  'CONFIRMED','FOLLOW_ON_PROCESSING','COMPLETED','CLOSED','REVERSED',
]);

// PostgREST ilike wildcard escaping — %, _, and \ are wildcards/escape.
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

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
  if (params?.status && !ALLOWED_STATUSES.has(String(params.status))) {
    throw new Error('INVALID_PARAMS:status not allowed');
  }
  if (params?.assignedTo && !UUID_RE.test(String(params.assignedTo))) {
    throw new Error('INVALID_PARAMS:assignedTo must be UUID');
  }
  if (params?.search != null) {
    const s = String(params.search);
    if (s.length > 100) throw new Error('INVALID_PARAMS:search too long');
  }
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
  if (params?.search) q = q.ilike('deceased_full_name', `%${escapeLike(String(params.search))}%`);
  const { data, error, count } = await q;
  if (error) throw error;
  return { data: data ?? [], totalCount: typeof count === 'number' ? count : null };
}

async function getEvent(admin: any, params: any) {
  if (!params?.eventId || !UUID_RE.test(String(params.eventId))) throw new Error('INVALID_PARAMS:eventId must be UUID');
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

function requireEventId(params: any): string {
  const id = params?.eventId;
  if (!id || typeof id !== 'string' || !UUID_RE.test(id)) throw new Error('INVALID_PARAMS:eventId must be UUID');
  return id;
}

async function getEventHistory(admin: any, params: any, page: { limit: number; offset: number }) {
  const eventId = requireEventId(params);
  const { data, error, count } = await admin
    .from('bn_mortality_event_history')
    .select('id,event_id,event_type,from_status,to_status,actor_user_id,actor_user_code,occurred_at,correlation_id,reason_code', { count: 'exact' })
    .eq('event_id', eventId)
    .order('occurred_at', { ascending: false })
    .range(page.offset, page.offset + page.limit - 1);
  if (error) throw error;
  const dto = (data ?? []).map((r: any) => ({
    id: r.id,
    eventId: r.event_id,
    eventType: r.event_type,
    fromStatus: r.from_status,
    toStatus: r.to_status,
    actorUserId: r.actor_user_id,
    actorUserCode: r.actor_user_code,
    occurredAt: r.occurred_at,
    correlationId: r.correlation_id,
    reasonCode: r.reason_code,
  }));
  return { data: dto, totalCount: typeof count === 'number' ? count : null };
}

async function getAwardImpacts(admin: any, params: any, page: { limit: number; offset: number }) {
  const eventId = requireEventId(params);
  const { data, error, count } = await admin
    .from('bn_mortality_award_impact')
    .select(
      'id,event_id,bn_award_id,bn_claim_id,award_reference,action,impact_decision,impact_status,approval_state,' +
        'hold_required,hold_status,hold_date,hold_servicing_event_id,hold_reference,' +
        'release_servicing_event_id,release_reference,' +
        'termination_required,termination_status,termination_effective_date,termination_servicing_event_id,termination_reference,' +
        'original_award_status,original_award_amount,payment_frequency,' +
        'estimated_pad_minor,future_schedule_count,beneficiary_link,last_valid_payment_date,' +
        'integration_status,integration_failure_code,integration_failure_message,integration_attempted_at,' +
        'payment_after_death_minor,currency_code,overpayment_id,overpayment_reference,' +
        'approved_at,approved_by,applied_at,row_version,created_at,updated_at',
      { count: 'exact' },
    )
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .range(page.offset, page.offset + page.limit - 1);
  if (error) throw error;
  // Also fetch current Award status for cross-reference (not internal DB rows).
  const awardIds = (data ?? []).map((r: any) => r.bn_award_id).filter(Boolean);
  let awardStatus: Record<string, string> = {};
  if (awardIds.length) {
    const { data: aRows } = await admin
      .from('bn_award')
      .select('id,status,end_date')
      .in('id', awardIds);
    for (const a of (aRows ?? []) as any[]) awardStatus[a.id] = a.status;
  }
  const dto = (data ?? []).map((r: any) => ({
    id: r.id,
    eventId: r.event_id,
    awardId: r.bn_award_id,
    claimId: r.bn_claim_id,
    awardReference: r.award_reference,
    action: r.action,
    impactDecision: r.impact_decision,
    impactStatus: r.impact_status,
    approvalState: r.approval_state,
    currentAwardStatus: r.bn_award_id ? (awardStatus[r.bn_award_id] ?? null) : null,
    originalAwardStatus: r.original_award_status,
    originalAwardAmountMinor: r.original_award_amount,
    paymentFrequency: r.payment_frequency,
    holdRequired: r.hold_required,
    holdStatus: r.hold_status,
    holdDate: r.hold_date,
    holdServicingReference: r.hold_reference,
    releaseServicingReference: r.release_reference,
    terminationRequired: r.termination_required,
    terminationStatus: r.termination_status,
    terminationEffectiveDate: r.termination_effective_date,
    terminationServicingReference: r.termination_reference,
    futureScheduleCount: r.future_schedule_count ?? 0,
    beneficiaryLink: r.beneficiary_link === true,
    lastValidPaymentDate: r.last_valid_payment_date,
    estimatedPadMinor: r.estimated_pad_minor ?? r.payment_after_death_minor ?? 0,
    currencyCode: r.currency_code,
    integrationStatus: r.integration_status ?? 'NONE',
    // Sanitised failure surface — only the code, and only a short generic message.
    integrationFailure:
      r.integration_status && String(r.integration_status).endsWith('_FAILED')
        ? {
            code: r.integration_failure_code ?? 'INTEGRATION_FAILURE',
            summary: 'Servicing integration failed — see servicing audit for details.',
          }
        : null,
    integrationAttemptedAt: r.integration_attempted_at,
    overpaymentId: r.overpayment_id,
    overpaymentReference: r.overpayment_reference,
    approvedAt: r.approved_at,
    approvedBy: r.approved_by,
    appliedAt: r.applied_at,
    rowVersion: r.row_version,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    award360Route: r.bn_award_id ? `/bn/awards/${r.bn_award_id}` : null,
  }));
  return { data: dto, totalCount: typeof count === 'number' ? count : null };
}


async function getAffectedAwards(admin: any, params: any, page: { limit: number; offset: number }) {
  const eventId = requireEventId(params);
  // Prefer prepared impacts; if none exist, fall back to a live person→award scan
  // (so callers can preview affected awards before PREPARE_IMPACT runs).
  const { data: impacts, error } = await admin
    .from('bn_mortality_award_impact')
    .select('id,bn_award_id,bn_claim_id,award_reference,action,effective_date,payment_after_death_minor,currency_code,overpayment_id,overpayment_reference,approval_state,hold_status,termination_status,impact_decision,impact_status,created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .range(page.offset, page.offset + page.limit - 1);
  if (error) throw error;
  let rows: any[] = impacts ?? [];
  if (rows.length === 0) {
    // Fallback: look up matched person, then discover current awards.
    const { data: ev } = await admin
      .from('bn_mortality_event')
      .select('matched_ip_id')
      .eq('id', eventId)
      .maybeSingle();
    if (ev?.matched_ip_id) {
      const { data: claims } = await admin
        .from('bn_claim')
        .select('id')
        .eq('ip_id', ev.matched_ip_id);
      const claimIds = (claims ?? []).map((c: any) => c.id);
      if (claimIds.length) {
        const { data: awards } = await admin
          .from('bn_award')
          .select('id,award_reference,status,award_amount,frequency,start_date,end_date,bn_claim_id')
          .in('bn_claim_id', claimIds);
        rows = (awards ?? []).map((a: any) => ({
          id: null,
          bn_award_id: a.id,
          bn_claim_id: a.bn_claim_id,
          award_reference: a.award_reference,
          action: 'NONE',
          effective_date: null,
          payment_after_death_minor: null,
          currency_code: null,
          overpayment_id: null,
          overpayment_reference: null,
          approval_state: 'PENDING',
          hold_status: 'NOT_REQUIRED',
          termination_status: 'NOT_REQUIRED',
          impact_decision: 'PENDING',
          impact_status: 'PENDING',
          created_at: null,
          _award_shape: a,
        }));
      }
    }
  }
  const awardIds = rows.map((r: any) => r.bn_award_id).filter(Boolean);
  let awards: any[] = [];
  if (awardIds.length) {
    const { data: aRows } = await admin
      .from('bn_award')
      .select('id,award_reference,status,award_amount,frequency,start_date,end_date')
      .in('id', awardIds);
    awards = aRows ?? [];
  }
  const awardsById: Record<string, any> = Object.fromEntries(awards.map((a: any) => [a.id, a]));
  const dto = rows.map((i: any) => ({
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
    award: awardsById[i.bn_award_id] ?? i._award_shape ?? null,
    sourceIsFallbackScan: i.id === null,
  }));
  return { data: dto, totalCount: dto.length };
}

async function getReferrals(admin: any, params: any, page: { limit: number; offset: number }) {
  const eventId = requireEventId(params);
  const { data, error, count } = await admin
    .from('bn_mortality_referral')
    .select('id,event_id,referral_type,target_module,target_ref_type,target_ref_id,target_reference,status,raised_at,raised_by,correlation_id,accepted_at,completed_at,failure_reason', { count: 'exact' })
    .eq('event_id', eventId)
    .order('raised_at', { ascending: false })
    .range(page.offset, page.offset + page.limit - 1);
  if (error) throw error;
  const dto = (data ?? []).map((r: any) => ({
    id: r.id,
    eventId: r.event_id,
    referralType: r.referral_type,
    targetModule: r.target_module,
    targetRefType: r.target_ref_type,
    targetRefId: r.target_ref_id,
    targetReference: r.target_reference,
    status: r.status,
    raisedAt: r.raised_at,
    raisedBy: r.raised_by,
    correlationId: r.correlation_id,
    acceptedAt: r.accepted_at,
    completedAt: r.completed_at,
    failureReason: r.failure_reason,
  }));
  return { data: dto, totalCount: typeof count === 'number' ? count : null };
}

async function getEvidenceLinks(admin: any, params: any, page: { limit: number; offset: number }) {
  const eventId = requireEventId(params);
  const { data, error, count } = await admin
    .from('core_generated_document')
    .select('id,document_type,title,file_reference,generated_at,generated_by,status', { count: 'exact' })
    .eq('module_code', 'bn_mortality')
    .eq('reference_id', eventId)
    .order('generated_at', { ascending: false })
    .range(page.offset, page.offset + page.limit - 1);
  if (error) return { data: [], totalCount: 0 };
  return { data: data ?? [], totalCount: typeof count === 'number' ? count : null };
}

async function getCommunications(admin: any, params: any, page: { limit: number; offset: number }) {
  const eventId = requireEventId(params);
  const { data, error, count } = await admin
    .from('communication_hub_trace')
    .select('id,event_code,module_code,status,recipient_summary,sent_at,created_at', { count: 'exact' })
    .eq('module_code', 'bn_mortality')
    .eq('external_reference', eventId)
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

  // Envelope validation.
  if (!queryCode) {
    return json(fail('INVALID', 'INVALID_ENVELOPE', 'queryCode required.', correlationId, queryCode, queryVersion), 400);
  }
  if (!Number.isInteger(queryVersion) || queryVersion < 1 || queryVersion > 1000) {
    return json(fail('INVALID', 'INVALID_ENVELOPE', 'queryVersion must be a positive integer.', correlationId, queryCode, queryVersion), 400);
  }
  if (envelope?.correlationId && !UUID_RE.test(String(envelope.correlationId))) {
    return json(fail('INVALID', 'INVALID_ENVELOPE', 'correlationId must be a UUID.', correlationId, queryCode, queryVersion), 400);
  }

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

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Enforce module is_enabled + routes_enabled before any data access.
  const { data: modRow } = await admin
    .from('app_modules')
    .select('id,is_enabled,routes_enabled')
    .eq('name', descriptor.moduleCode)
    .maybeSingle();
  if (!modRow || !modRow.is_enabled || !modRow.routes_enabled) {
    return json(fail('DENIED', 'MODULE_DISABLED', `Module ${descriptor.moduleCode} is not query-enabled.`, correlationId, queryCode, queryVersion), 403);
  }

  // Capability walk: is_granted=true role_permissions → enabled module_actions → matching module.
  const rolesResp = await admin.from('user_roles').select('role_id').eq('user_id', userId);
  const roleIds = (rolesResp.data ?? []).map((r: any) => r.role_id);
  const held = new Set<string>();
  let holdsAdmin = false;
  if (roleIds.length) {
    const { data: perms, error: permsErr } = await admin
      .from('role_permissions')
      .select('is_granted, module_actions!inner(action_name, is_enabled, app_modules!inner(name, is_enabled))')
      .in('role_id', roleIds)
      .eq('is_granted', true);
    if (permsErr) {
      return json(fail('FAILED', 'PERMISSION_LOOKUP_FAILED', 'Cannot resolve caller capabilities.', correlationId, queryCode, queryVersion), 500);
    }
    for (const row of (perms ?? []) as any[]) {
      const action = row.module_actions?.action_name;
      const actionEnabled = row.module_actions?.is_enabled;
      const modName = row.module_actions?.app_modules?.name;
      const modEnabled = row.module_actions?.app_modules?.is_enabled;
      if (action && modName && actionEnabled && modEnabled) {
        const cap = `${modName}:${action}`;
        held.add(cap);
        if (modName === descriptor.moduleCode && action === 'admin') holdsAdmin = true;
      }
    }
  }
  const authorised = descriptor.anyOfCapabilities.some((c) => held.has(c));
  if (!authorised) {
    return json(fail('DENIED', 'CAPABILITY_DENIED', `Missing required capability for ${queryCode}.`, correlationId, queryCode, queryVersion), 403);
  }

  const reqSize = Number(envelope?.page?.pageSize ?? 50);
  if (!Number.isFinite(reqSize) || reqSize < 1 || reqSize > 500) {
    return json(fail('INVALID', 'INVALID_PARAMS', 'pageSize must be between 1 and 500.', correlationId, queryCode, queryVersion), 400);
  }
  const limit = Math.max(1, Math.min(Math.floor(reqSize), descriptor.maxPageSize));
  const rawToken = envelope?.page?.pageToken;
  const parsedToken = rawToken == null ? 0 : Number(rawToken);
  if (!Number.isFinite(parsedToken) || parsedToken < 0 || parsedToken > 1_000_000) {
    return json(fail('INVALID', 'INVALID_PARAMS', 'pageToken must be a non-negative integer.', correlationId, queryCode, queryVersion), 400);
  }
  const offset = Math.floor(parsedToken);

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
