import { RiskFactor, RiskFactorCategory, RiskCalculationMethod, RiskDataSource, RiskScoringModel, EmployerScope } from '@/types/riskPolicy';
import { ContributionComponent } from '@/types/contributionComponents';

// Mock Risk Factors
const MOCK_RISK_FACTORS: RiskFactor[] = [
  {
    id: 'rf-001',
    code: 'RF01',
    name: 'SSC Arrears Age',
    description: 'Measures how long SSC contributions have been outstanding',
    category: RiskFactorCategory.FINANCIAL,
    componentScope: [ContributionComponent.SSC],
    employerScope: EmployerScope.ALL_EMPLOYERS,
    dataSource: RiskDataSource.LIABILITY_STATEMENT,
    calculationMethod: RiskCalculationMethod.RANGE_BASED,
    rangeScores: [
      { min: 0, max: 2, score: 0, label: '0-2 months' },
      { min: 3, max: 5, score: 10, label: '3-5 months' },
      { min: 6, max: 11, score: 20, label: '6-11 months' },
      { min: 12, max: 999, score: 30, label: '12+ months' }
    ],
    scoringModel: RiskScoringModel.TIERED_SCORE,
    defaultWeight: 10,
    active: true,
    checklistTemplateIds: ['chk-ssc-compliance'],
    createdDate: '2024-01-15T10:00:00Z',
    createdBy: 'admin.user',
    lastModified: '2024-01-15T10:00:00Z',
    lastModifiedBy: 'admin.user'
  },
  {
    id: 'rf-002',
    code: 'RF02',
    name: 'LVC Arrears',
    description: 'Outstanding Levy Contributions amount',
    category: RiskFactorCategory.FINANCIAL,
    componentScope: [ContributionComponent.LVC],
    employerScope: EmployerScope.ALL_EMPLOYERS,
    dataSource: RiskDataSource.LIABILITY_STATEMENT,
    calculationMethod: RiskCalculationMethod.THRESHOLD_BASED,
    thresholdCondition: {
      field: 'lvc_outstanding_months',
      operator: '>',
      value: 6,
      scoreIfTrue: 25,
      scoreIfFalse: 0
    },
    scoringModel: RiskScoringModel.FIXED_SCORE,
    defaultWeight: 7,
    active: true,
    checklistTemplateIds: ['chk-levy-compliance'],
    createdDate: '2024-01-15T10:00:00Z',
    createdBy: 'admin.user',
    lastModified: '2024-01-15T10:00:00Z',
    lastModifiedBy: 'admin.user'
  },
  {
    id: 'rf-003',
    code: 'RF03',
    name: 'Penalty Overload',
    description: 'Total penalties (SSF, LVF, PEF) exceed threshold',
    category: RiskFactorCategory.FINANCIAL,
    componentScope: [ContributionComponent.SSF, ContributionComponent.LVF, ContributionComponent.PEF],
    employerScope: EmployerScope.ALL_EMPLOYERS,
    dataSource: RiskDataSource.LIABILITY_STATEMENT,
    calculationMethod: RiskCalculationMethod.CROSS_COMPONENT,
    crossComponentCondition: 'IF (SSF + LVF + PEF) > 50% of total outstanding',
    scoringModel: RiskScoringModel.FIXED_SCORE,
    fixedScore: 20,
    defaultWeight: 5,
    active: true,
    createdDate: '2024-01-15T10:00:00Z',
    createdBy: 'admin.user',
    lastModified: '2024-01-15T10:00:00Z',
    lastModifiedBy: 'admin.user'
  },
  {
    id: 'rf-004',
    code: 'RF04',
    name: 'Under-Reported Employees',
    description: 'Detected discrepancy in employee count',
    category: RiskFactorCategory.COMPLIANCE,
    componentScope: [ContributionComponent.SSC, ContributionComponent.LVC, ContributionComponent.PEC],
    employerScope: EmployerScope.ALL_EMPLOYERS,
    dataSource: RiskDataSource.AUDIT_RESULTS,
    calculationMethod: RiskCalculationMethod.BOOLEAN_LOGIC,
    booleanCondition: 'Employee count discrepancy detected in last audit',
    scoringModel: RiskScoringModel.FIXED_SCORE,
    fixedScore: 15,
    defaultWeight: 8,
    active: true,
    checklistTemplateIds: ['chk-employee-verification'],
    createdDate: '2024-01-15T10:00:00Z',
    createdBy: 'admin.user',
    lastModified: '2024-01-15T10:00:00Z',
    lastModifiedBy: 'admin.user'
  },
  {
    id: 'rf-005',
    code: 'RF05',
    name: 'Payment Plan Breaches',
    description: 'Number of payment arrangement defaults',
    category: RiskFactorCategory.BEHAVIOURAL,
    componentScope: [ContributionComponent.SSC, ContributionComponent.SSF, ContributionComponent.LVC, ContributionComponent.LVF, ContributionComponent.PEC, ContributionComponent.PEF],
    employerScope: EmployerScope.ALL_EMPLOYERS,
    dataSource: RiskDataSource.PAYMENT_PLAN_HISTORY,
    calculationMethod: RiskCalculationMethod.RANGE_BASED,
    rangeScores: [
      { min: 0, max: 0, score: 0, label: 'No breaches' },
      { min: 1, max: 1, score: 10, label: '1 breach' },
      { min: 2, max: 2, score: 20, label: '2 breaches' },
      { min: 3, max: 999, score: 30, label: '3+ breaches' }
    ],
    scoringModel: RiskScoringModel.TIERED_SCORE,
    defaultWeight: 6,
    active: true,
    checklistTemplateIds: ['chk-payment-compliance'],
    createdDate: '2024-01-15T10:00:00Z',
    createdBy: 'admin.user',
    lastModified: '2024-01-15T10:00:00Z',
    lastModifiedBy: 'admin.user'
  },
  {
    id: 'rf-006',
    code: 'RF06',
    name: 'High-Risk Industry',
    description: 'Employer operates in high-risk industry sector',
    category: RiskFactorCategory.INDUSTRY,
    componentScope: [ContributionComponent.SSC, ContributionComponent.LVC, ContributionComponent.PEC],
    employerScope: EmployerScope.SPECIFIC_INDUSTRIES,
    specificIndustries: ['Construction', 'Agriculture', 'Manufacturing'],
    dataSource: RiskDataSource.C3_SUBMISSION_HISTORY,
    calculationMethod: RiskCalculationMethod.BOOLEAN_LOGIC,
    booleanCondition: 'Employer in high-risk industry',
    scoringModel: RiskScoringModel.FIXED_SCORE,
    fixedScore: 12,
    defaultWeight: 4,
    active: true,
    createdDate: '2024-01-15T10:00:00Z',
    createdBy: 'admin.user',
    lastModified: '2024-01-15T10:00:00Z',
    lastModifiedBy: 'admin.user'
  },
  {
    id: 'rf-007',
    code: 'RF07',
    name: 'Zone Non-Compliance Rate',
    description: 'Risk adjustment based on zone compliance patterns',
    category: RiskFactorCategory.ZONE,
    componentScope: [ContributionComponent.SSC, ContributionComponent.LVC, ContributionComponent.PEC],
    employerScope: EmployerScope.SPECIFIC_ZONES,
    dataSource: RiskDataSource.C3_SUBMISSION_HISTORY,
    calculationMethod: RiskCalculationMethod.PROPORTIONAL_FORMULA,
    formulaExpression: '(Zone_NonCompliant_Count / Zone_Total_Employers) * 100',
    scoringModel: RiskScoringModel.FORMULA_SCORE,
    formulaMultiplier: 0.5,
    defaultWeight: 3,
    active: true,
    createdDate: '2024-01-15T10:00:00Z',
    createdBy: 'admin.user',
    lastModified: '2024-01-15T10:00:00Z',
    lastModifiedBy: 'admin.user'
  },
  {
    id: 'rf-008',
    code: 'RF08',
    name: 'High Injury/Sickness Claims',
    description: 'Elevated benefit claims indicating potential workplace issues',
    category: RiskFactorCategory.BENEFITS,
    componentScope: [ContributionComponent.SSC],
    employerScope: EmployerScope.ALL_EMPLOYERS,
    dataSource: RiskDataSource.BENEFIT_CLAIMS,
    calculationMethod: RiskCalculationMethod.THRESHOLD_BASED,
    thresholdCondition: {
      field: 'injury_claims_last_12m',
      operator: '>',
      value: 5,
      scoreIfTrue: 18,
      scoreIfFalse: 0
    },
    scoringModel: RiskScoringModel.FIXED_SCORE,
    defaultWeight: 5,
    active: true,
    checklistTemplateIds: ['chk-workplace-safety'],
    createdDate: '2024-01-15T10:00:00Z',
    createdBy: 'admin.user',
    lastModified: '2024-01-15T10:00:00Z',
    lastModifiedBy: 'admin.user'
  },
  {
    id: 'rf-009',
    code: 'RF09',
    name: 'C3 Submission Delays',
    description: 'Frequency of late C3 submissions',
    category: RiskFactorCategory.COMPLIANCE,
    componentScope: [ContributionComponent.SSC, ContributionComponent.LVC, ContributionComponent.PEC],
    employerScope: EmployerScope.ALL_EMPLOYERS,
    dataSource: RiskDataSource.C3_SUBMISSION_HISTORY,
    calculationMethod: RiskCalculationMethod.RANGE_BASED,
    rangeScores: [
      { min: 0, max: 2, score: 0, label: '0-2 late submissions' },
      { min: 3, max: 5, score: 10, label: '3-5 late submissions' },
      { min: 6, max: 999, score: 20, label: '6+ late submissions' }
    ],
    scoringModel: RiskScoringModel.TIERED_SCORE,
    defaultWeight: 7,
    active: true,
    createdDate: '2024-01-15T10:00:00Z',
    createdBy: 'admin.user',
    lastModified: '2024-01-15T10:00:00Z',
    lastModifiedBy: 'admin.user'
  },
  {
    id: 'rf-010',
    code: 'RF10',
    name: 'Arrears Trend (Increasing)',
    description: 'Arrears increasing over last 6 months',
    category: RiskFactorCategory.FINANCIAL,
    componentScope: [ContributionComponent.SSC, ContributionComponent.LVC, ContributionComponent.PEC],
    employerScope: EmployerScope.ALL_EMPLOYERS,
    dataSource: RiskDataSource.LIABILITY_STATEMENT,
    calculationMethod: RiskCalculationMethod.TREND_ANALYSIS,
    trendPeriodMonths: 6,
    scoringModel: RiskScoringModel.FIXED_SCORE,
    fixedScore: 22,
    defaultWeight: 9,
    active: true,
    createdDate: '2024-01-15T10:00:00Z',
    createdBy: 'admin.user',
    lastModified: '2024-01-15T10:00:00Z',
    lastModifiedBy: 'admin.user'
  }
];

