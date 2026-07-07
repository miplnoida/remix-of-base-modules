import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as svc from './migrationService';
import type { MigrationFilters } from './migrationTypes';

const K = {
  dashboard: (f: MigrationFilters = {}) => ['mig', 'dashboard', f] as const,
  readiness: (planId?: string) => ['mig', 'readiness', planId] as const,
  blockers: (planId?: string) => ['mig', 'blockers', planId] as const,
  cutSummary: (planId?: string, batchId?: string) => ['mig', 'cutSummary', planId, batchId] as const,
  pb: (f: MigrationFilters = {}) => ['mig', 'pb', f] as const,
  pbOne: (id: string) => ['mig', 'pb', id] as const,
  plans: (f: MigrationFilters = {}) => ['mig', 'plans', f] as const,
  plan: (id: string) => ['mig', 'plan', id] as const,
  planTables: (planId: string) => ['mig', 'planTables', planId] as const,
  batches: (f: MigrationFilters = {}) => ['mig', 'batches', f] as const,
  batch: (id: string) => ['mig', 'batch', id] as const,
  runs: (batchId: string) => ['mig', 'runs', batchId] as const,
  tableRuns: (runId: string) => ['mig', 'tableRuns', runId] as const,
  vRules: (f: MigrationFilters = {}) => ['mig', 'vRules', f] as const,
  vResults: (f: MigrationFilters = {}) => ['mig', 'vResults', f] as const,
  recon: (f: MigrationFilters = {}) => ['mig', 'recon', f] as const,
  issues: (f: MigrationFilters = {}) => ['mig', 'issues', f] as const,
  issue: (id: string) => ['mig', 'issue', id] as const,
  cutChecks: () => ['mig', 'cutChecks'] as const,
  cutResults: (planId?: string, batchId?: string) => ['mig', 'cutResults', planId, batchId] as const,
};

const useInv = () => {
  const qc = useQueryClient();
  return (...prefixes: string[]) => prefixes.forEach((p) => qc.invalidateQueries({ queryKey: ['mig', p] }));
};

export const useMigrationDashboardMetrics = (f: MigrationFilters = {}) =>
  useQuery({ queryKey: K.dashboard(f), queryFn: () => svc.getMigrationDashboardMetrics(f) });
export const useMigrationReadinessSummary = (planId?: string) =>
  useQuery({ queryKey: K.readiness(planId), queryFn: () => svc.getMigrationReadinessSummary(planId) });
export const useMigrationBlockingIssues = (planId?: string) =>
  useQuery({ queryKey: K.blockers(planId), queryFn: () => svc.getMigrationBlockingIssues(planId) });
export const useCutoverReadinessSummary = (planId?: string, batchId?: string) =>
  useQuery({ queryKey: K.cutSummary(planId, batchId), queryFn: () => svc.getCutoverReadinessSummary(planId, batchId) });

export const usePowerBuilderObjects = (f: MigrationFilters = {}) =>
  useQuery({ queryKey: K.pb(f), queryFn: () => svc.getPowerBuilderObjects(f) });
export const usePowerBuilderObject = (id: string) =>
  useQuery({ queryKey: K.pbOne(id), queryFn: () => svc.getPowerBuilderObject(id), enabled: !!id });
export const useCreatePowerBuilderObject = () => {
  const inv = useInv();
  return useMutation({ mutationFn: svc.createPowerBuilderObject, onSuccess: () => inv('pb', 'dashboard') });
};
export const useUpdatePowerBuilderObject = () => {
  const inv = useInv();
  return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: any }) => svc.updatePowerBuilderObject(id, payload), onSuccess: () => inv('pb') });
};
export const useReviewPowerBuilderObject = () => {
  const inv = useInv();
  return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: any }) => svc.reviewPowerBuilderObject(id, payload), onSuccess: () => inv('pb') });
};

export const useMigrationPlans = (f: MigrationFilters = {}) =>
  useQuery({ queryKey: K.plans(f), queryFn: () => svc.getMigrationPlans(f) });
