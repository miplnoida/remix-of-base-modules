export interface Person {
  ssn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  address: string;
  bankAccount?: string;
  bankRoutingNumber?: string;
}

export interface Employer {
  id: string;
  name: string;
  registrationNumber: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
}

export interface Contribution {
  id: string;
  ssn: string;
  employerId: string;
  weekEnding: string;
  wages: number;
  contribution: number;
  credited: boolean;
  year: number;
}

export interface Document {
  id: string;
  claimId: string;
  type: string;
  filename: string;
  uploadDate: string;
  uploadedBy: string;
  verified: boolean;
  notes?: string;
}

export interface MedicalCertificate {
  id: string;
  claimId: string;
  doctorName: string;
  issueDate: string;
  diagnosis: string;
  incapacityPeriod: string;
  documentId: string;
}

export interface EIBIncident {
  id: string;
  claimId: string;
  incidentDate: string;
  incidentTime: string;
  location: string;
  description: string;
  witnesses: string[];
  employerReported: boolean;
  reportDate?: string;
}

export interface MedicalExpense {
  id: string;
  claimId: string;
  provider: string;
  serviceDate: string;
  description: string;
  amount: number;
  invoiceNumber: string;
  documentId: string;
}

export interface Claim {
  id: string;
  ssn: string;
  benefitType: BenefitType;
  status: ClaimStatus;
  submissionDate: string;
  lastUpdated: string;
  assignedTo?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  
  // Common fields
  contactPhone: string;
  contactEmail: string;
  bankAccount: string;
  bankRoutingNumber: string;
  declaration: boolean;
  digitalSignature: string;
  
  // Specific benefit data
  sicknessData?: SicknessClaimData;
  maternityData?: MaternityClaimData;
  employmentInjuryData?: EmploymentInjuryClaimData;
  funeralGrantData?: FuneralGrantClaimData;
  agePensionData?: AgePensionClaimData;
  invalidityData?: InvalidityClaimData;
  survivorsData?: SurvivorsClaimData;
  assistanceData?: AssistanceClaimData;
}

export interface SicknessClaimData {
  lastDayWorked: string;
  expectedReturnDate: string;
  employerId: string;
  medicalCertificateId: string;
}

export interface MaternityClaimData {
  expectedDeliveryDate: string;
  confinementDate?: string;
  medicalProofId: string;
}

export interface EmploymentInjuryClaimData {
  subBenefit: 'INJURY' | 'DISABLEMENT' | 'DEATH' | 'MEDICAL_EXPENSES';
  incidentId: string;
  employerReportId?: string;
  medicalExpenses?: MedicalExpense[];
}

export interface FuneralGrantClaimData {
  deceasedSSN: string;
  relationship: string;
  deathCertificateId: string;
  funeralInvoiceId: string;
}

export interface AgePensionClaimData {
  age: number;
  contributionWeeks: number;
  residenceConfirmed: boolean;
}

export interface InvalidityClaimData {
  medicalBoardCertificateId: string;
  doctorReportId: string;
  disabilityStartDate: string;
  impairmentPercentage?: number;
}

export interface SurvivorsClaimData {
  deceasedSSN: string;
  deathCertificateId: string;
  relationship: string;
  marriageCertificateId?: string;
  birthCertificateId?: string;
  dependentChildren: DependentChild[];
}

export interface DependentChild {
  name: string;
  dateOfBirth: string;
  studentStatus: boolean;
  birthCertificateId: string;
}

export interface AssistanceClaimData {
  age: number;
  proofOfIncomeId: string;
  proofOfResidenceId: string;
  unemploymentDeclaration: boolean;
}

export interface Award {
  id: string;
  claimId: string;
  benefitType: BenefitType;
  weeklyAmount?: number;
  monthlyAmount?: number;
  lumpSumAmount?: number;
  startDate: string;
  endDate?: string;
  reviewDate?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'CEASED';
}

export interface Payment {
  id: string;
  awardId: string;
  amount: number;
  paymentDate: string;
  method: 'EFT' | 'CHECK';
  reference: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'RETURNED';
}

