/**
 * Workflow Roles Registry — canonical operational roles used by
 * Workbaskets, Escalation Policies, and Transition Matrix.
 * Keep in sync with backend role catalogue.
 */
export const BN_WORKFLOW_ROLES = [
  'INTAKE_OFFICER',
  'EVIDENCE_OFFICER',
  'MEDICAL_OFFICER',
  'MEDICAL_BOARD',
  'CLAIMS_SUPERVISOR',
  'FINANCE_OFFICER',
  'FINANCE_SUPERVISOR',
  'DIRECTOR',
  'COMPLIANCE_OFFICER',
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
