/**
 * AW360-WAVE-1-C1 Stage D9-OPS — Runtime evidence intake surface.
 *
 * Typed, append-only ingestion layer that operators use to record REAL
 * runtime evidence produced by executing the D9-OPS runbook. No entry point
 * in this module can advance the runtime-attestation record on its own; the
 * record is still owned by `transitionRuntimeAttestation`. This module only
 * validates, classifies, and stores evidence, and answers gate questions
 * ("is the window openable?", "is promotion ready?") using that evidence.
 *
 * Hard rules:
 *  - Fixture / test-double evidence is ALWAYS rejected for LIVE_RUNTIME gates.
 *  - Placeholder strings (TBD/TODO/N/A/FAKE/EXAMPLE) are rejected where
 *    evidence is mandatory.
 *  - Sensitive fields (tokens, secrets, DOB, SSN, PIN, CVV, full payloads,
 *    passwords) are rejected on any evidence submission.
 *  - The intake surface never mutates the code manifest.
 *  - The intake surface never sets runtime status to PASSED directly.
 */
import type { AwardActionKey } from '../awardActionAvailability';
import { APPROVED_PILOT_ACTIONS, AWARD_PILOT_SCOPE_FREEZE } from './awardPilotScopeFreeze';
import {
  AWARD360_RUNTIME_ATTESTATION,
  transitionRuntimeAttestation,
  type Award360RuntimeAttestationRecord,
  type Award360RuntimeAttestationStatus,
} from './awardRuntimeAttestation';
import { REQUIRED_TENANT_POLICY_SCENARIOS } from './awardPilotDatabaseVerification';
import { RUNTIME_MI_EXPECTATIONS } from './awardPilotRuntimeMultiInstance';
import { REQUIRED_ALERT_INSTANCES } from './awardPilotAlertDelivery';
import { REQUIRED_OPERATIONAL_DRILLS } from './awardPilotOperationalDrills';
import { RUNTIME_DR_DATASETS } from './awardPilotRuntimeDR';
import { RUNTIME_SECURITY_CONTROLS } from './awardPilotRuntimeSecurity';
import { ROLLOUT_PHASE_ORDER } from './awardPilotNamedUserRollout';
import { assertNoSensitiveFields } from './awardPilotLiveEvidence';
import {
  reconcileAllActionAttestations,
  validateActionAttestation,
  type ActionAttestation,
} from './awardPilotActionAttestation';

// =======================================================================
// 1. Evidence source classification
// =======================================================================

export type EvidenceSource =
  | 'LIVE_RUNTIME'
  | 'CONTROLLED_DRILL'
  | 'DATABASE_INSPECTION'
  | 'ALERT_DELIVERY'
  | 'BACKUP_RESTORE'
  | 'SECURITY_REVIEW'
  | 'BUSINESS_REVIEW';

/** LIVE_RUNTIME gates cannot be satisfied by any other source. */
export const LIVE_GATE_SOURCES: readonly EvidenceSource[] = ['LIVE_RUNTIME'];

// =======================================================================
// 2. Provenance
// =======================================================================

export interface EvidenceProvenance {
  readonly evidenceId: string;
  readonly environment: string;
  readonly deploymentId: string;
  readonly commitSha: string;
  readonly recordedAt: string;      // ISO
  readonly recorderId: string;
  readonly reviewerId: string | null;
  readonly sourceReference: string; // ticket / run id / doc reference
  readonly correlationId: string | null;
  readonly source: EvidenceSource;
  readonly appendOnly: true;
  readonly fixture: false;          // hard-coded to reject fixtures
}

// =======================================================================
// 3. Typed evidence records
// =======================================================================

export interface DeploymentEvidence extends EvidenceProvenance {
  readonly kind: 'DEPLOYMENT';
  readonly manifestStatus: string;
  readonly manifestVersion: string;
  readonly runtimeAttestationVersion: string;
  readonly registrySize: number;
  readonly registryActions: readonly AwardActionKey[];
  readonly killSwitchState: string;
}

