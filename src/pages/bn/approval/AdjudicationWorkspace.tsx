import { useUserCode } from '@/hooks/useUserCode';
/**
 * Screen 10: Approval / Adjudication Workspace
 * 
 * Full claim context for supervisor decision-making with maker-checker
 * enforcement, entitlement impact preview, and decision controls.
 * 
 * Roles: Supervisor (approve/disallow), Manager (override), Director (escalated)
 * Tables: bn_claim, bn_claim_eligibility, bn_claim_calculation, bn_claim_calculation_line,
 *   bn_claim_evidence, bn_claim_decision, bn_claim_event, bn_entitlement, bn_product
 */
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, Loader2, Gavel, CheckCircle, XCircle, AlertTriangle,
  ShieldCheck, Calculator, FileCheck, ShieldAlert, CornerDownLeft,
  FileSearch, History,
} from 'lucide-react';
import { toast } from 'sonner';
import { BnEmptyState, BnStatusBadge, BnStatCard } from '@/components/bn/shared';
import { useBnDeterminationContext } from '@/hooks/bn/useBnDetermination';
import { useBnApprovalCaseSummary, useExecuteApprovalAction } from '@/hooks/bn/useBnApprovalConsole';
import { useBnReasonCodes } from '@/hooks/bn/useBnDecisionEngine';
import { APPROVAL_ACTIONS, APPROVAL_ROLE_MATRIX, type ApprovalAction } from '@/services/bn/approvalConsoleService';
import { formatDateForDisplay } from '@/lib/format-config';

const actionIcons: Record<string, React.ElementType> = {
  APPROVE: CheckCircle,
  DISALLOW: XCircle,
  REQUEST_EVIDENCE: FileSearch,
  OVERRIDE: ShieldAlert,
  SEND_BACK: CornerDownLeft,
};

