import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Zap, Check, X, Info, Loader2, RefreshCw, Calendar, ArrowRight, ArrowDown, ArrowUp, Users, Clock, Plus, GripVertical } from 'lucide-react';
import { useAutoPlanCandidates, useGenerateAutoPlan, useManualOverride, usePlanningWeights, useFrequencyPolicies, useCapacitySchedule, useConvertCandidates } from '@/hooks/useAutoPlanEngine';
import { DataTable, StatusBadge } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { useUserCode } from '@/hooks/useUserCode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { formatDateForDisplay } from '@/lib/format-config';
import { CandidateDetailPanel } from './CandidateDetailPanel';
import { useIAActiveAuditors, useIADepartments, useIADepartmentFunctions } from '@/hooks/useAuditData';
import { isEditablePlanStatus } from '@/hooks/useAuditPlanWorkflowAccess';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const { data: departments = [] } = useIADepartments();
  const { data: functions = [] } = useIADepartmentFunctions();
  const generatePlan = useGenerateAutoPlan(planId);
  const manualOverride = useManualOverride(planId);
  const capacitySchedule = useCapacitySchedule(planId);
  const convertCandidates = useConvertCandidates(planId);

  const [rejectDialog, setRejectDialog] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detailCandidate, setDetailCandidate] = useState<any>(null);
  const [manualAddOpen, setManualAddOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    department_id: '', function_id: '', objective: '', scope: '', rationale: '', estimated_days: '10',
  });

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

  const handleRemoveFromPlan = (candidateId: string, name: string) => {
    setRejectDialog({ id: candidateId, name });
  };

  const handleReorderUp = (candidateId: string) => {
    manualOverride.mutate({
      override_type: 'reorder_candidate',
      candidate_id: candidateId,
      changes: { direction: 'up' },
      reason: 'Priority reorder',
      changed_by: userCode || 'system',
    });
  };

  const handleReorderDown = (candidateId: string) => {
    manualOverride.mutate({
      override_type: 'reorder_candidate',
      candidate_id: candidateId,
      changes: { direction: 'down' },
      reason: 'Priority reorder',
      changed_by: userCode || 'system',
    });
  };

  const handleManualAdd = () => {
    const dept = departments.find((d: any) => d.id === manualForm.department_id);
    const func = functions.find((f: any) => f.id === manualForm.function_id);
    manualOverride.mutate({
      override_type: 'manual_add_candidate',
      changes: {
        entity_name: func ? `${dept?.name || ''} → ${func.function_name}` : dept?.name || 'Manual Entry',
        department_id: manualForm.department_id,
        function_id: manualForm.function_id || null,
        objective: manualForm.objective,
        scope: manualForm.scope,
        suggested_days: Number(manualForm.estimated_days) || 10,
        reason_codes: ['MANUAL_ADD'],
      },
      reason: manualForm.rationale || 'Manually added engagement',
      changed_by: userCode || 'system',
    });
    setManualAddOpen(false);
    setManualForm({ department_id: '', function_id: '', objective: '', scope: '', rationale: '', estimated_days: '10' });
  };

  const getRiskBadgeVariant = (score: number) => {
    if (score >= 75) return 'Critical';
    if (score >= 50) return 'High';
    if (score >= 25) return 'Medium';
    return 'Low';
  };

  // Split candidates into sections
  const accepted = useMemo(() => candidates.filter((c: any) => c.status === 'Accepted'), [candidates]);
  const suggested = useMemo(() => candidates.filter((c: any) => c.status === 'Suggested'), [candidates]);
  const rejected = useMemo(() => candidates.filter((c: any) => c.status === 'Rejected'), [candidates]);
  const totalAcceptedDays = accepted.reduce((sum: number, c: any) => sum + (Number(c.suggested_days) || 0), 0);
  const totalAcceptedWeeks = Math.ceil(totalAcceptedDays / 5);

  const makeColumns = (section: 'suggested' | 'included'): DataTableColumn<any>[] => [
    ...(section === 'included' ? [{
      key: 'reorder' as const, header: '', render: (r: any) => canEdit ? (
        <div className="flex flex-col gap-0.5">
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleReorderUp(r.id)}><ArrowUp className="h-3 w-3" /></Button>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleReorderDown(r.id)}><ArrowDown className="h-3 w-3" /></Button>
        </div>
      ) : <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />,
    }] : []),
    { key: 'rank_position', header: '#', render: (r: any) => (
      <span className="font-mono text-xs font-bold text-muted-foreground">{r.rank_position}</span>
    )},
    { key: 'entity_name', header: 'Department → Function', render: (r: any) => (
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
    { key: 'composite_score', header: 'Score', render: (r: any) => (
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
              <p className="text-primary mt-1">Click for full breakdown →</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )},
    { key: 'suggested_days', header: 'Est. Days', render: (r: any) => (
      <div className="text-xs">
        <span className="font-semibold">{r.suggested_days || '—'}d</span>
        {r.suggested_days && <span className="text-muted-foreground ml-1">({Math.ceil((r.suggested_days || 0) / 5)}w)</span>}
      </div>
    )},
    { key: 'suggested_start_date', header: 'Dates', render: (r: any) => (
      <div className="text-xs">
        {r.suggested_start_date ? (
          <>
            <span>{formatDateForDisplay(r.suggested_start_date)}</span>
            {r.suggested_end_date && <span className="text-muted-foreground"> → {formatDateForDisplay(r.suggested_end_date)}</span>}
          </>
        ) : <span className="text-muted-foreground">Not scheduled</span>}
      </div>
    )},
    { key: 'suggested_lead_auditor_id', header: 'Lead', render: (r: any) => {
      const name = r.suggested_lead_auditor_id ? getAuditorName(r.suggested_lead_auditor_id) : null;
      return (
        <div className="text-xs">
          {name ? (
            <Badge variant="secondary" className="text-[10px]"><Users className="h-3 w-3 mr-1" />{name}</Badge>
          ) : <span className="text-muted-foreground italic">Unassigned</span>}
        </div>
      );
    }},
    { key: 'last_audit_date', header: 'Last Audit', render: (r: any) => (
      <div className="text-xs">
        {r.last_audit_date ? formatDateForDisplay(r.last_audit_date) : <span className="text-destructive font-medium">Never</span>}
      </div>
    )},
  ];

  const suggestedColumns = makeColumns('suggested');
  const includedColumns = makeColumns('included');

  const filteredFunctions = functions.filter((f: any) => !manualForm.department_id || f.department_id === manualForm.department_id);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Auto-Plan Engine
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Risk-based engagement candidates — add, remove, reorder, or manually include engagements
            </p>
          </div>
          {canEdit && (
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => setManualAddOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Manual Add
              </Button>
              <Button size="sm" onClick={() => generatePlan.mutate()} disabled={generatePlan.isPending}>
                {generatePlan.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                {candidates.length > 0 ? 'Re-Generate' : 'Generate Suggestions'}
              </Button>
            </div>
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
            <div className="space-y-4">
              {/* Summary bar */}
              {candidates.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                  <Badge variant="secondary">{suggested.length} Suggested</Badge>
                  <Badge className="bg-primary text-primary-foreground">{accepted.length} Included</Badge>
                  <Badge variant="destructive">{rejected.length} Excluded</Badge>
                  {accepted.length > 0 && (
                    <>
                      <div className="h-4 w-px bg-border" />
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Plan total: <strong className="text-foreground">{totalAcceptedDays} days ({totalAcceptedWeeks} weeks)</strong></span>
                      </div>
                    </>
                  )}
                  {accepted.length > 0 && canEdit && (
                    <div className="ml-auto flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => capacitySchedule.mutate()} disabled={capacitySchedule.isPending}>
                        {capacitySchedule.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Calendar className="h-4 w-4 mr-1" />}
                        Schedule
                      </Button>
                      <Button size="sm" onClick={() => convertCandidates.mutate(userCode || 'system')} disabled={convertCandidates.isPending}>
                        {convertCandidates.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-1" />}
                        Create Engagements ({accepted.length})
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Two-section tabs */}
              <Tabs defaultValue="included" className="w-full">
                <TabsList>
                  <TabsTrigger value="included">Included in Plan ({accepted.length})</TabsTrigger>
                  <TabsTrigger value="suggested">Suggested ({suggested.length})</TabsTrigger>
                  <TabsTrigger value="excluded">Excluded ({rejected.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="included">
                  {accepted.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      No engagements included yet. Accept suggestions or add manually.
                    </div>
                  ) : (
                    <DataTable
                      columns={includedColumns}
                      data={accepted}
                      renderActions={canEdit ? (row) => (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveFromPlan(row.id, row.entity_name)} title="Remove from plan">
                            <X className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailCandidate(row)}>
                            <Info className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : undefined}
                      emptyMessage="No included engagements."
                    />
                  )}
                </TabsContent>

                <TabsContent value="suggested">
                  {suggested.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      All suggestions have been reviewed.
                    </div>
                  ) : (
                    <>
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 mb-3">
                        <p className="text-xs text-primary">
                          <strong>Review each suggestion:</strong> Accept to include in your plan, or reject with a reason to exclude.
                          Each item shows the risk score and reason for suggestion.
                        </p>
                      </div>
                      <DataTable
                        columns={suggestedColumns}
                        data={suggested}
                        renderActions={canEdit ? (row) => (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => handleAccept(row.id)} title="Include in plan">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setRejectDialog({ id: row.id, name: row.entity_name })} title="Exclude from plan">
                              <X className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailCandidate(row)}>
                              <Info className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : undefined}
                        emptyMessage="No pending suggestions."
                      />
                    </>
                  )}
                </TabsContent>

                <TabsContent value="excluded">
                  {rejected.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">No excluded engagements.</div>
                  ) : (
                    <DataTable
                      columns={[...suggestedColumns, { key: 'exclusion_reason', header: 'Exclusion Reason', render: (r: any) => (
                        <span className="text-xs text-muted-foreground">{r.override_reason || '—'}</span>
                      )}]}
                      data={rejected}
                      renderActions={canEdit ? (row) => (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => handleAccept(row.id)} title="Re-include in plan">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailCandidate(row)}>
                            <Info className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : undefined}
                      emptyMessage="No excluded items."
                    />
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exclusion Reason Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Exclude from Plan</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Excluding: <strong>{rejectDialog?.name}</strong>
          </p>
          <div className="space-y-2">
            <Label>Exclusion Reason *</Label>
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
              Confirm Exclusion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Add Dialog */}
      <Dialog open={manualAddOpen} onOpenChange={setManualAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manually Add Engagement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Department *</Label>
              <Select value={manualForm.department_id} onValueChange={(v) => setManualForm({ ...manualForm, department_id: v, function_id: '' })}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Function</Label>
              <Select value={manualForm.function_id} onValueChange={(v) => setManualForm({ ...manualForm, function_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select function (optional)" /></SelectTrigger>
                <SelectContent>
                  {filteredFunctions.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.function_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Objective *</Label>
              <Textarea value={manualForm.objective} onChange={(e) => setManualForm({ ...manualForm, objective: e.target.value })} placeholder="What is the objective of this audit?" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Textarea value={manualForm.scope} onChange={(e) => setManualForm({ ...manualForm, scope: e.target.value })} placeholder="Define the scope..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Estimated Days</Label>
                <Input type="number" value={manualForm.estimated_days} onChange={(e) => setManualForm({ ...manualForm, estimated_days: e.target.value })} min="1" />
              </div>
              <div className="space-y-2">
                <Label>Rationale *</Label>
                <Input value={manualForm.rationale} onChange={(e) => setManualForm({ ...manualForm, rationale: e.target.value })} placeholder="Why include this?" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualAddOpen(false)}>Cancel</Button>
            <Button onClick={handleManualAdd} disabled={!manualForm.department_id || !manualForm.objective || !manualForm.rationale}>
              Add to Plan
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
