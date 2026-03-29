import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Zap, Check, X, Info, Loader2, RefreshCw, Calendar, ArrowRight, Users, Clock } from 'lucide-react';
import { useAutoPlanCandidates, useGenerateAutoPlan, useManualOverride, usePlanningWeights, useFrequencyPolicies, useCapacitySchedule, useConvertCandidates } from '@/hooks/useAutoPlanEngine';
import { DataTable, StatusBadge } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { useUserCode } from '@/hooks/useUserCode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { formatDateForDisplay } from '@/lib/format-config';
import { CandidateDetailPanel } from './CandidateDetailPanel';
import { useIAActiveAuditors } from '@/hooks/useAuditData';
import { isEditablePlanStatus } from '@/hooks/useAuditPlanWorkflowAccess';

interface AutoPlanSuggestionsProps {
  planId: string;
  planStatus: string;
}

const REASON_LABELS: Record<string, string> = {
  HIGH_RISK: 'High Risk Score',
  OVERDUE_FREQUENCY: 'Overdue per Frequency Policy',
  NEVER_AUDITED: 'Never Audited',
  OPEN_FINDINGS: 'Open High/Critical Findings',
  OVERDUE_ACTIONS: 'Overdue Action Items',
  RECENT_CHANGES: 'Recent Organizational Changes',
};

