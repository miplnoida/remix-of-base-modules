/**
 * Rule Catalogue Audit Service
 * ----------------------------
 * Performs a full audit of every Fact in `bn_eligibility_fact` and every
 * Rule in `bn_rule_catalogue` and returns a structured report (counts +
 * per-row issues with severity and suggested fix).
 *
 * Pure function — no DB access; caller supplies loaded data + dictionary.
 */
import {
  isResolverRegistered,
  validateEligibilityFact,
  type EligibilityFact,
} from './eligibilityFactService';
import type { RuleCatalogueItem } from './ruleCatalogueService';
import {
  validateFactAgainstRegistry,
  type DataField,
  type DataSource,
} from './dataDictionaryService';

export type Severity = 'BLOCKER' | 'WARNING';

export interface AuditIssue {
  subject: 'FACT' | 'RULE';
  subject_id: string;
  subject_key: string;     // fact_key or rule_code
  issue_type: string;
  message: string;
  current_value?: string | null;
  suggested_fix?: string;
  severity: Severity;
}

export interface AuditCounts {
  totalFacts: number;
  validFacts: number;
  invalidFacts: number;
  totalRules: number;
  validRules: number;
  invalidRules: number;
  rulesMissingFact: number;
  factsMissingResolver: number;
  factsInvalidSourceMapping: number;
  factsUnsupportedOperators: number;
}

export interface AuditReport {
  counts: AuditCounts;
  issues: AuditIssue[];
}

const COMMA_OR_EXPR = /[,+\s]|(?:^|[^a-z0-9_])-/i;
const VALID_OPS = new Set([
  'EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'GREATER_OR_EQUAL', 'LESS_THAN', 'LESS_OR_EQUAL',
  'BETWEEN', 'IN', 'NOT_IN', 'BOOLEAN', 'EXISTS', 'CONTAINS',
  '=', '!=', '>', '>=', '<', '<=', 'between', 'in', 'not_in', 'exists', 'contains',
]);

function pushFact(out: AuditIssue[], f: EligibilityFact, partial: Omit<AuditIssue, 'subject' | 'subject_id' | 'subject_key'>) {
  out.push({ subject: 'FACT', subject_id: f.id, subject_key: f.fact_key, ...partial });
}
function pushRule(out: AuditIssue[], r: RuleCatalogueItem, partial: Omit<AuditIssue, 'subject' | 'subject_id' | 'subject_key'>) {
  out.push({ subject: 'RULE', subject_id: r.id, subject_key: r.rule_code, ...partial });
}

