/**
 * Payable Validation Service
 * Runs the 8 readiness checks for a payment instruction before it can be batched/issued.
 */
import { supabase } from '@/integrations/supabase/client';
import { resolveProfileForPayable } from './paymentProfileService';
const db = supabase as any;

export interface PayableValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export async function validatePayable(
  instructionId: string,
  userCode = 'SYSTEM',
): Promise<PayableValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { data: instr } = await db
    .from('bn_payment_instruction')
    .select('*')
    .eq('id', instructionId)
    .single();
  if (!instr) {
    return { ok: false, errors: ['Payment instruction not found'], warnings };
  }

  // 1) Approved decision exists
  if (instr.claim_id) {
    const { data: dec } = await db
      .from('bn_claim_decision')
      .select('decision,decision_date')
      .eq('claim_id', instr.claim_id)
      .order('decision_date', { ascending: false })
      .limit(1);
    if (!dec?.[0] || !['APPROVED', 'APPROVED_WITH_CONDITIONS'].includes(dec[0].decision)) {
      errors.push('No approved decision for this claim');
    }
  } else {
    warnings.push('No linked claim id');
  }

  // 2) Eligibility passed (or override)
  if (instr.claim_id) {
    const { data: elig } = await db
      .from('bn_claim_eligibility')
      .select('overall_status,override_applied')
      .eq('claim_id', instr.claim_id)
      .order('created_at', { ascending: false })
      .limit(1);
    const row = elig?.[0];
    if (row && row.overall_status === 'FAILED' && !row.override_applied) {
      errors.push('Eligibility failed without override');
    }
  }

  // 3) Calculation finalized
  if (instr.claim_id) {
    const { data: calc } = await db
      .from('bn_claim_calculation')
      .select('status')
      .eq('claim_id', instr.claim_id)
      .order('created_at', { ascending: false })
      .limit(1);
    if (calc?.[0] && !['FINALIZED', 'APPROVED'].includes(calc[0].status)) {
      warnings.push('Latest calculation not finalized');
    }
  }

  // 4) Payee exists
  if (!instr.payee_id && !instr.beneficiary_name) {
    errors.push('Payee information missing');
  }

  // 5) Payment method exists
  if (!instr.payment_method) {
    errors.push('Payment method not set');
  }

  // 6/7) Verified payment profile via unified resolver (new framework).
  //       Falls back to legacy snapshot fields if no profile exists yet.
  try {
    const resolved = await resolveProfileForPayable({
      personSsn: instr.ssn,
      method: instr.payment_method,
      currency: instr.currency,
      payeeId: instr.payee_id ?? null,
    });
    if (resolved.blocked) {
      // If a legacy snapshot is present, downgrade to warning to avoid breaking existing batches.
      const hasLegacy =
        (instr.payment_method === 'EFT' && instr.bank_account_snapshot?.account_number) ||
        (instr.payment_method === 'CHEQUE' && (instr.cheque_address_snapshot?.line1 || instr.cheque_address_snapshot?.address));
      if (hasLegacy) warnings.push(`Payment profile: ${resolved.reason} (using legacy snapshot)`);
      else errors.push(`Payment profile: ${resolved.reason}`);
    } else if (resolved.profile && !instr.payment_profile_id) {
      // Link the resolved profile for traceability
      await db.from('bn_payment_instruction').update({ payment_profile_id: resolved.profile.id }).eq('id', instructionId);
    }
  } catch (e) {
    warnings.push('Could not resolve payment profile');
  }

  // 8) Duplicate payment for same period
  if (instr.entitlement_id && instr.period_start && instr.period_end) {
    const { data: dup } = await db
      .from('bn_payment_instruction')
      .select('id,status')
      .eq('entitlement_id', instr.entitlement_id)
      .eq('period_start', instr.period_start)
      .eq('period_end', instr.period_end)
      .neq('id', instructionId)
      .not('status', 'in', '(CANCELLED,VOIDED,REJECTED)');
    if (dup?.length) errors.push(`Duplicate payment exists for period ${instr.period_start} → ${instr.period_end}`);
  }

  // 9) Country-vs-product payment hierarchy drift checks (V1, V3, V4, V5, V6, V7)
  //    Catches the case where Country Pack capability was changed AFTER product save.
  try {
    if (instr.product_id && instr.payment_method) {
      const { data: prod } = await db
        .from('bn_product')
        .select('country_code')
        .eq('id', instr.product_id)
        .maybeSingle();
      if (prod?.country_code) {
        const { data: cpc } = await db
          .from('bn_country_payment_config')
          .select(
            'payment_method,is_active,is_method_enabled,allow_third_party_payee,allow_provider_direct_pay,' +
              'bank_file_format,header_record_format,detail_record_format,trailer_record_format,' +
              'cheque_stock_required,cheque_format_template_id',
          )
          .eq('country_code', prod.country_code)
          .eq('payment_method', instr.payment_method)
          .maybeSingle();

        // V1 drift
        if (!cpc || !cpc.is_active || !cpc.is_method_enabled) {
          errors.push(`Payment method ${instr.payment_method} is no longer enabled at country level (${prod.country_code})`);
        } else {
          // V4 — EFT format completeness
          if (instr.payment_method === 'EFT') {
            const missing = ['bank_file_format', 'header_record_format', 'detail_record_format', 'trailer_record_format']
              .filter((f) => !(cpc as any)[f]);
            if (missing.length) errors.push(`Country EFT format incomplete (missing ${missing.join(', ')})`);
          }
          // V5 — Cheque stock/format
          if (instr.payment_method === 'CHEQUE' && cpc.cheque_stock_required && !cpc.cheque_format_template_id) {
            errors.push('Country CHEQUE config requires stock but cheque format template is not set');
          }
          // V6 — Third-party payee drift
          if (instr.payee_id && !cpc.allow_third_party_payee) {
            errors.push(`Country method ${instr.payment_method} no longer allows third-party payee`);
          }
          // V7 — Provider direct-pay drift
          if (instr.provider_id && !cpc.allow_provider_direct_pay) {
            errors.push(`Country method ${instr.payment_method} no longer allows provider direct-pay`);
          }
        }

        // V3 — currency policy
        const { data: ctry } = await db
          .from('bn_country')
          .select('currency_code,allow_foreign_currency_products,allowed_alt_currencies')
          .eq('country_code', prod.country_code)
          .maybeSingle();
        if (ctry && instr.currency && instr.currency !== ctry.currency_code) {
          if (!ctry.allow_foreign_currency_products || !(ctry.allowed_alt_currencies ?? []).includes(instr.currency)) {
            warnings.push(`Instruction currency ${instr.currency} differs from country currency ${ctry.currency_code}`);
          }
        }

        // V10 — Cycle restriction (resolve product cycle via channel config)
        try {
          const { data: pcc } = await db
            .from('bn_product_channel_config')
            .select('payment_frequency')
            .eq('product_id', instr.product_id)
            .not('payment_frequency', 'is', null)
            .limit(1)
            .maybeSingle();
          const cycle = pcc?.payment_frequency;
          if (cycle) {
            const { data: cycleRows = [] } = await db
              .from('bn_country_payment_cycle_method')
              .select('payment_method,is_enabled')
              .eq('country_code', prod.country_code)
              .eq('payment_cycle', cycle);
            const rows = (cycleRows as any[]) ?? [];
            if (rows.length > 0) {
              const enabled = rows.find((r) => r.payment_method === instr.payment_method && r.is_enabled);
              if (!enabled) {
                errors.push(`Method ${instr.payment_method} is not enabled for cycle ${cycle} in ${prod.country_code}`);
              }
            }
          }
        } catch {
          warnings.push('Could not evaluate cycle×method restriction');
        }
      }
    }

  } catch (e) {
    warnings.push('Could not evaluate country/product payment hierarchy');
  }

  const ok = errors.length === 0;
  await db
    .from('bn_payment_instruction')
    .update({
      validation_status: ok ? 'PASSED' : 'FAILED',
      validation_errors: { errors, warnings },
      validated_at: new Date().toISOString(),
      validated_by: userCode,
    })
    .eq('id', instructionId);

  return { ok, errors, warnings };
}

export async function validatePayables(
  ids: string[],
  userCode = 'SYSTEM',
): Promise<{ id: string; result: PayableValidationResult }[]> {
  const out: { id: string; result: PayableValidationResult }[] = [];
  for (const id of ids) out.push({ id, result: await validatePayable(id, userCode) });
  return out;
}
