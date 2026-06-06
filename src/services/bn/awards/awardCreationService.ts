/**
 * Award Creation Service
 * Creates a long-term award (bn_award) when a claim is APPROVED for a
 * product version that declares benefit_duration_type=LONG_TERM and
 * award_creation_rule=ON_APPROVAL.
 *
 * Also bootstraps:
 *  - bn_award_beneficiary rows for SURVIVOR benefits (from claim dependants)
 *  - first bn_payment_schedule entry
 *  - bn_life_certificate schedule when life_certificate_policy.required
 *  - bn_medical_review_schedule when medical_review_policy.required
 *
 * Safe to call repeatedly: existence is checked by bn_claim_id.
 */
import { supabase as db } from '@/integrations/supabase/client';

export interface AwardCreationResult {
  created: boolean;
  awardId?: string;
  awardNumber?: string;
  reason?: string;
}

function generateAwardNumber(benefitCode: string): string {
  const yr = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `AWD-${(benefitCode || 'BN').toUpperCase().slice(0, 6)}-${yr}-${rand}`;
}

export async function createAwardOnApproval(
  claimId: string,
  performedBy: string,
): Promise<AwardCreationResult> {
  // Idempotency: already created?
  const { data: existing } = await db
    .from('bn_award')
    .select('id, award_number')
    .eq('bn_claim_id', claimId)
    .maybeSingle();
  if (existing) {
    return { created: false, awardId: existing.id, awardNumber: existing.award_number ?? undefined, reason: 'EXISTS' };
  }

  // Fetch claim + product context
  const { data: claim, error: claimErr } = await db
    .from('bn_claim')
    .select('id, ssn, bn_product_id, product_version_id, benefit_code, status, decision_date')
    .eq('id', claimId)
    .single();
  if (claimErr || !claim) {
    return { created: false, reason: 'CLAIM_NOT_FOUND' };
  }
  if (claim.status !== 'APPROVED') {
    return { created: false, reason: 'CLAIM_NOT_APPROVED' };
  }

  // Resolve product version (servicing config)
  let pv: any = null;
  if (claim.product_version_id) {
    const { data } = await db
      .from('bn_product_version')
      .select('id, benefit_duration_type, award_creation_rule, payment_frequency, life_certificate_policy, medical_review_policy, survivor_beneficiary_policy, review_policy')
      .eq('id', claim.product_version_id)
      .maybeSingle();
    pv = data;
  }

  // Fallback: latest active version for the product
  if (!pv && claim.bn_product_id) {
    const { data } = await db
      .from('bn_product_version')
      .select('id, benefit_duration_type, award_creation_rule, payment_frequency, life_certificate_policy, medical_review_policy, survivor_beneficiary_policy, review_policy')
      .eq('product_id', claim.bn_product_id)
      .eq('status', 'ACTIVE')
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    pv = data;
  }

  const duration = pv?.benefit_duration_type ?? 'SHORT_TERM';
  const rule = pv?.award_creation_rule ?? 'NONE';
  if (duration !== 'LONG_TERM' || rule !== 'ON_APPROVAL') {
    return { created: false, reason: 'PRODUCT_NOT_LONG_TERM' };
  }

  // Fetch latest calculation for base amount
  const { data: calc } = await db
    .from('bn_claim_calculation')
    .select('benefit_amount, frequency, currency')
    .eq('claim_id', claimId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const frequency = calc?.frequency || pv?.payment_frequency || 'MONTHLY';
  const benefitCode = claim.benefit_code || 'BN';
  const awardNumber = generateAwardNumber(benefitCode);
  const startDate = (claim.decision_date as string | null) || new Date().toISOString().slice(0, 10);

  const { data: inserted, error: insErr } = await db
    .from('bn_award')
    .insert({
      award_number: awardNumber,
      bn_claim_id: claimId,
      bn_product_id: claim.bn_product_id,
      ssn: claim.ssn,
      benefit_code: benefitCode,
      award_type: benefitCode,
      status: 'ACTIVE',
      start_date: startDate,
      base_amount: calc?.benefit_amount ?? null,
      currency: calc?.currency || 'XCD',
      frequency,
      entered_by: performedBy,
      modified_by: performedBy,
      metadata: { source: 'claim_approval', product_version_id: pv?.id ?? null },
    })
    .select('id, award_number')
    .single();

  if (insErr || !inserted) {
    return { created: false, reason: `INSERT_FAILED:${insErr?.message ?? 'unknown'}` };
  }

  // Link award back to claim (best effort)
  await db.from('bn_claim').update({ award_id: inserted.id, modified_by: performedBy }).eq('id', claimId);

  // First payment schedule row (best effort)
  await db.from('bn_payment_schedule').insert({
    award_id: inserted.id,
    period_start: startDate,
    period_end: startDate,
    amount: calc?.benefit_amount ?? 0,
    currency: calc?.currency || 'XCD',
    status: 'PENDING',
    frequency,
    entered_by: performedBy,
  }).then(() => undefined, () => undefined);

  // Survivor beneficiaries (best effort)
  const survivorPolicy = (pv?.survivor_beneficiary_policy ?? {}) as any;
  const isSurvivor = /SURV/i.test(benefitCode) || survivorPolicy?.required === true;
  if (isSurvivor) {
    const { data: deps } = await db
      .from('bn_claim_person_snapshot')
      .select('first_name, last_name, relationship, date_of_birth, share_percent')
      .eq('claim_id', claimId);
    if (deps && deps.length > 0) {
      const rows = deps.map((d) => ({
        award_id: inserted.id,
        first_name: d.first_name,
        last_name: d.last_name,
        relationship: d.relationship || 'DEPENDANT',
        date_of_birth: d.date_of_birth || null,
        share_percent: d.share_percent ?? null,
        status: 'ACTIVE',
        entered_by: performedBy,
      }));
      await db.from('bn_award_beneficiary').insert(rows).then(() => undefined, () => undefined);
    }
  }

  // Life certificate schedule
  const lcPolicy = (pv?.life_certificate_policy ?? {}) as any;
  if (lcPolicy?.required) {
    const months = Number(lcPolicy.frequency_months ?? 12);
    const due = new Date(startDate);
    due.setMonth(due.getMonth() + months);
    await db.from('bn_life_certificate').insert({
      award_id: inserted.id,
      due_date: due.toISOString().slice(0, 10),
      status: 'PENDING',
      entered_by: performedBy,
    }).then(() => undefined, () => undefined);
  }

  // Medical review schedule
  const mrPolicy = (pv?.medical_review_policy ?? {}) as any;
  if (mrPolicy?.required) {
    const months = Number(mrPolicy.frequency_months ?? 12);
    const due = new Date(startDate);
    due.setMonth(due.getMonth() + months);
    await db.from('bn_medical_review_schedule').insert({
      award_id: inserted.id,
      due_date: due.toISOString().slice(0, 10),
      status: 'PENDING',
      entered_by: performedBy,
    }).then(() => undefined, () => undefined);
  }

  // Audit event on claim
  await db.from('bn_claim_event').insert({
    claim_id: claimId,
    event_type: 'AWARD_CREATED',
    description: `Award ${awardNumber} created on approval`,
    performed_by: performedBy,
    performed_at: new Date().toISOString(),
  }).then(() => undefined, () => undefined);

  return { created: true, awardId: inserted.id, awardNumber };
}
