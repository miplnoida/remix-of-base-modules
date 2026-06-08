/**
 * Fact Impact Analysis — claim-independent.
 * For a given fact_key, report all rules, coverage types, and products that
 * would be affected if the fact's definition changed.
 */
import { supabase } from '@/integrations/supabase/client';
import type { RuleCatalogueItem } from './ruleCatalogueService';
import type { CoverageType, CoverageTypeRule } from './coverageTypeService';

export interface FactImpact {
  fact_key: string;
  rules: { rule_id: string; rule_code: string; rule_name: string; is_active: boolean }[];
  coverage_types: { coverage_type_id: string; coverage_code: string; coverage_name: string }[];
  product_version_count: number;
}

export async function getFactImpact(
  factKey: string,
  rules: RuleCatalogueItem[],
  coverageTypes: CoverageType[],
  coverageRules: CoverageTypeRule[],
): Promise<FactImpact> {
  const affectedRules = rules.filter(r => r.fact_key === factKey);
  const affectedCodes = new Set(affectedRules.map(r => r.rule_code));

  const ctIds = new Set(
    coverageRules
      .filter(cr => affectedCodes.has(cr.rule_code))
      .map(cr => cr.coverage_type_id),
  );
  const affectedCts = coverageTypes.filter(ct => ctIds.has(ct.id));

  // Product version usage — best-effort count via bn_eligibility_rule.catalogue_rule_code
  let productVersionCount = 0;
  if (affectedCodes.size > 0) {
    const { count } = await (supabase as any)
      .from('bn_eligibility_rule')
      .select('product_version_id', { count: 'exact', head: true })
      .in('catalogue_rule_code', Array.from(affectedCodes));
    productVersionCount = count ?? 0;
  }

  return {
    fact_key: factKey,
    rules: affectedRules.map(r => ({
      rule_id: r.id, rule_code: r.rule_code, rule_name: r.rule_name, is_active: r.is_active,
    })),
    coverage_types: affectedCts.map(ct => ({
      coverage_type_id: ct.id, coverage_code: ct.coverage_code, coverage_name: ct.coverage_name,
    })),
    product_version_count: productVersionCount,
  };
}