export default function AdjudicationWorkspace() {
  const { claimId } = useParams<{ claimId: string }>();
  const navigate = useNavigate();

  const { data: ctx, isLoading: ctxLoading } = useBnDeterminationContext(claimId);
  const { data: caseSummary, isLoading: caseLoading } = useBnApprovalCaseSummary(claimId || undefined);
  const executeAction = useExecuteApprovalAction();

  const [dialogAction, setDialogAction] = useState<ApprovalAction | null>(null);
  const [narrative, setNarrative] = useState('');
  const [reasonCodeId, setReasonCodeId] = useState('');

  const { data: reasonCodes } = useBnReasonCodes(dialogAction?.action);

  const userRoles = ['admin', 'supervisor'];
  const { userCode: _uc } = useUserCode(); const userCode = _uc ?? '';
  const highestRole = userRoles.find(r => APPROVAL_ROLE_MATRIX[r.toUpperCase()]?.canAct) || '';
  const roleConfig = APPROVAL_ROLE_MATRIX[highestRole.toUpperCase()];
  const allowedActions = roleConfig?.actions ?? [];

  const isLoading = ctxLoading || caseLoading;
  const isMaker = caseSummary?.makerUserCode && userCode === caseSummary.makerUserCode;
  const isAdmin = userRoles.some(r => r.toLowerCase() === 'admin');

  const handleActionClick = (action: ApprovalAction) => {
    setDialogAction(action);
    setNarrative('');
    setReasonCodeId('');
  };

  const handleConfirm = () => {
    if (!dialogAction || !claimId) return;
    if (dialogAction.requiresNarrative && !narrative.trim()) {
      toast.error('Narrative is required.');
      return;
    }
    if (dialogAction.requiresReasonCode && !reasonCodeId) {
      toast.error('Please select a reason code.');
      return;
    }
    executeAction.mutate(
      { claimId, action: dialogAction.action, narrative, reasonCodeId: reasonCodeId || undefined, performedBy: userCode },
      {
        onSuccess: (res) => {
          toast.success(`${dialogAction.action} completed. Status → ${res.newStatus}`);
          setDialogAction(null);
        },
        onError: (err: any) => toast.error(`Action failed: ${err.message}`),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ctx || !caseSummary) {
    return (
      <div className="p-6">
        <BnEmptyState type="error" description="Could not load adjudication workspace." />
      </div>
    );
  }

  const latestElig = ctx.eligibilityResults[0];
  const latestCalc = ctx.calculationSnapshots[0];

  return (
    <div className="space-y-4 p-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="t-page-title flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" />
            Adjudication Workspace
          </h1>
          <p className="text-sm text-muted-foreground">
            Claim {ctx.claim.claim_number || ctx.claim.id.slice(0, 8)} • <BnStatusBadge status={ctx.claim.status} />
          </p>
        </div>
        {isMaker && !isAdmin && (
          <Badge variant="outline" className="border-amber-500 text-amber-600">
            Maker-Checker: Your submission
          </Badge>
        )}
      </div>

      {/* Claim Context Banner */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">SSN</p>
              <p className="text-sm font-mono font-medium">{ctx.claim.ssn}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Benefit</p>
              <p className="text-sm font-medium">{ctx.product?.benefit_name || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Claim Date</p>
              <p className="text-sm">{formatDateForDisplay(ctx.claim.claim_date)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Priority</p>
              <Badge variant={ctx.claim.priority === 'URGENT' ? 'destructive' : 'secondary'} className="text-xs">
                {ctx.claim.priority}
              </Badge>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Submitted By</p>
              <p className="text-sm font-mono">{caseSummary.makerUserCode || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Status</p>
              <BnStatusBadge status={ctx.claim.status} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Decision Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className={latestElig?.overall_result || latestElig?.override_applied ? 'border-green-500/20' : 'border-destructive/20'}>
          <CardContent className="py-3 flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Eligibility</p>
              {latestElig ? (
                <Badge className={latestElig.overall_result ? 'bg-green-600 text-white' : ''} variant={latestElig.overall_result ? 'default' : 'destructive'}>
                  {latestElig.overall_result ? 'PASSED' : 'FAILED'}
                  {latestElig.override_applied ? ' (Override)' : ''}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">Not checked</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={latestCalc ? 'border-green-500/20' : ''}>
          <CardContent className="py-3 flex items-center gap-3">
            <Calculator className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Calculation</p>
              {latestCalc ? (
                <p className="font-mono font-bold text-lg">${(latestCalc.total_payable ?? 0).toFixed(2)}</p>
              ) : (
                <span className="text-sm text-muted-foreground">Not calculated</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={ctx.evidenceSummary.complete ? 'border-green-500/20' : 'border-amber-500/20'}>
          <CardContent className="py-3 flex items-center gap-3">
            <FileCheck className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Evidence</p>
              <Badge variant={ctx.evidenceSummary.complete ? 'default' : 'destructive'} className={ctx.evidenceSummary.complete ? 'bg-green-600 text-white' : ''}>
                {ctx.evidenceSummary.complete ? 'Complete' : `${ctx.evidenceSummary.missing + ctx.evidenceSummary.pending} pending`}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-3 flex items-center gap-3">
            <History className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Decisions</p>
              <p className="text-lg font-bold">{ctx.decisions.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warnings */}
      {ctx.warnings.filter(w => w.severity !== 'INFO').length > 0 && (
        <Card className="border-amber-500/30">
          <CardContent className="py-3 space-y-2">
            {ctx.warnings.filter(w => w.severity !== 'INFO').map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${w.severity === 'BLOCK' || w.severity === 'ERROR' ? 'text-destructive' : 'text-amber-500'}`} />
                <span>{w.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tabbed Detail View */}
      <Tabs defaultValue="calculation">
        <TabsList>
          <TabsTrigger value="calculation">Calculation ({latestCalc?.lines.length ?? 0} lines)</TabsTrigger>
          <TabsTrigger value="eligibility">Eligibility ({((latestElig?.rule_results || []) as any[]).length} rules)</TabsTrigger>
          <TabsTrigger value="decisions">Decision Trail ({ctx.decisions.length})</TabsTrigger>
          <TabsTrigger value="evidence">Evidence ({ctx.evidenceSummary.total})</TabsTrigger>
        </TabsList>

        <TabsContent value="calculation">
          {latestCalc ? (
            <Card>
              <CardContent className="p-0">
                <div className="grid grid-cols-4 gap-3 p-4">
                  <div className="rounded border p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Weekly Rate</p>
                    <p className="font-mono font-bold">${(latestCalc.weekly_rate ?? 0).toFixed(2)}</p>
                  </div>
                  <div className="rounded border p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Lump Sum</p>
                    <p className="font-mono font-bold">${(latestCalc.lump_sum ?? 0).toFixed(2)}</p>
                  </div>
                  <div className="rounded border p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Total Payable</p>
                    <p className="font-mono font-bold text-lg">${(latestCalc.total_payable ?? 0).toFixed(2)}</p>
                  </div>
                  <div className="rounded border p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Duration</p>
                    <p className="font-mono font-bold">{latestCalc.duration_weeks ?? '—'} wks</p>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Line</TableHead>
                      <TableHead>Formula</TableHead>
                      <TableHead className="text-right">Result</TableHead>
                      <TableHead>Explanation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {latestCalc.lines.sort((a, b) => a.line_number - b.line_number).map(line => (
                      <TableRow key={line.id}>
                        <TableCell className="text-xs font-mono">{line.line_number}</TableCell>
                        <TableCell className="text-sm font-medium">{line.line_label}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground max-w-32 truncate">{line.formula_expression || '—'}</TableCell>
                        <TableCell className="text-right font-mono font-bold">${line.output_value.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-40 truncate">{line.explanation || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-8"><BnEmptyState type="empty" title="No calculation" /></CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="eligibility">
          {latestElig ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Rule</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead>Actual</TableHead>
                      <TableHead>Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {((latestElig.rule_results || []) as any[]).map((rule: any, i: number) => (
                      <TableRow key={i} className={!rule.passed ? 'bg-destructive/5' : ''}>
                        <TableCell>
                          {rule.passed ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{rule.ruleName || rule.ruleCode}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{rule.ruleGroup || '—'}</TableCell>
                        <TableCell className="text-sm font-mono">{String(rule.requiredValue ?? '—')}</TableCell>
                        <TableCell className="text-sm font-mono">{String(rule.actualValue ?? '—')}</TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium ${rule.passed ? 'text-green-600' : 'text-destructive'}`}>
                            {rule.passed ? 'Pass' : rule.message || 'Fail'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-8"><BnEmptyState type="empty" title="No eligibility check" /></CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="decisions">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Narrative</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ctx.decisions.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">No decisions yet.</TableCell></TableRow>
                  )}
                  {ctx.decisions.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="text-sm font-medium">{d.action_code}</TableCell>
                      <TableCell><BnStatusBadge status={d.from_status} /></TableCell>
                      <TableCell><BnStatusBadge status={d.to_status} /></TableCell>
                      <TableCell className="text-xs max-w-48 truncate">{d.narrative || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{d.performed_by}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateForDisplay(d.performed_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evidence">
          <Card>
            <CardContent className="py-4">
              <div className="grid grid-cols-4 gap-3">
                <BnStatCard title="Verified" value={ctx.evidenceSummary.verified} icon={CheckCircle} />
                <BnStatCard title="Pending" value={ctx.evidenceSummary.pending} icon={AlertTriangle} />
                <BnStatCard title="Missing" value={ctx.evidenceSummary.missing} icon={XCircle} />
                <BnStatCard title="Total" value={ctx.evidenceSummary.total} icon={FileCheck} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Bar */}
      <div className="sticky bottom-0 z-10 rounded-lg border bg-card p-3 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground mr-2">Decision:</span>
          {APPROVAL_ACTIONS.filter(a => allowedActions.includes(a.action)).map(action => {
            const Icon = actionIcons[action.action] || CheckCircle;
            const blocked = action.preconditions.includes('maker_checker') && isMaker && !isAdmin;
            return (
              <Button
                key={action.action}
                variant={action.variant}
                size="sm"
                disabled={blocked || executeAction.isPending}
                title={blocked ? 'Maker-checker: cannot act on own submission' : action.entitlementImpact}
                onClick={() => handleActionClick(action)}
              >
                <Icon className="h-3.5 w-3.5 mr-1" />
                {action.label}
              </Button>
            );
          })}
          {isMaker && !isAdmin && (
            <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 ml-2">
              Maker-checker: your submission
            </Badge>
          )}
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog open={!!dialogAction} onOpenChange={() => setDialogAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogAction?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {dialogAction?.requiresReasonCode && (
              <div>
                <Label>Reason Code</Label>
                <Select value={reasonCodeId} onValueChange={setReasonCodeId}>
                  <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
                  <SelectContent>
                    {(reasonCodes ?? []).map((rc: any) => (
                      <SelectItem key={rc.id} value={rc.id}>{rc.reason_label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Narrative / Justification</Label>
              <Textarea value={narrative} onChange={e => setNarrative(e.target.value)} placeholder="Enter justification..." rows={4} />
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p><strong>Workflow:</strong> {dialogAction?.workflowTransition}</p>
              <p><strong>Entitlement:</strong> {dialogAction?.entitlementImpact}</p>
              <p><strong>Notification:</strong> {dialogAction?.notificationTrigger || 'None'}</p>
              <p><strong>Audit:</strong> {dialogAction?.auditEvent}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAction(null)}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={executeAction.isPending}>
              Confirm {dialogAction?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
