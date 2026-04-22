// ============================================
// Risk Operations Admin Page
// - Manual recalc controls (all / zone / employer / changed-only)
// - Two-score visibility (Inherent + Audit Priority)
// - Active policy + last-run timestamps
// - Job run history (reuses ce_automation_job_runs)
// ============================================
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, RefreshCw, Activity, Gauge, ShieldAlert, Database } from 'lucide-react';
import { useRunRiskRecalculation, useRiskOpsSummary, type RecalcScope, type RecalcScoreType } from '@/hooks/useRiskRecalculation';
import { formatDistanceToNow } from 'date-fns';

const scopeLabel = (scope: RecalcScope) => {
  switch (scope.kind) {
    case 'all': return 'All employers';
    case 'changed_only': return 'Changed since last priority calc';
    case 'zone': return `Zone ${scope.zoneId.slice(0, 8)}…`;
    case 'employer': return `Employer ${scope.employerId}`;
  }
};

export default function RiskOperations() {
  const [scoreType, setScoreType] = useState<RecalcScoreType>('BOTH');
  const [scopeKind, setScopeKind] = useState<RecalcScope['kind']>('all');
  const [zoneId, setZoneId] = useState<string>('');
  const [employerId, setEmployerId] = useState<string>('');
  const [dryRun, setDryRun] = useState(false);

  const summary = useRiskOpsSummary();
  const recalc = useRunRiskRecalculation();

  const { data: zones = [] } = useQuery({
    queryKey: ['ce_zones_for_recalc'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_zones' as any)
        .select('id, zone_name')
        .order('zone_name');
      if (error) return [];
      return (data as any[]) || [];
    },
  });

  const { data: runs = [], refetch: refetchRuns } = useQuery({
    queryKey: ['risk-job-runs'],
    queryFn: async () => {
      const { data: jobs } = await supabase
        .from('ce_automation_jobs')
        .select('id, job_code, name')
        .in('job_code', ['JOB-INHERENT-RISK-RECALC', 'JOB-AUDIT-PRIORITY-RECALC', 'JOB-RISK-RECLASS']);
      const ids = (jobs || []).map((j: any) => j.id);
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from('ce_automation_job_runs')
        .select('id, job_id, run_status, records_processed, records_affected, started_at, completed_at, summary')
        .in('job_id', ids)
        .order('started_at', { ascending: false })
        .limit(20);
      if (error) return [];
      const byId: Record<string, { code: string; name: string }> = {};
      (jobs || []).forEach((j: any) => (byId[j.id] = { code: j.job_code, name: j.name }));
      return ((data as any[]) || []).map((r) => ({ ...r, job: byId[r.job_id] }));
    },
    refetchInterval: 15_000,
  });

  const buildScope = (): RecalcScope | null => {
    if (scopeKind === 'all') return { kind: 'all' };
    if (scopeKind === 'changed_only') return { kind: 'changed_only' };
    if (scopeKind === 'zone') return zoneId ? { kind: 'zone', zoneId } : null;
    if (scopeKind === 'employer') return employerId.trim() ? { kind: 'employer', employerId: employerId.trim() } : null;
    return null;
  };

  const handleRun = () => {
    const scope = buildScope();
    if (!scope) return;
    recalc.mutate({ scope, scoreType, dryRun }, { onSettled: () => refetchRuns() });
  };

  const tsAgo = (ts?: string) => (ts ? formatDistanceToNow(new Date(ts), { addSuffix: true }) : '—');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Risk Operations"
        subtitle="Two-score model: inherent risk + audit priority"
        breadcrumbs={[{ label: 'Compliance', href: '/compliance' }, { label: 'Risk Operations' }]}
      />

      {/* Operational visibility */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
              <Gauge className="h-3.5 w-3.5" /> Active Risk Policy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.data?.activePolicy ? (
              <>
                <div className="font-semibold truncate">{summary.data.activePolicy.policy_name}</div>
                <div className="text-xs text-muted-foreground">{summary.data.activePolicy.policy_code || '—'}</div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No active policy</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="h-3.5 w-3.5" /> Last Inherent Recalc
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{tsAgo(summary.data?.lastInherent)}</div>
            <div className="text-xs text-muted-foreground">{summary.data?.withInherentScore ?? 0} profiles scored</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
              <Activity className="h-3.5 w-3.5" /> Last Audit-Priority Recalc
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{tsAgo(summary.data?.lastAuditPriority)}</div>
            <div className="text-xs text-muted-foreground">{summary.data?.withAuditPriority ?? 0} with priority score</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
              <Database className="h-3.5 w-3.5" /> Total Risk Profiles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.data?.totalProfiles ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recalc">
        <TabsList>
          <TabsTrigger value="recalc">Manual Recalculation</TabsTrigger>
          <TabsTrigger value="history">Run History</TabsTrigger>
        </TabsList>

        <TabsContent value="recalc" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trigger Recalculation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Score Type</label>
                  <Select value={scoreType} onValueChange={(v) => setScoreType(v as RecalcScoreType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INHERENT">Inherent Risk only</SelectItem>
                      <SelectItem value="AUDIT_PRIORITY">Audit Priority only</SelectItem>
                      <SelectItem value="BOTH">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Scope</label>
                  <Select value={scopeKind} onValueChange={(v) => setScopeKind(v as RecalcScope['kind'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All employers</SelectItem>
                      <SelectItem value="changed_only">Changed only</SelectItem>
                      <SelectItem value="zone">By zone</SelectItem>
                      <SelectItem value="employer">Single employer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Mode</label>
                  <Select value={dryRun ? 'dry' : 'live'} onValueChange={(v) => setDryRun(v === 'dry')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="live">Live (write changes)</SelectItem>
                      <SelectItem value="dry">Dry run (preview)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {scopeKind === 'zone' && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Zone</label>
                  <Select value={zoneId} onValueChange={setZoneId}>
                    <SelectTrigger><SelectValue placeholder="Select zone…" /></SelectTrigger>
                    <SelectContent>
                      {zones.map((z: any) => (
                        <SelectItem key={z.id} value={z.id}>{z.zone_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {scopeKind === 'employer' && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Employer ID</label>
                  <Input
                    value={employerId}
                    onChange={(e) => setEmployerId(e.target.value)}
                    placeholder="e.g. ER-12345"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 pt-2 border-t">
                <Button
                  onClick={handleRun}
                  disabled={recalc.isPending || !buildScope()}
                  className="gap-2"
                >
                  {recalc.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Run Recalculation
                </Button>
                <span className="text-xs text-muted-foreground">
                  Will use the active policy. {dryRun && <Badge variant="outline" className="ml-1">DRY RUN</Badge>}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Risk Job Runs</CardTitle>
            </CardHeader>
            <CardContent>
              {runs.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">No runs recorded yet.</div>
              ) : (
                <div className="divide-y">
                  {runs.map((r: any) => (
                    <div key={r.id} className="py-2 flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{r.job?.name || r.job_id}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.started_at ? new Date(r.started_at).toLocaleString() : '—'} · processed {r.records_processed ?? 0} · affected {r.records_affected ?? 0}
                        </div>
                      </div>
                      <Badge variant={String(r.run_status).toLowerCase().includes('success') || String(r.run_status).toLowerCase().includes('complete') ? 'default' : 'secondary'}>
                        {r.run_status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
