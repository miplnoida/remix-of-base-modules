/**
 * Payable Validation Service
 * Runs the 8 readiness checks for a payment instruction before it can be batched/issued.
 */
import { supabase } from '@/integrations/supabase/client';
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

  // 6/7) Method-specific snapshots
  if (instr.payment_method === 'DIRECT_DEPOSIT' || instr.payment_method === 'EFT') {
    const snap = instr.bank_account_snapshot || {};
    if (!snap.account_number || !snap.routing_number) {
      errors.push('Bank account/routing details missing for EFT');
    }
  } else if (instr.payment_method === 'CHEQUE') {
    const addr = instr.cheque_address_snapshot || {};
    if (!addr.line1 && !addr.address) {
      warnings.push('Cheque mailing address not captured');
    }
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
