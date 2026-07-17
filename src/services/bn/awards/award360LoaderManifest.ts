/**
 * AW360-WAVE-1-C1 Slice B.1a §1 — Loader Manifest.
 *
 * Every symbol exported from the three Award 360 service files is
 * classified below. New exports MUST be added to this manifest; the
 * drift test (`loaderManifest.test.ts`) fails when:
 *
 *   • A new async/query export is present but unclassified.
 *   • A manifest entry references a symbol that no longer exists.
 *   • A `QUERY_LOADER` has no execution scenario.
 *
 * This checkpoint executes six loaders against the schema contract:
 *   getAward360Header, getAward360Summary, getAwardClaim,
 *   getAwardProduct, listAwardCommunications, listAwardAudit.
 *
 * All other query loaders are enumerated below but marked as
 * `pendingExecution` — Slice B.1b will run them.
 */

export type Award360ExportClassification =
  | 'QUERY_LOADER'
  | 'PURE_MAPPER'
  | 'TYPE_ONLY'
  | 'CONSTANT'
  | 'INTERNAL_HELPER';

export type Award360LoaderCategory =
  | 'HEADER'
  | 'OVERVIEW'
  | 'SUMMARY'
  | 'PENSIONER'
  | 'CLAIM'
  | 'PRODUCT'
  | 'BENEFICIARY'
  | 'SCHEDULE'
  | 'PAYMENT'
  | 'LIFE_CERTIFICATE'
  | 'MEDICAL'
  | 'SUSPENSION'
  | 'OVERPAYMENT'
  | 'COMMUNICATION'
  | 'AUDIT';

export interface Award360ExportEntry {
  name: string;
  sourceFile: string;
  classification: Award360ExportClassification;
  /** Loader category — required when `classification === 'QUERY_LOADER'`. */
  category?: Award360LoaderCategory;
  /** Tables the loader reads. Required for QUERY_LOADER. */
  expectedTables?: readonly string[];
  /** Scenario ids this checkpoint executes for the loader (may be empty). */
  scenarioIds?: readonly string[];
  /** True when Slice B.1a defers execution to a subsequent batch. */
  pendingExecution?: boolean;
}

const F_SVC = 'src/services/bn/awards/award360Service.ts';
const F_DEEP = 'src/services/bn/awards/award360DeepService.ts';
const F_SUM = 'src/services/bn/awards/award360SummaryService.ts';

