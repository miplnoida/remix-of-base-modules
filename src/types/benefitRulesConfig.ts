// Dynamic Benefit Rules Configuration Types
// St. Kitts & Nevis Social Security Board

export type BenefitCategory = 
  | 'SHORT_TERM'
  | 'LONG_TERM'
  | 'EMPLOYMENT_INJURY'
  | 'NON_CONTRIBUTORY'
  | 'LUMP_SUM'
  | 'REFUND';

export type BenefitBranch = 
  | 'GENERAL'
  | 'EMPLOYMENT_INJURY'
  | 'ASSISTANCE';

export type PaymentType = 
  | 'PENSION'
  | 'PERIODIC'
  | 'LUMP_SUM'
  | 'REFUND'
  | 'MEDICAL_EXPENSE'
  | 'GRANT';

export type CalculationBasis = 
  | 'AVERAGE_WEEKLY_EARNINGS'
  | 'AVERAGE_INSURABLE_WAGE'
  | 'TOTAL_CONTRIBUTIONS'
  | 'WAGE_CLASS'
  | 'FLAT_AMOUNT'
  | 'MEDICAL_INVOICE_AMOUNT'
  | 'PENSION_BASE';

export type CalculationType = 
  | 'PERCENTAGE_OF_WAGE'
  | 'PERCENTAGE_OF_PENSION'
  | 'LUMP_SUM_FORMULA'
  | 'FLAT_AMOUNT'
  | 'TABLE_LOOKUP'
  | 'TIERED_RATE'
  | 'REIMBURSEMENT_UP_TO_CAP';

export type RuleParameterType = 
  | 'AGE_AT_CLAIM'
  | 'TOTAL_CONTRIBUTIONS'
  | 'CONTRIBUTIONS_LAST_13_WEEKS'
  | 'CONTRIBUTIONS_LAST_12_MONTHS'
  | 'PAID_CONTRIBUTIONS'
  | 'HAS_MEDICAL_CERTIFICATE'
  | 'HAS_EMPLOYER_VERIFICATION'
  | 'IS_SPOUSE'
  | 'IS_CHILD'
  | 'IS_DEPENDENT'
  | 'CHILD_AGE'
  | 'CHILD_IN_EDUCATION'
  | 'INJURY_TYPE'
  | 'INJURY_WORK_RELATED'
  | 'DECEASED_CONTRIBUTIONS'
  | 'MEANS_TEST_INCOME'
  | 'RESIDENCE_CONFIRMED'
  | 'DISABILITY_PERCENTAGE'
  | 'MEDICAL_BOARD_CERTIFIED'
  | 'EMPLOYMENT_STATUS'
  | 'SELF_EMPLOYED'
  | 'CLAIM_SUBMISSION_DAYS'
  | 'LAST_DAY_WORKED'
  | 'EXPECTED_DELIVERY_DATE'
  | 'CONFINEMENT_DATE'
  | 'DEATH_DATE'
  | 'FUNERAL_INVOICE_AMOUNT';

export type RuleOperator = 
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN'
  | 'GREATER_OR_EQUAL'
  | 'LESS_THAN'
  | 'LESS_OR_EQUAL'
  | 'BETWEEN'
  | 'IN'
  | 'NOT_IN'
  | 'BOOLEAN'
  | 'EXISTS'
  | 'CONTAINS';

export type LogicConnector = 'AND' | 'OR';

export type RuleGroup = 
  | 'AGE'
  | 'CONTRIBUTION'
  | 'EMPLOYMENT'
  | 'MEDICAL'
  | 'DEPENDENCY'
  | 'MEANS_TEST'
  | 'INJURY'
  | 'FUNERAL'
  | 'MATERNITY'
  | 'RESIDENCE'
  | 'TIMING';

export type DocumentWhenRequired = 
  | 'AT_CLAIM'
  | 'BEFORE_FIRST_PAYMENT'
  | 'PERIODIC'
  | 'RENEWAL'
  | 'CONDITIONAL';

export type RoundingRule = 
  | 'ROUND_UP'
  | 'ROUND_DOWN'
  | 'ROUND_NEAREST'
  | 'NO_ROUNDING'
  | 'TWO_DECIMALS';

export type WorkflowScheme = 
  | 'BENEFIT_APPROVAL_SHORT_TERM'
  | 'BENEFIT_APPROVAL_LONG_TERM'
  | 'ASSISTANCE_APPROVAL'
  | 'INJURY_APPROVAL'
  | 'MEDICAL_BOARD_REVIEW'
  | 'SIMPLE_APPROVAL'
  | 'FAST_TRACK';

export interface BenefitRuleSet {
  id: string;
  benefitCode: string;
  benefitName: string;
  category: BenefitCategory;
  branch: BenefitBranch;
  paymentType: PaymentType;
  isVariantOf?: string; // Parent benefit ID
  description: string;
  legislativeReference?: string;
  notes?: string;
  activeFrom: string;
  activeTo?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
  version: number;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  
  // Configuration
  eligibilityRules: EligibilityRuleSet;
  calculationRules: CalculationRuleSet;
  timelines: TimelineRules;
  requiredDocuments: RequiredDocument[];
  workflow: WorkflowConfiguration;
}

export interface EligibilityRuleSet {
  ruleGroups: EligibilityRuleGroup[];
  groupLogic: 'ALL_GROUPS' | 'ANY_GROUP'; // AND/OR between groups
}

export interface EligibilityRuleGroup {
  groupId: string;
  groupName: string;
  groupType: RuleGroup;
  rules: EligibilityRule[];
  groupLogic: LogicConnector; // AND/OR within group
}

