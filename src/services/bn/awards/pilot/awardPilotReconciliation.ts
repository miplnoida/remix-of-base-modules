/**
 * AW360-WAVE-1-C1 Stage D6 — Pilot pipeline reconciliation service.
 *
 * Read-only comparison of what the pipeline accepted vs. what the
 * downstream systems (business state, audit, telemetry, provider
 * acknowledgement) recorded. Discrepancies are classified so they can
 * be surfaced in diagnostics and alerts without exposing PII.
 */
import type { AwardActionKey } from '../awardActionAvailability';
import type {
  AwardAuditEvidence,
  AwardCommandOutcomeCode,
  AwardCommandTelemetryEvent,
} from './awardCommandContracts';

export type ReconciliationDiscrepancyClass =
  | 'MUTATION_WITHOUT_AUDIT'
  | 'AUDIT_WITHOUT_MUTATION'
  | 'DUPLICATE_BUSINESS_EFFECT'
  | 'INCOMPLETE_COMMAND'
  | 'SUCCESS_WITHOUT_STATE'
  | 'MISSING_EXTERNAL_ACK'
  | 'TELEMETRY_WITHOUT_COMMAND'
  | 'COMMAND_WITHOUT_COMPLETION_TELEMETRY';

export interface PipelineCommandRecord {
  readonly commandId: string;
  readonly correlationId: string;
  readonly action: AwardActionKey;
  readonly awardId: string;
  readonly tenantId: string;
  readonly outcome: AwardCommandOutcomeCode;
}

export interface BusinessStateRecord {
  readonly commandId: string;
  readonly awardId: string;
  readonly tenantId: string;
  readonly appliedAt: string;
}

export interface ExternalDeliveryAck {
  readonly commandId: string;
  readonly channel: 'EMAIL' | 'SMS' | 'LETTER' | 'INTERNAL';
  readonly ackAt: string;
}

export interface ReconciliationInputs {
  readonly commands: readonly PipelineCommandRecord[];
  readonly audits: readonly AwardAuditEvidence[];
  readonly telemetry: readonly AwardCommandTelemetryEvent[];
  readonly businessState: readonly BusinessStateRecord[];
  readonly externalAcks: readonly ExternalDeliveryAck[];
  /** Actions expected to produce an external delivery ack. */
  readonly requiresExternalAck?: readonly AwardActionKey[];
}

export interface ReconciliationDiscrepancy {
  readonly klass: ReconciliationDiscrepancyClass;
  readonly commandId?: string;
  readonly action?: AwardActionKey;
  readonly awardId?: string;
  readonly tenantId?: string;
  readonly detail: string;
}

export interface ReconciliationReport {
  readonly totalCommands: number;
  readonly totalExecuted: number;
  readonly totalAudits: number;
  readonly totalBusinessState: number;
  readonly totalTelemetry: number;
  readonly discrepancies: readonly ReconciliationDiscrepancy[];
  readonly countsByClass: Readonly<Record<ReconciliationDiscrepancyClass, number>>;
  readonly isClean: boolean;
}

const ALL_CLASSES: readonly ReconciliationDiscrepancyClass[] = [
  'MUTATION_WITHOUT_AUDIT',
  'AUDIT_WITHOUT_MUTATION',
  'DUPLICATE_BUSINESS_EFFECT',
  'INCOMPLETE_COMMAND',
  'SUCCESS_WITHOUT_STATE',
  'MISSING_EXTERNAL_ACK',
  'TELEMETRY_WITHOUT_COMMAND',
  'COMMAND_WITHOUT_COMPLETION_TELEMETRY',
];

