import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ConsoleLayout from './ConsoleLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, KeyRound, Globe2, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Stats {
  totalKeys: number;
  activeKeys: number;
  totalCases: number;
  recentRuns: number;
  recentPass: number;
  recentFail: number;
  recentExecutions: any[];
}

export default function ApiTestDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [keys, cases, recent, recentList] = await Promise.all([
        supabase.from('public_api_keys').select('id,status', { count: 'exact', head: false }),
        supabase.from('api_test_saved_cases').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('api_test_executions').select('result', { count: 'exact' }).gte('executed_at', since),
        supabase.from('api_test_executions').select('id, test_name, http_method, full_url, response_status, result, executed_at, duration_ms').order('executed_at', { ascending: false }).limit(8),
      ]);
      const allKeys = keys.data || [];
      const recentData = recent.data || [];
      setStats({
        totalKeys: allKeys.length,
        activeKeys: allKeys.filter((k: any) => k.status === 'active').length,
        totalCases: cases.count || 0,
        recentRuns: recentData.length,
        recentPass: recentData.filter((r: any) => r.result === 'pass').length,
        recentFail: recentData.filter((r: any) => r.result === 'fail' || r.result === 'error').length,
        recentExecutions: recentList.data || [],
      });
      setLoading(false);
    })();
  }, []);

  return (
    <ConsoleLayout>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile icon={KeyRound} label="Active API Keys" value={stats?.activeKeys ?? '—'} sub={`${stats?.totalKeys ?? 0} total`} />
        <MetricTile icon={Globe2} label="Saved Test Cases" value={stats?.totalCases ?? '—'} sub="Reusable scenarios" />
        <MetricTile icon={CheckCircle2} label="Passed (24h)" value={stats?.recentPass ?? '—'} sub={`${stats?.recentRuns ?? 0} total runs`} tone="success" />
        <MetricTile icon={XCircle} label="Failed (24h)" value={stats?.recentFail ?? '—'} sub="Failures + errors" tone="danger" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start"><Link to="/admin/api-test-console/auth-lab">Run Auth Smoke Test</Link></Button>
            <Button asChild variant="outline" className="w-full justify-start"><Link to="/admin/api-test-console/runner">Open Compliance Runner</Link></Button>
            <Button asChild variant="outline" className="w-full justify-start"><Link to="/admin/api-test-console/keys">Manage API Keys</Link></Button>
            <Button asChild variant="outline" className="w-full justify-start"><Link to="/admin/api-test-console/endpoints">Browse Endpoints</Link></Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent Executions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : stats?.recentExecutions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No executions yet. Run your first test from the Auth Lab or Runner.</p>
            ) : (
              <div className="divide-y divide-border">
                {stats?.recentExecutions.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px]">{e.http_method}</Badge>
                        <span className="truncate font-medium">{e.test_name || e.full_url}</span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{e.full_url}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{e.duration_ms ?? '—'}ms</span>
                      <ResultBadge result={e.result} status={e.response_status} />
                      <span className="text-muted-foreground">{formatDistanceToNow(new Date(e.executed_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ConsoleLayout>
  );
}

function MetricTile({ icon: Icon, label, value, sub, tone }: any) {
  const toneClass = tone === 'success' ? 'text-emerald-600' : tone === 'danger' ? 'text-destructive' : 'text-foreground';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <Icon className={`h-4 w-4 ${toneClass}`} />
        </div>
        <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ResultBadge({ result, status }: { result: string; status: number | null }) {
  if (result === 'pass') return <Badge className="bg-emerald-600 hover:bg-emerald-700">PASS {status}</Badge>;
  if (result === 'fail') return <Badge variant="destructive">FAIL {status}</Badge>;
  if (result === 'error') return <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" />ERROR</Badge>;
  return <Badge variant="outline">{result}</Badge>;
}
