export interface AutoViolationCreationRule {
  ruleId: string;
  triggerEvent: string;
  violationType: string;
  enabled: boolean;
  description: string;
}

export interface ViolationPrefixConfig {
  automaticPrefix: string;
  manualPrefix: string;
  numberFormat: string;
  startingNumber: number;
  currentNumber: number;
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
  autoViolationCreationRules: AutoViolationCreationRule[];
  violationPrefixConfig: ViolationPrefixConfig;
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
