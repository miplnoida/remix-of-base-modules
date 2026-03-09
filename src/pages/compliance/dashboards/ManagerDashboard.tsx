import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, AlertTriangle, DollarSign, Scale,
  TrendingUp, CheckCircle, ArrowUpRight, Clock,
  Briefcase, Eye, Loader2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const ManagerDashboard = () => {
  const navigate = useNavigate();

  const { data: violationCount = 0, isLoading: lv } = useQuery({
    queryKey: ['ce_dashboard_violations'],
    queryFn: async () => {
      const { count, error } = await supabase.from('ce_violations').select('*', { count: 'exact', head: true }).in('status', ['OPEN', 'UNDER_REVIEW', 'ESCALATED']);
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

  const { data: riskDistribution = [], isLoading: lr } = useQuery({
    queryKey: ['ce_dashboard_risk'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ce_risk_profiles').select('risk_band');
      if (error) throw error;
      const profiles = (data || []) as unknown as { risk_band: string }[];
      const bands = ['Low', 'Medium', 'High', 'Critical'];
      return bands.map(b => ({ band: b, count: profiles.filter(p => p.risk_band === b).length }));
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
        { name: 'Under Review', statuses: ['UNDER_REVIEW'], color: 'hsl(var(--warning))' },
        { name: 'Notice Issued', statuses: ['NOTICE_ISSUED', 'AWAITING_RESPONSE'], color: 'hsl(210, 70%, 55%)' },
        { name: 'Legal', statuses: ['LEGAL_REVIEW', 'COURT_ACTION', 'ENFORCEMENT_IN_PROGRESS'], color: 'hsl(var(--destructive))' },
        { name: 'Resolved', statuses: ['RESOLVED', 'CLOSED'], color: 'hsl(var(--success))' },
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

  const kpis = [
    { label: 'Active Violations', value: violationCount.toString(), icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Open Cases', value: caseStats.open.toString(), icon: Briefcase, color: 'text-warning' },
    { label: 'Total Arrears', value: `$${caseStats.totalAmount > 1000 ? `${(caseStats.totalAmount / 1000).toFixed(0)}K` : caseStats.totalAmount.toFixed(0)}`, icon: DollarSign, color: 'text-primary' },
    { label: 'Legal Escalations', value: caseStats.legal.toString(), icon: Scale, color: 'text-destructive' },
    { label: 'Total Cases', value: caseStats.total.toString(), icon: CheckCircle, color: 'text-success' },
    { label: 'At-Risk Employers', value: riskDistribution.filter(r => r.band === 'High' || r.band === 'Critical').reduce((s, r) => s + r.count, 0).toString(), icon: TrendingUp, color: 'text-warning' },
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/compliance/cases')}>
            <Eye className="h-4 w-4 mr-2" />View Cases
          </Button>
          <Button onClick={() => navigate('/compliance/reports/case-analytics')}>
            <TrendingUp className="h-4 w-4 mr-2" />Full Reports
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {caseStatusData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Cases by Status</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={caseStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {caseStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--popover-foreground))' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-lg">Employer Risk Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={riskDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis type="category" dataKey="band" stroke="hsl(var(--muted-foreground))" fontSize={12} width={60} />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--popover-foreground))' }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {caseStatusData.length === 0 && riskDistribution.every(r => r.count === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No compliance data yet. Cases, violations, and risk profiles will appear here once created.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ManagerDashboard;
