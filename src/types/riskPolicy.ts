// ============================================
// RISK RULE POLICY TYPES
// ============================================

import { ContributionComponent } from './contributionComponents';

// ============================================
// ENUMS: Calculation Methods & Data Sources
// ============================================

export enum RiskCalculationMethod {
  THRESHOLD_BASED = 'THRESHOLD_BASED',
  RANGE_BASED = 'RANGE_BASED',
  PROPORTIONAL_FORMULA = 'PROPORTIONAL_FORMULA',
  BOOLEAN_LOGIC = 'BOOLEAN_LOGIC',
  TREND_ANALYSIS = 'TREND_ANALYSIS',
  CROSS_COMPONENT = 'CROSS_COMPONENT'
}

export enum RiskDataSource {
  C3_SUBMISSION_HISTORY = 'C3_SUBMISSION_HISTORY',
  LIABILITY_STATEMENT = 'LIABILITY_STATEMENT',
  PAYMENT_HISTORY = 'PAYMENT_HISTORY',
  EMPLOYEE_COUNT = 'EMPLOYEE_COUNT',
  BENEFIT_CLAIMS = 'BENEFIT_CLAIMS',
  AUDIT_RESULTS = 'AUDIT_RESULTS',
  COMPLIANCE_CORRESPONDENCE = 'COMPLIANCE_CORRESPONDENCE',
  PAYMENT_PLAN_HISTORY = 'PAYMENT_PLAN_HISTORY',
  LEGAL_HISTORY = 'LEGAL_HISTORY'
}

export enum RiskScoringModel {
  FIXED_SCORE = 'FIXED_SCORE',
  TIERED_SCORE = 'TIERED_SCORE',
  FORMULA_SCORE = 'FORMULA_SCORE',
  WEIGHTED_SCORE = 'WEIGHTED_SCORE'
}

export enum RiskFactorCategory {
  COMPLIANCE = 'COMPLIANCE',
  FINANCIAL = 'FINANCIAL',
  BEHAVIOURAL = 'BEHAVIOURAL',
  ZONE = 'ZONE',
  INDUSTRY = 'INDUSTRY',
  BENEFITS = 'BENEFITS'
}

export enum EmployerScope {
  ALL_EMPLOYERS = 'ALL_EMPLOYERS',
  SPECIFIC_INDUSTRIES = 'SPECIFIC_INDUSTRIES',
  SPECIFIC_ZONES = 'SPECIFIC_ZONES',
  LARGE_EMPLOYERS = 'LARGE_EMPLOYERS'
}

export enum RiskBandName {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum AuditFrequency {
  RANDOM_3_YEAR = 'RANDOM_3_YEAR',
  EVERY_2_YEARS = 'EVERY_2_YEARS',
  YEARLY = 'YEARLY',
  SEMI_ANNUALLY = 'SEMI_ANNUALLY',
  QUARTERLY = 'QUARTERLY'
}

// ============================================
// INTERFACES: Risk Factor
// ============================================

export interface RangeScore {
  min: number;
  max: number;
  score: number;
  label?: string;
}

export interface ThresholdCondition {
  field: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: number;
  scoreIfTrue: number;
  scoreIfFalse: number;
}

export interface RiskFactor {
  id: string;
  code: string; // RF01, RF02, etc.
  name: string;
  description: string;
  category: RiskFactorCategory;
  
  // Component Scope
  componentScope: ContributionComponent[];
  
  // Employer Scope
  employerScope: EmployerScope;
  specificIndustries?: string[];
  specificZones?: string[];
  minEmployeeCount?: number;
  
  // Data Source
  dataSource: RiskDataSource;
  
  // Calculation Method
  calculationMethod: RiskCalculationMethod;
  
  // Configuration based on calculation method
  thresholdCondition?: ThresholdCondition;
  rangeScores?: RangeScore[];
  formulaExpression?: string; // e.g. "(SSC_Arrears / SSC_Due_Last_12m) * 100"
  booleanCondition?: string;
  trendPeriodMonths?: number;
  crossComponentCondition?: string;
  
  // Scoring Model
  scoringModel: RiskScoringModel;
  fixedScore?: number;
  tieredScores?: RangeScore[];
  formulaMultiplier?: number;
  