export const riskFactorService = {
  async getAllFactors(): Promise<RiskFactor[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [...MOCK_RISK_FACTORS];
  },

  async getFactorById(id: string): Promise<RiskFactor | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return MOCK_RISK_FACTORS.find(f => f.id === id) || null;
  },

  async getActiveFactors(): Promise<RiskFactor[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_RISK_FACTORS.filter(f => f.active);
  },

  async createFactor(factor: Omit<RiskFactor, 'id' | 'code' | 'createdDate' | 'lastModified'>): Promise<RiskFactor> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newCode = `RF${(MOCK_RISK_FACTORS.length + 1).toString().padStart(2, '0')}`;
    const newFactor: RiskFactor = {
      ...factor,
      id: `rf-${Date.now()}`,
      code: newCode,
      createdDate: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    
    MOCK_RISK_FACTORS.push(newFactor);
    return newFactor;
  },

  async updateFactor(id: string, updates: Partial<RiskFactor>): Promise<RiskFactor> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const index = MOCK_RISK_FACTORS.findIndex(f => f.id === id);
    if (index === -1) {
      throw new Error('Risk factor not found');
    }
    
    MOCK_RISK_FACTORS[index] = {
      ...MOCK_RISK_FACTORS[index],
      ...updates,
      lastModified: new Date().toISOString()
    };
    
    return MOCK_RISK_FACTORS[index];
  },

  async toggleFactorStatus(id: string): Promise<RiskFactor> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const index = MOCK_RISK_FACTORS.findIndex(f => f.id === id);
    if (index === -1) {
      throw new Error('Risk factor not found');
    }
    
    MOCK_RISK_FACTORS[index].active = !MOCK_RISK_FACTORS[index].active;
    MOCK_RISK_FACTORS[index].lastModified = new Date().toISOString();
    
    return MOCK_RISK_FACTORS[index];
  }
};
