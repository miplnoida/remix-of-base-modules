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

  // ─── Eligibility rules — fact keys must resolve ─────────────────
  const { data: rules } = await db
    .from('bn_eligibility_rule')
    .select('id, rule_code, fact_key, severity, is_active')
    .eq('product_version_id', cfg.product_version_id);

  const knownFactKeys = new Set(ELIGIBILITY_FACTS.map((f) => f.fact_key));

  for (const r of rules ?? []) {
    if (r.is_active === false) continue;
    if (!r.fact_key) {
      push(bucket, {
        code: 'RULE_FACT_KEY_MISSING',
        severity: 'WARN',
        message: `Eligibility rule ${r.rule_code} has no fact_key.`,
        fixHint: 'Open Eligibility Rules and pick a field from the registry.',
        details: { rule_id: r.id, rule_code: r.rule_code },
      });
      continue;
    }
    if (!knownFactKeys.has(r.fact_key)) {
      push(bucket, {
        code: 'RULE_FACT_KEY_UNKNOWN',
        severity: 'ERROR',
        message: `Eligibility rule ${r.rule_code} references unknown fact key "${r.fact_key}".`,
        fixHint: 'Re-pick the field from the Eligibility Fact Registry.',
        details: { rule_id: r.id, rule_code: r.rule_code, fact_key: r.fact_key },
      });
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
