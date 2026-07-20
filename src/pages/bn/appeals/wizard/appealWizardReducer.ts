/**
 * BN-AP-01 Slice 2B.1A — Staff-Assisted Appeal Intake wizard state.
 *
 * Read-only pilot: Save Draft and "Register Received Appeal" remain
 * disabled until BN_APPEAL_REGISTER_RECEIVED_APPEAL is implemented in a
 * later slice. This reducer tracks step navigation, source selection,
 * receipt details, classification, filing deadline, grounds/issues, and
 * evidence — and clears dependent state on upstream changes.
 */

export type WizardStepId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type AppealReceiptChannel =
  | 'WALK_IN'
  | 'POST'
  | 'EMAIL'
  | 'PHONE_ASSISTED'
  | 'INTERNAL_REFERRAL'
  | 'LEGAL_REPRESENTATIVE'
  | 'OTHER';

export const APPEAL_RECEIPT_CHANNELS: readonly AppealReceiptChannel[] = [
  'WALK_IN',
  'POST',
  'EMAIL',
  'PHONE_ASSISTED',
  'INTERNAL_REFERRAL',
  'LEGAL_REPRESENTATIVE',
  'OTHER',
];

export interface AppealReceiptDetails {
  receiptChannel: AppealReceiptChannel | null;
  receivedAt: string | null;
  receivedByUserId: string | null;
  receivedOfficeId: string | null;
  externalSubmissionReference: string | null;
  originalSubmissionDate: string | null;
  originalDocumentReference: string | null;
}

export interface WizardIssue {
  key: string;
  issueCode: string;
  description: string;
  disputedAmount: number | null;
  requestedRemedyCode: string | null;
}

export interface WizardState {
  currentStep: WizardStepId;
  dirty: boolean;
  // Step 1 — Source Decision
  sourceModule: string | null;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
  sourceDecisionId: string | null;
  sourceDisplayReference: string | null;
  sourceDecisionDate: string | null;
  sourceNotifiedAt: string | null;
  claimantPersonId: string | null;
  claimantDisplayName: string | null;
  benefitTypeCode: string | null;
  // Receipt Details — captured by staff at Step 1 to establish that the
  // appellant filed OUTSIDE the system (walk-in / post / email / phone /
  // referral / representative) and is now being registered on their
  // behalf. Required before Step 2 becomes ready.
  receipt: AppealReceiptDetails;
  // Step 2 — Appellant / Representation
  representationMode: 'SELF' | 'REPRESENTATIVE' | 'GUARDIAN' | 'PAYEE' | null;
  representativeLinkId: string | null;
  // Step 3 — Classification
  appealTypeCode: string | null;
  caseKind: string | null;
  reviewLevelCode: string | null;
  countryCode: string | null;
  languageCode: string | null;
  requiresHearing: boolean | null;
  priorityCode: string | null;
  confidentialityCode: string | null;
  // Step 4 — Filing
  submissionDate: string | null;
  lateFilingExplanation: string | null;
  // Step 5 — Grounds & Issues
  groundCodes: string[];
  primaryGroundCode: string | null;
  issues: WizardIssue[];
  // Step 6 — Evidence
  linkedEvidenceIds: string[];
}

export type WizardAction =
  | { type: 'SET_STEP'; step: WizardStepId }
  | { type: 'SELECT_SOURCE'; payload: {
      sourceModule: string; sourceEntityType: string; sourceEntityId: string; sourceDecisionId: string;
      displayReference: string | null; decisionDate: string | null; notifiedAt: string | null;
      claimantPersonId: string | null; claimantDisplayName: string | null; benefitTypeCode: string | null;
    } }
  | { type: 'CLEAR_SOURCE' }
  | { type: 'SET_RECEIPT'; patch: Partial<AppealReceiptDetails> }
  | { type: 'SET_REPRESENTATION'; mode: WizardState['representationMode']; linkId: string | null }
  | { type: 'SET_CLASSIFICATION'; patch: Partial<Pick<WizardState, 'appealTypeCode' | 'caseKind' | 'reviewLevelCode' | 'countryCode' | 'languageCode' | 'requiresHearing' | 'priorityCode' | 'confidentialityCode'>> }
  | { type: 'SET_FILING'; patch: Partial<Pick<WizardState, 'submissionDate' | 'lateFilingExplanation'>> }
  | { type: 'SET_GROUNDS'; groundCodes: string[]; primaryGroundCode: string | null }
  | { type: 'SET_ISSUES'; issues: WizardIssue[] }
  | { type: 'SET_EVIDENCE'; linkedEvidenceIds: string[] }
  | { type: 'RESET' };