export interface EligibilityRule {
  ruleId: string;
  parameter: RuleParameterType;
  operator: RuleOperator;
  valueFrom?: any;
  valueTo?: any;
  values?: any[]; // For IN/NOT_IN operators
  logicConnector: LogicConnector;
  failureMessageKey: string;
  failureMessageText: string;
  isActive: boolean;
}

export interface CalculationRuleSet {
  calculationBasis: CalculationBasis;
  calculationType: CalculationType;
  formula?: string; // e.g., "0.65 * {AWE}" or "{AIW} * {PensionRate}"
  variables: CalculationVariable[];
  tiers?: CalculationTier[];
  rateTables?: RateTable[];
  limits: CalculationLimits;
  roundingRule: RoundingRule;
}

export interface CalculationVariable {
  variableName: string;
  variableKey: string; // e.g., {AWE}, {AIW}, {TotalContributions}
  description: string;
  dataSource: string;
  defaultValue?: number;
}

export interface CalculationTier {
  tierId: string;
  minValue: number;
  maxValue?: number;
  rate?: number;
  amount?: number;
  formula?: string;
}

export interface RateTable {
  tableId: string;
  tableName: string;
  lookupParameter: string; // TotalContributions, Age, ChildrenCount, etc.
  rows: RateTableRow[];
}

export interface RateTableRow {
  rowId: string;
  minValue: number;
  maxValue?: number;
  rate?: number;
  amount?: number;
  percentageBase?: number;
}

export interface CalculationLimits {
  minAmountXCD?: number;
  maxAmountXCD?: number;
  minRatePercent?: number;
  maxRatePercent?: number;
  maxDurationWeeks?: number;
  maxDurationMonths?: number;
  maxDurationYears?: number;
  capPerIncident?: number;
  capPerYear?: number;
}

export interface TimelineRules {
  claimFilingDeadlineDays?: number;
  retroactiveLimitMonths?: number;
  waitingDays?: number;
  paymentStartLogic: string; // e.g., "day 4", "immediately", "after verification"
  maxBackdatingDays?: number;
  maxDurationWeeks?: number;
  maxDurationMonths?: number;
  reviewFrequencyMonths?: number; // For long-term benefits
  expirationRules?: string;
  renewalRequired: boolean;
  renewalFrequencyMonths?: number;
}

export interface RequiredDocument {
  documentId: string;
  documentType: string;
  documentName: string;
  isMandatory: boolean;
  whenRequired: DocumentWhenRequired;
  frequencyMonths?: number;
  frequencyYears?: number;
  condition?: string; // e.g., "If age > 18", "If married"
  notes?: string;
}

export interface WorkflowConfiguration {
  workflowScheme: WorkflowScheme;
  requiresEmployerVerification: boolean;
  requiresMedicalBoardReview: boolean;
  requiresMeansTest: boolean;
  maxConcurrentClaimsAllowed: number;
  overlapRules: OverlapRule[];
  preEligibilityChecks: string[];
  autoApprovalThresholdXCD?: number;
  escalationRules?: EscalationRule[];
}

export interface OverlapRule {
  canOverlapWith: string; // Benefit code
  allowedOverlapPercentage?: number;
  notes?: string;
}

export interface EscalationRule {
  condition: string;
  escalateTo: string; // Role or user
  timeoutDays: number;
}

// Test Engine Types
export interface BenefitTestCase {
  testId: string;
  benefitRuleSetId: string;
  testName: string;
  insuredPersonSSN?: string;
  testData: BenefitTestData;
  expectedResults?: BenefitTestResults;
  actualResults?: BenefitTestResults;
  testStatus: 'PENDING' | 'PASS' | 'FAIL';
  testedBy?: string;
  testedAt?: string;
}

export interface BenefitTestData {
  age: number;
  dateOfBirth: string;
  totalContributions: number;
  paidContributions: number;
  recentContributions13Weeks: number;
  recentContributions12Months: number;
  averageWeeklyEarnings: number;
  averageInsurableWage: number;
  employmentStatus: string;
  hasMedicalCertificate: boolean;
  hasEmployerVerification: boolean;
  eventDate: string;
  claimSubmissionDate: string;
  dependents?: DependentInfo[];
  medicalInfo?: MedicalInfo;
  injuryInfo?: InjuryInfo;
  otherData?: Record<string, any>;
}

export interface DependentInfo {
  relationship: string;
  age: number;
  isStudent: boolean;
  isDependent: boolean;
}

export interface MedicalInfo {
  diagnosisDate: string;
  disabilityPercentage?: number;
  medicalBoardCertified: boolean;
  expectedReturnDate?: string;
}

export interface InjuryInfo {
  injuryDate: string;
  isWorkRelated: boolean;
  injuryType: string;
  medicalExpenses: number;
  travelExpenses: number;
}

export interface BenefitTestResults {
  eligibilityMet: boolean;
  eligibilityReasons: string[];
  failureReasons: string[];
  calculatedAmountWeekly?: number;
  calculatedAmountMonthly?: number;
  calculatedLumpSum?: number;
  durationWeeks?: number;
  durationMonths?: number;
  paymentStartDate?: string;
  paymentEndDate?: string;
  nextReviewDate?: string;
  missingDocuments: string[];
  warnings: string[];
  rulesApplied: string[];
}

// Benefit Rule History/Versioning
export interface BenefitRuleVersion {
  versionId: string;
  benefitRuleSetId: string;
  version: number;
  changeDescription: string;
  changedBy: string;
  changedAt: string;
  previousVersion: BenefitRuleSet;
  currentVersion: BenefitRuleSet;
  activatedFrom: string;
}
