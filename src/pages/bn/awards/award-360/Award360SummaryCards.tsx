import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AwardMoney } from './components';
import type {
  Award360Header as Award360HeaderVM,
  AwardPaymentItem,
  AwardScheduleItem,
  AwardLifeCertificateItem,
  AwardMedicalReviewItem,
  AwardSuspensionItem,
  AwardOverpaymentItem,
} from './viewModels';
import type { Award360Summary } from '@/services/bn/awards/award360SummaryService';

interface Props {
  header: Award360HeaderVM;
  payments: AwardPaymentItem[];
  schedules: AwardScheduleItem[];
  lifeCertificates: AwardLifeCertificateItem[];
  medicalReviews: AwardMedicalReviewItem[];
  suspensions: AwardSuspensionItem[];
  overpayments: AwardOverpaymentItem[];
  /**
   * AW360-WAVE-1-C1 · Slice A — Optional lightweight summary used when the
   * eager Overview aggregator is not active (i.e., the active tab is not
   * `overview`). Card values fall back to summary-derived values so the shell
   * stays informative without paying for the full aggregator.
   */
  summary?: Award360Summary | null;
}

const Card1: React.FC<{ label: string; value: React.ReactNode; tone?: string }> = ({ label, value, tone }) => (
  <Card>
    <CardContent className="p-4">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${tone ?? ''}`}>{value}</div>
    </CardContent>
  </Card>
);

export const Award360SummaryCards: React.FC<Props> = ({
  header,
  payments,
  schedules,
  lifeCertificates,
  medicalReviews,
  suspensions,
  overpayments,
  summary,
}) => {
  const hasOverview = payments.length + schedules.length + lifeCertificates.length + medicalReviews.length + suspensions.length + overpayments.length > 0;

  const lastPaid = payments.find((p) => p.paidDate);
  const nextDue = schedules.find((s) => s.status !== 'PAID' && s.dueDate);
  const outstandingFromOverview = overpayments.reduce((sum, o) => sum + (o.outstandingAmount ?? 0), 0);
  const lcOverdueRow = lifeCertificates.find((lc) => lc.daysOverdue > 0);
  const openSuspRow = suspensions.find((s) => s.displayStatus?.startsWith('PENDING') || s.eventStatus === 'PROPOSED');
  const nextMedRow = medicalReviews.find((m) => m.status && m.status !== 'COMPLETED');

  // Summary fallbacks (used when overview arrays are empty).
  const s = summary;
  const sPay = s?.payments.status === 'ok' ? s.payments.value : null;
  const sSched = s?.schedule.status === 'ok' ? s.schedule.value : null;
  const sLc = s?.lifeCertificates.status === 'ok' ? s.lifeCertificates.value : null;
  const sMed = s?.medical.status === 'ok' ? s.medical.value : null;
  const sSusp = s?.suspensions.status === 'ok' ? s.suspensions.value : null;
  const sOpp = s?.overpayments.status === 'ok' ? s.overpayments.value : null;

  const lastPaidValue = lastPaid
    ? <AwardMoney value={lastPaid.amount} currency={lastPaid.currency} />
    : (sPay && sPay.lastPaidAmount != null
        ? <AwardMoney value={sPay.lastPaidAmount} currency={sPay.lastPaidCurrency ?? header.currency} />
        : '—');
  const nextScheduledValue = nextDue?.dueDate ?? sSched?.nextDueDate ?? '—';
  const lcTone = lcOverdueRow || (sLc && sLc.overdueCount > 0) ? 'text-destructive' : '';
  const lcValue = lcOverdueRow
    ? `Overdue ${lcOverdueRow.daysOverdue}d`
    : (sLc && sLc.overdueCount > 0
        ? `Overdue ${sLc.maxDaysOverdue}d`
        : (hasOverview || sLc ? 'OK' : '—'));
  const medValue = nextMedRow?.nextReviewDate ?? nextMedRow?.scheduledDate ?? sMed?.nextScheduledDate ?? '—';
  const suspValue = openSuspRow?.displayStatus
    ?? (sSusp && sSusp.pendingCount > 0 ? (sSusp.pendingSampleStatus ?? 'PENDING') : '—');
  const suspTone = openSuspRow || (sSusp && sSusp.pendingCount > 0) ? 'text-yellow-600' : '';
  const outstanding = hasOverview ? outstandingFromOverview : (sOpp?.outstandingTotal ?? 0);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Card1 label="Current rate" value={<AwardMoney value={header.currentRate} currency={header.currency} />} />
      <Card1 label="Last payment" value={lastPaidValue} />
      <Card1 label="Next scheduled" value={nextScheduledValue} />
      <Card1 label="Life certificate" value={lcValue} tone={lcTone} />
      <Card1 label="Medical review" value={medValue} />
      <Card1 label="Suspension" value={suspValue} tone={suspTone} />
      <Card1 label="Outstanding overpayment" value={<AwardMoney value={outstanding} currency={header.currency} />} tone={outstanding > 0 ? 'text-destructive' : ''} />
      <Card1 label="Award status" value={header.status ?? '—'} />
    </div>
  );
};

