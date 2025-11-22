import {
  SurvivorInsuredEligibilityConfig,
  SurvivorDependantTypeConfig,
  SurvivorDependantDurationRule,
  SurvivorShareRuleConfig,
  SurvivorCaseCapConfig,
  SurvivorOngoingEligibilityRule,
} from '@/types/survivorBenefitRules';

// Storage keys
const INSURED_ELIGIBILITY_KEY = 'survivor_insured_eligibility_configs';
const DEPENDANT_TYPE_KEY = 'survivor_dependant_type_configs';
const DURATION_RULE_KEY = 'survivor_duration_rules';
const SHARE_RULE_KEY = 'survivor_share_rules';
const CASE_CAP_KEY = 'survivor_case_cap_configs';
const ONGOING_RULE_KEY = 'survivor_ongoing_rules';

// Mock initial data
const mockInsuredEligibilityConfigs: SurvivorInsuredEligibilityConfig[] = [
  {
    id: 'IEC-001',
    minContributions: 150,
    requiresPensionStatus: true,
    otherConditions: {},
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
];

const mockDependantTypeConfigs: SurvivorDependantTypeConfig[] = [
  {
    id: 'DTC-001',
    dependantTypeCode: 'WIDOW',
    description: 'Widow of deceased insured person',
    isSupportedType: false,
    baseEligibilityConditions: { mustBeUnmarried: true },
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
  {
    id: 'DTC-002',
    dependantTypeCode: 'WIDOWER',
    description: 'Widower of deceased insured person',
    isSupportedType: false,
    baseEligibilityConditions: { mustBeUnmarried: true },
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
  {
    id: 'DTC-003',
    dependantTypeCode: 'CHILD',
    description: 'Dependent child of deceased',
    isSupportedType: true,
    baseEligibilityConditions: {
      mustBeUnmarried: true,
      mustBeMaintainedOrLivingWithDeceased: true,
    },
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
  {
    id: 'DTC-004',
    dependantTypeCode: 'ORPHAN_CHILD',
    description: 'Orphan child (both parents deceased)',
    isSupportedType: true,
    baseEligibilityConditions: {
      mustBeUnmarried: true,
      bothParentsDeceased: true,
    },
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
  {
    id: 'DTC-005',
    dependantTypeCode: 'INVALID_CHILD',
    description: 'Invalid/disabled child of deceased',
    isSupportedType: true,
    baseEligibilityConditions: {
      mustBeInvalid: true,
      mustBeMaintainedByDeceased: true,
    },
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
  {
    id: 'DTC-006',
    dependantTypeCode: 'PARENT',
    description: 'Dependent parent of deceased',
    isSupportedType: true,
    baseEligibilityConditions: {
      mustBeSupportedByDeceased: true,
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
    conditionExpression: { ageMin: 45, relationshipYearsMin: 0 },
    paymentDurationType: 'FIXED_YEARS',
    paymentDurationValue: 1,
    priority: 2,
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
  {
    id: 'DR-003',
    dependantTypeCode: 'WIDOW',
    conditionExpression: { ageMin: 45, relationshipYearsMin: 3 },
    paymentDurationType: 'LIFE_WHILE_CONDITION',
    paymentDurationValue: 'Until remarriage or cohabitation',
    priority: 3,
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
  {
    id: 'DR-004',
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
    id: 'DR-005',
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
  {
    id: 'DR-006',
    dependantTypeCode: 'INVALID_CHILD',
    conditionExpression: { isInvalid: true },
    paymentDurationType: 'LIFE_WHILE_CONDITION',
    paymentDurationValue: 'While invalid/disabled',
    priority: 3,
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
  {
    id: 'DR-007',
    dependantTypeCode: 'PARENT',
    conditionExpression: { ageMax: 61 },
    paymentDurationType: 'FIXED_YEARS',
    paymentDurationValue: 1,
    priority: 1,
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
  {
    id: 'DR-008',
    dependantTypeCode: 'PARENT',
    conditionExpression: { ageMin: 62 },
    paymentDurationType: 'LIFE_WHILE_CONDITION',
    paymentDurationValue: 'For life',
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
    isOptionalFormula: true,
    priority: 1,
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
  {
    id: 'SR-002',
    dependantTypeCode: 'WIDOW',
    shareBaseType: 'AVERAGE_ANNUAL_WAGES',
    sharePercentage: 30,
    isOptionalFormula: true,
    priority: 2,
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
  {
    id: 'SR-003',
    dependantTypeCode: 'CHILD',
    shareBaseType: 'REFERENCE_PENSION',
    sharePercentage: 16.667,
    minimumAmount: 206.40,
    isOptionalFormula: false,
    priority: 1,
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
  {
    id: 'SR-004',
    dependantTypeCode: 'ORPHAN_CHILD',
    shareBaseType: 'REFERENCE_PENSION',
    sharePercentage: 33.333,
    minimumAmount: 206.40,
    isOptionalFormula: false,
    priority: 1,
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
  {
    id: 'SR-005',
    dependantTypeCode: 'PARENT',
    shareBaseType: 'REFERENCE_PENSION',
    sharePercentage: 25,
    isOptionalFormula: false,
    priority: 1,
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
];

const mockCaseCapConfigs: SurvivorCaseCapConfig[] = [
  {
    id: 'CC-001',
    maxBaseType: 'REFERENCE_PENSION',
    maxFormulaExpression: 'min(ReferencePension, 5000)',
    scalingMethodWhenExceeded: 'PRO_RATA',
    priorityRules: { WIDOW: 1, WIDOWER: 1, CHILD: 2, PARENT: 3 },
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
];

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
  {
    id: 'OER-004',
    dependantTypeCode: 'WIDOW',
    conditionExpression: { requiresLifeCertificate: true },
    appliesAtEvent: 'LIFE_CERTIFICATE_CHECK',
    actionIfFailed: 'SUSPEND_BENEFIT',
    effectiveFrom: '2020-01-01',
    status: 'ACTIVE',
    createdBy: 'SYSTEM',
    createdAt: '2020-01-01',
  },
];

// CRUD Operations

// 1. Insured Eligibility Configs
export const getInsuredEligibilityConfigs = (): SurvivorInsuredEligibilityConfig[] => {
  const stored = localStorage.getItem(INSURED_ELIGIBILITY_KEY);
  return stored ? JSON.parse(stored) : mockInsuredEligibilityConfigs;
};

export const saveInsuredEligibilityConfig = (
  config: Omit<SurvivorInsuredEligibilityConfig, 'id' | 'createdAt' | 'createdBy'> | SurvivorInsuredEligibilityConfig
): SurvivorInsuredEligibilityConfig => {
  const configs = getInsuredEligibilityConfigs();
  
  if ('id' in config) {
    const index = configs.findIndex((c) => c.id === config.id);
    if (index !== -1) {
      configs[index] = {
        ...config,
        updatedAt: new Date().toISOString(),
        updatedBy: 'CURRENT_USER',
      };
      localStorage.setItem(INSURED_ELIGIBILITY_KEY, JSON.stringify(configs));
      return configs[index];
    }
  }
  
  const newConfig: SurvivorInsuredEligibilityConfig = {
    ...config,
    id: `IEC-${String(configs.length + 1).padStart(3, '0')}`,
    createdAt: new Date().toISOString(),
    createdBy: 'CURRENT_USER',
  };
  configs.push(newConfig);
  localStorage.setItem(INSURED_ELIGIBILITY_KEY, JSON.stringify(configs));
  return newConfig;
};

// 2. Dependant Type Configs
export const getDependantTypeConfigs = (): SurvivorDependantTypeConfig[] => {
  const stored = localStorage.getItem(DEPENDANT_TYPE_KEY);
  return stored ? JSON.parse(stored) : mockDependantTypeConfigs;
};

export const saveDependantTypeConfig = (
  config: Omit<SurvivorDependantTypeConfig, 'id' | 'createdAt' | 'createdBy'> | SurvivorDependantTypeConfig
): SurvivorDependantTypeConfig => {
  const configs = getDependantTypeConfigs();
  
  if ('id' in config) {
    const index = configs.findIndex((c) => c.id === config.id);
    if (index !== -1) {
      configs[index] = {
        ...config,
        updatedAt: new Date().toISOString(),
        updatedBy: 'CURRENT_USER',
      };
      localStorage.setItem(DEPENDANT_TYPE_KEY, JSON.stringify(configs));
      return configs[index];
    }
  }
  
  const newConfig: SurvivorDependantTypeConfig = {
    ...config,
    id: `DTC-${String(configs.length + 1).padStart(3, '0')}`,
    createdAt: new Date().toISOString(),
    createdBy: 'CURRENT_USER',
  };
  configs.push(newConfig);
  localStorage.setItem(DEPENDANT_TYPE_KEY, JSON.stringify(configs));
  return newConfig;
};

// 3. Duration Rules
export const getDurationRules = (): SurvivorDependantDurationRule[] => {
  const stored = localStorage.getItem(DURATION_RULE_KEY);
  return stored ? JSON.parse(stored) : mockDurationRules;
};

export const saveDurationRule = (
  rule: Omit<SurvivorDependantDurationRule, 'id' | 'createdAt' | 'createdBy'> | SurvivorDependantDurationRule
): SurvivorDependantDurationRule => {
  const rules = getDurationRules();
  
  if ('id' in rule) {
    const index = rules.findIndex((r) => r.id === rule.id);
    if (index !== -1) {
      rules[index] = {
        ...rule,
        updatedAt: new Date().toISOString(),
        updatedBy: 'CURRENT_USER',
      };
      localStorage.setItem(DURATION_RULE_KEY, JSON.stringify(rules));
      return rules[index];
    }
  }
  
  const newRule: SurvivorDependantDurationRule = {
    ...rule,
    id: `DR-${String(rules.length + 1).padStart(3, '0')}`,
    createdAt: new Date().toISOString(),
    createdBy: 'CURRENT_USER',
  };
  rules.push(newRule);
  localStorage.setItem(DURATION_RULE_KEY, JSON.stringify(rules));
  return newRule;
};

// 4. Share Rules
export const getShareRules = (): SurvivorShareRuleConfig[] => {
  const stored = localStorage.getItem(SHARE_RULE_KEY);
  return stored ? JSON.parse(stored) : mockShareRules;
};

export const saveShareRule = (
  rule: Omit<SurvivorShareRuleConfig, 'id' | 'createdAt' | 'createdBy'> | SurvivorShareRuleConfig
): SurvivorShareRuleConfig => {
  const rules = getShareRules();
  
  if ('id' in rule) {
    const index = rules.findIndex((r) => r.id === rule.id);
    if (index !== -1) {
      rules[index] = {
        ...rule,
        updatedAt: new Date().toISOString(),
        updatedBy: 'CURRENT_USER',
      };
      localStorage.setItem(SHARE_RULE_KEY, JSON.stringify(rules));
      return rules[index];
    }
  }
  
  const newRule: SurvivorShareRuleConfig = {
    ...rule,
    id: `SR-${String(rules.length + 1).padStart(3, '0')}`,
    createdAt: new Date().toISOString(),
    createdBy: 'CURRENT_USER',
  };
  rules.push(newRule);
  localStorage.setItem(SHARE_RULE_KEY, JSON.stringify(rules));
  return newRule;
};

// 5. Case Cap Configs
export const getCaseCapConfigs = (): SurvivorCaseCapConfig[] => {
  const stored = localStorage.getItem(CASE_CAP_KEY);
  return stored ? JSON.parse(stored) : mockCaseCapConfigs;
};

export const saveCaseCapConfig = (
  config: Omit<SurvivorCaseCapConfig, 'id' | 'createdAt' | 'createdBy'> | SurvivorCaseCapConfig
): SurvivorCaseCapConfig => {
  const configs = getCaseCapConfigs();
  
  if ('id' in config) {
    const index = configs.findIndex((c) => c.id === config.id);
    if (index !== -1) {
      configs[index] = {
        ...config,
        updatedAt: new Date().toISOString(),
        updatedBy: 'CURRENT_USER',
      };
      localStorage.setItem(CASE_CAP_KEY, JSON.stringify(configs));
      return configs[index];
    }
  }
  
  const newConfig: SurvivorCaseCapConfig = {
    ...config,
    id: `CC-${String(configs.length + 1).padStart(3, '0')}`,
    createdAt: new Date().toISOString(),
    createdBy: 'CURRENT_USER',
  };
  configs.push(newConfig);
  localStorage.setItem(CASE_CAP_KEY, JSON.stringify(configs));
  return newConfig;
};

// 6. Ongoing Eligibility Rules
export const getOngoingRules = (): SurvivorOngoingEligibilityRule[] => {
  const stored = localStorage.getItem(ONGOING_RULE_KEY);
  return stored ? JSON.parse(stored) : mockOngoingRules;
};

export const saveOngoingRule = (
  rule: Omit<SurvivorOngoingEligibilityRule, 'id' | 'createdAt' | 'createdBy'> | SurvivorOngoingEligibilityRule
): SurvivorOngoingEligibilityRule => {
  const rules = getOngoingRules();
  
  if ('id' in rule) {
    const index = rules.findIndex((r) => r.id === rule.id);
    if (index !== -1) {
      rules[index] = {
        ...rule,
        updatedAt: new Date().toISOString(),
        updatedBy: 'CURRENT_USER',
      };
      localStorage.setItem(ONGOING_RULE_KEY, JSON.stringify(rules));
      return rules[index];
    }
  }
  
  const newRule: SurvivorOngoingEligibilityRule = {
    ...rule,
    id: `OER-${String(rules.length + 1).padStart(3, '0')}`,
    createdAt: new Date().toISOString(),
    createdBy: 'CURRENT_USER',
  };
  rules.push(newRule);
  localStorage.setItem(ONGOING_RULE_KEY, JSON.stringify(rules));
  return newRule;
};

export const deleteConfig = (key: string, id: string): boolean => {
  const keys: Record<string, string> = {
    insuredEligibility: INSURED_ELIGIBILITY_KEY,
    dependantType: DEPENDANT_TYPE_KEY,
    durationRule: DURATION_RULE_KEY,
    shareRule: SHARE_RULE_KEY,
    caseCap: CASE_CAP_KEY,
    ongoingRule: ONGOING_RULE_KEY,
  };

  const storageKey = keys[key];
  if (!storageKey) return false;

  const stored = localStorage.getItem(storageKey);
  if (!stored) return false;

  const items = JSON.parse(stored);
  const filtered = items.filter((item: any) => item.id !== id);
  localStorage.setItem(storageKey, JSON.stringify(filtered));
  return true;
};
