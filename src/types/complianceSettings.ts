export interface AutoCaseCreationRule {
  ruleId: string;
  triggerEvent: string;
  caseType: string;
  enabled: boolean;
  description: string;
}

export interface ComplianceSettingsPolicy {
  policyId: string;
  policyVersion: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  c3GracePeriodDays: number;
  c3SubmissionDeadlineDay: number;
  paymentDueDateDay: number;
  penaltyRatePercent: number;
  interestRatePercent: number;
  penaltyCalculationFrequency: 'daily' | 'monthly';
  minimumAuditFrequencyMonths: number;
  arrearsEscalationThreshold: number;
  autoCaseCreationRules: AutoCaseCreationRule[];
  createdBy: string;
  createdDate: string;
  activatedBy?: string;
  activatedDate?: string;
  deactivatedBy?: string;
  deactivatedDate?: string;
  notes?: string;
}

export interface ComplianceSettingsHistory {
  policies: ComplianceSettingsPolicy[];
  activePolicy: ComplianceSettingsPolicy | null;
}
