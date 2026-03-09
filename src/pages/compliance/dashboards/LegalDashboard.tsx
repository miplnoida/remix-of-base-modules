import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Gavel, Scale, DollarSign, Clock, ArrowRight, FileText,
  AlertTriangle, Calendar, Building2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const pipelineData = [
  { stage: 'Warning', count: 8, color: 'hsl(var(--warning))' },
  { stage: 'Demand', count: 12, color: 'hsl(210, 70%, 55%)' },
  { stage: 'Final Demand', count: 6, color: 'hsl(25, 90%, 55%)' },
  { stage: 'LAR', count: 4, color: 'hsl(var(--destructive))' },
  { stage: 'Summons', count: 3, color: 'hsl(280, 60%, 55%)' },
  { stage: 'Judgment', count: 2, color: 'hsl(330, 60%, 50%)' },
  { stage: 'Enforcement', count: 1, color: 'hsl(0, 70%, 40%)' },
];

const upcomingHearings = [
  { id: 1, caseNo: 'LGL-2026-00034', employer: 'Caribbean Hotel Group', date: '2026-03-12', court: 'Magistrate Court, Basseterre', type: 'Summons Hearing' },
  { id: 2, caseNo: 'LGL-2026-00028', employer: 'Island Construction Ltd', date: '2026-03-15', court: 'High Court, Basseterre', type: 'Judgment Summons' },
  { id: 3, caseNo: 'LGL-2026-00041', employer: 'Nevis Traders Ltd', date: '2026-03-20', court: 'Magistrate Court, Charlestown', type: 'Writ of Execution' },
];

const pendingEscalations = [
  { id: 'ESC-001', employer: 'Palm View Resort', regNo: 'R-10456', arrears: '$45,200', violations: 4, riskBand: 'Critical', stage: 'Ready for LAR' },
  { id: 'ESC-002', employer: 'Sandy Point Bakery', regNo: 'R-10789', arrears: '$12,800', violations: 2, riskBand: 'High', stage: 'Final Demand Sent' },
  { id: 'ESC-003', employer: 'KN Auto Services', regNo: 'R-11023', arrears: '$28,500', violations: 3, riskBand: 'High', stage: 'Demand Notice Due' },
];

const LegalDashboard = () => {
  const navigate = useNavigate();

  const kpis = [
    { label: 'Active Legal Cases', value: '36', icon: Gavel, color: 'text-primary' },
    { label: 'Pending Escalations', value: '14', icon: Scale, color: 'text-warning' },
    { label: 'Hearings (30 days)', value: '7', icon: Clock, color: 'text-destructive' },
    { label: 'Recovery Target', value: '$1.2M', icon: DollarSign, color: 'text-success' },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Gavel className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Legal Dashboard</h1>
          </div>
          <p className="text-muted-foreground">Legal escalation pipeline, court proceedings, and enforcement tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/compliance/legal/queue')}>
            <Scale className="h-4 w-4 mr-2" />
            Legal Queue
          </Button>
          <Button onClick={() => navigate('/compliance/legal/proceedings')}>
            <Gavel className="h-4 w-4 mr-2" />
            Proceedings
          </Button>
        </div>
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

      {/* Pipeline Chart + Upcoming Hearings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Legal Pipeline Stages</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={pipelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="stage" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--popover-foreground))' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {pipelineData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Upcoming Court Hearings</CardTitle>
            <Badge variant="destructive">{upcomingHearings.length} scheduled</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingHearings.map((h) => (
                <div key={h.id} className="p-3 border border-border rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium font-mono text-foreground">{h.caseNo}</span>
                    <Badge variant="outline" className="text-[10px]">{h.type}</Badge>
                  </div>
                  <p className="text-sm text-foreground"><Building2 className="h-3 w-3 inline mr-1" />{h.employer}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{h.date}</span>
                    <span>{h.court}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Escalations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Pending Legal Escalations</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/compliance/legal/queue')}>
            View Queue <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Employer</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Reg No</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Arrears</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Violations</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Risk</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Stage</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingEscalations.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 border-border hover:bg-muted/50">
                    <td className="py-2 px-3 font-medium text-foreground">{e.employer}</td>
                    <td className="py-2 px-3 font-mono text-xs text-muted-foreground">{e.regNo}</td>
                    <td className="py-2 px-3 text-right font-medium text-foreground">{e.arrears}</td>
                    <td className="py-2 px-3 text-center">{e.violations}</td>
                    <td className="py-2 px-3 text-center">
                      <Badge variant={e.riskBand === 'Critical' ? 'destructive' : 'default'} className="text-[10px]">
                        {e.riskBand}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-foreground">{e.stage}</td>
                    <td className="py-2 px-3 text-right">
                      <Button variant="outline" size="sm" className="text-xs h-7">Review</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LegalDashboard;
