/**
 * BN-AWARD360-B1 — Life Certificate compliance resolver tests.
 */
import { describe, it, expect } from 'vitest';
import { resolveLifeCertificateCompliance } from '@/services/bn/awards/award360Service';
import type { AwardLifeCertificateItem } from '@/pages/bn/awards/award-360/viewModels';

const mk = (over: Partial<AwardLifeCertificateItem>): AwardLifeCertificateItem => ({
  id: over.id ?? 'x',
  requiredPeriod: over.requiredPeriod ?? '2026',
  dueDate: over.dueDate ?? null,
  submittedDate: over.submittedDate ?? null,
  verifiedDate: over.verifiedDate ?? null,
  verificationMethod: over.verificationMethod ?? null,
  status: over.status ?? null,
  daysOverdue: over.daysOverdue ?? 0,
  remarks: over.remarks ?? null,
});

describe('BN-AWARD360-B1 · life-cert compliance', () => {
  it('returns NOT_REQUIRED when no cycles exist', () => {
    const r = resolveLifeCertificateCompliance([], null, []);
    expect(r.state).toBe('NOT_REQUIRED');
    expect(r.paymentImpact).toBe('NONE');
  });

  it('returns COMPLIANT for verified latest cycle', () => {
    const r = resolveLifeCertificateCompliance(
      [mk({ status: 'VERIFIED', dueDate: '2026-01-15', verifiedDate: '2026-01-10' })],
      null,
      [],
    );
    expect(r.state).toBe('COMPLIANT');
    expect(r.paymentImpact).toBe('NONE');
  });

  it('returns OVERDUE and only POTENTIAL_HOLD (never PAYMENT_HELD without proof)', () => {
    const r = resolveLifeCertificateCompliance(
      [mk({ status: 'PENDING', dueDate: '2020-01-01', daysOverdue: 200 })],
      null,
      [],
    );
    expect(r.state).toBe('OVERDUE');
    expect(r.paymentImpact).toBe('POTENTIAL_HOLD');
    expect(r.paymentImpact).not.toBe('PAYMENT_HELD');
  });

  it('returns RECEIVED_PENDING_VERIFICATION when submitted but not verified', () => {
    const r = resolveLifeCertificateCompliance(
      [mk({ status: 'RECEIVED', dueDate: '2999-01-01', submittedDate: '2026-01-05' })],
      null,
      [],
    );
    expect(r.state).toBe('RECEIVED_PENDING_VERIFICATION');
    expect(r.paymentImpact).toBe('POTENTIAL_HOLD');
  });

  it('returns EXEMPT when latest cycle is exempt', () => {
    const r = resolveLifeCertificateCompliance([mk({ status: 'EXEMPT', dueDate: '2027-01-01' })], null, []);
    expect(r.state).toBe('EXEMPT');
    expect(r.paymentImpact).toBe('NONE');
  });

  it('returns DUE_SOON within 30 days', () => {
    const soon = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);
    const r = resolveLifeCertificateCompliance([mk({ status: 'PENDING', dueDate: soon })], null, []);
    expect(r.state).toBe('DUE_SOON');
  });
});
