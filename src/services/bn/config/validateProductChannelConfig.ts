/**
 * Product Channel Configuration Validator (Phase 4)
 *
 * Cross-checks a `bn_product_channel_config` row against related catalogue
 * tables and flags configuration gaps that would prevent the intake from
 * working end-to-end. The result is consumed by the Channels tab to surface
 * a "Configuration health" panel and (in a follow-up) by the publish gate.
 */
import { supabase } from '@/integrations/supabase/client';
import { ELIGIBILITY_FACTS } from '@/services/bn/eligibility/eligibilityFactRegistry';

const db = supabase as any;

export type ChannelValidationSeverity = 'ERROR' | 'WARN' | 'INFO';

export interface ChannelValidationIssue {
  code: string;
  severity: ChannelValidationSeverity;
  message: string;
  fixHint?: string;
  details?: Record<string, any>;
}

export interface ChannelValidationResult {
  channelConfigId: string;
  channelCode: 'ONLINE' | 'OFFLINE';
  productVersionId: string;
  ok: boolean;
  errors: ChannelValidationIssue[];
  warnings: ChannelValidationIssue[];
  infos: ChannelValidationIssue[];
}

function push(
  arr: { errors: ChannelValidationIssue[]; warnings: ChannelValidationIssue[]; infos: ChannelValidationIssue[] },
  i: ChannelValidationIssue,
) {
  if (i.severity === 'ERROR') arr.errors.push(i);
  else if (i.severity === 'WARN') arr.warnings.push(i);
  else arr.infos.push(i);
}

