import React from 'react';
import type {
  AwardAlert,
  Award360Header as Award360HeaderVM,
  AwardPaymentItem,
  AwardLifeCertificateItem,
  AwardMedicalReviewItem,
  AwardSuspensionItem,
  AwardOverpaymentItem,
  AwardBeneficiaryItem,
  AwardClaimSummary,
  AwardPensionerProfile,
} from './viewModels';
import { AwardAlertCard } from './components';

export function computeAwardAlerts(input: {
  header: Award360HeaderVM;
  claim: AwardClaimSummary | null;
  pensioner: AwardPensionerProfile | null;
  beneficiaries: AwardBeneficiaryItem[];
  lifeCertificates: AwardLifeCertificateItem[];
  medicalReviews: AwardMedicalReviewItem[];
  suspensions: AwardSuspensionItem[];
  overpayments: AwardOverpaymentItem[];
  payments: AwardPaymentItem[];
}): AwardAlert[] {
  const alerts: AwardAlert[] = [];
  const { header, claim, pensioner, beneficiaries, lifeCertificates, medicalReviews, suspensions, overpayments, payments } = input;

  const lcOverdue = lifeCertificates.find((lc) => lc.daysOverdue > 0);
  if (lcOverdue) {
    alerts.push({
      key: 'lc-overdue',
      severity: 'breach',
      title: 'Life certificate overdue',
      detail: `Due ${lcOverdue.dueDate ?? '—'} (${lcOverdue.daysOverdue} days).`,
      tabTarget: 'life-certificates',
    });
  }

  const medDue = medicalReviews.find(
    (m) => m.status && m.status !== 'COMPLETED' && m.scheduledDate && new Date(m.scheduledDate).getTime() < Date.now(),
  );
  if (medDue) {
    alerts.push({
      key: 'medical-overdue',
      severity: 'warn',
      title: 'Medical review overdue',
      detail: `Scheduled ${medDue.scheduledDate}.`,
      tabTarget: 'medical',
    });
  }

  const openSusp = suspensions.find((s) => s.displayStatus?.startsWith('PENDING'));
  if (openSusp) {
    alerts.push({
      key: 'suspension-open',
      severity: 'warn',
      title: 'Suspension request awaiting approval',
      detail: `${openSusp.displayStatus} — ${openSusp.suspensionType ?? ''}`,
      tabTarget: 'suspensions',
    });
  }
  if (header.status === 'SUSPENDED') {
    alerts.push({
      key: 'currently-suspended',
      severity: 'breach',
      title: 'Award currently suspended',
      detail: 'Payments are paused on this award.',
      tabTarget: 'suspensions',
    });
  }

  const paymentHold = payments.find((p) => p.status === 'HOLD' || p.status === 'ON_HOLD');
  if (paymentHold) {
    alerts.push({
      key: 'payment-hold',
      severity: 'warn',
      title: 'Payment on hold',
      detail: `Reference ${paymentHold.reference}`,
      tabTarget: 'payments',
    });
  }
  const failedPayment = payments.find((p) => p.status === 'FAILED' || p.status === 'REJECTED');
  if (failedPayment) {
    alerts.push({
      key: 'payment-failed',
      severity: 'breach',
      title: 'Failed payment',
      detail: `Reference ${failedPayment.reference}`,
      tabTarget: 'payments',
    });
  }

  const outstanding = overpayments.reduce((s, o) => s + (o.outstandingAmount ?? 0), 0);
  if (outstanding > 0) {
    alerts.push({
      key: 'overpayment-outstanding',
      severity: 'warn',
      title: 'Outstanding overpayment balance',
      detail: `${outstanding.toFixed(2)} ${header.currency ?? ''}`,
      tabTarget: 'overpayments',
    });
  }

  const activeBens = beneficiaries.filter((b) => b.status === 'ACTIVE' && b.sharePercent != null);
  if (activeBens.length) {
    const total = activeBens.reduce((s, b) => s + Number(b.sharePercent ?? 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      alerts.push({
        key: 'beneficiary-share',
        severity: 'warn',
        title: `Beneficiary shares total ${total.toFixed(2)}%`,
        detail: 'Active beneficiary shares should sum to 100%.',
        tabTarget: 'beneficiaries',
      });
    }
  }

  if (pensioner?.isDeceased) {
    alerts.push({
      key: 'deceased',
      severity: 'breach',
      title: 'Pensioner marked deceased',
      detail: `Date of death ${pensioner.dateOfDeath ?? '—'}.`,
      tabTarget: 'pensioner',
    });
  }

  if (!pensioner?.verifiedPaymentProfile) {
    alerts.push({
      key: 'no-payment-profile',
      severity: 'info',
      title: 'No verified payment profile',
      detail: 'Confirm banking or payee details before disbursement.',
      tabTarget: 'pensioner',
    });
  }

  if (!claim) {
    alerts.push({
      key: 'missing-claim',
      severity: 'warn',
      title: 'Missing linked claim',
      detail: 'This award is not linked to a claim record.',
      tabTarget: 'claim',
    });
  }
  if (!header.productVersion) {
    alerts.push({
      key: 'missing-product-version',
      severity: 'warn',
      title: 'Missing product version',
      detail: 'The award is not resolved to a product version.',
      tabTarget: 'product',
    });
  }

  return alerts;
}

export const Award360Alerts: React.FC<{
  alerts: AwardAlert[];
  onOpenTab: (tab: string) => void;
}> = ({ alerts, onOpenTab }) => {
  if (!alerts.length) return null;
  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <AwardAlertCard
          key={a.key}
          severity={a.severity}
          title={a.title}
          detail={a.detail}
          onOpen={a.tabTarget ? () => onOpenTab(a.tabTarget!) : undefined}
        />
      ))}
    </div>
  );
};
