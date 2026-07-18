/**
 * AW360-WAVE-1-C1 Sub-batch B2-b.1b — Certification registry.
 *
 * Authoritative list of Award 360 loaders whose real production
 * implementations have been executed against `AWARD360_SCHEMA_CONTRACT`
 * via `AwardQueryRecorder` in `award360LoaderCertification.test.ts`.
 *
 * Cycle rule: this module has NO imports. It is the leaf of the
 * dependency chain
 *
 *   award360CertificationRegistry
 *         ↓
 *   award360LoaderManifest
 *         ↓
 *   award360LoaderEvidence   (derives loader-to-table mapping)
 *         ↓
 *   award360SchemaContract   (renders the query matrix)
 *
 * A loader listed here MUST NOT be marked `pendingExecution` in the
 * manifest, and every scenario listed here MUST be actually executed in
 * the certification test — both directions are enforced by
 * `certificationRegistryReconciliation.test.ts` and by the runtime
 * evidence reconciliation at the end of the certification suite.
 */

export interface Award360CertifiedScenario {
  readonly id: string;
  readonly description: string;
}

/**
 * AW360-WAVE-1-C1 Sub-batch B2-c.2 — Certification suite identifier.
 *
 * Each certified loader is owned by exactly one certification test suite.
 * The suite identifier is used by the shared evidence-reconciliation
 * helper (`assertLoaderCertificationEvidence`) to scope structural and
 * runtime checks to only the entries that a given suite is expected to
 * exercise, so Product Deep evidence in one file cannot be conflated
 * with main-suite evidence in another.
 */
export type Award360CertificationSuiteId =
  | 'main-loader-certification'
  | 'product-deep-certification'
  | 'operational-simple-certification';

export const AWARD360_CERTIFICATION_SUITE_IDS: readonly Award360CertificationSuiteId[] = [
  'main-loader-certification',
  'product-deep-certification',
  'operational-simple-certification',
];

export interface Award360LoaderCertification {
  readonly loaderName: string;
  readonly suiteId: Award360CertificationSuiteId;
  readonly scenarios: readonly Award360CertifiedScenario[];
}

