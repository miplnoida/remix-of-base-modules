/**
 * Publish Guard — blocks activation/publish of a product version when any
 * active eligibility rule references a non-wireable catalogue rule/fact.
 */
import { supabase } from '@/integrations/supabase/client';
import { computeRuleCoverage } from './factCoverageService';
import { listRuleCatalogue } from '../ruleCatalogueService';

const db = supabase as any;

export interface PublishCheckIssue {
  rule_code: string;
  rule_name: string;
  reason: string;
}

export interface PublishCheckResult {
  ok: boolean;
  issues: PublishCheckIssue[];
  checked: number;
}

export async function checkProductVersionPublishable(productVersionId: string): Promise<PublishCheckResult> {
  // Pull the product's active eligibility rules (active=true) and their catalogue links.
  const { data: prodRules } = await db
    .from('bn_eligibility_rule')
    .select('id, rule_code, catalogue_rule_code, is_active, fact_key')
    .eq('product_version_id', productVersionId);

  const codes = new Set<string>();
  for (const r of (prodRules as any[]) ?? []) {
    if (r.is_active === false) continue;
    if (r.catalogue_rule_code) codes.add(r.catalogue_rule_code);
  }
  if (codes.size === 0) {
    return { ok: true, issues: [], checked: 0 };
  }
  const catalogue = await listRuleCatalogue();
  const used = catalogue.filter((c) => codes.has(c.rule_code));
  const coverage = await computeRuleCoverage(used);

  const issues: PublishCheckIssue[] = [];
  for (const row of coverage.rows) {
    if (row.blocking_reasons.length > 0) {
      for (const r of row.blocking_reasons) {
        issues.push({ rule_code: row.rule_code, rule_name: row.rule_name, reason: r });
      }
    }
  }
  return { ok: issues.length === 0, issues, checked: used.length };
}
