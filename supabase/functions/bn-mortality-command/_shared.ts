/**
 * Shared server-side helpers for the BN Mortality command edge function.
 * Isolated for direct unit-testing under Deno.test.
 */
// deno-lint-ignore-file no-explicit-any

export interface MortalityCommandSpec {
  capability: string;
  makerChecker: boolean;
  requiresJustification: boolean;
}

/**
 * Canonical command × capability × maker-checker × justification matrix.
 * MUST stay in lock-step with `src/types/bn/mortality/mortalityCommands.ts`
 * and MORTALITY_COMMAND_TRANSITION_MATRIX.md.
 */
export const COMMAND_MATRIX: Record<string, MortalityCommandSpec> = {
  BN_MORTALITY_DRAFT_SAVE:                   { capability: 'bn_mortality:write',          makerChecker: false, requiresJustification: false },
  BN_MORTALITY_REGISTER_REPORT:              { capability: 'bn_mortality:write',          makerChecker: false, requiresJustification: false },
  BN_MORTALITY_CANCEL:                       { capability: 'bn_mortality:write',          makerChecker: false, requiresJustification: true  },
  BN_MORTALITY_MATCH_PERSON:                 { capability: 'bn_mortality:match_person',   makerChecker: false, requiresJustification: false },
  BN_MORTALITY_MARK_DUPLICATE:               { capability: 'bn_mortality:write',          makerChecker: false, requiresJustification: true  },
  BN_MORTALITY_ASSIGN:                       { capability: 'bn_mortality:assign',         makerChecker: false, requiresJustification: false },
  BN_MORTALITY_ATTACH_EVIDENCE:              { capability: 'bn_mortality:write',          makerChecker: false, requiresJustification: false },
  BN_MORTALITY_SUBMIT_FOR_VERIFICATION:      { capability: 'bn_mortality:write',          makerChecker: false, requiresJustification: false },
  BN_MORTALITY_PLACE_PROVISIONAL_HOLD:       { capability: 'bn_mortality:decide',         makerChecker: false, requiresJustification: true  },
  BN_MORTALITY_RELEASE_HOLD:                 { capability: 'bn_mortality:release_hold',   makerChecker: false, requiresJustification: true  },
  BN_MORTALITY_RECORD_CONFLICT:              { capability: 'bn_mortality:write',          makerChecker: false, requiresJustification: true  },
  BN_MORTALITY_RESOLVE_CONFLICT:             { capability: 'bn_mortality:resolve_conflict', makerChecker: false, requiresJustification: true },
  BN_MORTALITY_CONFIRM_VERIFICATION:         { capability: 'bn_mortality:verify',         makerChecker: true,  requiresJustification: false },
  BN_MORTALITY_REJECT_REPORT:                { capability: 'bn_mortality:decide',         makerChecker: true,  requiresJustification: true  },
  BN_MORTALITY_PREPARE_IMPACT:               { capability: 'bn_mortality:prepare_impact', makerChecker: false, requiresJustification: false },
  BN_MORTALITY_SUBMIT_IMPACT:                { capability: 'bn_mortality:submit_impact',  makerChecker: false, requiresJustification: false },
  BN_MORTALITY_RETURN_IMPACT:                { capability: 'bn_mortality:return_impact',  makerChecker: false, requiresJustification: true  },
  BN_MORTALITY_APPROVE_IMPACT:               { capability: 'bn_mortality:approve_impact', makerChecker: true,  requiresJustification: false },
  BN_MORTALITY_TERMINATE_AWARD:              { capability: 'bn_mortality:decide',         makerChecker: true,  requiresJustification: true  },
  BN_MORTALITY_CREATE_PAD_OVERPAYMENT:       { capability: 'bn_mortality:decide',         makerChecker: true,  requiresJustification: true  },
  BN_MORTALITY_INITIATE_SURVIVOR_ASSESSMENT: { capability: 'bn_mortality:write',          makerChecker: false, requiresJustification: false },
  BN_MORTALITY_INITIATE_FUNERAL_GRANT:       { capability: 'bn_mortality:write',          makerChecker: false, requiresJustification: false },
  BN_MORTALITY_COMPLETE_FOLLOWON:            { capability: 'bn_mortality:complete_followon', makerChecker: false, requiresJustification: false },
  BN_MORTALITY_REFER_LEGAL:                  { capability: 'bn_mortality:decide',         makerChecker: true,  requiresJustification: true  },
  BN_MORTALITY_REVERSE_CONFIRMATION:         { capability: 'bn_mortality:reverse',        makerChecker: true,  requiresJustification: true  },
  BN_MORTALITY_CLOSE_EVENT:                  { capability: 'bn_mortality:decide',         makerChecker: false, requiresJustification: false },
};

