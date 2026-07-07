import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  useMigrationDashboardMetrics,
  useMigrationPlans,
  useMigrationBatches,
  useMigrationIssues,
  useValidationRules,
  useValidationResults,
  useReconciliationSummaries,
  useCutoverReadinessChecks,
  usePowerBuilderObjects,
} from '@/platform/migration/useMigration';

const StatCard = ({ label, value, hint, tone = 'default' }: { label: string; value: string | number; hint?: string; tone?: 'default' | 'warn' | 'danger' | 'ok' }) => {
  const toneClass =
    tone === 'danger' ? 'text-destructive' :
    tone === 'warn' ? 'text-amber-600' :
    tone === 'ok' ? 'text-emerald-600' : '';
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className={`text-2xl ${toneClass}`}>{value}</CardTitle>
      </CardHeader>
      {hint && <CardContent className="text-xs text-muted-foreground">{hint}</CardContent>}
    </Card>
  );
};

const StatusBadge = ({ status }: { status: string | null | undefined }) => {
  if (!status) return <Badge variant="outline">—</Badge>;
  const s = status.toUpperCase();
  const variant: any =
    ['APPROVED', 'COMPLETED', 'PASSED', 'MATCHED', 'RESOLVED', 'CLOSED'].includes(s) ? 'default' :
    ['DRAFT', 'PENDING', 'NOT_ASSESSED', 'DISCOVERED'].includes(s) ? 'secondary' :
    ['FAILED', 'REJECTED', 'BLOCKED', 'MISMATCHED', 'CRITICAL'].includes(s) ? 'destructive' : 'outline';
  return <Badge variant={variant}>{status}</Badge>;
};

