/**
 * BN Benefits Query — Pure, testable helpers.
 *
 * BN-MORT-UI-1C: the edge function extracts every non-IO decision into
 * this module so `envelope_test.ts` can exercise the SAME code that
 * runs in production. No `Deno.serve`, no `createClient`, no top-level
 * environment access — this file is safe to import from tests.
 */
// deno-lint-ignore-file no-explicit-any

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
    public status: 'INVALID' | 'NOT_FOUND' | 'FAILED',
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
 * Returns `null` on success, or an `INVALID_ENVELOPE` reason string.
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
  capability: string;           // e.g. "bn_mortality:decide"
  requiresMakerChecker: boolean;
  implemented: boolean;
  blocker?: string;
  validFrom: readonly string[]; // event statuses this command is valid from
  makerSource?: 'createdBy' | 'submittedForVerificationBy' | 'preparedBy' | 'submittedImpactBy' | 'confirmedBy' | 'approvedImpactBy';
  integrationRequired?: string; // integration key that must be ready
  dataRequires?: readonly ('matchedIp' | 'verified' | 'impactPrepared' | 'impactApproved' | 'terminated' | 'referral')[];
}

export interface EventSnapshot {
  eventId: string;
  status: string | null;
  rowVersion: number | null;
  createdBy: string | null;
  submittedForVerificationBy: string | null;
  preparedBy: string | null;
  submittedImpactBy: string | null;
  confirmedBy: string | null;
  approvedImpactBy: string | null;
  reversalInitiatedBy: string | null;
  matchedIpId: string | null;
  verifiedAt: string | null;
  impactPreparedAt: string | null;
  impactApprovedAt: string | null;
  terminatedAt: string | null;
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
  integrationReady: boolean;
  dataReady: boolean;
}

