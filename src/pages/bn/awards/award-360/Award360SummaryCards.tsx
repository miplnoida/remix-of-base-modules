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

interface Props {
  header: Award360HeaderVM;
  payments: AwardPaymentItem[];
  schedules: AwardScheduleItem[];
  lifeCertificates: AwardLifeCertificateItem[];
  medicalReviews: AwardMedicalReviewItem[];
  suspensions: AwardSuspensionItem[];
  overpayments: AwardOverpaymentItem[];
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
}) => {
  const lastPaid = payments.find((p) => p.paidDate);
  const nextDue = schedules.find((s) => s.status !== 'PAID' && s.dueDate);
  const outstanding = overpayments.reduce((sum, o) => sum + (o.outstandingAmount ?? 0), 0);
  const lcOverdue = lifeCertificates.find((lc) => lc.daysOverdue > 0);
  const openSusp = suspensions.find((s) => s.displayStatus?.startsWith('PENDING') || s.eventStatus === 'PROPOSED');
  const nextMed = medicalReviews.find((m) => m.status && m.status !== 'COMPLETED');

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Card1 label="Current rate" value={<AwardMoney value={header.currentRate} currency={header.currency} />} />
      <Card1 label="Last payment" value={lastPaid ? <AwardMoney value={lastPaid.amount} currency={lastPaid.currency} /> : '—'} />
      <Card1 label="Next scheduled" value={nextDue?.dueDate ?? '—'} />
      <Card1 label="Life certificate" value={lcOverdue ? `Overdue ${lcOverdue.daysOverdue}d` : 'OK'} tone={lcOverdue ? 'text-destructive' : ''} />
      <Card1 label="Medical review" value={nextMed?.nextReviewDate ?? nextMed?.scheduledDate ?? '—'} />
      <Card1 label="Suspension" value={openSusp?.displayStatus ?? '—'} tone={openSusp ? 'text-yellow-600' : ''} />
      <Card1 label="Outstanding overpayment" value={<AwardMoney value={outstanding} currency={header.currency} />} tone={outstanding > 0 ? 'text-destructive' : ''} />
      <Card1 label="Award status" value={header.status ?? '—'} />
    </div>
  );
};
