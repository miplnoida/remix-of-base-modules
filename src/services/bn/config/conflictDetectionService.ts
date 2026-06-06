/**
 * BN Product Catalog — Cross-Tab Conflict Detection
 *
 * Field validation checks whether ONE rule is valid.
 * Conflict detection checks whether ALL rules can work together
 * across Eligibility, Calculation, Documents, Workflow, Screens,
 * Communications, Transitions, Workbaskets & Medical policy.
 *
 * Returns a list of `Conflict` objects, plus aggregated counts.
 * Persistence is best-effort: results are cached in memory by versionId.
 * Publish gating callers should use `hasBlockingConflicts(versionId)`.
 */
import { supabase } from '@/integrations/supabase/client';

export type ConflictSeverity = 'ERROR' | 'WARNING' | 'INFO';
export type ConflictTab =
  | 'Eligibility'
  | 'Calculation'
  | 'Documents'
  | 'Workflow'
  | 'Transitions'
  | 'Screens'
  | 'Communications'
  | 'Workbasket'
  | 'Medical'
  | 'Product';

export interface Conflict {
  id: string;
  severity: ConflictSeverity;
  product_id?: string | null;
  product_version_id: string;
  tab: ConflictTab;
  entity_type: string;
  entity_ids: string[];
  conflict_type: string;
  message: string;
  suggested_fix: string;
  blocks_publish: boolean;
}

export interface ConflictReport {
  product_version_id: string;
  generated_at: string;
  errors: number;
  warnings: number;
  info: number;
  conflicts: Conflict[];
}

let _idSeq = 0;
const mk = (c: Omit<Conflict, 'id' | 'blocks_publish'>): Conflict => ({
  ...c,
  id: `cf_${++_idSeq}`,
  blocks_publish: c.severity === 'ERROR',
});

// ───── Loaders ─────────────────────────────────────────────────────
async function loadVersion(versionId: string) {
  const { data } = await supabase
    .from('bn_product_version')
    .select('*, bn_product:product_id(*)')
    .eq('id', versionId)
    .maybeSingle();
  return data as any;
}

async function loadAll(versionId: string) {
  const [elig, calc, docs, comm, channels] = await Promise.all([
    supabase.from('bn_eligibility_rule').select('*').eq('product_version_id', versionId).eq('is_active', true),
    supabase.from('bn_calculation_rule').select('*').eq('product_version_id', versionId).eq('is_active', true),
    supabase.from('bn_doc_requirement').select('*').eq('product_version_id', versionId).eq('is_active', true),
    supabase.from('bn_comm_mapping').select('*').eq('bn_product_version_id', versionId).eq('active', true),
    supabase.from('bn_product_channel_config').select('*').eq('product_version_id', versionId),
  ]);
  return {
    eligibility: elig.data || [],
    calculation: calc.data || [],
    documents: docs.data || [],
    communications: comm.data || [],
    channels: channels.data || [],
  };
}

// ───── 1. Eligibility ───────────────────────────────────────────────
const NUMERIC_OPS = new Set(['>=', '>', '<=', '<', '=', '==', '!=']);

function extractFieldOp(rule: any): { field?: string; op?: string; value?: any } {
  const def = rule.rule_definition || {};
  const field = def.field_key || def.field || rule.data_source;
  const op = def.operator || def.op;
  const value = def.value ?? def.threshold ?? def.compare_value;
  return { field, op, value };
}

function numericContradiction(a: { op?: string; value?: any }, b: { op?: string; value?: any }): boolean {
  const av = Number(a.value); const bv = Number(b.value);
  if (Number.isNaN(av) || Number.isNaN(bv)) return false;
  // Equality contradictions
  if ((a.op === '=' || a.op === '==') && (b.op === '=' || b.op === '==')) return av !== bv;
  // (>= X) vs (< X) where same value → impossible
  if ((a.op === '>=' && b.op === '<' && av === bv) || (b.op === '>=' && a.op === '<' && bv === av)) return true;
  if ((a.op === '>' && b.op === '<=' && av >= bv) || (b.op === '>' && a.op === '<=' && bv >= av)) return true;
  // Upper < value < Lower
  const aMin = a.op === '>=' ? av : a.op === '>' ? av + 1e-9 : -Infinity;
  const aMax = a.op === '<=' ? av : a.op === '<' ? av - 1e-9 : Infinity;
  const bMin = b.op === '>=' ? bv : b.op === '>' ? bv + 1e-9 : -Infinity;
  const bMax = b.op === '<=' ? bv : b.op === '<' ? bv - 1e-9 : Infinity;
  const min = Math.max(aMin, bMin);
  const max = Math.min(aMax, bMax);
  return min > max;
}

