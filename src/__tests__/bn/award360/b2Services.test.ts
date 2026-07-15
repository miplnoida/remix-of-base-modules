/**
 * BN-AWARD360-B2 — Service-level tests for paged queries and validators.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

function makeThenable(payload: { data: any; error: any; count?: number }) {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    gt: () => chain,
    ilike: () => chain,
    contains: () => chain,
    or: () => chain,
    order: () => chain,
    range: () => chain,
    maybeSingle: () => Promise.resolve({ data: payload.data, error: payload.error }),
    then: (resolve: any) => resolve({ data: payload.data, error: payload.error, count: payload.count }),
  };
  return chain;
}

const fromMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import {
  listAwardBeneficiariesPaged,
  listAwardOverpaymentsPaged,
  listAwardCommunicationsPaged,
  validateAwardBeneficiaries,
} from '@/services/bn/awards/award360Service';
import type { AwardBeneficiaryItem } from '@/pages/bn/awards/award-360/viewModels';

beforeEach(() => {
  fromMock.mockReset();
});

const b = (over: Partial<AwardBeneficiaryItem> = {}): AwardBeneficiaryItem => ({
  id: over.id ?? crypto.randomUUID(),
  fullName: 'A B', ssnMasked: null, relationship: 'SPOUSE',
  sharePercent: 100, shareAmount: null, startDate: '2024-01-01', endDate: null,
  status: 'ACTIVE', bankAccountMasked: '••••1234', bankCode: '001',
  notes: null, enteredBy: null, enteredAt: null, modifiedBy: null, modifiedAt: null,
  hasPaymentDetails: true, isExpired: false, validationKeys: [],
  ...over,
});

describe('BN-AWARD360-B2 · validateAwardBeneficiaries', () => {
  it('accepts exactly 100% active', () => {
    const v = validateAwardBeneficiaries([b({ sharePercent: 60 }), b({ sharePercent: 40 })], null);
    expect(v.totalSharePercent).toBe(100);
    expect(v.warnings.find((w) => w.key === 'underallocated' || w.key === 'overallocated')).toBeUndefined();
  });
  it('flags underallocation', () => {
    const v = validateAwardBeneficiaries([b({ sharePercent: 60 })], null);
    expect(v.unallocatedPercent).toBeCloseTo(40, 4);
    expect(v.warnings.find((w) => w.key === 'underallocated')).toBeDefined();
  });
  it('flags overallocation', () => {
    const v = validateAwardBeneficiaries([b({ sharePercent: 80 }), b({ sharePercent: 40 })], null);
    expect(v.overallocatedPercent).toBeCloseTo(20, 4);
    expect(v.warnings.find((w) => w.key === 'overallocated')?.severity).toBe('ERROR');
  });
  it('flags negative share', () => {
    const v = validateAwardBeneficiaries([b({ sharePercent: -5 })], null);
    expect(v.warnings.find((w) => w.key === 'negative-percent')).toBeDefined();
  });
  it('flags missing payment info on active', () => {
    const v = validateAwardBeneficiaries([b({ sharePercent: 100, hasPaymentDetails: false, bankAccountMasked: null, bankCode: null })], null);
    expect(v.warnings.find((w) => w.key === 'missing-payment')).toBeDefined();
  });
  it('flags end-before-start', () => {
    const v = validateAwardBeneficiaries([b({ startDate: '2024-06-01', endDate: '2024-01-01' })], null);
    expect(v.warnings.find((w) => w.key === 'end-before-start')).toBeDefined();
  });
  it('flags overlap on same relationship+name', () => {
    const v = validateAwardBeneficiaries(
      [
        b({ fullName: 'X', startDate: '2024-01-01', endDate: '2024-12-31', sharePercent: 50 }),
        b({ fullName: 'X', startDate: '2024-06-01', endDate: null, sharePercent: 50 }),
      ],
      null,
    );
    expect(v.warnings.find((w) => w.key === 'overlap')).toBeDefined();
  });
  it('emits INFO when no active beneficiaries', () => {
    const v = validateAwardBeneficiaries([b({ status: 'ENDED' })], null);
    expect(v.warnings.find((w) => w.key === 'no-active')).toBeDefined();
  });
});

describe('BN-AWARD360-B2 · listAwardBeneficiariesPaged', () => {
  it('surfaces Supabase errors', async () => {
    fromMock.mockReturnValue(makeThenable({ data: null, error: { message: 'boom' } }));
    await expect(
      listAwardBeneficiariesPaged({ awardId: 'a', page: 1, pageSize: 10 }),
    ).rejects.toBeTruthy();
  });
  it('computes summary and masks SSN + account', async () => {
    const rows = [
      { id: '1', full_name: 'A', beneficiary_ssn: '123456789', relationship: 'SPOUSE', share_percent: 100, share_amount: 500, start_date: '2024-01-01', end_date: null, status: 'ACTIVE', bank_acct: '9876543210', bank_code: '001', notes: null, entered_by: null, entered_at: null, modified_by: null, modified_at: null },
    ];
    fromMock.mockReturnValue(makeThenable({ data: rows, error: null }));
    const res = await listAwardBeneficiariesPaged({ awardId: 'a', page: 1, pageSize: 10 });
    expect(res.summary.activeCount).toBe(1);
    expect(res.summary.totalSharePercent).toBe(100);
    expect(res.rows[0].ssnMasked).toContain('***');
    expect(res.rows[0].bankAccountMasked).toContain('••••');
  });
});

describe('BN-AWARD360-B2 · listAwardOverpaymentsPaged', () => {
  it('surfaces Supabase errors', async () => {
    fromMock.mockReturnValue(makeThenable({ data: null, error: { message: 'x' } }));
    await expect(
      listAwardOverpaymentsPaged({ awardId: 'a', page: 1, pageSize: 10 }),
    ).rejects.toBeTruthy();
  });
  it('computes original/recovered/outstanding and open cases', async () => {
    const rows = [
      { id: '1', detected_date: '2024-01-01', period_from: '2024-01-01', period_to: '2024-06-30', original_amount: 1000, recovered_amount: 400, outstanding_amount: 600, recovery_method: 'DEDUCTION', recovery_status: 'IN_RECOVERY', reason_code: 'X', remarks: null },
      { id: '2', detected_date: '2023-01-01', period_from: null, period_to: null, original_amount: 500, recovered_amount: 500, outstanding_amount: 0, recovery_method: 'CASH', recovery_status: 'RECOVERED', reason_code: 'Y', remarks: null },
    ];
    fromMock.mockReturnValue(makeThenable({ data: rows, error: null }));
    const res = await listAwardOverpaymentsPaged({ awardId: 'a', page: 1, pageSize: 10 });
    expect(res.summary.originalTotal).toBe(1500);
    expect(res.summary.recoveredTotal).toBe(900);
    expect(res.summary.outstandingTotal).toBe(600);
    expect(res.summary.openCases).toBe(1);
    expect(res.summary.fullyRecovered).toBe(1);
    expect(res.summary.activeRecovery).toBe(1);
    expect(res.rows[0].reference.startsWith('OP-')).toBe(true);
  });
  it('outstandingOnly filter drops fully-recovered rows', async () => {
    const rows = [
      { id: '1', detected_date: '2024-01-01', period_from: null, period_to: null, original_amount: 100, recovered_amount: 0, outstanding_amount: 100, recovery_method: 'DEDUCTION', recovery_status: 'IN_RECOVERY', reason_code: null, remarks: null },
      { id: '2', detected_date: '2024-01-01', period_from: null, period_to: null, original_amount: 100, recovered_amount: 100, outstanding_amount: 0, recovery_method: 'CASH', recovery_status: 'RECOVERED', reason_code: null, remarks: null },
    ];
    fromMock.mockReturnValue(makeThenable({ data: rows, error: null }));
    const res = await listAwardOverpaymentsPaged({ awardId: 'a', page: 1, pageSize: 10, outstandingOnly: true });
    expect(res.rows.length).toBe(1);
    expect(res.rows[0].id).toBe('1');
  });
});

describe('BN-AWARD360-B2 · listAwardCommunicationsPaged', () => {
  it('classifies statuses and masks recipient addresses', async () => {
    // sequence: bn_award lookup then bn_communication_log queries
    const commRows = [
      { id: 'c1', event_code: 'AWARD_APPROVED', channel: 'EMAIL', recipient_type: 'PENSIONER', recipient_address: 'jane.doe@example.com', template_id: null, subject: 'Approved', status: 'DELIVERED', provider_message_id: 'p1', letter_id: null, error_message: null, retry_count: 0, last_retry_at: null, context: { award_id: 'a' }, created_at: '2026-01-02' },
      { id: 'c2', event_code: 'PAYMENT_FAILED', channel: 'SMS', recipient_type: 'PENSIONER', recipient_address: '18885551212', template_id: null, subject: null, status: 'FAILED', provider_message_id: null, letter_id: null, error_message: 'no route', retry_count: 3, last_retry_at: null, context: { award_id: 'a' }, created_at: '2026-01-01' },
    ];
    let call = 0;
    fromMock.mockImplementation((t: string) => {
      if (t === 'bn_award') return makeThenable({ data: { bn_claim_id: null }, error: null });
      if (t === 'bn_communication_log') {
        call++;
        return makeThenable({ data: commRows, error: null });
      }
      return makeThenable({ data: [], error: null });
    });
    const res = await listAwardCommunicationsPaged({ awardId: 'a', page: 1, pageSize: 10 });
    expect(res.summary.delivered).toBe(1);
    expect(res.summary.failed).toBe(1);
    expect(res.summary.needsAttention).toBeGreaterThanOrEqual(1);
    expect(res.rows.find((r) => r.id === 'c1')?.recipientAddressMasked).toContain('***@');
    expect(call).toBeGreaterThan(0);
  });

  it('failedOnly filter narrows rows', async () => {
    const rows = [
      { id: 'c1', event_code: 'X', channel: 'EMAIL', recipient_type: 'PENSIONER', recipient_address: 'a@b.com', template_id: null, subject: null, status: 'DELIVERED', provider_message_id: null, letter_id: null, error_message: null, retry_count: 0, last_retry_at: null, context: { award_id: 'a' }, created_at: '2026-01-02' },
      { id: 'c2', event_code: 'X', channel: 'EMAIL', recipient_type: 'PENSIONER', recipient_address: 'a@b.com', template_id: null, subject: null, status: 'FAILED', provider_message_id: null, letter_id: null, error_message: 'x', retry_count: 1, last_retry_at: null, context: { award_id: 'a' }, created_at: '2026-01-01' },
    ];
    fromMock.mockImplementation((t: string) => {
      if (t === 'bn_award') return makeThenable({ data: { bn_claim_id: null }, error: null });
      return makeThenable({ data: rows, error: null });
    });
    const res = await listAwardCommunicationsPaged({ awardId: 'a', page: 1, pageSize: 10, failedOnly: true });
    expect(res.rows.length).toBe(1);
    expect(res.rows[0].id).toBe('c2');
  });
});
