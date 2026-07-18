/**
 * AW360-WAVE-1-C1 Stage D7 — Incident governance.
 *
 * Severity classification for Award 360 pilot incidents. Critical incidents
 * automatically demand pilot suspension, kill-switch activation, incident
 * record, reconciliation, technical review, business-owner notification and
 * formal restart approval.
 */
export type PilotIncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type PilotIncidentCategory =
  | 'CROSS_TENANT_EXECUTION'
  | 'UNAUTHORISED_MUTATION'
  | 'MUTATION_WITHOUT_AUDIT'
  | 'CORRUPT_OR_UNRECONCILED_STATE'
  | 'RECONCILIATION_DISCREPANCY'
  | 'HANDLER_FAILURE_SPIKE'
  | 'PROVIDER_TIMEOUT'
  | 'COHORT_VIOLATION'
  | 'AUDIT_PERSISTENCE_FAILURE'
  | 'OTHER';

export interface PilotIncidentRecord {
  readonly incidentId: string;
  readonly category: PilotIncidentCategory;
  readonly severity: PilotIncidentSeverity;
  readonly openedAt: string;
  readonly closedAt: string | null;
  readonly correlationIds: readonly string[];
  readonly narrative: string;
  readonly requiredActions: readonly PilotIncidentRequiredAction[];
  readonly completedActions: readonly PilotIncidentRequiredAction[];
  readonly restartApprovalRecorded: boolean;
}

export type PilotIncidentRequiredAction =
  | 'PILOT_SUSPENSION'
  | 'KILL_SWITCH_ACTIVATION'
  | 'INCIDENT_RECORD'
  | 'RECONCILIATION'
  | 'TECHNICAL_REVIEW'
  | 'BUSINESS_OWNER_NOTIFICATION'
  | 'FORMAL_RESTART_APPROVAL';

const CRITICAL_CATEGORIES = new Set<PilotIncidentCategory>([
  'CROSS_TENANT_EXECUTION',
  'UNAUTHORISED_MUTATION',
  'MUTATION_WITHOUT_AUDIT',
  'CORRUPT_OR_UNRECONCILED_STATE',
]);

export function classifyIncidentSeverity(category: PilotIncidentCategory): PilotIncidentSeverity {
  if (CRITICAL_CATEGORIES.has(category)) return 'CRITICAL';
  if (category === 'RECONCILIATION_DISCREPANCY' || category === 'AUDIT_PERSISTENCE_FAILURE') {
    return 'HIGH';
  }
  if (category === 'PROVIDER_TIMEOUT' || category === 'COHORT_VIOLATION') return 'MEDIUM';
  return 'LOW';
}

export const CRITICAL_REQUIRED_ACTIONS: readonly PilotIncidentRequiredAction[] = [
  'PILOT_SUSPENSION',
  'KILL_SWITCH_ACTIVATION',
  'INCIDENT_RECORD',
  'RECONCILIATION',
  'TECHNICAL_REVIEW',
  'BUSINESS_OWNER_NOTIFICATION',
  'FORMAL_RESTART_APPROVAL',
];

export function requiredActionsFor(category: PilotIncidentCategory): readonly PilotIncidentRequiredAction[] {
  const sev = classifyIncidentSeverity(category);
  if (sev === 'CRITICAL') return CRITICAL_REQUIRED_ACTIONS;
  if (sev === 'HIGH') return ['INCIDENT_RECORD', 'RECONCILIATION', 'TECHNICAL_REVIEW'];
  if (sev === 'MEDIUM') return ['INCIDENT_RECORD', 'TECHNICAL_REVIEW'];
  return ['INCIDENT_RECORD'];
}

export interface PilotIncidentRegister {
  open(input: Omit<PilotIncidentRecord,
    'severity' | 'requiredActions' | 'completedActions' | 'closedAt' | 'restartApprovalRecorded'>): PilotIncidentRecord;
  markActionComplete(incidentId: string, action: PilotIncidentRequiredAction): void;
  recordRestartApproval(incidentId: string, approver: string): void;
  close(incidentId: string, at?: string): PilotIncidentRecord;
  list(): readonly PilotIncidentRecord[];
  openIncidents(): readonly PilotIncidentRecord[];
  hasOpenAtSeverityOrAbove(sev: PilotIncidentSeverity): boolean;
}

const SEV_ORDER: Record<PilotIncidentSeverity, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

export function createPilotIncidentRegister(now: () => Date = () => new Date()): PilotIncidentRegister {
  const store = new Map<string, PilotIncidentRecord>();
  return {
    open: (input) => {
      const severity = classifyIncidentSeverity(input.category);
      const rec: PilotIncidentRecord = {
        ...input,
        severity,
        closedAt: null,
        requiredActions: requiredActionsFor(input.category),
        completedActions: [],
        restartApprovalRecorded: false,
      };
      store.set(input.incidentId, rec);
      return rec;
    },
    markActionComplete: (incidentId, action) => {
      const cur = store.get(incidentId);
      if (!cur) throw new Error(`Incident ${incidentId} not found`);
      if (!cur.requiredActions.includes(action)) return;
      if (cur.completedActions.includes(action)) return;
      store.set(incidentId, {
        ...cur,
        completedActions: [...cur.completedActions, action],
      });
    },
    recordRestartApproval: (incidentId) => {
      const cur = store.get(incidentId);
      if (!cur) throw new Error(`Incident ${incidentId} not found`);
      store.set(incidentId, { ...cur, restartApprovalRecorded: true });
    },
    close: (incidentId, at) => {
      const cur = store.get(incidentId);
      if (!cur) throw new Error(`Incident ${incidentId} not found`);
      const missing = cur.requiredActions.filter((a) => !cur.completedActions.includes(a));
      if (missing.length > 0) {
        throw new Error(`Cannot close ${incidentId}: missing required actions ${missing.join(', ')}`);
      }
      if (cur.severity === 'CRITICAL' && !cur.restartApprovalRecorded) {
        throw new Error(`Cannot close critical incident ${incidentId}: restart approval required`);
      }
      const closed: PilotIncidentRecord = {
        ...cur,
        closedAt: at ?? now().toISOString(),
      };
      store.set(incidentId, closed);
      return closed;
    },
    list: () => Array.from(store.values()),
    openIncidents: () => Array.from(store.values()).filter((r) => r.closedAt === null),
    hasOpenAtSeverityOrAbove: (sev) => {
      const target = SEV_ORDER[sev];
      return Array.from(store.values()).some(
        (r) => r.closedAt === null && SEV_ORDER[r.severity] >= target,
      );
    },
  };
}
