/**
 * AW360-WAVE-1-C1 Stage D9 — Live reconciliation runs.
 *
 * Persistent record of reconciliation executions during the runtime
 * evidence window. Any unexplained discrepancy blocks cohort expansion and
 * promotion.
 */
export type LiveReconciliationTrigger =
  | 'AFTER_PILOT_BATCH'
  | 'ON_SCHEDULE'
  | 'AFTER_IMMEDIATE_ALERT'
  | 'BEFORE_COHORT_EXPANSION'
  | 'BEFORE_PROMOTION';

export type LiveReconciliationDiscrepancyClass =
  | 'COMMAND_WITHOUT_AUDIT'
  | 'AUDIT_WITHOUT_COMMAND'
  | 'IDEMPOTENCY_WITHOUT_OUTCOME'
  | 'VERSION_MISMATCH'
  | 'PROVIDER_STATUS_UNCONFIRMED'
  | 'COHORT_MEMBERSHIP_MISMATCH'
  | 'TENANT_ISOLATION_ANOMALY';

export interface LiveReconciliationDiscrepancyCount {
  readonly class: LiveReconciliationDiscrepancyClass;
  readonly count: number;
}

export interface LiveReconciliationRun {
  readonly runId: string;
  readonly trigger: LiveReconciliationTrigger;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly recordsInspected: number;
  readonly discrepanciesByClass: readonly LiveReconciliationDiscrepancyCount[];
  readonly resolvedDiscrepancies: number;
  readonly unresolvedDiscrepancies: number;
  readonly reviewer: string;
  readonly finalStatus: 'CLEAN' | 'RESOLVED' | 'UNRESOLVED' | 'IN_PROGRESS';
  readonly notes: string;
}

export interface LiveReconciliationRegister {
  add(run: LiveReconciliationRun): void;
  all(): readonly LiveReconciliationRun[];
  unresolvedCount(): number;
  isClean(): boolean;
}

export function createLiveReconciliationRegister(): LiveReconciliationRegister {
  const runs: LiveReconciliationRun[] = [];
  return {
    add: (r) => { runs.push(r); },
    all: () => runs.slice(),
    unresolvedCount: () =>
      runs.reduce((n, r) => n + (r.finalStatus === 'UNRESOLVED' ? r.unresolvedDiscrepancies : 0), 0),
    isClean: () => runs.length > 0 && runs.every((r) =>
      r.finalStatus === 'CLEAN' || (r.finalStatus === 'RESOLVED' && r.unresolvedDiscrepancies === 0)),
  };
}
