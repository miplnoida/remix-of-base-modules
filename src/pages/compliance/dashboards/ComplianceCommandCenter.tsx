import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/PageHeader';
import { ComplianceHelpButton } from '@/components/help/ComplianceHelpButton';
import {
  AlertTriangle, Briefcase, ShieldAlert, Bell, HandshakeIcon, Scale,
  Users, Activity, Zap, DollarSign, ArrowRight, Loader2, CheckCircle2,
  XCircle, TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isComplianceFeatureEnabled } from '@/lib/compliance/featureToggles';

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD', maximumFractionDigits: 0 }).format(n || 0);

function MetricCard({ title, value, icon: Icon, tone = 'default', subtitle, loading, onClick, disabled }: {
  title: string; value: string | number; icon: any; tone?: 'default' | 'danger' | 'warning' | 'success' | 'info';
  subtitle?: string; loading?: boolean; onClick?: () => void; disabled?: boolean;
}) {
  if (disabled) {
    return (
      <Card className="opacity-60">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Feature disabled</div>
        </CardContent>
      </Card>
    );
  }
  const toneClass =
    tone === 'danger' ? 'text-destructive' :
    tone === 'warning' ? 'text-amber-600' :
    tone === 'success' ? 'text-emerald-600' :
    tone === 'info' ? 'text-blue-600' : '';
  return (
    <Card className={onClick ? 'cursor-pointer hover:shadow-md transition' : ''} onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${toneClass}`} />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-7 w-20" /> : (
          <div className={`text-2xl font-bold ${toneClass}`}>{value}</div>
        )}
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export default function ComplianceCommandCenter() {
  const navigate = useNavigate();

  // 1. Open violations
  const openViolations = useQuery({
    queryKey: ['cc_open_violations'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('ce_violations' as any).select('*', { count: 'exact', head: true })
        .in('status', ['OPEN', 'UNDER_REVIEW', 'ESCALATED', 'PENDING_VERIFICATION']);
      if (error) throw error;
      return count || 0;
    },
  });

  // 2. Open cases
  const openCases = useQuery({
    queryKey: ['cc_open_cases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_cases' as any).select('status, total_amount').eq('is_deleted', false);
      if (error) throw error;
      const rows = (data || []) as any[];
      const open = rows.filter(r => !['RESOLVED', 'CLOSED'].includes(r.status));
      return { count: open.length, amount: open.reduce((s, r) => s + Number(r.total_amount || 0), 0) };
    },
  });

  // 3. High-risk employers
  const highRisk = useQuery({
    queryKey: ['cc_high_risk_employers'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('ce_risk_profiles' as any).select('*', { count: 'exact', head: true })
        .in('risk_band', ['HIGH', 'CRITICAL']);
      if (error) throw error;
      return count || 0;
    },
  });

  // 4. Overdue notices
  const overdueNotices = useQuery({
    queryKey: ['cc_overdue_notices'],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { count, error } = await supabase
        .from('ce_notices' as any).select('*', { count: 'exact', head: true })
        .lt('due_response_date', today)
        .eq('response_received', false);
      if (error) throw error;
      return count || 0;
    },
  });

  // 5. Payment arrangement breaches
  const arrangementBreaches = useQuery({
    queryKey: ['cc_arrangement_breaches'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('ce_arrangement_breaches' as any).select('*', { count: 'exact', head: true })
        .is('resolved_at', null);
      if (error) throw error;
      return count || 0;
    },
  });

  // 6. Legal-ready cases
  const legalReady = useQuery({
    queryKey: ['cc_legal_ready'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('ce_cases' as any).select('*', { count: 'exact', head: true })
        .in('status', ['LEGAL_REVIEW', 'PENDING_LEGAL_REFERRAL', 'COURT_ACTION', 'ENFORCEMENT_IN_PROGRESS']);
      if (error) throw error;
      return count || 0;
    },
  });

  // 7. Officer workload
  const officerWorkload = useQuery({
    queryKey: ['cc_officer_workload'],
    queryFn: async () => {
      const { data: inspectors, error: ie } = await supabase
        .from('ce_inspectors' as any).select('id, max_caseload').eq('is_active', true);
      if (ie) throw ie;
      const { data: assignments, error: ae } = await supabase
        .from('ce_case_assignments' as any).select('to_officer_id').eq('is_active', true);
      if (ae) throw ae;
      const insp = (inspectors || []) as any[];
      const asn = (assignments || []) as any[];
      const totalCap = insp.reduce((s, i) => s + Number(i.max_caseload || 0), 0);
      const totalAsn = asn.length;
      const pct = totalCap > 0 ? Math.round((totalAsn / totalCap) * 100) : 0;
      return { active: insp.length, assignments: totalAsn, capacity: totalCap, pct };
    },
  });

  // 8. Automation job health
  const automationHealth = useQuery({
    queryKey: ['cc_automation_health'],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('ce_automation_runs' as any).select('status, started_at')
        .gte('started_at', since);
      if (error) throw error;
      const rows = (data || []) as any[];
      const failed = rows.filter(r => r.status === 'FAILED').length;
      const success = rows.filter(r => r.status === 'SUCCESS' || r.status === 'COMPLETED').length;
      return { total: rows.length, failed, success };
    },
  });

  // 9. Recent detected violations
  const recentViolations = useQuery({
    queryKey: ['cc_recent_violations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_violations' as any)
        .select('id, violation_number, employer_name, severity, status, total_amount, created_at')
        .order('created_at', { ascending: false }).limit(8);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // 10. Recovery & arrears summary
  const recoverySummary = useQuery({
    queryKey: ['cc_recovery_summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_cases' as any).select('total_amount, amount_collected').eq('is_deleted', false);
      if (error) throw error;
      const rows = (data || []) as any[];
      const due = rows.reduce((s, r) => s + Number(r.total_amount || 0), 0);
      const collected = rows.reduce((s, r) => s + Number(r.amount_collected || 0), 0);
      const arrears = Math.max(0, due - collected);
      const recoveryRate = due > 0 ? Math.round((collected / due) * 100) : 0;
      return { due, collected, arrears, recoveryRate };
    },
  });

  const featureArrangements = isComplianceFeatureEnabled('arrangements' as any);
  const featureLegal = isComplianceFeatureEnabled('legal' as any);
  const featureAutomation = isComplianceFeatureEnabled('automation' as any);

  const widgets = useMemo(() => [
    {
      title: 'Open Violations', icon: AlertTriangle, tone: 'danger' as const,
      value: openViolations.data ?? 0, loading: openViolations.isLoading,
      onClick: () => navigate('/compliance/violations'),
      subtitle: 'Awaiting verification or resolution',
    },
    {
      title: 'Open Cases', icon: Briefcase, tone: 'warning' as const,
      value: openCases.data?.count ?? 0, loading: openCases.isLoading,
      onClick: () => navigate('/compliance/cases'),
      subtitle: openCases.data ? `Exposure ${fmtCurrency(openCases.data.amount)}` : undefined,
    },
    {
      title: 'High-Risk Employers', icon: ShieldAlert, tone: 'danger' as const,
      value: highRisk.data ?? 0, loading: highRisk.isLoading,
      onClick: () => navigate('/compliance/risk/high-risk'),
      subtitle: 'HIGH + CRITICAL risk bands',
    },
    {
      title: 'Overdue Notices', icon: Bell, tone: 'warning' as const,
      value: overdueNotices.data ?? 0, loading: overdueNotices.isLoading,
      onClick: () => navigate('/compliance/notices/register'),
      subtitle: 'Response date passed',
    },
    {
      title: 'Arrangement Breaches', icon: HandshakeIcon, tone: 'danger' as const,
      value: arrangementBreaches.data ?? 0, loading: arrangementBreaches.isLoading,
      onClick: () => navigate('/compliance/arrangements/breaches'),
      subtitle: 'Unresolved breaches',
      disabled: !featureArrangements,
    },
    {
      title: 'Legal-Ready Cases', icon: Scale, tone: 'info' as const,
      value: legalReady.data ?? 0, loading: legalReady.isLoading,
      onClick: () => navigate('/compliance/legal/pack-preparation'),
      subtitle: 'Ready for legal escalation',
      disabled: !featureLegal,
    },
  ], [openViolations, openCases, highRisk, overdueNotices, arrangementBreaches, legalReady, featureArrangements, featureLegal, navigate]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Compliance Command Center"
        subtitle="Real-time view of enforcement health, workload, and recovery"
        breadcrumbs={[{ label: 'Compliance', href: '/compliance/dashboard' }, { label: 'Command Center' }]}
        actions={<ComplianceHelpButton screenKey="dashboard" />}
      />

      {/* Primary widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {widgets.map((w) => <MetricCard key={w.title} {...w} />)}
      </div>

      {/* Secondary widgets: workload + automation + recovery */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4" /> Officer Workload</CardTitle>
          </CardHeader>
          <CardContent>
            {officerWorkload.isLoading ? <Skeleton className="h-16 w-full" /> : (
              <>
                <div className="text-2xl font-bold">{officerWorkload.data?.pct ?? 0}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {officerWorkload.data?.assignments ?? 0} active assignments across {officerWorkload.data?.active ?? 0} officers (cap {officerWorkload.data?.capacity ?? 0})
                </p>
                <Button variant="link" className="px-0 mt-2 h-auto" onClick={() => navigate('/compliance/reports/inspector-performance')}>
                  View workload report <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={!featureAutomation ? 'opacity-60' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Zap className="h-4 w-4" /> Automation Health (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            {!featureAutomation ? (
              <p className="text-sm text-muted-foreground">Feature disabled</p>
            ) : automationHealth.isLoading ? <Skeleton className="h-16 w-full" /> : (
              <>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span className="font-semibold">{automationHealth.data?.success ?? 0}</span></div>
                  <div className="flex items-center gap-1"><XCircle className="h-4 w-4 text-destructive" /><span className="font-semibold">{automationHealth.data?.failed ?? 0}</span></div>
                  <div className="flex items-center gap-1"><Activity className="h-4 w-4 text-muted-foreground" /><span className="font-semibold">{automationHealth.data?.total ?? 0}</span></div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">success / failed / total runs</p>
                <Button variant="link" className="px-0 mt-2 h-auto" onClick={() => navigate('/compliance/reports/automation-jobs')}>
                  View automation report <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><DollarSign className="h-4 w-4" /> Recovery &amp; Arrears</CardTitle>
          </CardHeader>
          <CardContent>
            {recoverySummary.isLoading ? <Skeleton className="h-16 w-full" /> : (
              <>
                <div className="text-2xl font-bold">{recoverySummary.data?.recoveryRate ?? 0}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Collected {fmtCurrency(recoverySummary.data?.collected || 0)} of {fmtCurrency(recoverySummary.data?.due || 0)} due
                </p>
                <p className="text-xs text-amber-600 mt-1">Arrears outstanding: {fmtCurrency(recoverySummary.data?.arrears || 0)}</p>
                <Button variant="link" className="px-0 mt-2 h-auto" onClick={() => navigate('/compliance/reports/arrears')}>
                  View arrears report <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent detected violations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Recent Detected Violations</CardTitle>
        </CardHeader>
        <CardContent>
          {recentViolations.isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (recentViolations.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No recent violations</p>
          ) : (
            <div className="divide-y">
              {(recentViolations.data || []).map((v: any) => (
                <div key={v.id} className="flex items-center justify-between py-2 hover:bg-muted/40 px-2 -mx-2 rounded cursor-pointer"
                  onClick={() => navigate(`/compliance/violations/${v.id}`)}>
                  <div>
                    <div className="text-sm font-medium">{v.violation_number} — {v.employer_name || 'Unknown'}</div>
                    <div className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={v.severity === 'Critical' || v.severity === 'High' ? 'destructive' : 'secondary'}>
                      {v.severity || 'Medium'}
                    </Badge>
                    <Badge variant="outline">{v.status}</Badge>
                    <span className="text-sm font-semibold tabular-nums">{fmtCurrency(Number(v.total_amount || 0))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