export const AWARD360_LOADER_MANIFEST: readonly Award360ExportEntry[] = [
  // ─── award360Service.ts — query loaders ────────────────────────────────
  {
    name: 'getAward360Header',
    sourceFile: F_SVC,
    classification: 'QUERY_LOADER',
    category: 'HEADER',
    expectedTables: ['bn_award', 'ip_master', 'bn_product', 'bn_claim', 'bn_product_version'],
    scenarioIds: [
      'header-with-ssn-claim-and-version',
      'header-without-ssn',
      'header-without-claim',
      'header-with-claim-no-version',
    ],
  },
  {
    name: 'getAwardPensioner',
    sourceFile: F_SVC,
    classification: 'QUERY_LOADER',
    category: 'PENSIONER',
    expectedTables: ['bn_award', 'ip_master'],
    scenarioIds: [
      'pensioner-with-person',
      'pensioner-award-without-ssn',
      'pensioner-person-missing',
      'pensioner-award-error',
      'pensioner-deceased',
      'pensioner-active-status',
      'pensioner-contact-fallbacks',
    ],
  },
  {
    name: 'getAwardClaim',
    sourceFile: F_SVC,
    classification: 'QUERY_LOADER',
    category: 'CLAIM',
    expectedTables: ['bn_award', 'bn_claim'],
    scenarioIds: [
      'claim-linked',
      'claim-not-linked',
      'claim-missing',
    ],
  },
  {
    name: 'getAwardProduct',
    sourceFile: F_SVC,
    classification: 'QUERY_LOADER',
    category: 'PRODUCT',
    expectedTables: ['bn_award', 'bn_product', 'bn_claim', 'bn_product_version'],
    scenarioIds: [
      'product-with-version',
      'product-without-claim',
      'product-with-claim-no-version',
      'product-missing',
    ],
  },
  {
    name: 'listAwardBeneficiaries',
    sourceFile: F_SVC,
    classification: 'QUERY_LOADER',
    category: 'BENEFICIARY',
    expectedTables: ['bn_award_beneficiary'],
    pendingExecution: true,
  },
  {
    name: 'listAwardSchedules',
    sourceFile: F_SVC,
    classification: 'QUERY_LOADER',
    category: 'SCHEDULE',
    expectedTables: ['bn_payment_schedule'],
    pendingExecution: true,
  },
  {
    name: 'listAwardPayments',
    sourceFile: F_SVC,
    classification: 'QUERY_LOADER',
    category: 'PAYMENT',
    expectedTables: ['bn_payment_instruction'],
    pendingExecution: true,
  },
  {
    name: 'listAwardLifeCertificates',
    sourceFile: F_SVC,
    classification: 'QUERY_LOADER',
    category: 'LIFE_CERTIFICATE',
    expectedTables: ['bn_life_certificate'],
    pendingExecution: true,
  },
  {
    name: 'listAwardMedicalReviews',
    sourceFile: F_SVC,
    classification: 'QUERY_LOADER',
    category: 'MEDICAL',
    expectedTables: ['bn_medical_review_schedule'],
    pendingExecution: true,
  },
  {
    name: 'listAwardMedicalReviewsPaged',
    sourceFile: F_SVC,
    classification: 'QUERY_LOADER',
    category: 'MEDICAL',
    expectedTables: ['bn_medical_review_schedule'],
    pendingExecution: true,
  },
  {
    name: 'getAwardMedicalReviewDetail',
    sourceFile: F_SVC,
    classification: 'QUERY_LOADER',
    category: 'MEDICAL',
    expectedTables: ['bn_medical_review_schedule'],
    pendingExecution: true,
  },
  {
    name: 'listAwardSuspensions',
    sourceFile: F_SVC,
    classification: 'QUERY_LOADER',
    category: 'SUSPENSION',
    expectedTables: ['bn_award_suspension_event', 'core_workflow_task'],
    pendingExecution: true,
  },
  {
    name: 'listAwardOverpayments',
    sourceFile: F_SVC,
    classification: 'QUERY_LOADER',
    category: 'OVERPAYMENT',
    expectedTables: ['bn_overpayment'],
    pendingExecution: true,
  },
  {
    name: 'listAwardCommunications',
    sourceFile: F_SVC,
    classification: 'QUERY_LOADER',
    category: 'COMMUNICATION',
    expectedTables: ['bn_award', 'bn_communication_log'],
    scenarioIds: [
      'comm-claim-and-context',
      'comm-context-only',
      'comm-empty',
      'comm-query-error',
    ],
  },
  {
    name: 'loadAwardAuditSources',
    sourceFile: F_SVC,
    classification: 'QUERY_LOADER',
    category: 'AUDIT',
    expectedTables: [
      'bn_award_status_event',
      'bn_award_rate_history',
      'bn_award_suspension_event',
      'core_audit_log',
    ],
    scenarioIds: [
      'audit-without-central',
      'audit-with-central',
      'audit-source-failure',
    ],
  },
  {
    name: 'listAwardAudit',
    sourceFile: F_SVC,
    classification: 'QUERY_LOADER',
    category: 'AUDIT',
    expectedTables: [
      'bn_award_status_event',
      'bn_award_rate_history',
      'bn_award_suspension_event',
      'core_audit_log',
    ],
    scenarioIds: ['audit-flat-without-central', 'audit-flat-with-central'],
  },
  {
    name: 'listAwardAuditPaged',
    sourceFile: F_SVC,
    classification: 'QUERY_LOADER',
    category: 'AUDIT',
    expectedTables: [
      'bn_award_status_event',
      'bn_award_rate_history',
      'bn_award_suspension_event',
      'core_audit_log',
    ],
    pendingExecution: true,
  },
  {
    name: 'getAward360OverviewCounts',
    sourceFile: F_SVC,
    classification: 'QUERY_LOADER',
    category: 'OVERVIEW',
    expectedTables: [
      'bn_award_beneficiary',
      'bn_payment_schedule',
      'bn_payment_instruction',
      'bn_life_certificate',
      'bn_medical_review_schedule',
      'bn_award_suspension_event',
      'bn_overpayment',
      'bn_communication_log',
    ],
    pendingExecution: true,
  },
  { name: 'listAwardSchedulesPaged', sourceFile: F_SVC, classification: 'QUERY_LOADER', category: 'SCHEDULE', expectedTables: ['bn_payment_schedule'], pendingExecution: true },
  { name: 'getAwardScheduleDetail', sourceFile: F_SVC, classification: 'QUERY_LOADER', category: 'SCHEDULE', expectedTables: ['bn_payment_schedule'], pendingExecution: true },
  { name: 'listAwardPaymentsPaged', sourceFile: F_SVC, classification: 'QUERY_LOADER', category: 'PAYMENT', expectedTables: ['bn_payment_instruction'], pendingExecution: true },
  { name: 'listAwardLifeCertificatesPaged', sourceFile: F_SVC, classification: 'QUERY_LOADER', category: 'LIFE_CERTIFICATE', expectedTables: ['bn_life_certificate'], pendingExecution: true },
  { name: 'getAwardLifeCertificateReminders', sourceFile: F_SVC, classification: 'QUERY_LOADER', category: 'LIFE_CERTIFICATE', expectedTables: ['bn_life_certificate'], pendingExecution: true },
  { name: 'listAwardBeneficiariesPaged', sourceFile: F_SVC, classification: 'QUERY_LOADER', category: 'BENEFICIARY', expectedTables: ['bn_award_beneficiary'], pendingExecution: true },
  { name: 'getAwardBeneficiaryDetail', sourceFile: F_SVC, classification: 'QUERY_LOADER', category: 'BENEFICIARY', expectedTables: ['bn_award_beneficiary'], pendingExecution: true },
  { name: 'listAwardOverpaymentsPaged', sourceFile: F_SVC, classification: 'QUERY_LOADER', category: 'OVERPAYMENT', expectedTables: ['bn_overpayment'], pendingExecution: true },
  { name: 'getAwardOverpaymentDetail', sourceFile: F_SVC, classification: 'QUERY_LOADER', category: 'OVERPAYMENT', expectedTables: ['bn_overpayment', 'bn_payment_schedule'], pendingExecution: true },
  { name: 'listAwardCommunicationsPaged', sourceFile: F_SVC, classification: 'QUERY_LOADER', category: 'COMMUNICATION', expectedTables: ['bn_award', 'bn_communication_log'], pendingExecution: true },
  { name: 'getAwardCommunicationDetail', sourceFile: F_SVC, classification: 'QUERY_LOADER', category: 'COMMUNICATION', expectedTables: ['bn_communication_log', 'bn_letter'], pendingExecution: true },

  // ─── award360Service.ts — non-loader exports ──────────────────────────
  { name: 'AWARD_AUDIT_STATUS_COLUMNS', sourceFile: F_SVC, classification: 'CONSTANT' },
  { name: 'AWARD_AUDIT_RATE_COLUMNS', sourceFile: F_SVC, classification: 'CONSTANT' },
  { name: 'AWARD_AUDIT_SUSPENSION_COLUMNS', sourceFile: F_SVC, classification: 'CONSTANT' },
  { name: 'AWARD_AUDIT_CENTRAL_COLUMNS', sourceFile: F_SVC, classification: 'CONSTANT' },
  { name: 'isWithinAuditRange', sourceFile: F_SVC, classification: 'PURE_MAPPER' },
  { name: 'resolveLifeCertificateCompliance', sourceFile: F_SVC, classification: 'PURE_MAPPER' },
  { name: 'validateAwardBeneficiaries', sourceFile: F_SVC, classification: 'PURE_MAPPER' },

  // ─── award360DeepService.ts ───────────────────────────────────────────
  {
    name: 'getAwardPensionerDeep',
    sourceFile: F_DEEP,
    classification: 'QUERY_LOADER',
    category: 'PENSIONER',
    expectedTables: ['bn_award', 'ip_master', 'ip_depend', 'bn_payment_profile', 'bn_payment_profile_change_request'],
    pendingExecution: true,
  },
  {
    name: 'getAwardClaimDeep',
    sourceFile: F_DEEP,
    classification: 'QUERY_LOADER',
    category: 'CLAIM',
    expectedTables: [
      'bn_claim',
      'bn_award',
      'bn_claim_queue_assignment',
      'bn_product_version',
      'bn_claim_eligibility',
      'bn_claim_calculation',
      'bn_claim_decision',
      'bn_claim_evidence',
      'bn_doc_requirement',
      'bn_claim_event',
      'bn_claim_note',
      'bn_override_request',
    ],
    pendingExecution: true,
  },
  {
    name: 'getAwardProductDeep',
    sourceFile: F_DEEP,
    classification: 'QUERY_LOADER',
    category: 'PRODUCT',
    expectedTables: [
      'bn_product',
      'bn_product_version',
      'bn_product_formula_binding',
      'bn_eligibility_rule',
      'bn_approval_policy',
      'bn_comm_mapping',
    ],
    pendingExecution: true,
  },

  // ─── award360SummaryService.ts ────────────────────────────────────────
  {
    name: 'getAward360Summary',
    sourceFile: F_SUM,
    classification: 'QUERY_LOADER',
    category: 'SUMMARY',
    expectedTables: [
      'bn_award_beneficiary',
      'bn_payment_schedule',
      'bn_payment_instruction',
      'bn_life_certificate',
      'bn_medical_review_schedule',
      'bn_award_suspension_event',
      'bn_overpayment',
      'bn_communication_log',
      'bn_award',
      'ip_master',
      'bn_payment_profile',
    ],
    scenarioIds: [
      'summary-all-includes',
      'summary-all-restricted',
      'summary-medical-error',
      'summary-communications-error',
      'summary-pensioner-alert-full',
      'summary-pensioner-alert-restricted',
    ],
  },
] as const;

/** Loaders executed in this checkpoint (Slice B.1a). */
export const AWARD360_CHECKPOINT_LOADERS = [
  'getAward360Header',
  'getAward360Summary',
  'getAwardClaim',
  'getAwardProduct',
  'listAwardCommunications',
  'listAwardAudit',
  'loadAwardAuditSources',
] as const;

export type Award360CheckpointLoader = (typeof AWARD360_CHECKPOINT_LOADERS)[number];