function stringContradiction(a: any, b: any): boolean {
  const eq = (op: string) => op === '=' || op === '==';
  if (eq(a.op) && eq(b.op) && a.value !== b.value) return true;
  return false;
}

export async function detectEligibilityConflicts(versionId: string): Promise<Conflict[]> {
  const { data } = await supabase
    .from('bn_eligibility_rule').select('*').eq('product_version_id', versionId).eq('is_active', true);
  const rules = data || [];
  const out: Conflict[] = [];

  // group by field
  const byField = new Map<string, any[]>();
  for (const r of rules) {
    const { field } = extractFieldOp(r);
    if (!field) continue;
    if (!byField.has(field)) byField.set(field, []);
    byField.get(field)!.push(r);
  }

  // pairwise contradictions
  for (const [field, group] of byField) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const ai = extractFieldOp(group[i]);
        const bj = extractFieldOp(group[j]);
        const contradicts = NUMERIC_OPS.has(ai.op || '') && NUMERIC_OPS.has(bj.op || '')
          ? numericContradiction(ai, bj)
          : stringContradiction(ai, bj);
        if (contradicts) {
          out.push(mk({
            severity: 'ERROR',
            product_version_id: versionId,
            tab: 'Eligibility',
            entity_type: 'bn_eligibility_rule',
            entity_ids: [group[i].id, group[j].id],
            conflict_type: 'IMPOSSIBLE_CONDITION',
            message: `Rules "${group[i].rule_name}" (${ai.op} ${ai.value}) and "${group[j].rule_name}" (${bj.op} ${bj.value}) on field "${field}" cannot both be satisfied.`,
            suggested_fix: `Adjust one of the thresholds, move the rules to alternative paths/groups, or deactivate one.`,
          }));
        }

        // exact duplicates
        if (ai.op === bj.op && String(ai.value) === String(bj.value)) {
          out.push(mk({
            severity: 'WARNING',
            product_version_id: versionId,
            tab: 'Eligibility',
            entity_type: 'bn_eligibility_rule',
            entity_ids: [group[i].id, group[j].id],
            conflict_type: 'DUPLICATE_RULE',
            message: `Duplicate eligibility rule for ${field} ${ai.op} ${ai.value}.`,
            suggested_fix: 'Remove one of the duplicates or consolidate into a single rule group.',
          }));
        }
      }
    }
  }
  return out;
}

