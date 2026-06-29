/**
 * CE Entity Status Catalog
 *
 * Single source of truth for the status enums + action→transition map of each
 * Compliance & Enforcement entity governed by the centralized workflow engine.
 *
 * Mirrors the data seeded by the `ce_status_*` workflow migrations and the
 * `ce_apply_status_transition` RPC. Used by:
 *   - WorkflowMappingPage to render entity-aware hints when admins map an
 *     `<entity>.status.<ACTION>` event to a workflow definition.
 *   - `scripts/ce-workflow-lint.ts` to verify the catalog and the runtime
 *     mappings are in sync.
 *
 * Keep this list aligned with COMPLIANCE_EVENT_KEYS in
 * complianceWorkflowMappingService.ts.
 */
import type { CeEntityType } from './ceWorkflowStatusService';

export interface CeStatusAction {
  /** Action code that flows through ce_apply_status_transition. */
  code: string;
  /** Human label shown in the admin UI. */
  label: string;
  /** Allowed source statuses for this action. */
  from: string[];
  /** Resulting status after the action is applied. */
  to: string;
}

export interface CeEntityStatusDescriptor {
  entityType: CeEntityType;
  /** Display label (singular). */
  label: string;
  /** Event-key prefix used by ce_workflow_mappings (`<prefix>.status.<CODE>`). */
  eventPrefix: string;
  /** Complete status enum for this entity. */
  statuses: string[];
  /** All action transitions. */
  actions: CeStatusAction[];
}

