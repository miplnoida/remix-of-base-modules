import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/common';
import { Briefcase, User, Shield, Calendar, Target, TrendingUp, AlertTriangle, CheckCircle, Clock, MessageSquare } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';
import { LaunchReadinessPanel } from '@/components/audit/LaunchReadinessPanel';
import { AuditNextActionsPanel, deriveNextActions } from '@/components/audit/workspace/AuditNextActionsPanel';
import { Progress } from '@/components/ui/progress';

function InfoRow({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium text-right max-w-[60%] truncate ${highlight ? 'text-primary font-semibold' : ''}`}>{value ?? '—'}</span>
    </div>
  );
}

interface AuditOverviewTabProps {
  audit: any;
  auditId: string;
  execStatus: string;
  auditFindings: any[];
  auditResponses: any[];
  auditActions: any[];
  openFindings: any[];
  overdueActionsCount: number;
  pendingResponsesCount: number;
  getDeptName: (id: string) => string;
  getFunctionName: (id: string) => string;
  getAuditorName: (id: string) => string;
  getPlanTitle: (id: string) => string;
}

export function AuditOverviewTab({
  audit, auditId, execStatus, auditFindings, auditResponses, auditActions,
  openFindings, overdueActionsCount, pendingResponsesCount,
  getDeptName, getFunctionName, getAuditorName, getPlanTitle,
}: AuditOverviewTabProps) {
  // Calculate progress
  const totalSteps = 6; // prep, fieldwork, findings, responses, actions, report
  let completedSteps = 0;
  if (['Fieldwork In Progress', 'Findings Drafting', 'Management Response Pending', 'Final Report Issued', 'Follow-up Monitoring', 'Closed'].includes(execStatus)) completedSteps++;
  if (['Findings Drafting', 'Management Response Pending', 'Final Report Issued', 'Follow-up Monitoring', 'Closed'].includes(execStatus)) completedSteps++;
  if (auditFindings.length > 0) completedSteps++;
  if (auditResponses.length > 0) completedSteps++;
  if (auditActions.length > 0) completedSteps++;
  if (['Final Report Issued', 'Closed'].includes(execStatus)) completedSteps++;
  const progressPct = Math.round((completedSteps / totalSteps) * 100);

  const sourceLabel = audit?.engagement_type === 'Ad Hoc' ? 'Ad Hoc Audit' :
    audit?.engagement_type === 'Supplementary' ? 'Supplementary Plan' :
    audit?.annual_plan_id ? 'Annual Plan' : 'Ad Hoc Audit';

  return (
    <div className="grid gap-5 md:grid-cols-3">
      <div className="md:col-span-2 space-y-4">
        {/* Progress Summary */}
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />Audit Progress
              </h3>
              <span className="text-xs font-bold text-primary">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2 mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MiniStat icon={AlertTriangle} label="Findings" value={auditFindings.length} color="text-amber-600" />
              <MiniStat icon={MessageSquare} label="Responses" value={`${auditResponses.length}/${auditFindings.length}`} color="text-blue-600" />
              <MiniStat icon={CheckCircle} label="Actions" value={auditActions.length} color="text-emerald-600" />
              <MiniStat icon={Clock} label="Overdue" value={overdueActionsCount} color={overdueActionsCount > 0 ? "text-destructive" : "text-muted-foreground"} />
            </div>
          </CardContent>
        </Card>

        {/* Audit Identity */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" />Audit Details</CardTitle></CardHeader>
          <CardContent>
            <InfoRow label="Audit Title" value={audit?.engagement_name} highlight />
            <InfoRow label="Audit Code" value={audit?.engagement_code} />
            <InfoRow label="Source" value={sourceLabel} />
            <InfoRow label="Type" value={audit?.engagement_type || 'Planned Audit'} />
            <InfoRow label="Status" value={<StatusBadge status={audit?.status} />} />
            <InfoRow label="Approval" value={
              audit?.approved_by && audit?.approved_at 
                ? <span className="text-primary font-medium">Approved by {audit.approved_by}</span>
                : <span className="text-muted-foreground">Not yet approved</span>
            } />
            <InfoRow label="Risk Rating" value={<StatusBadge status={audit?.engagement_risk_rating} />} />
            {audit?.annual_plan_id && <InfoRow label="Annual Plan" value={getPlanTitle(audit.annual_plan_id)} />}
            {audit?.launched_at && <InfoRow label="Launched" value={`${formatDateForDisplay(audit.launched_at)} by ${audit.launched_by || '—'}`} />}
          </CardContent>
        </Card>

        {/* Coverage & Team */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />Coverage & Team</CardTitle></CardHeader>
          <CardContent>
            <InfoRow label="Department" value={audit?.department_id ? getDeptName(audit.department_id) : '—'} />
            <InfoRow label="Function" value={audit?.function_id ? getFunctionName(audit.function_id) : '—'} />
            <InfoRow label="Lead Auditor" value={audit?.lead_auditor_id ? getAuditorName(audit.lead_auditor_id) : '—'} />
            <InfoRow label="Reviewer" value={audit?.reviewer_id ? getAuditorName(audit.reviewer_id) : '—'} />
            <InfoRow label="Auditee Contact" value={audit?.auditee_contact || '—'} />
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />Schedule</CardTitle></CardHeader>
          <CardContent>
            <InfoRow label="Planned Start" value={audit?.planned_start_date ? formatDateForDisplay(audit.planned_start_date) : '—'} />
            <InfoRow label="Planned End" value={audit?.planned_end_date ? formatDateForDisplay(audit.planned_end_date) : '—'} />
            <InfoRow label="Actual Start" value={audit?.actual_start_date ? formatDateForDisplay(audit.actual_start_date) : '—'} />
            <InfoRow label="Estimated Days" value={audit?.estimated_days || '—'} />
          </CardContent>
        </Card>

        {/* Scope & Objectives */}
        {(audit?.scope || audit?.objectives || audit?.methodology) && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-muted-foreground" />Scope & Objectives</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {audit?.objectives && <div><p className="text-xs font-medium text-muted-foreground mb-1">Objectives</p><p className="text-sm leading-relaxed whitespace-pre-wrap">{audit.objectives}</p></div>}
              {audit?.scope && <div><p className="text-xs font-medium text-muted-foreground mb-1">Scope</p><p className="text-sm leading-relaxed whitespace-pre-wrap">{audit.scope}</p></div>}
              {audit?.methodology && <div><p className="text-xs font-medium text-muted-foreground mb-1">Methodology</p><p className="text-sm leading-relaxed whitespace-pre-wrap">{audit.methodology}</p></div>}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right sidebar */}
      <div className="space-y-4">
        <LaunchReadinessPanel engagementId={auditId} currentExecutionStatus={execStatus} />
        <AuditNextActionsPanel
          actions={deriveNextActions(audit, {
            findings: auditFindings.length,
            openFindings: openFindings.length,
            responses: auditResponses.length,
            actions: auditActions.length,
            overdueActions: overdueActionsCount,
          })}
        />
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Execution Summary</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <InfoRow label="Findings" value={auditFindings.length} />
            <InfoRow label="Open Findings" value={openFindings.length} />
            <InfoRow label="Pending Responses" value={pendingResponsesCount} />
            <InfoRow label="Actions" value={auditActions.length} />
            <InfoRow label="Overdue Actions" value={overdueActionsCount} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border/50">
      <Icon className={`h-4 w-4 ${color} shrink-0`} />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}