export const useMigrationPlan = (id: string) =>
  useQuery({ queryKey: K.plan(id), queryFn: () => svc.getMigrationPlan(id), enabled: !!id });
export const useCreateMigrationPlan = () => {
  const inv = useInv();
  return useMutation({ mutationFn: svc.createMigrationPlan, onSuccess: () => inv('plans', 'dashboard') });
};
export const useUpdateMigrationPlan = () => {
  const inv = useInv();
  return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: any }) => svc.updateMigrationPlan(id, payload), onSuccess: () => inv('plans', 'plan') });
};
export const useSubmitMigrationPlan = () => {
  const inv = useInv();
  return useMutation({ mutationFn: (id: string) => svc.submitMigrationPlan(id), onSuccess: () => inv('plans') });
};
export const useApproveMigrationPlan = () => {
  const inv = useInv();
  return useMutation({ mutationFn: (id: string) => svc.approveMigrationPlan(id), onSuccess: () => inv('plans') });
};
export const useRejectMigrationPlan = () => {
  const inv = useInv();
  return useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => svc.rejectMigrationPlan(id, reason), onSuccess: () => inv('plans') });
};

export const useMigrationPlanTables = (planId: string) =>
  useQuery({ queryKey: K.planTables(planId), queryFn: () => svc.getMigrationPlanTables(planId), enabled: !!planId });
export const useAddMigrationPlanTable = () => {
  const inv = useInv();
  return useMutation({ mutationFn: svc.addMigrationPlanTable, onSuccess: () => inv('planTables', 'dashboard') });
};
export const useUpdateMigrationPlanTable = () => {
  const inv = useInv();
  return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: any }) => svc.updateMigrationPlanTable(id, payload), onSuccess: () => inv('planTables') });
};
export const useRemoveMigrationPlanTable = () => {
  const inv = useInv();
  return useMutation({ mutationFn: (id: string) => svc.removeMigrationPlanTable(id), onSuccess: () => inv('planTables') });
};

export const useMigrationBatches = (f: MigrationFilters = {}) =>
  useQuery({ queryKey: K.batches(f), queryFn: () => svc.getMigrationBatches(f) });
export const useMigrationBatch = (id: string) =>
  useQuery({ queryKey: K.batch(id), queryFn: () => svc.getMigrationBatch(id), enabled: !!id });
export const useCreateMigrationBatch = () => {
  const inv = useInv();
  return useMutation({ mutationFn: svc.createMigrationBatch, onSuccess: () => inv('batches', 'dashboard') });
};
export const useUpdateMigrationBatch = () => {
  const inv = useInv();
  return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: any }) => svc.updateMigrationBatch(id, payload), onSuccess: () => inv('batches') });
};
export const useSubmitMigrationBatch = () => {
  const inv = useInv();
  return useMutation({ mutationFn: (id: string) => svc.submitMigrationBatch(id), onSuccess: () => inv('batches') });
};
export const useApproveMigrationBatch = () => {
  const inv = useInv();
  return useMutation({ mutationFn: (id: string) => svc.approveMigrationBatch(id), onSuccess: () => inv('batches') });
};
export const useStartMigrationBatch = () => {
  const inv = useInv();
  return useMutation({ mutationFn: (id: string) => svc.startMigrationBatch(id), onSuccess: () => inv('batches') });
};
export const useCompleteMigrationBatch = () => {
  const inv = useInv();
  return useMutation({ mutationFn: ({ id, payload }: { id: string; payload?: any }) => svc.completeMigrationBatch(id, payload), onSuccess: () => inv('batches') });
};
export const useFailMigrationBatch = () => {
  const inv = useInv();
  return useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => svc.failMigrationBatch(id, reason), onSuccess: () => inv('batches') });
};

export const useMigrationRuns = (batchId: string) =>
  useQuery({ queryKey: K.runs(batchId), queryFn: () => svc.getMigrationRuns(batchId), enabled: !!batchId });
