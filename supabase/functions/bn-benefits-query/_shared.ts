/**
 * BN Benefits Query — Pure, testable helpers.
 *
 * BN-MORT-UI-1C: the edge function extracts every non-IO decision into
 * this module so `envelope_test.ts` can exercise the SAME code that
 * runs in production. No `Deno.serve`, no `createClient`, no top-level
 * environment access — this file is safe to import from tests.
 *
 * BN-MORT-UI-1D §D: command spec is no longer hand-maintained here — it
 * is regenerated from the canonical browser catalogue into
 * `_generated_command_catalog.ts`. Parity is enforced by
 * `mortalityCommandCatalogParity.test.ts`.
 */
// deno-lint-ignore-file no-explicit-any

import { MORTALITY_COMMAND_CATALOG_GENERATED } from './_generated_command_catalog.ts';

export const ALLOWED_STATUSES = new Set([
  'OK', 'DENIED', 'INVALID', 'NOT_FOUND', 'FAILED',
]);

export type EnvelopeStatus = 'OK' | 'DENIED' | 'INVALID' | 'NOT_FOUND' | 'FAILED';

export interface EnvelopeError { code: string; message: string; field?: string }
export interface Envelope {
  status: EnvelopeStatus;
  correlationId: string;
  queryCode: string;
  queryVersion: number;
  data: unknown;
  page?: { pageSize: number; nextPageToken: string | null; totalCount: number | null };
  errors: EnvelopeError[];
  maskedFields: string[];
  warnings: string[];
}

export class QueryError extends Error {
  constructor(
    public status: 'INVALID' | 'NOT_FOUND' | 'FAILED' | 'DENIED',
    public code: string,
    message: string,
    public field?: string,
  ) { super(message); }
}

export function buildEnvelope(
  status: EnvelopeStatus,
  correlationId: string,
  queryCode: string,
  queryVersion: number,
  overrides: Partial<Omit<Envelope, 'status' | 'correlationId' | 'queryCode' | 'queryVersion'>> = {},
): Envelope {
  return {
    status, correlationId, queryCode, queryVersion,
    data: overrides.data ?? null,
    page: overrides.page,
    errors: overrides.errors ?? [],
    maskedFields: overrides.maskedFields ?? [],
    warnings: overrides.warnings ?? [],
  };
}

/**
 * Validates the ENVELOPE-shaped request the browser adapter sends us.
 * (Distinct from the response envelope validator on the client.)
 */
export function validateEnvelopeInput(body: unknown): { queryCode: string; queryVersion: number; correlationId: string; params: any; rawLimit: number; rawOffset: number } | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'body must be an object' };
  const b = body as Record<string, unknown>;
  const queryCode = typeof b.queryCode === 'string' ? b.queryCode : 'unknown';
  const queryVersion = Number(b.queryVersion ?? 1);
  const correlationId = typeof b.correlationId === 'string' ? b.correlationId : '';
  if (!correlationId) return { error: 'correlationId is required' };
  const params = (b.params && typeof b.params === 'object') ? b.params : {};
  const page = (b.page && typeof b.page === 'object') ? b.page as Record<string, unknown> : {};
  const rawLimit = Number(page.pageSize ?? (b as any).pageSize ?? 25);
  const rawOffset = Number(page.pageToken ?? (b as any).pageToken ?? 0);
  return { queryCode, queryVersion, correlationId, params, rawLimit, rawOffset };
}

export interface Access {
  moduleFound: boolean;
  moduleEnabled: boolean;
  routesEnabled: boolean;
  grantedVerbs: Set<string>;
}

export type ModuleDecision =
  | { status: 'OK' }
  | { status: 'DENIED'; code: 'MODULE_NOT_REGISTERED' | 'MODULE_DISABLED' | 'ROUTES_DISABLED' | 'FORBIDDEN'; message: string };

export function resolveRequiredVerbs(anyOfCapabilities: readonly string[], moduleCode: string): string[] {
  return anyOfCapabilities
    .filter((c) => c.startsWith(`${moduleCode}:`))
    .map((c) => c.split(':')[1]);
}

