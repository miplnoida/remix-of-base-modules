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
import { useAward360Header, useAward360Overview, useAward360Summary } from './useAward360Queries';
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
import { useAward360TabAccess } from './useAward360TabAccess';
import { Award360AdminDiagnostics } from './components/Award360AdminDiagnostics';

const isValidTab = (v: string | null): v is Award360TabKey =>
  !!v && (AWARD_360_TABS as string[]).includes(v);

export default function Award360Page() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const qc = useQueryClient();

  const rawTab = sp.get('tab');
  const requestedTab: Award360TabKey = isValidTab(rawTab) ? (rawTab as Award360TabKey) : 'overview';
  const setTab = useCallback(
    (t: string) => {
      const next = new URLSearchParams(sp);
      next.set('tab', t);
      setSp(next, { replace: true });
    },
    [sp, setSp],
  );

  // Resolve canonical module permissions FIRST — every subsequent query is
  // gated by the central tab-access result.
  const perms = useAward360Permissions();
  const tabAccess = useAward360TabAccess(perms);
  const featureFlags = useAward360FeatureFlags();
  const canViewSensitiveMedical = perms.canViewSensitiveMedical;
  const canViewCentralAudit = perms.canViewCentralAudit;
  const showDiagnostics = !!perms.admin?.isAdmin && sp.get('diag') === '1';

  // Resolve the effective tab AFTER permissions are ready. If the requested
  // tab is not visible, replace with the first visible tab (overview when
  // available). Do not mount unauthorized tabs.
  const activeTab: Award360TabKey = React.useMemo(() => {
    if (!perms.isReady) return requestedTab;
    if (tabAccess[requestedTab]?.visible) return requestedTab;
    if (tabAccess.overview?.visible) return 'overview';
    // No visible tabs — surface as restricted below.
    return requestedTab;
  }, [perms.isReady, requestedTab, tabAccess]);

  // Correct URL when requested tab is unauthorized.
  React.useEffect(() => {
    if (!perms.isReady) return;
    if (activeTab !== requestedTab) {
      const next = new URLSearchParams(sp);
      next.set('tab', activeTab);
      setSp(next, { replace: true });
    }
  }, [perms.isReady, activeTab, requestedTab, sp, setSp]);

  // Header runs only when Award view is granted.
  const headerEnabled = perms.isReady && tabAccess.overview.queryEnabled;
  const headerQ = useAward360Header(id, headerEnabled);
  const overviewEnabled = perms.isReady && tabAccess.overview.queryEnabled;
  const overviewQ = useAward360Overview(id, overviewEnabled, {
    includeBeneficiaries: !!tabAccess.beneficiaries.queryEnabled,
    includeSchedule: !!tabAccess.schedule.queryEnabled,
    includePayments: !!tabAccess.payments.queryEnabled,
    includeLifeCertificates: !!tabAccess['life-certificates'].queryEnabled,
    includeMedical: !!tabAccess.medical.queryEnabled,
    includeSuspensions: !!tabAccess.suspensions.queryEnabled,
    includeOverpayments: !!tabAccess.overpayments.queryEnabled,
    includeCommunications: !!tabAccess.communications.queryEnabled,
  });
  // BN-AWARD360-B5 — Lightweight tri-state summary; runs alongside overview so
  // the shell (badges/alerts) has confirmed-zero vs restricted vs unavailable
  // signals, and inactive tabs can be certified against this cheaper path.
  const summaryQ = useAward360Summary(id, overviewEnabled, {
    includeBeneficiaries: !!tabAccess.beneficiaries.queryEnabled,
    includeSchedule: !!tabAccess.schedule.queryEnabled,
    includePayments: !!tabAccess.payments.queryEnabled,
    includeLifeCertificates: !!tabAccess['life-certificates'].queryEnabled,
    includeMedical: !!tabAccess.medical.queryEnabled,
    includeSuspensions: !!tabAccess.suspensions.queryEnabled,
    includeOverpayments: !!tabAccess.overpayments.queryEnabled,
    includeCommunications: !!tabAccess.communications.queryEnabled,
  });
  // Claim + pensioner alerts only when permitted.
  const claimQ = useAwardClaim(id, perms.isReady && tabAccess.claim.queryEnabled);
  const pensionerQ = useAwardPensioner(id, perms.isReady && tabAccess.pensioner.queryEnabled);

  const counts = useMemo(() => {
    const o = overviewQ.data;
    if (!o) return {};
    const lcOverdue = o.lifeCertificates.filter((lc) => lc.daysOverdue > 0).length;
    const medDue = o.medicalReviews.filter((m) => m.status && m.status !== 'COMPLETED').length;
    const suspPending = o.suspensions.filter((s) => s.displayStatus?.startsWith('PENDING')).length;
    const outstanding = o.overpayments.reduce((s, x) => s + (x.outstandingAmount ?? 0), 0);
    const failedComms = o.communications.filter((c) => c.status === 'FAILED').length;
    // Only expose counts for visible tabs.
    return {
      ...(tabAccess.beneficiaries.visible ? { beneficiaries: o.beneficiaries.length } : {}),
      ...(tabAccess.schedule.visible ? { schedule: o.schedules.length } : {}),
      ...(tabAccess.payments.visible ? { payments: o.payments.length } : {}),
      ...(tabAccess['life-certificates'].visible ? { 'life-certificates': { count: lcOverdue, warn: lcOverdue > 0 } } : {}),
      ...(tabAccess.medical.visible ? { medical: { count: medDue, warn: medDue > 0 } } : {}),
      ...(tabAccess.suspensions.visible ? { suspensions: { count: suspPending, warn: suspPending > 0 } } : {}),
      ...(tabAccess.overpayments.visible ? { overpayments: { outstanding } } : {}),
      ...(tabAccess.communications.visible ? { communications: { failed: failedComms } } : {}),
    };
  }, [overviewQ.data, tabAccess]);

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

  // Audit runs only when Audit tab is visible AND currently active (lazy).
  const activityQ = useAwardAudit(id, canViewCentralAudit, perms.isReady && tabAccess.audit.queryEnabled && activeTab === 'overview');

  // Global loading / error gating.
  if (perms.isLoading) {
    return (
      <div className="p-10 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        <div className="mt-2 text-xs text-muted-foreground">Resolving access…</div>
      </div>
    );
  }
  if (perms.hasPermissionResolutionError) {
    const err = perms.admin.error ?? perms.registryError ?? perms.userPermissionsError
      ?? new Error('Failed to resolve permissions');
    const source = perms.admin.isError
      ? 'administrator RPC'
      : perms.registryError
      ? 'module registry'
      : 'user permissions RPC';
    return (
      <div className="p-6">
        <TabErrorState
          error={new Error(`${err.message} (source: ${source})`)}
          onRetry={() => perms.refetchAllPermissions()}
        />
      </div>
    );
  }
  // If the user cannot view the Award at all, show the restricted state.
  if (!tabAccess.overview.visible) {
    return (
      <div className="p-6">
        <div className="rounded-md border border-yellow-500/60 bg-yellow-500/10 p-4">
          <div className="text-sm font-medium">You do not have permission to view this Award.</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Required capability: bn_awards_list.view · {tabAccess.overview.reason}
          </div>
          <div className="mt-3">
            <button className="text-sm underline" onClick={() => navigate('/bn/awards')}>
              Back to Awards
            </button>
          </div>
        </div>
        {showDiagnostics && <Award360AdminDiagnostics perms={perms} tabAccess={tabAccess} />}
      </div>
    );
  }
  if (headerQ.isLoading) {
    return (
      <div className="p-10 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        <div className="mt-2 text-xs text-muted-foreground">Loading award…</div>
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

      <Award360TabNavigation
        active={activeTab}
        onChange={(t) => setTab(t)}
        counts={counts as any}
        access={tabAccess}
      />

      <div>
        {activeTab === 'overview' && tabAccess.overview.visible && (
          <AwardOverviewTab
            header={header}
            alerts={alerts}
            onOpenTab={(t) => setTab(t)}
            recentActivity={(activityQ.data ?? []).slice(0, 20)}
            warnings={[...(overview?.warnings ?? []), ...(summaryQ.data?.warnings ?? [])]}
          />
        )}
        {activeTab === 'pensioner' && tabAccess.pensioner.visible && (
          <AwardPensionerTab
            awardId={id}
            ssn={header.ssnMasked}
            access={{
              canViewPaymentProfile: !!perms.capabilities?.PAYMENT_PROFILE_VIEW?.effectiveAccess,
              canViewPerson360: !!perms.capabilities?.PENSIONER_VIEW?.effectiveAccess,
            }}
            enabled={tabAccess.pensioner.queryEnabled}
          />
        )}
        {activeTab === 'claim' && tabAccess.claim.visible && (
          <AwardClaimTab
            awardId={id}
            access={{
              canViewEvidence: !!perms.capabilities?.CLAIM_EVIDENCE_VIEW?.effectiveAccess,
              canViewWorkflow: !!perms.capabilities?.CLAIM_WORKFLOW_VIEW?.effectiveAccess,
            }}
            enabled={tabAccess.claim.queryEnabled}
          />
        )}
        {activeTab === 'product' && tabAccess.product.visible && (
          <AwardProductTab
            awardId={id}
            access={{
              canViewConfiguration: !!perms.capabilities?.PRODUCT_CONFIGURATION_VIEW?.effectiveAccess,
            }}
            enabled={tabAccess.product.queryEnabled}
          />
        )}
        {activeTab === 'beneficiaries' && tabAccess.beneficiaries.visible && (
          <AwardBeneficiariesTab
            awardId={id}
            canView={tabAccess.beneficiaries.queryEnabled}
            currency={header.currency}
            award={{ baseAmount: header.baseAmount, awardType: header.awardType }}
            actions={{
              openSurvivorsWorkspace: award360Actions.actions.OPEN_SURVIVORS_WORKSPACE,
              addBeneficiary: award360Actions.actions.ADD_BENEFICIARY,
            }}
            evaluateAction={(action, context) => award360Actions.evaluate(action, context)}
          />
        )}
        {activeTab === 'schedule' && tabAccess.schedule.visible && <AwardScheduleTab awardId={id} currency={header.currency} canView={tabAccess.schedule.queryEnabled} />}
        {activeTab === 'payments' && tabAccess.payments.visible && <AwardPaymentsTab awardId={id} currency={header.currency} canView={tabAccess.payments.queryEnabled} />}
        {activeTab === 'life-certificates' && tabAccess['life-certificates'].visible && <AwardLifeCertificatesTab awardId={id} award={{ status: header.status, awardType: header.awardType }} canView={tabAccess['life-certificates'].queryEnabled} />}
        {activeTab === 'medical' && tabAccess.medical.visible && (
          <AwardMedicalReviewsTab
            awardId={id}
            canView={tabAccess.medical.queryEnabled}
            canViewSensitive={canViewSensitiveMedical}
            actions={{
              openWorkspace: award360Actions.actions.OPEN_MEDICAL_REVIEW_WORKSPACE,
              schedule: award360Actions.actions.SCHEDULE_MEDICAL_REVIEW,
              recordOutcome: award360Actions.actions.RECORD_MEDICAL_OUTCOME,
              referBoard: award360Actions.actions.REFER_MEDICAL_BOARD,
            }}
          />
        )}
        {activeTab === 'suspensions' && tabAccess.suspensions.visible && <AwardSuspensionsTab awardId={id} />}
        {activeTab === 'overpayments' && tabAccess.overpayments.visible && (
          <AwardOverpaymentsTab
            awardId={id}
            canView={tabAccess.overpayments.queryEnabled}
            currency={header.currency}
            actions={{
              openOverpayment: award360Actions.actions.OPEN_OVERPAYMENT,
              configureRecoveryPlan: award360Actions.actions.CONFIGURE_RECOVERY_PLAN,
              requestWaiver: award360Actions.actions.REQUEST_OVERPAYMENT_WAIVER,
            }}
            evaluateAction={(action, context) => award360Actions.evaluate(action, context)}
          />
        )}
        {activeTab === 'communications' && tabAccess.communications.visible && (
          <AwardCommunicationsTab
            awardId={id}
            canView={tabAccess.communications.queryEnabled}
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
        {activeTab === 'audit' && tabAccess.audit.visible && (
          <AwardAuditTab
            awardId={id}
            canView={tabAccess.audit.queryEnabled}
            canViewCentralAudit={canViewCentralAudit}
            exportAction={award360Actions.actions.EXPORT_AUDIT}
          />
        )}

      </div>

      {showDiagnostics && <Award360AdminDiagnostics perms={perms} tabAccess={tabAccess} />}
    </div>
  );
}
