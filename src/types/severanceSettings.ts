// Severance Settings Types - Versioned Configuration System

export type SeveranceSchemeStatus = 'Active' | 'Inactive';
export type EmployeeType = 'PERM' | 'TEMP' | 'CONTRACT' | 'GOVT' | 'CASUAL';
export type PeriodType = 'Weekly' | 'Monthly' | 'Fortnightly' | 'Annual';
export type PenaltyRateType = 'PercentPerMonth' | 'PercentPerDay' | 'FlatAmount';

// Main Severance Scheme (Top-Level Versioned Container)
export interface SeveranceScheme {
  schemeId: string;
  schemeName: string;
  description: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isCurrent: boolean;
  status: SeveranceSchemeStatus;
  createdBy: string;
  createdDate: string;
  updatedBy?: string;
  updatedDate?: string;
  notes?: string;
}

// Contribution Rates & Eligibility
export interface SeveranceRateRule {
  ruleId: string;
  schemeId: string;
  employeeType: EmployeeType;
  tenureFromMonths: number;
  tenureToMonths: number | null;
  employeeRatePercent: number;
  employerRatePercent: number;
  vestingCondition: string;
  appliesToComponents: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: SeveranceSchemeStatus;
  notes?: string;
}

// Insurable Severance Earnings
export interface SeveranceEarningsComponent {
  componentId: string;
  schemeId: string;
  componentCode: string;
  componentName: string;
  includeInSeveranceBase: boolean;
  includeInAverageEarnings: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: SeveranceSchemeStatus;
  notes?: string;
}

// Ceilings & Vesting Rules
export interface SeveranceCeiling {
  ceilingId: string;
  schemeId: string;
  employeeType: EmployeeType | 'ALL';
  minimumServiceMonths: number;
  maxServiceYears: number | null;
  maxSeveranceBase: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: SeveranceSchemeStatus;
  notes?: string;
}

// Due Dates & Grace Periods
export interface SeveranceDueDateRule {
  ruleId: string;
  schemeId: string;
  contributorType: 'Employer';
  periodType: PeriodType;
  dueDateExpression: string;
  gracePeriodDays: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: SeveranceSchemeStatus;
  notes?: string;
}

// Penalty & Interest Rules
export interface SeverancePenaltyRule {
  ruleId: string;
  schemeId: string;
  penaltyBase: string;
  penaltyRateType: PenaltyRateType;
  penaltyRateValue: number;
  interestApplicable: boolean;
  interestRate: number | null;
  interestBase: string | null;
  startAfterDaysLate: number;
  maxPenaltyCap: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: SeveranceSchemeStatus;
  notes?: string;
}

// Exemptions & Special Cases
export interface SeveranceExemption {
  exemptionId: string;
  schemeId: string;
  ruleName: string;
  description: string;
  appliesTo: 'Contribution' | 'Penalty' | 'Both';
  conditionSummary: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: SeveranceSchemeStatus;
  notes?: string;
}

// Severance Simulator Input
export interface SeveranceSimulatorInput {
  schemeId: string | null;
  contributionPeriod: string;
  payDate: string;
  employeeType: EmployeeType;
  tenureMonths: number;
  earningsComponents: Array<{
    componentCode: string;
    amount: number;
  }>;
  paidDate: string;
}

// Severance Simulator Output
export interface SeveranceSimulatorOutput {
  schemeUsed: SeveranceScheme;
  rulesApplied: {
    rateRule?: SeveranceRateRule;
    earningsComponents?: SeveranceEarningsComponent[];
    ceiling?: SeveranceCeiling;
    dueDateRule?: SeveranceDueDateRule;
    penaltyRule?: SeverancePenaltyRule;
    exemptions?: SeveranceExemption[];
  };
  severanceBaseBreakdown: Array<{
    componentCode: string;
    amount: number;
    includedInBase: boolean;
    reason: string;
  }>;
  severanceBase: number;
  employeeContribution: number;
  employerContribution: number;
  totalContribution: number;
  dueDate: string;
  isLate: boolean;
  daysLate: number;
  penaltyAmount: number;
  interestAmount: number;
  warnings: string[];
}

// Audit Log Entry
export interface SeveranceSettingsAuditLog {
  auditId: string;
  entityType: string;
  entityId: string;
  action: 'Create' | 'Update' | 'Delete' | 'Activate' | 'Deactivate';
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  userId: string;
  userName: string;
  timestamp: string;
  notes?: string;
}