export function reconcilePilotPipeline(inputs: ReconciliationInputs): ReconciliationReport {
  const discrepancies: ReconciliationDiscrepancy[] = [];
  const executed = inputs.commands.filter((c) => c.outcome === 'EXECUTED');
  const auditByCommand = new Map(inputs.audits.map((a) => [a.commandId, a]));
  const stateByCommand = new Map<string, BusinessStateRecord[]>();
  for (const s of inputs.businessState) {
    const list = stateByCommand.get(s.commandId) ?? [];
    list.push(s);
    stateByCommand.set(s.commandId, list);
  }
  const ackByCommand = new Map(inputs.externalAcks.map((a) => [a.commandId, a]));
  const commandIds = new Set(inputs.commands.map((c) => c.commandId));
  const requiresExternalAck = new Set(inputs.requiresExternalAck ?? []);

  for (const c of executed) {
    // Mutation without audit
    if (!auditByCommand.has(c.commandId)) {
      discrepancies.push({
        klass: 'MUTATION_WITHOUT_AUDIT',
        commandId: c.commandId,
        action: c.action,
        awardId: c.awardId,
        tenantId: c.tenantId,
        detail: 'Executed command has no audit record',
      });
    }
    // Success without business state
    const s = stateByCommand.get(c.commandId) ?? [];
    if (s.length === 0) {
      discrepancies.push({
        klass: 'SUCCESS_WITHOUT_STATE',
        commandId: c.commandId,
        action: c.action,
        awardId: c.awardId,
        tenantId: c.tenantId,
        detail: 'EXECUTED but no business-state record produced',
      });
    } else if (s.length > 1) {
      discrepancies.push({
        klass: 'DUPLICATE_BUSINESS_EFFECT',
        commandId: c.commandId,
        action: c.action,
        awardId: c.awardId,
        tenantId: c.tenantId,
        detail: `Business state applied ${s.length} times for one command`,
      });
    }
    // External delivery ack
    if (requiresExternalAck.has(c.action) && !ackByCommand.has(c.commandId)) {
      discrepancies.push({
        klass: 'MISSING_EXTERNAL_ACK',
        commandId: c.commandId,
        action: c.action,
        awardId: c.awardId,
        tenantId: c.tenantId,
        detail: 'No provider/delivery acknowledgement recorded',
      });
    }
    // Completion telemetry
    const telem = inputs.telemetry.filter((t) => t.commandId === c.commandId);
    const hasCompletion = telem.some(
      (t) => t.type === 'COMMAND_EXECUTED' || t.type === 'COMMAND_DENIED' || t.type === 'COMMAND_FAILED',
    );
    if (!hasCompletion) {
      discrepancies.push({
        klass: 'COMMAND_WITHOUT_COMPLETION_TELEMETRY',
        commandId: c.commandId,
        action: c.action,
        detail: 'No completion telemetry event',
      });
    }
    // Incomplete command (no attempt telemetry)
    if (!telem.some((t) => t.type === 'COMMAND_ATTEMPT')) {
      discrepancies.push({
        klass: 'INCOMPLETE_COMMAND',
        commandId: c.commandId,
        action: c.action,
        detail: 'No COMMAND_ATTEMPT telemetry recorded',
      });
    }
  }

  // Audit without a corresponding executed mutation
  for (const a of inputs.audits) {
    const cmd = inputs.commands.find((c) => c.commandId === a.commandId);
    if (!cmd || cmd.outcome !== 'EXECUTED') {
      discrepancies.push({
        klass: 'AUDIT_WITHOUT_MUTATION',
        commandId: a.commandId,
        action: a.action,
        awardId: a.awardId,
        tenantId: a.tenantId,
        detail: 'Audit record without matching EXECUTED command',
      });
    }
  }

  // Telemetry that references an unknown command
  for (const t of inputs.telemetry) {
    if (!commandIds.has(t.commandId)) {
      discrepancies.push({
        klass: 'TELEMETRY_WITHOUT_COMMAND',
        commandId: t.commandId,
        action: t.action,
        detail: `Telemetry ${t.type} without known command`,
      });
    }
  }

  const counts = ALL_CLASSES.reduce(
    (acc, k) => ({ ...acc, [k]: 0 }),
    {} as Record<ReconciliationDiscrepancyClass, number>,
  );
  for (const d of discrepancies) counts[d.klass]++;

  return {
    totalCommands: inputs.commands.length,
    totalExecuted: executed.length,
    totalAudits: inputs.audits.length,
    totalBusinessState: inputs.businessState.length,
    totalTelemetry: inputs.telemetry.length,
    discrepancies,
    countsByClass: counts,
    isClean: discrepancies.length === 0,
  };
}
