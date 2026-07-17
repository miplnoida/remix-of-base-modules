/**
 * BN-AWARD360-V2 — Alert derivation unit tests.
 *
 * AW360-WAVE-1-C1A — Claim / Pensioner alerts moved to
 * `computeAwardAlertsFromSummary` (driven by header.claimId and the narrow
 * `summary.pensionerAlert` section). `computeAwardAlerts` now only receives
 * domains loaded by the Overview aggregator.
 */
import { describe, it, expect } from 'vitest';
import {
  computeAwardAlerts,
  computeAwardAlertsFromSummary,
  dedupeAlerts,
} from '@/pages/bn/awards/award-360/Award360Alerts';
import type { Award360Header } from '@/pages/bn/awards/award-360/viewModels';
import type { Award360Summary } from '@/services/bn/awards/award360SummaryService';

const header = (overrides: Partial<Award360Header> = {}): Award360Header => ({
  awardId: 'a1',
  awardNumber: 'AWD-001',
  payeeName: 'Test Payee',
  ssnMasked: '***-**-999',
  benefitName: 'Old Age',
  benefitCode: 'OA',
  awardType: 'PENSION',
  status: 'ACTIVE',
  baseAmount: 500,
  currentRate: 500,
  currency: 'XCD',
  frequency: 'MONTHLY',
  startDate: '2024-01-01',
  endDate: null,
  productVersion: '1',
  claimId: 'c1',
  productVersionId: 'pv1',
  lastRefreshedAt: new Date().toISOString(),
  ...overrides,
});

const empty = {
  beneficiaries: [],
  lifeCertificates: [],
  medicalReviews: [],
  suspensions: [],
  overpayments: [],
  payments: [],
};

// Minimal summary skeleton with everything `restricted` — the neutral state.
const restrictedSummary = (): Award360Summary => ({
  awardId: 'a1',
  beneficiaries: { status: 'restricted' },
  schedule: { status: 'restricted' },
  payments: { status: 'restricted' },
  lifeCertificates: { status: 'restricted' },
  medical: { status: 'restricted' },
  suspensions: { status: 'restricted' },
  overpayments: { status: 'restricted' },
  communications: { status: 'restricted' },
  pensionerAlert: { status: 'restricted' },
  warnings: [],
});

describe('BN-AWARD360-V2 · computeAwardAlerts (rich Overview)', () => {
  it('raises no alerts on a healthy award', () => {
    const alerts = computeAwardAlerts({ header: header(), ...empty });
    expect(alerts.find((a) => a.key === 'lc-overdue')).toBeUndefined();
    expect(alerts.find((a) => a.key === 'currently-suspended')).toBeUndefined();
  });

  it('raises lc-overdue when a life cert is overdue', () => {
    const alerts = computeAwardAlerts({
      header: header(),
      ...empty,
      lifeCertificates: [{ id: '1', requiredPeriod: '2024', dueDate: '2024-01-01', submittedDate: null, verifiedDate: null, verificationMethod: null, status: 'PENDING', daysOverdue: 90, remarks: null }],
    });
    expect(alerts.find((a) => a.key === 'lc-overdue')).toBeDefined();
  });

  it('raises currently-suspended when award status is SUSPENDED', () => {
    const alerts = computeAwardAlerts({ header: header({ status: 'SUSPENDED' }), ...empty });
    expect(alerts.find((a) => a.key === 'currently-suspended')).toBeDefined();
  });

  it('raises suspension-open when a pending suspension exists', () => {
    const alerts = computeAwardAlerts({
      header: header(),
      ...empty,
      suspensions: [{ id: 's1', eventStatus: 'PROPOSED', displayStatus: 'PENDING_LEVEL_1', suspensionType: 'MEDICAL', suspendedFrom: null, suspendedTo: null, resumedAt: null, reasonCode: null, reasonText: null, proposedBy: null, currentApprovalLevel: 1, workbasketId: null, workflowInstanceId: null, enteredAt: null }],
    });
    expect(alerts.find((a) => a.key === 'suspension-open')).toBeDefined();
  });

  it('raises payment-failed on a failed payment', () => {
    const alerts = computeAwardAlerts({
      header: header(),
      ...empty,
      payments: [{ id: 'p1', reference: 'PAY-1', dueDate: null, amount: 100, currency: 'XCD', paymentMethod: 'BANK', accountMasked: null, status: 'FAILED', paidDate: null, cancelReason: null }],
    });
    expect(alerts.find((a) => a.key === 'payment-failed')).toBeDefined();
  });

  it('raises overpayment-outstanding when outstanding > 0', () => {
    const alerts = computeAwardAlerts({
      header: header(),
      ...empty,
      overpayments: [{ id: 'o1', reference: 'OP-1', detectedDate: null, periodFrom: null, periodTo: null, originalAmount: 500, recoveredAmount: 100, outstandingAmount: 400, recoveryMethod: null, recoveryStatus: null, reasonCode: null, remarks: null }],
    });
    expect(alerts.find((a) => a.key === 'overpayment-outstanding')).toBeDefined();
  });

  it('raises beneficiary-share when shares do not total 100%', () => {
    const alerts = computeAwardAlerts({
      header: header(),
      ...empty,
      beneficiaries: [
        { id: 'b1', fullName: 'A', ssnMasked: null, relationship: null, sharePercent: 40, shareAmount: null, startDate: null, endDate: null, status: 'ACTIVE', bankAccountMasked: null, bankCode: null, notes: null, enteredBy: null, enteredAt: null, modifiedBy: null, modifiedAt: null, hasPaymentDetails: false, isExpired: false, validationKeys: [] },
        { id: 'b2', fullName: 'B', ssnMasked: null, relationship: null, sharePercent: 30, shareAmount: null, startDate: null, endDate: null, status: 'ACTIVE', bankAccountMasked: null, bankCode: null, notes: null, enteredBy: null, enteredAt: null, modifiedBy: null, modifiedAt: null, hasPaymentDetails: false, isExpired: false, validationKeys: [] },
      ],
    });
    expect(alerts.find((a) => a.key === 'beneficiary-share')).toBeDefined();
  });
});