export default function MigrationControlCentre() {
  const [tab, setTab] = useState('overview');
  const { data: metrics } = useMigrationDashboardMetrics();
  const { data: plans = [] } = useMigrationPlans();
  const { data: batches = [] } = useMigrationBatches();
  const { data: issues = [] } = useMigrationIssues();
  const { data: vRules = [] } = useValidationRules();
  const { data: vResults = [] } = useValidationResults();
  const { data: recons = [] } = useReconciliationSummaries();
  const { data: cutChecks = [] } = useCutoverReadinessChecks();
  const { data: pbObjects = [] } = usePowerBuilderObjects();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Migration Control Centre</h1>
        <p className="text-muted-foreground mt-1">
          Plan, monitor, validate, reconcile, and approve migration activities from the legacy PowerBuilder system.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Migration Plans" value={metrics?.plans ?? 0} />
        <StatCard label="Tables Ready" value={metrics?.tablesReady ?? 0} tone="ok" />
        <StatCard label="Mapping Gaps" value={metrics?.mappingGaps ?? 0} tone={metrics?.mappingGaps ? 'warn' : 'default'} />
        <StatCard label="Open Issues" value={metrics?.openIssues ?? 0} />
        <StatCard label="Cutover Blockers" value={metrics?.cutoverBlockers ?? 0} tone={metrics?.cutoverBlockers ? 'danger' : 'ok'} />
        <StatCard label="Validation Failures" value={metrics?.validationFailures ?? 0} tone={metrics?.validationFailures ? 'danger' : 'default'} />
        <StatCard label="Reconciliation Differences" value={metrics?.reconciliationDifferences ?? 0} tone={metrics?.reconciliationDifferences ? 'warn' : 'default'} />
        <StatCard label="Last Batch Status" value={metrics?.lastBatchStatus ?? '—'} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pb">PowerBuilder Inventory</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="batches">Batches &amp; Runs</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="cutover">Cutover Readiness</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Overall Readiness</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1"><span>Overall Readiness</span><span>{metrics?.overallReadinessPercent ?? 0}%</span></div>
                <Progress value={metrics?.overallReadinessPercent ?? 0} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span>Mapping Completeness</span><span>{metrics?.mappingCompletenessPercent ?? 0}%</span></div>
                <Progress value={metrics?.mappingCompletenessPercent ?? 0} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span>Validation Pass Rate</span><span>{metrics?.validationPassRate ?? 0}%</span></div>
                <Progress value={metrics?.validationPassRate ?? 0} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span>Reconciliation Matched Rate</span><span>{metrics?.reconciliationMatchedRate ?? 0}%</span></div>
                <Progress value={metrics?.reconciliationMatchedRate ?? 0} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pb">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>PowerBuilder Inventory</CardTitle>
                <CardDescription>Legacy PowerBuilder objects and their modernization decisions.</CardDescription>
              </div>
              <Button>Add Object</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Object</TableHead><TableHead>Type</TableHead><TableHead>Library</TableHead>
                  <TableHead>Business Area</TableHead><TableHead>Related Table</TableHead>
                  <TableHead>Status</TableHead><TableHead>Decision</TableHead>
                  <TableHead>Complexity</TableHead><TableHead>Risk</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pbObjects.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No PowerBuilder objects yet. Add one to start inventory.</TableCell></TableRow>
                  ) : pbObjects.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.object_name}</TableCell>
                      <TableCell>{o.object_type}</TableCell>
                      <TableCell>{o.library_name ?? '—'}</TableCell>
                      <TableCell>{o.business_area ?? '—'}</TableCell>
                      <TableCell>{o.related_table_name ?? '—'}</TableCell>
                      <TableCell><StatusBadge status={o.migration_status} /></TableCell>
                      <TableCell>{o.modernization_decision}</TableCell>
                      <TableCell>{o.complexity_level}</TableCell>
                      <TableCell><StatusBadge status={o.risk_level} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Migration Plans</CardTitle>
                <CardDescription>Plan and approve migration waves.</CardDescription>
              </div>
              <Button>Create Plan</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Plan Code</TableHead><TableHead>Plan Name</TableHead>
                  <TableHead>Strategy</TableHead><TableHead>Status</TableHead>
                  <TableHead>Planned Start</TableHead><TableHead>Planned End</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {plans.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No migration plans yet.</TableCell></TableRow>
                  ) : plans.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono">{p.plan_code}</TableCell>
                      <TableCell>{p.plan_name}</TableCell>
                      <TableCell>{p.migration_strategy}</TableCell>
                      <TableCell><StatusBadge status={p.plan_status} /></TableCell>
                      <TableCell>{p.planned_start_date ?? '—'}</TableCell>
                      <TableCell>{p.planned_end_date ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batches">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Batches &amp; Runs</CardTitle>
                <CardDescription>Track migration batch execution and per-run metrics.</CardDescription>
              </div>
              <Button>Create Batch</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Batch Code</TableHead><TableHead>Batch Name</TableHead>
                  <TableHead>Type</TableHead><TableHead>Status</TableHead>
                  <TableHead>Scheduled</TableHead><TableHead>Started</TableHead><TableHead>Completed</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {batches.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No batches yet.</TableCell></TableRow>
                  ) : batches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono">{b.batch_code}</TableCell>
                      <TableCell>{b.batch_name}</TableCell>
                      <TableCell>{b.batch_type}</TableCell>
                      <TableCell><StatusBadge status={b.batch_status} /></TableCell>
                      <TableCell>{b.scheduled_start_at ?? '—'}</TableCell>
                      <TableCell>{b.started_at ?? '—'}</TableCell>
                      <TableCell>{b.completed_at ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Validation Rules</CardTitle></div>
              <Button>Create Rule</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Rule Code</TableHead><TableHead>Name</TableHead>
                  <TableHead>Source</TableHead><TableHead>Target</TableHead>
                  <TableHead>Type</TableHead><TableHead>Severity</TableHead>
                  <TableHead>Blocking</TableHead><TableHead>Active</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {vRules.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No validation rules yet.</TableCell></TableRow>
                  ) : vRules.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono">{r.rule_code}</TableCell>
                      <TableCell>{r.rule_name}</TableCell>
                      <TableCell>{r.source_table_name ?? '—'}</TableCell>
                      <TableCell>{r.target_table_name ?? '—'}</TableCell>
                      <TableCell>{r.validation_type}</TableCell>
                      <TableCell><StatusBadge status={r.severity} /></TableCell>
                      <TableCell>{r.is_blocking ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{r.is_active ? 'Yes' : 'No'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Validation Results</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Rule</TableHead><TableHead>Source</TableHead><TableHead>Target</TableHead>
                  <TableHead>Status</TableHead><TableHead>Checked</TableHead><TableHead>Failed</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {vResults.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No validation results yet.</TableCell></TableRow>
                  ) : vResults.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono">{v.rule_code ?? '—'}</TableCell>
                      <TableCell>{v.source_table_name ?? '—'}</TableCell>
                      <TableCell>{v.target_table_name ?? '—'}</TableCell>
                      <TableCell><StatusBadge status={v.validation_status} /></TableCell>
                      <TableCell>{v.checked_record_count ?? '—'}</TableCell>
                      <TableCell>{v.failed_record_count ?? '—'}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{v.message ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation">
          <Card>
            <CardHeader><CardTitle>Reconciliation Summary</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Source</TableHead><TableHead>Target</TableHead>
                  <TableHead>Type</TableHead><TableHead>Status</TableHead>
                  <TableHead>Source Count</TableHead><TableHead>Target Count</TableHead>
                  <TableHead>Difference</TableHead><TableHead>Accepted</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {recons.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No reconciliation records yet.</TableCell></TableRow>
                  ) : recons.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.source_table_name}</TableCell>
                      <TableCell>{r.target_table_name ?? '—'}</TableCell>
                      <TableCell>{r.reconciliation_type}</TableCell>
                      <TableCell><StatusBadge status={r.reconciliation_status} /></TableCell>
                      <TableCell>{r.source_count ?? '—'}</TableCell>
                      <TableCell>{r.target_count ?? '—'}</TableCell>
                      <TableCell>{r.count_difference ?? '—'}</TableCell>
                      <TableCell>{r.is_accepted ? 'Yes' : 'No'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Migration Issues</CardTitle></div>
              <Button>Create Issue</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Code</TableHead><TableHead>Title</TableHead>
                  <TableHead>Type</TableHead><TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead><TableHead>Source</TableHead>
                  <TableHead>Cutover Blocker</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {issues.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No migration issues yet.</TableCell></TableRow>
                  ) : issues.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-mono">{i.issue_code}</TableCell>
                      <TableCell>{i.issue_title}</TableCell>
                      <TableCell>{i.issue_type}</TableCell>
                      <TableCell><StatusBadge status={i.severity} /></TableCell>
                      <TableCell><StatusBadge status={i.issue_status} /></TableCell>
                      <TableCell>{i.source_table_name ?? '—'}</TableCell>
                      <TableCell>{i.is_cutover_blocker ? <Badge variant="destructive">Yes</Badge> : 'No'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cutover">
          <Card>
            <CardHeader>
              <CardTitle>Cutover Readiness Checklist</CardTitle>
              <CardDescription>Required checks before go-live.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Check</TableHead><TableHead>Category</TableHead>
                  <TableHead>Required</TableHead><TableHead>Description</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {cutChecks.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.check_name}</TableCell>
                      <TableCell>{c.check_category}</TableCell>
                      <TableCell>{c.required_for_cutover ? <Badge>Required</Badge> : 'Optional'}</TableCell>
                      <TableCell className="text-muted-foreground">{c.description ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health">
          <Card>
            <CardHeader><CardTitle>Migration Health</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(metrics?.mappingGaps ?? 0) > 0 && <div className="p-3 rounded border bg-amber-50 text-amber-900">{metrics!.mappingGaps} tables have incomplete column mapping.</div>}
              {(metrics?.cutoverBlockers ?? 0) > 0 && <div className="p-3 rounded border bg-red-50 text-red-900">{metrics!.cutoverBlockers} critical issues are blocking cutover.</div>}
              {(metrics?.validationFailures ?? 0) > 0 && <div className="p-3 rounded border bg-red-50 text-red-900">{metrics!.validationFailures} validation checks failed.</div>}
              {(metrics?.reconciliationDifferences ?? 0) > 0 && <div className="p-3 rounded border bg-amber-50 text-amber-900">{metrics!.reconciliationDifferences} reconciliation differences have not been accepted.</div>}
              {pbObjects.some((o) => o.modernization_decision === 'REVIEW') && (
                <div className="p-3 rounded border bg-muted">Some PowerBuilder objects have no modernization decision yet.</div>
              )}
              {(metrics?.mappingGaps ?? 0) === 0 && (metrics?.cutoverBlockers ?? 0) === 0 && (metrics?.validationFailures ?? 0) === 0 && (metrics?.reconciliationDifferences ?? 0) === 0 && (
                <div className="p-3 rounded border bg-emerald-50 text-emerald-900">No blocking migration health warnings detected.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
