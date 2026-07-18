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

export interface Award360LoaderCertification {
  readonly loaderName: string;
  readonly scenarios: readonly Award360CertifiedScenario[];
}

export const AWARD360_CERTIFICATION_REGISTRY: Readonly<Record<string, Award360LoaderCertification>> = {
  getAward360Header: {
    loaderName: 'getAward360Header',
    scenarios: [
      { id: 'header-with-ssn-claim-and-version', description: 'Award has SSN, linked claim and product-version — five-hop chain.' },
      { id: 'header-without-ssn', description: 'Award without SSN short-circuits before ip_master.' },
      { id: 'header-without-claim', description: 'Award without claim skips bn_claim and bn_product_version.' },
      { id: 'header-with-claim-no-version', description: 'Claim carries no product_version_id — bn_product_version skipped.' },
    ],
  },
  getAwardPensioner: {
    loaderName: 'getAwardPensioner',
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
    scenarios: [
      { id: 'claim-linked', description: 'Award linked to a claim — bn_claim scoped by id.' },
      { id: 'claim-not-linked', description: 'Award without linked claim — bn_claim skipped.' },
      { id: 'claim-missing', description: 'bn_claim row absent — loader returns null.' },
    ],
  },
  getAwardProduct: {
    loaderName: 'getAwardProduct',
    scenarios: [
      { id: 'product-with-version', description: 'Full chain: award → product → claim → product_version.' },
      { id: 'product-without-claim', description: 'No linked claim — bn_claim / bn_product_version skipped.' },
      { id: 'product-with-claim-no-version', description: 'Claim carries no product_version_id.' },
      { id: 'product-missing', description: 'Award has no product id — loader returns null.' },
    ],
  },
  listAwardCommunications: {
    loaderName: 'listAwardCommunications',
    scenarios: [
      { id: 'comm-claim-and-context', description: 'Both claim_id and contains(context) queries issued.' },
      { id: 'comm-context-only', description: 'Award without claim — only the contains(context) query issued.' },
      { id: 'comm-empty', description: 'No rows — empty list returned.' },
      { id: 'comm-query-error', description: 'Table error is isolated via Promise.allSettled.' },
    ],
  },
  loadAwardAuditSources: {
    loaderName: 'loadAwardAuditSources',
    scenarios: [
      { id: 'audit-without-central', description: 'includeCentralAudit=false — core_audit_log skipped, marked restricted.' },
      { id: 'audit-with-central', description: 'includeCentralAudit=true — composite entity_type=bn_award scope enforced.' },
      { id: 'audit-source-failure', description: 'Single source failure is isolated to that source only.' },
    ],
  },
  listAwardAudit: {
    loaderName: 'listAwardAudit',
    scenarios: [
      { id: 'audit-flat-without-central', description: 'Compat wrapper reads the three award-scoped audit sources.' },
    ],
  },
  getAward360Summary: {
    loaderName: 'getAward360Summary',
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
    scenarios: [
      { id: 'deep-full-access', description: 'Full permissions — every canonical table queried with correct scope.' },
      { id: 'deep-payment-profile-restricted', description: 'canViewPaymentProfile=false — profile / change-request skipped.' },
      { id: 'deep-person360-restricted', description: 'canViewPerson360=false — canonicalPersonId and person-360 route null.' },
      { id: 'deep-award-not-found', description: 'bn_award without SSN — loader returns null before ip_master.' },
      { id: 'deep-person-missing', description: 'ip_master row absent — PENSIONER_MISSING warning surfaced.' },
      { id: 'deep-empty-related', description: 'Empty related-awards / dependants / claims.' },
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
      { id: 'claim-deep-negative-scope-ssn-only', description: 'bn_claim scoped by ssn only — loader-specific scope rejects.' },
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