export const CE_ENTITY_STATUS_CATALOG: Record<CeEntityType, CeEntityStatusDescriptor> = {
  violation: {
    entityType: 'violation',
    label: 'Violation',
    eventPrefix: 'violation',
    statuses: ['DRAFT', 'IN_PROGRESS', 'UNDER_REVIEW', 'ESCALATED', 'RESOLVED', 'CANCELLED', 'REOPENED', 'CLOSED'],
    actions: [
      { code: 'START_WORK', label: 'Start Work', from: ['DRAFT'], to: 'IN_PROGRESS' },
      { code: 'MOVE_TO_REVIEW', label: 'Move to Review', from: ['IN_PROGRESS'], to: 'UNDER_REVIEW' },
      { code: 'ESCALATE', label: 'Escalate', from: ['IN_PROGRESS', 'UNDER_REVIEW'], to: 'ESCALATED' },
      { code: 'RESOLVE', label: 'Resolve', from: ['IN_PROGRESS', 'UNDER_REVIEW', 'ESCALATED'], to: 'RESOLVED' },
      { code: 'CANCEL', label: 'Cancel', from: ['DRAFT', 'IN_PROGRESS'], to: 'CANCELLED' },
      { code: 'REOPEN', label: 'Reopen', from: ['RESOLVED', 'CLOSED'], to: 'REOPENED' },
      { code: 'CLOSE', label: 'Close', from: ['RESOLVED'], to: 'CLOSED' },
    ],
  },
  case: {
    entityType: 'case',
    label: 'Case',
    eventPrefix: 'case',
    statuses: ['OPEN', 'ASSIGNED', 'INVESTIGATING', 'ESCALATED', 'LEGAL_RECOMMENDED', 'LEGAL_ESCALATED', 'ARRANGEMENT_ACTIVE', 'COMPLETED', 'RESOLVED', 'CLOSED', 'REOPENED'],
    actions: [
      { code: 'ASSIGN', label: 'Assign', from: ['OPEN'], to: 'ASSIGNED' },
      { code: 'INVESTIGATE', label: 'Start Investigation', from: ['ASSIGNED'], to: 'INVESTIGATING' },
      { code: 'ESCALATE', label: 'Escalate', from: ['INVESTIGATING'], to: 'ESCALATED' },
      { code: 'RECOMMEND_LEGAL', label: 'Recommend Legal', from: ['INVESTIGATING', 'ESCALATED'], to: 'LEGAL_RECOMMENDED' },
      { code: 'ESCALATE_LEGAL', label: 'Escalate to Legal', from: ['LEGAL_RECOMMENDED'], to: 'LEGAL_ESCALATED' },
      { code: 'ACTIVATE_ARRANGEMENT', label: 'Activate Arrangement', from: ['INVESTIGATING', 'ESCALATED'], to: 'ARRANGEMENT_ACTIVE' },
      { code: 'COMPLETE', label: 'Complete', from: ['ARRANGEMENT_ACTIVE'], to: 'COMPLETED' },
      { code: 'RESOLVE', label: 'Resolve', from: ['INVESTIGATING', 'COMPLETED'], to: 'RESOLVED' },
      { code: 'CLOSE', label: 'Close', from: ['RESOLVED'], to: 'CLOSED' },
      { code: 'REOPEN', label: 'Reopen', from: ['CLOSED', 'RESOLVED'], to: 'REOPENED' },
    ],
  },
  notice: {
    entityType: 'notice',
    label: 'Notice',
    eventPrefix: 'notice',
    statuses: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SENT', 'DELIVERED', 'ACKNOWLEDGED', 'FAILED', 'CANCELLED'],
    actions: [
      { code: 'APPROVE', label: 'Approve', from: ['PENDING_APPROVAL'], to: 'APPROVED' },
      { code: 'REJECT', label: 'Reject', from: ['PENDING_APPROVAL'], to: 'REJECTED' },
      { code: 'SEND', label: 'Send', from: ['APPROVED'], to: 'SENT' },
      { code: 'MARK_DELIVERED', label: 'Mark Delivered', from: ['SENT'], to: 'DELIVERED' },
      { code: 'ACKNOWLEDGE', label: 'Acknowledge', from: ['DELIVERED'], to: 'ACKNOWLEDGED' },
      { code: 'FAIL', label: 'Mark Failed', from: ['SENT'], to: 'FAILED' },
      { code: 'CANCEL', label: 'Cancel', from: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'], to: 'CANCELLED' },
    ],
  },
  inspection: {
    entityType: 'inspection',
    label: 'Inspection',
    eventPrefix: 'inspection',
    statuses: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'RESCHEDULED', 'CANCELLED'],
    actions: [
      { code: 'START', label: 'Start', from: ['SCHEDULED'], to: 'IN_PROGRESS' },
      { code: 'COMPLETE', label: 'Complete', from: ['IN_PROGRESS'], to: 'COMPLETED' },
      { code: 'RESCHEDULE', label: 'Reschedule', from: ['SCHEDULED', 'IN_PROGRESS'], to: 'RESCHEDULED' },
      { code: 'CANCEL', label: 'Cancel', from: ['SCHEDULED', 'RESCHEDULED'], to: 'CANCELLED' },
    ],
  },
  arrangement: {
    entityType: 'arrangement',
    label: 'Payment Arrangement',
    eventPrefix: 'arrangement',
    statuses: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
    actions: [
      { code: 'SUBMIT', label: 'Submit', from: ['DRAFT'], to: 'SUBMITTED' },
      { code: 'APPROVE', label: 'Approve', from: ['SUBMITTED'], to: 'APPROVED' },
      { code: 'REJECT', label: 'Reject', from: ['SUBMITTED'], to: 'REJECTED' },
      { code: 'COMPLETE', label: 'Complete', from: ['APPROVED', 'ACTIVE'], to: 'COMPLETED' },
      { code: 'CANCEL', label: 'Cancel', from: ['DRAFT', 'SUBMITTED', 'APPROVED', 'ACTIVE'], to: 'CANCELLED' },
    ],
  },
  waiver: {
    entityType: 'waiver',
    label: 'Waiver',
    eventPrefix: 'waiver',
    statuses: ['PENDING', 'APPROVED', 'REJECTED', 'APPLIED', 'CANCELLED'],
    actions: [
      { code: 'APPROVE', label: 'Approve', from: ['PENDING'], to: 'APPROVED' },
      { code: 'REJECT', label: 'Reject', from: ['PENDING'], to: 'REJECTED' },
      { code: 'APPLY', label: 'Apply', from: ['APPROVED'], to: 'APPLIED' },
      { code: 'CANCEL', label: 'Cancel', from: ['PENDING', 'APPROVED'], to: 'CANCELLED' },
    ],
  },
  legal_recommendation: {
    entityType: 'legal_recommendation',
    label: 'Legal Recommendation',
    eventPrefix: 'legal_recommendation',
    statuses: ['PENDING_REVIEW', 'APPROVED_FOR_REFERRAL', 'REJECTED', 'REFERRAL_CREATED'],
    actions: [
      { code: 'APPROVE', label: 'Approve for Referral', from: ['PENDING_REVIEW'], to: 'APPROVED_FOR_REFERRAL' },
      { code: 'REJECT', label: 'Reject', from: ['PENDING_REVIEW'], to: 'REJECTED' },
      { code: 'CREATE_REFERRAL', label: 'Create Referral', from: ['APPROVED_FOR_REFERRAL'], to: 'REFERRAL_CREATED' },
    ],
  },
  legal_referral: {
    entityType: 'legal_referral',
    label: 'Legal Referral',
    eventPrefix: 'legal_referral',
    statuses: ['DRAFT', 'SUBMITTED_TO_LEGAL', 'ACCEPTED_BY_LEGAL', 'REJECTED', 'IN_LEGAL_PROCEEDINGS', 'CLOSED'],
    actions: [
      { code: 'SUBMIT', label: 'Submit to Legal', from: ['DRAFT'], to: 'SUBMITTED_TO_LEGAL' },
      { code: 'ACCEPT', label: 'Accept', from: ['SUBMITTED_TO_LEGAL'], to: 'ACCEPTED_BY_LEGAL' },
      { code: 'REJECT', label: 'Reject', from: ['SUBMITTED_TO_LEGAL'], to: 'REJECTED' },
      { code: 'START_PROCEEDINGS', label: 'Start Proceedings', from: ['ACCEPTED_BY_LEGAL'], to: 'IN_LEGAL_PROCEEDINGS' },
      { code: 'CLOSE', label: 'Close', from: ['DRAFT', 'ACCEPTED_BY_LEGAL', 'IN_LEGAL_PROCEEDINGS'], to: 'CLOSED' },
    ],
  },
};

/** Parse an event key like `violation.status.START_WORK` into its parts. */
export function parseStatusEventKey(eventKey: string):
  | { entity: CeEntityType; descriptor: CeEntityStatusDescriptor; action: CeStatusAction }
  | null {
  const m = eventKey.match(/^([a-z_]+)\.status\.([A-Z_]+)$/);
  if (!m) return null;
  const [, prefix, code] = m;
  const entry = Object.values(CE_ENTITY_STATUS_CATALOG).find((d) => d.eventPrefix === prefix);
  if (!entry) return null;
  const action = entry.actions.find((a) => a.code === code);
  if (!action) return null;
  return { entity: entry.entityType, descriptor: entry, action };
}

/** Enumerate every `<entity>.status.<ACTION>` event key derivable from the catalog. */
export function listCatalogStatusEventKeys(): string[] {
  const out: string[] = [];
  for (const d of Object.values(CE_ENTITY_STATUS_CATALOG)) {
    for (const a of d.actions) out.push(`${d.eventPrefix}.status.${a.code}`);
  }
  return out.sort();
}