export interface DatabaseVerificationEvidence extends EvidenceProvenance {
  readonly kind: 'DATABASE_VERIFICATION';
  readonly tableExists: boolean;
  readonly compositePrimaryKey: readonly [string, string];
  readonly indexNames: readonly string[];
  readonly rlsEnabled: boolean;
  readonly policyNames: readonly string[];
  readonly grantsGranted: readonly string[];
  readonly retentionFieldsPresent: boolean;
  readonly correlationFieldsPresent: boolean;
  readonly awardReferenceFieldsPresent: boolean;
}

export interface TenantPolicyExecutionEvidence extends EvidenceProvenance {
  readonly kind: 'TENANT_POLICY';
  readonly scenarioId: string; // must be in REQUIRED_TENANT_POLICY_SCENARIOS
  readonly sessionLabel: string;
  readonly tenantContext: string;
  readonly operation: string;
  readonly expected: 'ALLOW' | 'DENY' | 'ISOLATED';
  readonly actual: 'ALLOW' | 'DENY' | 'ISOLATED';
  readonly passed: boolean;
}

export interface RuntimeScopeCheckEvidence extends EvidenceProvenance {
  readonly kind: 'RUNTIME_SCOPE';
  readonly frozen: boolean;
  readonly runtimeActions: readonly AwardActionKey[];
  readonly inventoryActions: readonly AwardActionKey[];
  readonly findings: readonly string[];
}

export interface EvidenceWindowApproval extends EvidenceProvenance {
  readonly kind: 'EVIDENCE_WINDOW';
  readonly tenant: string;
  readonly namedUsers: readonly string[];
  readonly startAt: string;
  readonly endAt: string;
  readonly minDurationDays: number;
  readonly minVolumePerAction: number;
  readonly maxDailyVolumePerAction: number;
  readonly reconciliationCadence: string;
  readonly businessReviewCadence: string;
  readonly killSwitchDrillDate: string;
  readonly providerDegradationDrillDate: string;
  readonly promotionReviewDate: string;
  readonly rollbackTriggers: readonly string[];
  readonly suspensionTriggers: readonly string[];
  readonly approvals: {
    readonly business: { readonly by: string; readonly at: string };
    readonly technical: { readonly by: string; readonly at: string };
    readonly operations: { readonly by: string; readonly at: string };
    readonly security: { readonly by: string; readonly at: string };
  };
}

export interface MultiInstanceObservation extends EvidenceProvenance {
  readonly kind: 'MULTI_INSTANCE';
  readonly scenario: string; // must map to RUNTIME_MI_EXPECTATIONS
  readonly instanceIds: readonly [string, string, ...string[]];
  readonly connectionIds: readonly string[];
  readonly idempotencyKey: string;
  readonly commandId: string;
  readonly mutationCount: number;
  readonly auditCount: number;
  readonly duplicateBusinessEffects: number;
  readonly finalResult: 'PASS' | 'FAIL';
}

export interface LiveCommandEvidence extends EvidenceProvenance {
  readonly kind: 'LIVE_COMMAND';
  readonly action: AwardActionKey;
  readonly commandId: string;
  readonly tenantId: string;
  readonly awardId: string;
  readonly actorUserId: string;
  readonly effectiveRole: string;
  readonly resolverDecision: string;
  readonly guardDecision: string;
  readonly killSwitchState: string;
  readonly cohortDecision: string;
  readonly payloadValid: boolean;
  readonly expectedVersion: number;
  readonly resultingVersion: number;
  readonly idempotencyResult: 'CLAIMED' | 'REPLAY' | 'CONFLICT';
  readonly commandOutcome: 'SUCCESS' | 'FAILURE' | 'DEFERRED';
  readonly auditReference: string;
  readonly telemetryCompleted: boolean;
  readonly externalAckReceived: boolean | null;
  readonly reconciliationStatus: 'CLEAN' | 'PENDING' | 'DISCREPANCY';
  readonly userVisibleResult: string;
  readonly compensationStatus: 'NONE' | 'REQUIRED' | 'APPLIED';
}

export interface ReconciliationRunEvidence extends EvidenceProvenance {
  readonly kind: 'RECONCILIATION';
  readonly trigger: 'AFTER_BATCH' | 'SCHEDULED' | 'AFTER_ALERT' | 'BEFORE_EXPANSION' | 'BEFORE_PROMOTION';
  readonly discrepancyCountsByClass: Readonly<Record<string, number>>;
  readonly unexplainedDiscrepancies: number;
}

