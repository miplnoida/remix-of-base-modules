/**
 * BN-AWARD360-V2 — Canonical field mapping tests.
 *
 * The service should select only canonical columns and expose them via
 * typed view models. This is a lightweight static assertion — we read the
 * source of award360Service.ts and confirm the correct column names are
 * used and the removed columns are not.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = readFileSync(
  join(__dirname, '..', '..', '..', 'services', 'bn', 'awards', 'award360Service.ts'),
  'utf8',
);

describe('BN-AWARD360-V2 · canonical field mapping', () => {
  it('bn_payment_schedule uses canonical columns (schedule_period, due_date, gross/deductions/net, payment_ref, paid_at, bn_payment_instruction_id)', () => {
    const scheduleSel = SRC.match(/bn_payment_schedule[\s\S]*?\.select\(\s*'([^']+)'/);
    expect(scheduleSel).toBeTruthy();
    const cols = scheduleSel![1];
    for (const c of ['schedule_period', 'due_date', 'gross_amount', 'deductions', 'net_amount', 'payment_ref', 'paid_at', 'bn_payment_instruction_id']) {
      expect(cols).toContain(c);
    }
    // legacy fields must not be selected
    expect(cols).not.toContain('next_run_date');
    expect(cols).not.toContain('last_run_date');
  });

  it('bn_payment_instruction uses canonical columns (payment_reference, paid_date, cancel_reason)', () => {
    const paySel = SRC.match(/bn_payment_instruction[\s\S]*?\.select\(\s*'([^']+)'/);
    expect(paySel).toBeTruthy();
    const cols = paySel![1];
    for (const c of ['payment_reference', 'paid_date', 'cancel_reason', 'bank_code', 'account_number']) {
      expect(cols).toContain(c);
    }
    expect(cols).not.toContain('instruction_number');
    expect(cols).not.toContain('scheduled_date');
  });

  it('bn_overpayment uses canonical columns (detected_date, period_from/to, original/recovered/outstanding_amount, recovery_status)', () => {
    const opSel = SRC.match(/bn_overpayment[\s\S]*?\.select\(\s*'([^']+)'/);
    expect(opSel).toBeTruthy();
    const cols = opSel![1];
    for (const c of ['detected_date', 'period_from', 'period_to', 'original_amount', 'recovered_amount', 'outstanding_amount', 'recovery_method', 'recovery_status', 'reason_code']) {
      expect(cols).toContain(c);
    }
    expect(cols).not.toContain('overpayment_reference');
    expect(cols).not.toContain('total_amount');
  });

  it('claim query uses product_version_id (canonical) and not bn_product_version_id', () => {
    expect(SRC).toContain('product_version_id');
    expect(SRC).not.toContain('bn_product_version_id');
  });

  it('claim workbench route is /bn/claims/:id (no /workbench suffix)', () => {
    expect(SRC).toContain('workbenchRoute: `/bn/claims/${c.id}`');
  });

  it('bn_communication_log uses canonical fields (event_code, channel, recipient_address, provider_message_id, letter_id)', () => {
    expect(SRC).toContain('event_code');
    expect(SRC).toContain('recipient_address');
    expect(SRC).toContain('provider_message_id');
    expect(SRC).toContain('letter_id');
    // legacy field names must not appear
    expect(SRC).not.toContain('delivery_method');
    expect(SRC).not.toContain('template_code');
  });

  it('exports the 14 loaders required by the spec', () => {
    const required = [
      'getAward360Header',
      'getAwardPensioner',
      'getAwardClaim',
      'getAwardProduct',
      'listAwardBeneficiaries',
      'listAwardSchedules',
      'listAwardPayments',
      'listAwardLifeCertificates',
      'listAwardMedicalReviews',
      'listAwardSuspensions',
      'listAwardOverpayments',
      'listAwardCommunications',
      'listAwardAudit',
      'getAward360OverviewCounts',
    ];
    for (const fn of required) {
      expect(SRC).toContain(`export async function ${fn}`);
    }
  });
});
