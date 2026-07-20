/**
 * BN Benefits — Runtime envelope validator.
 *
 * The adapter cannot accept any object simply because it happens to have
 * a `status` property. This guard walks the full canonical shape and
 * rejects anything that would let a malformed edge response render as a
 * successful empty dataset.
 */
import type { BnBenefitsQueryResult, BnBenefitsQueryError } from '@/types/bn/queries';

const ALLOWED_STATUSES = new Set(['OK', 'DENIED', 'INVALID', 'NOT_FOUND', 'FAILED']);

function isString(x: unknown): x is string {
  return typeof x === 'string';
}
function isFiniteNumber(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}
function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((v) => typeof v === 'string');
}
function isErrorEntry(x: unknown): x is BnBenefitsQueryError {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (!isString(o.code) || !isString(o.message)) return false;
  if (o.field !== undefined && !isString(o.field)) return false;
  return true;
}

export interface EnvelopeValidationResult {
  ok: boolean;
  reason?: string;
}

export function validateBenefitsQueryEnvelope(value: unknown): EnvelopeValidationResult {
  if (!value || typeof value !== 'object') return { ok: false, reason: 'not-an-object' };
  const o = value as Record<string, unknown>;

  if (!isString(o.status) || !ALLOWED_STATUSES.has(o.status)) return { ok: false, reason: 'bad-status' };
  if (!isString(o.correlationId)) return { ok: false, reason: 'bad-correlationId' };
  if (!isString(o.queryCode)) return { ok: false, reason: 'bad-queryCode' };
  if (!isFiniteNumber(o.queryVersion)) return { ok: false, reason: 'bad-queryVersion' };
  if (!('data' in o)) return { ok: false, reason: 'missing-data' };
  if (!Array.isArray(o.errors) || !o.errors.every(isErrorEntry)) return { ok: false, reason: 'bad-errors' };
  if (!isStringArray(o.maskedFields)) return { ok: false, reason: 'bad-maskedFields' };
  if (!isStringArray(o.warnings)) return { ok: false, reason: 'bad-warnings' };

  if (o.page !== undefined && o.page !== null) {
    if (typeof o.page !== 'object') return { ok: false, reason: 'bad-page' };
    const p = o.page as Record<string, unknown>;
    if (!isFiniteNumber(p.pageSize)) return { ok: false, reason: 'bad-page.pageSize' };
    if (p.nextPageToken !== null && !isString(p.nextPageToken)) return { ok: false, reason: 'bad-page.nextPageToken' };
    if (p.totalCount !== null && !isFiniteNumber(p.totalCount)) return { ok: false, reason: 'bad-page.totalCount' };
  }

  return { ok: true };
}

export function assertCanonicalEnvelope<T>(value: unknown): BnBenefitsQueryResult<T> {
  const check = validateBenefitsQueryEnvelope(value);
  if (!check.ok) {
    throw new Error(`Malformed benefits query envelope: ${check.reason}`);
  }
  return value as BnBenefitsQueryResult<T>;
}
