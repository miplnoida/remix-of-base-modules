/**
 * Legal & Coverage Readiness — verifies that every active eligibility rule
 * on a product version is backed by:
 *   • a legislative reference,
 *   • a CONFIRMED confidence_status,
 *   • a linked, IMPLEMENTED fact,
 *   • a product-specific threshold (rule_definition.value),
 *   • complete derived-snapshot metadata for derived facts,
 *   • a deceased-aware resolver for deceased.* facts.
 *
 * Used by the publish gate and by the Coverage/Validation UI to surface
 * "Legal Confirmation Required" badges.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export type LegalIssueSeverity = 'BLOCK' | 'WARN';

export interface LegalIssue {
  rule_id: string;
  rule_code: string;
  severity: LegalIssueSeverity;
  code:
    | 'MISSING_LEGISLATIVE_REFERENCE'
    | 'CONFIDENCE_NOT_CONFIRMED'
    | 'FACT_UNLINKED'
    | 'FACT_NOT_IMPLEMENTED'
    | 'FACT_PARTIAL'
    | 'MISSING_THRESHOLD'
    | 'DERIVED_SNAPSHOT_INCOMPLETE'
    | 'DECEASED_RESOLVER_MISSING';
  message: string;
}

export interface LegalReadinessReport {
  ok: boolean;
  blocking: LegalIssue[];
  warnings: LegalIssue[];
  total_rules: number;
}

const PROVISIONAL_REF_RE = /^\s*(TBD|TODO|PENDING|N\/A)/i;

export async function checkLegalReadiness(versionId: string): Promise<LegalReadinessReport> {
  const { data: rules, error } = await db
    .from('bn_eligibility_rule')
    .select(
      'id, rule_code, rule_name, fact_key, rule_definition, legislative_reference, confidence_status, is_active',
    )
    .eq('product_version_id', versionId)
    .eq('is_active', true);
  if (error) throw error;

  const factKeys = Array.from(
    new Set((rules || []).map((r: any) => r.fact_key).filter(Boolean)),
  ) as string[];

  let facts: any[] = [];
  if (factKeys.length) {
    const { data: fdata } = await db
      .from('bn_eligibility_fact')
      .select(
        'fact_key, implementation_status, source_type, output_json_key, snapshot_builder, resolver_function',
      )
      .in('fact_key', factKeys);
    facts = fdata || [];
  }
  const factByKey: Record<string, any> = Object.fromEntries(facts.map((f) => [f.fact_key, f]));

  const blocking: LegalIssue[] = [];
  const warnings: LegalIssue[] = [];

  for (const r of (rules || []) as any[]) {
    const push = (code: LegalIssue['code'], severity: LegalIssueSeverity, message: string) => {
      (severity === 'BLOCK' ? blocking : warnings).push({
        rule_id: r.id,
        rule_code: r.rule_code,
        severity,
        code,
        message,
      });
    };

    // Legislative reference
    const ref = (r.legislative_reference || '').trim();
    if (!ref || PROVISIONAL_REF_RE.test(ref)) {
      push('MISSING_LEGISLATIVE_REFERENCE', 'BLOCK', 'Legislative reference is missing or provisional');
    }

    // Confidence status
    if (r.confidence_status !== 'CONFIRMED') {
      push(
        'CONFIDENCE_NOT_CONFIRMED',
        'BLOCK',
        `Confidence status is ${r.confidence_status || 'DRAFT'} — must be CONFIRMED to publish`,
      );
    }

    // Fact linkage
    if (!r.fact_key) {
      push('FACT_UNLINKED', 'BLOCK', 'Rule has no fact_key (UNLINKED)');
    } else {
      const f = factByKey[r.fact_key];
      if (!f) {
        push('FACT_UNLINKED', 'BLOCK', `Fact "${r.fact_key}" not found in catalogue`);
      } else {
        if (f.implementation_status === 'NOT_IMPLEMENTED') {
          push('FACT_NOT_IMPLEMENTED', 'BLOCK', `Fact "${r.fact_key}" is NOT_IMPLEMENTED`);
        } else if (f.implementation_status === 'PARTIAL') {
          push('FACT_PARTIAL', 'WARN', `Fact "${r.fact_key}" is PARTIAL — review before publish`);
        }
        if (f.source_type === 'DERIVED_AGGREGATE') {
          if (!f.output_json_key || !f.snapshot_builder) {
            push(
              'DERIVED_SNAPSHOT_INCOMPLETE',
              'BLOCK',
              `Derived fact "${r.fact_key}" missing snapshot_builder or output_json_key`,
            );
          }
        }
        if (r.fact_key.startsWith('deceased.')) {
          const resolver = (f.resolver_function || '').toLowerCase();
          if (!resolver.includes('deceased')) {
            push(
              'DECEASED_RESOLVER_MISSING',
              'BLOCK',
              `Fact "${r.fact_key}" requires a deceased-aware resolver (must reference deceased_ssn)`,
            );
          }
        }
      }
    }

    // Threshold present
    const def = (r.rule_definition || {}) as any;
    const hasValue =
      def.value !== undefined && def.value !== null && def.value !== '';
    if (!hasValue) {
      push('MISSING_THRESHOLD', 'WARN', 'Rule has no product-specific threshold value');
    }
  }

  return {
    ok: blocking.length === 0,
    blocking,
    warnings,
    total_rules: (rules || []).length,
  };
}