export interface ClaimEvent {
  id: string;
  claimId: string;
  eventType: string;
  eventDate: string;
  performedBy: string;
  notes?: string;
  fromStatus?: ClaimStatus;
  toStatus?: ClaimStatus;
}

export interface Diary {
  id: string;
  claimId?: string;
  awardId?: string;
  type: 'MEDICAL_REVIEW' | 'PROOF_OF_LIFE' | 'STUDENT_CERT' | 'GENERAL';
  dueDate: string;
  description: string;
  completed: boolean;
  completedDate?: string;
  notes?: string;
}

export interface User {
  id: string;
  username: string;
  ssn?: string; // For contributors
  role: UserRole;
  firstName: string;
  lastName: string;
  email: string;
  active: boolean;
  lastLogin?: string;
}

export type UserRole = 
  | 'CONTRIBUTOR'
  | 'CLAIMS_OFFICER'
  | 'SUPERVISOR'
  | 'PAYMENTS_OFFICER'
  | 'MEDICAL_COORDINATOR'
  | 'EMPLOYER_LIAISON'
  | 'ADMIN'
  | 'AUDITOR';

export type BenefitType = 
  | 'SICKNESS'
  | 'MATERNITY'
  | 'EMPLOYMENT_INJURY'
  | 'FUNERAL_GRANT'
  | 'AGE_PENSION'
  | 'AGE_GRANT'
  | 'INVALIDITY'
  | 'SURVIVORS_PENSION'
  | 'SURVIVORS_GRANT'
  | 'NON_CONTRIBUTORY_PENSION';

export type ClaimStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'INTAKE_REVIEW'
  | 'ELIGIBILITY_CHECK'
  | 'EVIDENCE_REVIEW'
  | 'CALCULATION'
  | 'DECISION'
  | 'APPROVED'
  | 'DENIED'
  | 'AWARD_SETUP'
  | 'PAYMENT_QUEUE'
  | 'PAID'
  | 'IN_PAYMENT'
  | 'SUSPENDED'
  | 'CLOSED'
  | 'PENDING_INFO';

export interface EligibilitySnapshot {
  id: string;
  claimId: string;
  checkDate: string;
  eligibilityMet: boolean;
  contributionWeeks: number;
  requiredWeeks: number;
  reasonsFailure: string[];
  reasonsPass: string[];
}

export interface ConfigRate {
  id: string;
  benefitType: BenefitType;
  rateType: string; // 'PERCENTAGE' | 'FIXED_AMOUNT' | 'MAXIMUM' | 'MINIMUM'
  value: number;
  effectiveDate: string;
  endDate?: string;
}

export interface RuleSet {
  id: string;
  benefitType: BenefitType;
  ruleType: string; // 'ELIGIBILITY' | 'CALCULATION' | 'WAITING_PERIOD'
  rules: any; // JSON object containing rule definitions
  effectiveDate: string;
  endDate?: string;
}

export interface Pension {
  id: string;
  awardId: string;
  pensionType: 'AGE' | 'INVALIDITY' | 'SURVIVORS' | 'NON_CONTRIBUTORY';
  monthlyAmount: number;
  startDate: string;
  lastCOLA?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'CEASED';
  beneficiaries: PensionBeneficiary[];
}

export interface PensionBeneficiary {
  id: string;
  pensionId: string;
  ssn: string;
  relationship: string;
  percentage: number;
  startDate: string;
  endDate?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Overpayment {
  id: string;
  awardId: string;
  amount: number;
  reason: string;
  discoveredDate: string;
  recoveryPlan: {
    monthlyDeduction: number;
    startDate: string;
    estimatedCompletion: string;
  };
  status: 'ACTIVE' | 'COMPLETED' | 'WRITTEN_OFF';
}

export interface Message {
  id: string;
  fromUser: string;
  toUser: string;
  claimId?: string;
  subject: string;
  message: string;
  sentDate: string;
  read: boolean;
  attachments?: string[];
}