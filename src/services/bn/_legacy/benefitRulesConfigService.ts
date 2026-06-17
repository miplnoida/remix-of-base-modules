// Benefit Rules Configuration Service
// Mock data service for dynamic benefit configuration

import { 
  BenefitRuleSet, 
  BenefitTestCase,
  BenefitTestResults,
  BenefitRuleVersion
} from '@/types/_legacy/benefitRulesConfig';

// Mock Benefit Rule Sets
export const MOCK_BENEFIT_RULES: BenefitRuleSet[] = [
  {
    id: 'BR001',
    benefitCode: 'SICK-001',
    benefitName: 'Sickness Benefit',
    category: 'SHORT_TERM',
    branch: 'GENERAL',
    paymentType: 'PERIODIC',
    description: 'Weekly cash benefit for insured workers temporarily unable to work due to illness',
    legislativeReference: 'Social Security Act Cap. 20.25 Section 15',
    activeFrom: '2020-01-01',
    status: 'ACTIVE',
    version: 2,
    createdBy: 'admin',
    createdAt: '2020-01-01T00:00:00Z',
    updatedBy: 'admin',
    updatedAt: '2024-06-01T00:00:00Z',
    
    eligibilityRules: {
      ruleGroups: [
        {
          groupId: 'G1',
          groupName: 'Age Requirements',
          groupType: 'AGE',
          groupLogic: 'AND',
          rules: [
            {
              ruleId: 'R1',
              parameter: 'AGE_AT_CLAIM',
              operator: 'GREATER_OR_EQUAL',
              valueFrom: 16,
              logicConnector: 'AND',
              failureMessageKey: 'AGE_TOO_LOW',
              failureMessageText: 'Claimant must be at least 16 years old',
              isActive: true
            },
            {
              ruleId: 'R2',
              parameter: 'AGE_AT_CLAIM',
              operator: 'LESS_THAN',
              valueFrom: 62,
              logicConnector: 'AND',
              failureMessageKey: 'AGE_TOO_HIGH',
              failureMessageText: 'Claimant must be under 62 years old',
              isActive: true
            }
          ]
        },
        {
          groupId: 'G2',
          groupName: 'Contribution Requirements',
          groupType: 'CONTRIBUTION',
          groupLogic: 'AND',
          rules: [
            {
              ruleId: 'R3',
              parameter: 'TOTAL_CONTRIBUTIONS',
              operator: 'GREATER_OR_EQUAL',
              valueFrom: 26,
              logicConnector: 'AND',
              failureMessageKey: 'INSUFFICIENT_TOTAL_CONTRIBUTIONS',
              failureMessageText: 'Minimum 26 weeks of total contributions required',
              isActive: true
            },
            {
              ruleId: 'R4',
              parameter: 'CONTRIBUTIONS_LAST_13_WEEKS',
              operator: 'GREATER_OR_EQUAL',
              valueFrom: 8,
              logicConnector: 'AND',
              failureMessageKey: 'INSUFFICIENT_RECENT_CONTRIBUTIONS',
              failureMessageText: 'Minimum 8 contributions in the last 13 weeks required',
              isActive: true
            }
          ]
        },
        {
          groupId: 'G3',
          groupName: 'Medical Documentation',
          groupType: 'MEDICAL',
          groupLogic: 'AND',
          rules: [
            {
              ruleId: 'R5',
              parameter: 'HAS_MEDICAL_CERTIFICATE',
              operator: 'BOOLEAN',
              valueFrom: true,
              logicConnector: 'AND',
              failureMessageKey: 'MISSING_MEDICAL_CERTIFICATE',
              failureMessageText: 'Medical certificate from doctor is required',
              isActive: true
            }
          ]
        }
      ],
      groupLogic: 'ALL_GROUPS'
    },
    
    calculationRules: {
      calculationBasis: 'AVERAGE_WEEKLY_EARNINGS',
      calculationType: 'PERCENTAGE_OF_WAGE',
      formula: '0.65 * {AWE}',
      variables: [
        {
          variableName: 'Average Weekly Earnings',
          variableKey: '{AWE}',
          description: 'Average insurable weekly earnings from last 13 weeks',
          dataSource: 'C3 Contributions Table',
        }
      ],
      limits: {
        minAmountXCD: 50,
        maxAmountXCD: 800,
        maxDurationWeeks: 26
      },
      roundingRule: 'ROUND_NEAREST'
    },
    
    timelines: {
      claimFilingDeadlineDays: 30,
      waitingDays: 3,
      paymentStartLogic: 'Payment begins from day 4 of illness',
      maxBackdatingDays: 90,
      maxDurationWeeks: 26,
      renewalRequired: false
    },
    
    requiredDocuments: [
      {
        documentId: 'DOC1',
        documentType: 'MEDICAL_CERTIFICATE',
        documentName: 'Doctor Medical Certificate',
        isMandatory: true,
        whenRequired: 'AT_CLAIM'
      },
      {
        documentId: 'DOC2',
        documentType: 'EMPLOYER_VERIFICATION',
        documentName: 'Employer Verification Form',
        isMandatory: true,
        whenRequired: 'AT_CLAIM'
      },
      {
        documentId: 'DOC3',
        documentType: 'MEDICAL_CERTIFICATE',
        documentName: 'Continued Illness Certificate',
        isMandatory: true,
        whenRequired: 'PERIODIC',
        frequencyMonths: 1
      }
    ],
    
    workflow: {
      workflowScheme: 'BENEFIT_APPROVAL_SHORT_TERM',
      requiresEmployerVerification: true,
      requiresMedicalBoardReview: false,
      requiresMeansTest: false,
      maxConcurrentClaimsAllowed: 1,
      overlapRules: [
        {
          canOverlapWith: 'MAT-001',
          allowedOverlapPercentage: 0,
          notes: 'Cannot overlap with Maternity Allowance'
        }
      ],
      preEligibilityChecks: [
        'Check contribution history',
        'Verify medical certificate validity',
        'Confirm employer verification'
      ]
    }
  },
  
  {
    id: 'BR002',
    benefitCode: 'AGE-PENSION-001',
    benefitName: 'Age Pension',
    category: 'LONG_TERM',
    branch: 'GENERAL',
    paymentType: 'PENSION',
    description: 'Monthly pension for insured persons reaching age 62 with sufficient contributions',
    legislativeReference: 'Social Security Act Cap. 20.25 Section 18',
    activeFrom: '2020-01-01',
    status: 'ACTIVE',
    version: 3,
    createdBy: 'admin',
    createdAt: '2020-01-01T00:00:00Z',
    updatedBy: 'admin',
    updatedAt: '2024-08-15T00:00:00Z',
    
    eligibilityRules: {
      ruleGroups: [
        {
          groupId: 'G1',
          groupName: 'Age Requirements',
          groupType: 'AGE',
          groupLogic: 'AND',
          rules: [
            {
              ruleId: 'R1',
              parameter: 'AGE_AT_CLAIM',
              operator: 'GREATER_OR_EQUAL',
              valueFrom: 62,
              logicConnector: 'AND',
              failureMessageKey: 'AGE_BELOW_PENSIONABLE',
              failureMessageText: 'Claimant must be at least 62 years old',
              isActive: true
            }
          ]
        },
        {
          groupId: 'G2',
          groupName: 'Contribution Requirements',
          groupType: 'CONTRIBUTION',
          groupLogic: 'AND',
          rules: [
            {
              ruleId: 'R2',
              parameter: 'TOTAL_CONTRIBUTIONS',
              operator: 'GREATER_OR_EQUAL',
              valueFrom: 500,
              logicConnector: 'AND',
              failureMessageKey: 'INSUFFICIENT_TOTAL_CONTRIBUTIONS',
              failureMessageText: 'Minimum 500 weeks of total contributions required for pension',
              isActive: true
            },
            {
              ruleId: 'R3',
              parameter: 'PAID_CONTRIBUTIONS',
              operator: 'GREATER_OR_EQUAL',
              valueFrom: 150,
              logicConnector: 'AND',
              failureMessageKey: 'INSUFFICIENT_PAID_CONTRIBUTIONS',
              failureMessageText: 'Minimum 150 weeks of paid contributions required',
              isActive: true
            }
          ]
        },
        {
          groupId: 'G3',
          groupName: 'Residence',
          groupType: 'RESIDENCE',
          groupLogic: 'AND',
          rules: [
            {
              ruleId: 'R4',
              parameter: 'RESIDENCE_CONFIRMED',
              operator: 'BOOLEAN',
              valueFrom: true,
              logicConnector: 'AND',
              failureMessageKey: 'RESIDENCE_NOT_CONFIRMED',
              failureMessageText: 'Residence in St. Kitts & Nevis must be confirmed',
              isActive: true
            }
          ]
        }
      ],
      groupLogic: 'ALL_GROUPS'
    },
    
    calculationRules: {
      calculationBasis: 'AVERAGE_INSURABLE_WAGE',
      calculationType: 'TIERED_RATE',
      formula: '{AIW} * {PensionRate}',
      variables: [
        {
          variableName: 'Average Insurable Wage',
          variableKey: '{AIW}',
          description: 'Average insurable wage based on lifetime contributions',
          dataSource: 'Contribution History'
        },
        {
          variableName: 'Pension Rate',
          variableKey: '{PensionRate}',
          description: 'Pension rate percentage based on total contributions (30%-60%)',
          dataSource: 'Rate Table'
        }
      ],
      tiers: [
        {
          tierId: 'T1',
          minValue: 500,
          maxValue: 749,
          rate: 30
        },
        {
          tierId: 'T2',
          minValue: 750,
          maxValue: 999,
          rate: 35
        },
        {
          tierId: 'T3',
          minValue: 1000,
          maxValue: 1249,
          rate: 40
        },
        {
          tierId: 'T4',
          minValue: 1250,
          maxValue: 1499,
          rate: 45
        },
        {
          tierId: 'T5',
          minValue: 1500,
          maxValue: 1749,
          rate: 50
        },
        {
          tierId: 'T6',
          minValue: 1750,
          maxValue: 1999,
          rate: 55
        },
        {
          tierId: 'T7',
          minValue: 2000,
          rate: 60
        }
      ],
      limits: {
        minAmountXCD: 500,
        minRatePercent: 30,
        maxRatePercent: 60
      },
      roundingRule: 'ROUND_NEAREST'
    },
    
    timelines: {
      claimFilingDeadlineDays: 180,
      retroactiveLimitMonths: 6,
      waitingDays: 0,
      paymentStartLogic: 'Payment begins from month following approval',
      maxBackdatingDays: 180,
      reviewFrequencyMonths: 12,
      renewalRequired: true,
      renewalFrequencyMonths: 12
    },
    
    requiredDocuments: [
      {
        documentId: 'DOC1',
        documentType: 'BIRTH_CERTIFICATE',
        documentName: 'Birth Certificate or Proof of Age',
        isMandatory: true,
        whenRequired: 'AT_CLAIM'
      },
      {
        documentId: 'DOC2',
        documentType: 'BANK_DETAILS',
        documentName: 'Bank Account Details',
        isMandatory: true,
        whenRequired: 'BEFORE_FIRST_PAYMENT'
      },
      {
        documentId: 'DOC3',
        documentType: 'LIFE_CERTIFICATE',
        documentName: 'Life Certificate',
        isMandatory: true,
        whenRequired: 'PERIODIC',
        frequencyMonths: 12,
        notes: 'Annual life certificate required to continue pension payments'
      },
      {
        documentId: 'DOC4',
        documentType: 'RESIDENCE_PROOF',
        documentName: 'Proof of Residence',
        isMandatory: true,
        whenRequired: 'AT_CLAIM'
      }
    ],
    
    workflow: {
      workflowScheme: 'BENEFIT_APPROVAL_LONG_TERM',
      requiresEmployerVerification: false,
      requiresMedicalBoardReview: false,
      requiresMeansTest: false,
      maxConcurrentClaimsAllowed: 1,
      overlapRules: [
        {
          canOverlapWith: 'SURV-PENSION-001',
          allowedOverlapPercentage: 50,
          notes: 'Can receive up to 50% of survivor pension alongside age pension'
        }
      ],
      preEligibilityChecks: [
        'Verify age and date of birth',
        'Validate contribution record',
        'Confirm residence status',
        'Check for duplicate pensions'
      ]
    }
  },

  {
    id: 'BR003',
    benefitCode: 'AGE-GRANT-001',
    benefitName: 'Age Grant',
    category: 'LUMP_SUM',
    branch: 'GENERAL',
    paymentType: 'LUMP_SUM',
    isVariantOf: 'BR002',
    description: 'One-time lump sum for persons age 62+ who do not qualify for Age Pension',
    legislativeReference: 'Social Security Act Cap. 20.25 Section 18',
    activeFrom: '2020-01-01',
    status: 'ACTIVE',
    version: 2,
    createdBy: 'admin',
    createdAt: '2020-01-01T00:00:00Z',
    
    eligibilityRules: {
      ruleGroups: [
        {
          groupId: 'G1',
          groupName: 'Age Requirements',
          groupType: 'AGE',
          groupLogic: 'AND',
          rules: [
            {
              ruleId: 'R1',
              parameter: 'AGE_AT_CLAIM',
              operator: 'GREATER_OR_EQUAL',
              valueFrom: 62,
              logicConnector: 'AND',
              failureMessageKey: 'AGE_BELOW_PENSIONABLE',
              failureMessageText: 'Claimant must be at least 62 years old',
              isActive: true
            }
          ]
        },
        {
          groupId: 'G2',
          groupName: 'Contribution Requirements',
          groupType: 'CONTRIBUTION',
          groupLogic: 'AND',
          rules: [
            {
              ruleId: 'R2',
              parameter: 'TOTAL_CONTRIBUTIONS',
              operator: 'BETWEEN',
              valueFrom: 50,
              valueTo: 499,
              logicConnector: 'AND',
              failureMessageKey: 'CONTRIBUTIONS_OUT_OF_RANGE',
              failureMessageText: 'Contributions must be between 50 and 499 weeks for Age Grant',
              isActive: true
            }
          ]
        }
      ],
      groupLogic: 'ALL_GROUPS'
    },
    
    calculationRules: {
      calculationBasis: 'AVERAGE_WEEKLY_EARNINGS',
      calculationType: 'LUMP_SUM_FORMULA',
      formula: '6 * {AWE} * floor({TotalContributions} / 50)',
      variables: [
        {
          variableName: 'Average Weekly Earnings',
          variableKey: '{AWE}',
          description: 'Average weekly earnings',
          dataSource: 'Contribution History'
        },
        {
          variableName: 'Total Contributions',
          variableKey: '{TotalContributions}',
          description: 'Total number of contribution weeks',
          dataSource: 'Contribution History'
        }
      ],
      limits: {
        minAmountXCD: 300
      },
      roundingRule: 'ROUND_NEAREST'
    },
    
    timelines: {
      claimFilingDeadlineDays: 365,
      waitingDays: 0,
      paymentStartLogic: 'Payment processed immediately after approval',
      renewalRequired: false
    },
    
    requiredDocuments: [
      {
        documentId: 'DOC1',
        documentType: 'BIRTH_CERTIFICATE',
        documentName: 'Birth Certificate or Proof of Age',
        isMandatory: true,
        whenRequired: 'AT_CLAIM'
      },
      {
        documentId: 'DOC2',
        documentType: 'BANK_DETAILS',
        documentName: 'Bank Account Details',
        isMandatory: true,
        whenRequired: 'BEFORE_FIRST_PAYMENT'
      }
    ],
    
    workflow: {
      workflowScheme: 'SIMPLE_APPROVAL',
      requiresEmployerVerification: false,
      requiresMedicalBoardReview: false,
      requiresMeansTest: false,
      maxConcurrentClaimsAllowed: 1,
      overlapRules: [],
      preEligibilityChecks: [
        'Verify age',
        'Validate contribution count',
        'Ensure not receiving Age Pension'
      ]
    }
  }
];

