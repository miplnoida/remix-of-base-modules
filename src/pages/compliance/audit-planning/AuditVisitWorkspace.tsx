// ============================================
// AUDIT VISIT WORKSPACE — Phase 3
// Full-page execution environment for a single plan-item / employer visit.
// Routes:
//   /compliance/field/visit/:planItemId?planId=…              (canonical)
//   /compliance/field/execution-dashboard/:planId/visit/:planItemId  (nested)
// ============================================

import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams, useMatch } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ChevronLeft,
  PlayCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MapPin,
  FileText,
  Camera,
  ListChecks,
  ClipboardList,
  ShieldAlert,
  MessageSquare,
} from 'lucide-react';
import {
  fieldAuditService,
  type ExecutionMode,
  type CompletionGateResult,
} from '@/services/fieldAuditService';
import { toast } from 'sonner';
import { EvidenceTabContent } from '@/components/compliance/inspection/EvidenceTabContent';
import { FindingsTabContent } from '@/components/compliance/inspection/FindingsTabContent';
import { WorkingPapersTabContent } from '@/components/compliance/inspection/WorkingPapersTabContent';
import { EmployerInteractionTabContent } from '@/components/compliance/inspection/EmployerInteractionTabContent';
import { EmployerComplianceHistoryPanel } from '@/components/compliance/employer-history/EmployerComplianceHistoryPanel';
import { VisitCommunicationsTab } from '@/components/compliance/communication/VisitCommunicationsTab';
import { VisitCommunicationsIntelligenceCard } from '@/components/compliance/communication/VisitCommunicationsIntelligenceCard';
import {
  CommunicationGateChecks,
  type CommGateCheck,
  type GateQuickActionKind,
} from '@/components/compliance/communication/CommunicationGateChecks';
import CommunicationComposer from '@/components/compliance/communication/CommunicationComposer';
import IntimationExceptionDialog from '@/components/compliance/communication/IntimationExceptionDialog';
import { auditCommunicationTemplateService } from '@/services/auditCommunicationTemplateService';
import { supabase } from '@/integrations/supabase/client';
import type { CeCommType } from '@/types/auditCommunication';
import {
  ContextualCommActions,
  type ContextualAction,
  type CommActionVisibilityContext,
} from '@/components/compliance/communication/ContextualCommActions';
import { useVisitCommunicationStatus } from '@/hooks/useVisitCommunicationStatus';
import { useVisitCommunicationOrchestrator } from '@/hooks/compliance/useVisitCommunicationOrchestrator';
import {
  FileSearch, FileWarning, BellRing, HelpCircle, FileCheck2,
  FileSignature, FileBadge, ClipboardCheck, AlarmClock, ShieldX,
} from 'lucide-react';
import { useUserCode } from '@/hooks/useUserCode';
import type { InspectionVisit } from '@/types/inspectionTypes';

