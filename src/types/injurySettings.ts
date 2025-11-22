// Employment Injury Settings Types - Versioned Configuration System

export type InjurySchemeStatus = 'Active' | 'Inactive';
export type EmployerCategory = 'Standard' | 'HighRisk' | 'Government' | 'LowRisk';
export type PeriodType = 'Weekly' | 'Monthly' | 'Fortnightly' | 'Annual';
export type PenaltyRateType = 'PercentPerMonth' | 'PercentPerDay' | 'FlatAmount';
export type BenefitType = 'TemporaryDisablement' | 'PermanentDisablement' | 'MedicalExpenses' | 'FuneralGrant';

// Main Injury Scheme (Top-Level Versioned Container)
export interface InjuryScheme {
  schemeId: string;
  schemeName: string;
  description: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isCurrent: boolean;
  status: InjurySchemeStatus;
  createdBy: string;
  createdDate: string;
  updatedBy?: string;
  updatedDate?: string;
  notes?: string;
}

// Contribution Rates & Categories
export interface InjuryRateRule {
  ruleId: string;
  schemeId: string;
  employerCategory: EmployerCategory;
  industryCode: string | null;
  occupationClass: string | null;
  employeeRatePercent: number;
  employerInjuryRatePercent: number;
  minAge: number | null;
  maxAge: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: InjurySchemeStatus;
  notes?: string;
}

// Insurable Injury Earnings
export interface InjuryEarningsComponent {
  componentId: string;
  schemeId: string;
  componentCode: string;
  componentName: string;
  includeInInjuryBase: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: InjurySchemeStatus;
  notes?: string;
}

// Ceilings
export interface InjuryCeiling {
  ceilingId: string;
  schemeId: string;
  periodType: PeriodType;
  ceilingAmount: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: InjurySchemeStatus;
  notes?: string;
}

// Due Dates & Grace Periods
export interface InjuryDueDateRule {
  ruleId: string;
  schemeId: string;
  contributorType: 'Employer';
  periodType: PeriodType;
  dueDateExpression: string;
  gracePeriodDays: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: InjurySchemeStatus;
  notes?: string;
}

// Penalty & Interest Rules
export interface InjuryPenaltyRule {
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
  status: InjurySchemeStatus;
  notes?: string;
}

// Benefit Parameters (Optional)
export interface InjuryBenefitParameter {
  parameterId: string;
  schemeId: string;
  benefitType: BenefitType;
  parameterName: string;
  parameterValue: string; // JSON string for complex configs
  description: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: InjurySchemeStatus;
  notes?: string;
}

// Injury Simulator Input
export interface InjurySimulatorInput {
  schemeId: string | null;
  contributionPeriod: string;
  payDate: string;
  employerCategory: EmployerCategory;
  industryCode: string | null;
  earningsComponents: Array<{
    componentCode: string;
    amount: number;
  }>;
  paidDate: string;
}

// Injury Simulator Output
export interface InjurySimulatorOutput {
  schemeUsed: InjuryScheme;
  rulesApplied: {
    rateRule?: InjuryRateRule;
    earningsComponents?: InjuryEarningsComponent[];
    ceiling?: InjuryCeiling;
    dueDateRule?: InjuryDueDateRule;
    penaltyRule?: InjuryPenaltyRule;
  };
  injuryBaseBreakdown: Array<{
    componentCode: string;
    amount: number;
    includedInBase: boolean;
    reason: string;
  }>;
  injuryBase: number;
  employeeContribution: number;
  employerInjuryContribution: number;
  totalContribution: number;
  dueDate: string;
  isLate: boolean;
  daysLate: number;
  penaltyAmount: number;
  interestAmount: number;
  warnings: string[];
}

// Audit Log Entry
export interface InjurySettingsAuditLog {
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
