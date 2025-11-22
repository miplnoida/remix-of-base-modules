// Social Security Contribution Settings Types - Versioned Configuration System

export type SSSchemeStatus = 'Active' | 'Inactive';
export type SSPeriodType = 'Weekly' | 'Fortnightly' | 'Monthly' | 'Annual';
export type SSContributorType = 'Employed' | 'Self-Employed' | 'Voluntary' | 'Severance';
export type SSPenaltyType = 'PercentPerMonth' | 'PercentPerDay' | 'FlatAmount';
export type SSAppliesTo = 'MainScheme' | 'EmploymentInjury' | 'Severance' | 'All';

// Main SS Contribution Scheme (Top-Level Versioned Container)
export interface SSContributionScheme {
  schemeId: string;
  schemeName: string;
  description: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isCurrent: boolean;
  status: SSSchemeStatus;
  createdBy: string;
  createdDate: string;
  updatedBy?: string;
  updatedDate?: string;
  notes?: string;
}

// Age Bands & Contribution Rates (Versioned within Scheme)
export interface SSAgeBandRate {
  rateBandId: string;
  schemeId: string;
  contributorType: SSContributorType;
  ageFrom: number;
  ageTo: number | null; // null = no upper limit
  employeeRatePercent: number;
  employerRatePercent: number;
  injuryRatePercent: number;
  appliesTo: SSAppliesTo[];
  effectiveFrom: string;
  effectiveTo: string | null;
  status: SSSchemeStatus;
  notes?: string;
}

// Insurable Earnings Components (Versioned)
export interface SSInsurableComponent {
  componentRuleId: string;
  schemeId: string;
  componentCode: string;
  componentName: string;
  includeInInsurableEarnings: boolean;
  includeForSelfEmployed: boolean;
  includeForVoluntary: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: SSSchemeStatus;
  notes?: string;
}

// Contribution Ceilings & Limits (Versioned)
export interface SSCeiling {
  ceilingId: string;
  schemeId: string;
  periodType: SSPeriodType;
  appliesTo: SSAppliesTo;
  ceilingAmount: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: SSSchemeStatus;
  notes?: string;
}

// Due Date Rules (Versioned)
export interface SSDueDateRule {
  dueDateRuleId: string;
  schemeId: string;
  contributorType: SSContributorType;
  periodType: SSPeriodType;
  dueDateExpression: string; // "EndOfMonth", "15thFollowingMonth", "XDaysAfterMonth"
  daysAfterMonth?: number; // if expression is "XDaysAfterMonth"
  gracePeriodDays: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: SSSchemeStatus;
  notes?: string;
}

// Penalty & Interest Rules (Versioned)
export interface SSPenaltyRule {
  penaltyRuleId: string;
  schemeId: string;
  contributorType: SSContributorType;
  penaltyType: SSPenaltyType;
  penaltyRateValue: number;
  interestApplicable: boolean;
  interestRatePercent: number | null;
  interestBase: 'PrincipalOnly' | 'PrincipalPlusPenalty';
  startAfterDaysLate: number;
  minimumPenalty: number | null;
  maximumPenaltyPercent: number | null;
  maximumPenaltyAmount: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: SSSchemeStatus;
  notes?: string;
}

// Exemptions & Special Cases (Versioned)
export interface SSExemption {
  exemptionId: string;
  schemeId: string;
  ruleName: string;
  description: string;
  appliesTo: 'Contributions' | 'Penalties' | 'Both';
  contributorType: SSContributorType | 'All';
  conditionJson: string | null; // Advanced conditions
  effectiveFrom: string;
  effectiveTo: string | null;
  status: SSSchemeStatus;
  notes?: string;
}

// SS Simulator Input
export interface SSSimulatorInput {
  schemeId: string | null; // null = use current
  contributionPeriod: string;
  payDate: string;
  periodType: SSPeriodType;
  age: number;
  contributorType: SSContributorType;
  earningsComponents: Array<{
    componentCode: string;
    componentName: string;
    amount: number;
  }>;
  paidDate: string | null; // to test penalties
}

// SS Simulator Output
export interface SSSimulatorOutput {
  schemeUsed: SSContributionScheme;
  rulesApplied: {
    ageBandRate?: SSAgeBandRate;
    insurableComponents?: SSInsurableComponent[];
    ceiling?: SSCeiling;
    dueDateRule?: SSDueDateRule;
    penaltyRule?: SSPenaltyRule;
    exemptions?: SSExemption[];
  };
  insurableEarningsBreakdown: Array<{
    componentCode: string;
    componentName: string;
    amount: number;
    included: boolean;
    reason: string;
  }>;
  totalInsurableEarnings: number;
  cappedInsurableEarnings: number;
  employeeContribution: number;
  employerContribution: number;
  injuryContribution: number;
  totalContribution: number;
  dueDate: string;
  isLate: boolean;
  daysLate: number;
  monthsLate: number;
  penaltyAmount: number;
  interestAmount: number;
  totalDue: number;
  warnings: string[];
}

// Audit Log Entry
export interface SSSettingsAuditLog {
  auditId: string;
  entityType: string; // "SSContributionScheme", "SSAgeBandRate", etc.
  entityId: string;
  action: 'Create' | 'Update' | 'Delete' | 'Activate' | 'Deactivate';
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  userId: string;
  userName: string;
  timestamp: string;
  notes?: string;
}