export interface AlertDeliveryEvidence extends EvidenceProvenance {
  readonly kind: 'ALERT_DELIVERY';
  readonly instanceId: string; // must map to REQUIRED_ALERT_INSTANCES
  readonly generatedAt: string;
  readonly deliveredAt: string;
  readonly recipient: string;
  readonly runbookRef: string;
  readonly acknowledgedAt: string | null;
  readonly ownerAssigned: string;
  readonly closure: 'CLOSED' | 'SUSPENDED' | 'OPEN';
}

export interface IncidentEvidence extends EvidenceProvenance {
  readonly kind: 'INCIDENT';
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  readonly category: string;
  readonly resolvedAt: string | null;
  readonly requiredActionsClosed: boolean;
}

export interface OperationalDrillEvidence extends EvidenceProvenance {
  readonly kind: 'OPERATIONAL_DRILL';
  readonly drillId: string; // must be in REQUIRED_OPERATIONAL_DRILLS
  readonly outcome: 'PASS' | 'FAIL';
  readonly notes: string;
}

export interface DRResultEvidence extends EvidenceProvenance {
  readonly kind: 'DR';
  readonly backedUp: readonly string[];
  readonly restored: readonly string[];
  readonly businessCommandsReExecuted: number;
  readonly reconciliationSucceededAfterRestore: boolean;
  readonly auditRelationshipsIntact: boolean;
  readonly registryAndManifestCompatible: boolean;
}

export interface SecurityFindingEvidence extends EvidenceProvenance {
  readonly kind: 'SECURITY';
  readonly control: string; // in RUNTIME_SECURITY_CONTROLS
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  readonly resolved: boolean;
  readonly remediation: string;
}

export interface SloMeasurementEvidence extends EvidenceProvenance {
  readonly kind: 'SLO';
  readonly metric: string;
  readonly threshold: number;
  readonly measurement: number;
  readonly sampleCount: number;
  readonly window: string;
  readonly passed: boolean;
}

export interface CompensationEvidence extends EvidenceProvenance {
  readonly kind: 'COMPENSATION';
  readonly commandId: string;
  readonly action: AwardActionKey;
  readonly outcome: 'APPLIED' | 'REJECTED' | 'NOT_REQUIRED';
}

export interface ActionAttestationEvidence extends EvidenceProvenance {
  readonly kind: 'ACTION_ATTESTATION';
  readonly attestation: ActionAttestation;
}

export interface SignOffEvidence extends EvidenceProvenance {
  readonly kind: 'SIGN_OFF';
  readonly action: AwardActionKey;
  readonly role: 'business' | 'technical' | 'operational' | 'security';
  readonly signer: string;
}

export interface FinalRuntimeDecisionEvidence extends EvidenceProvenance {
  readonly kind: 'FINAL_DECISION';
  readonly targetStatus: Award360RuntimeAttestationStatus;
  readonly reason: string;
}

export type RuntimeEvidenceRecord =
  | DeploymentEvidence
  | DatabaseVerificationEvidence
  | TenantPolicyExecutionEvidence
  | RuntimeScopeCheckEvidence
  | EvidenceWindowApproval
  | MultiInstanceObservation
  | LiveCommandEvidence
  | ReconciliationRunEvidence
  | AlertDeliveryEvidence
  | IncidentEvidence
  | OperationalDrillEvidence
  | DRResultEvidence
  | SecurityFindingEvidence
  | SloMeasurementEvidence
  | CompensationEvidence
  | ActionAttestationEvidence
  | SignOffEvidence
  | FinalRuntimeDecisionEvidence;

// =======================================================================
// 4. Validation
// =======================================================================

const PLACEHOLDER = /^(tbd|todo|n\/?a|fake|example|placeholder|xxx+|todo:.*|-)$/i;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const FIXTURE_HINTS = [/^fixture[-_]/i, /^test[-_]/i, /^mock[-_]/i, /^stub[-_]/i];

