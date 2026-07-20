/**
 * BN Benefits — Secure Query Edge Function.
 *
 * Sole server-side read path for the browser into the benefits domain.
 *
 * BN-MORT-UI-1B fail-closed authorisation contract:
 *   - JWT presence + valid subject required.
 *   - app_modules.name = descriptor.moduleCode is loaded.
 *   - app_modules.is_enabled = true.
 *   - app_modules.routes_enabled = true.
 *   - Caller has at least one of descriptor.anyOfCapabilities, resolved via
 *     user_roles -> roles -> role_permissions (is_granted = true) ->
 *     module_actions (is_enabled = true). Merely finding a capability row is
 *     not sufficient — every gate must pass.
 *
 * Every response conforms to BnBenefitsQueryResult exactly:
 *   { status, correlationId, queryCode, queryVersion, data, page,
 *     errors, maskedFields, warnings }
 *
 * Statuses:
 *   OK        — handler succeeded
 *   DENIED    — auth/module/action/routes/capability gate failed
 *   INVALID   — parameter validation rejected the request
 *   NOT_FOUND — handler completed but the resource does not exist
 *   FAILED    — server error while running the handler
 *
 * The edge function ALWAYS returns HTTP 200 with the envelope so the browser
 * adapter preserves structured DENIED/INVALID/NOT_FOUND/FAILED results and
 * does not misrender them as empty datasets.
 */
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2';
import { calculateActionAvailability, type EventSnapshot } from './_shared.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;
const SAFE_TEXT_RE = /^[\p{L}\p{N}\s._@,'()\-\/]+$/u;

const ALLOWED_STATUSES = new Set([
  'DRAFT','REPORTED','VERIFICATION_PENDING','PROVISIONALLY_HELD','CONFLICT',
  'VERIFIED','REJECTED','CANCELLED','DUPLICATE','IMPACT_REVIEW','APPROVAL_PENDING',
  'CONFIRMED','FOLLOW_ON_PROCESSING','COMPLETED','CLOSED','REVERSED',
]);

const ALLOWED_SOURCES = new Set([
  'REGISTRAR_FEED','IP_MODULE','FAMILY_NOTIFICATION','HOSPITAL_NOTICE','STAFF_ENTRY','OTHER',
]);

const ALLOWED_SORT_COLUMNS = new Set([
  'reported_at','updated_at','sla_due_at','status','death_date',
]);

// PostgREST ilike wildcard escaping — %, _, and \ are wildcards/escape.
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

class QueryError extends Error {
  constructor(public status: 'INVALID' | 'NOT_FOUND' | 'FAILED', public code: string, message: string, public field?: string) {
    super(message);
  }
}

const invalid = (msg: string, field?: string) => new QueryError('INVALID', 'INVALID_PARAMS', msg, field);

interface QueryDescriptor {
  moduleCode: string;
  anyOfCapabilities: string[];
  sensitiveFields: string[];
  maxPageSize: number;
  handler: (
    admin: any,
    params: any,
    page: { limit: number; offset: number },
  ) => Promise<{ data: any; totalCount: number | null; notFound?: boolean }>;
}

// -- Handlers ---------------------------------------------------------------

function firstOfMonthIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

async function listEvents(
  admin: any,
  params: any,
  page: { limit: number; offset: number },
) {
  if (params?.status && !ALLOWED_STATUSES.has(String(params.status))) {
    throw invalid('status not allowed', 'status');
  }
  if (params?.source && !ALLOWED_SOURCES.has(String(params.source))) {
    throw invalid('source not allowed', 'source');
  }
  if (params?.assignedTo && !UUID_RE.test(String(params.assignedTo))) {
    throw invalid('assignedTo must be UUID', 'assignedTo');
  }
  if (params?.reportedFrom && !ISO_DATE_RE.test(String(params.reportedFrom))) {
    throw invalid('reportedFrom must be ISO date', 'reportedFrom');
  }
  if (params?.reportedTo && !ISO_DATE_RE.test(String(params.reportedTo))) {
    throw invalid('reportedTo must be ISO date', 'reportedTo');
  }
  if (params?.search != null) {
    const s = String(params.search);
    if (s.length > 100) throw invalid('search too long', 'search');
  }
  const sortBy = ALLOWED_SORT_COLUMNS.has(String(params?.sortBy)) ? String(params.sortBy) : 'reported_at';
  const sortDir = params?.sortDir === 'asc' ? true : false;

  let q = admin
    .from('bn_mortality_event')
    .select(
      'id,event_reference,status,source,deceased_full_name,death_date,reported_at,assigned_to,sla_due_at,row_version,updated_at',
      { count: 'exact' },
    )
    .order(sortBy, { ascending: sortDir })
    .range(page.offset, page.offset + page.limit - 1);

  if (params?.status) q = q.eq('status', params.status);
  if (params?.source) q = q.eq('source', params.source);
  if (params?.assignedTo) q = q.eq('assigned_to', params.assignedTo);
  if (params?.unassignedOnly === true) q = q.is('assigned_to', null);
  if (params?.overdueOnly === true) {
    q = q.lt('sla_due_at', new Date().toISOString())
         .not('status', 'in', '(CLOSED,CANCELLED,DUPLICATE,REVERSED)');
  }
  if (params?.reportedFrom) q = q.gte('reported_at', params.reportedFrom);
  if (params?.reportedTo) q = q.lte('reported_at', params.reportedTo);
  if (params?.search) {
    q = q.ilike('deceased_full_name', `%${escapeLike(String(params.search))}%`);
  }

  const { data, error, count } = await q;
  if (error) throw new QueryError('FAILED', 'LIST_EVENTS_FAILED', error.message);
  return { data: data ?? [], totalCount: typeof count === 'number' ? count : null };
}

// Explicit allow-list of columns the getEvent DTO exposes. Never `select('*')`.
const EVENT_COLUMNS = [
  'id','event_reference','status','source',
  'deceased_full_name','deceased_dob','deceased_gender','deceased_national_id',
  'death_date','death_time','death_place','death_cause',
  'matched_ip_id','match_confidence','matched_at',
  'verification_source','verification_reference','verification_confidence','verified_at',
  'assigned_to','created_by','sla_due_at','row_version',
  'reported_at','submitted_for_verification_at','submitted_for_verification_by',
  'confirmed_at','confirmed_by','completed_at','closed_at','reversed_at',
  'correlation_id','created_at','updated_at',
  // Admin-only fields — intentionally selected so the masking layer can null them.
  'metadata_json','registrar_reference',
  'match_score','rejected_reason','conflict_reason','reversal_reason','verification_notes',
].join(',');

async function getEvent(admin: any, params: any) {
  if (!params?.eventId || !UUID_RE.test(String(params.eventId))) throw invalid('eventId must be UUID', 'eventId');
  const { data, error } = await admin
    .from('bn_mortality_event')
    .select(EVENT_COLUMNS)
    .eq('id', params.eventId)
    .maybeSingle();
  if (error) throw new QueryError('FAILED', 'GET_EVENT_FAILED', error.message);
  if (!data) return { data: null, totalCount: 0, notFound: true };
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
    createdBy: data.created_by,
    slaDueAt: data.sla_due_at,
    rowVersion: data.row_version,
    reportedAt: data.reported_at,
    submittedForVerificationAt: data.submitted_for_verification_at,
    submittedForVerificationBy: data.submitted_for_verification_by,
    confirmedAt: data.confirmed_at,
    confirmedBy: data.confirmed_by,
    completedAt: data.completed_at,
    closedAt: data.closed_at,
    reversedAt: data.reversed_at,
    correlationId: data.correlation_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    // Admin-only — masked unless caller holds bn_mortality:admin.
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
  if (params?.eventId) {
    if (!UUID_RE.test(String(params.eventId))) throw invalid('eventId must be UUID', 'eventId');
    const { data, error } = await admin
      .from('bn_mortality_event')
      .select('id,event_reference,status,deceased_full_name,death_date,sla_due_at,assigned_to,row_version,updated_at')
      .eq('id', params.eventId)
      .maybeSingle();
    if (error) throw new QueryError('FAILED', 'GET_SUMMARY_FAILED', error.message);
    return { data: data ?? null, totalCount: data ? 1 : 0, notFound: !data };
  }

  const now = new Date().toISOString();
  const monthStart = firstOfMonthIso();

  const [statusResp, overdueResp, unassignedResp, closedThisMonthResp, recentResp] = await Promise.all([
    admin.from('bn_mortality_event').select('status'),
    admin.from('bn_mortality_event').select('id', { count: 'exact', head: true })
      .lt('sla_due_at', now)
      .not('status', 'in', '(CLOSED,CANCELLED,DUPLICATE,REVERSED)'),
    admin.from('bn_mortality_event').select('id', { count: 'exact', head: true })
      .is('assigned_to', null)
      .not('status', 'in', '(CLOSED,CANCELLED,DUPLICATE,REVERSED)'),
    admin.from('bn_mortality_event').select('id', { count: 'exact', head: true })
      .eq('status', 'CLOSED').gte('closed_at', monthStart),
    admin.from('bn_mortality_event')
      .select('id,event_reference,status,deceased_full_name,death_date,reported_at,assigned_to,sla_due_at')
      .order('reported_at', { ascending: false }).limit(10),
  ]);

  if (statusResp.error) throw new QueryError('FAILED', 'GET_SUMMARY_FAILED', statusResp.error.message);
  if (recentResp.error) throw new QueryError('FAILED', 'GET_SUMMARY_FAILED', recentResp.error.message);

  const statusRows = (statusResp.data ?? []) as any[];
  const byStatus: Record<string, number> = {};
  for (const r of statusRows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  const openNonTerminal = statusRows.filter(
    (r: any) => !['CLOSED','CANCELLED','DUPLICATE','REVERSED'].includes(r.status),
  ).length;

  const dto = {
    totals: {
      all: statusRows.length,
      byStatus,
      totalOpen: openNonTerminal,
      openNonTerminal,
      unassigned: typeof unassignedResp.count === 'number' ? unassignedResp.count : 0,
      verificationPending: byStatus['VERIFICATION_PENDING'] ?? 0,
      provisionallyHeld: byStatus['PROVISIONALLY_HELD'] ?? 0,
      conflicts: byStatus['CONFLICT'] ?? 0,
      impactReview: byStatus['IMPACT_REVIEW'] ?? 0,
      approvalPending: byStatus['APPROVAL_PENDING'] ?? 0,
      followOnProcessing: byStatus['FOLLOW_ON_PROCESSING'] ?? 0,
      overdue: typeof overdueResp.count === 'number' ? overdueResp.count : 0,
      closedThisMonth: typeof closedThisMonthResp.count === 'number' ? closedThisMonthResp.count : 0,
    },
    recent: recentResp.data ?? [],
    generatedAt: now,
  };
  return { data: dto, totalCount: 1 };
}

function requireEventId(params: any): string {
  const id = params?.eventId;
  if (!id || typeof id !== 'string' || !UUID_RE.test(id)) throw invalid('eventId must be UUID', 'eventId');
  return id;
}

async function getEventHistory(admin: any, params: any, page: { limit: number; offset: number }) {
  const eventId = requireEventId(params);
  const { data, error, count } = await admin
    .from('bn_mortality_event_history')
    .select(
      'id,event_id,command_name,from_status,to_status,actor_user_id,actor_user_code,occurred_at,correlation_id,reason_code,justification',
      { count: 'exact' },
    )
    .eq('event_id', eventId)
    .order('occurred_at', { ascending: false })
    .range(page.offset, page.offset + page.limit - 1);
  if (error) throw new QueryError('FAILED', 'GET_EVENT_HISTORY_FAILED', error.message);
  const dto = (data ?? []).map((r: any) => ({
    id: r.id,
    eventId: r.event_id,
    commandName: r.command_name,
    fromStatus: r.from_status,
    toStatus: r.to_status,
    actorUserId: r.actor_user_id,
    actorUserCode: r.actor_user_code,
    occurredAt: r.occurred_at,
    correlationId: r.correlation_id,
    reasonCode: r.reason_code,
    justification: r.justification,
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
  if (error) throw new QueryError('FAILED', 'GET_AWARD_IMPACTS_FAILED', error.message);
  const awardIds = (data ?? []).map((r: any) => r.bn_award_id).filter(Boolean);
  const awardStatus: Record<string, string> = {};
  if (awardIds.length) {
    const { data: aRows, error: aErr } = await admin.from('bn_award').select('id,status,end_date').in('id', awardIds);
    if (aErr) throw new QueryError('FAILED', 'GET_AWARD_IMPACTS_FAILED', aErr.message);
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
    integrationFailure:
      r.integration_status && String(r.integration_status).endsWith('_FAILED')
        ? { code: r.integration_failure_code ?? 'INTEGRATION_FAILURE',
            summary: 'Servicing integration failed — see servicing audit for details.' }
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
  const { data: impacts, error } = await admin
    .from('bn_mortality_award_impact')
    .select('id,bn_award_id,bn_claim_id,award_reference,action,effective_date,payment_after_death_minor,estimated_pad_minor,currency_code,overpayment_id,overpayment_reference,approval_state,hold_status,termination_status,impact_decision,impact_status,integration_status,created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .range(page.offset, page.offset + page.limit - 1);
  if (error) throw new QueryError('FAILED', 'GET_AFFECTED_AWARDS_FAILED', error.message);

  let rows: any[] = impacts ?? [];
  if (rows.length === 0) {
    const { data: ev, error: evErr } = await admin
      .from('bn_mortality_event')
      .select('matched_ip_id').eq('id', eventId).maybeSingle();
    if (evErr) throw new QueryError('FAILED', 'GET_AFFECTED_AWARDS_FAILED', evErr.message);
    if (ev?.matched_ip_id) {
      const { data: claims, error: cErr } = await admin.from('bn_claim').select('id').eq('ip_id', ev.matched_ip_id);
      if (cErr) throw new QueryError('FAILED', 'GET_AFFECTED_AWARDS_FAILED', cErr.message);
      const claimIds = (claims ?? []).map((c: any) => c.id);
      if (claimIds.length) {
        const { data: awards, error: aErr } = await admin
          .from('bn_award')
          .select('id,award_reference,status,award_amount,frequency,start_date,end_date,bn_claim_id')
          .in('bn_claim_id', claimIds);
        if (aErr) throw new QueryError('FAILED', 'GET_AFFECTED_AWARDS_FAILED', aErr.message);
        rows = (awards ?? []).map((a: any) => ({
          id: null,
          bn_award_id: a.id,
          bn_claim_id: a.bn_claim_id,
          award_reference: a.award_reference,
          action: 'NONE',
          approval_state: 'PENDING',
          hold_status: 'NOT_REQUIRED',
          termination_status: 'NOT_REQUIRED',
          impact_decision: 'PENDING',
          impact_status: 'PENDING',
          integration_status: 'NONE',
          _award_shape: a,
        }));
      }
    }
  }
  const awardIds = rows.map((r: any) => r.bn_award_id).filter(Boolean);
  let awards: any[] = [];
  if (awardIds.length) {
    const { data: aRows, error: aErr } = await admin.from('bn_award')
      .select('id,award_reference,status,award_amount,frequency,start_date,end_date').in('id', awardIds);
    if (aErr) throw new QueryError('FAILED', 'GET_AFFECTED_AWARDS_FAILED', aErr.message);
    awards = aRows ?? [];
  }
  const awardsById: Record<string, any> = Object.fromEntries(awards.map((a: any) => [a.id, a]));
  const dto = rows.map((i: any, idx: number) => ({
    id: i.id ?? (i.bn_award_id ? `preview:${eventId}:${i.bn_award_id}` : `preview:${eventId}:row:${idx}`),
    impactId: i.id,
    eventId,
    awardId: i.bn_award_id,
    claimId: i.bn_claim_id,
    awardReference: i.award_reference ?? awardsById[i.bn_award_id]?.award_reference ?? null,
    action: i.action ?? 'NONE',
    currentAwardStatus: awardsById[i.bn_award_id]?.status ?? i._award_shape?.status ?? null,
    approvalState: i.approval_state ?? null,
    holdStatus: i.hold_status ?? null,
    terminationStatus: i.termination_status ?? null,
    impactDecision: i.impact_decision ?? null,
    impactStatus: i.impact_status ?? null,
    integrationStatus: i.integration_status ?? 'NONE',
    estimatedPadMinor: i.estimated_pad_minor ?? i.payment_after_death_minor ?? 0,
    currencyCode: i.currency_code ?? null,
    overpaymentId: i.overpayment_id ?? null,
    overpaymentReference: i.overpayment_reference ?? null,
    sourceIsFallbackScan: i.id === null || i.id === undefined,
    award360Route: i.bn_award_id ? `/bn/awards/${i.bn_award_id}` : null,
    holdRequired: false, terminationRequired: false, originalAwardStatus: null, paymentFrequency: null,
    holdDate: null, terminationEffectiveDate: null, holdServicingReference: null,
    releaseServicingReference: null, terminationServicingReference: null, futureScheduleCount: 0,
    beneficiaryLink: false, lastValidPaymentDate: null, integrationFailure: null,
    integrationAttemptedAt: null, approvedAt: null, approvedBy: null, appliedAt: null,
    rowVersion: 0, createdAt: null, updatedAt: null,
  }));
  return { data: dto, totalCount: dto.length };
}

async function previewRegistrationImpact(admin: any, params: any) {
  const matchedIpId = params?.matchedIpId;
  const deathDate = params?.deathDate;
  const source = params?.source;
  const externalReference = params?.externalReference;

  if (matchedIpId != null && (typeof matchedIpId !== 'string' || matchedIpId.length > 64)) {
    throw invalid('matchedIpId must be string ≤ 64 chars', 'matchedIpId');
  }
  if (matchedIpId != null && !SAFE_TEXT_RE.test(matchedIpId)) {
    throw invalid('matchedIpId contains unsafe characters', 'matchedIpId');
  }
  if (!deathDate || !ISO_DATE_RE.test(String(deathDate))) {
    throw invalid('deathDate must be ISO date', 'deathDate');
  }
  const dd = new Date(String(deathDate));
  const nowMs = Date.now();
  if (isNaN(dd.getTime())) throw invalid('deathDate is not parseable', 'deathDate');
  // Reject future dates outside a small clock-skew window (24h).
  if (dd.getTime() > nowMs + 24 * 3600 * 1000) {
    throw invalid('deathDate cannot be in the future', 'deathDate');
  }
  if (source && !ALLOWED_SOURCES.has(String(source))) {
    throw invalid('source not allowed', 'source');
  }
  if (externalReference != null) {
    const er = String(externalReference);
    if (er.length > 100) throw invalid('externalReference too long', 'externalReference');
    if (er.length > 0 && !SAFE_TEXT_RE.test(er)) {
      throw invalid('externalReference contains unsafe characters', 'externalReference');
    }
  }

  const warnings: Array<{ code: string; message: string; severity: 'INFO' | 'WARN' | 'CRIT' }> = [];

  if (!matchedIpId) {
    warnings.push({
      code: 'NO_MATCH_SELECTED',
      message: 'No canonical person selected — affected-award preview is unavailable until a match or explicit "no match" decision is recorded.',
      severity: 'INFO',
    });
    return { data: { matchedIpId: null, deathDate, source: source ?? null, externalReference: externalReference ?? null, awards: [], warnings, duplicates: [], generatedAt: new Date().toISOString() }, totalCount: 0 };
  }

  // Verify matchedIpId exists in ip_master before any Awards lookup.
  const { data: ipRow, error: ipErr } = await admin
    .from('ip_master').select('id').eq('id', matchedIpId).maybeSingle();
  if (ipErr) throw new QueryError('FAILED', 'PREVIEW_FAILED', ipErr.message);
  if (!ipRow) {
    throw new QueryError('INVALID', 'MATCHED_IP_NOT_FOUND', 'matchedIpId does not exist in ip_master', 'matchedIpId');
  }

  const { data: dups, error: dErr } = await admin
    .from('bn_mortality_event')
    .select('id,event_reference,status,death_date')
    .eq('matched_ip_id', matchedIpId)
    .eq('death_date', deathDate)
    .not('status', 'in', '(CANCELLED,DUPLICATE,REVERSED)');
  if (dErr) throw new QueryError('FAILED', 'PREVIEW_FAILED', dErr.message);
  const duplicates = (dups ?? []) as any[];
  if (duplicates.length > 0) {
    warnings.push({
      code: 'DUPLICATE_EVENT_SUSPECTED',
      message: `An existing mortality event already exists for this person and death date (${duplicates.length} match${duplicates.length === 1 ? '' : 'es'}).`,
      severity: 'CRIT',
    });
  }

  const { data: claims, error: cErr } = await admin.from('bn_claim').select('id').eq('ip_id', matchedIpId);
  if (cErr) throw new QueryError('FAILED', 'PREVIEW_FAILED', cErr.message);
  const claimIds = (claims ?? []).map((c: any) => c.id);
  let awards: any[] = [];
  if (claimIds.length === 0) {
    warnings.push({ code: 'NO_CLAIMS_FOR_IP', message: 'This person has no claims in the benefits system.', severity: 'INFO' });
  } else {
    const { data: rows, error: aErr } = await admin
      .from('bn_award')
      .select('id,award_reference,status,award_amount,frequency,start_date,end_date,bn_claim_id')
      .in('bn_claim_id', claimIds);
    if (aErr) throw new QueryError('FAILED', 'PREVIEW_FAILED', aErr.message);
    awards = rows ?? [];
  }

  const preview = awards.map((a: any) => {
    const isActive = a.status === 'ACTIVE' || a.status === 'IN_PAYMENT';
    let likelyAction: 'NONE' | 'HOLD' | 'TERMINATE' | 'PAD_RECOVERY' | 'PRORATE' = 'NONE';
    const flags: string[] = [];
    if (isActive) {
      likelyAction = 'HOLD';
      flags.push('LIKELY_HOLD');
      if (a.end_date == null || new Date(a.end_date) > new Date(deathDate)) {
        flags.push('LIKELY_TERMINATE');
        likelyAction = 'TERMINATE';
      }
      flags.push('POTENTIAL_PAD_IF_PAID_AFTER_DEATH');
    }
    return {
      id: `preview:${matchedIpId}:${a.id}`,
      awardId: a.id, awardReference: a.award_reference, currentAwardStatus: a.status,
      awardAmount: a.award_amount, frequency: a.frequency,
      startDate: a.start_date, endDate: a.end_date, likelyAction, flags,
    };
  });

  if (preview.length === 0 && claimIds.length > 0) {
    warnings.push({ code: 'NO_AWARDS_FOUND', message: 'Claims exist but no awards were discovered for this person.', severity: 'INFO' });
  }

  return {
    data: {
      matchedIpId, deathDate, source: source ?? null, externalReference: externalReference ?? null,
      awards: preview, warnings,
      duplicates: duplicates.map((d) => ({ id: d.id, eventReference: d.event_reference, status: d.status, deathDate: d.death_date })),
      generatedAt: new Date().toISOString(),
    },
    totalCount: preview.length,
  };
}

async function getReferrals(admin: any, params: any, page: { limit: number; offset: number }) {
  const eventId = requireEventId(params);
  const { data, error, count } = await admin
    .from('bn_mortality_referral')
    .select('id,event_id,referral_type,target_module,target_ref_type,target_ref_id,target_reference,status,raised_at,raised_by,correlation_id,accepted_at,completed_at,failure_reason', { count: 'exact' })
    .eq('event_id', eventId)
    .order('raised_at', { ascending: false })
    .range(page.offset, page.offset + page.limit - 1);
  if (error) throw new QueryError('FAILED', 'GET_REFERRALS_FAILED', error.message);
  const dto = (data ?? []).map((r: any) => ({
    id: r.id, eventId: r.event_id, referralType: r.referral_type, targetModule: r.target_module,
    targetRefType: r.target_ref_type, targetRefId: r.target_ref_id, targetReference: r.target_reference,
    status: r.status, raisedAt: r.raised_at, raisedBy: r.raised_by, correlationId: r.correlation_id,
    acceptedAt: r.accepted_at, completedAt: r.completed_at, failureReason: r.failure_reason,
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
  if (error) throw new QueryError('FAILED', 'GET_EVIDENCE_LINKS_FAILED', error.message);
  const dto = (data ?? []).map((r: any) => ({
    id: r.id, documentType: r.document_type ?? null, title: r.title ?? null,
    fileReference: r.file_reference ?? null, generatedAt: r.generated_at ?? null,
    generatedBy: r.generated_by ?? null, status: r.status ?? null,
  }));
  return { data: dto, totalCount: typeof count === 'number' ? count : null };
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
  if (error) throw new QueryError('FAILED', 'GET_COMMUNICATIONS_FAILED', error.message);
  const dto = (data ?? []).map((r: any) => ({
    id: r.id, eventCode: r.event_code ?? null, moduleCode: r.module_code ?? null,
    status: r.status ?? null, recipientSummary: r.recipient_summary ?? null,
    sentAt: r.sent_at ?? null, createdAt: r.created_at ?? null,
  }));
  return { data: dto, totalCount: typeof count === 'number' ? count : null };
}

async function searchPersonMatches(admin: any, params: any, page: { limit: number; offset: number }) {
  if (params?.nationalId != null) {
    const n = String(params.nationalId);
    if (n.length > 64 || !SAFE_TEXT_RE.test(n)) throw invalid('nationalId is invalid', 'nationalId');
  }
  if (params?.fullName != null) {
    const n = String(params.fullName);
    if (n.length > 100) throw invalid('fullName too long', 'fullName');
  }
  let q = admin
    .from('ip_master')
    .select('id,ssn,first_name,last_name,dob,gender', { count: 'exact' })
    .range(page.offset, page.offset + page.limit - 1);
  if (params?.nationalId) q = q.eq('ssn', params.nationalId);
  else if (params?.fullName) q = q.ilike('last_name', `%${escapeLike(String(params.fullName))}%`);
  const { data, error, count } = await q;
  if (error) throw new QueryError('FAILED', 'SEARCH_PERSON_MATCHES_FAILED', error.message);
  const rows = (data ?? []).map((r: any) => ({
    ipId: r.id,
    fullName: [r.first_name, r.last_name].filter(Boolean).join(' '),
    nationalIdMasked: maskNationalId(r.ssn),
    dateOfBirth: r.dob, gender: r.gender, confidenceInternals: null,
  }));
  return { data: rows, totalCount: typeof count === 'number' ? count : null };
}

const QUERY_REGISTRY: Record<string, QueryDescriptor> = {
  BN_MORTALITY_GET_SUMMARY: { moduleCode: 'bn_mortality', anyOfCapabilities: ['bn_mortality:view', 'bn_mortality:read'], sensitiveFields: [], maxPageSize: 1, handler: (admin, params) => getSummary(admin, params) },
  BN_MORTALITY_LIST_EVENTS: { moduleCode: 'bn_mortality', anyOfCapabilities: ['bn_mortality:view', 'bn_mortality:read'], sensitiveFields: ['nationalIdMasked', 'sourcePayload'], maxPageSize: 100, handler: listEvents },
  BN_MORTALITY_GET_EVENT: { moduleCode: 'bn_mortality', anyOfCapabilities: ['bn_mortality:view', 'bn_mortality:read'], sensitiveFields: ['sourcePayload', 'externalReferenceRaw', 'diagnostics'], maxPageSize: 1, handler: (admin, params) => getEvent(admin, params) },
  BN_MORTALITY_SEARCH_PERSON_MATCHES: { moduleCode: 'bn_mortality', anyOfCapabilities: ['bn_mortality:read'], sensitiveFields: ['nationalIdMasked', 'dateOfBirth', 'confidenceInternals'], maxPageSize: 50, handler: searchPersonMatches },
  BN_MORTALITY_GET_AFFECTED_AWARDS: { moduleCode: 'bn_mortality', anyOfCapabilities: ['bn_mortality:read'], sensitiveFields: ['overpaymentAmountMinor', 'holdReasonInternal'], maxPageSize: 100, handler: getAffectedAwards },
  BN_MORTALITY_GET_EVENT_HISTORY: { moduleCode: 'bn_mortality', anyOfCapabilities: ['bn_mortality:read'], sensitiveFields: ['justification'], maxPageSize: 200, handler: getEventHistory },
  BN_MORTALITY_GET_REFERRALS: { moduleCode: 'bn_mortality', anyOfCapabilities: ['bn_mortality:read'], sensitiveFields: [], maxPageSize: 100, handler: getReferrals },
  BN_MORTALITY_GET_AWARD_IMPACTS: { moduleCode: 'bn_mortality', anyOfCapabilities: ['bn_mortality:read'], sensitiveFields: ['overpaymentAmountMinor', 'ledgerDetail'], maxPageSize: 100, handler: getAwardImpacts },
  BN_MORTALITY_GET_EVIDENCE_LINKS: { moduleCode: 'bn_mortality', anyOfCapabilities: ['bn_mortality:read'], sensitiveFields: ['fileReference'], maxPageSize: 100, handler: getEvidenceLinks },
  BN_MORTALITY_GET_COMMUNICATIONS: { moduleCode: 'bn_mortality', anyOfCapabilities: ['bn_mortality:read'], sensitiveFields: ['recipientSummary'], maxPageSize: 100, handler: getCommunications },
  BN_MORTALITY_PREVIEW_REGISTRATION_IMPACT: { moduleCode: 'bn_mortality', anyOfCapabilities: ['bn_mortality:read', 'bn_mortality:write'], sensitiveFields: [], maxPageSize: 100, handler: (admin, params) => previewRegistrationImpact(admin, params) },
  BN_MORTALITY_GET_ACTION_AVAILABILITY: { moduleCode: 'bn_mortality', anyOfCapabilities: ['bn_mortality:view', 'bn_mortality:read'], sensitiveFields: [], maxPageSize: 1, handler: async () => ({ data: null, totalCount: 0 }) },
};

function maskNationalId(value: string | null | undefined): string | null {
  if (!value) return null;
  const s = String(value);
  if (s.length <= 4) return '••••';
  return `••••${s.slice(-4)}`;
}

function maskField(obj: any, field: string): boolean {
  if (obj == null || typeof obj !== 'object') return false;
  if (field in obj) { obj[field] = null; return true; }
  return false;
}

function applyMasking(payload: any, sensitiveFields: string[], isAdmin: boolean): string[] {
  if (isAdmin || sensitiveFields.length === 0) return [];
  const applied = new Set<string>();
  if (Array.isArray(payload)) {
    for (const row of payload) for (const f of sensitiveFields) { if (maskField(row, f)) applied.add(f); }
  } else if (payload && typeof payload === 'object') {
    for (const f of sensitiveFields) if (maskField(payload, f)) applied.add(f);
  }
  return Array.from(applied);
}

/**
 * Fail-closed capability resolution. Returns the set of verbs the caller
 * actually holds for `moduleName`, but only after confirming the module is
 * enabled and routes are enabled. Missing rows at any join produce an empty
 * set — never an implicit grant.
 */
async function resolveModuleAccess(
  admin: any,
  userId: string,
  moduleName: string,
): Promise<{ moduleFound: boolean; moduleEnabled: boolean; routesEnabled: boolean; grantedVerbs: Set<string> }> {
  const empty = { moduleFound: false, moduleEnabled: false, routesEnabled: false, grantedVerbs: new Set<string>() };
  const { data: mod, error: mErr } = await admin
    .from('app_modules').select('id, is_enabled, routes_enabled').eq('name', moduleName).maybeSingle();
  if (mErr) throw new QueryError('FAILED', 'MODULE_LOOKUP_FAILED', mErr.message);
  if (!mod) return empty;
  if (!mod.is_enabled) return { moduleFound: true, moduleEnabled: false, routesEnabled: !!mod.routes_enabled, grantedVerbs: new Set() };
  if (!mod.routes_enabled) return { moduleFound: true, moduleEnabled: true, routesEnabled: false, grantedVerbs: new Set() };

  const { data: userRoles, error: urErr } = await admin.from('user_roles').select('role').eq('user_id', userId);
  if (urErr) throw new QueryError('FAILED', 'USER_ROLES_LOOKUP_FAILED', urErr.message);
  const roleNames = Array.from(new Set((userRoles ?? []).map((r: any) => String(r.role))));
  if (roleNames.length === 0) return { moduleFound: true, moduleEnabled: true, routesEnabled: true, grantedVerbs: new Set() };

  const { data: roleRows, error: rErr } = await admin.from('roles').select('id').in('role_name', roleNames);
  if (rErr) throw new QueryError('FAILED', 'ROLES_LOOKUP_FAILED', rErr.message);
  const roleIds = (roleRows ?? []).map((r: any) => r.id);
  if (roleIds.length === 0) return { moduleFound: true, moduleEnabled: true, routesEnabled: true, grantedVerbs: new Set() };

  const { data: perms, error: pErr } = await admin
    .from('role_permissions')
    .select('action_id')
    .in('role_id', roleIds)
    .eq('module_id', mod.id)
    .eq('is_granted', true);
  if (pErr) throw new QueryError('FAILED', 'PERMISSIONS_LOOKUP_FAILED', pErr.message);
  const actionIds = Array.from(new Set((perms ?? []).map((p: any) => p.action_id)));
  if (actionIds.length === 0) return { moduleFound: true, moduleEnabled: true, routesEnabled: true, grantedVerbs: new Set() };

  const { data: actions, error: aErr } = await admin
    .from('module_actions').select('action_name')
    .eq('module_id', mod.id).eq('is_enabled', true).in('id', actionIds);
  if (aErr) throw new QueryError('FAILED', 'ACTIONS_LOOKUP_FAILED', aErr.message);
  const grantedVerbs = new Set<string>((actions ?? []).map((a: any) => String(a.action_name)));
  return { moduleFound: true, moduleEnabled: true, routesEnabled: true, grantedVerbs };
}

// -- Server ------------------------------------------------------------------

function envelope(
  status: 'OK' | 'DENIED' | 'INVALID' | 'NOT_FOUND' | 'FAILED',
  correlationId: string,
  queryCode: string,
  queryVersion: number,
  overrides: Partial<{ data: unknown; page: { pageSize: number; nextPageToken: string | null; totalCount: number | null }; errors: Array<{ code: string; message: string; field?: string }>; maskedFields: string[]; warnings: string[] }> = {},
) {
  return {
    status, correlationId, queryCode, queryVersion,
    data: overrides.data ?? null,
    page: overrides.page,
    errors: overrides.errors ?? [],
    maskedFields: overrides.maskedFields ?? [],
    warnings: overrides.warnings ?? [],
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return json(envelope('FAILED', 'unknown', 'unknown', 0, {
      errors: [{ code: 'METHOD_NOT_ALLOWED', message: 'Only POST is accepted.' }],
    }));
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const body = await req.json().catch(() => ({}));
  const queryCode: string = body?.queryCode ?? 'unknown';
  const queryVersion: number = Number(body?.queryVersion ?? 1);
  const correlationId: string = body?.correlationId ?? crypto.randomUUID();
  const params = body?.params ?? {};
  const rawLimit = Number(body?.page?.pageSize ?? body?.pageSize ?? 25);
  const rawOffset = Number(body?.page?.pageToken ?? body?.pageToken ?? 0);

  try {
    const auth = req.headers.get('Authorization');
    if (!auth) {
      return json(envelope('DENIED', correlationId, queryCode, queryVersion, {
        errors: [{ code: 'UNAUTHENTICATED', message: 'Bearer JWT required.' }],
      }));
    }
    const token = auth.replace(/^Bearer\s+/i, '');
    const { data: claimsData, error: claimsErr } = await (admin.auth as any).getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return json(envelope('DENIED', correlationId, queryCode, queryVersion, {
        errors: [{ code: 'UNAUTHENTICATED', message: 'Invalid or expired JWT.' }],
      }));
    }
    const userId: string = claimsData.claims.sub;

    const descriptor = QUERY_REGISTRY[queryCode];
    if (!descriptor) {
      return json(envelope('INVALID', correlationId, queryCode, queryVersion, {
        errors: [{ code: 'QUERY_CODE_UNKNOWN', message: `Unknown query code: ${queryCode}` }],
      }));
    }

    const limit = Math.min(Math.max(1, isFinite(rawLimit) ? rawLimit : 25), descriptor.maxPageSize);
    const offset = Math.max(0, isFinite(rawOffset) ? rawOffset : 0);

    // Fail-closed capability walk.
    const access = await resolveModuleAccess(admin, userId, descriptor.moduleCode);
    if (!access.moduleFound) {
      return json(envelope('DENIED', correlationId, queryCode, queryVersion, {
        errors: [{ code: 'MODULE_NOT_REGISTERED', message: `Module ${descriptor.moduleCode} is not registered.` }],
      }));
    }
    if (!access.moduleEnabled) {
      return json(envelope('DENIED', correlationId, queryCode, queryVersion, {
        errors: [{ code: 'MODULE_DISABLED', message: `Module ${descriptor.moduleCode} is disabled.` }],
      }));
    }
    if (!access.routesEnabled) {
      return json(envelope('DENIED', correlationId, queryCode, queryVersion, {
        errors: [{ code: 'ROUTES_DISABLED', message: `Routes for ${descriptor.moduleCode} are disabled.` }],
      }));
    }
    const requiredVerbs = descriptor.anyOfCapabilities
      .filter((c) => c.startsWith(`${descriptor.moduleCode}:`))
      .map((c) => c.split(':')[1]);
    const hasAny = requiredVerbs.some((v) => access.grantedVerbs.has(v));
    if (!hasAny) {
      return json(envelope('DENIED', correlationId, queryCode, queryVersion, {
        errors: [{
          code: 'FORBIDDEN',
          message: `Missing capability. One of: ${descriptor.anyOfCapabilities.join(', ')}`,
        }],
      }));
    }
    const isAdmin = access.grantedVerbs.has('admin');

    // Special-case: action availability calculator needs userId + granted verbs.
    if (queryCode === 'BN_MORTALITY_GET_ACTION_AVAILABILITY') {
      // NOTE: computeActionAvailability throws QueryError on DB failure
      // (ACTION_*_QUERY_FAILED) or missing event (EVENT_NOT_FOUND).
      const availability = await computeActionAvailability(admin, userId, access.grantedVerbs, params);
      if (availability.rows.length !== 26) {
        return json(envelope('FAILED', correlationId, queryCode, queryVersion, {
          errors: [{
            code: 'ACTION_MATRIX_INVARIANT_VIOLATION',
            message: `Expected 26 canonical commands, got ${availability.rows.length}.`,
          }],
        }));
      }
      return json(envelope('OK', correlationId, queryCode, queryVersion, {
        data: availability,
        page: { pageSize: 1, nextPageToken: null, totalCount: 1 },
      }));
    }

    const result = await descriptor.handler(admin, params, { limit, offset });
    const masked = applyMasking(result.data, descriptor.sensitiveFields, isAdmin);

    // Audit — best-effort.
    admin.from('bn_module_events').insert({
      module_code: descriptor.moduleCode,
      event_type: 'QUERY_EXECUTED',
      actor_user_id: userId,
      payload_json: {
        queryCode, correlationId, params,
        resultCount: Array.isArray(result.data) ? result.data.length : (result.data ? 1 : 0),
        maskedFields: masked,
      },
    }).then(() => {}).catch(() => {});

    if (result.notFound) {
      return json(envelope('NOT_FOUND', correlationId, queryCode, queryVersion, {
        data: null, maskedFields: masked,
        page: { pageSize: limit, nextPageToken: null, totalCount: 0 },
      }));
    }

    const totalCount = result.totalCount;
    const nextOffset = offset + limit;
    const nextPageToken =
      typeof totalCount === 'number' && nextOffset < totalCount ? String(nextOffset) : null;

    return json(envelope('OK', correlationId, queryCode, queryVersion, {
      data: result.data,
      maskedFields: masked,
      page: { pageSize: limit, nextPageToken, totalCount: typeof totalCount === 'number' ? totalCount : null },
    }));
  } catch (err: any) {
    if (err instanceof QueryError) {
      return json(envelope(err.status, correlationId, queryCode, queryVersion, {
        errors: [{ code: err.code, message: err.message, field: err.field }],
      }));
    }
    return json(envelope('FAILED', correlationId, queryCode, queryVersion, {
      errors: [{ code: 'INTERNAL_ERROR', message: String(err?.message ?? err) }],
    }));
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// -- BN-MORT-UI-1C: action availability -------------------------------------

async function computeActionAvailability(
  admin: any,
  userId: string,
  grantedVerbs: Set<string>,
  params: any,
) {
  const eventId = params?.eventId ? String(params.eventId) : null;
  let snapshot: EventSnapshot | null = null;

  if (eventId) {
    if (!UUID_RE.test(eventId)) throw new QueryError('INVALID', 'INVALID_PARAMS', 'eventId must be UUID', 'eventId');
    // Only columns that actually exist on bn_mortality_event.
    const { data: ev } = await admin
      .from('bn_mortality_event')
      .select('id,status,row_version,created_by,matched_ip_id,verified_at,confirmed_at,completed_at,closed_at,reversed_at,submitted_for_verification_at')
      .eq('id', eventId)
      .maybeSingle();
    if (ev) {
      // Derive maker identities from immutable history rather than columns.
      const { data: hist } = await admin
        .from('bn_mortality_event_history')
        .select('command_name,actor_user_id,occurred_at')
        .eq('event_id', eventId)
        .order('occurred_at', { ascending: true });
      const lastActor = (cmd: string): string | null => {
        if (!Array.isArray(hist)) return null;
        for (let i = hist.length - 1; i >= 0; i--) {
          if (hist[i]?.command_name === cmd) return hist[i]?.actor_user_id ?? null;
        }
        return null;
      };
      const lastOccurred = (cmd: string): string | null => {
        if (!Array.isArray(hist)) return null;
        for (let i = hist.length - 1; i >= 0; i--) {
          if (hist[i]?.command_name === cmd) return hist[i]?.occurred_at ?? null;
        }
        return null;
      };
      // Award-impact table drives the true "prepared / approved" milestones.
      const { data: impact } = await admin
        .from('bn_mortality_award_impact')
        .select('created_at,approved_at,termination_effective_date')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })
        .limit(1);
      const impactRow = Array.isArray(impact) && impact.length > 0 ? impact[0] : null;

      const { count: refCount } = await admin
        .from('bn_mortality_referral')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId);
      snapshot = {
        eventId: ev.id,
        status: ev.status,
        rowVersion: ev.row_version ?? null,
        createdBy: ev.created_by ?? null,
        submittedForVerificationBy: lastActor('BN_MORTALITY_SUBMIT_FOR_VERIFICATION'),
        preparedBy: lastActor('BN_MORTALITY_PREPARE_IMPACT'),
        submittedImpactBy: lastActor('BN_MORTALITY_SUBMIT_IMPACT'),
        confirmedBy: lastActor('BN_MORTALITY_CONFIRM_VERIFICATION'),
        approvedImpactBy: lastActor('BN_MORTALITY_APPROVE_IMPACT'),
        reversalInitiatedBy: lastActor('BN_MORTALITY_REVERSE_CONFIRMATION'),
        matchedIpId: ev.matched_ip_id ?? null,
        verifiedAt: ev.verified_at ?? null,
        impactPreparedAt: impactRow?.created_at ?? lastOccurred('BN_MORTALITY_PREPARE_IMPACT'),
        impactApprovedAt: impactRow?.approved_at ?? lastOccurred('BN_MORTALITY_APPROVE_IMPACT'),
        terminatedAt: impactRow?.termination_effective_date ?? lastOccurred('BN_MORTALITY_TERMINATE_AWARD'),
        hasReferrals: (refCount ?? 0) > 0,
      };
    }
  }


  // actions_enabled flag on app_modules — internal-pilot gate.
  const { data: mod } = await admin
    .from('app_modules').select('actions_enabled').eq('name', 'bn_mortality').maybeSingle();
  const actionsEnabled = mod?.actions_enabled === true;

  // Integration readiness — reflects BN-MORT-2B.1 boundary status.
  // Kept conservative until each vertical acceptance ships.
  const integrationReadiness: Record<string, boolean> = {
    awards: false,
    dms: false,
    overpayments: false,
    survivor: false,
    funeral: false,
    legal: false,
  };

  const rows = calculateActionAvailability({
    actionsEnabled,
    event: snapshot,
    grantedVerbs,
    currentUserId: userId,
    integrationReadiness,
  });

  return {
    eventId,
    currentUserId: userId,
    actionsEnabled,
    rows,
  };
}