export const useMigrationTableRuns = (runId: string) =>
  useQuery({ queryKey: K.tableRuns(runId), queryFn: () => svc.getMigrationTableRuns(runId), enabled: !!runId });

export const useValidationRules = (f: MigrationFilters = {}) =>
  useQuery({ queryKey: K.vRules(f), queryFn: () => svc.getValidationRules(f) });
export const useCreateValidationRule = () => {
  const inv = useInv();
  return useMutation({ mutationFn: svc.createValidationRule, onSuccess: () => inv('vRules') });
};
export const useUpdateValidationRule = () => {
  const inv = useInv();
  return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: any }) => svc.updateValidationRule(id, payload), onSuccess: () => inv('vRules') });
};
export const useValidationResults = (f: MigrationFilters = {}) =>
  useQuery({ queryKey: K.vResults(f), queryFn: () => svc.getValidationResults(f) });
export const useRecordValidationResult = () => {
  const inv = useInv();
  return useMutation({ mutationFn: svc.recordValidationResult, onSuccess: () => inv('vResults', 'dashboard') });
};

export const useReconciliationSummaries = (f: MigrationFilters = {}) =>
  useQuery({ queryKey: K.recon(f), queryFn: () => svc.getReconciliationSummaries(f) });
export const useRecordReconciliationSummary = () => {
  const inv = useInv();
  return useMutation({ mutationFn: svc.recordReconciliationSummary, onSuccess: () => inv('recon', 'dashboard') });
};
export const useAcceptReconciliationDifference = () => {
  const inv = useInv();
  return useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => svc.acceptReconciliationDifference(id, reason), onSuccess: () => inv('recon', 'dashboard') });
};

export const useMigrationIssues = (f: MigrationFilters = {}) =>
  useQuery({ queryKey: K.issues(f), queryFn: () => svc.getMigrationIssues(f) });
export const useMigrationIssue = (id: string) =>
  useQuery({ queryKey: K.issue(id), queryFn: () => svc.getMigrationIssue(id), enabled: !!id });
export const useCreateMigrationIssue = () => {
  const inv = useInv();
  return useMutation({ mutationFn: svc.createMigrationIssue, onSuccess: () => inv('issues', 'dashboard') });
};
export const useUpdateMigrationIssue = () => {
  const inv = useInv();
  return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: any }) => svc.updateMigrationIssue(id, payload), onSuccess: () => inv('issues') });
};
export const useResolveMigrationIssue = () => {
  const inv = useInv();
  return useMutation({ mutationFn: ({ id, notes }: { id: string; notes: string }) => svc.resolveMigrationIssue(id, notes), onSuccess: () => inv('issues', 'dashboard') });
};
export const useWaiveMigrationIssue = () => {
  const inv = useInv();
  return useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => svc.waiveMigrationIssue(id, reason), onSuccess: () => inv('issues', 'dashboard') });
};
export const useReopenMigrationIssue = () => {
  const inv = useInv();
  return useMutation({ mutationFn: (id: string) => svc.reopenMigrationIssue(id), onSuccess: () => inv('issues') });
};

export const useCutoverReadinessChecks = () =>
  useQuery({ queryKey: K.cutChecks(), queryFn: () => svc.getCutoverReadinessChecks() });
export const useCutoverReadinessResults = (planId?: string, batchId?: string) =>
  useQuery({ queryKey: K.cutResults(planId, batchId), queryFn: () => svc.getCutoverReadinessResults(planId, batchId) });
export const useUpdateCutoverReadinessResult = () => {
  const inv = useInv();
  return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: any }) => svc.updateCutoverReadinessResult(id, payload), onSuccess: () => inv('cutResults', 'dashboard') });
};
export const useApproveCutoverReadiness = () => {
  const inv = useInv();
  return useMutation({ mutationFn: ({ planId, batchId }: { planId?: string; batchId?: string }) => svc.approveCutoverReadiness(planId, batchId), onSuccess: () => inv('cutResults', 'dashboard') });
};
