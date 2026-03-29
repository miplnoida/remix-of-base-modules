/**
 * Unified workflow access logic for Internal Audit Annual Plan submission & approval.
 * 
 * Single source of truth for:
 * - Who can submit a plan
 * - Who can approve/reject/send-back a plan
 * - Why a button is disabled (human-readable reasons)
 * - Which statuses are submittable / approvable
 * 
 * Used by: AuditPlansNew (list), AuditPlanDetail (workspace), PlanApproval (approver screen).
 */

import { useAuth } from '@/contexts/AuthContext';

// ── Constants ────────────────────────────────────────────────────────

export const PLAN_STATUSES = [
  'Draft',
  'Submitted',
  'Under Review',
  'Approved',
  'Rejected',
  'Changes Requested',
  'Amendment Pending',
  'Superseded',
  'Archived',
] as const;

export type PlanStatus = (typeof PLAN_STATUSES)[number];

const SUBMITTABLE_STATUSES: PlanStatus[] = ['Draft', 'Rejected', 'Changes Requested', 'Amendment Pending'];
const APPROVABLE_STATUSES: PlanStatus[] = ['Submitted', 'Under Review'];
const EDITABLE_STATUSES: PlanStatus[] = ['Draft', 'Rejected', 'Changes Requested', 'Amendment Pending'];
const WITHDRAWABLE_STATUSES: PlanStatus[] = ['Submitted'];
const REVISABLE_STATUSES: PlanStatus[] = ['Approved'];

// ── Permission helpers (pure functions, no hooks) ────────────────────

/** Maker/submitter permissions: can create or edit plans → can submit */
const SUBMIT_PERMISSIONS = ['create_audit_plans', 'edit_audit_plans'] as const;

/** Approver permissions */
const APPROVE_PERMISSIONS = ['approve_audit_plans'] as const;

/** Admin-level overrides that grant all capabilities */
const ADMIN_PERMISSIONS = ['admin', 'system_administration'] as const;

function hasAnyPermission(
  checker: (p: string) => boolean,
  permissions: readonly string[],
): boolean {
  return permissions.some(checker);
}

function isAdminUser(checker: (p: string) => boolean): boolean {
  return hasAnyPermission(checker, ADMIN_PERMISSIONS);
}

// ── Submit eligibility ──────────────────────────────────────────────

export interface ActionEligibility {
  /** Whether the button should be rendered at all */
  visible: boolean;
  /** Whether the button should be clickable */
  enabled: boolean;
  /** Human-readable reason when disabled */
  reason?: string;
}

export function getSubmitEligibility(
  hasPermission: (p: string) => boolean,
  planStatus?: string,
): ActionEligibility {
  const admin = isAdminUser(hasPermission);
  const hasMakerPerm = admin || hasAnyPermission(hasPermission, SUBMIT_PERMISSIONS);

  // Always show the button to users who have maker permissions or are admins
  if (!hasMakerPerm) {
    return { visible: true, enabled: false, reason: 'You do not have permission to submit plans. Required: create or edit audit plans.' };
  }

  if (!planStatus || !SUBMITTABLE_STATUSES.includes(planStatus as PlanStatus)) {
    const statusLabel = planStatus || 'unknown';
    return { visible: true, enabled: false, reason: `Plan cannot be submitted in "${statusLabel}" status. Submittable statuses: ${SUBMITTABLE_STATUSES.join(', ')}.` };
  }

  return { visible: true, enabled: true };
}

export function getEditEligibility(
  hasPermission: (p: string) => boolean,
  planStatus?: string,
): ActionEligibility {
  const admin = isAdminUser(hasPermission);
  const hasPerm = admin || hasAnyPermission(hasPermission, SUBMIT_PERMISSIONS);

  if (!hasPerm) {
    return { visible: false, enabled: false, reason: 'No edit permission.' };
  }

  if (!planStatus || !EDITABLE_STATUSES.includes(planStatus as PlanStatus)) {
    return { visible: false, enabled: false, reason: `Plan is locked in "${planStatus}" status.` };
  }

  return { visible: true, enabled: true };
}

export function getWithdrawEligibility(
  hasPermission: (p: string) => boolean,
  planStatus?: string,
): ActionEligibility {
  const admin = isAdminUser(hasPermission);
  const hasPerm = admin || hasAnyPermission(hasPermission, SUBMIT_PERMISSIONS);

  if (!hasPerm) {
    return { visible: false, enabled: false };
  }

  if (!planStatus || !WITHDRAWABLE_STATUSES.includes(planStatus as PlanStatus)) {
    return { visible: false, enabled: false };
  }

  return { visible: true, enabled: true };
}

export function getReviseEligibility(
  hasPermission: (p: string) => boolean,
  planStatus?: string,
): ActionEligibility {
  const admin = isAdminUser(hasPermission);
  const hasPerm = admin || hasAnyPermission(hasPermission, SUBMIT_PERMISSIONS);

  if (!hasPerm) {
    return { visible: false, enabled: false };
  }

  if (!planStatus || !REVISABLE_STATUSES.includes(planStatus as PlanStatus)) {
    return { visible: false, enabled: false };
  }

  return { visible: true, enabled: true };
}

// ── Approve / Reject / Send-back eligibility ────────────────────────

export function getApproveEligibility(
  hasPermission: (p: string) => boolean,
  planStatus?: string,
): ActionEligibility {
  const admin = isAdminUser(hasPermission);
  const hasApproverPerm = admin || hasAnyPermission(hasPermission, APPROVE_PERMISSIONS);

  if (!hasApproverPerm) {
    return { visible: false, enabled: false, reason: 'You do not have plan approval permission.' };
  }

  if (!planStatus || !APPROVABLE_STATUSES.includes(planStatus as PlanStatus)) {
    return { visible: true, enabled: false, reason: `Plan is in "${planStatus}" status and cannot be approved right now.` };
  }

  return { visible: true, enabled: true };
}

// ── React hook convenience wrapper ──────────────────────────────────

export function usePlanWorkflowAccess(planStatus?: string) {
  const { hasPermission } = useAuth();

  return {
    submit: getSubmitEligibility(hasPermission, planStatus),
    edit: getEditEligibility(hasPermission, planStatus),
    withdraw: getWithdrawEligibility(hasPermission, planStatus),
    revise: getReviseEligibility(hasPermission, planStatus),
    approve: getApproveEligibility(hasPermission, planStatus),
    /** Whether the user has approver-level access */
    isApprover: isAdminUser(hasPermission) || hasAnyPermission(hasPermission, APPROVE_PERMISSIONS),
    /** Whether the user has maker-level access */
    isMaker: isAdminUser(hasPermission) || hasAnyPermission(hasPermission, SUBMIT_PERMISSIONS),
  };
}
