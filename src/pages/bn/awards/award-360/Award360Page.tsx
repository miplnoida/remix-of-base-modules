/**
 * Award 360 workspace — /bn/awards/:id?tab=<tabKey>
 * BN-AWARD360-V2.
 *
 * - Header + summary cards always render.
 * - Each tab lazy-loads through React Query.
 * - No direct browser writes. Actions either open canonical workspaces or
 *   render disabled with an explanation.
 */
import React, { useMemo, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { Award360Header as HeaderView } from './Award360Header';
import { Award360SummaryCards } from './Award360SummaryCards';
import { Award360TabNavigation } from './Award360TabNavigation';
import { useAward360Header, useAward360Overview } from './useAward360Queries';
import { AWARD_360_TABS, type Award360TabKey } from './viewModels';
import { computeAwardAlerts } from './Award360Alerts';
import { TabErrorState } from './components';

import { AwardOverviewTab } from './tabs/AwardOverviewTab';
import { AwardPensionerTab } from './tabs/AwardPensionerTab';
import { AwardClaimTab } from './tabs/AwardClaimTab';
import { AwardProductTab } from './tabs/AwardProductTab';
import { AwardBeneficiariesTab } from './tabs/AwardBeneficiariesTab';
import { AwardScheduleTab } from './tabs/AwardScheduleTab';
import { AwardPaymentsTab } from './tabs/AwardPaymentsTab';
import { AwardLifeCertificatesTab } from './tabs/AwardLifeCertificatesTab';
import { AwardMedicalReviewsTab } from './tabs/AwardMedicalReviewsTab';
import { AwardSuspensionsTab } from './tabs/AwardSuspensionsTab';
import { AwardOverpaymentsTab } from './tabs/AwardOverpaymentsTab';
import { AwardCommunicationsTab } from './tabs/AwardCommunicationsTab';
import { AwardAuditTab } from './tabs/AwardAuditTab';
import { useAwardClaim, useAwardPensioner, useAwardAudit } from './useAward360Queries';
import { useAward360Permissions, useAward360FeatureFlags } from './useAwardPermissions';
import { useAward360Actions } from './useAward360Actions';

const isValidTab = (v: string | null): v is Award360TabKey =>
  !!v && (AWARD_360_TABS as string[]).includes(v);

export default function Award360Page() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const qc = useQueryClient();

  const tab: Award360TabKey = isValidTab(sp.get('tab')) ? (sp.get('tab') as Award360TabKey) : 'overview';
  const setTab = useCallback(
    (t: string) => {
      const next = new URLSearchParams(sp);
      next.set('tab', t);
      setSp(next, { replace: true });
    },
    [sp, setSp],
  );

  const headerQ = useAward360Header(id);
  const overviewQ = useAward360Overview(id);
  // Prime claim + pensioner for alerts (small queries)
  const claimQ = useAwardClaim(id);
  const pensionerQ = useAwardPensioner(id);

  const counts = useMemo(() => {
    const o = overviewQ.data;
    if (!o) return {};
    const lcOverdue = o.lifeCertificates.filter((lc) => lc.daysOverdue > 0).length;
    const medDue = o.medicalReviews.filter((m) => m.status && m.status !== 'COMPLETED').length;
    const suspPending = o.suspensions.filter((s) => s.displayStatus?.startsWith('PENDING')).length;
    const outstanding = o.overpayments.reduce((s, x) => s + (x.outstandingAmount ?? 0), 0);
    const failedComms = o.communications.filter((c) => c.status === 'FAILED').length;
    return {
      beneficiaries: o.beneficiaries.length,
      schedule: o.schedules.length,
      payments: o.payments.length,
      'life-certificates': { count: lcOverdue, warn: lcOverdue > 0 },
      medical: { count: medDue, warn: medDue > 0 },
      suspensions: { count: suspPending, warn: suspPending > 0 },
      overpayments: { outstanding },
      communications: { failed: failedComms },
    };
  }, [overviewQ.data]);

  const alerts = useMemo(() => {
    if (!headerQ.data || !overviewQ.data) return [];
    return computeAwardAlerts({
      header: headerQ.data,
      claim: claimQ.data ?? null,
      pensioner: pensionerQ.data ?? null,
      beneficiaries: overviewQ.data.beneficiaries,
      lifeCertificates: overviewQ.data.lifeCertificates,
      medicalReviews: overviewQ.data.medicalReviews,
      suspensions: overviewQ.data.suspensions,
      overpayments: overviewQ.data.overpayments,
      payments: overviewQ.data.payments,
    });
  }, [headerQ.data, overviewQ.data, claimQ.data, pensionerQ.data]);

  // Resolve canonical module permissions via app_modules / module_actions.
  const perms = useAward360Permissions();
  const featureFlags = useAward360FeatureFlags();
  const canViewSensitiveMedical = perms.canViewSensitiveMedical;
  const canViewCentralAudit = perms.canViewCentralAudit;

  const award360Actions = useAward360Actions({
    awardId: id,
    awardStatus: headerQ.data?.status ?? null,
    pensionerDeceased: !!(pensionerQ.data as any)?.person?.deceased,
    hasClaimId: !!(headerQ.data as any)?.claimId,
    hasProductVersion: !!(headerQ.data as any)?.productVersionId,
    claimId: (headerQ.data as any)?.claimId ?? null,
    permissions: {
      canViewAward: perms.canViewAward,
      canViewCentralAudit: perms.canViewCentralAudit,
      canServiceLifeCert: perms.canServiceLifeCert,
      canServiceMedical: perms.canServiceMedical,
      canServiceOverpayment: perms.canServiceOverpayment,
      canServiceSuspension: perms.canServiceSuspension,
      canServicePayments: perms.canServicePayments,
      canServiceCommunications: perms.canServiceCommunications,
      // Suspension-specific fallbacks (BN-AWARD360-2.1G). Never authorize
      // non-Suspension actions.
      canProposeSuspension: perms.canPropose,
      canApproveSuspension: perms.canApprove,
    },
    featureFlags,
    capabilities: perms.capabilities as unknown as Record<string, {
      moduleName: string | null;
      action: string | null;
      moduleExists: boolean;
      actionExists: boolean;
      permissionGranted: boolean;
      reason: string;
    }>,
  });

  // Real recent activity — merges award status, rate, and suspension events.
  const activityQ = useAwardAudit(id, canViewCentralAudit);

  if (headerQ.isLoading) {
    return (
      <div className="p-10 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (headerQ.error || !headerQ.data) {
    return (
      <div className="p-6">
        <TabErrorState error={headerQ.error ?? new Error('Award not found')} onRetry={() => headerQ.refetch()} />
      </div>
    );
  }

  const header = headerQ.data;
  const overview = overviewQ.data;

  return (
    <div className="p-6">
      <HeaderView
        header={header}
        onBack={() => navigate('/bn/awards')}
        onRefresh={() => qc.invalidateQueries({ queryKey: ['award360', id] })}
      />

      <div className="mb-4">
        <Award360SummaryCards
          header={header}
          payments={overview?.payments ?? []}
          schedules={overview?.schedules ?? []}
          lifeCertificates={overview?.lifeCertificates ?? []}
          medicalReviews={overview?.medicalReviews ?? []}
          suspensions={overview?.suspensions ?? []}
          overpayments={overview?.overpayments ?? []}
        />
      </div>

      <Award360TabNavigation active={tab} onChange={(t) => setTab(t)} counts={counts as any} />

      <div>
        {tab === 'overview' && (
          <AwardOverviewTab
            header={header}
            alerts={alerts}
            onOpenTab={(t) => setTab(t)}
            recentActivity={(activityQ.data ?? []).slice(0, 20)}
            warnings={overview?.warnings ?? []}
          />
        )}
        {tab === 'pensioner' && <AwardPensionerTab awardId={id} ssn={header.ssnMasked} />}
        {tab === 'claim' && <AwardClaimTab awardId={id} />}
        {tab === 'product' && <AwardProductTab awardId={id} />}
        {tab === 'beneficiaries' && (
          <AwardBeneficiariesTab
            awardId={id}
            canView={perms.canViewAward}
            currency={header.currency}
            award={{ baseAmount: header.baseAmount, awardType: header.awardType }}
            actions={{
              openSurvivorsWorkspace: award360Actions.actions.OPEN_SURVIVORS_WORKSPACE,
              addBeneficiary: award360Actions.actions.ADD_BENEFICIARY,
              amendBeneficiary: award360Actions.actions.AMEND_BENEFICIARY,
              endBeneficiary: award360Actions.actions.END_BENEFICIARY,
              openPerson360: award360Actions.actions.OPEN_PERSON_360,
              openPaymentProfile: award360Actions.actions.OPEN_PAYMENT_PROFILE,
            }}
          />
        )}
        {tab === 'schedule' && <AwardScheduleTab awardId={id} currency={header.currency} canView={perms.canServicePayments} />}
        {tab === 'payments' && <AwardPaymentsTab awardId={id} currency={header.currency} canView={perms.canServicePayments} />}
        {tab === 'life-certificates' && <AwardLifeCertificatesTab awardId={id} award={{ status: header.status, awardType: header.awardType }} canView={perms.canServiceLifeCert} />}
        {tab === 'medical' && <AwardMedicalReviewsTab awardId={id} canViewSensitive={canViewSensitiveMedical} />}
        {tab === 'suspensions' && <AwardSuspensionsTab awardId={id} />}
        {tab === 'overpayments' && (
          <AwardOverpaymentsTab
            awardId={id}
            canView={perms.canServiceOverpayment}
            currency={header.currency}
            actions={{
              openOverpayment: award360Actions.actions.OPEN_OVERPAYMENT,
              configureRecoveryPlan: award360Actions.actions.CONFIGURE_RECOVERY_PLAN,
              requestWaiver: award360Actions.actions.REQUEST_OVERPAYMENT_WAIVER,
            }}
            evaluateAction={(action, context) => award360Actions.evaluate(action, context)}
          />
        )}
        {tab === 'communications' && (
          <AwardCommunicationsTab
            awardId={id}
            canView={perms.canServiceCommunications}
            canViewContent={perms.canViewCommunicationContent}
            actions={{
              openCommunicationHub: award360Actions.actions.OPEN_COMMUNICATION_HUB,
              openDeliveryMonitor: award360Actions.actions.OPEN_COMMUNICATION_DELIVERY_MONITOR,
              openRetryQueue: award360Actions.actions.OPEN_COMMUNICATION_RETRY_QUEUE,
              sendCommunication: award360Actions.actions.SEND_AWARD_COMMUNICATION,
            }}
            evaluateAction={(action, context) => award360Actions.evaluate(action, context)}
          />
        )}
        {tab === 'audit' && <AwardAuditTab awardId={id} canViewCentralAudit={canViewCentralAudit} />}
      </div>
    </div>
  );
}