  // Default Weight
  defaultWeight: number;
  
  // Status
  active: boolean;
  
  // Audit Checklist Integration
  checklistTemplateIds?: string[];
  
  // Metadata
  createdDate: string;
  createdBy: string;
  lastModified: string;
  lastModifiedBy: string;
}

// ============================================
// INTERFACES: Risk Policy
// ============================================

export interface RiskPolicyFactor {
  factorId: string;
  factorCode: string;
  factorName: string;
  defaultWeight: number;
  overrideWeight?: number;
  active: boolean;
}

export interface RiskPolicy {
  id: string;
  policyId: string;
  policyName: string;
  description: string;
  
  // Effective Period
  effectiveFrom: string;
  effectiveTo: string | null;
  
  // Status
  status: 'DRAFT' | 'ACTIVE' | 'RETIRED';
  isActive: boolean;
  
  // Scope
  applicableEmployerTypes?: string[];
  applicableZones?: string[];
  
  // Update Frequency
  updateFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  
  // Factors
  factors: RiskPolicyFactor[];
  
  // Metadata
  createdDate: string;
  createdBy: string;
  lastModified: string;
  lastModifiedBy: string;
  activatedBy?: string;
  activatedDate?: string;
}

// ============================================
// INTERFACES: Risk Band
// ============================================

export interface RiskBandAutoSelectRule {
  enabled: boolean;
  selectionType: 'ALL' | 'TOP_X_PER_ZONE' | 'RANDOM_PERCENTAGE';
  topCount?: number;
  randomPercentage?: number;
}

export interface RiskBandEscalationRule {
  enabled: boolean;
  monthsInBand: number;
  action: 'MARK_READY_FOR_LEGAL' | 'NOTIFY_SUPERVISOR' | 'MANDATORY_AUDIT';
}

export interface RiskBand {
  id: string;
  policyId: string;
  bandName: RiskBandName;
  scoreRangeMin: number;
  scoreRangeMax: number;
  color: string; // For UI display
  
  // Audit Frequency
  auditFrequency: AuditFrequency;
  mandatoryAudit: boolean;
  
  // Auto-Selection for Audit
  autoSelectRule: RiskBandAutoSelectRule;
  
  // Compliance Follow-Up Intensity
  followUpIntensity: 'NORMAL' | 'MONITOR' | 'ENFORCEMENT' | 'IMMEDIATE_REVIEW';
  
  // Legal Escalation Readiness
  escalationRule: RiskBandEscalationRule;
  
  // Metadata
  createdDate: string;
  lastModified: string;
}

// ============================================
// INTERFACES: Employer Risk Profile
// ============================================

export interface RiskFactorBreakdown {
  factorId: string;
  factorCode: string;
  factorName: string;
  rawValue: number;
  calculatedScore: number;
  weight: number;
  weightedScore: number;
  triggered: boolean;
}

export interface EmployerRiskProfile {
  id: string;
  employerId: string;
  employerName: string;
  policyId: string;
  calculationDate: string;
  
  // Scores
  totalScore: number;
  previousScore?: number;
  scoreChange?: number;
  
  // Band
  riskBand: RiskBandName;
  previousBand?: RiskBandName;
  monthsInCurrentBand: number;
  
  // Breakdown
  factorBreakdown: RiskFactorBreakdown[];
  triggeredFactorCount: number;
  
  // Component-Specific Risk
  componentRisk?: {
    [key in ContributionComponent]?: {
      score: number;
      factors: string[];
    };
  };
  
  // Recommendations
  recommendedAction: string;
  auditPriorityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  nextAuditDue?: string;
  
  // Zone
  zone: string;
  
  // Metadata
  calculatedBy: string;
}

// ============================================
// INTERFACES: History & Summary
// ============================================

export interface RiskPolicyHistory {
  policies: RiskPolicy[];
  activePolicy: RiskPolicy | null;
}

export interface RiskCalculationJobResult {
  jobId: string;
  policyId: string;
  executionDate: string;
  employersProcessed: number;
  employersUpdated: number;
  averageScore: number;
  bandDistribution: {
    [key in RiskBandName]: number;
  };
  executionTimeMs: number;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  errors?: string[];
}
