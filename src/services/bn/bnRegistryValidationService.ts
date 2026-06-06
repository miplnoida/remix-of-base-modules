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
  const formulas = await safeFetch('bn_formula_template');
  for (const f of formulas) {
    if (f.is_active === false) continue;
    const expr: string = f.formula_expression || '';
    if (!expr) continue;
    try {
      const result = parseFormula(expr);
      if (!result.valid) {
        findings.push({
          category: 'FORMULA_VARIABLE',
          severity: 'WARNING',
          entity: 'bn_formula_template',
          entityId: f.id,
          message: `${f.template_code}: ${result.errors.join('; ') || 'parse error'}`,
        });
        continue;
      }
      const unknown = (result.variablesUsed || []).filter((v) => !allowedVars.has(v));
      if (unknown.length > 0) {
        findings.push({
          category: 'FORMULA_VARIABLE',
          severity: 'ERROR',
          entity: 'bn_formula_template',
          entityId: f.id,
          message: `${f.template_code}: unknown variables [${unknown.join(', ')}]`,
        });
      }
    } catch (e: any) {
      findings.push({
        category: 'FORMULA_VARIABLE',
        severity: 'WARNING',
        entity: 'bn_formula_template',
        entityId: f.id,
        message: `${f.template_code}: parse error — ${e?.message ?? 'invalid'}`,
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

  // ---------- 6. Orphan / inactive-library references on active product versions ----------
  const productVersions = await safeFetch('bn_product_version');
  const liveVersions = productVersions.filter(
    (v) => ['ACTIVE', 'PUBLISHED', 'APPROVED'].includes(String(v.status || '').toUpperCase()),
  );

  const workflowTemplates = await safeFetch('bn_workflow_template');
  const wfById = new Map(workflowTemplates.map((t) => [t.id, t]));
  const screenTemplates = await safeFetch('bn_screen_template');
  const scrById = new Map(screenTemplates.map((t) => [t.id, t]));
  const docProfiles = await safeFetch('bn_document_profile');
  const dpById = new Map(docProfiles.map((t) => [t.id, t]));

  for (const v of liveVersions) {
    const label = `V${v.version_number ?? '?'} (${v.id?.slice(0, 8)})`;
    if (v.workflow_template_id) {
      const wf = wfById.get(v.workflow_template_id);
      if (!wf) {
        findings.push({ category: 'ORPHAN_REFERENCE', severity: 'ERROR', entity: 'bn_product_version', entityId: v.id, message: `${label}: workflow_template_id references missing record` });
      } else if (wf.is_active === false) {
        findings.push({ category: 'ORPHAN_REFERENCE', severity: 'ERROR', entity: 'bn_product_version', entityId: v.id, message: `${label}: references inactive workflow template "${wf.template_code}"` });
      }
    }
    if (v.screen_template_id) {
      const sc = scrById.get(v.screen_template_id);
      if (!sc) {
        findings.push({ category: 'ORPHAN_REFERENCE', severity: 'ERROR', entity: 'bn_product_version', entityId: v.id, message: `${label}: screen_template_id references missing record` });
      } else if (sc.is_active === false) {
        findings.push({ category: 'ORPHAN_REFERENCE', severity: 'WARNING', entity: 'bn_product_version', entityId: v.id, message: `${label}: references inactive screen template "${sc.template_code}"` });
      }
    }
    if (v.document_profile_id) {
      const dp = dpById.get(v.document_profile_id);
      if (!dp) {
        findings.push({ category: 'ORPHAN_REFERENCE', severity: 'ERROR', entity: 'bn_product_version', entityId: v.id, message: `${label}: document_profile_id references missing record` });
      } else if (dp.is_active === false) {
        findings.push({ category: 'ORPHAN_REFERENCE', severity: 'WARNING', entity: 'bn_product_version', entityId: v.id, message: `${label}: references inactive document profile "${dp.profile_code}"` });
      }
    }
  }

  // Communication mappings → comm events: active mappings must reference active events
  const commEvents = await safeFetch('bn_comm_event');
  const inactiveEventCodes = new Set(
    commEvents.filter((e) => e.is_active === false).map((e) => e.event_code),
  );
  const commMappings = await safeFetch('bn_comm_mapping');
  for (const m of commMappings) {
    if (m.is_active === false) continue;
    if (m.event_code && inactiveEventCodes.has(m.event_code)) {
      findings.push({
        category: 'ORPHAN_REFERENCE',
        severity: 'WARNING',
        entity: 'bn_comm_mapping',
        entityId: m.id,
        message: `Active mapping references inactive communication event "${m.event_code}"`,
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