describe('AW360-WAVE-1-C1A · computeAwardAlertsFromSummary', () => {
  it('unloaded claim (header.claimId=undefined via null) — does not raise missing-claim when link exists', () => {
    // header.claimId === 'c1' → linked claim, no missing-claim alert
    const alerts = computeAwardAlertsFromSummary({ header: header(), summary: null });
    expect(alerts.find((a) => a.key === 'missing-claim')).toBeUndefined();
  });

  it('confirmed absence: header.claimId === null → raises missing-claim', () => {
    const alerts = computeAwardAlertsFromSummary({
      header: header({ claimId: null }),
      summary: null,
    });
    expect(alerts.find((a) => a.key === 'missing-claim')).toBeDefined();
  });

  it('missing product version raises missing-product-version', () => {
    const alerts = computeAwardAlertsFromSummary({
      header: header({ productVersion: null }),
      summary: null,
    });
    expect(alerts.find((a) => a.key === 'missing-product-version')).toBeDefined();
  });

  it('restricted pensionerAlert → NO deceased or no-payment-profile alerts', () => {
    const alerts = computeAwardAlertsFromSummary({
      header: header(),
      summary: restrictedSummary(),
    });
    expect(alerts.find((a) => a.key === 'deceased')).toBeUndefined();
    expect(alerts.find((a) => a.key === 'no-payment-profile')).toBeUndefined();
  });

  it('unavailable pensionerAlert → NO deceased or no-payment-profile alerts', () => {
    const s = restrictedSummary();
    s.pensionerAlert = { status: 'unavailable', reason: 'db error' };
    const alerts = computeAwardAlertsFromSummary({ header: header(), summary: s });
    expect(alerts.find((a) => a.key === 'deceased')).toBeUndefined();
    expect(alerts.find((a) => a.key === 'no-payment-profile')).toBeUndefined();
  });

  it('confirmed deceased via ok pensionerAlert', () => {
    const s = restrictedSummary();
    s.pensionerAlert = {
      status: 'ok',
      value: { isDeceased: true, dateOfDeath: '2025-01-01', hasVerifiedPaymentProfile: true },
    };
    const alerts = computeAwardAlertsFromSummary({ header: header(), summary: s });
    expect(alerts.find((a) => a.key === 'deceased')).toBeDefined();
    expect(alerts.find((a) => a.key === 'no-payment-profile')).toBeUndefined();
  });

  it('confirmed no verified payment profile via ok pensionerAlert', () => {
    const s = restrictedSummary();
    s.pensionerAlert = {
      status: 'ok',
      value: { isDeceased: false, dateOfDeath: null, hasVerifiedPaymentProfile: false },
    };
    const alerts = computeAwardAlertsFromSummary({ header: header(), summary: s });
    expect(alerts.find((a) => a.key === 'no-payment-profile')).toBeDefined();
  });

  it('null summary (no data yet) never fabricates absence alerts', () => {
    const alerts = computeAwardAlertsFromSummary({ header: header(), summary: null });
    expect(alerts.find((a) => a.key === 'deceased')).toBeUndefined();
    expect(alerts.find((a) => a.key === 'no-payment-profile')).toBeUndefined();
    expect(alerts.find((a) => a.key === 'lc-overdue')).toBeUndefined();
  });
});

describe('AW360-WAVE-1-C1A · dedupeAlerts', () => {
  it('collapses duplicate keys, later wins', () => {
    const base = computeAwardAlertsFromSummary({
      header: header({ status: 'SUSPENDED' }),
      summary: null,
    });
    const rich = computeAwardAlerts({ header: header({ status: 'SUSPENDED' }), ...empty });
    const merged = dedupeAlerts(base, rich);
    const suspended = merged.filter((a) => a.key === 'currently-suspended');
    expect(suspended.length).toBe(1);
  });
});
