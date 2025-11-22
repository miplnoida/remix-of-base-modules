// Levy Settings Types - Versioned Configuration System

export type LevySchemeStatus = 'Active' | 'Inactive';
export type PeriodType = 'Weekly' | 'Monthly' | 'Quarterly' | 'Annual';
export type ApplyToType = 'EntireBase' | 'PortionAboveMin';
export type MaritalStatus = 'Single' | 'Married' | 'Any';
export type EmploymentType = 'PERM' | 'TEMP' | 'GOVT' | 'MIN_WAGE' | 'CONTRACT';
export type ComponentCategory = 'Standard' | 'Bonus' | 'DecemberBonus' | 'HolidayPay' | 'LumpSum' | 'Other';
export type BaseAdjustmentType = 'None' | 'UseAverageWage' | 'SeparateRateOverride';
export type ExemptionAppliesTo = 'EmployeeOnly' | 'EmployeeAndEmployer';
export type BonusTreatment = 'Exempt' | 'RateOverride' | 'UseSchemeSlabs';

// Main Levy Scheme (Top-Level Versioned Container)
export interface LevyScheme {
  schemeId: string;
  schemeName: string;
  description: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isCurrent: boolean;
  status: LevySchemeStatus;
  createdBy: string;
  createdDate: string;
  updatedBy?: string;
  updatedDate?: string;
  notes?: string;
}

// Period Thresholds (Versioned within Scheme)
export interface PeriodThreshold {
  thresholdId: string;
  schemeId: string;
  periodType: PeriodType;
  employeeExemptionThreshold: number;
  employerExemptBelowThreshold: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: LevySchemeStatus;
  notes?: string;
}

// Levy Slabs / Bands (Versioned within Scheme)
export interface LevySlab {
  slabId: string;
  schemeId: string;
  periodType: PeriodType;
  employeeCategory: string | null; // null = applies to all
  minEarnings: number;
  maxEarnings: number | null; // null = no upper limit
  employeeRatePercent: number;
  employerRatePercent: number;
  applyTo: ApplyToType;
  priority: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: LevySchemeStatus;
  notes?: string;
}

// Employee Categories Master
export interface EmployeeCategory {
  categoryCode: string;
  categoryName: string;
  description: string;
  isDefault: boolean;
  status: LevySchemeStatus;
}

// Employee Category Rules (Versioned)
export interface EmployeeCategoryRule {
  ruleId: string;
  categoryCode: string;
  minAge: number | null;
  maxAge: number | null;
  maritalStatus: MaritalStatus;
  employmentType: EmploymentType[];
  customCondition: string | null; // JSON or text
  priority: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: LevySchemeStatus;
  notes?: string;
}

// Pay Components Inclusion (Versioned by Scheme)
export interface PayComponentRule {
  componentRuleId: string;
  schemeId: string;
  componentCode: string;
  componentName: string;
  includeInLevyBase: boolean;
  employerOnly: boolean;
  specialCategory: ComponentCategory;
  baseAdjustmentType: BaseAdjustmentType;
  separateEmployeeRate: number | null;
  separateEmployerRate: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: LevySchemeStatus;
  notes?: string;
}

// Bonus & December Rules (Year- and Date-Driven)
export interface BonusRule {
  bonusRuleId: string;
  schemeId: string;
  appliesToComponentCode: string;
  bonusMonth: number | null; // 1-12, null = any
  calendarYearFrom: number;
  calendarYearTo: number | null;
  averageWageThreshold: number | null;
  averageWagePeriod: string; // "YTD", "Last 12 Months", etc.
  employeeTreatment: BonusTreatment;
  employeeRateOverride: number | null;
  employerTreatment: BonusTreatment;
  employerRateOverride: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: LevySchemeStatus;
  notes?: string;
}

// Levy Exemptions (Versioned)
export interface LevyExemption {
  exemptionId: string;
  schemeId: string;
  ruleName: string;
  description: string;
  appliesTo: ExemptionAppliesTo;
  minEarnings: number | null;
  maxEarnings: number | null;
  employeeCategoryCode: string | null;
  minimumWageFlag: boolean;
  conditionJson: string | null; // Advanced conditions
  effectiveFrom: string;
  effectiveTo: string | null;
  status: LevySchemeStatus;
  notes?: string;
}

// Levy Simulator Input
export interface LevySimulatorInput {
  schemeId: string | null; // null = use current
  payDate: string;
  periodType: PeriodType;
  employeeAge: number;
  maritalStatus: MaritalStatus;
  employmentType: EmploymentType;
  earningsComponents: Array<{
    componentCode: string;
    componentName: string;
    amount: number;
  }>;
}

// Levy Simulator Output
export interface LevySimulatorOutput {
  schemeUsed: LevyScheme;
  rulesApplied: {
    categoryRule?: EmployeeCategoryRule;
    thresholds?: PeriodThreshold;
    slabs?: LevySlab[];
    payComponentRules?: PayComponentRule[];
    bonusRules?: BonusRule[];
    exemptions?: LevyExemption[];
  };
  levyBaseBreakdown: Array<{
    componentCode: string;
    componentName: string;
    amount: number;
    includedInBase: boolean;
    reason: string;
  }>;
  employeeCategoryResolved: string;
  categoryMatchReason: string;
  slabCalculations: Array<{
    slabId: string;
    minEarnings: number;
    maxEarnings: number | null;
    applicableEarnings: number;
    employeeRate: number;
    employerRate: number;
    employeeLevy: number;
    employerLevy: number;
  }>;
  finalEmployeeLevy: number;
  finalEmployerLevy: number;
  totalLevy: number;
  exemptionsApplied: string[];
  warnings: string[];
}

// Audit Log Entry
export interface LevySettingsAuditLog {
  auditId: string;
  entityType: string; // "LevyScheme", "LevySlab", etc.
  entityId: string;
  action: 'Create' | 'Update' | 'Delete' | 'Activate' | 'Deactivate';
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  userId: string;
  userName: string;
  timestamp: string;
  notes?: string;
}
