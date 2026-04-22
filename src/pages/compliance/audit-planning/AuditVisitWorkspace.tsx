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
import {
  ContextualCommActions,
  type ContextualAction,
} from '@/components/compliance/communication/ContextualCommActions';
import { useVisitCommunicationStatus } from '@/hooks/useVisitCommunicationStatus';
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
          onCommChanged={commStatus.refresh}
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
        <Tabs defaultValue="checklist" className="w-full">
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
  onCommChanged,
}: {
  gate: CompletionGateResult;
  commAdvisory?: string | null;
  inspectionId?: string;
  employerId?: string;
  employerName?: string;
  userCode?: string;
  commStatus?: { total: number; sent: number; pending: number; failed: number; finalStageIssued: boolean };
  onCommChanged?: () => void;
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

        {inspectionId && employerId && (
          <ContextualCommActions
            inspectionId={inspectionId}
            employerId={employerId}
            employerName={employerName}
            userCode={userCode}
            title="Gate communications"
            onChanged={onCommChanged}
            actions={GATE_ACTIONS}
            hideIfEmpty
          />
        )}
      </CardContent>
    </Card>
  );
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