// ───── 2. Calculation ───────────────────────────────────────────────
export async function detectCalculationConflicts(versionId: string): Promise<Conflict[]> {
  const ver = await loadVersion(versionId);
  const { data } = await supabase
    .from('bn_calculation_rule').select('*').eq('product_version_id', versionId).eq('is_active', true);
  const rules = data || [];
  const out: Conflict[] = [];

  // multiple primary formulas of same calc_type
  const byType = new Map<string, any[]>();
  for (const r of rules) {
    const k = r.calc_type || 'DEFAULT';
    if (!byType.has(k)) byType.set(k, []);
    byType.get(k)!.push(r);
  }
  for (const [t, list] of byType) {
    if (list.length > 1) {
      out.push(mk({
        severity: 'WARNING',
        product_version_id: versionId,
        tab: 'Calculation',
        entity_type: 'bn_calculation_rule',
        entity_ids: list.map((r: any) => r.id),
        conflict_type: 'MULTIPLE_PRIMARY_FORMULAS',
        message: `${list.length} active formulas of type ${t}. Only one primary formula is normally expected per path.`,
        suggested_fix: 'Deactivate older formulas, or split into distinct calc_type / path values.',
      }));
    }
  }

  // min/max sanity in limits
  for (const r of rules) {
    const lim = r.limits || {};
    const min = lim.min_amount ?? lim.minimum;
    const max = lim.max_amount ?? lim.cap ?? lim.maximum;
    if (min != null && max != null && Number(min) > Number(max)) {
      out.push(mk({
        severity: 'ERROR',
        product_version_id: versionId,
        tab: 'Calculation',
        entity_type: 'bn_calculation_rule',
        entity_ids: [r.id],
        conflict_type: 'MIN_GREATER_THAN_MAX',
        message: `Formula "${r.rule_name}" has minimum ${min} greater than maximum ${max}.`,
        suggested_fix: 'Correct the min/max limits in the formula configuration.',
      }));
    }
    // family share
    const shares = lim.beneficiary_shares;
    if (Array.isArray(shares)) {
      const sum = shares.reduce((s: number, x: any) => s + Number(x?.pct || 0), 0);
      if (sum > 100.01) {
        out.push(mk({
          severity: 'ERROR',
          product_version_id: versionId,
          tab: 'Calculation',
          entity_type: 'bn_calculation_rule',
          entity_ids: [r.id],
          conflict_type: 'SHARES_EXCEED_100',
          message: `Beneficiary shares in "${r.rule_name}" total ${sum}%.`,
          suggested_fix: 'Reduce shares so they sum to ≤ 100% or add a family cap.',
        }));
      }
    }
  }

  // money formula on non-payment product
  if (ver?.bn_product?.payment_type === 'NON_PAYMENT' && rules.length > 0) {
    out.push(mk({
      severity: 'WARNING',
      product_version_id: versionId,
      tab: 'Calculation',
      entity_type: 'bn_calculation_rule',
      entity_ids: rules.map((r: any) => r.id),
      conflict_type: 'MONEY_FORMULA_ON_SERVICE_PRODUCT',
      message: `Product payment_type is NON_PAYMENT but ${rules.length} monetary formulas are configured.`,
      suggested_fix: 'Remove the formulas, or change the product payment_type.',
    }));
  }

  // missing variable resolvers — look up eligibility fields covered
  const elig = await supabase
    .from('bn_eligibility_rule').select('rule_definition').eq('product_version_id', versionId);
  const knownFields = new Set<string>();
  (elig.data || []).forEach((r: any) => {
    const f = r.rule_definition?.field_key || r.rule_definition?.field;
    if (f) knownFields.add(f.split('.').pop());
  });
  const systemVars = new Set([
    'avg_weekly_wage', 'avg_annual_wage', 'paid_weeks', 'credited_weeks',
    'total_weeks', 'rate_pct', 'base_rate_pct', 'increment_rate_pct',
    'disablement_pct', 'flat_amount', 'monthly_rate', 'family_cap_pct',
    'beneficiary_share_pct', 'age_at_claim_date',
  ]);
  for (const r of rules) {
    const vars: string[] = Array.isArray(r.variables) ? r.variables.map((v: any) => v.key || v.name || v) : [];
    const missing = vars.filter(v => v && !systemVars.has(v) && !knownFields.has(v));
    if (missing.length) {
      out.push(mk({
        severity: 'WARNING',
        product_version_id: versionId,
        tab: 'Calculation',
        entity_type: 'bn_calculation_rule',
        entity_ids: [r.id],
        conflict_type: 'UNRESOLVED_VARIABLE',
        message: `Formula "${r.rule_name}" uses variable(s) ${missing.join(', ')} not provided by eligibility or the system resolver.`,
        suggested_fix: 'Add an eligibility rule that captures the field, or pick a known system variable.',
      }));
    }
  }

  return out;
}