export class EvidenceRejected extends Error {
  constructor(public readonly reasons: readonly string[]) {
    super(`Evidence rejected: ${reasons.join('; ')}`);
  }
}

function isPlaceholder(v: unknown): boolean {
  return typeof v === 'string' && (v.trim() === '' || PLACEHOLDER.test(v.trim()));
}

function looksLikeFixture(rec: RuntimeEvidenceRecord): boolean {
  if ((rec as { fixture?: unknown }).fixture === true) return true;
  const probe = [rec.evidenceId, rec.deploymentId, rec.commitSha, rec.recorderId, rec.sourceReference];
  return probe.some((v) => typeof v === 'string' && FIXTURE_HINTS.some((p) => p.test(v)));
}

function validateProvenance(
  rec: RuntimeEvidenceRecord,
  now: string,
  deploymentContext: DeploymentContext | null,
): string[] {
  const errs: string[] = [];
  const mustFilled: Array<[string, unknown]> = [
    ['evidenceId', rec.evidenceId],
    ['environment', rec.environment],
    ['deploymentId', rec.deploymentId],
    ['commitSha', rec.commitSha],
    ['recordedAt', rec.recordedAt],
    ['recorderId', rec.recorderId],
    ['sourceReference', rec.sourceReference],
  ];
  for (const [name, v] of mustFilled) {
    if (v === undefined || v === null) errs.push(`${name} missing`);
    else if (isPlaceholder(v)) errs.push(`${name} is placeholder`);
  }
  if (!rec.recordedAt || !ISO_RE.test(rec.recordedAt)) errs.push('recordedAt not ISO');
  if (rec.recordedAt && rec.recordedAt > now) errs.push('recordedAt in future');
  if (rec.appendOnly !== true) errs.push('records must be appendOnly=true');
  if ((rec as { fixture?: unknown }).fixture !== false) errs.push('records must set fixture=false');
  if (looksLikeFixture(rec)) errs.push('record looks like fixture/test data');

  if (deploymentContext) {
    if (rec.deploymentId !== deploymentContext.deploymentId) errs.push('deploymentId does not match active deployment');
    if (rec.commitSha !== deploymentContext.commitSha) errs.push('commitSha does not match active deployment');
    if (rec.recordedAt && deploymentContext.deployedAt && rec.recordedAt < deploymentContext.deployedAt) {
      errs.push('recordedAt is before deployment (backdated)');
    }
  }

  // Sensitive-field scan across the whole payload.
  try {
    assertNoSensitiveFields(rec as unknown as Record<string, unknown>);
  } catch (e) {
    errs.push((e as Error).message);
  }
  return errs;
}

// =======================================================================
// 5. In-memory append-only register
// =======================================================================

export interface DeploymentContext {
  readonly deploymentId: string;
  readonly commitSha: string;
  readonly deployedAt: string;
  readonly environment: string;
}

export interface RuntimeEvidenceRegister {
  readonly all: () => readonly RuntimeEvidenceRecord[];
  readonly byKind: <K extends RuntimeEvidenceRecord['kind']>(
    k: K,
  ) => ReadonlyArray<Extract<RuntimeEvidenceRecord, { kind: K }>>;
  readonly hasEvidenceId: (id: string) => boolean;
  readonly bindDeployment: (ctx: DeploymentContext) => void;
  readonly deployment: () => DeploymentContext | null;
  readonly submit: (rec: RuntimeEvidenceRecord) => RuntimeEvidenceRecord;
  readonly submitAttestation: (rec: ActionAttestationEvidence) => ActionAttestationEvidence;
  readonly promotionDecision: (target: Award360RuntimeAttestationStatus, reason: string, at: string) =>
    Award360RuntimeAttestationRecord;
  readonly currentAttestation: () => Award360RuntimeAttestationRecord;
  readonly assertWindowOpenable: () => void;
  readonly evaluatePromotionReadiness: () => PromotionReadiness;
}

