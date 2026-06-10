import { useUserCode } from '@/hooks/useUserCode';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
/**
 * Screen 6: Eligibility Review
 * 
 * Enterprise-grade eligibility review with rule-by-rule breakdown,
 * override controls, history comparison, and audit trail.
 * 
 * Roles: Claims Officer (run checks), Supervisor (override), Auditor (read-only)
 * Tables: bn_claim, bn_claim_eligibility, bn_eligibility_rule, bn_product_version, bn_claim_event
 */
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft, Loader2, ShieldCheck, Play, ShieldAlert, History, CheckCircle,
  XCircle, AlertTriangle, RefreshCw, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { BnEmptyState, BnStatusBadge } from '@/components/bn/shared';
import { useBnDeterminationContext, useBnRuleVersion, useExecuteDeterminationAction } from '@/hooks/bn/useBnDetermination';
import { formatDateForDisplay } from '@/lib/format-config';
import type { EligibilitySnapshot } from '@/services/bn/determinationService';

export default function EligibilityReview() {
  const { id: claimId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: ctx, isLoading, error } = useBnDeterminationContext(claimId);
  const { data: ruleData } = useBnRuleVersion(ctx?.productVersion?.id);
  const executeAction = useExecuteDeterminationAction();

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideRuleCode, setOverrideRuleCode] = useState('');
  const [overrideNarrative, setOverrideNarrative] = useState('');
  const [selectedSnapshot, setSelectedSnapshot] = useState(0);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSnapshot, setCompareSnapshot] = useState(1);

  const { roles: authRoles } = useSupabaseAuth();
  const userRoles = (authRoles ?? []).map((r) => String(r));
  const { userCode: _uc } = useUserCode(); const userCode = _uc ?? '';
  const isSupervisor = userRoles.some((r) =>
    ['BN_SUPERVISOR','BN_MANAGER','BN_DIRECTOR','BN_SENIOR_ELIGIBILITY_OFFICER','admin','Admin']
      .some((s) => s.toLowerCase() === r.toLowerCase())
  );

  const handleRunEligibility = () => {
    if (!claimId) return;
    executeAction.mutate(
      { claimId, action: 'RUN_ELIGIBILITY', performedBy: userCode },
      {
        onSuccess: () => toast.success('Eligibility check completed.'),
        onError: (err: any) => toast.error(`Failed: ${err.message}`),
      }
    );
  };

  const handleOverride = () => {
    if (!claimId || !overrideNarrative.trim()) {
      toast.error('Override narrative is required.');
      return;
    }
    executeAction.mutate(
      {
        claimId,
        action: 'OVERRIDE',
        narrative: overrideNarrative,
        performedBy: userCode,
        overrideField: overrideRuleCode || undefined,
        overrideJustification: overrideNarrative,
      },
      {
        onSuccess: () => {
          toast.success('Override applied successfully.');
          setOverrideOpen(false);
          setOverrideNarrative('');
          setOverrideRuleCode('');
        },
        onError: (err: any) => toast.error(`Override failed: ${err.message}`),
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
        <BnEmptyState type="error" description="Could not load eligibility review context." />
      </div>
    );
  }

  const snapshots = ctx.eligibilityResults;
  const latest = snapshots[selectedSnapshot];
  const rules = (latest?.rule_results || []) as Array<{
    ruleCode?: string; ruleName?: string; ruleGroup?: string; passed?: boolean;
    actualValue?: unknown; requiredValue?: unknown; message?: string; severity?: string;
    ruleType?: string; explanation?: string;
  }>;

  const passedCount = rules.filter(r => r.passed).length;
  const failedCount = rules.filter(r => !r.passed).length;
  const ruleGroups = [...new Set(rules.map(r => r.ruleGroup || 'General'))];

  // Compare snapshot rules
  const compareRules = compareMode && snapshots[compareSnapshot]
    ? (snapshots[compareSnapshot].rule_results || []) as typeof rules
    : [];

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="t-page-title flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Eligibility Review
          </h1>
          <p className="text-sm text-muted-foreground">
            Claim {ctx.claim.claim_number || ctx.claim.id.slice(0, 8)} • SSN {ctx.claim.ssn} •{' '}
            {ctx.product?.benefit_name || 'Unknown Product'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunEligibility}
            disabled={executeAction.isPending}
          >
            {executeAction.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
            {snapshots.length > 0 ? 'Re-Run Check' : 'Run Eligibility'}
          </Button>
          {isSupervisor && latest && !latest.overall_result && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setOverrideOpen(true)}
            >
              <ShieldAlert className="h-3.5 w-3.5 mr-1" />
              Override
            </Button>
          )}
        </div>
      </div>

      {/* Status Banner */}
      {latest && (
        <Card className={latest.overall_result ? 'border-green-500/30 bg-green-50/50 dark:bg-green-950/10' : 'border-destructive/30 bg-destructive/5'}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {latest.overall_result ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : (
                  <XCircle className="h-8 w-8 text-destructive" />
                )}
                <div>
                  <p className="text-lg font-bold">
                    {latest.overall_result ? 'Eligibility PASSED' : 'Eligibility FAILED'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {passedCount} of {rules.length} rules passed • Checked {formatDateForDisplay(latest.check_date)}
                    {latest.performed_by && ` • By ${latest.performed_by}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {latest.override_applied && (
                  <Badge variant="outline" className="border-amber-500 text-amber-600">
                    OVERRIDE APPLIED
                    {latest.override_by && ` by ${latest.override_by}`}
                  </Badge>
                )}
                {snapshots.length > 1 && (
                  <Badge variant="secondary">{snapshots.length} checks</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!latest && (
        <Card>
          <CardContent className="py-8">
            <BnEmptyState
              type="empty"
              title="No Eligibility Check Performed"
              description="Click 'Run Eligibility' to validate this claim against product rules."
            />
          </CardContent>
        </Card>
      )}

      {latest && (
        <Tabs defaultValue="rules">
          <TabsList>
            <TabsTrigger value="rules">Rule Results ({rules.length})</TabsTrigger>
            <TabsTrigger value="groups">By Group ({ruleGroups.length})</TabsTrigger>
            <TabsTrigger value="history">Check History ({snapshots.length})</TabsTrigger>
            {ruleData && <TabsTrigger value="config">Rule Config ({ruleData.eligibilityRules.length})</TabsTrigger>}
          </TabsList>

          {/* Rule Results Tab */}
          <TabsContent value="rules">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Rule-by-Rule Results</CardTitle>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge className="bg-green-600 text-white">{passedCount} passed</Badge>
                    <Badge variant="destructive">{failedCount} failed</Badge>
                    {compareMode && snapshots.length > 1 && (
                      <Select value={String(compareSnapshot)} onValueChange={v => setCompareSnapshot(Number(v))}>
                        <SelectTrigger className="w-40 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {snapshots.map((s, i) => i !== selectedSnapshot && (
                            <SelectItem key={i} value={String(i)}>
                              Check #{i + 1} — {formatDateForDisplay(s.check_date)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {snapshots.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCompareMode(!compareMode)}
                        className="h-7 text-xs"
                      >
                        <History className="h-3 w-3 mr-1" />
                        {compareMode ? 'Exit Compare' : 'Compare'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Rule</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead>Actual</TableHead>
                      <TableHead>Result</TableHead>
                      {compareMode && <TableHead>Previous</TableHead>}
                      <TableHead>Explanation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule, i) => {
                      const prevRule = compareRules.find(r => r.ruleCode === rule.ruleCode);
                      const changed = compareMode && prevRule && prevRule.passed !== rule.passed;
                      return (
                        <TableRow key={i} className={`${!rule.passed ? 'bg-destructive/5' : ''} ${changed ? 'ring-1 ring-amber-400' : ''}`}>
                          <TableCell>
                            {rule.passed ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : rule.severity === 'WARN' ? (
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="text-sm font-medium">{rule.ruleName || rule.ruleCode}</span>
                              {rule.ruleCode && (
                                <span className="block text-[10px] text-muted-foreground font-mono">{rule.ruleCode}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{rule.ruleGroup || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">{rule.ruleType || 'CHECK'}</Badge>
                          </TableCell>
                          <TableCell className="text-sm font-mono">{String(rule.requiredValue ?? '—')}</TableCell>
                          <TableCell className="text-sm font-mono">{String(rule.actualValue ?? '—')}</TableCell>
                          <TableCell>
                            <span className={`text-xs font-medium ${rule.passed ? 'text-green-600' : 'text-destructive'}`}>
                              {rule.passed ? 'Pass' : rule.message || 'Fail'}
                            </span>
                          </TableCell>
                          {compareMode && (
                            <TableCell>
                              {prevRule ? (
                                <span className={`text-xs font-medium ${prevRule.passed ? 'text-green-600' : 'text-destructive'}`}>
                                  {prevRule.passed ? 'Pass' : 'Fail'}
                                  {changed && <RefreshCw className="h-3 w-3 inline ml-1 text-amber-500" />}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                          )}
                          <TableCell className="text-xs text-muted-foreground max-w-48 truncate">
                            {rule.explanation || rule.message || '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* By Group Tab */}
          <TabsContent value="groups">
            <div className="grid gap-4 md:grid-cols-2">
              {ruleGroups.map(group => {
                const groupRules = rules.filter(r => (r.ruleGroup || 'General') === group);
                const groupPassed = groupRules.every(r => r.passed);
                const groupPassCount = groupRules.filter(r => r.passed).length;
                return (
                  <Card key={group} className={groupPassed ? 'border-green-500/20' : 'border-destructive/20'}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          {groupPassed ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                          {group}
                        </span>
                        <Badge variant={groupPassed ? 'default' : 'destructive'} className="text-xs">
                          {groupPassCount}/{groupRules.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                      {groupRules.map((rule, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          {rule.passed ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                          )}
                          <span className={rule.passed ? '' : 'text-destructive font-medium'}>
                            {rule.ruleName || rule.ruleCode}
                          </span>
                          {!rule.passed && rule.message && (
                            <span className="text-xs text-muted-foreground ml-auto truncate max-w-32">{rule.message}</span>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Eligibility Check History</CardTitle>
                <CardDescription>All eligibility checks for this claim, newest first.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Rules</TableHead>
                      <TableHead>Override</TableHead>
                      <TableHead>Performed By</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snapshots.map((snap, i) => {
                      const snapRules = (snap.rule_results || []) as typeof rules;
                      const snapPassed = snapRules.filter(r => r.passed).length;
                      return (
                        <TableRow key={snap.id} className={selectedSnapshot === i ? 'bg-primary/5' : ''}>
                          <TableCell className="text-sm font-mono">#{i + 1}</TableCell>
                          <TableCell className="text-sm">{formatDateForDisplay(snap.check_date)}</TableCell>
                          <TableCell>
                            {snap.overall_result ? (
                              <Badge className="bg-green-600 text-white text-xs">PASSED</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">FAILED</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {snapPassed}/{snapRules.length} passed
                          </TableCell>
                          <TableCell>
                            {snap.override_applied ? (
                              <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                                Override by {snap.override_by}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{snap.performed_by}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-32 truncate">{snap.notes || '—'}</TableCell>
                          <TableCell>
                            <Button
                              variant={selectedSnapshot === i ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => setSelectedSnapshot(i)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rule Config Tab */}
          {ruleData && (
            <TabsContent value="config">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Configured Eligibility Rules</CardTitle>
                  <CardDescription>
                    Active rules from product version v{ruleData.version?.version_number} — read-only reference.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Rule Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Group</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead>Severity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ruleData.eligibilityRules.map((rule: any, i: number) => (
                        <TableRow key={rule.id}>
                          <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="text-sm font-medium">{rule.rule_name}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{rule.rule_code}</TableCell>
                          <TableCell className="text-xs">{rule.rule_group || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">{rule.rule_type || 'CHECK'}</Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono max-w-48 truncate">
                            {rule.condition_expression || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={rule.severity === 'BLOCK' ? 'destructive' : 'secondary'} className="text-[10px]">
                              {rule.severity || 'BLOCK'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}

      {/* Override Dialog */}
      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Eligibility Override
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <strong>Warning:</strong> Overrides bypass eligibility rules and are permanently recorded
                in the audit trail. This action requires supervisor or higher authority.
              </p>
            </div>
            <div>
              <Label>Rule to Override (optional)</Label>
              <Select value={overrideRuleCode} onValueChange={setOverrideRuleCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Override all failed rules..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Failed Rules</SelectItem>
                  {rules.filter(r => !r.passed).map((r, i) => (
                    <SelectItem key={i} value={r.ruleCode || `rule_${i}`}>
                      {r.ruleName || r.ruleCode || `Rule ${i + 1}`} — {r.message}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Justification (required)</Label>
              <Textarea
                value={overrideNarrative}
                onChange={e => setOverrideNarrative(e.target.value)}
                placeholder="Explain why this override is necessary..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideOpen(false)}>Cancel</Button>
            <Button onClick={handleOverride} disabled={executeAction.isPending || !overrideNarrative.trim()}>
              Confirm Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