export function AutoPlanSuggestions({ planId, planStatus }: AutoPlanSuggestionsProps) {
  const { userCode } = useUserCode();
  const { data: candidates = [], isLoading } = useAutoPlanCandidates(planId);
  const { data: weights = [] } = usePlanningWeights();
  const { data: policies = [] } = useFrequencyPolicies();
  const { data: auditors = [] } = useIAActiveAuditors();
  const generatePlan = useGenerateAutoPlan(planId);
  const manualOverride = useManualOverride(planId);
  const capacitySchedule = useCapacitySchedule(planId);
  const convertCandidates = useConvertCandidates(planId);

  const [rejectDialog, setRejectDialog] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detailCandidate, setDetailCandidate] = useState<any>(null);

  const canEdit = isEditablePlanStatus(planStatus);

  const getAuditorName = (id: string) => {
    const a = (auditors || []).find((a: any) => a.id === id);
    return a ? (a.name || a.employee_no || 'Auditor') : null;
  };

  const handleAccept = (candidateId: string) => {
    manualOverride.mutate({
      override_type: 'accept_candidate',
      candidate_id: candidateId,
      reason: 'Accepted from auto-plan suggestions',
      changed_by: userCode || 'system',
    });
  };

  const handleReject = () => {
    if (!rejectDialog || !rejectReason.trim()) return;
    manualOverride.mutate({
      override_type: 'reject_candidate',
      candidate_id: rejectDialog.id,
      reason: rejectReason,
      changed_by: userCode || 'system',
    });
    setRejectDialog(null);
    setRejectReason('');
  };

  const getRiskBadgeVariant = (score: number) => {
    if (score >= 75) return 'Critical';
    if (score >= 50) return 'High';
    if (score >= 25) return 'Medium';
    return 'Low';
  };

  // Compute totals for accepted candidates
  const accepted = candidates.filter((c: any) => c.status === 'Accepted');
  const suggested = candidates.filter((c: any) => c.status === 'Suggested');
  const rejected = candidates.filter((c: any) => c.status === 'Rejected');
  const totalAcceptedDays = accepted.reduce((sum: number, c: any) => sum + (Number(c.suggested_days) || 0), 0);
  const totalAcceptedWeeks = Math.ceil(totalAcceptedDays / 5);

  const columns: DataTableColumn<any>[] = [
    { key: 'rank_position', header: '#', render: (r) => (
      <span className="font-mono text-xs font-bold text-muted-foreground">{r.rank_position}</span>
    )},
    { key: 'entity_name', header: 'Department → Function', render: (r) => (
      <div>
        <p className="text-sm font-medium">{r.entity_name}</p>
        <div className="flex gap-1 mt-1 flex-wrap">
          {(r.reason_codes || []).slice(0, 3).map((code: string, i: number) => (
            <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
              {REASON_LABELS[code] || code}
            </Badge>
          ))}
        </div>
      </div>
    )},
    { key: 'composite_score', header: 'Score', render: (r) => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 cursor-help" onClick={() => setDetailCandidate(r)}>
              <span className="font-semibold text-sm">{Math.round(r.composite_score)}</span>
              <StatusBadge status={getRiskBadgeVariant(r.composite_score)} />
            </div>
          </TooltipTrigger>
          <TooltipContent className="w-56">
            <div className="space-y-1 text-xs">
              <p>Risk: {Math.round(r.risk_score)} | Recency: {Math.round(r.recency_score)}</p>
              <p>Findings: {Math.round(r.findings_score)} | Follow-up: {Math.round(r.followup_score)}</p>
              <p>Compliance: {Math.round(r.compliance_score)} | Change: {Math.round(r.change_score)}</p>
              <p className="text-primary mt-1">Click for full breakdown →</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )},
    { key: 'suggested_quarter', header: 'Quarter', render: (r) => (
      <Badge variant="outline" className="text-xs">{r.suggested_quarter || '—'}</Badge>
    )},
    { key: 'suggested_days', header: 'Est. Days', render: (r) => (
      <div className="text-xs">
        <span className="font-semibold">{r.suggested_days || '—'}d</span>
        {r.suggested_days && <span className="text-muted-foreground ml-1">({Math.ceil((r.suggested_days || 0) / 5)}w)</span>}
      </div>
    )},
    { key: 'suggested_start_date', header: 'Suggested Dates', render: (r) => (
      <div className="text-xs">
        {r.suggested_start_date ? (
          <>
            <span>{formatDateForDisplay(r.suggested_start_date)}</span>
            {r.suggested_end_date && (
              <span className="text-muted-foreground"> → {formatDateForDisplay(r.suggested_end_date)}</span>
            )}
          </>
        ) : <span className="text-muted-foreground">Not scheduled</span>}
      </div>
    )},
    { key: 'suggested_lead_auditor_id', header: 'Lead Auditor', render: (r) => {
      const name = r.suggested_lead_auditor_id ? getAuditorName(r.suggested_lead_auditor_id) : null;
      return (
        <div className="text-xs">
          {name ? (
            <Badge variant="secondary" className="text-[10px]">
              <Users className="h-3 w-3 mr-1" />{name}
            </Badge>
          ) : (
            <span className="text-muted-foreground italic">Unassigned</span>
          )}
        </div>
      );
    }},
    { key: 'last_audit_date', header: 'Last Audit', render: (r) => (
      <div className="text-xs">
        {r.last_audit_date ? formatDateForDisplay(r.last_audit_date) : <span className="text-destructive font-medium">Never</span>}
      </div>
    )},
    { key: 'status', header: 'Decision', render: (r) => <StatusBadge status={r.status || 'Suggested'} /> },
  ];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Auto-Plan Suggestions
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Risk-based engagement candidates with auto-populated dates, resources, and estimated effort
            </p>
          </div>
          {canEdit && (
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                onClick={() => generatePlan.mutate()}
                disabled={generatePlan.isPending}
              >
                {generatePlan.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                {candidates.length > 0 ? 'Re-Generate' : 'Generate Suggestions'}
              </Button>
              {accepted.length > 0 && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => capacitySchedule.mutate()}
                    disabled={capacitySchedule.isPending}
                  >
                    {capacitySchedule.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Calendar className="h-4 w-4 mr-1" />}
                    Schedule Capacity
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => convertCandidates.mutate(userCode || 'system')}
                    disabled={convertCandidates.isPending}
                  >
                    {convertCandidates.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-1" />}
                    Create Engagements ({accepted.length})
                  </Button>
                </>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {candidates.length === 0 && !isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No auto-plan candidates generated yet.</p>
              <p className="text-xs mt-1">Click "Generate Suggestions" to build a risk-based engagement proposal with auto-populated dates, resources, and effort estimates.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary bar */}
              {candidates.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                  <Badge variant="secondary">{suggested.length} Suggested</Badge>
                  <Badge variant="default" className="bg-green-600">{accepted.length} Accepted</Badge>
                  <Badge variant="destructive">{rejected.length} Rejected</Badge>
                  {accepted.length > 0 && (
                    <>
                      <div className="h-4 w-px bg-border" />
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Accepted: <strong className="text-foreground">{totalAcceptedDays} days ({totalAcceptedWeeks} weeks)</strong></span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span>Resources: <strong className="text-foreground">{new Set(accepted.map((c: any) => c.suggested_lead_auditor_id).filter(Boolean)).size} auditor(s)</strong></span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Info box about what gets auto-populated */}
              {candidates.length > 0 && accepted.length === 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="text-xs text-primary">
                    <strong>What gets auto-populated when you create engagements:</strong> Engagement name, department & function, risk rating, 
                    quarter & month, estimated days/weeks, start & end dates, lead auditor, scope, objectives, inclusion rationale, 
                    coverage category, expected deliverable, auditee contact, and sequence number. You can edit all fields after creation.
                  </p>
                </div>
              )}

              <DataTable
                columns={columns}
                data={candidates}
                renderActions={canEdit ? (row) => (
                  <div className="flex gap-1">
                    {row.status === 'Suggested' && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700" onClick={() => handleAccept(row.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setRejectDialog({ id: row.id, name: row.entity_name })}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailCandidate(row)}>
                      <Info className="h-4 w-4" />
                    </Button>
                  </div>
                ) : undefined}
                emptyMessage="No candidates found."
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Reason Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Candidate</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Rejecting: <strong>{rejectDialog?.name}</strong>
          </p>
          <div className="space-y-2">
            <Label>Reason for Rejection *</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Provide justification for excluding this function from the plan..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim()}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Score Detail Panel */}
      <CandidateDetailPanel
        candidate={detailCandidate}
        planId={planId}
        open={!!detailCandidate}
        onOpenChange={(open) => { if (!open) setDetailCandidate(null); }}
      />
    </>
  );
}