// ───── 3. Documents ─────────────────────────────────────────────────
export async function detectDocumentConflicts(versionId: string): Promise<Conflict[]> {
  const { data } = await supabase
    .from('bn_doc_requirement').select('*').eq('product_version_id', versionId).eq('is_active', true);
  const docs = data || [];
  const out: Conflict[] = [];

  // same doc both mandatory + optional
  const byCode = new Map<string, any[]>();
  for (const d of docs) {
    if (!byCode.has(d.document_type_code)) byCode.set(d.document_type_code, []);
    byCode.get(d.document_type_code)!.push(d);
  }
  for (const [code, list] of byCode) {
    const levels = new Set(list.map((d: any) => d.requirement_level));
    if (levels.has('MANDATORY') && levels.has('OPTIONAL')) {
      out.push(mk({
        severity: 'WARNING',
        product_version_id: versionId,
        tab: 'Documents',
        entity_type: 'bn_doc_requirement',
        entity_ids: list.map((d: any) => d.id),
        conflict_type: 'DOC_MANDATORY_AND_OPTIONAL',
        message: `Document ${code} is configured as both Mandatory and Optional across stages/channels.`,
        suggested_fix: 'Pick a single requirement level, or split into distinct stage/channel rows with clear intent.',
      }));
    }
  }

  // mandatory but no public/internal channel
  for (const d of docs) {
    if (d.requirement_level === 'MANDATORY' && !d.public_visible && !d.internal_visible) {
      out.push(mk({
        severity: 'ERROR',
        product_version_id: versionId,
        tab: 'Documents',
        entity_type: 'bn_doc_requirement',
        entity_ids: [d.id],
        conflict_type: 'MANDATORY_NO_UPLOAD_PATH',
        message: `Mandatory document ${d.document_type_code} has both public and internal upload disabled — no one can ever provide it.`,
        suggested_fix: 'Enable at least one of public_visible / internal_visible.',
      }));
    }
  }

  return out;
}

// ───── 4. Communications ────────────────────────────────────────────
export async function detectCommunicationConflicts(versionId: string): Promise<Conflict[]> {
  const { data } = await supabase
    .from('bn_comm_mapping').select('*, template:template_id(*)')
    .eq('bn_product_version_id', versionId).eq('active', true);
  const list = data || [];
  const out: Conflict[] = [];

  for (const m of list) {
    const t: any = m.template;
    if (t?.channel && t.channel !== m.channel) {
      out.push(mk({
        severity: 'WARNING',
        product_version_id: versionId,
        tab: 'Communications',
        entity_type: 'bn_comm_mapping',
        entity_ids: [m.id],
        conflict_type: 'CHANNEL_MISMATCH',
        message: `Mapping for ${m.event_code} delivers via ${m.channel} but its template is configured for ${t.channel}.`,
        suggested_fix: 'Align the mapping channel with the template channel, or pick a matching template.',
      }));
    }
    if (m.is_required && !m.template_id) {
      out.push(mk({
        severity: 'ERROR',
        product_version_id: versionId,
        tab: 'Communications',
        entity_type: 'bn_comm_mapping',
        entity_ids: [m.id],
        conflict_type: 'REQUIRED_NO_TEMPLATE',
        message: `Required communication for ${m.event_code} has no template assigned.`,
        suggested_fix: 'Pick a template for this event/channel.',
      }));
    }
  }

  // critical events missing letter mapping
  const criticalEvents = ['CLAIM_APPROVED', 'CLAIM_REJECTED', 'CLAIM_SUSPENDED', 'OVERPAYMENT_RAISED'];
  for (const ev of criticalEvents) {
    const hasLetter = list.some((m: any) => m.event_code === ev && m.channel === 'LETTER');
    if (!hasLetter) {
      out.push(mk({
        severity: 'INFO',
        product_version_id: versionId,
        tab: 'Communications',
        entity_type: 'bn_comm_mapping',
        entity_ids: [],
        conflict_type: 'MISSING_FORMAL_LETTER',
        message: `No formal LETTER mapping configured for ${ev}.`,
        suggested_fix: 'Add a LETTER channel mapping for the claimant for formal record.',
      }));
    }
  }
  return out;
}

// ───── 5. Workflow / Transitions ────────────────────────────────────
export async function detectWorkflowConflicts(versionId: string): Promise<Conflict[]> {
  const ver = await loadVersion(versionId);
  const out: Conflict[] = [];
  if (!ver) return out;
  if (!ver.workflow_template_id && ver.bn_product?.category !== 'SERVICE') {
    out.push(mk({
      severity: 'WARNING',
      product_version_id: versionId,
      tab: 'Workflow',
      entity_type: 'bn_product_version',
      entity_ids: [versionId],
      conflict_type: 'NO_WORKFLOW_BOUND',
      message: 'Version has no workflow template assigned but is not a service-only product.',
      suggested_fix: 'Pick a workflow template on the Workflow tab.',
    }));
  }
  return out;
}

