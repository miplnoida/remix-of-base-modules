import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Zap, Check, X, Info, Loader2, RefreshCw, Calendar, ArrowRight } from 'lucide-react';
import { useAutoPlanCandidates, useGenerateAutoPlan, useManualOverride, usePlanningWeights, useFrequencyPolicies, useCapacitySchedule, useConvertCandidates } from '@/hooks/useAutoPlanEngine';
import { DataTable, StatusBadge } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { useUserCode } from '@/hooks/useUserCode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { formatDateForDisplay } from '@/lib/format-config';

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

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{Math.round(value)}</span>
      </div>
      <Progress value={value} className={`h-1.5 ${color}`} />
    </div>
  );
}

export function AutoPlanSuggestions({ planId, planStatus }: AutoPlanSuggestionsProps) {
  const { userCode } = useUserCode();
  const { data: candidates = [], isLoading } = useAutoPlanCandidates(planId);
  const { data: weights = [] } = usePlanningWeights();
  const { data: policies = [] } = useFrequencyPolicies();
  const generatePlan = useGenerateAutoPlan(planId);
  const manualOverride = useManualOverride(planId);
  const capacitySchedule = useCapacitySchedule(planId);
  const convertCandidates = useConvertCandidates(planId);

  const [rejectDialog, setRejectDialog] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detailCandidate, setDetailCandidate] = useState<any>(null);

  const canEdit = ['Draft', 'Revision'].includes(planStatus);

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

  const columns: DataTableColumn<any>[] = [
    { key: 'rank_position', header: '#', render: (r) => (
      <span className="font-mono text-xs font-bold text-muted-foreground">{r.rank_position}</span>
    )},
    { key: 'entity_name', header: 'Department → Function', render: (r) => (
      <div>
        <p className="text-sm font-medium">{r.entity_name}</p>
        <div className="flex gap-1 mt-1 flex-wrap">
          {(r.reason_codes || []).map((code: string, i: number) => (
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
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )},
    { key: 'last_audit_date', header: 'Last Audit', render: (r) => (
      <div className="text-xs">
        {r.last_audit_date ? formatDateForDisplay(r.last_audit_date) : <span className="text-destructive font-medium">Never</span>}
      </div>
    )},
    { key: 'is_overdue', header: 'Overdue', render: (r) => r.is_overdue ? (
      <Badge variant="destructive" className="text-[10px]">Overdue</Badge>
    ) : (
      <Badge variant="secondary" className="text-[10px]">On Track</Badge>
    )},
    { key: 'status', header: 'Decision', render: (r) => <StatusBadge status={r.status || 'Suggested'} /> },
  ];

  const suggested = candidates.filter((c: any) => c.status === 'Suggested');
  const accepted = candidates.filter((c: any) => c.status === 'Accepted');
  const rejected = candidates.filter((c: any) => c.status === 'Rejected');

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
              System-generated engagement candidates ranked by multi-factor priority scoring
              (Risk {((weights.find((w: any) => w.factor_key === 'risk')?.weight || 0.35) * 100).toFixed(0)}%
              + Recency {((weights.find((w: any) => w.factor_key === 'recency')?.weight || 0.20) * 100).toFixed(0)}%
              + Findings {((weights.find((w: any) => w.factor_key === 'findings')?.weight || 0.15) * 100).toFixed(0)}%
              + Follow-up {((weights.find((w: any) => w.factor_key === 'followup')?.weight || 0.10) * 100).toFixed(0)}%
              + Compliance {((weights.find((w: any) => w.factor_key === 'compliance')?.weight || 0.10) * 100).toFixed(0)}%
              + Change {((weights.find((w: any) => w.factor_key === 'change')?.weight || 0.10) * 100).toFixed(0)}%)
            </p>
          </div>
          {canEdit && (
            <Button
              size="sm"
              onClick={() => generatePlan.mutate()}
              disabled={generatePlan.isPending}
            >
              {generatePlan.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              {candidates.length > 0 ? 'Re-Generate' : 'Generate Suggestions'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {candidates.length === 0 && !isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No auto-plan candidates generated yet.</p>
              <p className="text-xs mt-1">Click "Generate Suggestions" to build a risk-based engagement proposal.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {candidates.length > 0 && (
                <div className="flex gap-3 text-xs">
                  <Badge variant="secondary">{suggested.length} Suggested</Badge>
                  <Badge variant="default" className="bg-green-600">{accepted.length} Accepted</Badge>
                  <Badge variant="destructive">{rejected.length} Rejected</Badge>
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

      {/* Score Detail Dialog */}
      <Dialog open={!!detailCandidate} onOpenChange={() => setDetailCandidate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Score Breakdown</DialogTitle>
          </DialogHeader>
          {detailCandidate && (
            <div className="space-y-4">
              <div>
                <p className="font-medium text-sm">{detailCandidate.entity_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold">{Math.round(detailCandidate.composite_score)}</span>
                  <StatusBadge status={getRiskBadgeVariant(detailCandidate.composite_score)} />
                </div>
              </div>

              <div className="space-y-3">
                <ScoreBar label="Risk Assessment" value={detailCandidate.risk_score} color="[&>div]:bg-red-500" />
                <ScoreBar label="Audit Recency" value={detailCandidate.recency_score} color="[&>div]:bg-amber-500" />
                <ScoreBar label="Outstanding Findings" value={detailCandidate.findings_score} color="[&>div]:bg-orange-500" />
                <ScoreBar label="Overdue Follow-Ups" value={detailCandidate.followup_score} color="[&>div]:bg-purple-500" />
                <ScoreBar label="Compliance Frequency" value={detailCandidate.compliance_score} color="[&>div]:bg-blue-500" />
                <ScoreBar label="Change Events" value={detailCandidate.change_score} color="[&>div]:bg-emerald-500" />
              </div>

              <div className="border-t pt-3 space-y-1 text-xs text-muted-foreground">
                <p>Last Audit: {detailCandidate.last_audit_date ? formatDateForDisplay(detailCandidate.last_audit_date) : 'Never audited'}</p>
                <p>Frequency Policy: Every {detailCandidate.frequency_policy_months || '—'} months</p>
                <p>Status: {detailCandidate.is_overdue ? '⚠️ Overdue' : '✅ Within cycle'}</p>
              </div>

              <div className="flex gap-1 flex-wrap">
                {(detailCandidate.reason_codes || []).map((code: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {REASON_LABELS[code] || code}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
