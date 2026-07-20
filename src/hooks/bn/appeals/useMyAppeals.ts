/**
 * BN-AP-00 — Claimant appeal history via the secure query boundary.
 *
 * Previously this hook selected directly from `bn_appeal` with a
 * client-supplied claim id list. After AP-00 the browser can no longer read
 * `bn_appeal` at all; ownership is derived server-side from the caller's
 * JWT through `external_user_person_link` and cross-checked against
 * `bn_claim.ssn`. The `claimIds` parameter is retained for signature
 * compatibility but is IGNORED — the server is authoritative.
 */
import { useBenefitsQuery } from '@/hooks/bn/queries/useBenefitsQuery';

export interface ClaimantAppealRow {
  readonly id: string;
  readonly appealNumber: string;
  readonly bnClaimId: string | null;
  readonly appealTypeCode: string;
  readonly status: string;
  readonly outcome: string | null;
  readonly submittedAt: string | null;
  readonly filingDeadlineDate: string | null;
  readonly reasonSummary: string | null;
  readonly decidedAt: string | null;
}

export function useMyAppeals(_claimIds: readonly string[] = []) {
  const result = useBenefitsQuery<Record<string, never>, readonly ClaimantAppealRow[]>({
    queryCode: 'BN_APPEAL_GET_MY_APPEALS',
    moduleCode: 'bn_appeals',
    params: {},
    pageSize: 100,
  });

  return {
    ...result,
    data: (result.data?.status === 'OK'
      ? (result.data.data as readonly ClaimantAppealRow[] | null) ?? []
      : []) as readonly ClaimantAppealRow[],
    envelope: result.data ?? null,
  };
}
