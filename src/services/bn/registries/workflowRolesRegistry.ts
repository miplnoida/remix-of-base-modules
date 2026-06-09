/**
 * Workflow Roles Registry — FALLBACK ONLY.
 *
 * Source of truth: `public.roles` (DB). Use
 *   - `fetchWorkflowRoles()` from `@/services/bn/workflowRoleCatalogService`
 *   - `useWorkflowRoles()` from `@/hooks/bn/useWorkflowRoles`
 * for runtime role lookups.
 *
 * This static list exists only so offline tooling / first-paint code paths
 * still type-check and have something to fall back to if the DB fetch fails.
 * Keep loosely in sync with public.roles.
 */
export const BN_WORKFLOW_ROLES = [
  // Generic operational roles
  'INTAKE_OFFICER',
  'EVIDENCE_OFFICER',
  'MEDICAL_OFFICER',
  'MEDICAL_BOARD',
  'CLAIMS_SUPERVISOR',
  'FINANCE_OFFICER',
  'FINANCE_SUPERVISOR',
  'DIRECTOR',
  'COMPLIANCE_OFFICER',
  // BN-prefixed roles seeded in public.roles and used by bn_workbasket /
  // bn_escalation_policy / governance workflows. Keep in sync with DB seed.
  'BN_INTAKE_OFFICER',
  'BN_CLAIMS_OFFICER',
  'BN_ELIGIBILITY_OFFICER',
  'BN_SENIOR_ELIGIBILITY_OFFICER',
  'BN_CALCULATION_OFFICER',
  'BN_DOCUMENT_OFFICER',
  'BN_PAYMENT_OFFICER',
  'BN_AWARD_OFFICER',
  'BN_SUPERVISOR',
  'BN_MANAGER',
  'BN_FINANCE_SUPERVISOR',
  'BN_DIRECTOR',
  'BN_AUDITOR',
  'BN_RULE_AUTHOR',
  'BN_RULE_TECHNICAL_REVIEWER',
  'BN_RULE_LEGAL_APPROVER',
  'BN_PRODUCT_MANAGER',
  'BN_PRODUCT_APPROVER',
  'BN_CONFIG_ADMIN',
  'BN_BENEFIT_OFFICER_GENERALIST',
] as const;
export type BnWorkflowRole = (typeof BN_WORKFLOW_ROLES)[number];


export const BN_ESCALATION_TRIGGERS = [
  { value: 'SLA_BREACH', label: 'SLA Breach' },
  { value: 'MANUAL', label: 'Manual Escalation' },
  { value: 'THRESHOLD', label: 'Threshold Exceeded' },
  { value: 'EXCEPTION', label: 'Exception Raised' },
] as const;

export const BN_ESCALATION_SEVERITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
] as const;

export const BN_PRODUCT_CATEGORIES = [
  { value: 'SHORT_TERM', label: 'Short-Term Benefits' },
  { value: 'LONG_TERM', label: 'Long-Term Benefits' },
  { value: 'MEDICAL', label: 'Medical Benefits' },
  { value: 'SURVIVOR', label: 'Survivor Benefits' },
] as const;