// Mock Test Cases
export const MOCK_TEST_CASES: BenefitTestCase[] = [
  {
    testId: 'TEST001',
    benefitRuleSetId: 'BR001',
    testName: 'Sickness Benefit - Eligible Case',
    insuredPersonSSN: '123456789',
    testData: {
      age: 35,
      dateOfBirth: '1989-03-15',
      totalContributions: 150,
      paidContributions: 150,
      recentContributions13Weeks: 12,
      recentContributions12Months: 48,
      averageWeeklyEarnings: 600,
      averageInsurableWage: 600,
      employmentStatus: 'EMPLOYED',
      hasMedicalCertificate: true,
      hasEmployerVerification: true,
      eventDate: '2024-11-01',
      claimSubmissionDate: '2024-11-05'
    },
    testStatus: 'PENDING'
  }
];

// Service Functions
export const benefitRulesConfigService = {
  // Get all benefit rule sets
  getAllBenefitRules: (): Promise<BenefitRuleSet[]> => {
    return Promise.resolve([...MOCK_BENEFIT_RULES]);
  },

  // Get benefit rule by ID
  getBenefitRuleById: (id: string): Promise<BenefitRuleSet | undefined> => {
    const rule = MOCK_BENEFIT_RULES.find(r => r.id === id);
    return Promise.resolve(rule);
  },

  // Create new benefit rule
  createBenefitRule: (rule: Omit<BenefitRuleSet, 'id' | 'createdAt' | 'version'>): Promise<BenefitRuleSet> => {
    const newRule: BenefitRuleSet = {
      ...rule,
      id: `BR${String(MOCK_BENEFIT_RULES.length + 1).padStart(3, '0')}`,
      version: 1,
      createdAt: new Date().toISOString()
    };
    MOCK_BENEFIT_RULES.push(newRule);
    return Promise.resolve(newRule);
  },

  // Update benefit rule
  updateBenefitRule: (id: string, updates: Partial<BenefitRuleSet>): Promise<BenefitRuleSet> => {
    const index = MOCK_BENEFIT_RULES.findIndex(r => r.id === id);
    if (index !== -1) {
      MOCK_BENEFIT_RULES[index] = {
        ...MOCK_BENEFIT_RULES[index],
        ...updates,
        version: MOCK_BENEFIT_RULES[index].version + 1,
        updatedAt: new Date().toISOString()
      };
      return Promise.resolve(MOCK_BENEFIT_RULES[index]);
    }
    return Promise.reject(new Error('Benefit rule not found'));
  },

  // Test benefit rule
  testBenefitRule: (testCase: BenefitTestCase): Promise<BenefitTestResults> => {
    // Mock test execution - in real system, this would run the rules engine
    const results: BenefitTestResults = {
      eligibilityMet: true,
      eligibilityReasons: [
        'Age requirement met (35 years)',
        'Total contributions met (150 weeks)',
        'Recent contributions met (12 in last 13 weeks)',
        'Medical certificate provided'
      ],
      failureReasons: [],
      calculatedAmountWeekly: testCase.testData.averageWeeklyEarnings * 0.65,
      durationWeeks: 26,
      paymentStartDate: '2024-11-05',
      paymentEndDate: '2025-05-05',
      missingDocuments: [],
      warnings: [],
      rulesApplied: ['Age Rule', 'Contribution Rule', 'Medical Certificate Rule']
    };
    
    return Promise.resolve(results);
  },

  // Get benefit rule versions
  getBenefitRuleVersions: (benefitRuleSetId: string): Promise<BenefitRuleVersion[]> => {
    // Mock version history
    return Promise.resolve([]);
  }
};