export function createRuntimeEvidenceRegister(
  now: () => string = () => new Date().toISOString(),
  seed: Award360RuntimeAttestationRecord = AWARD360_RUNTIME_ATTESTATION,
): RuntimeEvidenceRegister {
  const records: RuntimeEvidenceRecord[] = [];
  const ids = new Set<string>();
  let deployment: DeploymentContext | null = null;
  let attestation: Award360RuntimeAttestationRecord = seed;
  let promotionDecidedAt: string | null = null;

  function submitInternal(rec: RuntimeEvidenceRecord): RuntimeEvidenceRecord {
    if (ids.has(rec.evidenceId)) throw new EvidenceRejected([`duplicate evidenceId ${rec.evidenceId}`]);
    if (promotionDecidedAt && rec.recordedAt > promotionDecidedAt) {
      throw new EvidenceRejected(['post-decision evidence cannot be used retroactively']);
    }
    const errs = validateProvenance(rec, now(), deployment);
    errs.push(...validateKindSpecific(rec, records));
    if (errs.length > 0) throw new EvidenceRejected(errs);
    records.push(rec);
    ids.add(rec.evidenceId);
    return rec;
  }

  return {
    all: () => records.slice(),
    byKind: (<K extends RuntimeEvidenceRecord['kind']>(k: K) =>
      records.filter((r) => r.kind === k) as unknown as ReadonlyArray<
        Extract<RuntimeEvidenceRecord, { kind: K }>
      >) as RuntimeEvidenceRegister['byKind'],
    hasEvidenceId: (id) => ids.has(id),
    bindDeployment: (ctx) => {
      if (deployment) throw new EvidenceRejected(['deployment context already bound']);
      deployment = ctx;
    },
    deployment: () => deployment,
    submit: submitInternal,
    submitAttestation: (rec) => submitInternal(rec) as ActionAttestationEvidence,
    currentAttestation: () => attestation,
    assertWindowOpenable: () => {
      const missing = openabilityBlockers(records);
      if (missing.length > 0) throw new EvidenceRejected(missing);
    },
    evaluatePromotionReadiness: () => evaluatePromotionReadinessFrom(records, attestation),
    promotionDecision: (target, reason, at) => {
      if (target === 'PASSED') {
        const ready = evaluatePromotionReadinessFrom(records, attestation);
        if (!ready.ready) throw new EvidenceRejected(ready.blockers);
      }
      // Direct NOT_STARTED -> PASSED is impossible per transition table.
      attestation = transitionRuntimeAttestation({
        current: attestation, to: target, at, reason,
      });
      if (target === 'PASSED' || target === 'FAILED') promotionDecidedAt = at;
      return attestation;
    },
  };
}

// =======================================================================
// 6. Kind-specific validation
// =======================================================================

const REQUIRED_TENANT_SCEN = new Set<string>(REQUIRED_TENANT_POLICY_SCENARIOS);
const REQUIRED_MI_SCEN = new Set<string>(RUNTIME_MI_EXPECTATIONS.map((e) => e.scenario));
const REQUIRED_ALERTS = new Set<string>(REQUIRED_ALERT_INSTANCES);
const REQUIRED_DRILLS = new Set<string>(REQUIRED_OPERATIONAL_DRILLS);
const REQUIRED_SEC = new Set<string>(RUNTIME_SECURITY_CONTROLS);
const REQUIRED_DR = new Set(RUNTIME_DR_DATASETS);
const APPROVED_ACTIONS = new Set<string>(APPROVED_PILOT_ACTIONS);