function humanCommand(name: string): string {
  return name.replace(/^BN_MORTALITY_/, '').split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

/**
 * Canonical spec for all 26 mortality commands. Mirrors mortalityCommands.ts
 * but is duplicated here because the Deno edge function cannot import from
 * the browser tree. Kept small and structural — only availability inputs.
 */
export const MORTALITY_COMMAND_SPECS: readonly CommandSpec[] = [
  { command: 'BN_MORTALITY_DRAFT_SAVE',                   capability: 'bn_mortality:write',           requiresMakerChecker: false, implemented: true,  validFrom: ['DRAFT'], makerSource: 'createdBy' },
  { command: 'BN_MORTALITY_REGISTER_REPORT',              capability: 'bn_mortality:write',           requiresMakerChecker: false, implemented: true,  validFrom: ['DRAFT','REPORTED'], makerSource: 'createdBy' },
  { command: 'BN_MORTALITY_CANCEL',                       capability: 'bn_mortality:write',           requiresMakerChecker: false, implemented: true,  validFrom: ['DRAFT','REPORTED'] },
  { command: 'BN_MORTALITY_MATCH_PERSON',                 capability: 'bn_mortality:write',           requiresMakerChecker: false, implemented: true,  validFrom: ['DRAFT','REPORTED','VERIFICATION_PENDING','CONFLICT'] },
  { command: 'BN_MORTALITY_MARK_DUPLICATE',               capability: 'bn_mortality:write',           requiresMakerChecker: false, implemented: true,  validFrom: ['DRAFT','REPORTED','VERIFICATION_PENDING','CONFLICT'] },
  { command: 'BN_MORTALITY_ASSIGN',                       capability: 'bn_mortality:write',           requiresMakerChecker: false, implemented: true,  validFrom: ['DRAFT','REPORTED','VERIFICATION_PENDING','CONFLICT','PROVISIONALLY_HELD','IMPACT_REVIEW','APPROVAL_PENDING','VERIFIED','CONFIRMED','FOLLOW_ON_PROCESSING'] },
  { command: 'BN_MORTALITY_ATTACH_EVIDENCE',              capability: 'bn_mortality:write',           requiresMakerChecker: false, implemented: false, blocker: 'BN-MORT-2B.1 §7 — DMS/core_generated_document link boundary not yet wired.', validFrom: ['DRAFT','REPORTED','VERIFICATION_PENDING','CONFLICT','PROVISIONALLY_HELD','IMPACT_REVIEW','APPROVAL_PENDING','VERIFIED','CONFIRMED','FOLLOW_ON_PROCESSING'], integrationRequired: 'dms' },
  { command: 'BN_MORTALITY_SUBMIT_FOR_VERIFICATION',      capability: 'bn_mortality:write',           requiresMakerChecker: false, implemented: true,  validFrom: ['DRAFT','REPORTED'], dataRequires: ['matchedIp'] },
  { command: 'BN_MORTALITY_PLACE_PROVISIONAL_HOLD',       capability: 'bn_mortality:decide',          requiresMakerChecker: false, implemented: false, blocker: 'BN-MORT-2B.2A acceptance pending.', validFrom: ['REPORTED','VERIFICATION_PENDING','CONFLICT','IMPACT_REVIEW','APPROVAL_PENDING'], integrationRequired: 'awards' },
  { command: 'BN_MORTALITY_RELEASE_HOLD',                 capability: 'bn_mortality:decide',          requiresMakerChecker: false, implemented: false, blocker: 'BN-MORT-2B.2A acceptance pending.', validFrom: ['PROVISIONALLY_HELD'], integrationRequired: 'awards' },
  { command: 'BN_MORTALITY_RECORD_CONFLICT',              capability: 'bn_mortality:write',           requiresMakerChecker: false, implemented: true,  validFrom: ['VERIFICATION_PENDING','PROVISIONALLY_HELD'] },
  { command: 'BN_MORTALITY_RESOLVE_CONFLICT',             capability: 'bn_mortality:decide',          requiresMakerChecker: false, implemented: true,  validFrom: ['CONFLICT'] },
  { command: 'BN_MORTALITY_CONFIRM_VERIFICATION',         capability: 'bn_mortality:verify',          requiresMakerChecker: true,  implemented: true,  validFrom: ['VERIFICATION_PENDING','PROVISIONALLY_HELD'], makerSource: 'submittedForVerificationBy' },
  { command: 'BN_MORTALITY_REJECT_REPORT',                capability: 'bn_mortality:decide',          requiresMakerChecker: true,  implemented: true,  validFrom: ['VERIFICATION_PENDING','CONFLICT','PROVISIONALLY_HELD'], makerSource: 'submittedForVerificationBy' },
  { command: 'BN_MORTALITY_PREPARE_IMPACT',               capability: 'bn_mortality:write',           requiresMakerChecker: false, implemented: false, blocker: 'BN-MORT-2B.2A acceptance pending.', validFrom: ['VERIFIED','IMPACT_REVIEW'], dataRequires: ['matchedIp','verified'] },
  { command: 'BN_MORTALITY_SUBMIT_IMPACT',                capability: 'bn_mortality:write',           requiresMakerChecker: false, implemented: true,  validFrom: ['IMPACT_REVIEW'], dataRequires: ['impactPrepared'] },
  { command: 'BN_MORTALITY_RETURN_IMPACT',                capability: 'bn_mortality:decide',          requiresMakerChecker: false, implemented: true,  validFrom: ['APPROVAL_PENDING'] },
  { command: 'BN_MORTALITY_APPROVE_IMPACT',               capability: 'bn_mortality:approve_impact',  requiresMakerChecker: true,  implemented: true,  validFrom: ['APPROVAL_PENDING'], makerSource: 'submittedImpactBy' },
  { command: 'BN_MORTALITY_TERMINATE_AWARD',              capability: 'bn_mortality:decide',          requiresMakerChecker: true,  implemented: false, blocker: 'BN-MORT-2B.2A acceptance pending.', validFrom: ['CONFIRMED','FOLLOW_ON_PROCESSING'], makerSource: 'approvedImpactBy', integrationRequired: 'awards', dataRequires: ['impactApproved'] },
  { command: 'BN_MORTALITY_CREATE_PAD_OVERPAYMENT',       capability: 'bn_mortality:decide',          requiresMakerChecker: true,  implemented: false, blocker: 'BN-MORT-2B.1 §6 — Overpayment boundary not wired.', validFrom: ['CONFIRMED','FOLLOW_ON_PROCESSING'], integrationRequired: 'overpayments', dataRequires: ['terminated'] },
  { command: 'BN_MORTALITY_INITIATE_SURVIVOR_ASSESSMENT', capability: 'bn_mortality:write',           requiresMakerChecker: false, implemented: false, blocker: 'BN-MORT-2B.1 §8 — Survivor referral not wired.', validFrom: ['CONFIRMED','FOLLOW_ON_PROCESSING'], integrationRequired: 'survivor' },
  { command: 'BN_MORTALITY_INITIATE_FUNERAL_GRANT',       capability: 'bn_mortality:write',           requiresMakerChecker: false, implemented: false, blocker: 'BN-MORT-2B.1 §8 — Funeral grant referral not wired.', validFrom: ['CONFIRMED','FOLLOW_ON_PROCESSING'], integrationRequired: 'funeral' },
  { command: 'BN_MORTALITY_COMPLETE_FOLLOWON',            capability: 'bn_mortality:decide',          requiresMakerChecker: false, implemented: false, blocker: 'BN-MORT-2B.1 §9 — Follow-on completion gate not enforced.', validFrom: ['FOLLOW_ON_PROCESSING'], dataRequires: ['referral'] },
  { command: 'BN_MORTALITY_REFER_LEGAL',                  capability: 'bn_mortality:decide',          requiresMakerChecker: true,  implemented: false, blocker: 'BN-MORT-2B.1 §8 — Legal referral not wired.', validFrom: ['CONFIRMED','FOLLOW_ON_PROCESSING'], integrationRequired: 'legal' },
  { command: 'BN_MORTALITY_REVERSE_CONFIRMATION',         capability: 'bn_mortality:reverse',         requiresMakerChecker: true,  implemented: true,  validFrom: ['VERIFIED','CONFIRMED','FOLLOW_ON_PROCESSING','COMPLETED'], makerSource: 'confirmedBy' },
  { command: 'BN_MORTALITY_CLOSE_EVENT',                  capability: 'bn_mortality:decide',          requiresMakerChecker: false, implemented: false, blocker: 'BN-MORT-2B.1 §9 — Closure gate not enforced.', validFrom: ['COMPLETED','REJECTED','REVERSED'] },
];

const CAP_VERB = (cap: string) => cap.split(':')[1];

export interface AvailabilityInputs {
  actionsEnabled: boolean;
  event: EventSnapshot | null;
  grantedVerbs: Set<string>;
  currentUserId: string | null;
  /** Which downstream integrations are ready (awards, dms, overpayments, survivor, funeral, legal). */
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

    // Maker-checker.
    let makerUserId: string | null = null;
    if (spec.requiresMakerChecker && event && currentUserId) {
      const source = spec.makerSource ?? 'createdBy';
      makerUserId = (event as any)[source] ?? event.createdBy ?? null;
      if (makerUserId && makerUserId === currentUserId) {
        reasons.push('Maker-checker: requires a different approver.');
      }
    }

    // Data-readiness.
    let dataReady = true;
    if (event && spec.dataRequires) {
      for (const req of spec.dataRequires) {
        if (req === 'matchedIp' && !event.matchedIpId) { dataReady = false; reasons.push('Requires a matched canonical person.'); }
        if (req === 'verified' && !event.verifiedAt) { dataReady = false; reasons.push('Requires a verified identity.'); }
        if (req === 'impactPrepared' && !event.impactPreparedAt) { dataReady = false; reasons.push('Requires prepared impact.'); }
        if (req === 'impactApproved' && !event.impactApprovedAt) { dataReady = false; reasons.push('Requires approved impact.'); }
        if (req === 'terminated' && !event.terminatedAt) { dataReady = false; reasons.push('Requires terminated award.'); }
        if (req === 'referral' && !event.hasReferrals) { dataReady = false; reasons.push('Requires an active referral.'); }
      }
    }

    // Integration readiness.
    let integrationReady = true;
    if (spec.integrationRequired) {
      integrationReady = integrationReadiness[spec.integrationRequired] === true;
      if (!integrationReady) reasons.push(`Downstream integration "${spec.integrationRequired}" is not ready.`);
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
      makerRole: null, // resolved server-side from user_roles when needed.
      integrationReady,
      dataReady,
    };
  });
}
