/**
 * Fact Coverage Service
 *
 * Computes, per catalogue rule, whether the rule is "wireable" end-to-end:
 *   • fact exists in registry
 *   • resolver function is registered in code
 *   • source table/column known
 *   • operator allowed for fact data type
 *   • implementation_status acceptable for publish
 *
 * Used by:
 *   - Rule Catalogue → Coverage tab (UI)
 *   - Publish guard (blocks activation)
 */
import { getFact } from './eligibilityFactRegistry';
import type { RuleCatalogueItem } from '../ruleCatalogueService';
import { listEligibilityFacts, type EligibilityFact as DbFact } from '../eligibilityFactService';

// Mirror of operator alias map used in the catalogue (UI uses friendly names).
const OPERATOR_ALIASES: Record<string, string> = {
  EQUALS: '=',
  NOT_EQUALS: '!=',
  GREATER_THAN: '>',
  GREATER_OR_EQUAL: '>=',
  LESS_THAN: '<',
  LESS_OR_EQUAL: '<=',
  BETWEEN: 'between',
  IN: 'in',
  NOT_IN: 'in',
  BOOLEAN: '=',
  EXISTS: 'exists',
  CONTAINS: 'in',
};

export interface CoverageRow {
  rule_id: string;
  rule_code: string;
  rule_name: string;
  fact_key: string | null;
  fact_exists: boolean;
  resolver_exists: boolean;
  source_table_known: boolean;
  source_column_known: boolean;
  operator_allowed: boolean;
  testable: boolean;
  implementation_status: 'IMPLEMENTED' | 'PARTIAL' | 'NOT_IMPLEMENTED' | 'UNKNOWN';
  blocking_reasons: string[];
}

export interface CoverageSummary {
  total: number;
  fully_implemented: number;
  partial: number;
  blocked: number;
  rows: CoverageRow[];
}

export async function computeRuleCoverage(rules: RuleCatalogueItem[]): Promise<CoverageSummary> {
  // Pull the DB-registered facts so we cross-check resolver_function presence too.
  let dbFacts: DbFact[] = [];
  try { dbFacts = await listEligibilityFacts(); } catch { /* registry-only fallback */ }
  const dbByKey = new Map(dbFacts.map((f) => [f.fact_key, f]));

  const rows: CoverageRow[] = rules.map((r) => {
    const reasons: string[] = [];
    const factKey = r.fact_key;
    if (!factKey) {
      return {
        rule_id: r.id, rule_code: r.rule_code, rule_name: r.rule_name, fact_key: null,
        fact_exists: false, resolver_exists: false, source_table_known: false,
        source_column_known: false, operator_allowed: false, testable: false,
        implementation_status: 'UNKNOWN', blocking_reasons: ['No fact_key linked'],
      };
    }
    const codeFact = getFact(factKey);
    const dbFact = dbByKey.get(factKey);
    const factExists = !!(codeFact || dbFact);
    if (!factExists) reasons.push(`Fact "${factKey}" is not registered`);

    const resolver = codeFact?.resolver_function ?? dbFact?.resolver_function ?? null;
    const resolverExists = !!resolver;
    if (!resolverExists) reasons.push('No resolver function registered for this fact');

    const sourceTable = codeFact?.source_table ?? dbFact?.source_table ?? null;
    const sourceColumn = codeFact?.source_column ?? dbFact?.source_column ?? null;
    const sourceTableKnown = !!sourceTable && sourceTable !== '(pending source table)';
    const sourceColumnKnown = !!sourceColumn && sourceColumn !== '(pending)';
    if (!sourceTableKnown) reasons.push('Source table is not defined');

    const allowedOps: string[] = (codeFact?.allowed_operators as string[] | undefined)
      ?? (dbFact?.allowed_operators as string[] | undefined) ?? [];
    const normalizedRuleOp = OPERATOR_ALIASES[r.operator] ?? r.operator;
    const operatorAllowed = !allowedOps.length
      || allowedOps.includes(r.operator) || allowedOps.includes(normalizedRuleOp);
    if (!operatorAllowed) reasons.push(`Operator "${r.operator}" not allowed for fact (allowed: ${allowedOps.join(', ')})`);

    const status = (dbFact?.implementation_status ?? (codeFact ? 'IMPLEMENTED' : 'UNKNOWN')) as CoverageRow['implementation_status'];
    if (status === 'NOT_IMPLEMENTED') reasons.push('Fact implementation_status is NOT_IMPLEMENTED');

    const testable = factExists && resolverExists && sourceTableKnown && operatorAllowed && status !== 'NOT_IMPLEMENTED';

    return {
      rule_id: r.id, rule_code: r.rule_code, rule_name: r.rule_name, fact_key: factKey,
      fact_exists: factExists, resolver_exists: resolverExists,
      source_table_known: sourceTableKnown, source_column_known: sourceColumnKnown,
      operator_allowed: operatorAllowed, testable,
      implementation_status: status,
      blocking_reasons: reasons,
    };
  });

  return {
    total: rows.length,
    fully_implemented: rows.filter((r) => r.implementation_status === 'IMPLEMENTED' && r.blocking_reasons.length === 0).length,
    partial: rows.filter((r) => r.implementation_status === 'PARTIAL').length,
    blocked: rows.filter((r) => r.blocking_reasons.length > 0).length,
    rows,
  };
}

export function blockingReasonsFor(row: CoverageRow): string[] {
  return row.blocking_reasons;
}
