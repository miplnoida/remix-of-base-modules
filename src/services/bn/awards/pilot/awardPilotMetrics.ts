/**
 * AW360-WAVE-1-C1 Stage D6 — Pilot metrics aggregator + alert engine.
 *
 * Aggregates production-safe counts over telemetry + pipeline results,
 * evaluates threshold-based alert rules, and emits alert records that
 * a downstream operations pipeline can subscribe to.
 *
 * Read-only. No PII. Correlation-ID traceable.
 */
import type { AwardActionKey } from '../awardActionAvailability';
import type {
  AwardCommandOutcomeCode,
  AwardCommandResult,
  AwardCommandTelemetryEvent,
} from './awardCommandContracts';

export interface PilotMetricsSnapshot {
  attempts: number;
  executed: number;
  guardDeniedByReason: Readonly<Record<string, number>>;
  killSwitchDenials: number;
  cohortDenials: number;
  invalidPayload: number;
  versionConflicts: number;
  idempotentReplays: number;
  idempotencyKeyConflicts: number;
  handlerFailed: number;
  transactionFailed: number;
  auditPersistenceFailed: number;
  handlerNotRegistered: number;
  latencyMs: {
    count: number;
    total: number;
    average: number;
    max: number;
    p95: number;
  };
  reconciliationDiscrepancies: number;
  executionsOutsideCohort: number;
  perAction: Readonly<Record<string, number>>;
}

export interface AlertThresholds {
  readonly maxGuardDeniedPerMinute: number;
  readonly maxHandlerFailuresPerMinute: number;
  readonly maxIdempotencyKeyConflictsPerMinute: number;
  readonly maxAverageLatencyMs: number;
  readonly maxReconciliationDiscrepancies: number;
  readonly maxExecutionsOutsideCohort: number;
}

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  maxGuardDeniedPerMinute: 100,
  maxHandlerFailuresPerMinute: 5,
  maxIdempotencyKeyConflictsPerMinute: 10,
  maxAverageLatencyMs: 500,
  maxReconciliationDiscrepancies: 0,
  maxExecutionsOutsideCohort: 0,
};

export type PilotAlertCode =
  | 'AUDIT_PERSISTENCE_FAILURE'
  | 'RECONCILIATION_DISCREPANCY'
  | 'CROSS_TENANT_MISMATCH'
  | 'EXECUTION_OUTSIDE_COHORT'
  | 'UNEXPECTED_COMMAND_EXCEPTION'
  | 'GUARD_DENIAL_RATE'
  | 'HANDLER_FAILURE_RATE'
  | 'IDEMPOTENCY_KEY_CONFLICT_RATE'
  | 'LATENCY_HIGH';

export interface PilotAlert {
  readonly code: PilotAlertCode;
  readonly severity: 'IMMEDIATE' | 'ELEVATED';
  readonly message: string;
  readonly at: string;
  readonly context: Readonly<Record<string, string | number>>;
}

export class PilotMetricsAggregator {
  private attempts = 0;
  private executed = 0;
  private guardReasons = new Map<string, number>();
  private killSwitchDenials = 0;
  private cohortDenials = 0;
  private invalidPayload = 0;
  private versionConflicts = 0;
  private idempotentReplays = 0;
  private idempotencyKeyConflicts = 0;
  private handlerFailed = 0;
  private transactionFailed = 0;
  private auditPersistenceFailed = 0;
  private handlerNotRegistered = 0;
  private latencySamples: number[] = [];
  private reconciliationDiscrepancies = 0;
  private executionsOutsideCohort = 0;
  private perAction = new Map<string, number>();
  private alerts: PilotAlert[] = [];

  constructor(private readonly thresholds: AlertThresholds = DEFAULT_ALERT_THRESHOLDS) {}

  ingestTelemetry(event: AwardCommandTelemetryEvent): void {
    if (event.type === 'COMMAND_ATTEMPT') this.attempts++;
    if (event.type === 'COMMAND_EXECUTED') this.executed++;
    if (event.type === 'IDEMPOTENT_REPLAY') this.idempotentReplays++;
    if (event.type === 'VERSION_CONFLICT') this.versionConflicts++;
    if (event.type === 'AUDIT_PERSISTENCE_FAILED') {
      this.auditPersistenceFailed++;
      this.raise({
        code: 'AUDIT_PERSISTENCE_FAILURE',
        severity: 'IMMEDIATE',
        message: 'Audit persistence failed',
        at: event.at,
        context: {
          action: event.action,
          commandId: event.commandId,
          correlationId: event.correlationId,
          tenantId: event.tenantId,
        },
      });
    }
  }

