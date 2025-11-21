// Benefits Workflow Types based on St. Kitts & Nevis Social Security Requirements

export type WorkflowStage = 
  | 'DRAFT'
  | 'DOCTOR_INITIATED'
  | 'CLAIMANT_REVIEW'
  | 'EMPLOYER_VERIFICATION'
  | 'SSB_REVIEW'
  | 'MEDICAL_BOARD_REVIEW'
  | 'ELIGIBILITY_CHECK'
  | 'APPROVED'
  | 'PAYMENT_AUTHORIZED'
  | 'PAYMENT_ISSUED'
  | 'DISALLOWED'
  | 'PENDING_INFO'
  | 'CLOSED';

export type WorkflowAction =
  | 'INITIATE'
  | 'REVIEW'
  | 'VERIFY_EMPLOYMENT'
  | 'CHECK_ELIGIBILITY'
  | 'MEDICAL_BOARD_REVIEW'
  | 'APPROVE'
  | 'DISALLOW'
  | 'AUTHORIZE_PAYMENT'
  | 'ISSUE_PAYMENT'
  | 'REQUEST_INFO'
  | 'CLOSE';

export interface WorkflowTransition {
  from: WorkflowStage;
  to: WorkflowStage;
  action: WorkflowAction;
  performedBy: string;
  performedAt: string;
  notes?: string;
}

export interface EligibilityCheck {
  id: string;
  claimId: string;
  checkDate: string;
  checkType: 'AGE' | 'CONTRIBUTION' | 'MEDICAL' | 'EMPLOYMENT' | 'FINANCIAL';
  passed: boolean;
  reason?: string;
  details: {
    required?: any;
    actual?: any;
  };
}

export interface EligibilityResult {
  eligible: boolean;
  failureReasons: string[];
  warnings: string[];
  checks: EligibilityCheck[];
}

// Workflow Definitions for each benefit type
export interface BenefitWorkflowConfig {
  benefitType: string;
  stages: WorkflowStage[];
  requiredDocuments: string[];
  eligibilityRules: EligibilityRule[];
  approvalHierarchy: string[];
}

export interface EligibilityRule {
  id: string;
  name: string;
  type: 'AGE' | 'CONTRIBUTION' | 'MEDICAL' | 'EMPLOYMENT' | 'FINANCIAL';
  condition: any;
  errorMessage: string;
}

// Sickness Benefit Eligibility
export interface SicknessEligibility {
  ageMin: number; // 16
  ageMax: number; // 62
  minContributions: number; // 26 weeks total
  recentContributions: number; // 8 in last 13 weeks
  recentPeriod: number; // 13 weeks
  maxDuration: number; // 26 weeks
  benefitRate: number; // 65% of average weekly earnings
  waitingDays: number; // 3 days
}

// Age Benefit Eligibility
export interface AgeBenefitEligibility {
  pensionableAge: number; // 62
  pensionMinContributions: number; // 500 total, 150 paid
  pensionMinPaid: number; // 150
  grantMinContributions: number; // 50
  grantMaxContributions: number; // 499
  pensionRateMin: number; // 30%
  pensionRateMax: number; // 60%
}

// Maternity Benefit Eligibility
export interface MaternityEligibility {
  allowanceMinContributions: number; // 13 weeks in last 12 months
  allowanceDuration: number; // 12 weeks
  allowanceRate: number; // 65% of average earnings
  grantAmount: number; // Fixed lump sum
  submissionPeriodBefore: number; // 6 weeks before delivery
  submissionPeriodAfter: number; // 3 months after delivery
}

// Employment Injury Eligibility
export interface EmploymentInjuryEligibility {
  minContributions: number; // 0 - immediate coverage
  injuryBenefitRate: number; // 75% of average weekly wages
  maxDuration: number; // 26 weeks
  waitingDays: number; // 3 days
  retroactiveDays: number; // 1 if lasts more than 3 days
  medicalExpenseCap: number; // e.g., 25000
  travelExpenseCap: number; // varies
  claimDeadline: number; // 3 months
}

// Funeral Grant Eligibility
export interface FuneralGrantEligibility {
  minContributions: number; // 26 weeks
  standardGrant: number; // 2500
  employmentInjuryGrant: number; // 4000
}

// Survivors Benefit Eligibility
export interface SurvivorsBenefitEligibility {
  minContributions: number; // 50 weeks
  spousePercentage: number; // 50%
  childPercentage: number; // 16% max per child
  childAgeLimit: number; // 18
  childAgeLimitExtended: number; // 21 if in education
}

// Invalidity Benefit Eligibility
export interface InvalidityEligibility {
  ageMin: number; // under 62
  minContributions: number; // 150 weeks
  requiresMedicalBoard: boolean; // true
}

// Assistance Pension Eligibility
export interface AssistancePensionEligibility {
  ageRequirement: number; // 62 for old age
  ageRequirementInvalidity: number; // under 62 for invalidity
  meansTested: boolean; // true
  flatRate: number; // fixed amount
  paymentFrequency: string; // 'BI_MONTHLY'
}

export const DEFAULT_ELIGIBILITY_RULES: Record<string, any> = {
  SICKNESS: {
    ageMin: 16,
    ageMax: 62,
    minContributions: 26,
    recentContributions: 8,
    recentPeriod: 13,
    maxDuration: 26,
    benefitRate: 0.65,
    waitingDays: 3,
  },
  AGE_PENSION: {
    pensionableAge: 62,
    minContributions: 500,
    minPaidContributions: 150,
    pensionRateMin: 0.30,
    pensionRateMax: 0.60,
  },
  AGE_GRANT: {
    pensionableAge: 62,
    minContributions: 50,
    maxContributions: 499,
    grantMultiplier: 6, // 6x average weekly wage per 50 contributions
  },
  MATERNITY_ALLOWANCE: {
    minContributions: 13,
    contributionPeriod: 12, // months
    duration: 12, // weeks
    benefitRate: 0.65,
    submissionPeriodBefore: 6, // weeks
    submissionPeriodAfter: 3, // months
  },
  MATERNITY_GRANT: {
    requiresSpouseContributions: true,
    submissionPeriodAfter: 3, // months
  },
  EMPLOYMENT_INJURY: {
    minContributions: 0,
    injuryBenefitRate: 0.75,
    maxDuration: 26,
    waitingDays: 3,
    medicalExpenseCap: 25000,
    claimDeadline: 3, // months
  },
  FUNERAL_GRANT: {
    minContributions: 26,
    standardGrant: 2500,
    employmentInjuryGrant: 4000,
  },
  SURVIVORS_PENSION: {
    minContributions: 50,
    spousePercentage: 0.50,
    childPercentage: 0.16,
    childAgeLimit: 18,
    childAgeLimitExtended: 21,
  },
  SURVIVORS_GRANT: {
    minContributions: 1, // less than pension requirement
    basedOnAgeGrant: true,
  },
  INVALIDITY: {
    ageMax: 62,
    minContributions: 150,
    requiresMedicalBoard: true,
  },
  ASSISTANCE_PENSION_OLD_AGE: {
    ageRequirement: 62,
    meansTested: true,
    paymentFrequency: 'BI_MONTHLY',
  },
  ASSISTANCE_PENSION_INVALIDITY: {
    ageMax: 62,
    meansTested: true,
    requiresMedicalBoard: true,
    paymentFrequency: 'BI_MONTHLY',
  },
};