/**
 * For each checker command, the maker role whose actor must NOT match the
 * checker. Explicit, per §12 — not "most recent history actor".
 */
export const CHECKER_MAKER_ROLES: Record<string, string> = {
  BN_MORTALITY_CONFIRM_VERIFICATION: 'submitter',
  BN_MORTALITY_REJECT_REPORT: 'submitter',
  BN_MORTALITY_APPROVE_IMPACT: 'impact_submitter',
  BN_MORTALITY_TERMINATE_AWARD: 'approver',
  BN_MORTALITY_CREATE_PAD_OVERPAYMENT: 'approver',
  BN_MORTALITY_REFER_LEGAL: 'approver',
  BN_MORTALITY_REVERSE_CONFIRMATION: 'confirmer',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const USER_CODE_RE = /^[A-Za-z0-9._-]{2,64}$/;
const REQUEST_MAX_AGE_MS = 5 * 60 * 1000;
const REQUEST_MAX_FUTURE_SKEW_MS = 60 * 1000;

const FORBIDDEN_USER_CODES = new Set(['SYSTEM', 'CURRENT_USER', 'ANONYMOUS', 'UNKNOWN']);

/** Return an array of error strings; empty → valid. */
export function validateEnvelope(env: any): string[] {
  const e: string[] = [];
  if (!env || typeof env !== 'object') { e.push('envelope must be an object'); return e; }
  if (typeof env.commandName !== 'string' || !env.commandName) e.push('commandName required');
  if (!Number.isInteger(env.commandVersion) || env.commandVersion < 1) e.push('commandVersion must be positive integer');
  if (typeof env.idempotencyKey !== 'string' || !UUID_RE.test(env.idempotencyKey)) e.push('idempotencyKey must be UUID');
  if (typeof env.correlationId !== 'string' || !UUID_RE.test(env.correlationId)) e.push('correlationId must be UUID');
  if (env.moduleCode !== 'bn_mortality') e.push('moduleCode must be bn_mortality');
  if (typeof env.actorUserCode !== 'string' || !USER_CODE_RE.test(env.actorUserCode) || FORBIDDEN_USER_CODES.has(env.actorUserCode.toUpperCase())) {
    e.push('actorUserCode must be a real user code, not SYSTEM/UNKNOWN');
  }
  if (typeof env.requestedAtUtc !== 'string' || !ISO_RE.test(env.requestedAtUtc)) {
    e.push('requestedAtUtc must be ISO-8601 UTC');
  } else {
    const t = Date.parse(env.requestedAtUtc);
    if (Number.isNaN(t)) e.push('requestedAtUtc is not a valid instant');
    else {
      const now = Date.now();
      if (now - t > REQUEST_MAX_AGE_MS) e.push('requestedAtUtc is too old (>5m)');
      if (t - now > REQUEST_MAX_FUTURE_SKEW_MS) e.push('requestedAtUtc is in the future (>1m skew)');
    }
  }
  if (env.entityId !== null && env.entityId !== undefined && (typeof env.entityId !== 'string' || !UUID_RE.test(env.entityId))) {
    e.push('entityId must be UUID or null');
  }
  if (env.expectedRowVersion !== undefined && env.expectedRowVersion !== null) {
    const n = Number(env.expectedRowVersion);
    if (!Number.isFinite(n) || n < 0) e.push('expectedRowVersion must be non-negative');
  }
  if (env.payload !== undefined && env.payload !== null && (typeof env.payload !== 'object' || Array.isArray(env.payload))) {
    e.push('payload must be an object');
  }
  return e;
}

/** Whether a capability represents a mutation (as opposed to view/read). */
export function isMutationCapability(cap: string): boolean {
  const action = extractActionName(cap);
  return action !== 'view' && action !== 'read';
}

export function extractActionName(cap: string): string {
  const idx = cap.indexOf(':');
  return idx < 0 ? cap : cap.slice(idx + 1);
}

const ALLOWED_MATCH_CONFIDENCE = new Set(['LOW', 'MEDIUM', 'HIGH', 'MANUAL']);
const ALLOWED_SOURCE = new Set(['MANUAL', 'REGISTRAR', 'FAMILY', 'HOSPITAL', 'THIRD_PARTY']);

/** Per-command payload contract validation. Errors are safe to surface. */
export function validateCommandPayload(commandName: string, payload: any, entityId: string | null | undefined): string[] {
  const errs: string[] = [];
  const p = payload ?? {};
  const has = (k: string) => p[k] !== undefined && p[k] !== null && p[k] !== '';
  const isUuid = (v: any) => typeof v === 'string' && UUID_RE.test(v);
  const isDate = (v: any) => typeof v === 'string' && DATE_RE.test(v);
  const isPosInt = (v: any) => Number.isInteger(v) && v > 0;

  switch (commandName) {
    case 'BN_MORTALITY_DRAFT_SAVE':
      // Anything is fine — draft may be empty. If deceased_full_name present, cap length.
      if (has('deceased_full_name') && String(p.deceased_full_name).length > 200) errs.push('deceased_full_name too long');
      break;
    case 'BN_MORTALITY_REGISTER_REPORT':
      if (!has('deceased_full_name')) errs.push('deceased_full_name required');
      if (has('source') && !ALLOWED_SOURCE.has(String(p.source))) errs.push('source not allowed');
      if (has('death_date') && !isDate(p.death_date)) errs.push('death_date must be YYYY-MM-DD');
      break;
    case 'BN_MORTALITY_MATCH_PERSON':
      if (!has('ip_id') || !isUuid(p.ip_id)) errs.push('ip_id must be UUID');
      if (has('confidence') && !ALLOWED_MATCH_CONFIDENCE.has(String(p.confidence))) errs.push('confidence not allowed');
      if (has('score')) {
        const n = Number(p.score);
        if (!Number.isFinite(n) || n < 0 || n > 1) errs.push('score must be between 0 and 1');
      }
      break;
    case 'BN_MORTALITY_ASSIGN':
      if (!has('assignee_user_id') || !isUuid(p.assignee_user_id)) errs.push('assignee_user_id must be UUID');
      break;
    case 'BN_MORTALITY_MARK_DUPLICATE':
      if (!has('duplicate_of_event_id') || !isUuid(p.duplicate_of_event_id)) errs.push('duplicate_of_event_id must be UUID');
      break;
    case 'BN_MORTALITY_ATTACH_EVIDENCE':
      if (!has('evidence_ref')) errs.push('evidence_ref required');
      if (has('evidence_ref') && String(p.evidence_ref).length > 500) errs.push('evidence_ref too long');
      break;
    case 'BN_MORTALITY_CREATE_PAD_OVERPAYMENT':
      if (has('amount_minor') && !isPosInt(Number(p.amount_minor))) errs.push('amount_minor must be positive integer');
      break;
    case 'BN_MORTALITY_INITIATE_SURVIVOR_ASSESSMENT':
    case 'BN_MORTALITY_INITIATE_FUNERAL_GRANT':
    case 'BN_MORTALITY_REFER_LEGAL':
      // target_module optional (server chooses default) but if provided must be short.
      if (has('target_module') && String(p.target_module).length > 64) errs.push('target_module too long');
      if (has('target_ref_id') && !isUuid(p.target_ref_id)) errs.push('target_ref_id must be UUID');
      break;
    case 'BN_MORTALITY_REJECT_REPORT':
      if (!has('reason')) errs.push('reason required');
      break;
    default:
      // Other commands have no payload contract beyond entity requirement.
      break;
  }

  // Commands that require an existing entity:
  const noEntityAllowed = new Set(['BN_MORTALITY_DRAFT_SAVE', 'BN_MORTALITY_REGISTER_REPORT']);
  if (!noEntityAllowed.has(commandName) && !entityId) {
    errs.push('entityId required for this command');
  }
  return errs;
}

/** SHA-256 hex digest of the payload, canonicalised via JSON.stringify. */
export async function payloadHash(payload: unknown): Promise<string> {
  const s = JSON.stringify(payload ?? {});
  const buf = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
