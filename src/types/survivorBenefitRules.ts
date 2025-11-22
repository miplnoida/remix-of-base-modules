// Survivors' Benefit Rule Engine - Configuration Types
// St. Kitts & Nevis Social Security Board

export type DependantTypeCode = 
  | 'WIDOW' 
  | 'WIDOWER' 
  | 'CHILD' 
  | 'ORPHAN_CHILD' 
  | 'INVALID_CHILD'
  | 'PARENT';

export type PaymentDurationType = 
  | 'FIXED_YEARS' 
  | 'UNTIL_AGE' 
  | 'UNTIL_EVENT' 
  | 'LIFE_WHILE_CONDITION';

export type ShareBaseType = 
  | 'REFERENCE_PENSION' 
  | 'AVERAGE_ANNUAL_WAGES' 
  | 'MAXIMUM_AMOUNT' 
  | 'FLAT_AMOUNT';

export type MaxBaseType = 
  | 'REFERENCE_PENSION' 
  | 'AVERAGE_ANNUAL_WAGES' 
  | 'CUSTOM_FORMULA';

export type ScalingMethod = 
  | 'PRO_RATA' 
  | 'PRIORITY_ORDER' 
  | 'CUSTOM';

export type OngoingCheckEvent = 
  | 'MONTHLY_PAY_RUN' 
  | 'LIFE_CERTIFICATE_CHECK' 
  | 'STATUS_CHANGE';

export type OngoingActionIfFailed = 
  | 'SUSPEND_BENEFIT' 
  | 'TERMINATE_BENEFIT' 
  | 'FLAG_FOR_REVIEW';

// 1. Deceased Insured Eligibility Configuration
export interface SurvivorInsuredEligibilityConfig {
  id: string;
  minContributions: number;
  requiresPensionStatus: boolean;
  otherConditions?: Record<string, any>;
  effectiveFrom: string;
  effectiveTo?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
}

// 2. Dependant Type Configuration
export interface SurvivorDependantTypeConfig {
  id: string;
  dependantTypeCode: DependantTypeCode;
  description: string;
  isSupportedType: boolean;
  baseEligibilityConditions: Record<string, any>;
  effectiveFrom: string;
  effectiveTo?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
}

// 3. Duration Rule Configuration
export interface SurvivorDependantDurationRule {
  id: string;
  dependantTypeCode: DependantTypeCode;
  conditionExpression: {
    ageMin?: number;
    ageMax?: number;
    relationshipYearsMin?: number;
    isInvalid?: boolean;
    isInSchool?: boolean;
  };
  paymentDurationType: PaymentDurationType;
  paymentDurationValue?: number | string;
  priority: number;
  effectiveFrom: string;
  effectiveTo?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
}

// 4. Share/Allocation Rule Configuration
export interface SurvivorShareRuleConfig {
  id: string;
  dependantTypeCode: DependantTypeCode;
  shareBaseType: ShareBaseType;
  sharePercentage: number;
  minimumAmount?: number;
  maximumAmountCapType?: 'PER_DEPENDANT' | 'TOTAL_CASE';
  maximumAmountCapValue?: number;
  conditions?: Record<string, any>;
  isOptionalFormula: boolean;
  priority: number;
  effectiveFrom: string;
  effectiveTo?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
}

// 5. Case Cap Configuration
export interface SurvivorCaseCapConfig {
  id: string;
  maxBaseType: MaxBaseType;
  maxFormulaExpression: string;
  scalingMethodWhenExceeded: ScalingMethod;
  priorityRules?: Record<string, number>;
  effectiveFrom: string;
  effectiveTo?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
}

// 6. Ongoing Eligibility Rule Configuration
export interface SurvivorOngoingEligibilityRule {
  id: string;
  dependantTypeCode: DependantTypeCode;
  conditionExpression: {
    maxAge?: number;
    requiresSchool?: boolean;
    stopOnRemarriage?: boolean;
    stopOnEndDate?: boolean;
    requiresLifeCertificate?: boolean;
  };
  appliesAtEvent: OngoingCheckEvent;
  actionIfFailed: OngoingActionIfFailed;
  effectiveFrom: string;
  effectiveTo?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
}

// Rule Engine Evaluation Types
export interface SurvivorDependant {
  dependantId: string;
  dependantTypeCode: DependantTypeCode;
  name: string;
  dateOfBirth: string;
  age: number;
  isInvalid: boolean;
  isInSchool: boolean;
  relationshipYears?: number;
  isMarried: boolean;
  supportedByDeceased: boolean;
}

export interface DeceasedInsuredInfo {
  insuredPersonId: string;
  totalContributions: number;
  wasReceivingPension: boolean;
  wouldQualifyForPension: boolean;
  referencePension?: number;
  averageAnnualWages?: number;
}

export interface DependantEligibilityResult {
  dependantId: string;
  dependantTypeCode: DependantTypeCode;
  isEligible: boolean;
  eligibilityReasons: string[];
  ineligibilityReasons: string[];
  startDate: string;
  expectedEndDate?: string;
  endCondition?: string;
  provisionalAmount: number;
  finalAmount: number;
  appliedRules: string[];
}

export interface SurvivorClaimEvaluationResult {
  isEligible: boolean;
  deceasedEligibilityReasons: string[];
  deceasedIneligibilityReasons: string[];
  dependantResults: DependantEligibilityResult[];
  totalProvisionalAmount: number;
  maximumAllowedAmount: number;
  totalFinalAmount: number;
  wasCapApplied: boolean;
  scalingMethod?: ScalingMethod;
  warnings: string[];
  evaluatedAt: string;
}

export interface SurvivorPaymentEvaluationResult {
  beneficiaryId: string;
  dependantTypeCode: DependantTypeCode;
  eligibleThisPeriod: boolean;
  payableAmount: number;
  ineligibilityReasons: string[];
  checksPerformed: string[];
  actionTaken?: OngoingActionIfFailed;
  evaluatedAt: string;
}
