import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  UserCheck, MapPin, Calendar, ClipboardCheck, AlertTriangle,
  CheckCircle, Clock, ArrowRight, Building2
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';

const todaySchedule = [
  { id: 1, employer: 'Caribbean Hotel Group', regNo: 'R-10234', type: 'Routine Inspection', time: '09:00 AM', status: 'Completed', location: 'Basseterre' },
  { id: 2, employer: 'Island Construction Ltd', regNo: 'R-10567', type: 'Follow-up Visit', time: '11:00 AM', status: 'In Progress', location: 'Frigate Bay' },
  { id: 3, employer: 'Nevis Auto Parts', regNo: 'R-10892', type: 'Wage Book Review', time: '02:00 PM', status: 'Scheduled', location: 'Charlestown' },
  { id: 4, employer: 'KN Shipping Services', regNo: 'R-11023', type: 'Complaint Investigation', time: '04:00 PM', status: 'Scheduled', location: 'Bird Rock' },
];

const openViolations = [
  { id: 'VIO-2026-00098', employer: 'Sandy Point Bakery', type: 'Late Filing', dueDate: '2026-03-15', priority: 'Medium' },
  { id: 'VIO-2026-00112', employer: 'Palm View Resort', type: 'Under Declaration', dueDate: '2026-03-12', priority: 'High' },
  { id: 'VIO-2026-00125', employer: 'Tropical Traders Inc', type: 'Non Payment', dueDate: '2026-03-18', priority: 'Critical' },
];

const InspectorDashboard = () => {
  const navigate = useNavigate();

  const kpis = [
    { label: 'Assigned Inspections', value: '12', icon: ClipboardCheck, color: 'text-primary' },
    { label: 'Pending Field Visits', value: '4', icon: MapPin, color: 'text-warning' },
    { label: 'Completed This Week', value: '8', icon: CheckCircle, color: 'text-success' },
    { label: 'Open Violations', value: '6', icon: AlertTriangle, color: 'text-destructive' },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Inspector Dashboard</h1>
          </div>
          <p className="text-muted-foreground">Your field assignments, inspection schedule, and workload overview</p>
        </div>
        <Button onClick={() => navigate('/compliance/inspections/field-execution')}>
          <MapPin className="h-4 w-4 mr-2" />
          Start Field Visit
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx}>
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

      {/* Weekly Plan Progress */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Weekly Plan Progress</CardTitle>
          <Badge variant="outline">Week of Mar 3 – Mar 7, 2026</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">8 of 12 planned visits completed</span>
            <span className="font-medium text-foreground">67%</span>
          </div>
          <Progress value={67} className="h-2" />
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-success" /> 8 Completed</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-warning" /> 2 In Progress</span>
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-muted-foreground" /> 2 Remaining</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Today's Schedule</CardTitle>
            <Badge>{todaySchedule.length} visits</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todaySchedule.map((visit) => (
                <div key={visit.id} className="flex items-center justify-between py-2 border-b last:border-0 border-border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{visit.employer}</p>
                      <Badge variant="outline" className="text-[10px] h-5 font-mono">{visit.regNo}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{visit.time}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{visit.location}</span>
                      <span>{visit.type}</span>
                    </div>
                  </div>
                  <Badge variant={
                    visit.status === 'Completed' ? 'default' :
                    visit.status === 'In Progress' ? 'secondary' : 'outline'
                  } className="text-[10px]">
                    {visit.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Open Violations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">My Open Violations</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/compliance/violations')}>
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {openViolations.map((v) => (
                <div key={v.id} className="flex items-center justify-between py-2 border-b last:border-0 border-border">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium font-mono text-foreground">{v.id}</p>
                      <Badge variant={
                        v.priority === 'Critical' ? 'destructive' :
                        v.priority === 'High' ? 'default' : 'secondary'
                      } className="text-[10px] h-5">
                        {v.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <Building2 className="h-3 w-3 inline mr-1" />{v.employer} · {v.type}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">Due: {v.dueDate}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InspectorDashboard;
