/**
 * Post-Approval Orchestrator
 *
 * When a claim decision is APPROVED, this service creates the downstream
 * entitlement and/or payment instruction records and transitions the claim
 * to the correct post-decision status (AWARD_SETUP / IN_PAYMENT / PAYMENT_QUEUE).
 *
 * Branching:
 *   - PERIODIC / LONG_TERM / PENSION / SURVIVOR / INVALIDITY → create
 *     bn_entitlement (+ optional first bn_payment_instruction) and move
 *     claim to AWARD_SETUP.
 *   - LUMP_SUM / GRANT / SHORT_TERM (one-off) → create bn_payment_instruction
 *     directly and move claim to PAYMENT_QUEUE.
 *
 * Every step is audited (bn_claim_event + system_audit_trail).
 */
import { supabase } from '@/integrations/supabase/client';
import { auditClaimAction, auditAwardAction } from '@/services/bn/audit/bnAuditService';

const db = supabase as any;

export type OrchestrationResult = {
  success: boolean;
  toStatus: string;
  entitlementId?: string;
  paymentInstructionId?: string;
  message: string;
};

const PERIODIC_CATEGORIES = new Set([
  'LONG_TERM', 'PENSION', 'SURVIVOR', 'INVALIDITY', 'NON_CONTRIBUTORY',
]);

function isPeriodic(category: string | null | undefined, paymentType: string | null | undefined): boolean {
  if (paymentType === 'LUMP_SUM') return false;
  if (paymentType === 'PERIODIC') return true;
  if (paymentType === 'BOTH') return true;
  return PERIODIC_CATEGORIES.has(String(category || '').toUpperCase());
}

export async function orchestrateApproval(
  claimId: string,
  performedBy: string,
): Promise<OrchestrationResult> {
  // 1. Load claim + product
  const { data: claim, error: claimErr } = await db
    .from('bn_claim')
    .select('id, claim_number, ssn, product_id, product_version_id, status, bank_account, bank_routing_number')
    .eq('id', claimId)
    .single();
  if (claimErr || !claim) throw new Error('Claim not found');

  const { data: product, error: prodErr } = await db
    .from('bn_product')
    .select('id, benefit_code, benefit_name, category, payment_type')
    .eq('id', claim.product_id)
    .single();
  if (prodErr || !product) throw new Error('Product not found');

  // 2. Latest calculation
  const { data: calcs } = await db
    .from('bn_claim_calculation')
    .select('*')
    .eq('claim_id', claimId)
    .order('calc_date', { ascending: false })
    .limit(1);
  const calc = calcs?.[0];

  // 3. Guard: existing entitlement / instruction already created? idempotent.
  const { data: existingEnt } = await db
    .from('bn_entitlement')
    .select('id')
    .eq('claim_id', claimId)
    .limit(1);
  const { data: existingPi } = await db
    .from('bn_payment_instruction')
    .select('id')
    .eq('claim_id', claimId)
    .limit(1);

  if (existingEnt?.[0]?.id || existingPi?.[0]?.id) {
    return {
      success: true,
      toStatus: claim.status,
      entitlementId: existingEnt?.[0]?.id,
      paymentInstructionId: existingPi?.[0]?.id,
      message: 'Entitlement / payable already exists for this claim.',
    };
  }

  const periodic = isPeriodic(product.category, product.payment_type);
  const weekly = Number(calc?.weekly_rate || 0);
  const monthly = Number(calc?.monthly_rate || (weekly * 52 / 12) || 0);
  const lump = Number(calc?.lump_sum || 0);
  const today = new Date().toISOString().slice(0, 10);

  let entitlementId: string | undefined;
  let paymentInstructionId: string | undefined;
  let toStatus = 'AWARD_SETUP';

  if (periodic) {
    // ─── Periodic / long-term ────────────────────────────────────
    const total = lump > 0 ? lump : (weekly > 0 ? weekly * 52 : monthly * 12);
    const { data: ent, error: entErr } = await db
      .from('bn_entitlement')
      .insert({
        claim_id: claimId,
        ssn: claim.ssn,
        claim_number: claim.claim_number,
        product_id: claim.product_id,
        product_version_id: claim.product_version_id,
        calculation_id: calc?.id ?? null,
        entitlement_type: 'PERIODIC',
        payment_frequency: monthly > 0 ? 'MONTHLY' : 'WEEKLY',
        weekly_rate: weekly,
        monthly_rate: monthly,
        lump_sum_amount: lump || null,
        total_entitlement: total,
        remaining_amount: total,
        effective_from: today,
        status: 'ACTIVE',
        activated_at: new Date().toISOString(),
        activated_by: performedBy,
        entered_by: performedBy,
      })
      .select('id')
      .single();
    if (entErr) throw entErr;
    entitlementId = ent.id;

    await auditAwardAction({
      entityType: 'bn_entitlement',
      entityId: entitlementId,
      action: 'AWARD_CREATED',
      afterValue: { claim_id: claimId, weekly_rate: weekly, total },
      performedBy,
      critical: true,
    });
    toStatus = 'AWARD_SETUP';
  } else {
    // ─── Lump-sum / short-term one-off payable ───────────────────
    const amt = lump > 0 ? lump : (weekly > 0 ? weekly : monthly);
    if (amt <= 0) {
      throw new Error('No calculated amount available. Run calculation before approval.');
    }
    const { data: pi, error: piErr } = await db
      .from('bn_payment_instruction')
      .insert({
        claim_id: claimId,
        ssn: claim.ssn,
        amount: amt,
        currency: 'XCD',
        payment_method: claim.bank_account ? 'EFT' : 'CHEQUE',
        bank_code: claim.bank_routing_number || null,
        account_number: claim.bank_account || null,
        due_date: today,
        frequency: 'one_off',
        status: 'queued',
        description: `${product.benefit_name} — ${claim.claim_number}`,
      })
      .select('id')
      .single();
    if (piErr) throw piErr;
    paymentInstructionId = pi.id;

    await auditClaimAction({
      entityType: 'bn_payment_instruction',
      entityId: paymentInstructionId,
      action: 'PAYMENT_INSTRUCTION_CREATED',
      afterValue: { claim_id: claimId, amount: amt },
      performedBy,
      critical: true,
    });
    toStatus = 'PAYMENT_QUEUE';
  }

  // ─── Transition claim status ───────────────────────────────────
  const fromStatus = claim.status;
  await db
    .from('bn_claim')
    .update({ status: toStatus, modified_by: performedBy, modified_at: new Date().toISOString() })
    .eq('id', claimId);

  await db.from('bn_claim_event').insert({
    claim_id: claimId,
    event_type: periodic ? 'AWARD_CREATED' : 'PAYABLE_QUEUED',
    from_status: fromStatus,
    to_status: toStatus,
    performed_by: performedBy,
    metadata: { entitlement_id: entitlementId, payment_instruction_id: paymentInstructionId },
  });

  await auditClaimAction({
    entityType: 'bn_claim',
    entityId: claimId,
    action: periodic ? 'AWARD_CREATED' : 'PAYABLE_QUEUED',
    beforeValue: { status: fromStatus },
    afterValue: { status: toStatus, entitlement_id: entitlementId, payment_instruction_id: paymentInstructionId },
    performedBy,
    critical: true,
  });

  return {
    success: true,
    toStatus,
    entitlementId,
    paymentInstructionId,
    message: periodic
      ? `Entitlement created. Claim moved to ${toStatus}.`
      : `Payable queued. Claim moved to ${toStatus}.`,
  };
}