export default function AuditVisitWorkspace() {
  const params = useParams<{ planItemId: string; planId?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nestedMatch = useMatch('/compliance/field/execution-dashboard/:planId/visit/:planItemId');

  const planItemId = params.planItemId!;
  const planIdFromRoute = params.planId ?? searchParams.get('planId') ?? undefined;
  const isNested = !!nestedMatch;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('checklist');

  const load = async () => {
    try {
      setLoading(true);
      const d = await fieldAuditService.getVisitWorkspaceData(planItemId);
      setData(d);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to load visit workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (planItemId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planItemId]);

  const planItem = data?.planItem;
  const plan = data?.plan;
  const inspection = data?.inspection;
  const inspectionId: string | undefined = data?.inspectionId;
  const metrics = data?.metrics;
  const gate: CompletionGateResult | null = data?.gate ?? null;
  const sessionStarted = !!inspection?.session_started_at;
  const sessionClosed = !!inspection?.session_closed_at;
  const reportStatus: string | null = data?.report?.status ?? data?.metrics?.reportStatus ?? null;
  const hasViolations: boolean = (data?.metrics?.violationsCount ?? 0) > 0;

  const { userCode } = useUserCode();
  const commStatus = useVisitCommunicationStatus(inspectionId);

  // ─── Pre-visit intimation governance state ──────────────────
  // Drives the nuanced PASS / WARN / FAIL on the Audit Intimation gate
  // check, and powers the inline composer + exception dialog opened from
  // the gate's quick-action buttons.
  const [intimationMinLeadHours, setIntimationMinLeadHours] = useState<number>(48);
  const [intimationTemplateId, setIntimationTemplateId] = useState<string | null>(null);
  const [intimationException, setIntimationException] = useState<boolean>(false);
  const [composerState, setComposerState] = useState<{
    commType: CeCommType;
    templateId?: string;
    sendLate?: boolean;
  } | null>(null);
  const [exceptionDialogOpen, setExceptionDialogOpen] = useState(false);

  // Resolve the active Audit Intimation template once so we can read its
  // policy (min_lead_hours) and pre-select it in the composer.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await auditCommunicationTemplateService.list({ activeOnly: true });
        const tpl = list.find((t: any) => t.comm_type === 'audit_intimation');
        if (cancelled) return;
        if (tpl) {
          setIntimationTemplateId(tpl.id);
          const lead = (tpl as any).min_lead_hours;
          if (typeof lead === 'number' && lead > 0) setIntimationMinLeadHours(lead);
        }
      } catch {
        /* non-fatal — gate falls back to 48h. */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Detect a recorded exception event for this inspection.
  useEffect(() => {
    if (!inspectionId) { setIntimationException(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await (supabase.from('ce_audit_communication_events' as any) as any)
          .select('id, payload')
          .eq('event_type', 'intimation_exception_recorded')
          .contains('payload', { inspection_id: inspectionId })
          .limit(1);
        if (!cancelled) setIntimationException((data ?? []).length > 0);
      } catch {
        if (!cancelled) setIntimationException(false);
      }
    })();
  }, [inspectionId, commStatus.total]);

  // ─── Stage-aware orchestrator ───────────────────────────────
  // Single façade composing templates ↔ stage map ↔ visit comms ↔
  // trigger engine ↔ approval workflow ↔ status. Drives the unified
  // completion-gate "Communications" sub-section and surfaces the
  // next recommended action to the auditor.
  const orchestrator = useVisitCommunicationOrchestrator({
    inspectionId,
    employerId: inspection?.employer_id ?? planItem?.employer_id ?? null,
    employerName: planItem?.employer_name ?? inspection?.employer_name ?? undefined,
    triggerContext: {
      sessionStarted,
      sessionClosed,
      reportStatus,
      hasViolations,
    },
    userCode: userCode ?? undefined,
    enabled: !!inspectionId,
  });

  // ─── Rule-based visibility context for ContextualCommActions ───
  // Single source of truth for *when* each action button should be offered.
  // Keep this purely derived from already-loaded state — no extra fetches.
  const commActionContext: CommActionVisibilityContext = useMemo(() => {
    const checklistTotal = metrics?.checklistTotal ?? 0;
    const checklistAnswered = metrics?.checklistAnswered ?? 0;
    const checklistComplete = checklistTotal > 0 && checklistAnswered >= checklistTotal;
    const evidenceCount = metrics?.evidenceCount ?? 0;
    const findingsCount = metrics?.findingsCount ?? 0;
    const maxSeverity = deriveMaxSeverity(metrics);
    const hasReport = !!metrics?.hasReport;
    const reportApproved = (reportStatus ?? '').toUpperCase() === 'APPROVED'
      || (reportStatus ?? '').toUpperCase() === 'ISSUED';

    // Overdue without recorded response: defer to the hook's intelligence
    // derivation, which uses `response_due_at` + `responded_at` from the
    // ce_audit_communications lifecycle columns (migration 20260422112003).
    const overdue = commStatus.overdueResponses.length > 0
      || commStatus.overdueAcknowledgments.length > 0;

    const reminderCount = (commStatus.itemsByType?.due_date_reminder?.length ?? 0)
      + (commStatus.itemsByType?.visit_reminder?.length ?? 0);

    // "Clarification needed" = there are concrete findings worth asking
    // the employer to explain — i.e. at least one non-trivial finding
    // that hasn't already hardened into a high-severity violation (where
    // the Violation Notice action takes over instead).
    const clarificationNeeded =
      findingsCount > 0
      && (SEV_RANK[maxSeverity] ?? 0) >= (SEV_RANK.LOW ?? 1)
      && !(hasViolations && (SEV_RANK[maxSeverity] ?? 0) >= (SEV_RANK.HIGH ?? 3));

    return {
      sessionStarted,
      sessionClosed,
      checklistComplete,
      hasMissingDocuments: !checklistComplete || evidenceCount === 0,
      hasMissingEvidence: evidenceCount === 0,
      hasFindings: findingsCount > 0,
      hasClarificationNeeded: clarificationNeeded,
      hasViolations,
      maxSeverity,
      enforcementThreshold: 'MEDIUM',
      hasReport,
      reportStatus,
      reportApproved,
      finalReportIssued: commStatus.finalStageIssued,
      hasOpenObligations: commStatus.hasOpenItems,
      hasOverdueWithoutResponse: overdue,
      reminderCount,
      hasPendingApproval: commStatus.pendingApproval > 0,
    };
  }, [
    metrics, reportStatus, hasViolations, sessionStarted, sessionClosed,
    commStatus.itemsByType, commStatus.finalStageIssued,
    commStatus.hasOpenItems, commStatus.pendingApproval,
    commStatus.overdueResponses, commStatus.overdueAcknowledgments,
  ]);

  const planId = planIdFromRoute ?? plan?.id;

  const breadcrumbs = useMemo(() => {
    const crumbs: { label: string; href?: string }[] = [
      { label: 'Compliance', href: '/compliance/dashboard' },
      { label: 'Field', href: '/compliance/field/my-plans' },
    ];
    if (isNested && planId) {
      crumbs.push({
        label: plan?.plan_number ? `Plan ${plan.plan_number}` : 'Plan',
        href: `/compliance/field/execution-dashboard/${planId}`,
      });
    }
    crumbs.push({
      label: planItem?.employer_name ?? planItem?.area_name ?? 'Visit',
    });
    return crumbs;
  }, [isNested, planId, plan, planItem]);

  // Adapt planItem → InspectionVisit shape for reused tab components
  const adaptedVisit: InspectionVisit | null = useMemo(() => {
    if (!inspection) return null;
    return {
      id: inspection.id,
      weeklyPlanItemId: planItemId,
      employerId: inspection.employer_id ?? undefined,
      employerName: inspection.employer_name ?? undefined,
      inspectorUserId: inspection.inspector_id ?? '',
      inspectorName: inspection.inspector_name ?? '',
      territory: (inspection.territory ?? 'St Kitts') as 'St Kitts' | 'Nevis',
      visitDate: inspection.visit_date ?? undefined,
      checkInTime: inspection.session_started_at ?? undefined,
      checkOutTime: inspection.session_closed_at ?? undefined,
      visitStatus: inspection.status ?? 'IN_PROGRESS',
      notes: inspection.notes ?? undefined,
      createdAt: inspection.created_at,
      updatedAt: inspection.updated_at,
    } as any;
  }, [inspection, planItemId]);

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading audit workspace…</div>;
  }
  if (!planItem) {
    return <div className="p-6 text-muted-foreground">Visit not found.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={planItem.employer_name ?? planItem.area_name ?? 'Audit Visit'}
        subtitle={`${planItem.planned_date ?? ''} • ${planItem.territory ?? ''} • ${planItem.item_type ?? ''}`}
        breadcrumbs={breadcrumbs}
      />

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-2">
          {!sessionStarted && (
            <Button onClick={() => setShowStartDialog(true)}>
              <PlayCircle className="h-4 w-4 mr-1" /> Start Audit Session
            </Button>
          )}
          {sessionStarted && !sessionClosed && (
            <Button variant="default" onClick={() => setShowCloseDialog(true)}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Close Audit
            </Button>
          )}
          {sessionClosed && (
            <Badge className="bg-success/10 text-success border-success/20">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Closed
            </Badge>
          )}
        </div>
      </div>

      {/* Session strip */}
      <SessionStrip inspection={inspection} />

      {/* KPI strip */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard
            icon={<ListChecks className="h-5 w-5 text-primary" />}
            label="Checklist"
            value={`${metrics.checklistAnswered ?? 0}/${metrics.checklistTotal ?? 0}`}
            sub={`${metrics.checklistPct ?? 0}%`}
          />
          <KpiCard
            icon={<Camera className="h-5 w-5" />}
            label="Evidence"
            value={metrics.evidenceCount ?? 0}
          />
          <KpiCard
            icon={<ClipboardList className="h-5 w-5" />}
            label="Findings"
            value={metrics.findingsCount ?? 0}
          />
          <KpiCard
            icon={<FileText className="h-5 w-5" />}
            label="Report"
            value={metrics.hasReport ? metrics.reportStatus ?? 'DRAFT' : '—'}
          />
          <KpiCard
            icon={<ShieldAlert className="h-5 w-5" />}
            label="Follow-ups"
            value={metrics.followUpCount ?? 0}
          />
        </div>
      )}

      {/* Communications intelligence — surfaces overdue acks/responses,
          escalation alerts, last sent, and next recommended action so the
          auditor sees comm posture before opening the Communications tab
          or hitting the completion gate. */}
      {sessionStarted && inspectionId && (adaptedVisit?.employerId || planItem.employer_id) && (
        <VisitCommunicationsIntelligenceCard
          inspectionId={inspectionId}
          employerId={adaptedVisit?.employerId || planItem.employer_id}
          employerName={planItem.employer_name ?? undefined}
          triggerContext={{
            sessionStarted,
            sessionClosed,
            reportStatus,
            hasViolations,
          }}
          userCode={userCode ?? undefined}
          status={commStatus}
          onOpenCommunicationsTab={() => setActiveTab('communications')}
        />
      )}

      {/* Completion gate panel */}
      {sessionStarted && gate && (
        <CompletionGatePanel
          gate={gate}
          inspectionId={inspectionId}
          employerId={adaptedVisit?.employerId || planItem.employer_id}
          employerName={planItem.employer_name ?? undefined}
          userCode={userCode ?? undefined}
          commStatus={{
            total: commStatus.total,
            sent: commStatus.sent,
            pending: commStatus.drafts + commStatus.pendingApproval + commStatus.scheduled,
            failed: commStatus.failed,
            finalStageIssued: commStatus.finalStageIssued,
          }}
          itemsByType={commStatus.itemsByType}
          gateContext={{
            sessionClosed,
            reportStatus,
            hasViolations,
            maxSeverity: deriveMaxSeverity(metrics),
            enforcementThreshold: 'MEDIUM',
            hasOverdueItems: (metrics?.followUpCount ?? 0) > 0,
            intimation: {
              plannedDate: planItem?.planned_date ?? null,
              sessionStartedAt: inspection?.session_started_at ?? null,
              minLeadHours: intimationMinLeadHours,
              exceptionRecorded: intimationException,
            },
          }}
          onGateQuickAction={(check, kind, commType) => {
            if (kind === 'record_exception') {
              setExceptionDialogOpen(true);
              return;
            }
            const ct = commType ?? 'audit_intimation';
            if (ct === 'audit_intimation' && !intimationTemplateId) {
              toast.error(
                'No active Audit Intimation template is mapped for this visit stage.',
                { description: 'Configure one in Settings → Communications → Templates.' },
              );
              return;
            }
            setComposerState({
              commType: ct,
              templateId: ct === 'audit_intimation' ? intimationTemplateId ?? undefined : undefined,
              sendLate: ct === 'audit_intimation' && sessionStarted,
            });
          }}
          onCommChanged={commStatus.refresh}
          commActionContext={commActionContext}
          orchestratorBlockers={orchestrator.completionGate.blockers}
          orchestratorReady={orchestrator.completionGate.ready}
          nextRecommendedLabel={orchestrator.nextRecommended?.rule.rule_name ?? null}
          commAdvisory={
            sessionClosed && hasViolations && !commStatus.finalStageIssued
              ? 'No final-stage communication (final report / violation notice / corrective action) has been sent to the employer yet.'
              : commStatus.failed > 0
              ? `${commStatus.failed} communication(s) failed delivery — review the Communications tab.`
              : null
          }
        />
      )}

      {/* Tabs */}
      {sessionStarted && adaptedVisit ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full flex-wrap gap-1">
            <TabsTrigger value="checklist">Working Papers</TabsTrigger>
            <TabsTrigger value="employer">Employer</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
            <TabsTrigger value="findings">Findings</TabsTrigger>
            <TabsTrigger value="communications" className="gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              Communications
              {commStatus.total > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {commStatus.total}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="report">Report</TabsTrigger>
          </TabsList>
          <TabsContent value="checklist" className="space-y-3">
            {inspectionId && (adaptedVisit.employerId || planItem.employer_id) && (
              <ContextualCommActions
                inspectionId={inspectionId}
                employerId={adaptedVisit.employerId || planItem.employer_id}
                employerName={planItem.employer_name ?? undefined}
                userCode={userCode ?? undefined}
                title="Checklist communications"
                onChanged={commStatus.refresh}
                actions={WORKING_PAPERS_ACTIONS}
                visibilityContext={commActionContext}
              />
            )}
            <WorkingPapersTabContent visit={adaptedVisit} planItemId={planItemId} />
          </TabsContent>
          <TabsContent value="employer">
            <EmployerInteractionTabContent visit={adaptedVisit} planItemId={planItemId} />
          </TabsContent>
          <TabsContent value="evidence">
            <EvidenceTabContent visit={adaptedVisit} />
          </TabsContent>
          <TabsContent value="findings" className="space-y-3">
            {inspectionId && (adaptedVisit.employerId || planItem.employer_id) && (
              <ContextualCommActions
                inspectionId={inspectionId}
                employerId={adaptedVisit.employerId || planItem.employer_id}
                employerName={planItem.employer_name ?? undefined}
                userCode={userCode ?? undefined}
                title="Findings communications"
                onChanged={commStatus.refresh}
                actions={FINDINGS_ACTIONS}
                visibilityContext={commActionContext}
              />
            )}
            <FindingsTabContent
              visit={adaptedVisit}
              employerId={adaptedVisit.employerId || planItem.employer_id || ''}
              planItem={planItem}
            />
          </TabsContent>
          <TabsContent value="communications">
            {inspectionId && (adaptedVisit.employerId || planItem.employer_id) ? (
              <VisitCommunicationsTab
                inspectionId={inspectionId}
                employerId={adaptedVisit.employerId || planItem.employer_id}
                employerName={planItem.employer_name ?? undefined}
                visitContext={{
                  sessionStarted,
                  sessionClosed,
                  reportStatus,
                  hasViolations,
                  gateBlocked: !!gate && !gate.ready,
                }}
                userCode={userCode ?? undefined}
              />
            ) : (
              <Card>
                <CardContent className="py-6 text-sm text-muted-foreground">
                  Communications become available once the visit has an employer and active session.
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="history">
            {(adaptedVisit.employerId || planItem.employer_id) && (
              <EmployerComplianceHistoryPanel
                employerId={adaptedVisit.employerId || planItem.employer_id}
                inspectionId={inspectionId}
              />
            )}
          </TabsContent>
          <TabsContent value="report" className="space-y-3">
            {inspectionId && (adaptedVisit.employerId || planItem.employer_id) && (
              <ContextualCommActions
                inspectionId={inspectionId}
                employerId={adaptedVisit.employerId || planItem.employer_id}
                employerName={planItem.employer_name ?? undefined}
                userCode={userCode ?? undefined}
                title="Report communications"
                onChanged={commStatus.refresh}
                actions={REPORT_ACTIONS}
                visibilityContext={commActionContext}
              />
            )}
            <Card>
              <CardHeader>
                <CardTitle>Employer Audit Report</CardTitle>
              </CardHeader>
              <CardContent>
                {inspectionId ? (
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/compliance/field/audit-report/${inspectionId}`)}
                  >
                    <FileText className="h-4 w-4 mr-1" /> Open Report
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Report becomes available after the session is started.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <PlayCircle className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              Start an audit session to begin recording evidence, findings and the audit report.
            </p>
            <Button onClick={() => setShowStartDialog(true)}>
              <PlayCircle className="h-4 w-4 mr-1" /> Start Audit Session
            </Button>
          </CardContent>
        </Card>
      )}

      <StartSessionDialog
        open={showStartDialog}
        onOpenChange={setShowStartDialog}
        planItemId={planItemId}
        onStarted={load}
      />

      <CloseSessionDialog
        open={showCloseDialog}
        onOpenChange={setShowCloseDialog}
        inspectionId={inspectionId}
        gate={gate}
        onClosed={load}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <div className="text-lg font-bold">{value}</div>
            <div className="text-xs text-muted-foreground">
              {label}
              {sub && <span className="ml-1">• {sub}</span>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SessionStrip({ inspection }: { inspection: any }) {
  if (!inspection?.session_started_at) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-3 text-sm text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Audit session not yet started.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
        <div>
          <span className="text-muted-foreground">Mode:</span>{' '}
          <Badge variant="outline">{inspection.execution_mode ?? 'ONSITE'}</Badge>
        </div>
        <div>
          <span className="text-muted-foreground">Started:</span>{' '}
          {new Date(inspection.session_started_at).toLocaleString()}
        </div>
        {inspection.session_closed_at && (
          <div>
            <span className="text-muted-foreground">Closed:</span>{' '}
            {new Date(inspection.session_closed_at).toLocaleString()}
          </div>
        )}
        {(inspection.check_in_gps_lat || inspection.gps_lat) && (
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            GPS captured
          </div>
        )}
        {inspection.gps_unavailable_reason && (
          <div className="text-warning">No GPS: {inspection.gps_unavailable_reason}</div>
        )}
      </CardContent>
    </Card>
  );
}

function CompletionGatePanel({
  gate,
  commAdvisory,
  inspectionId,
  employerId,
  employerName,
  userCode,
  commStatus,
  itemsByType,
  gateContext,
  onCommChanged,
  commActionContext,
  orchestratorBlockers,
  orchestratorReady,
  nextRecommendedLabel,
}: {
  gate: CompletionGateResult;
  commAdvisory?: string | null;
  inspectionId?: string;
  employerId?: string;
  employerName?: string;
  userCode?: string;
  commStatus?: { total: number; sent: number; pending: number; failed: number; finalStageIssued: boolean };
  itemsByType?: Partial<Record<import('@/types/auditCommunication').CeCommType, import('@/types/auditCommunication').AuditCommunication[]>>;
  gateContext?: import('@/components/compliance/communication/CommunicationGateChecks').CommunicationGateContext;
  onCommChanged?: () => void;
  commActionContext?: import('@/components/compliance/communication/ContextualCommActions').CommActionVisibilityContext;
  /** Orchestrator-derived blockers (composed across status + triggers + approvals). */
  orchestratorBlockers?: string[];
  orchestratorReady?: boolean;
  nextRecommendedLabel?: string | null;
}) {
  const headerColor = gate.ready
    ? 'text-success'
    : gate.enforcementMode === 'SOFT_WARNING'
    ? 'text-warning'
    : 'text-destructive';
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className={`text-base flex items-center gap-2 ${headerColor}`}>
          {gate.ready ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          Completion Gate — {gate.enforcementMode.replace('_', ' ')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2">
          {gate.checks.map((c) => (
            <li key={c.key} className="flex items-start gap-2 text-sm">
              {c.passed ? (
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
              ) : (
                <XCircle
                  className={`h-4 w-4 mt-0.5 ${
                    c.required ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                />
              )}
              <div className="flex-1">
                <div>
                  {c.label}
                  {!c.required && (
                    <span className="text-xs text-muted-foreground ml-1">(optional)</span>
                  )}
                </div>
                {c.detail && (
                  <div className="text-xs text-muted-foreground">{c.detail}</div>
                )}
              </div>
            </li>
          ))}
        </ul>

        {commAdvisory && (
          <div className="rounded border border-warning/30 bg-warning/5 p-2 text-xs text-warning flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{commAdvisory}</span>
          </div>
        )}

        {/* Orchestrator-derived communications gate sub-section.
            Composes status + triggers + approval signals into a single
            advisory list so the auditor sees every communication blocker
            in one place — not scattered across tabs. */}
        {(orchestratorBlockers && orchestratorBlockers.length > 0) || nextRecommendedLabel ? (
          <div
            className={`rounded border p-2 text-xs space-y-1.5 ${
              orchestratorReady
                ? 'border-success/30 bg-success/5'
                : 'border-warning/30 bg-warning/5'
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              {orchestratorReady ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
              )}
              <span>Communications gate</span>
            </div>
            {orchestratorBlockers && orchestratorBlockers.length > 0 && (
              <ul className="list-disc list-inside text-warning space-y-0.5">
                {orchestratorBlockers.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}
            {nextRecommendedLabel && (
              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">Next recommended:</span>{' '}
                {nextRecommendedLabel}
              </div>
            )}
          </div>
        ) : null}

        {commStatus && (
          <div className="rounded border bg-card p-2 text-xs flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-medium">Pending communication obligations:</span>
            <span className="flex items-center gap-1">
              <Badge variant="outline">{commStatus.total}</Badge> total
            </span>
            <span className="flex items-center gap-1">
              <Badge variant="secondary">{commStatus.pending}</Badge> awaiting send
            </span>
            <span className="flex items-center gap-1">
              <Badge variant={commStatus.failed > 0 ? 'destructive' : 'outline'}>
                {commStatus.failed}
              </Badge>{' '}
              failed
            </span>
            <span className="flex items-center gap-1">
              <Badge variant={commStatus.finalStageIssued ? 'default' : 'outline'}>
                {commStatus.finalStageIssued ? 'Final issued' : 'Final not issued'}
              </Badge>
            </span>
          </div>
        )}

        {itemsByType && gateContext && (
          <CommunicationGateChecks
            itemsByType={itemsByType}
            context={gateContext}
            onQuickSend={() => {
              // The actions panel below routes the user to the right composer
              // via field-stage mapping; scrolling there is the cleanest UX.
              document.getElementById('gate-comm-actions')?.scrollIntoView({
                behavior: 'smooth', block: 'center',
              });
            }}
          />
        )}

        {inspectionId && employerId && (
          <div id="gate-comm-actions">
            <ContextualCommActions
              inspectionId={inspectionId}
              employerId={employerId}
              employerName={employerName}
              userCode={userCode}
              title="Gate communications"
              onChanged={onCommChanged}
              actions={GATE_ACTIONS}
              visibilityContext={commActionContext}
              hideIfEmpty
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Map findingsByseverity → highest severity present (or NONE). */
function deriveMaxSeverity(metrics: any): 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const sev = metrics?.findingsByseverity;
  if (!sev) return 'NONE';
  if ((sev.Critical ?? 0) > 0) return 'CRITICAL';
  if ((sev.High ?? 0) > 0) return 'HIGH';
  if ((sev.Medium ?? 0) > 0) return 'MEDIUM';
  if ((sev.Low ?? 0) > 0) return 'LOW';
  return 'NONE';
}

function StartSessionDialog({
  open,
  onOpenChange,
  planItemId,
  onStarted,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  planItemId: string;
  onStarted: () => void;
}) {
  const [mode, setMode] = useState<ExecutionMode>('ONSITE');
  const [gpsLat, setGpsLat] = useState<number | undefined>();
  const [gpsLng, setGpsLng] = useState<number | undefined>();
  const [gpsReason, setGpsReason] = useState('');
  const [gpsAttempted, setGpsAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const tryCaptureGps = () => {
    setGpsAttempted(true);
    if (!('geolocation' in navigator)) {
      toast.message('Geolocation not supported on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLat(pos.coords.latitude);
        setGpsLng(pos.coords.longitude);
        toast.success('GPS captured');
      },
      (err) => {
        toast.message(`GPS unavailable: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleStart = async () => {
    if (mode === 'ONSITE' && !gpsLat && !gpsReason.trim()) {
      toast.error('On-site visits need GPS or a reason it is unavailable.');
      return;
    }
    try {
      setSubmitting(true);
      await fieldAuditService.startAuditSession({
        planItemId,
        executionMode: mode,
        gpsLat,
        gpsLng,
        gpsUnavailableReason: !gpsLat ? gpsReason || undefined : undefined,
      });
      toast.success('Audit session started');
      onOpenChange(false);
      onStarted();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to start session');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Audit Session</DialogTitle>
          <DialogDescription>
            GPS capture is optional — desktop and document reviews don't need it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Execution Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as ExecutionMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ONSITE">On-site Visit</SelectItem>
                <SelectItem value="DESKTOP_REVIEW">Desktop Review</SelectItem>
                <SelectItem value="DOCUMENT_REVIEW">Document Review</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>GPS Location</Label>
              <Button type="button" variant="outline" size="sm" onClick={tryCaptureGps}>
                <MapPin className="h-4 w-4 mr-1" /> Capture GPS
              </Button>
            </div>
            {gpsLat && gpsLng ? (
              <div className="text-xs text-success">
                Captured: {gpsLat.toFixed(5)}, {gpsLng.toFixed(5)}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                {gpsAttempted ? 'Not captured.' : 'Not yet captured.'} You can still proceed.
              </div>
            )}
            {!gpsLat && (
              <div>
                <Label className="text-xs">Reason GPS not captured (optional)</Label>
                <Textarea
                  rows={2}
                  value={gpsReason}
                  onChange={(e) => setGpsReason(e.target.value)}
                  placeholder="e.g. desktop session, indoors, denied permission"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleStart} disabled={submitting}>
            {submitting ? 'Starting…' : 'Start Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CloseSessionDialog({
  open,
  onOpenChange,
  inspectionId,
  gate,
  onClosed,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  inspectionId?: string;
  gate: CompletionGateResult | null;
  onClosed: () => void;
}) {
  const [closeNotes, setCloseNotes] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const needsOverride = !!gate && !gate.ready && gate.enforcementMode !== 'SOFT_WARNING';

  const handleClose = async () => {
    if (!inspectionId) return;
    if (needsOverride && !overrideReason.trim()) {
      toast.error('An override reason is required to close with unmet conditions.');
      return;
    }
    try {
      setSubmitting(true);
      await fieldAuditService.closeAuditSession({
        inspectionId,
        closeNotes: closeNotes || undefined,
        overrideReason: needsOverride ? overrideReason : undefined,
      });
      toast.success('Audit session closed');
      onOpenChange(false);
      onClosed();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to close session');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close Audit Session</DialogTitle>
          <DialogDescription>
            {gate?.ready
              ? 'All required completion conditions are satisfied.'
              : `Some required conditions are not met (mode: ${gate?.enforcementMode ?? '—'}).`}
          </DialogDescription>
        </DialogHeader>

        {gate && !gate.ready && (
          <div className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm space-y-1">
            <div className="font-medium text-destructive flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" /> Unmet conditions
            </div>
            <ul className="list-disc pl-5 text-xs">
              {gate.missingRequired.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <Label>Close-out notes</Label>
            <Textarea
              rows={3}
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              placeholder="Outcome summary, next steps…"
            />
          </div>
          {needsOverride && (
            <div>
              <Label className="text-destructive">Override reason (required)</Label>
              <Textarea
                rows={2}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Why are you closing despite unmet conditions?"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleClose} disabled={submitting}>
            {submitting ? 'Closing…' : 'Close Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Contextual communication action catalogs.
//
// Each entry declares: which field-execution stage to consult in the central
// stage→template mapping table, and the preferred comm_types for that action
// (used both to narrow mapped templates and as a zero-config fallback).
// Templates themselves are NEVER hardcoded here — they come from Settings.
// ============================================================================

// ============================================================================
// Contextual action constants
// Each action carries a `visibleWhen(ctx)` predicate that decides whether the
// button should appear. Predicates read only from CommActionVisibilityContext
// (built once in AuditVisitWorkspace) — no side effects, no fetches.
// ============================================================================

const WORKING_PAPERS_ACTIONS: ContextualAction[] = [
  {
    key: 'wp_request_missing_documents',
    label: 'Request Missing Documents',
    description: 'Ask the employer for outstanding books / records discovered during the checklist review.',
    fieldStage: 'during_audit_missing_documents',
    commTypeHints: ['additional_info_request', 'books_required'],
    icon: FileSearch,
    // Only when the checklist is incomplete or evidence is missing.
    visibleWhen: (c) => !!(c.hasMissingDocuments || c.hasMissingEvidence) && !c.sessionClosed,
    hiddenReason: 'Checklist & evidence are complete — no missing items to request.',
  },
  {
    key: 'wp_send_pbc',
    label: 'Send PBC / Document Request',
    description: 'Send the Prepared-By-Client document checklist to the employer.',
    fieldStage: 'during_audit_missing_documents',
    commTypeHints: ['books_required', 'additional_info_request'],
    icon: ClipboardCheck,
    // Most useful before / during fieldwork; hide once session closed.
    visibleWhen: (c) => !c.sessionClosed,
    hiddenReason: 'Visit session is already closed.',
  },
  {
    key: 'wp_reminder_incomplete',
    label: 'Send Reminder (Incomplete Records)',
    description: 'Remind the employer that requested records remain outstanding.',
    fieldStage: 'reminder_stage',
    commTypeHints: ['due_date_reminder', 'visit_reminder'],
    icon: BellRing,
    // Only when there's an outstanding obligation OR something is overdue.
    visibleWhen: (c) => !!(c.hasOpenObligations || c.hasOverdueWithoutResponse),
    hiddenReason: 'No outstanding records / open obligations.',
  },
];

const FINDINGS_ACTIONS: ContextualAction[] = [
  {
    key: 'fn_request_clarification',
    label: 'Request Clarification',
    description: 'Ask the employer to clarify entries flagged in the findings list.',
    fieldStage: 'during_audit_clarification_required',
    commTypeHints: ['clarification_request', 'additional_info_request'],
    icon: HelpCircle,
    // Only when at least one finding exists that may need clarification.
    visibleWhen: (c) => !!c.hasClarificationNeeded,
    hiddenReason: 'No findings recorded yet — nothing to clarify.',
  },
  {
    key: 'fn_send_interim',
    label: 'Send Interim Findings',
    description: 'Share preliminary findings with the employer before the audit closes.',
    fieldStage: 'during_audit_interim_findings',
    commTypeHints: ['interim_findings', 'evidence_summary'],
    icon: FileWarning,
    // Show while session is open AND findings exist (interim by definition).
    visibleWhen: (c) => !!c.hasFindings && !c.sessionClosed,
    hiddenReason: 'Interim findings only apply while the audit is in progress with findings recorded.',
  },
  {
    key: 'fn_followup',
    label: 'Send Findings Follow-up',
    description: 'Follow up on a previously shared finding awaiting response.',
    fieldStage: 'reminder_stage',
    commTypeHints: ['due_date_reminder', 'clarification_request'],
    icon: BellRing,
    // Only when something was previously sent and is overdue / open.
    visibleWhen: (c) => !!(c.hasOverdueWithoutResponse || c.hasOpenObligations),
    hiddenReason: 'No outstanding finding awaiting employer response.',
  },
];

const REPORT_ACTIONS: ContextualAction[] = [
  {
    key: 'rp_send_draft',
    label: 'Send Draft Report',
    description: 'Send the draft audit report to the employer for review.',
    fieldStage: 'post_review_draft_findings',
    commTypeHints: ['draft_findings', 'dispute_instructions'],
    icon: FileSignature,
    // Show only when a report exists but isn't yet approved/issued.
    visibleWhen: (c) => !!c.hasReport && !c.reportApproved,
    hiddenReason: 'No draft report exists yet, or the final report has already been approved.',
  },
  {
    key: 'rp_send_final',
    label: 'Send Final Audit Report',
    description: 'Issue the final, signed audit report to the employer.',
    fieldStage: 'final_report_issuance',
    commTypeHints: ['final_report'],
    icon: FileBadge,
    variant: 'default',
    // Only when the report is approved AND not already issued to employer.
    visibleWhen: (c) => !!c.reportApproved && !c.finalReportIssued,
    hiddenReason: 'Report is not yet approved, or final report has already been issued.',
  },
  {
    key: 'rp_request_ack',
    label: 'Send Report Acknowledgment Request',
    description: 'Request the employer formally acknowledge receipt of the report.',
    fieldStage: 'post_review_draft_findings',
    commTypeHints: ['acknowledgment_request'],
    icon: FileCheck2,
    // Only meaningful once the final report has actually been sent.
    visibleWhen: (c) => !!c.finalReportIssued,
    hiddenReason: 'Final report has not been issued yet.',
  },
];

/** Severity threshold helper — returns true when current ≥ threshold. */
const SEV_RANK: Record<string, number> = { NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
const meetsSeverity = (current?: string, threshold?: string) =>
  (SEV_RANK[current ?? 'NONE'] ?? 0) >= (SEV_RANK[threshold ?? 'MEDIUM'] ?? 2);

const GATE_ACTIONS: ContextualAction[] = [
  {
    key: 'gate_send_reminder',
    label: 'Send Reminder',
    description: 'Send a reminder for outstanding employer obligations.',
    fieldStage: 'reminder_stage',
    commTypeHints: ['due_date_reminder', 'visit_reminder'],
    icon: AlarmClock,
    // Only if obligations are still open / something is overdue.
    visibleWhen: (c) => !!(c.hasOpenObligations || c.hasOverdueWithoutResponse),
    hiddenReason: 'No outstanding obligations to remind about.',
  },
  {
    key: 'gate_send_violation_notice',
    label: 'Send Violation Notice',
    description: 'Issue a violation notice when enforcement conditions are met.',
    fieldStage: 'enforcement_stage',
    commTypeHints: ['violation_notice'],
    icon: ShieldX,
    variant: 'destructive',
    // Enforcement conditions: violations exist AND severity ≥ threshold.
    visibleWhen: (c) =>
      !!c.hasViolations && meetsSeverity(c.maxSeverity, c.enforcementThreshold ?? 'MEDIUM'),
    hiddenReason: 'No violations meet the configured enforcement severity threshold.',
  },
  {
    key: 'gate_trigger_escalation',
    label: 'Trigger Escalation',
    description: 'Issue a formal escalation notice for non-response or non-compliance.',
    fieldStage: 'escalation_stage',
    commTypeHints: ['escalation_notice', 'violation_notice'],
    icon: ShieldX,
    variant: 'destructive',
    // Escalation only when due date has lapsed AND no valid response recorded
    // (i.e. there's an overdue item without acknowledgment).
    visibleWhen: (c) => !!c.hasOverdueWithoutResponse,
    hiddenReason: 'No overdue communications without a recorded response.',
  },
];
