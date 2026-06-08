/**
 * Readiness scoring — claim-independent.
 * Fact Ready    = resolver + source_table + source_column + IMPLEMENTED.
 * Rule Ready %  = implemented_facts / total_facts referenced by the rule.
 * Coverage %    = ready_rules / assigned_rules.
 */
import type { EligibilityFact } from './eligibilityFactService';
import type { RuleCatalogueItem } from './ruleCatalogueService';
import type { CoverageTypeRule, CoverageType } from './coverageTypeService';

export type ReadinessBand = 'READY' | 'WARNING' | 'BLOCKED';

export function bandFor(percent: number): ReadinessBand {
  if (percent >= 100) return 'READY';
  if (percent >= 80) return 'WARNING';
  return 'BLOCKED';
}

export function isFactReady(f: EligibilityFact): boolean {
  return !!(f.resolver_function && f.source_table && f.source_column && f.implementation_status === 'IMPLEMENTED');
}

export interface RuleReadiness {
  rule_id: string;
  rule_code: string;
  rule_name: string;
  fact_count: number;
  implemented_count: number;
  partial_count: number;
  missing_count: number;
  percent: number;
  band: ReadinessBand;
  missing_facts: string[];
}

export function computeRuleReadiness(rule: RuleCatalogueItem, factMap: Map<string, EligibilityFact>): RuleReadiness {
  const keys = rule.fact_key ? [rule.fact_key] : [];
  let impl = 0, partial = 0, missing = 0;
  const missingList: string[] = [];
  for (const k of keys) {
    const f = factMap.get(k);
    if (!f) { missing++; missingList.push(k); continue; }
    if (f.implementation_status === 'IMPLEMENTED' && isFactReady(f)) impl++;
    else if (f.implementation_status === 'PARTIAL') partial++;
    else { missing++; missingList.push(k); }
  }
  const total = Math.max(keys.length, 1);
  const percent = Math.round((impl / total) * 100);
  return {
    rule_id: rule.id, rule_code: rule.rule_code, rule_name: rule.rule_name,
    fact_count: keys.length, implemented_count: impl, partial_count: partial,
    missing_count: missing, percent, band: bandFor(percent), missing_facts: missingList,
  };
}

export function computeAllRuleReadiness(rules: RuleCatalogueItem[], facts: EligibilityFact[]): RuleReadiness[] {
  const map = new Map(facts.map(f => [f.fact_key, f]));
  return rules.map(r => computeRuleReadiness(r, map));
}

export interface CoverageTypeReadiness {
  coverage_type_id: string;
  coverage_code: string;
  coverage_name: string;
  assigned: number;
  ready: number;
  warning: number;
  blocked: number;
  percent: number;
  band: ReadinessBand;
}

export function computeCoverageTypeReadiness(
  coverageTypes: CoverageType[],
  assignments: CoverageTypeRule[],
  ruleReadiness: RuleReadiness[],
): CoverageTypeReadiness[] {
  const byCode = new Map(ruleReadiness.map(r => [r.rule_code, r]));
  return coverageTypes.map(ct => {
    const assigned = assignments.filter(a => a.coverage_type_id === ct.id);
    let ready = 0, warning = 0, blocked = 0;
    for (const a of assigned) {
      const rr = byCode.get(a.rule_code);
      if (!rr) { blocked++; continue; }
      if (rr.band === 'READY') ready++;
      else if (rr.band === 'WARNING') warning++;
      else blocked++;
    }
    const total = Math.max(assigned.length, 1);
    const percent = assigned.length === 0 ? 0 : Math.round((ready / total) * 100);
    return {
      coverage_type_id: ct.id, coverage_code: ct.coverage_code, coverage_name: ct.coverage_name,
      assigned: assigned.length, ready, warning, blocked, percent, band: bandFor(percent),
    };
  });
}