/**
 * Submit a claim for decision. Moves CALCULATION → DECISION.
 * Independent of bn_claim_transition_rule so it works even when the
 * transition matrix has not been seeded for this product.
 */
export async function submitClaimForDecision(claimId: string, performedBy: string): Promise<void> {
  const { data: claim } = await db
    .from('bn_claim')
    .select('id, status')
    .eq('id', claimId)
    .single();
  if (!claim) throw new Error('Claim not found');

  const from = claim.status;
  await db
    .from('bn_claim')
    .update({ status: 'DECISION', modified_by: performedBy, modified_at: new Date().toISOString() })
    .eq('id', claimId);

  await db.from('bn_claim_event').insert({
    claim_id: claimId,
    event_type: 'SUBMITTED_FOR_DECISION',
    from_status: from,
    to_status: 'DECISION',
    performed_by: performedBy,
  });

  await auditClaimAction({
    entityType: 'bn_claim',
    entityId: claimId,
    action: 'SUBMITTED_FOR_DECISION',
    beforeValue: { status: from },
    afterValue: { status: 'DECISION' },
    performedBy,
    critical: true,
  });
}

/**
 * Approve a claim. Inserts a bn_claim_decision row (so the decision history
 * is preserved) and runs the post-approval orchestrator.
 */
export async function approveClaim(
  claimId: string,
  performedBy: string,
  narrative?: string,
  reasonCodeId?: string | null,
): Promise<OrchestrationResult> {
  const { data: claim } = await db
    .from('bn_claim')
    .select('id, status')
    .eq('id', claimId)
    .single();
  if (!claim) throw new Error('Claim not found');

  await db.from('bn_claim_decision').insert({
    claim_id: claimId,
    action_code: 'APPROVE',
    from_status: claim.status,
    to_status: 'APPROVED',
    reason_code_id: reasonCodeId || null,
    narrative: narrative || null,
    performed_by: performedBy,
  });

  await db
    .from('bn_claim')
    .update({
      status: 'APPROVED',
      decision_date: new Date().toISOString(),
      modified_by: performedBy,
      modified_at: new Date().toISOString(),
    })
    .eq('id', claimId);

  await auditClaimAction({
    entityType: 'bn_claim',
    entityId: claimId,
    action: 'CLAIM_APPROVED',
    beforeValue: { status: claim.status },
    afterValue: { status: 'APPROVED' },
    notes: narrative,
    performedBy,
    critical: true,
  });

  return orchestrateApproval(claimId, performedBy);
}

/** Manually generate the payable / entitlement for an already-approved
 *  claim where the orchestrator didn't fire. */
export async function generatePayableForApprovedClaim(
  claimId: string,
  performedBy: string,
): Promise<OrchestrationResult> {
  return orchestrateApproval(claimId, performedBy);
}
