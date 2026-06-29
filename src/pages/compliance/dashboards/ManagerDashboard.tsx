import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, AlertTriangle, DollarSign, Scale,
  TrendingUp, CheckCircle, Eye, Loader2,
  Briefcase, Shield, Target, Activity, BarChart3
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const ManagerDashboard = () => {
  const navigate = useNavigate();

  const { data: violationCount = 0, isLoading: lv } = useQuery({
    queryKey: ['ce_dashboard_violations_v2'],
    queryFn: async () => {
      // Canonical "active violation" set used across Violations list, Verification Queue,
      // Bulk Notice dialog and Officer Status wizard. Keep this in sync everywhere.
      const { count, error } = await supabase
        .from('ce_violations')
        .select('*', { count: 'exact', head: true })
        .in('status', ['OPEN', 'IN_PROGRESS', 'UNDER_REVIEW', 'ESCALATED'])
        .eq('is_deleted', false);
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: caseStats = { total: 0, open: 0, legal: 0, totalAmount: 0 }, isLoading: lc } = useQuery({
    queryKey: ['ce_dashboard_cases'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ce_cases').select('status, total_amount').eq('is_deleted', false);
      if (error) throw error;
      const cases = (data || []) as unknown as { status: string; total_amount: number | null }[];
      return {
        total: cases.length,
        open: cases.filter(c => !['RESOLVED', 'CLOSED'].includes(c.status)).length,
        legal: cases.filter(c => ['LEGAL_REVIEW', 'COURT_ACTION', 'ENFORCEMENT_IN_PROGRESS'].includes(c.status)).length,
        totalAmount: cases.reduce((sum, c) => sum + (Number(c.total_amount) || 0), 0),
      };
    },
  });

  const { data: riskData = { distribution: [], stats: { total: 0, avgScore: 0, highCritical: 0, medium: 0, low: 0, coverage: 0, avgArrears: 0, avgViolation: 0, avgFiling: 0, avgPayment: 0, avgLegal: 0 } }, isLoading: lr } = useQuery({
    queryKey: ['ce_dashboard_risk_full'],
    queryFn: async () => {
      // Paginated fetch to handle >1000 records
      type RiskProfile = { risk_band: string; total_score: number; arrears_score: number; violation_score: number; filing_score: number; payment_behavior_score: number; legal_history_score: number };
      const profiles: RiskProfile[] = [];
      const PAGE = 1000;
      let offset = 0;
      while (true) {
        const { data, error } = await supabase.from('ce_risk_profiles').select('risk_band, total_score, arrears_score, violation_score, filing_score, payment_behavior_score, legal_history_score').range(offset, offset + PAGE - 1);
        if (error) throw error;
        const chunk = (data || []) as unknown as RiskProfile[];
        profiles.push(...chunk);
        if (chunk.length < PAGE) break;
        offset += PAGE;
      }
      
      const bands = [
        { key: 'LOW', label: 'Low', color: 'hsl(142, 71%, 45%)' },
        { key: 'MEDIUM', label: 'Medium', color: 'hsl(38, 92%, 50%)' },
        { key: 'HIGH', label: 'High', color: 'hsl(0, 84%, 60%)' },
        { key: 'CRITICAL', label: 'Critical', color: 'hsl(0, 72%, 51%)' },
      ];
      
      const distribution = bands.map(b => ({
        band: b.label,
        dbBand: b.key,
        count: profiles.filter(p => p.risk_band === b.key).length,
        color: b.color,
      }));

      const total = profiles.length;
      const avgScore = total > 0 ? Math.round(profiles.reduce((s, p) => s + Number(p.total_score || 0), 0) / total * 10) / 10 : 0;
      const highCritical = profiles.filter(p => p.risk_band === 'HIGH' || p.risk_band === 'CRITICAL').length;
      const medium = profiles.filter(p => p.risk_band === 'MEDIUM').length;
      const low = profiles.filter(p => p.risk_band === 'LOW').length;

      // Get total active employers for coverage calc
      const { count: totalEmployers } = await supabase.from('er_master').select('*', { count: 'exact', head: true }).eq('status', 'A');
      const coverage = totalEmployers ? Math.round((total / totalEmployers) * 100) : 0;

      // Factor averages
      const avg = (field: keyof typeof profiles[0]) => total > 0 ? Math.round(profiles.reduce((s, p) => s + Number(p[field] || 0), 0) / total * 10) / 10 : 0;

      return {
        distribution,
        stats: {
          total,
          avgScore,
          highCritical,
          medium,
          low,
          coverage,
          avgArrears: avg('arrears_score'),
          avgViolation: avg('violation_score'),
          avgFiling: avg('filing_score'),
          avgPayment: avg('payment_behavior_score'),
          avgLegal: avg('legal_history_score'),
        },
      };
    },
  });

  const { data: caseStatusData = [], isLoading: ls } = useQuery({
    queryKey: ['ce_dashboard_case_status'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ce_cases').select('status').eq('is_deleted', false);
      if (error) throw error;
      const cases = (data || []) as unknown as { status: string }[];
      const groups = [
        { name: 'Open', statuses: ['OPEN'], color: 'hsl(var(--primary))' },
        { name: 'Under Review', statuses: ['UNDER_REVIEW'], color: 'hsl(210, 70%, 55%)' },
        { name: 'Notice Issued', statuses: ['NOTICE_ISSUED', 'AWAITING_RESPONSE'], color: 'hsl(38, 92%, 50%)' },
        { name: 'Legal', statuses: ['LEGAL_REVIEW', 'COURT_ACTION', 'ENFORCEMENT_IN_PROGRESS'], color: 'hsl(var(--destructive))' },
        { name: 'Resolved', statuses: ['RESOLVED', 'CLOSED'], color: 'hsl(142, 71%, 45%)' },
      ];
      return groups.map(g => ({ ...g, value: cases.filter(c => g.statuses.includes(c.status)).length })).filter(g => g.value > 0);
    },
  });

  const isLoading = lv || lc || lr || ls;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { stats } = riskData;

  const kpis = [
    { label: 'Active Violations', value: violationCount.toString(), icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Open Cases', value: caseStats.open.toString(), icon: Briefcase, color: 'hsl(38, 92%, 50%)', iconClass: 'text-amber-500' },
    { label: 'Total Arrears', value: `$${caseStats.totalAmount > 1000 ? `${(caseStats.totalAmount / 1000).toFixed(0)}K` : caseStats.totalAmount.toFixed(0)}`, icon: DollarSign, color: 'text-primary' },
    { label: 'Legal Escalations', value: caseStats.legal.toString(), icon: Scale, color: 'text-destructive' },
    { label: 'Total Cases', value: caseStats.total.toString(), icon: CheckCircle, color: 'text-emerald-600', iconClass: 'text-emerald-600' },
    { label: 'At-Risk Employers', value: stats.highCritical.toString(), icon: TrendingUp, color: 'text-amber-500', iconClass: 'text-amber-500' },
  ];

  // Risk matrix KPI row
  const riskKpis = [
    { label: 'Risk Coverage', value: `${stats.coverage}%`, subtitle: `${stats.total} of ${stats.total + (stats.total > 0 ? Math.round(stats.total * 100 / stats.coverage - stats.total) : 0)} employers`, icon: Shield, iconClass: 'text-primary' },
    { label: 'Avg Risk Score', value: stats.avgScore.toFixed(1), subtitle: 'Out of 100', icon: Target, iconClass: stats.avgScore > 50 ? 'text-destructive' : stats.avgScore > 25 ? 'text-amber-500' : 'text-emerald-600' },
    { label: 'Critical / High', value: stats.highCritical.toString(), subtitle: `${stats.total > 0 ? ((stats.highCritical / stats.total) * 100).toFixed(1) : 0}% of profiled`, icon: AlertTriangle, iconClass: 'text-destructive' },
    { label: 'Medium Risk', value: stats.medium.toString(), subtitle: `${stats.total > 0 ? ((stats.medium / stats.total) * 100).toFixed(1) : 0}% of profiled`, icon: Activity, iconClass: 'text-amber-500' },
    { label: 'Low Risk', value: stats.low.toString(), subtitle: `${stats.total > 0 ? ((stats.low / stats.total) * 100).toFixed(1) : 0}% of profiled`, icon: CheckCircle, iconClass: 'text-emerald-600' },
    { label: 'Top Risk Factor', value: getTopFactor(stats), subtitle: 'Highest avg contribution', icon: BarChart3, iconClass: 'text-primary' },
  ];

  // Radar chart data for risk factor breakdown
  const radarData = [
    { factor: 'Arrears', score: stats.avgArrears, fullMark: 25 },
    { factor: 'Violations', score: stats.avgViolation, fullMark: 25 },
    { factor: 'Filings', score: stats.avgFiling, fullMark: 10 },
    { factor: 'Payment', score: stats.avgPayment, fullMark: 15 },
    { factor: 'Legal', score: stats.avgLegal, fullMark: 15 },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Compliance Manager Dashboard</h1>
          </div>
          <p className="text-muted-foreground">Overview of compliance operations, enforcement pipeline, and key performance indicators</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/compliance/violations')}>
            <AlertTriangle className="h-4 w-4 mr-1" />Violations
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/compliance/cases')}>
            <Briefcase className="h-4 w-4 mr-1" />Cases
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/compliance/enforcement/notices')}>
            <Scale className="h-4 w-4 mr-1" />Notices
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/compliance/field/employer-360')}>
            <Eye className="h-4 w-4 mr-1" />Employer 360
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/compliance/reports')}>
            <BarChart3 className="h-4 w-4 mr-1" />Reports
          </Button>
          <Button size="sm" onClick={() => navigate('/compliance/reports/trends')}>
            <TrendingUp className="h-4 w-4 mr-1" />Trend Analysis
          </Button>
        </div>
      </div>

      {/* Operations KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.iconClass || kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Risk Matrix Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Risk Matrix Overview</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {riskKpis.map((kpi, idx) => (
            <Card key={idx} className="hover:shadow-md transition-shadow border-l-4" style={{ borderLeftColor: kpi.iconClass === 'text-destructive' ? 'hsl(0, 84%, 60%)' : kpi.iconClass === 'text-amber-500' ? 'hsl(38, 92%, 50%)' : kpi.iconClass === 'text-emerald-600' ? 'hsl(142, 71%, 45%)' : 'hsl(var(--primary))' }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{kpi.label}</CardTitle>
                <kpi.icon className={`h-4 w-4 ${kpi.iconClass}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
                {kpi.subtitle && <p className="text-xs text-muted-foreground mt-1">{kpi.subtitle}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution Pie */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Risk Band Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={riskData.distribution.filter(d => d.count > 0)}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={85}
                  dataKey="count"
                  label={({ band, count, percent }) => `${band}: ${count} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {riskData.distribution.filter(d => d.count > 0).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--popover-foreground))' }}
                  formatter={(value: number, name: string) => [value, 'Employers']}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Risk Factor Radar */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Risk Factor Analysis</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="factor" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <PolarRadiusAxis angle={90} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <Radar name="Avg Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--popover-foreground))' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cases by Status */}
        {caseStatusData.length > 0 ? (
          <Card>
            <CardHeader><CardTitle className="text-lg">Cases by Status</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={caseStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {caseStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--popover-foreground))' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-lg">Risk Score Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={riskData.distribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis type="category" dataKey="band" stroke="hsl(var(--muted-foreground))" fontSize={12} width={60} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--popover-foreground))' }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {riskData.distribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {caseStatusData.length === 0 && riskData.distribution.every(r => r.count === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No compliance data yet. Cases, violations, and risk profiles will appear here once created.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

function getTopFactor(stats: { avgArrears: number; avgViolation: number; avgFiling: number; avgPayment: number; avgLegal: number }): string {
  const factors = [
    { name: 'Arrears', val: stats.avgArrears },
    { name: 'Violations', val: stats.avgViolation },
    { name: 'Filing', val: stats.avgFiling },
    { name: 'Payment', val: stats.avgPayment },
    { name: 'Legal', val: stats.avgLegal },
  ];
  factors.sort((a, b) => b.val - a.val);
  return factors[0]?.val > 0 ? factors[0].name : 'N/A';
}

export default ManagerDashboard;
