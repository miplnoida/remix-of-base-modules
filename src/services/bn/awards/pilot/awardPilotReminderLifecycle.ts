/**
 * AW360-WAVE-1-C1 Stage D8 — Reminder command vs. delivery lifecycle.
 *
 * SEND_LIFE_CERTIFICATE_REMINDER command acceptance is NOT proof of
 * external delivery. Command lifecycle and delivery lifecycle are tracked
 * independently and correlated.
 */

export type ReminderCommandState = 'ACCEPTED' | 'SUPERSEDED';

export type ReminderDeliveryState =
  | 'QUEUED'
  | 'PROVIDER_ACCEPTED'
  | 'DELIVERED'
  | 'FAILED'
  | 'UNKNOWN'
  | 'SUPERSEDED';

export interface ReminderLifecycleRecord {
  readonly commandId: string;
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly outboxId: string | null;
  readonly providerRef: string | null;
  readonly commandState: ReminderCommandState;
  readonly deliveryState: ReminderDeliveryState;
  readonly auditRef: string | null;
  readonly telemetryComplete: boolean;
  readonly reconciliationStatus: 'PENDING' | 'CLEAN' | 'DISCREPANCY';
  readonly deliveredAt: string | null;
  readonly failedAt: string | null;
}

export interface ReminderLifecycleTracker {
  recordCommandAccepted(r: Pick<ReminderLifecycleRecord, 'commandId' | 'correlationId' | 'idempotencyKey' | 'auditRef'>): void;
  recordQueued(commandId: string, outboxId: string): void;
  recordProviderAccepted(commandId: string, providerRef: string): void;
  recordDelivered(commandId: string, at: string): void;
  recordFailed(commandId: string, at: string): void;
  recordSuperseded(commandId: string): void;
  recordReconciliation(commandId: string, status: ReminderLifecycleRecord['reconciliationStatus']): void;
  get(commandId: string): ReminderLifecycleRecord | undefined;
  all(): readonly ReminderLifecycleRecord[];
  /** Detects records where duplicate provider dispatches would have happened without idempotency. */
  duplicateProviderDispatches(): readonly string[];
}

export function createReminderLifecycleTracker(): ReminderLifecycleTracker {
  const rows = new Map<string, ReminderLifecycleRecord>();
  const providerDispatchCount = new Map<string, number>();
  return {
    recordCommandAccepted(r) {
      rows.set(r.commandId, {
        commandId: r.commandId,
        correlationId: r.correlationId,
        idempotencyKey: r.idempotencyKey,
        outboxId: null,
        providerRef: null,
        commandState: 'ACCEPTED',
        deliveryState: 'QUEUED',
        auditRef: r.auditRef,
        telemetryComplete: false,
        reconciliationStatus: 'PENDING',
        deliveredAt: null,
        failedAt: null,
      });
    },
    recordQueued(commandId, outboxId) {
      const r = rows.get(commandId); if (!r) return;
      rows.set(commandId, { ...r, outboxId, deliveryState: 'QUEUED' });
    },
    recordProviderAccepted(commandId, providerRef) {
      const r = rows.get(commandId); if (!r) return;
      providerDispatchCount.set(commandId, (providerDispatchCount.get(commandId) ?? 0) + 1);
      rows.set(commandId, { ...r, providerRef, deliveryState: 'PROVIDER_ACCEPTED' });
    },
    recordDelivered(commandId, at) {
      const r = rows.get(commandId); if (!r) return;
      rows.set(commandId, { ...r, deliveryState: 'DELIVERED', deliveredAt: at, telemetryComplete: true });
    },
    recordFailed(commandId, at) {
      const r = rows.get(commandId); if (!r) return;
      rows.set(commandId, { ...r, deliveryState: 'FAILED', failedAt: at, telemetryComplete: true });
    },
    recordSuperseded(commandId) {
      const r = rows.get(commandId); if (!r) return;
      rows.set(commandId, { ...r, commandState: 'SUPERSEDED', deliveryState: 'SUPERSEDED' });
    },
    recordReconciliation(commandId, status) {
      const r = rows.get(commandId); if (!r) return;
      rows.set(commandId, { ...r, reconciliationStatus: status });
    },
    get: (c) => rows.get(c),
    all: () => [...rows.values()],
    duplicateProviderDispatches: () =>
      [...providerDispatchCount.entries()].filter(([, n]) => n > 1).map(([c]) => c),
  };
}