export async function validateProductChannelConfig(
  channelConfigId: string,
): Promise<ChannelValidationResult> {
  const { data: cfg, error } = await db
    .from('bn_product_channel_config')
    .select('*')
    .eq('id', channelConfigId)
    .maybeSingle();
  if (error) throw error;
  if (!cfg) throw new Error(`Channel config ${channelConfigId} not found`);

  const bucket = { errors: [] as ChannelValidationIssue[], warnings: [] as ChannelValidationIssue[], infos: [] as ChannelValidationIssue[] };

  // ─── Workflow wiring ────────────────────────────────────────────
  if (!cfg.workflow_template_id && !cfg.workflow_definition_id) {
    push(bucket, {
      code: 'WORKFLOW_MISSING',
      severity: 'ERROR',
      message: 'No workflow template or workflow definition is wired to this channel.',
      fixHint: 'Pick a Workflow Template (preferred) or set Workflow Definition ID under Channels.',
    });
  }

  // ─── Payment section ────────────────────────────────────────────
  const paymentVisible = (cfg.payment_details_visibility ?? 'SHOW') !== 'HIDE';
  const paymentRequired = !!(
    cfg.payment_required_at_application ||
    cfg.payment_required_before_approval ||
    cfg.payment_required_before_payment
  );

  if (paymentRequired && !paymentVisible) {
    push(bucket, {
      code: 'PAYMENT_REQUIRED_BUT_HIDDEN',
      severity: 'ERROR',
      message: 'Payment details are required but the section is hidden on this channel.',
      fixHint: 'Set Payment Details Visibility to SHOW or READONLY, or clear the "payment required" flags.',
    });
  }

  if (paymentVisible) {
    // At least one bank must exist for EFT-capable countries; we only assert that the master is not empty.
    const { count: bankCount } = await db
      .from('bn_bank_master')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);
    if (!bankCount || bankCount === 0) {
      push(bucket, {
        code: 'NO_BANK_MASTER',
        severity: 'WARN',
        message: 'Payment section is visible but no active banks exist in bn_bank_master.',
        fixHint: 'Add bank records under Configuration → Banks.',
      });
    }

    const { count: methodCount } = await db
      .from('bn_payment_method')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);
    if (!methodCount || methodCount === 0) {
      push(bucket, {
        code: 'NO_PAYMENT_METHODS',
        severity: 'ERROR',
        message: 'No active payment methods configured — claimants cannot select how to be paid.',
        fixHint: 'Activate at least one entry in bn_payment_method.',
      });
    }
  }

  // ─── Workbasket override flag ───────────────────────────────────
  if (cfg.allow_manual_workbasket_override) {
    const { count: wbCount } = await db
      .from('bn_workbasket')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);
    if (!wbCount || wbCount === 0) {
      push(bucket, {
        code: 'NO_WORKBASKETS',
        severity: 'WARN',
        message: 'Manual workbasket override is enabled but no workbaskets are active.',
        fixHint: 'Disable the override or seed bn_workbasket.',
      });
    }
  }

  // ─── Eligibility rules — typed-rule & fact-key validation ───────
  const { data: rules } = await db
    .from('bn_eligibility_rule')
    .select('id, rule_code, fact_key, severity, is_active, rule_kind, start_fact_key, end_fact_key, fallback_end_fact_key, compare_fact_key, document_type_code, required_status, existence_check_code, unit, rule_definition')
    .eq('product_version_id', cfg.product_version_id);

  const knownFactKeys = new Set(ELIGIBILITY_FACTS.map((f) => f.fact_key));
  const PLACEHOLDER_VALUES = new Set(['refer', 'yes', 'no', 'claim', 'reject']);

  for (const r of rules ?? []) {
    if (r.is_active === false) continue;
    const kind = r.rule_kind ?? 'LITERAL';
    const def = (r.rule_definition ?? {}) as Record<string, unknown>;
    const checkFact = (key: string | null | undefined, label: string) => {
      if (!key) {
        push(bucket, { code: 'RULE_FACT_KEY_MISSING', severity: 'ERROR', message: `Rule ${r.rule_code}: ${label} fact key is missing.`, details: { rule_id: r.id } });
        return false;
      }
      if (!knownFactKeys.has(key)) {
        push(bucket, { code: 'RULE_FACT_KEY_UNKNOWN', severity: 'ERROR', message: `Rule ${r.rule_code}: ${label} fact "${key}" is not in the registry.`, details: { rule_id: r.id, fact_key: key } });
        return false;
      }
      return true;
    };

    if (kind === 'DATE_DIFFERENCE') {
      checkFact(r.start_fact_key, 'start');
      if (!r.end_fact_key && !r.fallback_end_fact_key) {
        push(bucket, { code: 'RULE_DATE_DIFF_NO_END', severity: 'ERROR', message: `Rule ${r.rule_code}: DATE_DIFFERENCE rule has no end or fallback end fact.`, details: { rule_id: r.id } });
      } else {
        if (r.end_fact_key) checkFact(r.end_fact_key, 'end');
        if (r.fallback_end_fact_key) checkFact(r.fallback_end_fact_key, 'fallback end');
      }
      if (!r.unit) push(bucket, { code: 'RULE_DATE_DIFF_NO_UNIT', severity: 'WARN', message: `Rule ${r.rule_code}: no unit specified — defaulting to DAYS.`, details: { rule_id: r.id } });
      if (typeof def['value'] !== 'number') push(bucket, { code: 'RULE_DATE_DIFF_NO_VALUE', severity: 'ERROR', message: `Rule ${r.rule_code}: numeric threshold value is required.`, details: { rule_id: r.id } });
    } else if (kind === 'DOCUMENT_STATUS') {
      if (!r.document_type_code && !r.fact_key) {
        push(bucket, { code: 'RULE_DOC_NO_TYPE', severity: 'ERROR', message: `Rule ${r.rule_code}: DOCUMENT_STATUS rule needs a document_type_code or document status fact.`, details: { rule_id: r.id } });
      }
      if (!r.required_status) {
        push(bucket, { code: 'RULE_DOC_NO_STATUS', severity: 'WARN', message: `Rule ${r.rule_code}: required_status not set — defaulting to VERIFIED.`, details: { rule_id: r.id } });
      }
    } else if (kind === 'FACT_TO_FACT') {
      checkFact(r.fact_key, 'left');
      checkFact(r.compare_fact_key, 'right');
    } else if (kind === 'EXISTS' || kind === 'CROSS_PRODUCT') {
      checkFact(r.fact_key ?? r.existence_check_code, 'existence');
    } else {
      // LITERAL / DERIVED_FACT / CONDITIONAL
      if (r.fact_key && !knownFactKeys.has(r.fact_key)) {
        push(bucket, { code: 'RULE_FACT_KEY_UNKNOWN', severity: 'ERROR', message: `Rule ${r.rule_code} references unknown fact "${r.fact_key}".`, details: { rule_id: r.id, fact_key: r.fact_key } });
      } else if (!r.fact_key) {
        push(bucket, { code: 'RULE_FACT_KEY_MISSING', severity: 'WARN', message: `Rule ${r.rule_code} has no fact_key.`, details: { rule_id: r.id } });
      }
      // Type mismatch / placeholder detection
      const v = def['value'];
      if (typeof v === 'string' && PLACEHOLDER_VALUES.has(v.trim().toLowerCase())) {
        push(bucket, { code: 'RULE_PLACEHOLDER_VALUE', severity: 'ERROR', message: `Rule ${r.rule_code}: expected value "${v}" is a placeholder, not a real value. Re-author this rule using a proper rule kind (DATE_DIFFERENCE, DOCUMENT_STATUS, etc.).`, details: { rule_id: r.id, value: v } });
      }
      const factDef = r.fact_key ? ELIGIBILITY_FACTS.find((f) => f.fact_key === r.fact_key) : null;
      if (factDef) {
        const t = factDef.data_type;
        if ((t === 'number' && v !== undefined && v !== null && typeof v !== 'number') ||
            (t === 'bool' && v !== undefined && v !== null && typeof v !== 'boolean')) {
          push(bucket, { code: 'RULE_VALUE_TYPE_MISMATCH', severity: 'WARN', message: `Rule ${r.rule_code}: expected value type does not match fact type (${t}).`, details: { rule_id: r.id, value: v, fact_type: t } });
        }
      }
    }
  }

  // ─── Screen / document profile (info) ───────────────────────────
  if (!cfg.screen_template_id) {
    push(bucket, {
      code: 'SCREEN_TEMPLATE_NOT_SET',
      severity: 'INFO',
      message: 'No screen template selected — defaults will be used.',
    });
  }
  if (!cfg.document_profile_id) {
    push(bucket, {
      code: 'DOCUMENT_PROFILE_NOT_SET',
      severity: 'INFO',
      message: 'No document profile selected — required documents come from product-version rules only.',
    });
  }

  return {
    channelConfigId,
    channelCode: cfg.channel_code,
    productVersionId: cfg.product_version_id,
    ok: bucket.errors.length === 0,
    errors: bucket.errors,
    warnings: bucket.warnings,
    infos: bucket.infos,
  };
}

export async function validateAllChannelConfigs(productVersionId: string): Promise<ChannelValidationResult[]> {
  const { data, error } = await db
    .from('bn_product_channel_config')
    .select('id')
    .eq('product_version_id', productVersionId);
  if (error) throw error;
  const out: ChannelValidationResult[] = [];
  for (const row of data ?? []) {
    out.push(await validateProductChannelConfig(row.id));
  }
  return out;
}
