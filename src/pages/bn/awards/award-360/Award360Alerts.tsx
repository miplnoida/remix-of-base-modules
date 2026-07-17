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
} from './viewModels';
import { AwardAlertCard } from './components';

/**
 * BN-AWARD360-V2 · Rich Overview alert derivation.
 *
 * AW360-WAVE-1-C1A — Claim and Pensioner inputs have been REMOVED from this
 * function because the shell no longer eagerly loads them. Alerts that depend
 * on Claim (`missing-claim`) or Pensioner (`deceased`, `no-payment-profile`)
 * are handled by `computeAwardAlertsFromSummary` using:
 *   • the canonical `header.claimId` field (populated by the header query),
 *   • the narrow tri-state `summary.pensionerAlert` section.
 *
 * This function operates only on domains the Overview aggregator actually
 * loaded: life certificates, medical reviews, suspensions, payments,
 * overpayments, and beneficiaries. It never fabricates "confirmed absent"
 * from an unloaded source.
 */
export function computeAwardAlerts(input: {
  header: Award360HeaderVM;
  beneficiaries: AwardBeneficiaryItem[];
  lifeCertificates: AwardLifeCertificateItem[];
  medicalReviews: AwardMedicalReviewItem[];
  suspensions: AwardSuspensionItem[];
  overpayments: AwardOverpaymentItem[];
  payments: AwardPaymentItem[];
}): AwardAlert[] {
  const alerts: AwardAlert[] = [];
  const { header, beneficiaries, lifeCertificates, medicalReviews, suspensions, overpayments, payments } = input;

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

  return alerts;
}

/**
 * AW360-WAVE-1-C1A — Summary-only alert computation.
 *
 * Used by the Award 360 shell on every tab as the base alert source. Alerts
 * derived here rely strictly on:
 *   • header fields (`status`, `claimId`, `productVersion`),
 *   • the lightweight tri-state summary (per-domain counts + `pensionerAlert`).
 *
 * Tri-state semantics are respected:
 *   • `ok` → alerts derived from the confirmed values,
 *   • `restricted` / `unavailable` → alert suppressed (no false negatives, no
 *     false positives),
 *   • absent summary section → alert suppressed.
 *
 * Claim link presence is resolved from `header.claimId` — never from an
 * unloaded Claim deep query.
 */
export function computeAwardAlertsFromSummary(input: {
  header: Award360HeaderVM;
  summary: import('@/services/bn/awards/award360SummaryService').Award360Summary | null | undefined;
}): AwardAlert[] {
  const alerts: AwardAlert[] = [];
  const { header, summary } = input;

  if (header.status === 'SUSPENDED') {
    alerts.push({
      key: 'currently-suspended',
      severity: 'breach',
      title: 'Award currently suspended',
      detail: 'Payments are paused on this award.',
      tabTarget: 'suspensions',
    });
  }
  if (header.claimId === null) {
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

  if (!summary) return alerts;

  if (summary.lifeCertificates.status === 'ok' && summary.lifeCertificates.value.overdueCount > 0) {
    const v = summary.lifeCertificates.value;
    alerts.push({
      key: 'lc-overdue',
      severity: 'breach',
      title: 'Life certificate overdue',
      detail: `Due ${v.overdueSampleDueDate ?? '—'} (${v.maxDaysOverdue} days).`,
      tabTarget: 'life-certificates',
    });
  }
  if (summary.medical.status === 'ok' && summary.medical.value.dueOrOverdueCount > 0) {
    alerts.push({
      key: 'medical-overdue',
      severity: 'warn',
      title: 'Medical review overdue',
      detail: `Scheduled ${summary.medical.value.overdueSampleDate ?? '—'}.`,
      tabTarget: 'medical',
    });
  }
  if (summary.suspensions.status === 'ok' && summary.suspensions.value.pendingCount > 0) {
    const v = summary.suspensions.value;
    alerts.push({
      key: 'suspension-open',
      severity: 'warn',
      title: 'Suspension request awaiting approval',
      detail: `${v.pendingSampleStatus ?? ''} — ${v.pendingSampleType ?? ''}`.trim(),
      tabTarget: 'suspensions',
    });
  }
  if (summary.payments.status === 'ok') {
    if (summary.payments.value.holdCount > 0) {
      alerts.push({
        key: 'payment-hold',
        severity: 'warn',
        title: 'Payment on hold',
        detail: `${summary.payments.value.holdCount} instruction(s) on hold.`,
        tabTarget: 'payments',
      });
    }
    if (summary.payments.value.failedCount > 0) {
      alerts.push({
        key: 'payment-failed',
        severity: 'breach',
        title: 'Failed payment',
        detail: `${summary.payments.value.failedCount} failed instruction(s).`,
        tabTarget: 'payments',
      });
    }
  }
  if (summary.overpayments.status === 'ok' && summary.overpayments.value.outstandingTotal > 0) {
    alerts.push({
      key: 'overpayment-outstanding',
      severity: 'warn',
      title: 'Outstanding overpayment balance',
      detail: `${summary.overpayments.value.outstandingTotal.toFixed(2)} ${header.currency ?? ''}`,
      tabTarget: 'overpayments',
    });
  }
  if (
    summary.beneficiaries.status === 'ok' &&
    summary.beneficiaries.value.activeCount > 0 &&
    Math.abs(summary.beneficiaries.value.activeShareTotal - 100) > 0.01
  ) {
    alerts.push({
      key: 'beneficiary-share',
      severity: 'warn',
      title: `Beneficiary shares total ${summary.beneficiaries.value.activeShareTotal.toFixed(2)}%`,
      detail: 'Active beneficiary shares should sum to 100%.',
      tabTarget: 'beneficiaries',
    });
  }

  // Narrow pensioner alert — only when the source resolved to `ok`.
  if (summary.pensionerAlert?.status === 'ok') {
    const p = summary.pensionerAlert.value;
    if (p.isDeceased === true) {
      alerts.push({
        key: 'deceased',
        severity: 'breach',
        title: 'Pensioner marked deceased',
        detail: `Date of death ${p.dateOfDeath ?? '—'}.`,
        tabTarget: 'pensioner',
      });
    }
    if (p.hasVerifiedPaymentProfile === false) {
      alerts.push({
        key: 'no-payment-profile',
        severity: 'info',
        title: 'No verified payment profile',
        detail: 'Confirm banking or payee details before disbursement.',
        tabTarget: 'pensioner',
      });
    }
  }

  return alerts;
}

/**
 * AW360-WAVE-1-C1A — Deduplicate alerts by key, later entries win.
 *
 * The shell layers rich Overview-derived alerts on top of the summary-derived
 * base so alerts remain visible on every tab. Duplicates (e.g., `lc-overdue`
 * from both sources) collapse to one entry with the richer detail preserved.
 */
export function dedupeAlerts(...groups: AwardAlert[][]): AwardAlert[] {
  const byKey = new Map<string, AwardAlert>();
  for (const group of groups) {
    for (const a of group) byKey.set(a.key, a);
  }
  return Array.from(byKey.values());
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
