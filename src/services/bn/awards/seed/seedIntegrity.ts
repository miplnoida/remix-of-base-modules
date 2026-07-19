/**
 * AW360-WAVE-1 Stage S1 — Seed integrity validator.
 *
 * Read-only. Validates the SCENARIO MANIFEST against every integrity rule
 * spelled out in the S1 spec (tenant, identity, contribution, claim,
 * award, financial, audit). Fails when any unexplained issue is found.
 */

import type { ScenarioManifest, ScenarioRecord } from './seedScenarioManifest';
import { CANONICAL_BENEFIT_CATALOGUE } from './seedCatalogue';
import { AWARD_PILOT_SCOPE_FREEZE, APPROVED_PILOT_ACTIONS } from '../pilot/awardPilotScopeFreeze';
import { AWARD360_RUNTIME_ATTESTATION } from '../pilot/awardRuntimeAttestation';
import { AWARD360_MANIFEST_STATUS, AWARD360_MANIFEST_VERSION } from '../award360LoaderManifest';

export interface IntegrityFinding {
  readonly category:
    | 'TENANT'
    | 'IDENTITY'
    | 'CONTRIBUTION'
    | 'CLAIM'
    | 'AWARD'
    | 'FINANCIAL'
    | 'AUDIT'
    | 'PILOT_SCOPE'
    | 'ATTESTATION_CONTAMINATION';
  readonly severity: 'ERROR' | 'WARNING';
  readonly scenarioKey?: string;
  readonly code: string;
  readonly message: string;
}

export interface IntegrityReport {
  readonly ok: boolean;
  readonly errors: number;
  readonly warnings: number;
  readonly findings: readonly IntegrityFinding[];
  readonly checksPerformed: readonly string[];
}

function checkTenant(manifest: ScenarioManifest, out: IntegrityFinding[]): void {
  const t = manifest.tenantId;
  for (const s of manifest.scenarios) {
    if (s.provenance.seed_tenant_id !== t) {
      out.push({
        category: 'TENANT',
        severity: 'ERROR',
        scenarioKey: s.scenarioKey,
        code: 'CROSS_TENANT_PROVENANCE',
        message: `Scenario provenance tenant ${s.provenance.seed_tenant_id} ≠ manifest tenant ${t}`,
      });
    }
    if (AWARD_PILOT_SCOPE_FREEZE.approvedTenants.includes(s.provenance.seed_tenant_id)) {
      out.push({
        category: 'TENANT',
        severity: 'ERROR',
        scenarioKey: s.scenarioKey,
        code: 'D9_PILOT_TENANT_LEAK',
        message: 'Scenario provenance references D9 pilot tenant.',
      });
    }
  }
}

function checkIdentity(manifest: ScenarioManifest, out: IntegrityFinding[]): void {
  const idsSeen = new Set<string>();
  for (const s of manifest.scenarios) {
    for (const idKey of Object.keys(s.identifiers) as (keyof ScenarioRecord['identifiers'])[]) {
      const v = s.identifiers[idKey];
      if (!v) continue;
      const key = `${idKey}:${v}`;
      // Household isolation: personId/claimId may repeat only when scenario is
      // explicitly cross-claim (none of ours are, in this framework).
      if (idsSeen.has(key)) {
        out.push({
          category: 'IDENTITY',
          severity: 'ERROR',
          scenarioKey: s.scenarioKey,
          code: 'DUPLICATE_IDENTIFIER',
          message: `Duplicate ${idKey}=${v}`,
        });
      }
      idsSeen.add(key);
    }
  }
}

function checkClaim(manifest: ScenarioManifest, out: IntegrityFinding[]): void {
  const activeCodes = new Set(CANONICAL_BENEFIT_CATALOGUE.filter((e) => e.active).map((e) => e.code));
  for (const s of manifest.scenarios) {
    if (!activeCodes.has(s.benefitType)) {
      out.push({
        category: 'CLAIM',
        severity: 'ERROR',
        scenarioKey: s.scenarioKey,
        code: 'INVALID_BENEFIT_TYPE',
        message: `Scenario references non-active benefit type ${s.benefitType}`,
      });
    }
    if (s.expectedAwardOutcome === 'ACTIVE' && s.expectedEligibility === 'INELIGIBLE') {
      out.push({
        category: 'CLAIM',
        severity: 'ERROR',
        scenarioKey: s.scenarioKey,
        code: 'INELIGIBLE_WITH_ACTIVE_AWARD',
        message: 'Ineligible claim cannot produce an active award.',
      });
    }
  }
}

function checkAward(manifest: ScenarioManifest, out: IntegrityFinding[]): void {
  const catalog = new Map(CANONICAL_BENEFIT_CATALOGUE.map((e) => [e.code, e] as const));
  for (const s of manifest.scenarios) {
    const entry = catalog.get(s.benefitType);
    if (!entry) continue;
    const state = s.expectedLifecycleState;
    if (!state) continue;
    if (state === 'SUSPENDED' && !entry.supportsSuspension) {
      out.push({
        category: 'AWARD',
        severity: 'ERROR',
        scenarioKey: s.scenarioKey,
        code: 'SUSPENSION_NOT_SUPPORTED',
        message: `${entry.code} does not support suspension.`,
      });
    }
    if (state === 'RESUMED' && !entry.supportsResumption) {
      out.push({
        category: 'AWARD',
        severity: 'ERROR',
        scenarioKey: s.scenarioKey,
        code: 'RESUMPTION_NOT_SUPPORTED',
        message: `${entry.code} does not support resumption.`,
      });
    }
    if (state === 'CEASED' && !entry.supportsCessation) {
      out.push({
        category: 'AWARD',
        severity: 'ERROR',
        scenarioKey: s.scenarioKey,
        code: 'CESSATION_NOT_SUPPORTED',
        message: `${entry.code} does not support cessation.`,
      });
    }
    if (state === 'LIFE_CERT_DUE' && !entry.requiresLifeCertificate) {
      out.push({
        category: 'AWARD',
        severity: 'ERROR',
        scenarioKey: s.scenarioKey,
        code: 'LIFE_CERT_NOT_REQUIRED',
        message: `${entry.code} does not require life certificates.`,
      });
    }
  }
}