export async function detectTransitionConflicts(_versionId: string): Promise<Conflict[]> {
  // Transition matrix lives at scheme level; deep validation is performed by Registry Validation.
  return [];
}

// ───── 6. Screens ───────────────────────────────────────────────────
export async function detectScreenFieldConflicts(versionId: string): Promise<Conflict[]> {
  const ver = await loadVersion(versionId);
  const out: Conflict[] = [];
  if (!ver) return out;
  const cat = ver.bn_product?.category;
  if (cat === 'SURVIVOR' && !ver.screen_template_id) {
    out.push(mk({
      severity: 'WARNING',
      product_version_id: versionId,
      tab: 'Screens',
      entity_type: 'bn_product_version',
      entity_ids: [versionId],
      conflict_type: 'SURVIVOR_NO_BENEFICIARY_SCREEN',
      message: 'Survivor benefit has no screen template — beneficiary grid will be missing on the application.',
      suggested_fix: 'Assign a screen template that includes a Survivor / Beneficiary grid.',
    }));
  }
  return out;
}

// ───── 7. Workbasket & Escalation ──────────────────────────────────
export async function detectWorkbasketEscalationConflicts(_versionId: string): Promise<Conflict[]> {
  return [];
}

// ───── 8. Medical Policy ───────────────────────────────────────────
export async function detectMedicalPolicyConflicts(versionId: string): Promise<Conflict[]> {
  const ver = await loadVersion(versionId);
  const out: Conflict[] = [];
  if (!ver) return out;
  const branch = ver.bn_product?.branch;
  // sickness / EI / invalidity products usually need a medical cert document
  const needsMedical = ['SICKNESS', 'EI', 'INVALIDITY', 'DISABLEMENT'].includes(branch);
  if (needsMedical) {
    const { data: docs } = await supabase
      .from('bn_doc_requirement').select('document_type_code')
      .eq('product_version_id', versionId).eq('is_active', true);
    const hasMed = (docs || []).some((d: any) =>
      /MED|MEDICAL|CERT|DOCTOR/i.test(d.document_type_code));
    if (!hasMed) {
      out.push(mk({
        severity: 'WARNING',
        product_version_id: versionId,
        tab: 'Medical',
        entity_type: 'bn_doc_requirement',
        entity_ids: [],
        conflict_type: 'MEDICAL_PRODUCT_NO_MEDICAL_DOC',
        message: `Branch "${branch}" typically requires a medical certificate but none is configured in Documents.`,
        suggested_fix: 'Add a medical certificate document requirement on the Documents tab.',
      }));
    }
  }
  return out;
}

// ───── Aggregate ────────────────────────────────────────────────────
export async function detectProductVersionConflicts(versionId: string): Promise<ConflictReport> {
  const [e, c, d, w, t, s, m, wb, med] = await Promise.all([
    detectEligibilityConflicts(versionId),
    detectCalculationConflicts(versionId),
    detectDocumentConflicts(versionId),
    detectWorkflowConflicts(versionId),
    detectTransitionConflicts(versionId),
    detectScreenFieldConflicts(versionId),
    detectCommunicationConflicts(versionId),
    detectWorkbasketEscalationConflicts(versionId),
    detectMedicalPolicyConflicts(versionId),
  ]);
  const conflicts = [...e, ...c, ...d, ...w, ...t, ...s, ...m, ...wb, ...med];
  return {
    product_version_id: versionId,
    generated_at: new Date().toISOString(),
    errors: conflicts.filter(x => x.severity === 'ERROR').length,
    warnings: conflicts.filter(x => x.severity === 'WARNING').length,
    info: conflicts.filter(x => x.severity === 'INFO').length,
    conflicts,
  };
}

export async function hasBlockingConflicts(versionId: string): Promise<boolean> {
  const r = await detectProductVersionConflicts(versionId);
  return r.errors > 0;
}