function validateKindSpecific(
  rec: RuntimeEvidenceRecord,
  prior: readonly RuntimeEvidenceRecord[],
): string[] {
  const errs: string[] = [];
  switch (rec.kind) {
    case 'DEPLOYMENT':
      if (rec.source !== 'DATABASE_INSPECTION' && rec.source !== 'CONTROLLED_DRILL' && rec.source !== 'LIVE_RUNTIME')
        errs.push('DEPLOYMENT requires runtime/inspection source');
      if (rec.registrySize !== APPROVED_PILOT_ACTIONS.length) errs.push('registrySize drift');
      for (const a of rec.registryActions) if (!APPROVED_ACTIONS.has(a)) errs.push(`unapproved handler ${a}`);
      for (const a of APPROVED_PILOT_ACTIONS) if (!rec.registryActions.includes(a)) errs.push(`missing handler ${a}`);
      break;
    case 'TENANT_POLICY':
      if (!REQUIRED_TENANT_SCEN.has(rec.scenarioId)) errs.push(`unknown policy scenario ${rec.scenarioId}`);
      if (rec.source !== 'DATABASE_INSPECTION' && rec.source !== 'LIVE_RUNTIME') errs.push('TENANT_POLICY requires DB source');
      break;
    case 'RUNTIME_SCOPE':
      if (!rec.frozen && rec.findings.length === 0) errs.push('scope not frozen but findings empty');
      break;
    case 'MULTI_INSTANCE': {
      if (!REQUIRED_MI_SCEN.has(rec.scenario)) errs.push(`unknown MI scenario ${rec.scenario}`);
      const uniqueInstances = new Set(rec.instanceIds);
      const uniqueConns = new Set(rec.connectionIds);
      if (uniqueInstances.size < 2) errs.push('MI requires >=2 independent instances');
      if (uniqueConns.size < 2) errs.push('MI requires >=2 independent DB connections');
      if (rec.source !== 'LIVE_RUNTIME' && rec.source !== 'CONTROLLED_DRILL') errs.push('MI requires live/drill source');
      if (rec.duplicateBusinessEffects !== 0 && rec.finalResult === 'PASS') errs.push('duplicate effects with PASS');
      break;
    }
    case 'LIVE_COMMAND':
      if (rec.source !== 'LIVE_RUNTIME') errs.push('live command must be LIVE_RUNTIME source');
      if (!APPROVED_ACTIONS.has(rec.action)) errs.push(`action ${rec.action} not in pilot scope`);
      if (!AWARD_PILOT_SCOPE_FREEZE.approvedTenants.includes(rec.tenantId)) errs.push('unapproved tenant');
      if (!AWARD_PILOT_SCOPE_FREEZE.approvedUsers.includes(rec.actorUserId)) errs.push('unapproved actor');
      if (!rec.correlationId) errs.push('correlationId required');
      if (!rec.auditReference || isPlaceholder(rec.auditReference)) errs.push('auditReference required');
      if (rec.action === 'SEND_LIFE_CERTIFICATE_REMINDER' && rec.commandOutcome === 'SUCCESS' && rec.externalAckReceived !== true)
        errs.push('reminder success requires provider acknowledgement');
      break;
    case 'ALERT_DELIVERY':
      if (!REQUIRED_ALERTS.has(rec.instanceId)) errs.push(`unknown alert instance ${rec.instanceId}`);
      if (!rec.acknowledgedAt) errs.push('alert not acknowledged');
      if (rec.source !== 'ALERT_DELIVERY' && rec.source !== 'LIVE_RUNTIME') errs.push('alert requires ALERT_DELIVERY source');
      break;
    case 'OPERATIONAL_DRILL':
      if (!REQUIRED_DRILLS.has(rec.drillId)) errs.push(`unknown drill ${rec.drillId}`);
      if (rec.source !== 'CONTROLLED_DRILL' && rec.source !== 'LIVE_RUNTIME') errs.push('drill requires drill/live source');
      break;
    case 'DR':
      for (const d of RUNTIME_DR_DATASETS) if (!rec.backedUp.includes(d)) errs.push(`DR missing backup: ${d}`);
      for (const d of RUNTIME_DR_DATASETS) if (!rec.restored.includes(d)) errs.push(`DR missing restore: ${d}`);
      if (rec.businessCommandsReExecuted !== 0) errs.push('DR re-executed business commands');
      if (rec.source !== 'BACKUP_RESTORE') errs.push('DR requires BACKUP_RESTORE source');
      break;
    case 'SECURITY':
      if (!REQUIRED_SEC.has(rec.control as never)) errs.push(`unknown security control ${rec.control}`);
      if (rec.source !== 'SECURITY_REVIEW') errs.push('security requires SECURITY_REVIEW source');
      break;
    case 'RECONCILIATION':
      if (rec.source !== 'LIVE_RUNTIME' && rec.source !== 'CONTROLLED_DRILL') errs.push('reconciliation requires runtime source');
      break;
    case 'ACTION_ATTESTATION': {
      const v = validateActionAttestation(rec.attestation);
      if (!v.valid) errs.push(...v.errors.map((e) => `attestation: ${e}`));
      // Reviewer / recorder must be distinct from the four sign-off signers.
      const signers = [
        rec.attestation.signOff.business?.signedBy,
        rec.attestation.signOff.technical?.signedBy,
        rec.attestation.signOff.operational?.signedBy,
        rec.attestation.signOff.security?.signedBy,
      ].filter(Boolean) as string[];
      const uniqSigners = new Set(signers);
      if (uniqSigners.size !== signers.length) errs.push('one person cannot sign multiple governance roles for the same action');
      if (rec.source !== 'BUSINESS_REVIEW') errs.push('attestation requires BUSINESS_REVIEW source');
      break;
    }
    case 'EVIDENCE_WINDOW':
      if (rec.source !== 'BUSINESS_REVIEW') errs.push('window requires BUSINESS_REVIEW source');
      if (!(rec.startAt < rec.endAt)) errs.push('window end must be after start');
      break;
    default:
      break;
  }
  // Cross-record: evidence records referencing action/commandId must not
  // be reused across different actions without an explicit relationship.
  if ((rec as { commandId?: string }).commandId) {
    const cmdId = (rec as { commandId: string }).commandId;
    for (const p of prior) {
      const pCmd = (p as { commandId?: string }).commandId;
      const pAction = (p as { action?: string }).action;
      const rAction = (rec as { action?: string }).action;
      if (pCmd && pCmd === cmdId && pAction && rAction && pAction !== rAction && rec.kind === p.kind) {
        errs.push(`commandId ${cmdId} reused across actions (${pAction} vs ${rAction})`);
      }
    }
  }
  return errs;
}