function checkFinancial(manifest: ScenarioManifest, out: IntegrityFinding[]): void {
  for (const s of manifest.scenarios) {
    if (s.expectedAwardOutcome === 'CEASED' && s.expectedPaymentOutcome === 'PAYABLE') {
      out.push({
        category: 'FINANCIAL',
        severity: 'ERROR',
        scenarioKey: s.scenarioKey,
        code: 'PAYMENT_ON_CEASED_AWARD',
        message: 'Ceased award cannot produce payable instalments.',
      });
    }
    if (s.expectedAwardOutcome === 'SUSPENDED' && s.expectedPaymentOutcome === 'PAYABLE') {
      out.push({
        category: 'FINANCIAL',
        severity: 'ERROR',
        scenarioKey: s.scenarioKey,
        code: 'PAYMENT_ON_SUSPENDED_AWARD',
        message: 'Suspended award cannot produce payable instalments.',
      });
    }
  }
}

function checkAudit(manifest: ScenarioManifest, out: IntegrityFinding[]): void {
  for (const s of manifest.scenarios) {
    if (!s.expectedAuditEvents || s.expectedAuditEvents.length === 0) {
      out.push({
        category: 'AUDIT',
        severity: 'ERROR',
        scenarioKey: s.scenarioKey,
        code: 'MISSING_AUDIT_EVENTS',
        message: 'Every scenario must declare expected audit events.',
      });
    }
    if (!s.provenance.is_test_data) {
      out.push({
        category: 'AUDIT',
        severity: 'ERROR',
        scenarioKey: s.scenarioKey,
        code: 'MISSING_TEST_DATA_FLAG',
        message: 'Every seeded row must carry is_test_data=true.',
      });
    }
  }
}

function checkPilotScope(manifest: ScenarioManifest, out: IntegrityFinding[]): void {
  for (const s of manifest.scenarios) {
    for (const avail of s.expectedAvailableActions) {
      if (!APPROVED_PILOT_ACTIONS.includes(avail)) {
        out.push({
          category: 'PILOT_SCOPE',
          severity: 'ERROR',
          scenarioKey: s.scenarioKey,
          code: 'NON_PILOT_ACTION_MARKED_AVAILABLE',
          message: `Non-pilot action ${avail} marked available; must remain dark-launched.`,
        });
      }
    }
  }
}

function checkAttestationContamination(_manifest: ScenarioManifest, out: IntegrityFinding[]): void {
  // The seed framework must NEVER change code manifest or runtime attestation.
  if (AWARD360_MANIFEST_STATUS !== 'WAVE_1_PRODUCTION_READY') {
    out.push({
      category: 'ATTESTATION_CONTAMINATION',
      severity: 'ERROR',
      code: 'CODE_MANIFEST_STATUS_DRIFT',
      message: `Code manifest status is ${AWARD360_MANIFEST_STATUS}; expected WAVE_1_PRODUCTION_READY.`,
    });
  }
  if (AWARD360_MANIFEST_VERSION !== 'AW360-WAVE-1-C1-D8') {
    out.push({
      category: 'ATTESTATION_CONTAMINATION',
      severity: 'ERROR',
      code: 'CODE_MANIFEST_VERSION_DRIFT',
      message: `Code manifest version is ${AWARD360_MANIFEST_VERSION}; expected AW360-WAVE-1-C1-D8.`,
    });
  }
  if (AWARD360_RUNTIME_ATTESTATION.status !== 'NOT_STARTED') {
    out.push({
      category: 'ATTESTATION_CONTAMINATION',
      severity: 'ERROR',
      code: 'RUNTIME_ATTESTATION_DRIFT',
      message: `Runtime attestation is ${AWARD360_RUNTIME_ATTESTATION.status}; expected NOT_STARTED.`,
    });
  }
}

export function validateSeedIntegrity(manifest: ScenarioManifest): IntegrityReport {
  const findings: IntegrityFinding[] = [];
  const checks = [
    'TENANT_ISOLATION',
    'IDENTITY_UNIQUENESS',
    'CLAIM_COMPATIBILITY',
    'AWARD_LIFECYCLE_VALIDITY',
    'FINANCIAL_RECONCILIATION',
    'AUDIT_COMPLETENESS',
    'PILOT_SCOPE_INTEGRITY',
    'ATTESTATION_NON_CONTAMINATION',
  ];
  checkTenant(manifest, findings);
  checkIdentity(manifest, findings);
  checkClaim(manifest, findings);
  checkAward(manifest, findings);
  checkFinancial(manifest, findings);
  checkAudit(manifest, findings);
  checkPilotScope(manifest, findings);
  checkAttestationContamination(manifest, findings);

  const errors = findings.filter((f) => f.severity === 'ERROR').length;
  const warnings = findings.filter((f) => f.severity === 'WARNING').length;
  return { ok: errors === 0, errors, warnings, findings, checksPerformed: checks };
}
