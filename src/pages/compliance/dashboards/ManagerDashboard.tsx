import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, AlertTriangle, Building2, DollarSign, Scale,
  TrendingUp, CheckCircle, ArrowUpRight, ArrowDownRight, Clock,
  Users, Briefcase, Eye
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const violationTrendData = [
  { month: 'Sep', created: 18, resolved: 12 },
  { month: 'Oct', created: 22, resolved: 15 },
  { month: 'Nov', created: 15, resolved: 20 },
  { month: 'Dec', created: 28, resolved: 18 },
  { month: 'Jan', created: 20, resolved: 22 },
  { month: 'Feb', created: 25, resolved: 19 },
];

const caseStatusData = [
  { name: 'Open', value: 34, color: 'hsl(var(--primary))' },
  { name: 'Under Review', value: 18, color: 'hsl(var(--warning))' },
  { name: 'Notice Issued', value: 12, color: 'hsl(210, 70%, 55%)' },
  { name: 'Legal Review', value: 8, color: 'hsl(var(--destructive))' },
  { name: 'Resolved', value: 45, color: 'hsl(var(--success))' },
];

const riskDistribution = [
  { band: 'Low', count: 142 },
  { band: 'Medium', count: 87 },
  { band: 'High', count: 34 },
  { band: 'Critical', count: 12 },
];

const recentActivity = [
  { id: 1, action: 'Violation VIO-2026-00142 created', type: 'Late Filing', time: '12 min ago', severity: 'Medium' },
  { id: 2, action: 'Case CASE-2026-00089 escalated to Legal', type: 'Non Payment', time: '45 min ago', severity: 'High' },
  { id: 3, action: 'Payment arrangement approved for R-10234', type: 'Arrangement', time: '1 hr ago', severity: 'Low' },
  { id: 4, action: 'Inspection INS-2026-00056 completed', type: 'Inspection', time: '2 hrs ago', severity: 'Medium' },
  { id: 5, action: 'Waiver WVR-2026-00012 pending approval', type: 'Waiver', time: '3 hrs ago', severity: 'High' },
  { id: 6, action: 'Risk reclassification: R-10567 → Critical', type: 'Risk', time: '4 hrs ago', severity: 'Critical' },
];

const ManagerDashboard = () => {
  const navigate = useNavigate();

  const kpis = [
    { label: 'Active Violations', value: '128', change: '+12', trend: 'up', icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Open Cases', value: '72', change: '-3', trend: 'down', icon: Briefcase, color: 'text-warning' },
    { label: 'Total Arrears', value: '$2.4M', change: '+$180K', trend: 'up', icon: DollarSign, color: 'text-primary' },
    { label: 'Legal Escalations', value: '18', change: '+5', trend: 'up', icon: Scale, color: 'text-destructive' },
    { label: 'Compliance Rate', value: '76.3%', change: '+2.1%', trend: 'up', icon: CheckCircle, color: 'text-success' },
    { label: 'At-Risk Employers', value: '46', change: '-4', trend: 'down', icon: TrendingUp, color: 'text-warning' },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Compliance Manager Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            Overview of compliance operations, enforcement pipeline, and key performance indicators
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/compliance/cases')}>
            <Eye className="h-4 w-4 mr-2" />
            View Cases
          </Button>
          <Button onClick={() => navigate('/compliance/reports/case-analytics')}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Full Reports
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
              <div className="flex items-center gap-1 mt-1">
                {kpi.trend === 'up' ? (
                  <ArrowUpRight className={`h-3 w-3 ${kpi.label === 'Compliance Rate' ? 'text-success' : 'text-destructive'}`} />
                ) : (
                  <ArrowDownRight className={`h-3 w-3 ${kpi.label === 'Compliance Rate' ? 'text-destructive' : 'text-success'}`} />
                )}
                <span className="text-xs text-muted-foreground">{kpi.change} this month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Violation Trends (6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={violationTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--popover-foreground))' }}
                />
                <Legend />
                <Line type="monotone" dataKey="created" stroke="hsl(var(--destructive))" strokeWidth={2} name="Created" />
                <Line type="monotone" dataKey="resolved" stroke="hsl(var(--success))" strokeWidth={2} name="Resolved" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cases by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={caseStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {caseStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--popover-foreground))' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Employer Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
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

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs">View All</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0 border-border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.action}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px] h-5">{item.type}</Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />{item.time}
                      </span>
                    </div>
                  </div>
                  <Badge variant={
                    item.severity === 'Critical' ? 'destructive' :
                    item.severity === 'High' ? 'default' :
                    item.severity === 'Medium' ? 'secondary' : 'outline'
                  } className="ml-2 text-[10px]">
                    {item.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManagerDashboard;