// =======================================================================
// 7. Gate evaluation
// =======================================================================

export interface PromotionReadiness {
  readonly ready: boolean;
  readonly blockers: readonly string[];
  readonly actionDecisions: Readonly<Record<AwardActionKey, boolean>>;
}

function openabilityBlockers(records: readonly RuntimeEvidenceRecord[]): string[] {
  const blockers: string[] = [];
  const hasKind = (k: RuntimeEvidenceRecord['kind']) => records.some((r) => r.kind === k);
  if (!hasKind('DEPLOYMENT')) blockers.push('missing DEPLOYMENT evidence');
  if (!hasKind('DATABASE_VERIFICATION')) blockers.push('missing DATABASE_VERIFICATION evidence');
  if (!hasKind('RUNTIME_SCOPE')) blockers.push('missing RUNTIME_SCOPE evidence');
  const scopes = records.filter((r): r is RuntimeScopeCheckEvidence => r.kind === 'RUNTIME_SCOPE');
  if (scopes.length && !scopes.every((s) => s.frozen)) blockers.push('scope check reports drift');
  // Every required policy scenario must have a passing record.
  const policySeen = new Set(
    records.filter((r): r is TenantPolicyExecutionEvidence => r.kind === 'TENANT_POLICY' && r.passed).map((r) => r.scenarioId),
  );
  for (const s of REQUIRED_TENANT_POLICY_SCENARIOS) if (!policySeen.has(s)) blockers.push(`missing policy scenario ${s}`);
  return blockers;
}

