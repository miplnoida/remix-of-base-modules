import { useUserCode } from '@/hooks/useUserCode';
/**
 * Screen 8: Determination / Recommendation
 * 
 * Provides the claims officer with a summary view of all determination
 * components, a recommendation form, and submission to the approval queue.
 * 
 * Roles: Claims Officer (recommend), Supervisor (override/fast-track)
 * Tables: bn_claim, bn_claim_eligibility, bn_claim_calculation, bn_claim_evidence,
 *   bn_claim_decision, bn_claim_event
 */
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, Loader2, FileText, CheckCircle, XCircle, AlertTriangle,
  ShieldCheck, Calculator, FileCheck, Send, ThumbsDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { BnEmptyState, BnStatusBadge } from '@/components/bn/shared';
import { useBnDeterminationContext, useExecuteDeterminationAction } from '@/hooks/bn/useBnDetermination';
import { useBnReasonCodes } from '@/hooks/bn/useBnDecisionEngine';
import { formatDateForDisplay } from '@/lib/format-config';

type RecommendationType = 'RECOMMEND' | 'DISALLOW_READY';

export default function DeterminationRecommendation() {
  const { id: claimId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: ctx, isLoading, error } = useBnDeterminationContext(claimId);
  const executeAction = useExecuteDeterminationAction();

  const [recommendation, setRecommendation] = useState<RecommendationType | ''>('');
  const [narrative, setNarrative] = useState('');
  const [reasonCodeId, setReasonCodeId] = useState('');

  const { data: reasonCodes } = useBnReasonCodes(recommendation === 'DISALLOW_READY' ? 'DISALLOW_READY' : undefined);

  const { userCode: _uc } = useUserCode(); const userCode = _uc ?? '';

  const handleSubmit = () => {
    if (!claimId || !recommendation) {
      toast.error('Please select a recommendation.');
      return;
    }
    if (!narrative.trim()) {
      toast.error('Narrative justification is required.');
      return;
    }
    if (recommendation === 'DISALLOW_READY' && !reasonCodeId) {
      toast.error('Reason code is required for disallowance.');
      return;
    }

    executeAction.mutate(
      {
        claimId,
        action: recommendation,
        narrative,
        reasonCodeId: reasonCodeId || undefined,
        performedBy: userCode,
      },
      {
        onSuccess: (result) => {
          toast.success(
            recommendation === 'RECOMMEND'
              ? 'Recommendation submitted to approval queue.'
              : 'Disallowance recommendation submitted.'
          );
          navigate(-1);
        },
        onError: (err: any) => toast.error(`Submission failed: ${err.message}`),
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

  if (error || !ctx) {
    return (
      <div className="p-6">
        <BnEmptyState type="error" description="Could not load determination context." />
      </div>
    );
  }

  const eligOk = ctx.eligibilityResults.length > 0 &&
    (ctx.eligibilityResults[0].overall_result || ctx.eligibilityResults[0].override_applied);
  const calcDone = ctx.calculationSnapshots.length > 0;
  const evidComplete = ctx.evidenceSummary.complete;
  const latestCalc = ctx.calculationSnapshots[0];
  const latestElig = ctx.eligibilityResults[0];

  const canRecommend = eligOk && calcDone && evidComplete;
  const canDisallow = ctx.eligibilityResults.length > 0;

  // Readiness checklist
  const checklist = [
    { label: 'Eligibility Checked', ok: ctx.eligibilityResults.length > 0, detail: eligOk ? 'Passed' : 'Failed' },
    { label: 'Eligibility Passed', ok: eligOk, detail: latestElig?.override_applied ? 'Override applied' : eligOk ? 'All rules passed' : 'Not passed' },
    { label: 'Calculation Complete', ok: calcDone, detail: latestCalc ? `$${(latestCalc.total_payable ?? 0).toFixed(2)} total` : 'Not run' },
    { label: 'Evidence Complete', ok: evidComplete, detail: `${ctx.evidenceSummary.verified}/${ctx.evidenceSummary.total} verified` },
    { label: 'No Blocking Warnings', ok: !ctx.warnings.some(w => w.severity === 'BLOCK'), detail: ctx.warnings.filter(w => w.severity === 'BLOCK').length > 0 ? 'Blocking issues exist' : 'Clear' },
  ];

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="t-page-title flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Determination & Recommendation
          </h1>
          <p className="text-sm text-muted-foreground">
            Claim {ctx.claim.claim_number || ctx.claim.id.slice(0, 8)} • <BnStatusBadge status={ctx.claim.status} />
          </p>
        </div>
      </div>

      {/* Readiness Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Decision Readiness Checklist</CardTitle>
          <CardDescription>All items must be satisfied before recommending approval.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-5">
            {checklist.map((item, i) => (
              <div
                key={i}
                className={`rounded-lg border p-3 ${item.ok ? 'border-green-500/30 bg-green-50/50 dark:bg-green-950/10' : 'border-destructive/30 bg-destructive/5'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {item.ok ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Summary Cards */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Eligibility Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {latestElig ? (
              <>
                <div className="flex items-center gap-2">
                  {latestElig.overall_result ? (
                    <Badge className="bg-green-600 text-white">PASSED</Badge>
                  ) : (
                    <Badge variant="destructive">FAILED</Badge>
                  )}
                  {latestElig.override_applied && (
                    <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs">OVERRIDE</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Checked {formatDateForDisplay(latestElig.check_date)} by {latestElig.performed_by}
                </p>
                <p className="text-xs text-muted-foreground">
                  {((latestElig.rule_results || []) as any[]).filter((r: any) => r.passed).length}/
                  {(latestElig.rule_results || []).length} rules passed
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Not checked</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calculator className="h-4 w-4" /> Calculation Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {latestCalc ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Weekly Rate</p>
                    <p className="font-mono font-bold">${(latestCalc.weekly_rate ?? 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Total Payable</p>
                    <p className="font-mono font-bold">${(latestCalc.total_payable ?? 0).toFixed(2)}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {latestCalc.duration_weeks} weeks • {latestCalc.lines.length} calc lines
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Not calculated</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileCheck className="h-4 w-4" /> Evidence Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              {evidComplete ? (
                <Badge className="bg-green-600 text-white text-xs">Complete</Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">Incomplete</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>{ctx.evidenceSummary.verified} verified</p>
              {ctx.evidenceSummary.pending > 0 && <p className="text-amber-600">{ctx.evidenceSummary.pending} pending</p>}
              {ctx.evidenceSummary.missing > 0 && <p className="text-destructive">{ctx.evidenceSummary.missing} missing</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warnings */}
      {ctx.warnings.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" /> Active Warnings ({ctx.warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ctx.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <Badge variant={w.severity === 'ERROR' || w.severity === 'BLOCK' ? 'destructive' : 'secondary'} className="text-[10px] flex-shrink-0">
                  {w.severity}
                </Badge>
                <span>{w.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Recommendation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submit Recommendation</CardTitle>
          <CardDescription>
            Select your recommendation and provide a narrative justification. This will be reviewed by a supervisor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Recommendation</Label>
            <div className="flex gap-3 mt-2">
              <Button
                variant={recommendation === 'RECOMMEND' ? 'default' : 'outline'}
                className={recommendation === 'RECOMMEND' ? 'bg-green-600 hover:bg-green-700' : ''}
                onClick={() => setRecommendation('RECOMMEND')}
                disabled={!canRecommend}
              >
                <Send className="h-4 w-4 mr-2" />
                Recommend Approval
              </Button>
              <Button
                variant={recommendation === 'DISALLOW_READY' ? 'destructive' : 'outline'}
                onClick={() => setRecommendation('DISALLOW_READY')}
                disabled={!canDisallow}
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                Recommend Disallowance
              </Button>
            </div>
            {!canRecommend && recommendation !== 'DISALLOW_READY' && (
              <p className="text-xs text-destructive mt-1">
                Cannot recommend approval — checklist items incomplete.
              </p>
            )}
          </div>

          {recommendation === 'DISALLOW_READY' && (
            <div>
              <Label>Reason Code (required)</Label>
              <Select value={reasonCodeId} onValueChange={setReasonCodeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select disallowance reason..." />
                </SelectTrigger>
                <SelectContent>
                  {(reasonCodes ?? []).map((rc: any) => (
                    <SelectItem key={rc.id} value={rc.id}>
                      {rc.reason_name || rc.reason_label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Narrative Justification (required)</Label>
            <Textarea
              value={narrative}
              onChange={e => setNarrative(e.target.value)}
              placeholder={
                recommendation === 'RECOMMEND'
                  ? 'Summarize why this claim should be approved...'
                  : recommendation === 'DISALLOW_READY'
                  ? 'Explain the grounds for disallowance...'
                  : 'Select a recommendation first...'
              }
              rows={5}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p><strong>Workflow:</strong> {recommendation === 'RECOMMEND' ? 'Claim → DECISION status for supervisor review' : recommendation === 'DISALLOW_READY' ? 'Claim → DENIED status' : '—'}</p>
              <p><strong>Audit:</strong> Decision record + event + notification triggered</p>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!recommendation || !narrative.trim() || executeAction.isPending}
              size="lg"
            >
              {executeAction.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit Recommendation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