export const AWARD360_CERTIFICATION_REGISTRY: Readonly<Record<string, Award360LoaderCertification>> = {
  getAward360Header: {
    loaderName: 'getAward360Header',
    suiteId: 'main-loader-certification',
    scenarios: [
      { id: 'header-with-ssn-claim-and-version', description: 'Award has SSN, linked claim and product-version — five-hop chain.' },
      { id: 'header-without-ssn', description: 'Award without SSN short-circuits before ip_master.' },
      { id: 'header-without-claim', description: 'Award without claim skips bn_claim and bn_product_version.' },
      { id: 'header-with-claim-no-version', description: 'Claim carries no product_version_id — bn_product_version skipped.' },
    ],
  },
  getAwardPensioner: {
    loaderName: 'getAwardPensioner',
    suiteId: 'main-loader-certification',
    scenarios: [
      { id: 'pensioner-with-person', description: 'Award linked to ip_master with canonical contact fallbacks.' },
      { id: 'pensioner-award-without-ssn', description: 'Award has no SSN — ip_master query skipped.' },
      { id: 'pensioner-person-missing', description: 'ip_master row absent — loader returns null.' },
      { id: 'pensioner-award-query-error', description: 'bn_award lookup fails — loader throws.' },
      { id: 'pensioner-person-query-error', description: 'ip_master lookup fails — loader throws.' },
      { id: 'pensioner-deceased', description: 'Canonical status = DECEASED flagged.' },
      { id: 'pensioner-active-status', description: 'Active person is not flagged deceased.' },
      { id: 'pensioner-contact-fallbacks', description: 'Primary contact fields preferred over legacy fallbacks.' },
    ],
  },
  getAwardClaim: {
    loaderName: 'getAwardClaim',
    suiteId: 'main-loader-certification',
    scenarios: [
      { id: 'claim-linked', description: 'Award linked to a claim — bn_claim scoped by id.' },
      { id: 'claim-not-linked', description: 'Award without linked claim — bn_claim skipped.' },
      { id: 'claim-missing', description: 'bn_claim row absent — loader returns null.' },
    ],
  },
  getAwardProduct: {
    loaderName: 'getAwardProduct',
    suiteId: 'main-loader-certification',
    scenarios: [
      { id: 'product-with-version', description: 'Full chain: award → product → claim → product_version.' },
      { id: 'product-without-claim', description: 'No linked claim — bn_claim / bn_product_version skipped.' },
      { id: 'product-with-claim-no-version', description: 'Claim carries no product_version_id.' },
      { id: 'product-missing', description: 'Award has no product id — loader returns null.' },
    ],
  },
  listAwardCommunications: {
    loaderName: 'listAwardCommunications',
    suiteId: 'main-loader-certification',
    scenarios: [
      { id: 'comm-claim-and-context', description: 'Both claim_id and contains(context) queries issued.' },
      { id: 'comm-context-only', description: 'Award without claim — only the contains(context) query issued.' },
      { id: 'comm-empty', description: 'No rows — empty list returned.' },
      { id: 'comm-query-error', description: 'Table error is isolated via Promise.allSettled.' },
    ],
  },
  loadAwardAuditSources: {
    loaderName: 'loadAwardAuditSources',
    suiteId: 'main-loader-certification',
    scenarios: [
      { id: 'audit-without-central', description: 'includeCentralAudit=false — core_audit_log skipped, marked restricted.' },
      { id: 'audit-with-central', description: 'includeCentralAudit=true — composite entity_type=bn_award scope enforced.' },
      { id: 'audit-source-failure', description: 'Single source failure is isolated to that source only.' },
    ],
  },
  listAwardAudit: {
    loaderName: 'listAwardAudit',
    suiteId: 'main-loader-certification',
    scenarios: [
      { id: 'audit-flat-without-central', description: 'Compat wrapper reads the three award-scoped audit sources.' },
    ],
  },
  getAward360Summary: {
    loaderName: 'getAward360Summary',
    suiteId: 'main-loader-certification',
    scenarios: [
      { id: 'summary-all-restricted', description: 'No include flags — zero queries; every section reports restricted.' },
      { id: 'summary-all-includes', description: 'All flags on — every operational table queried with contract columns.' },
      { id: 'summary-medical-error', description: 'Medical source failure isolated to that section.' },
      { id: 'summary-communications-error', description: 'Communications source failure isolated to that section.' },
      { id: 'summary-pensioner-alert-restricted', description: 'canViewPerson360=false + canViewPaymentProfile=false skip ip_master / bn_payment_profile.' },
    ],
  },
  getAwardPensionerDeep: {
    loaderName: 'getAwardPensionerDeep',
    suiteId: 'main-loader-certification',
    scenarios: [
      { id: 'deep-full-access', description: 'Full permissions — every canonical table queried with correct scope.' },
      { id: 'deep-payment-profile-restricted', description: 'canViewPaymentProfile=false — profile / change-request skipped.' },
      { id: 'deep-person360-restricted', description: 'canViewPerson360=false — canonicalPersonId and person-360 route null.' },
      { id: 'deep-award-not-found', description: 'bn_award without SSN — loader returns null before ip_master.' },
      { id: 'deep-person-missing', description: 'ip_master row absent — PENSIONER_MISSING warning surfaced.' },
      { id: 'deep-payment-profile-error', description: 'Payment-profile failure isolated to partialWarnings.' },
      { id: 'deep-related-claims-error', description: 'Related-claims failure isolated to partialWarnings.' },
      { id: 'deep-pending-change-only', description: 'Pending change request without a live payment profile.' },
      { id: 'deep-person-query-error', description: 'Primary ip_master failure rejects — no optional-source substitution.' },
      { id: 'deep-dependants-error', description: 'ip_depend failure isolated — dependants empty, identity preserved.' },
      { id: 'deep-change-request-error', description: 'Change-request failure isolated — valid payment profile preserved.' },
      { id: 'deep-related-awards-error', description: 'Occurrence-scoped bn_award related-awards failure — primary lookup unaffected.' },
      { id: 'deep-related-awards-empty-success', description: 'Related-awards query returns [] cleanly — no partial warning.' },
      { id: 'deep-dependants-empty-success', description: 'ip_depend returns [] cleanly — no partial warning.' },
      { id: 'deep-change-request-empty-success', description: 'Change-request maybeSingle returns null cleanly — no partial warning.' },
    ],
  },
  getAwardClaimDeep: {
    loaderName: 'getAwardClaimDeep',
    suiteId: 'main-loader-certification',
    scenarios: [
      { id: 'claim-deep-full-access', description: 'Full permissions — every canonical Claim Deep table queried with correct scope.' },
      { id: 'claim-deep-unlinked-award', description: 'Award without bn_claim_id — Claim child queries skipped, loader returns null.' },
      { id: 'claim-deep-award-query-error', description: 'bn_award lookup fails — loader rejects.' },
      { id: 'claim-deep-claim-not-found', description: 'bn_claim maybeSingle returns null — CLAIM_NOT_FOUND view contract preserved.' },
      { id: 'claim-deep-claim-query-error', description: 'bn_claim lookup fails — loader rejects.' },
      { id: 'claim-deep-workflow-restricted', description: 'canViewWorkflow=false — queue, event, note queries skipped; timeline=[].' },
      { id: 'claim-deep-evidence-restricted', description: 'canViewEvidence=false — bn_claim_evidence / bn_doc_requirement skipped.' },
      { id: 'claim-deep-product-version-missing', description: 'Claim carries no product_version_id — bn_product_version skipped.' },
      { id: 'claim-deep-queue-empty', description: 'Empty queue assignment — workbasket/slaDueAt null; no partial warning.' },
      { id: 'claim-deep-evidence-empty', description: 'Empty evidence and requirement config — baselineUnknown=true.' },
      { id: 'claim-deep-document-baseline-empty', description: 'bn_doc_requirement returns [] — required/missing null; baselineUnknown=true.' },
      { id: 'claim-deep-eligibility-with-override', description: 'Eligibility override_applied=true — overrideActor/overrideReason mapped from row.' },
      { id: 'claim-deep-queue-error', description: 'bn_claim_queue_assignment failure — workbasket/slaDueAt null; unrelated sections survive.' },
      { id: 'claim-deep-product-version-error', description: 'bn_product_version failure — productVersionLabel null; productVersionId preserved.' },
      { id: 'claim-deep-eligibility-error', description: 'bn_claim_eligibility failure — override null; Calculation/Decision/Evidence survive.' },
      { id: 'claim-deep-calculation-error', description: 'bn_claim_calculation failure — Eligibility/Decision/Evidence/timeline survive; no fabricated mismatch.' },
      { id: 'claim-deep-evidence-error', description: 'bn_claim_evidence failure — evidence not represented as an empty list; requirements may still succeed.' },
      { id: 'claim-deep-requirements-error', description: 'bn_doc_requirement failure — evidence rows preserved; required/missing null; baselineUnknown=true.' },
      { id: 'claim-deep-decision-error', description: 'bn_claim_decision failure — MISSING_DECISION warning; other sections survive.' },
      { id: 'claim-deep-events-error', description: 'bn_claim_event failure — Notes remain in timeline; workflow unrestricted.' },
      { id: 'claim-deep-notes-error', description: 'bn_claim_note failure — Events remain in timeline; workflow unrestricted.' },
    ],
  },
  getAwardProductDeep: {
    loaderName: 'getAwardProductDeep',
    suiteId: 'product-deep-certification',
    scenarios: [
      { id: 'product-deep-award-without-product', description: 'Award without bn_product_id — loader returns null; no downstream queries.' },
      { id: 'product-deep-award-query-error', description: 'bn_award primary lookup fails — loader rejects; no downstream queries.' },
      { id: 'product-deep-product-not-found', description: 'bn_product row absent — MISSING_PRODUCT warning; loader returns null.' },
      { id: 'product-deep-product-query-error', description: 'bn_product primary lookup fails — loader rejects after bn_award succeeds.' },
      { id: 'product-deep-identity-mapping', description: 'Identity maps benefit_code / benefit_name / scheme_id / branch_id (never legacy product_code).' },
      { id: 'product-deep-no-linked-claim', description: 'Award without bn_claim_id — skips bn_claim / bn_product_version; readiness NOT_APPLICABLE.' },
      { id: 'product-deep-claim-without-version', description: 'bn_claim carries no product_version_id — bn_product_version skipped; MISSING_VERSION.' },
      { id: 'product-deep-version-select-contract', description: 'bn_product_version .select() exactly equals the 19 readiness fields.' },
      { id: 'product-deep-configuration-restricted', description: 'canViewConfiguration=false — all 12 readiness rows RESTRICTED; no configuration source queried.' },
      { id: 'product-deep-full-ready', description: 'All primary and configuration sources present — every readiness row READY; version flags clean.' },
      { id: 'product-deep-version-product-mismatch', description: 'Version.product_id ≠ Award.bn_product_id — PRODUCT_VERSION_MISMATCH; product identity preserved.' },
      { id: 'product-deep-version-not-published', description: 'Version.status = DRAFT — VERSION_NOT_PUBLISHED warning.' },
      { id: 'product-deep-award-outside-effective-period', description: 'Award start outside version effective dates — OUTSIDE_EFFECTIVE warning.' },
      { id: 'product-deep-missing-configuration', description: 'Every configuration source empty — MISSING readiness + MISSING_* warnings; INCOMPLETE_COMM not emitted at zero.' },
      { id: 'product-deep-formula-partial', description: 'formula_template_id present with zero bindings — Formula PARTIAL, not MISSING.' },
      { id: 'product-deep-comm-partial', description: '1–2 active comm mappings — Communication PARTIAL + INCOMPLETE_COMM warning.' },
      { id: 'product-deep-claim-query-error', description: 'bn_claim optional failure — no bn_product_version query; MISSING_VERSION; product identity preserved.' },
      { id: 'product-deep-version-query-error', description: 'bn_product_version optional failure — no configuration source queried; MISSING_VERSION; claim query survives.' },
      { id: 'product-deep-formula-binding-error', description: 'Formula binding failure — Formula PARTIAL; neighbouring readiness rows unaffected.' },
      { id: 'product-deep-eligibility-error', description: 'Eligibility rule failure — Eligibility MISSING; scope, is_active, count=exact, head=true still proven.' },
      { id: 'product-deep-approval-policy-error', description: 'Approval policy failure — Approval MISSING; scope, is_enabled, count=exact, head=true still proven.' },
      { id: 'product-deep-comm-mapping-error', description: 'Communication mapping failure — Communication MISSING; INCOMPLETE_COMM not emitted; scope, active, count=exact, head=true still proven.' },
    ],
  },
};

export function certificationScenariosFor(loaderName: string): readonly string[] {
  const entry = AWARD360_CERTIFICATION_REGISTRY[loaderName];
  return entry ? entry.scenarios.map((s) => s.id) : [];
}

export function isCertifiedLoader(loaderName: string): boolean {
  return Object.prototype.hasOwnProperty.call(AWARD360_CERTIFICATION_REGISTRY, loaderName);
}

export function certifiedLoaderNames(): readonly string[] {
  return Object.keys(AWARD360_CERTIFICATION_REGISTRY);
}

/** B2-c.2 — Certified loaders owned by a particular certification suite. */
export function certifiedLoadersForSuite(
  suiteId: Award360CertificationSuiteId,
): readonly string[] {
  return Object.entries(AWARD360_CERTIFICATION_REGISTRY)
    .filter(([, cert]) => cert.suiteId === suiteId)
    .map(([name]) => name)
    .sort();
}