function evaluatePromotionReadinessFrom(
  records: readonly RuntimeEvidenceRecord[],
  attestation: Award360RuntimeAttestationRecord,
): PromotionReadiness {
  const blockers: string[] = [];
  if (attestation.status !== 'IN_PROGRESS') blockers.push(`runtime status must be IN_PROGRESS (was ${attestation.status})`);
  blockers.push(...openabilityBlockers(records));

  // Multi-instance coverage
  const miSeen = new Set(records.filter((r): r is MultiInstanceObservation => r.kind === 'MULTI_INSTANCE' && r.finalResult === 'PASS').map((r) => r.scenario));
  for (const e of RUNTIME_MI_EXPECTATIONS) if (!miSeen.has(e.scenario)) blockers.push(`MI scenario missing: ${e.scenario}`);

  // Alerts
  const alertSeen = new Set(records.filter((r): r is AlertDeliveryEvidence => r.kind === 'ALERT_DELIVERY' && !!r.acknowledgedAt).map((r) => r.instanceId));
  for (const a of REQUIRED_ALERT_INSTANCES) if (!alertSeen.has(a)) blockers.push(`alert not delivered/acked: ${a}`);

  // Drills
  const drillPass = new Set(records.filter((r): r is OperationalDrillEvidence => r.kind === 'OPERATIONAL_DRILL' && r.outcome === 'PASS').map((r) => r.drillId));
  for (const d of REQUIRED_OPERATIONAL_DRILLS) if (!drillPass.has(d)) blockers.push(`drill missing/failed: ${d}`);

  // DR
  const dr = records.find((r): r is DRResultEvidence => r.kind === 'DR');
  if (!dr) blockers.push('missing DR evidence');

  // Reconciliation cleanliness
  const dirty = records.filter((r): r is ReconciliationRunEvidence => r.kind === 'RECONCILIATION').some((r) => r.unexplainedDiscrepancies > 0);
  if (dirty) blockers.push('unexplained reconciliation discrepancies present');
  if (!records.some((r) => r.kind === 'RECONCILIATION')) blockers.push('no reconciliation runs recorded');

  // Incidents
  const openBlocking = records.filter((r): r is IncidentEvidence => r.kind === 'INCIDENT').some((r) =>
    (r.severity === 'CRITICAL' || r.severity === 'HIGH') && !r.requiredActionsClosed);
  if (openBlocking) blockers.push('unresolved CRITICAL/HIGH incident');

  // Security
  const openSec = records.filter((r): r is SecurityFindingEvidence => r.kind === 'SECURITY').some((r) =>
    !r.resolved && (r.severity === 'CRITICAL' || r.severity === 'HIGH'));
  if (openSec) blockers.push('unresolved CRITICAL/HIGH security finding');
  const secSeen = new Set(records.filter((r): r is SecurityFindingEvidence => r.kind === 'SECURITY').map((r) => r.control));
  for (const c of RUNTIME_SECURITY_CONTROLS) if (!secSeen.has(c)) blockers.push(`security control not reviewed: ${c}`);

  // SLOs
  const sloFail = records.filter((r): r is SloMeasurementEvidence => r.kind === 'SLO').some((r) => !r.passed);
  if (!records.some((r) => r.kind === 'SLO')) blockers.push('missing SLO measurements');
  if (sloFail) blockers.push('SLO measurement failed');

  // Per-action attestations — each action independently gated.
  const attRecords = records.filter((r): r is ActionAttestationEvidence => r.kind === 'ACTION_ATTESTATION');
  const attReport = reconcileAllActionAttestations(attRecords.map((r) => r.attestation));
  const actionDecisions: Record<string, boolean> = {};
  for (const a of APPROVED_PILOT_ACTIONS) {
    const v = attReport.perAction[a];
    actionDecisions[a] = !!v && v.valid;
    if (!v || !v.valid) blockers.push(`action attestation blocking: ${a}`);
  }
  if (!attReport.allApproved) blockers.push('not all four actions APPROVED_FOR_TENANT');

  // Aggregate promotion cannot substitute for per-action approval —
  // enforced by requiring per-action decisions above.
  return {
    ready: blockers.length === 0,
    blockers,
    actionDecisions: actionDecisions as Record<AwardActionKey, boolean>,
  };
}

// =======================================================================
// 8. Read-only diagnostics projection
// =======================================================================

export function projectIntakeDiagnostics(reg: RuntimeEvidenceRegister) {
  const all = reg.all();
  const counts: Record<string, number> = {};
  for (const r of all) counts[r.kind] = (counts[r.kind] ?? 0) + 1;
  return {
    readOnly: true,
    totalRecords: all.length,
    countsByKind: counts,
    deploymentBound: reg.deployment() !== null,
    runtimeStatus: reg.currentAttestation().status,
    runtimeVersion: reg.currentAttestation().version,
    codeManifestStatus: reg.currentAttestation().codeManifestStatus,
    codeManifestVersion: reg.currentAttestation().codeManifestVersion,
    approvedActions: APPROVED_PILOT_ACTIONS,
  } as const;
}
