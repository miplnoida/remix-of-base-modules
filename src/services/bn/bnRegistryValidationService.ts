/**
 * bnRegistryValidationService — client-side conformance checks that compare
 * live BN configuration tables against the typed registries. Surfaces:
 *   - transition matrix rows that violate ALLOWED_TRANSITIONS
 *   - calculation formulas that reference unknown variables
 *   - eligibility configs that reference unknown field keys
 *   - smart field metadata rows with unknown field types
 *   - workbaskets / escalation policies that reference unknown workflow roles
 *   - orphan product-specific configuration outside Product Catalog (active
 *     references to inactive library records)
 */
import { supabase } from '@/integrations/supabase/client';
import { ALLOWED_TRANSITIONS } from './registries/transitionRegistry';
import { FORMULA_VARIABLES } from './registries/formulaVariableRegistry';
import { ELIGIBILITY_FIELDS } from './registries/eligibilityFieldRegistry';
import { SMART_FIELD_TYPES } from './registries/smartFieldRegistry';
import { BN_WORKFLOW_ROLES } from './registries/workflowRolesRegistry';
import { parseFormula } from '@/lib/bn/formulaParser';

const db = supabase as any;

export interface RegistryFinding {
  category:
    | 'TRANSITION'
    | 'FORMULA_VARIABLE'
    | 'ELIGIBILITY_KEY'
    | 'SMART_FIELD_TYPE'
    | 'WORKFLOW_ROLE'
    | 'ORPHAN_REFERENCE';
  severity: 'ERROR' | 'WARNING';
  entity: string;
  entityId?: string;
  message: string;
}

export interface RegistryValidationReport {
  ranAt: string;
  total: number;
  errors: number;
  warnings: number;
  findings: RegistryFinding[];
}

async function safeFetch<T = any>(table: string, select = '*'): Promise<T[]> {
  try {
    const { data, error } = await db.from(table).select(select);
    if (error) return [];
    return (data ?? []) as T[];
  } catch {
    return [];
  }
}

export async function runRegistryValidation(): Promise<RegistryValidationReport> {
  const findings: RegistryFinding[] = [];

  // ---------- 1. Transition Matrix conformance ----------
  const transitionRules = await safeFetch('bn_claim_transition_rule');
  for (const r of transitionRules) {
    if (!r.is_active) continue;
    const ok = ALLOWED_TRANSITIONS.some(
      (t) => t.from === r.from_status && t.action === r.action_code && t.to === r.to_status,
    );
    if (!ok) {
      findings.push({
        category: 'TRANSITION',
        severity: 'ERROR',
        entity: 'bn_claim_transition_rule',
        entityId: r.id,
        message: `Invalid transition: ${r.from_status} —[${r.action_code}]→ ${r.to_status}`,
      });
    }
  }

  // ---------- 2. Formula variable conformance ----------
  const allowedVars = new Set(FORMULA_VARIABLES.map((v) => v.key));
  const formulas = await safeFetch('bn_formula');
  for (const f of formulas) {
    if (f.is_active === false) continue;
    const expr: string = f.formula_expression || f.expression || '';
    if (!expr) continue;
    try {
      const result = parseFormula(expr);
      const unknown = (result.variables || []).filter((v) => !allowedVars.has(v));
      if (unknown.length > 0) {
        findings.push({
          category: 'FORMULA_VARIABLE',
          severity: 'ERROR',
          entity: 'bn_formula',
          entityId: f.id,
          message: `${f.formula_code || f.code}: unknown variables [${unknown.join(', ')}]`,
        });
      }
    } catch (e: any) {
      findings.push({
        category: 'FORMULA_VARIABLE',
        severity: 'WARNING',
        entity: 'bn_formula',
        entityId: f.id,
        message: `${f.formula_code || f.code}: parse error — ${e?.message ?? 'invalid'}`,
      });
    }
  }

  // ---------- 3. Eligibility field key conformance ----------
  const allowedFields = new Set(ELIGIBILITY_FIELDS.map((f) => f.key));
  const eligibilityRules = await safeFetch('bn_eligibility_rule');
  for (const r of eligibilityRules) {
    if (r.is_active === false) continue;
    const key = r.field_key || r.left_operand || r.field;
    if (key && !allowedFields.has(key)) {
      findings.push({
        category: 'ELIGIBILITY_KEY',
        severity: 'ERROR',
        entity: 'bn_eligibility_rule',
        entityId: r.id,
        message: `Unknown eligibility field key: "${key}"`,
      });
    }
  }

  // ---------- 4. Smart field type conformance ----------
  const allowedTypes = new Set(SMART_FIELD_TYPES.map((t) => t.key as string));
  const fieldMeta = await safeFetch('bn_field_metadata');
  for (const f of fieldMeta) {
    const t = f.field_type;
    if (t && !allowedTypes.has(t)) {
      findings.push({
        category: 'SMART_FIELD_TYPE',
        severity: 'WARNING',
        entity: 'bn_field_metadata',
        entityId: f.id,
        message: `${f.field_name}: unknown smart-field type "${t}"`,
      });
    }
  }

  // ---------- 5. Workflow role conformance ----------
  const allowedRoles = new Set<string>(BN_WORKFLOW_ROLES as readonly string[]);
  const workbaskets = await safeFetch('bn_workbasket');
  for (const w of workbaskets) {
    if (w.is_active === false) continue;
    if (w.assigned_role && !allowedRoles.has(w.assigned_role)) {
      findings.push({
        category: 'WORKFLOW_ROLE',
        severity: 'WARNING',
        entity: 'bn_workbasket',
        entityId: w.id,
        message: `${w.basket_code}: role "${w.assigned_role}" not in workflow role registry`,
      });
    }
  }
  const escPolicies = await safeFetch('bn_escalation_policy');
  for (const p of escPolicies) {
    if (p.is_active === false) continue;
    if (p.escalation_target_role && !allowedRoles.has(p.escalation_target_role)) {
      findings.push({
        category: 'WORKFLOW_ROLE',
        severity: 'WARNING',
        entity: 'bn_escalation_policy',
        entityId: p.id,
        message: `${p.policy_code}: target role "${p.escalation_target_role}" not in workflow role registry`,
      });
    }
  }

  // ---------- 6. Orphan / inactive-library references ----------
  // Active product version configs should not reference inactive library records.
  const documents = await safeFetch('bn_document');
  const inactiveDocCodes = new Set(
    documents.filter((d) => d.is_active === false).map((d) => d.document_code),
  );
  const productDocs = await safeFetch('bn_product_document');
  for (const pd of productDocs) {
    if (pd.is_active === false) continue;
    if (pd.document_code && inactiveDocCodes.has(pd.document_code)) {
      findings.push({
        category: 'ORPHAN_REFERENCE',
        severity: 'ERROR',
        entity: 'bn_product_document',
        entityId: pd.id,
        message: `Active product references inactive document "${pd.document_code}"`,
      });
    }
  }

  const errors = findings.filter((f) => f.severity === 'ERROR').length;
  const warnings = findings.filter((f) => f.severity === 'WARNING').length;

  return {
    ranAt: new Date().toISOString(),
    total: findings.length,
    errors,
    warnings,
    findings,
  };
}