export function decideModuleAccess(
  access: Access,
  anyOfCapabilities: readonly string[],
  moduleCode: string,
): ModuleDecision {
  if (!access.moduleFound) return { status: 'DENIED', code: 'MODULE_NOT_REGISTERED', message: `Module ${moduleCode} is not registered.` };
  if (!access.moduleEnabled) return { status: 'DENIED', code: 'MODULE_DISABLED', message: `Module ${moduleCode} is disabled.` };
  if (!access.routesEnabled) return { status: 'DENIED', code: 'ROUTES_DISABLED', message: `Routes for ${moduleCode} are disabled.` };
  const verbs = resolveRequiredVerbs(anyOfCapabilities, moduleCode);
  const hasAny = verbs.some((v) => access.grantedVerbs.has(v));
  if (!hasAny) {
    return { status: 'DENIED', code: 'FORBIDDEN', message: `Missing capability. One of: ${anyOfCapabilities.join(', ')}` };
  }
  return { status: 'OK' };
}

export function validatePaging(rawLimit: number, rawOffset: number, maxPageSize: number): { limit: number; offset: number } {
  const limit = Math.min(Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 25), maxPageSize);
  const offset = Math.max(0, Number.isFinite(rawOffset) ? rawOffset : 0);
  return { limit, offset };
}

export function calculateNextPageToken(offset: number, limit: number, totalCount: number | null | undefined): string | null {
  if (typeof totalCount !== 'number') return null;
  const next = offset + limit;
  return next < totalCount ? String(next) : null;
}

export function mapQueryError(err: unknown, correlationId: string, queryCode: string, queryVersion: number): Envelope {
  if (err instanceof QueryError) {
    return buildEnvelope(err.status, correlationId, queryCode, queryVersion, {
      errors: [{ code: err.code, message: err.message, field: err.field }],
    });
  }
  const message = (err as any)?.message ?? String(err);
  return buildEnvelope('FAILED', correlationId, queryCode, queryVersion, {
    errors: [{ code: 'INTERNAL_ERROR', message: String(message) }],
  });
}

// ---------------------------------------------------------------------------
// Action availability — pure calculator over event snapshot + granted verbs.
// ---------------------------------------------------------------------------

export interface CommandSpec {
  command: string;
  capability: string;
  requiresMakerChecker: boolean;
  implemented: boolean;
  blocker?: string;
  validFrom: readonly string[];
  /** Canonical maker-source: name of the command whose actor becomes the maker. */
  makerSource?: string;
  integrationRequired?: string;
  dataRequires?: readonly ('matchedIp' | 'verified' | 'impactPrepared' | 'impactApproved' | 'terminated' | 'referral')[];
}

/** Aggregate readiness across ALL award-impact rows for the event. */
export interface AwardImpactAggregate {
  /** true if at least one row has been prepared (created_at set). */
  anyPrepared: boolean;
  /** true only if EVERY row has been approved. */
  allApproved: boolean;
  /** true only if EVERY row has termination_effective_date set. */
  allTerminated: boolean;
  /** earliest prepared_at across rows (ISO), null if none. */
  firstPreparedAt: string | null;
  /** latest approved_at across rows (ISO), null if any unapproved. */
  lastApprovedAt: string | null;
  /** latest termination_effective_date across rows, null if any unterminated. */
  lastTerminationAt: string | null;
}

export interface EventSnapshot {
  eventId: string;
  status: string | null;
  rowVersion: number | null;
  createdBy: string | null;
  /** Maker records keyed by SOURCE command name, derived from immutable history. */
  makers: Record<string, { userId: string; occurredAt: string }>;
  matchedIpId: string | null;
  verifiedAt: string | null;
  /** Aggregate over ALL award impacts, not just the first row. */
  awardImpact: AwardImpactAggregate;
  hasReferrals: boolean;
}