export const INITIAL_RECEIPT: AppealReceiptDetails = {
  receiptChannel: null,
  receivedAt: null,
  receivedByUserId: null,
  receivedOfficeId: null,
  externalSubmissionReference: null,
  originalSubmissionDate: null,
  originalDocumentReference: null,
};

export const INITIAL_WIZARD_STATE: WizardState = {
  currentStep: 1,
  dirty: false,
  sourceModule: null,
  sourceEntityType: null,
  sourceEntityId: null,
  sourceDecisionId: null,
  sourceDisplayReference: null,
  sourceDecisionDate: null,
  sourceNotifiedAt: null,
  claimantPersonId: null,
  claimantDisplayName: null,
  benefitTypeCode: null,
  receipt: { ...INITIAL_RECEIPT },
  representationMode: null,
  representativeLinkId: null,
  appealTypeCode: null,
  caseKind: null,
  reviewLevelCode: null,
  countryCode: 'KN',
  languageCode: 'en-KN',
  requiresHearing: null,
  priorityCode: 'NORMAL',
  confidentialityCode: 'STANDARD',
  submissionDate: new Date().toISOString().slice(0, 10),
  lateFilingExplanation: null,
  groundCodes: [],
  primaryGroundCode: null,
  issues: [],
  linkedEvidenceIds: [],
};

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step };
    case 'SELECT_SOURCE':
      // Changing source clears everything downstream.
      return {
        ...state,
        dirty: true,
        sourceModule: action.payload.sourceModule,
        sourceEntityType: action.payload.sourceEntityType,
        sourceEntityId: action.payload.sourceEntityId,
        sourceDecisionId: action.payload.sourceDecisionId,
        sourceDisplayReference: action.payload.displayReference,
        sourceDecisionDate: action.payload.decisionDate,
        sourceNotifiedAt: action.payload.notifiedAt,
        claimantPersonId: action.payload.claimantPersonId,
        claimantDisplayName: action.payload.claimantDisplayName,
        benefitTypeCode: action.payload.benefitTypeCode,
        representationMode: null,
        representativeLinkId: null,
        appealTypeCode: null,
        caseKind: null,
        reviewLevelCode: null,
        requiresHearing: null,
        lateFilingExplanation: null,
        groundCodes: [],
        primaryGroundCode: null,
        issues: [],
        linkedEvidenceIds: [],
      };
    case 'CLEAR_SOURCE':
      return { ...INITIAL_WIZARD_STATE, currentStep: state.currentStep };
    case 'SET_RECEIPT':
      return { ...state, dirty: true, receipt: { ...state.receipt, ...action.patch } };
    case 'SET_REPRESENTATION':
      return { ...state, dirty: true, representationMode: action.mode, representativeLinkId: action.linkId };
    case 'SET_CLASSIFICATION': {
      const next = { ...state, dirty: true, ...action.patch };
      // Changing appealType invalidates deadline computation and grounds primary.
      if (action.patch.appealTypeCode !== undefined && action.patch.appealTypeCode !== state.appealTypeCode) {
        next.lateFilingExplanation = null;
      }
      return next;
    }
    case 'SET_FILING':
      return { ...state, dirty: true, ...action.patch };
    case 'SET_GROUNDS':
      return { ...state, dirty: true, groundCodes: action.groundCodes, primaryGroundCode: action.primaryGroundCode };
    case 'SET_ISSUES':
      return { ...state, dirty: true, issues: action.issues };
    case 'SET_EVIDENCE':
      return { ...state, dirty: true, linkedEvidenceIds: action.linkedEvidenceIds };
    case 'RESET':
      return INITIAL_WIZARD_STATE;
    default:
      return state;
  }
}

export function isReceiptComplete(receipt: AppealReceiptDetails): boolean {
  return !!(receipt.receiptChannel && receipt.receivedAt);
}

export function isStepReady(state: WizardState, step: WizardStepId): boolean {
  switch (step) {
    case 1: return true;
    case 2: return !!state.sourceEntityId && isReceiptComplete(state.receipt);
    case 3: return !!state.sourceEntityId && isReceiptComplete(state.receipt) && !!state.representationMode;
    case 4: return !!state.appealTypeCode;
    case 5: return !!state.appealTypeCode && !!state.submissionDate;
    case 6: return state.groundCodes.length > 0;
    case 7: return state.groundCodes.length > 0;
    default: return false;
  }
}
