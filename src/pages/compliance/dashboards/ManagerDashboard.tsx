import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LayoutDashboard, AlertTriangle, Building2, DollarSign, Scale, TrendingUp, Users, CheckCircle } from 'lucide-react';

const ManagerDashboard = () => {
  const kpis = [
    { label: 'Active Violations', value: '—', icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Open Cases', value: '—', icon: Building2, color: 'text-warning' },
    { label: 'Total Arrears', value: '—', icon: DollarSign, color: 'text-primary' },
    { label: 'Legal Escalations', value: '—', icon: Scale, color: 'text-muted-foreground' },
    { label: 'Compliance Rate', value: '—', icon: CheckCircle, color: 'text-success' },
    { label: 'At-Risk Employers', value: '—', icon: TrendingUp, color: 'text-orange-500' },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-semibold text-foreground">Compliance Manager Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          Overview of compliance operations, enforcement pipeline, and key performance indicators
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">Data will populate once tables are created</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Violation Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-48 border-2 border-dashed border-muted rounded-lg">
              <p className="text-muted-foreground">Chart placeholder — awaiting database tables</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cases by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-48 border-2 border-dashed border-muted rounded-lg">
              <p className="text-muted-foreground">Chart placeholder — awaiting database tables</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 border-2 border-dashed border-muted rounded-lg">
            <p className="text-muted-foreground">Activity feed placeholder — awaiting database tables</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagerDashboard;