export function auditRuleCatalogue(
  facts: EligibilityFact[],
  rules: RuleCatalogueItem[],
  sources: DataSource[],
  fields: DataField[],
): AuditReport {
  const issues: AuditIssue[] = [];
  const factByKey = new Map(facts.map(f => [f.fact_key, f]));
  const invalidFactIds = new Set<string>();
  const factsMissingResolver = new Set<string>();
  const factsInvalidSourceMapping = new Set<string>();
  const factsUnsupportedOperators = new Set<string>();

  // ---- Facts ----
  for (const f of facts) {
    const metaErr = validateEligibilityFact(f as any);
    if (metaErr) {
      invalidFactIds.add(f.id);
      pushFact(issues, f, {
        issue_type: 'METADATA',
        message: metaErr,
        severity: f.is_active ? 'BLOCKER' : 'WARNING',
        suggested_fix: 'Fix the missing/invalid metadata field then save.',
      });
    }

    if (!f.allowed_operators?.length) {
      invalidFactIds.add(f.id);
      factsUnsupportedOperators.add(f.id);
      pushFact(issues, f, {
        issue_type: 'OPERATORS_EMPTY',
        message: 'Allowed operators is empty',
        severity: 'BLOCKER',
        suggested_fix: 'Select at least one allowed operator.',
      });
    } else {
      const bad = f.allowed_operators.filter(op => !VALID_OPS.has(op));
      if (bad.length) {
        factsUnsupportedOperators.add(f.id);
        pushFact(issues, f, {
          issue_type: 'OPERATORS_UNSUPPORTED',
          message: `Unsupported operator(s): ${bad.join(', ')}`,
          severity: 'WARNING',
          current_value: f.allowed_operators.join(','),
          suggested_fix: 'Remove unsupported operators from the fact.',
        });
      }
    }

    if ((f.source_type === 'DIRECT_FIELD' || f.source_type === 'DOCUMENT_CHECK' || f.source_type === 'EXISTENCE_CHECK')
        && f.source_column && f.source_column !== '*' && COMMA_OR_EXPR.test(f.source_column)) {
      invalidFactIds.add(f.id);
      factsInvalidSourceMapping.add(f.id);
      pushFact(issues, f, {
        issue_type: 'SOURCE_COLUMN_INVALID',
        message: `source_column "${f.source_column}" contains comma/expression/space — not a real physical column`,
        severity: 'BLOCKER',
        current_value: f.source_column,
        suggested_fix: 'Set source_type=RESOLVER_ONLY and clear source_column (or set to "*").',
      });
    }

    if (f.source_table && /[,/\s]/.test(f.source_table)) {
      invalidFactIds.add(f.id);
      factsInvalidSourceMapping.add(f.id);
      pushFact(issues, f, {
        issue_type: 'SOURCE_TABLE_INVALID',
        message: `source_table "${f.source_table}" is not a single physical table`,
        severity: 'BLOCKER',
        current_value: f.source_table,
        suggested_fix: 'Set source_table to one table from the data dictionary; use RESOLVER_ONLY when multiple tables are involved.',
      });
    }

    // Resolver expectations by source_type
    const resolverRequired =
      f.source_type === 'RESOLVER_ONLY' ||
      f.source_type === 'DERIVED_AGGREGATE' ||
      f.source_type === 'DOCUMENT_CHECK' ||
      f.source_type === 'EXISTENCE_CHECK';
    if (resolverRequired && !f.resolver_function && f.implementation_status !== 'NOT_IMPLEMENTED') {
      invalidFactIds.add(f.id);
      factsMissingResolver.add(f.id);
      pushFact(issues, f, {
        issue_type: 'RESOLVER_MISSING',
        message: `${f.source_type} requires resolver_function when status is ${f.implementation_status}`,
        severity: 'BLOCKER',
        suggested_fix: 'Select a registered resolver, or set implementation_status to NOT_IMPLEMENTED.',
      });
    }
    if (f.resolver_function && !isResolverRegistered(f.resolver_function)) {
      invalidFactIds.add(f.id);
      factsMissingResolver.add(f.id);
      pushFact(issues, f, {
        issue_type: 'RESOLVER_NOT_REGISTERED',
        message: `Resolver "${f.resolver_function}" is not registered in code`,
        severity: f.implementation_status === 'IMPLEMENTED' ? 'BLOCKER' : 'WARNING',
        current_value: f.resolver_function,
        suggested_fix: 'Register the resolver in code or pick a different one.',
      });
    }

    // Data dictionary check
    const reg = validateFactAgainstRegistry(f as any, sources, fields);
    for (const r of reg) {
      if (r.severity === 'FAIL') {
        invalidFactIds.add(f.id);
        factsInvalidSourceMapping.add(f.id);
      }
      pushFact(issues, f, {
        issue_type: r.code,
        message: r.message,
        severity: r.severity === 'FAIL' ? 'BLOCKER' : 'WARNING',
        suggested_fix: 'Add the missing table/column to bn_data_source_registry / bn_data_field_registry, or correct the fact mapping.',
      });
    }

    // Active fact must not be NOT_IMPLEMENTED if any active rule uses it (checked on rule pass)
  }

  // ---- Rules ----
  const invalidRuleIds = new Set<string>();
  let rulesMissingFact = 0;
  for (const r of rules) {
    if (!r.fact_key) {
      invalidRuleIds.add(r.id);
      rulesMissingFact++;
      pushRule(issues, r, {
        issue_type: 'FACT_MISSING',
        message: 'Rule has no fact_key',
        severity: r.is_active ? 'BLOCKER' : 'WARNING',
        suggested_fix: 'Link this rule to a fact from the Facts registry.',
      });
      continue;
    }
    const f = factByKey.get(r.fact_key);
    if (!f) {
      invalidRuleIds.add(r.id);
      rulesMissingFact++;
      pushRule(issues, r, {
        issue_type: 'FACT_UNKNOWN',
        message: `fact_key "${r.fact_key}" does not exist in the catalogue`,
        severity: 'BLOCKER',
        current_value: r.fact_key,
        suggested_fix: 'Pick an existing fact_key or create the missing fact.',
      });
      continue;
    }
    if (!f.is_active && r.is_active) {
      invalidRuleIds.add(r.id);
      pushRule(issues, r, {
        issue_type: 'FACT_INACTIVE',
        message: `Active rule references inactive fact "${r.fact_key}"`,
        severity: 'BLOCKER',
        suggested_fix: 'Activate the fact or deactivate the rule.',
      });
    }
    if (r.is_active && f.implementation_status === 'NOT_IMPLEMENTED') {
      invalidRuleIds.add(r.id);
      pushRule(issues, r, {
        issue_type: 'FACT_NOT_IMPLEMENTED',
        message: `Active rule uses NOT_IMPLEMENTED fact "${r.fact_key}"`,
        severity: 'BLOCKER',
        suggested_fix: 'Implement the fact (register resolver) or deactivate the rule.',
      });
    }
    if (f.allowed_operators?.length && !f.allowed_operators.includes(r.operator)) {
      invalidRuleIds.add(r.id);
      pushRule(issues, r, {
        issue_type: 'OPERATOR_NOT_ALLOWED',
        message: `Operator "${r.operator}" not in fact.allowed_operators (${f.allowed_operators.join(', ')})`,
        severity: 'BLOCKER',
        current_value: r.operator,
        suggested_fix: `Use one of: ${f.allowed_operators.join(', ')}`,
      });
    }
    // data_type match
    if (f.data_type === 'boolean' && r.value_from && !['true', 'false', '1', '0'].includes(String(r.value_from).toLowerCase())) {
      invalidRuleIds.add(r.id);
      pushRule(issues, r, {
        issue_type: 'VALUE_TYPE_MISMATCH',
        message: `Boolean fact expects true/false; got "${r.value_from}"`,
        severity: 'BLOCKER',
        current_value: String(r.value_from),
        suggested_fix: 'Set value to true or false.',
      });
    }
    if (f.data_type === 'number' && r.value_from != null && r.value_from !== '' && isNaN(Number(r.value_from))) {
      invalidRuleIds.add(r.id);
      pushRule(issues, r, {
        issue_type: 'VALUE_TYPE_MISMATCH',
        message: `Numeric fact expects a number; got "${r.value_from}"`,
        severity: 'BLOCKER',
        current_value: String(r.value_from),
        suggested_fix: 'Provide a numeric threshold, or mark per-product if it varies.',
      });
    }
  }

  const counts: AuditCounts = {
    totalFacts: facts.length,
    validFacts: facts.length - invalidFactIds.size,
    invalidFacts: invalidFactIds.size,
    totalRules: rules.length,
    validRules: rules.length - invalidRuleIds.size,
    invalidRules: invalidRuleIds.size,
    rulesMissingFact,
    factsMissingResolver: factsMissingResolver.size,
    factsInvalidSourceMapping: factsInvalidSourceMapping.size,
    factsUnsupportedOperators: factsUnsupportedOperators.size,
  };

  // Sort: BLOCKERs first, then alphabetical
  issues.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'BLOCKER' ? -1 : 1;
    return a.subject_key.localeCompare(b.subject_key);
  });

  return { counts, issues };
}
