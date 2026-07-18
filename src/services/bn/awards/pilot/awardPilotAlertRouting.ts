/**
 * AW360-WAVE-1-C1 Stage D7 — Production alert routing.
 *
 * Named operational recipients + delivery certification for immediate-
 * severity alerts. Every immediate alert must include the correlation ID
 * and reference a runbook.
 */
import type { PilotAlert } from './awardPilotMetrics';
import { PILOT_RUNBOOKS } from './awardPilotRunbooks';

export type PilotAlertChannel = 'PAGE' | 'EMAIL' | 'SLACK' | 'SMS';

export interface PilotAlertRecipient {
  readonly recipientId: string;
  readonly displayName: string;
  readonly channels: readonly PilotAlertChannel[];
  readonly role: 'operational_owner' | 'technical_owner' | 'incident_owner' | 'kill_switch_owner';
}

export const PILOT_ALERT_RECIPIENTS: readonly PilotAlertRecipient[] = [
  {
    recipientId: 'ops-benefits-lead',
    displayName: 'Ops Benefits Lead',
    channels: ['PAGE', 'EMAIL', 'SLACK'],
    role: 'operational_owner',
  },
  {
    recipientId: 'award360-tech-lead',
    displayName: 'Award 360 Tech Lead',
    channels: ['PAGE', 'EMAIL', 'SLACK'],
    role: 'technical_owner',
  },
  {
    recipientId: 'incident-commander',
    displayName: 'Incident Commander',
    channels: ['PAGE', 'SMS'],
    role: 'incident_owner',
  },
  {
    recipientId: 'kill-switch-owner',
    displayName: 'Kill-switch Owner',
    channels: ['PAGE', 'EMAIL'],
    role: 'kill_switch_owner',
  },
];

export interface PilotAlertDelivery {
  readonly alert: PilotAlert;
  readonly recipientId: string;
  readonly channel: PilotAlertChannel;
  readonly runbookRef: string;
  readonly deliveredAt: string;
}

export interface PilotAlertRouter {
  route(alert: PilotAlert, opts?: { readonly now?: () => Date }): readonly PilotAlertDelivery[];
  history(): readonly PilotAlertDelivery[];
}

/** Runbook to route each alert type to. */
const ALERT_RUNBOOK_MAP: Record<string, string> = {
  AUDIT_PERSISTENCE_FAILURE: 'RUNBOOK_AUDIT_FAILURE_RESPONSE',
  EXECUTION_OUTSIDE_COHORT: 'RUNBOOK_COHORT_BREACH_RESPONSE',
  CROSS_TENANT_MISMATCH: 'RUNBOOK_CROSS_TENANT_INCIDENT_RESPONSE',
  RECONCILIATION_DISCREPANCY: 'RUNBOOK_RECONCILIATION_DISCREPANCY_RESPONSE',
};

export function createPilotAlertRouter(): PilotAlertRouter {
  const deliveries: PilotAlertDelivery[] = [];
  return {
    route: (alert, opts) => {
      const now = (opts?.now ?? (() => new Date()))();
      const runbookRef = ALERT_RUNBOOK_MAP[alert.type] ?? 'RUNBOOK_INCIDENT_ESCALATION';
      const runbookExists = PILOT_RUNBOOKS.some((r) => r.id === runbookRef);
      if (alert.severity === 'IMMEDIATE') {
        if (!alert.correlationId) {
          throw new Error(`Immediate alert missing correlation ID: ${alert.type}`);
        }
        if (!runbookExists) {
          throw new Error(`Immediate alert missing runbook: ${runbookRef}`);
        }
      }
      const batch: PilotAlertDelivery[] = [];
      for (const recipient of PILOT_ALERT_RECIPIENTS) {
        for (const channel of recipient.channels) {
          if (alert.severity !== 'IMMEDIATE' && channel === 'SMS') continue;
          const delivery: PilotAlertDelivery = {
            alert,
            recipientId: recipient.recipientId,
            channel,
            runbookRef,
            deliveredAt: now.toISOString(),
          };
          batch.push(delivery);
          deliveries.push(delivery);
        }
      }
      return batch;
    },
    history: () => deliveries.slice(),
  };
}