export interface AvailabilityDto {
  command: string;
  displayName: string;
  available: boolean;
  implemented: boolean;
  requiredCapability: string;
  validFromStatuses: string[];
  reasons: string[];
  requiresMakerChecker: boolean;
  makerUserId: string | null;
  makerRole: string | null;
  /** Which maker step the identity came from ("submit-for-verification", "submit-impact", etc.). */
  makerStep: string | null;
  /** Canonical command name that produced the maker (e.g. "BN_MORTALITY_SUBMIT_IMPACT"). */
  makerSourceCommand: string | null;
  /** ISO timestamp of the maker's action, from history. */
  makerOccurredAt: string | null;
  integrationReady: boolean;
  dataReady: boolean;
}

function humanCommand(name: string): string {
  return name.replace(/^BN_MORTALITY_/, '').split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

/** BN-MORT-UI-1D §D: specs derive from the generated canonical mirror. */
export const MORTALITY_COMMAND_SPECS: readonly CommandSpec[] =
  MORTALITY_COMMAND_CATALOG_GENERATED.map((c) => ({
    command: c.command,
    capability: c.capability,
    requiresMakerChecker: c.requiresMakerChecker,
    implemented: c.implemented,
    blocker: (c as any).blocker,
    validFrom: c.validFrom,
    makerSource: (c as any).makerSource,
    integrationRequired: (c as any).integrationRequired,
    dataRequires: (c as any).dataRequires,
  }));

/** Map canonical maker-source command → short step label surfaced in the DTO. */
const MAKER_STEP_LABEL: Record<string, string> = {
  BN_MORTALITY_REGISTER_REPORT: 'registered-report',
  BN_MORTALITY_SUBMIT_FOR_VERIFICATION: 'submit-for-verification',
  BN_MORTALITY_PREPARE_IMPACT: 'prepare-impact',
  BN_MORTALITY_SUBMIT_IMPACT: 'submit-impact',
  BN_MORTALITY_CONFIRM_VERIFICATION: 'confirm-verification',
  BN_MORTALITY_APPROVE_IMPACT: 'approve-impact',
};

const CAP_VERB = (cap: string) => cap.split(':')[1];

export interface AvailabilityInputs {
  actionsEnabled: boolean;
  event: EventSnapshot | null;
  grantedVerbs: Set<string>;
  currentUserId: string | null;
  integrationReadiness: Record<string, boolean>;
}

export function calculateActionAvailability(inp: AvailabilityInputs): AvailabilityDto[] {
  const { actionsEnabled, event, grantedVerbs, currentUserId, integrationReadiness } = inp;
  return MORTALITY_COMMAND_SPECS.map((spec) => {
    const reasons: string[] = [];

    if (!actionsEnabled) reasons.push('Internal-pilot: mortality actions are disabled.');
    if (!spec.implemented) reasons.push(spec.blocker ?? 'Command integration incomplete.');

    const verb = CAP_VERB(spec.capability);
    if (!grantedVerbs.has(verb) && !grantedVerbs.has('admin')) {
      reasons.push(`Missing permission (${spec.capability}).`);
    }

    if (event) {
      if (spec.validFrom.length > 0 && event.status && !spec.validFrom.includes(event.status)) {
        reasons.push(`Not valid from status "${event.status}"; needs ${spec.validFrom.join(', ')}.`);
      }
    } else if (spec.validFrom.length > 0 && !['BN_MORTALITY_DRAFT_SAVE','BN_MORTALITY_REGISTER_REPORT'].includes(spec.command)) {
      reasons.push('Event has not been loaded.');
    }

    // Maker-checker — authoritative maker details from event history.
    let makerUserId: string | null = null;
    let makerStep: string | null = null;
    let makerSourceCommand: string | null = null;
    let makerOccurredAt: string | null = null;
    if (spec.requiresMakerChecker && event) {
      const sourceCmd = spec.makerSource ?? 'BN_MORTALITY_REGISTER_REPORT';
      const maker = event.makers[sourceCmd];
      if (maker) {
        makerUserId = maker.userId;
        makerOccurredAt = maker.occurredAt;
        makerSourceCommand = sourceCmd;
        makerStep = MAKER_STEP_LABEL[sourceCmd] ?? null;
      } else {
        // Fallback to createdBy — legacy events pre-history-instrumentation.
        makerUserId = event.createdBy;
        makerSourceCommand = 'BN_MORTALITY_REGISTER_REPORT';
        makerStep = MAKER_STEP_LABEL.BN_MORTALITY_REGISTER_REPORT ?? null;
      }
      if (makerUserId && currentUserId && makerUserId === currentUserId) {
        reasons.push('Maker-checker: requires a different approver.');
      }
      if (!makerUserId) {
        reasons.push('Maker-checker: prior maker action not yet recorded.');
      }
    }

    // Data-readiness — aggregate award impact fields drive prepared/approved/terminated.
    let dataReady = true;
    if (event && spec.dataRequires) {
      for (const req of spec.dataRequires) {
        if (req === 'matchedIp' && !event.matchedIpId) { dataReady = false; reasons.push('Requires a matched canonical person.'); }
        if (req === 'verified' && !event.verifiedAt) { dataReady = false; reasons.push('Requires a verified identity.'); }
        if (req === 'impactPrepared' && !event.awardImpact.anyPrepared) { dataReady = false; reasons.push('Requires prepared impact on all affected awards.'); }
        if (req === 'impactApproved' && !event.awardImpact.allApproved) { dataReady = false; reasons.push('Requires ALL award impacts to be approved.'); }
        if (req === 'terminated' && !event.awardImpact.allTerminated) { dataReady = false; reasons.push('Requires ALL affected awards to be terminated.'); }
        if (req === 'referral' && !event.hasReferrals) { dataReady = false; reasons.push('Requires an active referral.'); }
      }
    }

    // Integration readiness — DB-driven; absent key => not ready.
    let integrationReady = true;
    if (spec.integrationRequired) {
      integrationReady = integrationReadiness[spec.integrationRequired] === true;
      if (!integrationReady) reasons.push(`Downstream integration "${spec.integrationRequired}" is not certified.`);
    }

    return {
      command: spec.command,
      displayName: humanCommand(spec.command),
      available: reasons.length === 0,
      implemented: spec.implemented,
      requiredCapability: spec.capability,
      validFromStatuses: [...spec.validFrom],
      reasons,
      requiresMakerChecker: spec.requiresMakerChecker,
      makerUserId,
      makerRole: null,
      makerStep,
      makerSourceCommand,
      makerOccurredAt,
      integrationReady,
      dataReady,
    };
  });
}

/**
 * Aggregate award-impact rows into the fields the calculator consumes.
 * Exported so the edge function AND handler tests can share the same logic.
 */
export function aggregateAwardImpacts(
  rows: ReadonlyArray<{ created_at?: string | null; approved_at?: string | null; termination_effective_date?: string | null }>,
): AwardImpactAggregate {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      anyPrepared: false,
      allApproved: false,
      allTerminated: false,
      firstPreparedAt: null,
      lastApprovedAt: null,
      lastTerminationAt: null,
    };
  }
  let anyPrepared = false;
  let allApproved = true;
  let allTerminated = true;
  let firstPreparedAt: string | null = null;
  let lastApprovedAt: string | null = null;
  let lastTerminationAt: string | null = null;
  for (const r of rows) {
    if (r.created_at) {
      anyPrepared = true;
      if (!firstPreparedAt || r.created_at < firstPreparedAt) firstPreparedAt = r.created_at;
    }
    if (r.approved_at) {
      if (!lastApprovedAt || r.approved_at > lastApprovedAt) lastApprovedAt = r.approved_at;
    } else {
      allApproved = false;
    }
    if (r.termination_effective_date) {
      if (!lastTerminationAt || r.termination_effective_date > lastTerminationAt) lastTerminationAt = r.termination_effective_date;
    } else {
      allTerminated = false;
    }
  }
  return {
    anyPrepared,
    allApproved: anyPrepared ? allApproved : false,
    allTerminated: anyPrepared ? allTerminated : false,
    firstPreparedAt,
    lastApprovedAt: allApproved ? lastApprovedAt : null,
    lastTerminationAt: allTerminated ? lastTerminationAt : null,
  };
}
