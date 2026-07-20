/**
 * BN Benefits — Secure Query Envelope.
 *
 * Every read that crosses the security boundary between the browser and
 * the mortality (and future benefits-gap) domain tables MUST be expressed
 * as a {@link BnBenefitsQueryEnvelope}. Raw table/column names are never
 * accepted from clients — the server resolves an allow-listed
 * {@link BnBenefitsQueryCode} to a hand-written SQL/adapter.
 *
 * The `actorUserId`, `actorRoles`, and `capabilities` fields are HINTS
 * for telemetry only. The edge function re-derives the caller from the
 * bearer JWT and walks `role_permissions` server-side; client-supplied
 * hints are never trusted for authorisation.
 */
import type { BnBenefitsQueryCode } from './queryCodes';

export interface BnBenefitsQueryEnvelope<TParams = Record<string, unknown>> {
  readonly queryCode: BnBenefitsQueryCode;
  readonly queryVersion: number;
  readonly correlationId: string;
  readonly moduleCode: string;
  readonly params: TParams;
  readonly page?: {
    readonly pageSize?: number;
    readonly pageToken?: string | null;
  };
  /** Client-supplied hint only. Not used for authorisation. */
  readonly actorHint?: {
    readonly actorUserId?: string;
    readonly actorUserCode?: string;
  };
}

export const BN_BENEFITS_QUERY_MAX_PAGE_SIZE = 200;
export const BN_BENEFITS_QUERY_DEFAULT_PAGE_SIZE = 50;
