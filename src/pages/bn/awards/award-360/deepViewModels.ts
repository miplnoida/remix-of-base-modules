/**
 * BN-AWARD360-B3D — Deep view models for Pensioner, Claim, Product tabs.
 * Read-only. No mutation-capable fields.
 */

export type Award360WarningSeverity = 'info' | 'warn' | 'breach';

export interface Award360Warning {
  key: string;
  severity: Award360WarningSeverity;
  title: string;
  detail?: string;
}

export type Award360ReadinessState = 'READY' | 'PARTIAL' | 'MISSING' | 'NOT_APPLICABLE' | 'RESTRICTED';

export interface Award360ReadinessItem {
  key: string;
  label: string;
  state: Award360ReadinessState;
  explanation: string;
  targetRoute?: string;
}

// ─── Pensioner deep view ─────────────────────────────────────────────────

export interface PensionerIdentitySection {
  fullName: string | null;
  ssnMasked: string | null;
  canonicalPersonId: string | null;
  dob: string | null;
  age: number | null;
  sex: string | null;
  nationality: string | null;
  residencyStatus: string | null;
  personStatus: string | null;
  isDeceased: boolean;
  dateOfDeath: string | null;
}

export interface PensionerContactSection {
  mobile: string | null;
  phone: string | null;
  email: string | null;
  residentialAddress: string | null;
  mailingAddress: string | null;
  preferredChannel: string | null;
  preferredChannelFulfillable: boolean;
}

export interface PensionerPayeeSection {
  pensionerIsPayee: boolean;
  payeeName: string | null;
  payeeRelationship: string | null;
  guardianOrRepresentative: string | null;
  relationshipVerified: boolean | null;
}

export interface PensionerPaymentProfileSection {
  present: boolean;
  restricted: boolean;
  method: string | null;
  currency: string | null;
  bank: string | null;
  accountMasked: string | null;
  verified: boolean | null;
  verifiedDate: string | null;
  effectiveDate: string | null;
  active: boolean | null;
  blocked: boolean | null;
  blockReason: string | null;
  pendingChangeRequest: { id: string; status: string | null; createdAt: string | null } | null;
}

export interface PensionerRelatedRecords {
  relatedClaims: { id: string; claimNumber: string | null; status: string | null; route: string }[];
  relatedAwards: { id: string; awardNumber: string | null; status: string | null; route: string }[];
  dependants: { fullName: string | null; relationship: string | null; verified: boolean | null }[];
}

export interface PensionerRoutes {
  person360: string | null;
  personProfile: string | null;
  paymentProfiles: string | null;
}

export interface AwardPensionerDeepView {
  identity: PensionerIdentitySection;
  contact: PensionerContactSection;
  payee: PensionerPayeeSection;
  paymentProfile: PensionerPaymentProfileSection;
  related: PensionerRelatedRecords;
  routes: PensionerRoutes;
  warnings: Award360Warning[];
  partialWarnings: string[];
}

// ─── Claim deep view ─────────────────────────────────────────────────────

export interface ClaimHeaderSection {
  claimId: string;
  claimNumber: string | null;
  status: string | null;
  priority: string | null;
  applicationChannel: string | null;
  claimDate: string | null;
  submissionDate: string | null;
  productVersionId: string | null;
  productVersionLabel: string | null;
  assignedOfficer: string | null;
  workbasket: string | null;
  currentTask: string | null;
  slaDueAt: string | null;
  slaBreached: boolean;
}

export interface ClaimEligibilitySection {
  present: boolean;
  restricted: boolean;
  latestResult: string | null;
  checkedAt: string | null;
  passedCount: number;
  failedCount: number;
  warningCount: number;
  failedRules: { code: string; name: string; message: string | null }[];
  overrideActor: string | null;
  overrideReason: string | null;
}

export interface ClaimEvidenceSection {
  present: boolean;
  restricted: boolean;
  required: number;
  received: number;
  verified: number;
  missing: number;
  waived: number;
  blocking: { name: string; status: string | null; reason: string | null }[];
}

export interface ClaimCalculationSection {
  present: boolean;
  calcId: string | null;
  version: string | null;
  weeklyRate: number | null;
  monthlyRate: number | null;
  lumpSum: number | null;
  effectiveDate: string | null;
  status: string | null;
  overrideState: string | null;
  overrideReason: string | null;
  traceSummary: string | null;
}

export interface ClaimDecisionSection {
  present: boolean;
  recommendation: string | null;
  decision: string | null;
  decisionReason: string | null;
  narrative: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  approvalStatus: string | null;
  approvalLevel: number | null;
  makerChecker: string | null;
  policyReference: string | null;
}

export interface ClaimTimelineEvent {
  id: string;
  timestamp: string;
  kind: 'EVENT' | 'STATUS' | 'DECISION' | 'NOTE' | 'WORKFLOW';
  label: string;
  fromValue?: string | null;
  toValue?: string | null;
  actor?: string | null;
}

export interface ClaimRoutes {
  workbench: string;
  eligibility: string;
  calculation: string;
  recommendation: string;
  determination: string;
}

export interface AwardClaimDeepView {
  header: ClaimHeaderSection;
  eligibility: ClaimEligibilitySection;
  evidence: ClaimEvidenceSection;
  calculation: ClaimCalculationSection;
  decision: ClaimDecisionSection;
  timeline: ClaimTimelineEvent[];
  routes: ClaimRoutes;
  warnings: Award360Warning[];
  partialWarnings: string[];
}

// ─── Product deep view ───────────────────────────────────────────────────

export interface ProductIdentitySection {
  productId: string;
  productCode: string | null;
  productName: string | null;
  benefitCode: string | null;
  scheme: string | null;
  branch: string | null;
  category: string | null;
  paymentType: string | null;
  country: string | null;
  status: string | null;
  legalReference: string | null;
}

export interface ProductVersionSection {
  present: boolean;
  versionId: string | null;
  versionNumber: string | null;
  status: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  published: boolean;
  createdBy: string | null;
  createdAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  productMatchesAward: boolean;
  awardWithinEffective: boolean | null;
}

export interface AwardProductDeepView {
  identity: ProductIdentitySection;
  version: ProductVersionSection;
  readiness: Award360ReadinessItem[];
  routes: { catalog: string; formulas: string; documentSetup: string; screenSetup: string };
  warnings: Award360Warning[];
  partialWarnings: string[];
  restrictedConfiguration: boolean;
}
