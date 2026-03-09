import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCheck, MapPin, Calendar, ClipboardCheck, AlertTriangle, CheckCircle } from 'lucide-react';

const InspectorDashboard = () => {
  const kpis = [
    { label: 'Assigned Inspections', value: '—', icon: ClipboardCheck, color: 'text-primary' },
    { label: 'Pending Field Visits', value: '—', icon: MapPin, color: 'text-warning' },
    { label: 'This Week Completed', value: '—', icon: CheckCircle, color: 'text-success' },
    { label: 'Open Violations', value: '—', icon: AlertTriangle, color: 'text-destructive' },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <UserCheck className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-semibold text-foreground">Inspector Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          Your field assignments, inspection schedule, and workload overview
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting database tables</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Today's Schedule</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-48 border-2 border-dashed border-muted rounded-lg">
              <p className="text-muted-foreground">Schedule placeholder</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Weekly Plan Status</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-48 border-2 border-dashed border-muted rounded-lg">
              <p className="text-muted-foreground">Plan status placeholder</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InspectorDashboard;
