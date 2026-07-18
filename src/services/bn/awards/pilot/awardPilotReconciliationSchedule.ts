/**
 * AW360-WAVE-1-C1 Stage D7 — Persisted reconciliation scheduling.
 *
 * Wraps `reconcilePilotPipeline` with a persisted run history so that:
 *   - every reconciliation run has a recorded start/end;
 *   - discrepancy counts by class are persisted for governance;
 *   - unresolved discrepancies block cohort expansion + promotion;
 *   - the reviewer + correlation-ID cross-refs are captured.
 */
import type {
  PipelineCommandRecord,
  BusinessStateRecord,
  ExternalDeliveryAck,
  ReconciliationReport,
  ReconciliationDiscrepancyClass,
} from './awardPilotReconciliation';
import { reconcilePilotPipeline } from './awardPilotReconciliation';
import type { AwardCommandTelemetryEvent, AwardAuditEvidence } from './awardCommandContracts';
import type { AwardActionKey } from '../awardActionAvailability';

export type PilotReconciliationTrigger =
  | 'AFTER_BATCH'
  | 'SCHEDULED'
  | 'AFTER_IMMEDIATE_ALERT'
  | 'BEFORE_COHORT_EXPANSION'
  | 'BEFORE_PROMOTION';

export interface PilotReconciliationRunRecord {
  readonly runId: string;
  readonly trigger: PilotReconciliationTrigger;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly reviewer: string;
  readonly recordsExamined: number;
  readonly discrepancyCountByClass: Record<ReconciliationDiscrepancyClass, number>;
  readonly resolvedDiscrepancies: number;
  readonly unresolvedDiscrepancies: number;
  readonly correlationIds: readonly string[];
  readonly finalStatus: 'CLEAN' | 'RESOLVED' | 'UNRESOLVED';
  readonly report: ReconciliationReport;
}

export interface PilotReconciliationSchedule {
  run(input: {
    readonly trigger: PilotReconciliationTrigger;
    readonly reviewer: string;
    readonly commands: readonly PipelineCommandRecord[];
    readonly audits: readonly AwardAuditEvidence[];
    readonly telemetry: readonly AwardCommandTelemetryEvent[];
    readonly businessState: readonly BusinessStateRecord[];
    readonly externalAcks: readonly ExternalDeliveryAck[];
    readonly requiresExternalAck: readonly AwardActionKey[];
    readonly preResolvedDiscrepancies?: number;
    readonly runId?: string;
  }): PilotReconciliationRunRecord;
  history(): readonly PilotReconciliationRunRecord[];
  lastRun(): PilotReconciliationRunRecord | null;
  hasUnresolved(): boolean;
}

export function createPilotReconciliationSchedule(opts: {
  readonly now?: () => Date;
} = {}): PilotReconciliationSchedule {
  const now = opts.now ?? (() => new Date());
  const history: PilotReconciliationRunRecord[] = [];
  let seq = 0;
  return {
    run: (input) => {
      const startedAt = now().toISOString();
      const report = reconcilePilotPipeline({
        commands: input.commands,
        audits: input.audits,
        telemetry: input.telemetry,
        businessState: input.businessState,
        externalAcks: input.externalAcks,
        requiresExternalAck: input.requiresExternalAck,
      });
      const completedAt = now().toISOString();
      const byClass = report.discrepancies.reduce<Record<string, number>>((acc, d) => {
        acc[d.klass] = (acc[d.klass] ?? 0) + 1;
        return acc;
      }, {});
      const resolved = input.preResolvedDiscrepancies ?? 0;
      const unresolved = Math.max(report.discrepancies.length - resolved, 0);
      const record: PilotReconciliationRunRecord = {
        runId: input.runId ?? `recon_${++seq}_${Date.now().toString(36)}`,
        trigger: input.trigger,
        startedAt,
        completedAt,
        reviewer: input.reviewer,
        recordsExamined: input.commands.length,
        discrepancyCountByClass: byClass as Record<ReconciliationDiscrepancyClass, number>,
        resolvedDiscrepancies: resolved,
        unresolvedDiscrepancies: unresolved,
        correlationIds: Array.from(new Set(input.commands.map((c) => c.correlationId))),
        finalStatus: report.isClean ? 'CLEAN' : unresolved === 0 ? 'RESOLVED' : 'UNRESOLVED',
        report,
      };
      history.push(record);
      return record;
    },
    history: () => history.slice(),
    lastRun: () => (history.length ? history[history.length - 1] : null),
    hasUnresolved: () => history.some((r) => r.finalStatus === 'UNRESOLVED'),
  };
}
