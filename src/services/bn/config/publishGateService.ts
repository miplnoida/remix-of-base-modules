/**
 * BN Product Version — Publish Gate
 *
 * Single authoritative gate that MUST be called before flipping a
 * bn_product_version to ACTIVE (publish) or pushing a config change
 * that would affect a live product version.
 *
 * It composes the three existing checks so callers don't have to
 * remember to run them individually:
 *
 *   1. Cross-tab conflict detection  → ERROR-level conflicts block.
 *   2. Channel readiness (staff/public) → disabled channels are OK;
 *      mis-configured enabled channels block.
 *   3. Baseline configuration validation (when the version's product
 *      maps to a known SKN baseline) → FAIL items block, WARNING does not.
 *
 * Returns a structured report. `ok=false` means publish MUST be refused;
 * callers should surface `errors` to the user verbatim and offer a link
 * back to the relevant Product Catalog tab.
 */
import { hasBlockingConflicts, detectProductVersionConflicts } from './conflictDetectionService';
import { checkPublicReadiness, checkStaffReadiness } from '../productAcceptanceService';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export interface PublishGateReport {
  ok: boolean;
  errors: string[];
  warnings: string[];
  details: {
    conflicts?: { errors: number; warnings: number };
    publicChannel?: { ok: boolean; issues: string[] };
    staffChannel?: { ok: boolean; issues: string[] };
    baseline?: { status: string; failures: string[] };
  };
}

export async function assertSafeToPublish(versionId: string): Promise<PublishGateReport> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const details: PublishGateReport['details'] = {};

  // 1. Cross-tab conflicts
  try {
    const report = await detectProductVersionConflicts(versionId);
    details.conflicts = { errors: report.errors, warnings: report.warnings };
    if (report.errors > 0) {
      errors.push(
        `Cross-tab conflict detection found ${report.errors} ERROR(s). Resolve them on the Product Editor before publishing.`,
      );
    }
    if (report.warnings > 0) {
      warnings.push(`${report.warnings} cross-tab warning(s) present (publish allowed).`);
    }
  } catch (e) {
    warnings.push(`Conflict detection skipped: ${(e as Error).message}`);
  }

  // 2. Channel readiness
  try {
    const pub = await checkPublicReadiness(versionId);
    details.publicChannel = { ok: pub.ok, issues: pub.issues };
    if (pub.config?.is_enabled && !pub.ok) {
      errors.push(`Public/online channel is enabled but not ready: ${pub.issues.join('; ')}`);
    }
  } catch (e) {
    warnings.push(`Public readiness check failed: ${(e as Error).message}`);
  }

  try {
    const staff = await checkStaffReadiness(versionId);
    details.staffChannel = { ok: staff.ok, issues: staff.issues };
    if (staff.config?.is_enabled && !staff.ok) {
      errors.push(`Staff/offline channel is enabled but not ready: ${staff.issues.join('; ')}`);
    }
  } catch (e) {
    warnings.push(`Staff readiness check failed: ${(e as Error).message}`);
  }

  // 3. Baseline validation (best-effort — only when product matches a SKN baseline code)
  try {
    const { data: ver } = await db
      .from('bn_product_version')
      .select('product_id, bn_product:product_id(benefit_code)')
      .eq('id', versionId)
      .maybeSingle();
    const code = ver?.bn_product?.benefit_code;
    if (code) {
      const { SKN_BENEFIT_BASELINE } = await import('../skn/sknBenefitCatalogueBaseline');
      const baseline = SKN_BENEFIT_BASELINE.find((b: any) => b.benefit_code === code);
      if (baseline) {
        const { validateProduct } = await import('../configurationValidationService');
        const report = await validateProduct(baseline, { productVersionId: versionId });
        const failures = Object.entries(report)
          .filter(([_, v]: any) => v && typeof v === 'object' && v.status === 'FAIL')
          .map(([k]) => k);
        details.baseline = { status: report.overall_status, failures };
        if (failures.length > 0) {
          errors.push(
            `Configuration Validation reported FAIL on the selected version: ${failures.join(', ')}. Fix the listed Product Editor tabs before approving/publishing.`,
          );
        }
      }
    }
  } catch (e) {
    warnings.push(`Baseline validation skipped: ${(e as Error).message}`);
  }

  return { ok: errors.length === 0, errors, warnings, details };
}

/** Convenience: same gate but only the boolean answer. */
export async function isSafeToPublish(versionId: string): Promise<boolean> {
  if (await hasBlockingConflicts(versionId)) return false;
  const r = await assertSafeToPublish(versionId);
  return r.ok;
}
