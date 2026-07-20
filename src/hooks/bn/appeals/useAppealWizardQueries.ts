/**
 * BN Appeals — Slice 2B wizard query hooks.
 *
 * Every read goes through the secure BenefitsQueryClient. No direct table
 * access from the browser.
 */
import { useBenefitsQuery } from '@/hooks/bn/queries';

const MODULE = 'bn_appeals';

export interface AppealSourceCandidateRow {
  sourceModule: string;
  sourceEntityType: string;
  sourceEntityId: string;
  sourceDecisionId: string;
  displayReference: string | null;
  decisionType: string | null;
  decisionDate: string | null;
  benefitTypeCode: string | null;
  claimantPersonId: string | null;
  claimantDisplayName: string | null;
  claimantSsnMasked: string | null;
  rowVersion: number | null;
  existingActiveAppeal: { id: string; appealNumber: string; status: string } | null;
  appealable: boolean;
}

export interface AppealSourceSearchDto {
  readiness: boolean;
  sourceModule: string;
  reason?: string;
  message?: string;
  results: readonly AppealSourceCandidateRow[];
}

export function useAppealSourceSearch(params: { sourceModule: string; search?: string; enabled?: boolean }) {
  return useBenefitsQuery<{ sourceModule: string; search?: string }, AppealSourceSearchDto>({
    queryCode: 'BN_APPEAL_SEARCH_SOURCE_DECISIONS',
    moduleCode: MODULE,
    params: { sourceModule: params.sourceModule, search: params.search ?? '' },
    enabled: params.enabled ?? !!params.sourceModule,
  });
}

export function useAppealSourceContext(params: { sourceModule: string; sourceEntityId: string | null }) {
  return useBenefitsQuery<{ sourceModule: string; sourceEntityId: string }, any>({
    queryCode: 'BN_APPEAL_GET_SOURCE_CONTEXT',
    moduleCode: MODULE,
    params: { sourceModule: params.sourceModule, sourceEntityId: params.sourceEntityId ?? '' },
    enabled: !!params.sourceEntityId,
  });
}

export function useAppealRegistrationConfig(sourceModule: string | null) {
  return useBenefitsQuery<{ sourceModule: string | null }, any>({
    queryCode: 'BN_APPEAL_GET_REGISTRATION_CONFIG',
    moduleCode: MODULE,
    params: { sourceModule },
    enabled: true,
  });
}

export function useAppealRepresentativeOptions(claimantPersonId: string | null) {
  return useBenefitsQuery<{ claimantPersonId: string }, any>({
    queryCode: 'BN_APPEAL_GET_REPRESENTATIVE_OPTIONS',
    moduleCode: MODULE,
    params: { claimantPersonId: claimantPersonId ?? '' },
    enabled: !!claimantPersonId,
  });
}

export function useAppealFilingDeadline(params: {
  appealTypeCode: string | null;
  decisionDate: string | null;
  notifiedAt: string | null;
  submissionDate: string | null;
}) {
  return useBenefitsQuery<typeof params, any>({
    queryCode: 'BN_APPEAL_CALCULATE_FILING_DEADLINE',
    moduleCode: MODULE,
    params,
    enabled: !!params.appealTypeCode,
  });
}

export function useAppealDuplicateCheck(params: { sourceModule: string; sourceEntityId: string | null }) {
  return useBenefitsQuery<{ sourceModule: string; sourceEntityId: string }, { hasDuplicate: boolean; existingAppeals: { id: string; appealNumber: string; status: string }[] }>({
    queryCode: 'BN_APPEAL_CHECK_DUPLICATE',
    moduleCode: MODULE,
    params: { sourceModule: params.sourceModule, sourceEntityId: params.sourceEntityId ?? '' },
    enabled: !!params.sourceEntityId,
  });
}
