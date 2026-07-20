/**
 * BN Appeals — Turn 2 operational read hooks.
 *
 * All reads route through the secure BenefitsQueryClient. No direct table
 * access. Query keys include user + query code so React Query cache is
 * scoped and cleared correctly on identity changes.
 */
import { useBenefitsQuery } from '@/hooks/bn/queries';

const MODULE = 'bn_appeals';

export interface AppealMyWorkSummaryDto {
  assignedToMe: number;
  dueToday: number;
  slaBreached: number;
  evidenceAwaiting: number;
  casePreparation: number;
  hearingPreparation: number;
  recommendationPending: number;
  decisionPending: number;
}

export function useAppealMyWorkSummary(enabled = true) {
  return useBenefitsQuery<Record<string, never>, AppealMyWorkSummaryDto>({
    queryCode: 'BN_APPEAL_GET_MY_WORK_SUMMARY',
    moduleCode: MODULE,
    params: {},
    enabled,
  });
}

export interface AppealMyWorkRow {
  id: string;
  appealNumber: string;
  appellantName: string | null;
  claimantSsnMasked: string | null;
  sourceReference: string | null;
  sourceModule: string;
  appealType: string;
  currentStage: string;
  status: string;
  assignedWorkbasket: string | null;
  filingDeadlineDate: string | null;
  slaStatus: 'OK' | 'BREACHED';
  hearingRequired: boolean;
  nextAction: string;
}
export function useAppealMyWorkList(params: {
  view?: 'ALL_OPEN' | 'CASE_PREP' | 'EVIDENCE' | 'HEARING' | 'RECOMMEND' | 'DECISION';
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  return useBenefitsQuery<typeof params, AppealMyWorkRow[]>({
    queryCode: 'BN_APPEAL_LIST_MY_WORK',
    moduleCode: MODULE,
    params,
    enabled: true,
  });
}

export interface AppealHearingRow {
  id: string;
  appealId: string;
  hearingReference: string | null;
  appealNumber: string | null;
  appealType: string | null;
  hearingMode: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  timeZone: string | null;
  location: string;
  chairUserId: string | null;
  participantCount: number;
  noticeStatus: string | null;
  status: string;
  outcome: string | null;
  nextAction: string;
}
export function useAppealHearings(params: {
  view?: 'UNSCHEDULED' | 'UPCOMING' | 'TODAY' | 'AWAITING_NOTICE' | 'ADJOURNED' | 'OUTCOME_PENDING' | 'COMPLETED';
  page?: number;
  pageSize?: number;
}) {
  return useBenefitsQuery<typeof params, AppealHearingRow[]>({
    queryCode: 'BN_APPEAL_LIST_HEARINGS',
    moduleCode: MODULE,
    params,
    enabled: true,
  });
}

export interface AppealImplementationRow {
  id: string;
  appealId: string;
  appealNumber: string | null;
  decisionNumber: string | null;
  decisionOutcome: string | null;
  remedy: string | null;
  sourceModule: string | null;
  targetModule: string;
  targetEntity: string | null;
  actionType: string;
  actionStatus: string;
  attemptCount: number | null;
  failureCode: string | null;
  requestedDate: string | null;
  completedDate: string | null;
  reconciliationStatus: string | null;
  nextAction: string;
}
export function useAppealImplementation(params: {
  view?: 'AWAITING_PLAN' | 'READY' | 'IN_PROGRESS' | 'FAILED' | 'AWAITING_RECON' | 'PARTIAL' | 'COMPLETED';
  page?: number;
  pageSize?: number;
}) {
  return useBenefitsQuery<typeof params, AppealImplementationRow[]>({
    queryCode: 'BN_APPEAL_LIST_IMPLEMENTATION',
    moduleCode: MODULE,
    params,
    enabled: true,
  });
}

export interface AppealConfigurationDto {
  appealTypes: any[];
  grounds: any[];
  remedies: any[];
  filingPolicies: any[];
  hearingPolicies: any[];
  workflowMappings: any[];
  communicationTemplates: any[];
  integrationReadiness: { sourceModule: string; ready: boolean; reason?: string }[];
}
export function useAppealConfiguration() {
  return useBenefitsQuery<Record<string, never>, AppealConfigurationDto>({
    queryCode: 'BN_APPEAL_GET_CONFIGURATION',
    moduleCode: MODULE,
    params: {},
    enabled: true,
  });
}