  ingestResult(result: AwardCommandResult, opts: { allowedCohort?: boolean } = {}): void {
    const key = `${result.action}:${result.outcome}`;
    this.perAction.set(key, (this.perAction.get(key) ?? 0) + 1);
    if (typeof result.durationMs === 'number') this.latencySamples.push(result.durationMs);
    switch (result.outcome) {
      case 'GUARD_DENIED':
        this.guardReasons.set(
          result.guard?.reasonCode ?? 'UNKNOWN',
          (this.guardReasons.get(result.guard?.reasonCode ?? 'UNKNOWN') ?? 0) + 1,
        );
        break;
      case 'KILL_SWITCH_OFF':
        this.killSwitchDenials++;
        break;
      case 'ROLLOUT_COHORT_EXCLUDED':
        this.cohortDenials++;
        break;
      case 'INVALID_PAYLOAD':
        this.invalidPayload++;
        break;
      case 'VERSION_CONFLICT':
        this.versionConflicts++;
        break;
      case 'DUPLICATE_COMMAND':
        this.idempotentReplays++;
        break;
      case 'IDEMPOTENCY_KEY_CONFLICT':
        this.idempotencyKeyConflicts++;
        break;
      case 'HANDLER_FAILED':
        this.handlerFailed++;
        this.raise({
          code: 'HANDLER_FAILURE_RATE',
          severity: 'ELEVATED',
          message: 'Handler failure recorded',
          at: new Date().toISOString(),
          context: { action: result.action, commandId: result.commandId },
        });
        break;
      case 'TRANSACTION_FAILED':
        this.transactionFailed++;
        break;
      case 'AUDIT_PERSISTENCE_FAILED':
        this.auditPersistenceFailed++;
        break;
      case 'HANDLER_NOT_REGISTERED':
        this.handlerNotRegistered++;
        break;
      case 'EXECUTED':
        if (opts.allowedCohort === false) {
          this.executionsOutsideCohort++;
          this.raise({
            code: 'EXECUTION_OUTSIDE_COHORT',
            severity: 'IMMEDIATE',
            message: 'Command executed outside an approved cohort',
            at: new Date().toISOString(),
            context: {
              action: result.action,
              commandId: result.commandId,
              tenantId: result.tenantId,
            },
          });
        }
        break;
    }
  }

  ingestReconciliation(discrepancyCount: number): void {
    this.reconciliationDiscrepancies += discrepancyCount;
    if (discrepancyCount > this.thresholds.maxReconciliationDiscrepancies) {
      this.raise({
        code: 'RECONCILIATION_DISCREPANCY',
        severity: 'IMMEDIATE',
        message: `${discrepancyCount} reconciliation discrepancies`,
        at: new Date().toISOString(),
        context: { count: discrepancyCount },
      });
    }
  }

  reportCrossTenantMismatch(context: { action: AwardActionKey; commandId: string }): void {
    this.raise({
      code: 'CROSS_TENANT_MISMATCH',
      severity: 'IMMEDIATE',
      message: 'Cross-tenant access attempted',
      at: new Date().toISOString(),
      context: { action: context.action, commandId: context.commandId },
    });
  }

  reportUnexpectedException(context: { action: AwardActionKey; commandId: string; errorClass: string }): void {
    this.raise({
      code: 'UNEXPECTED_COMMAND_EXCEPTION',
      severity: 'IMMEDIATE',
      message: 'Unexpected command exception',
      at: new Date().toISOString(),
      context,
    });
  }

  private raise(alert: PilotAlert): void {
    this.alerts.push(alert);
  }

  drainAlerts(): readonly PilotAlert[] {
    return this.alerts.slice();
  }

  snapshot(): PilotMetricsSnapshot {
    const s = this.latencySamples.slice().sort((a, b) => a - b);
    const total = s.reduce((a, b) => a + b, 0);
    const count = s.length;
    const average = count ? total / count : 0;
    const max = count ? s[count - 1] : 0;
    const p95 = count ? s[Math.min(count - 1, Math.floor(count * 0.95))] : 0;
    return {
      attempts: this.attempts,
      executed: this.executed,
      guardDeniedByReason: Object.fromEntries(this.guardReasons),
      killSwitchDenials: this.killSwitchDenials,
      cohortDenials: this.cohortDenials,
      invalidPayload: this.invalidPayload,
      versionConflicts: this.versionConflicts,
      idempotentReplays: this.idempotentReplays,
      idempotencyKeyConflicts: this.idempotencyKeyConflicts,
      handlerFailed: this.handlerFailed,
      transactionFailed: this.transactionFailed,
      auditPersistenceFailed: this.auditPersistenceFailed,
      handlerNotRegistered: this.handlerNotRegistered,
      latencyMs: { count, total, average, max, p95 },
      reconciliationDiscrepancies: this.reconciliationDiscrepancies,
      executionsOutsideCohort: this.executionsOutsideCohort,
      perAction: Object.fromEntries(this.perAction),
    };
  }
}

export function outcomeAsAlertRelevant(outcome: AwardCommandOutcomeCode): boolean {
  return (
    outcome === 'AUDIT_PERSISTENCE_FAILED' ||
    outcome === 'HANDLER_FAILED' ||
    outcome === 'TRANSACTION_FAILED'
  );
}
