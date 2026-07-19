/**
 * AW360-WAVE-1-C1 Stage D8 — Per-action production evidence tracking.
 *
 * Promotion decisions are per-action. Aggregate totals are informational
 * only.
 */
import type { AwardActionKey } from '../awardActionAvailability';
import { APPROVED_PILOT_ACTIONS } from './awardPilotScopeFreeze';

export interface PerActionEvidence {
  readonly action: AwardActionKey;
  readonly attempted: number;
  readonly successful: number;
  readonly denied: number;
  readonly duplicateReplays: number;
  readonly versionConflicts: number;
  readonly validationFailures: number;
  readonly handlerFailures: number;
  readonly providerFailures: number;
  readonly compensationsApplied: number;
  readonly reconciliationDiscrepancies: number;
  readonly p50LatencyMs: number;
  readonly p95LatencyMs: number;
  readonly p99LatencyMs: number;
  readonly participatingUsers: readonly string[];
  readonly participatingTenants: readonly string[];
  readonly businessAccepted: boolean;
  readonly openIncidents: number;
}

export interface PerActionEvidenceStore {
  update(action: AwardActionKey, patch: Partial<Omit<PerActionEvidence, 'action'>>): void;
  get(action: AwardActionKey): PerActionEvidence;
  all(): readonly PerActionEvidence[];
}

function empty(action: AwardActionKey): PerActionEvidence {
  return {
    action,
    attempted: 0,
    successful: 0,
    denied: 0,
    duplicateReplays: 0,
    versionConflicts: 0,
    validationFailures: 0,
    handlerFailures: 0,
    providerFailures: 0,
    compensationsApplied: 0,
    reconciliationDiscrepancies: 0,
    p50LatencyMs: 0,
    p95LatencyMs: 0,
    p99LatencyMs: 0,
    participatingUsers: [],
    participatingTenants: [],
    businessAccepted: false,
    openIncidents: 0,
  };
}

export function createPerActionEvidenceStore(): PerActionEvidenceStore {
  const rows = new Map<AwardActionKey, PerActionEvidence>();
  for (const a of APPROVED_PILOT_ACTIONS) rows.set(a, empty(a));
  return {
    update(action, patch) {
      const cur = rows.get(action) ?? empty(action);
      rows.set(action, { ...cur, ...patch });
    },
    get(action) {
      return rows.get(action) ?? empty(action);
    },
    all: () => [...rows.values()],
  };
}
