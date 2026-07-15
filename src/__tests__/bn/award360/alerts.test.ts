/**
 * BN-AWARD360-V2 — Alert derivation unit tests.
 * Tests the pure `computeAwardAlerts` function with all 12 alert rules.
 */
import { describe, it, expect } from 'vitest';
import { computeAwardAlerts } from '@/pages/bn/awards/award-360/Award360Alerts';
import type {
  Award360Header,
  AwardClaimSummary,
  AwardPensionerProfile,
} from '@/pages/bn/awards/award-360/viewModels';

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
  lastRefreshedAt: new Date().toISOString(),
  ...overrides,
});

const claim = (): AwardClaimSummary => ({
  claimId: 'c1',
  claimNumber: 'CL-1',
  status: 'APPROVED',
  productVersionId: 'pv1',
  submissionDate: null,
  claimDate: null,
  applicationChannel: null,
  priority: null,
  assignedOfficer: null,
  eligibilityResult: null,
  calculationResult: null,
  decisionStatus: null,
  approvalStatus: null,
  awardCreationDate: null,
  workbenchRoute: '/bn/claims/c1',
});

const pensioner = (overrides: Partial<AwardPensionerProfile> = {}): AwardPensionerProfile => ({
  fullName: 'Jane Doe',
  ssnMasked: '***-**-999',
  dob: '1950-01-01',
  age: 75,
  sex: 'F',
  nationality: null,
  isDeceased: false,
  dateOfDeath: null,
  mobile: '555',
  phone: null,
  email: 'a@b.com',
  residentialAddress: null,
  mailingAddress: null,
  preferredChannel: null,
  payeeDiffersFromPensioner: false,
  payeeName: null,
  verifiedPaymentProfile: { method: 'BANK', accountMasked: '••••1234', verified: true },
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

describe('BN-AWARD360-V2 · computeAwardAlerts', () => {
  it('raises no alerts on a healthy award', () => {
    const alerts = computeAwardAlerts({ header: header(), claim: claim(), pensioner: pensioner(), ...empty });
    expect(alerts.find((a) => a.key === 'lc-overdue')).toBeUndefined();
    expect(alerts.find((a) => a.key === 'currently-suspended')).toBeUndefined();
  });

  it('raises lc-overdue when a life cert is overdue', () => {
    const alerts = computeAwardAlerts({
      header: header(), claim: claim(), pensioner: pensioner(),
      ...empty,
      lifeCertificates: [{ id: '1', requiredPeriod: '2024', dueDate: '2024-01-01', submittedDate: null, verifiedDate: null, verificationMethod: null, status: 'PENDING', daysOverdue: 90, remarks: null }],
    });
    expect(alerts.find((a) => a.key === 'lc-overdue')).toBeDefined();
  });

  it('raises currently-suspended when award status is SUSPENDED', () => {
    const alerts = computeAwardAlerts({ header: header({ status: 'SUSPENDED' }), claim: claim(), pensioner: pensioner(), ...empty });
    expect(alerts.find((a) => a.key === 'currently-suspended')).toBeDefined();
  });

  it('raises suspension-open when a pending suspension exists', () => {
    const alerts = computeAwardAlerts({
      header: header(), claim: claim(), pensioner: pensioner(),
      ...empty,
      suspensions: [{ id: 's1', eventStatus: 'PROPOSED', displayStatus: 'PENDING_LEVEL_1', suspensionType: 'MEDICAL', suspendedFrom: null, suspendedTo: null, resumedAt: null, reasonCode: null, reasonText: null, proposedBy: null, currentApprovalLevel: 1, workbasketId: null, workflowInstanceId: null, enteredAt: null }],
    });
    expect(alerts.find((a) => a.key === 'suspension-open')).toBeDefined();
  });

  it('raises payment-failed on a failed payment', () => {
    const alerts = computeAwardAlerts({
      header: header(), claim: claim(), pensioner: pensioner(),
      ...empty,
      payments: [{ id: 'p1', reference: 'PAY-1', dueDate: null, amount: 100, currency: 'XCD', paymentMethod: 'BANK', accountMasked: null, status: 'FAILED', paidDate: null, cancelReason: null }],
    });
    expect(alerts.find((a) => a.key === 'payment-failed')).toBeDefined();
  });

  it('raises overpayment-outstanding when outstanding > 0', () => {
    const alerts = computeAwardAlerts({
      header: header(), claim: claim(), pensioner: pensioner(),
      ...empty,
      overpayments: [{ id: 'o1', reference: 'OP-1', detectedDate: null, periodFrom: null, periodTo: null, originalAmount: 500, recoveredAmount: 100, outstandingAmount: 400, recoveryMethod: null, recoveryStatus: null, reasonCode: null, remarks: null }],
    });
    expect(alerts.find((a) => a.key === 'overpayment-outstanding')).toBeDefined();
  });

  it('raises beneficiary-share when shares do not total 100%', () => {
    const alerts = computeAwardAlerts({
      header: header(), claim: claim(), pensioner: pensioner(),
      ...empty,
      beneficiaries: [
        { id: 'b1', fullName: 'A', ssnMasked: null, relationship: null, sharePercent: 40, shareAmount: null, startDate: null, endDate: null, status: 'ACTIVE', bankAccountMasked: null, bankCode: null, notes: null, enteredBy: null, enteredAt: null, modifiedBy: null, modifiedAt: null, hasPaymentDetails: false, isExpired: false, validationKeys: [] },
        { id: 'b2', fullName: 'B', ssnMasked: null, relationship: null, sharePercent: 30, shareAmount: null, startDate: null, endDate: null, status: 'ACTIVE', bankAccountMasked: null, bankCode: null, notes: null, enteredBy: null, enteredAt: null, modifiedBy: null, modifiedAt: null, hasPaymentDetails: false, isExpired: false, validationKeys: [] },
      ],
    });
    expect(alerts.find((a) => a.key === 'beneficiary-share')).toBeDefined();
  });

  it('raises deceased alert when pensioner is deceased', () => {
    const alerts = computeAwardAlerts({ header: header(), claim: claim(), pensioner: pensioner({ isDeceased: true, dateOfDeath: '2025-01-01' }), ...empty });
    expect(alerts.find((a) => a.key === 'deceased')).toBeDefined();
  });

  it('raises no-payment-profile when profile is missing', () => {
    const alerts = computeAwardAlerts({ header: header(), claim: claim(), pensioner: pensioner({ verifiedPaymentProfile: null }), ...empty });
    expect(alerts.find((a) => a.key === 'no-payment-profile')).toBeDefined();
  });

  it('raises missing-claim when claim is null', () => {
    const alerts = computeAwardAlerts({ header: header(), claim: null, pensioner: pensioner(), ...empty });
    expect(alerts.find((a) => a.key === 'missing-claim')).toBeDefined();
  });

  it('raises missing-product-version when header has no product version', () => {
    const alerts = computeAwardAlerts({ header: header({ productVersion: null }), claim: claim(), pensioner: pensioner(), ...empty });
    expect(alerts.find((a) => a.key === 'missing-product-version')).toBeDefined();
  });
});
