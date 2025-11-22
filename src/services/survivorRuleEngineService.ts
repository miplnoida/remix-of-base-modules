import {
  SurvivorInsuredEligibilityConfig,
  SurvivorDependantTypeConfig,
  SurvivorDependantDurationRule,
  SurvivorShareRuleConfig,
  SurvivorCaseCapConfig,
  SurvivorOngoingEligibilityRule,
  DeceasedInsuredInfo,
  SurvivorDependant,
  SurvivorClaimEvaluationResult,
  SurvivorPaymentEvaluationResult,
  DependantEligibilityResult,
  DependantTypeCode,
} from '@/types/survivorBenefitRules';

// Mock configuration data
const mockInsuredEligibilityConfig: SurvivorInsuredEligibilityConfig = {
  id: 'IEC-001',
  minContributions: 150,
  requiresPensionStatus: true,
  effectiveFrom: '2020-01-01',
  status: 'ACTIVE',
  createdBy: 'SYSTEM',
  createdAt: '2020-01-01',
};

const mockDependantTypeConfigs: SurvivorDependantTypeConfig[] = [
  {
    id: 'DTC-WIDOW',
    dependantTypeCode: 'WIDOW',
    description: 'Widow of deceased',
    isSupportedType: false,
    baseEligibilityConditions: { mustBeUnmarried: true },
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
  {
    id: 'DTC-CHILD',
    dependantTypeCode: 'CHILD',
    description: 'Dependent child',
    isSupportedType: true,
    baseEligibilityConditions: { 
      mustBeUnmarried: true, 
      mustBeMaintainedOrLivingWithDeceased: true 
    },
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
];

const mockDurationRules: SurvivorDependantDurationRule[] = [
  {
    id: 'DR-001',
    dependantTypeCode: 'WIDOW',
    conditionExpression: { ageMax: 44 },
    paymentDurationType: 'FIXED_YEARS',
    paymentDurationValue: 1,
    priority: 1,
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
  {
    id: 'DR-002',
    dependantTypeCode: 'WIDOW',
    conditionExpression: { ageMin: 45, relationshipYearsMin: 3 },
    paymentDurationType: 'LIFE_WHILE_CONDITION',
    paymentDurationValue: 'Until remarriage',
    priority: 3,
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
  {
    id: 'DR-003',
    dependantTypeCode: 'CHILD',
    conditionExpression: { ageMax: 16 },
    paymentDurationType: 'UNTIL_AGE',
    paymentDurationValue: 16,
    priority: 1,
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
  {
    id: 'DR-004',
    dependantTypeCode: 'CHILD',
    conditionExpression: { isInSchool: true, ageMax: 18 },
    paymentDurationType: 'UNTIL_AGE',
    paymentDurationValue: 18,
    priority: 2,
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
];

const mockShareRules: SurvivorShareRuleConfig[] = [
  {
    id: 'SR-001',
    dependantTypeCode: 'WIDOW',
    shareBaseType: 'REFERENCE_PENSION',
    sharePercentage: 50,
    priority: 1,
    isOptionalFormula: false,
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
  {
    id: 'SR-002',
    dependantTypeCode: 'CHILD',
    shareBaseType: 'REFERENCE_PENSION',
    sharePercentage: 16.667,
    minimumAmount: 206.40,
    priority: 1,
    isOptionalFormula: false,
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
];

const mockCaseCapConfig: SurvivorCaseCapConfig = {
  id: 'CC-001',
  maxBaseType: 'REFERENCE_PENSION',
  maxFormulaExpression: 'min(ReferencePension, 5000)',
  scalingMethodWhenExceeded: 'PRO_RATA',
  priorityRules: { WIDOW: 1, CHILD: 2, PARENT: 3 },
  effectiveFrom: '2020-01-01',
  status: 'ACTIVE',
  createdBy: 'SYSTEM',
  createdAt: '2020-01-01',
};

const mockOngoingRules: SurvivorOngoingEligibilityRule[] = [
  {
    id: 'OER-001',
    dependantTypeCode: 'WIDOW',
    conditionExpression: { stopOnRemarriage: true },
    appliesAtEvent: 'MONTHLY_PAY_RUN',
    actionIfFailed: 'TERMINATE_BENEFIT',
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
  {
    id: 'OER-002',
    dependantTypeCode: 'CHILD',
    conditionExpression: { maxAge: 16 },
    appliesAtEvent: 'MONTHLY_PAY_RUN',
    actionIfFailed: 'TERMINATE_BENEFIT',
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
  {
    id: 'OER-003',
    dependantTypeCode: 'CHILD',
    conditionExpression: { maxAge: 18, requiresSchool: true },
    appliesAtEvent: 'MONTHLY_PAY_RUN',
    actionIfFailed: 'TERMINATE_BENEFIT',
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
];

// Main Rule Engine Functions

export const evaluateSurvivorClaim = (
  deceased: DeceasedInsuredInfo,
  dependants: SurvivorDependant[],
  asOfDate: string
): SurvivorClaimEvaluationResult => {
  const result: SurvivorClaimEvaluationResult = {
    isEligible: false,
    deceasedEligibilityReasons: [],
    deceasedIneligibilityReasons: [],
    dependantResults: [],
    totalProvisionalAmount: 0,
    maximumAllowedAmount: 0,
    totalFinalAmount: 0,
    wasCapApplied: false,
    warnings: [],
    evaluatedAt: new Date().toISOString(),
  };

  // Step 1: Check deceased eligibility
  const deceasedEligible = checkDeceasedEligibility(deceased, result);
  if (!deceasedEligible) {
    return result;
  }

  // Step 2: Evaluate each dependant
  dependants.forEach((dependant) => {
    const depResult = evaluateDependant(dependant, deceased, asOfDate);
    result.dependantResults.push(depResult);
    result.totalProvisionalAmount += depResult.provisionalAmount;
  });

  // Step 3: Apply case cap if necessary
  const maxAmount = calculateMaximumAmount(deceased);
  result.maximumAllowedAmount = maxAmount;

  if (result.totalProvisionalAmount > maxAmount) {
    result.wasCapApplied = true;
    result.scalingMethod = mockCaseCapConfig.scalingMethodWhenExceeded;
    applyCapScaling(result, maxAmount);
  } else {
    result.dependantResults.forEach((dep) => {
      dep.finalAmount = dep.provisionalAmount;
    });
  }

  result.totalFinalAmount = result.dependantResults.reduce(
    (sum, dep) => sum + dep.finalAmount,
    0
  );

  result.isEligible = result.dependantResults.some((dep) => dep.isEligible);

  return result;
};

export const evaluateSurvivorPayment = (
  beneficiaryId: string,
  dependantTypeCode: DependantTypeCode,
  periodDate: string,
  beneficiaryData: {
    age: number;
    isMarried: boolean;
    isInSchool: boolean;
    isInvalid: boolean;
    startDate: string;
    expectedEndDate?: string;
    monthlyAmount: number;
  }
): SurvivorPaymentEvaluationResult => {
  const result: SurvivorPaymentEvaluationResult = {
    beneficiaryId,
    dependantTypeCode,
    eligibleThisPeriod: true,
    payableAmount: beneficiaryData.monthlyAmount,
    ineligibilityReasons: [],
    checksPerformed: [],
    evaluatedAt: new Date().toISOString(),
  };

  // Find applicable ongoing rules
  const applicableRules = mockOngoingRules.filter(
    (rule) =>
      rule.dependantTypeCode === dependantTypeCode &&
      rule.status === 'ACTIVE' &&
      rule.appliesAtEvent === 'MONTHLY_PAY_RUN'
  );

  // Evaluate each ongoing rule
  for (const rule of applicableRules) {
    const condition = rule.conditionExpression;

    if (condition.maxAge !== undefined && beneficiaryData.age > condition.maxAge) {
      if (condition.requiresSchool && !beneficiaryData.isInSchool) {
        result.eligibleThisPeriod = false;
        result.ineligibilityReasons.push(
          `Exceeded age ${condition.maxAge} and not in school`
        );
        result.actionTaken = rule.actionIfFailed;
        break;
      } else if (!condition.requiresSchool) {
        result.eligibleThisPeriod = false;
        result.ineligibilityReasons.push(`Exceeded age limit ${condition.maxAge}`);
        result.actionTaken = rule.actionIfFailed;
        break;
      }
    }

    if (condition.stopOnRemarriage && beneficiaryData.isMarried) {
      result.eligibleThisPeriod = false;
      result.ineligibilityReasons.push('Beneficiary has remarried');
      result.actionTaken = rule.actionIfFailed;
      break;
    }

    if (condition.stopOnEndDate && beneficiaryData.expectedEndDate) {
      const endDate = new Date(beneficiaryData.expectedEndDate);
      const payPeriod = new Date(periodDate);
      if (payPeriod > endDate) {
        result.eligibleThisPeriod = false;
        result.ineligibilityReasons.push('Payment period has ended');
        result.actionTaken = rule.actionIfFailed;
        break;
      }
    }

    result.checksPerformed.push(
      `Checked ${rule.id}: ${JSON.stringify(condition)}`
    );
  }

  if (!result.eligibleThisPeriod) {
    result.payableAmount = 0;
  }

  return result;
};

// Helper Functions

function checkDeceasedEligibility(
  deceased: DeceasedInsuredInfo,
  result: SurvivorClaimEvaluationResult
): boolean {
  const config = mockInsuredEligibilityConfig;

  if (deceased.totalContributions < config.minContributions) {
    result.deceasedIneligibilityReasons.push(
      `Insufficient contributions: ${deceased.totalContributions} < ${config.minContributions} required`
    );
    return false;
  }

  if (
    config.requiresPensionStatus &&
    !deceased.wasReceivingPension &&
    !deceased.wouldQualifyForPension
  ) {
    result.deceasedIneligibilityReasons.push(
      'Deceased was not receiving and would not have qualified for pension'
    );
    return false;
  }

  result.deceasedEligibilityReasons.push('Met contribution requirements');
  if (config.requiresPensionStatus) {
    result.deceasedEligibilityReasons.push('Met pension status requirements');
  }

  return true;
}

function evaluateDependant(
  dependant: SurvivorDependant,
  deceased: DeceasedInsuredInfo,
  asOfDate: string
): DependantEligibilityResult {
  const result: DependantEligibilityResult = {
    dependantId: dependant.dependantId,
    dependantTypeCode: dependant.dependantTypeCode,
    isEligible: false,
    eligibilityReasons: [],
    ineligibilityReasons: [],
    startDate: asOfDate,
    provisionalAmount: 0,
    finalAmount: 0,
    appliedRules: [],
  };

  // Check base eligibility conditions
  const typeConfig = mockDependantTypeConfigs.find(
    (c) => c.dependantTypeCode === dependant.dependantTypeCode
  );

  if (!typeConfig) {
    result.ineligibilityReasons.push('Dependant type not configured');
    return result;
  }

  const baseConditions = typeConfig.baseEligibilityConditions;

  if (baseConditions.mustBeUnmarried && dependant.isMarried) {
    result.ineligibilityReasons.push('Must be unmarried');
    return result;
  }

  if (typeConfig.isSupportedType && !dependant.supportedByDeceased) {
    result.ineligibilityReasons.push('Must have been supported by deceased');
    return result;
  }

  // Find applicable duration rule
  const durationRule = findBestDurationRule(dependant);
  if (!durationRule) {
    result.ineligibilityReasons.push('No applicable duration rule found');
    return result;
  }

  result.appliedRules.push(`Duration: ${durationRule.id}`);
  result.eligibilityReasons.push('Met base eligibility conditions');

  // Calculate end date/condition
  if (durationRule.paymentDurationType === 'FIXED_YEARS') {
    const years = durationRule.paymentDurationValue as number;
    const endDate = new Date(asOfDate);
    endDate.setFullYear(endDate.getFullYear() + years);
    result.expectedEndDate = endDate.toISOString().split('T')[0];
    result.endCondition = `${years} year(s) from start`;
  } else if (durationRule.paymentDurationType === 'UNTIL_AGE') {
    const targetAge = durationRule.paymentDurationValue as number;
    result.endCondition = `Until age ${targetAge}`;
  } else if (durationRule.paymentDurationType === 'LIFE_WHILE_CONDITION') {
    result.endCondition = durationRule.paymentDurationValue as string;
  }

  // Calculate provisional amount
  const shareRule = mockShareRules.find(
    (r) => r.dependantTypeCode === dependant.dependantTypeCode && r.status === 'ACTIVE'
  );

  if (shareRule) {
    result.appliedRules.push(`Share: ${shareRule.id}`);

    let baseAmount = 0;
    if (shareRule.shareBaseType === 'REFERENCE_PENSION' && deceased.referencePension) {
      baseAmount = deceased.referencePension * (shareRule.sharePercentage / 100);
    } else if (
      shareRule.shareBaseType === 'AVERAGE_ANNUAL_WAGES' &&
      deceased.averageAnnualWages
    ) {
      baseAmount = deceased.averageAnnualWages * (shareRule.sharePercentage / 100);
    }

    result.provisionalAmount = Math.max(
      baseAmount,
      shareRule.minimumAmount || 0
    );
  }

  result.isEligible = true;
  return result;
}

function findBestDurationRule(
  dependant: SurvivorDependant
): SurvivorDependantDurationRule | undefined {
  const applicableRules = mockDurationRules.filter((rule) => {
    if (rule.dependantTypeCode !== dependant.dependantTypeCode) return false;
    if (rule.status !== 'ACTIVE') return false;

    const cond = rule.conditionExpression;

    if (cond.ageMin !== undefined && dependant.age < cond.ageMin) return false;
    if (cond.ageMax !== undefined && dependant.age > cond.ageMax) return false;
    if (
      cond.relationshipYearsMin !== undefined &&
      (dependant.relationshipYears || 0) < cond.relationshipYearsMin
    )
      return false;
    if (cond.isInvalid !== undefined && dependant.isInvalid !== cond.isInvalid)
      return false;
    if (cond.isInSchool !== undefined && dependant.isInSchool !== cond.isInSchool)
      return false;

    return true;
  });

  if (applicableRules.length === 0) return undefined;

  // Return highest priority
  applicableRules.sort((a, b) => b.priority - a.priority);
  return applicableRules[0];
}

function calculateMaximumAmount(deceased: DeceasedInsuredInfo): number {
  const config = mockCaseCapConfig;

  if (config.maxBaseType === 'REFERENCE_PENSION' && deceased.referencePension) {
    return Math.min(deceased.referencePension, 5000);
  }

  if (
    config.maxBaseType === 'AVERAGE_ANNUAL_WAGES' &&
    deceased.averageAnnualWages
  ) {
    return deceased.averageAnnualWages;
  }

  return 5000; // Default cap
}

function applyCapScaling(
  result: SurvivorClaimEvaluationResult,
  maxAmount: number
): void {
  const scalingMethod = mockCaseCapConfig.scalingMethodWhenExceeded;

  if (scalingMethod === 'PRO_RATA') {
    const scaleFactor = maxAmount / result.totalProvisionalAmount;
    result.dependantResults.forEach((dep) => {
      dep.finalAmount = dep.provisionalAmount * scaleFactor;
    });
  } else if (scalingMethod === 'PRIORITY_ORDER') {
    const priorityRules = mockCaseCapConfig.priorityRules || {};
    result.dependantResults.sort(
      (a, b) =>
        (priorityRules[a.dependantTypeCode] || 999) -
        (priorityRules[b.dependantTypeCode] || 999)
    );

    let remaining = maxAmount;
    result.dependantResults.forEach((dep) => {
      if (remaining >= dep.provisionalAmount) {
        dep.finalAmount = dep.provisionalAmount;
        remaining -= dep.provisionalAmount;
      } else {
        dep.finalAmount = remaining;
        remaining = 0;
      }
    });
  }
}
