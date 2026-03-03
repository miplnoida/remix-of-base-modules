import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeft, TrendingUp, AlertTriangle, FileText, Calendar } from 'lucide-react';

export default function EmployerRiskProfile() {
  const { employerId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Mock employer data
  const employer = {
    id: 'EMP-1234',
    name: 'Paradise Beach Hotel Ltd',
    zone: 'Zone 1 - Basseterre',
    currentRiskScore: 85,
    currentRiskBand: 'High',
    lastAuditDate: '2022-03-15',
    nextAuditDue: '2024-09-15',
    arrears: 78500,
    employeeCount: 145,
    sector: 'Hospitality'
  };

  // Risk score history
  const riskScoreHistory = [
    { month: 'Jan', score: 72 },
    { month: 'Feb', score: 75 },
    { month: 'Mar', score: 78 },
    { month: 'Apr', score: 82 },
    { month: 'May', score: 85 },
    { month: 'Jun', score: 85 }
  ];

  // Sampling history
  const samplingHistory = [
    { date: '2024-06-01', batch: 'BATCH-2024-06', selected: true, type: 'Mandatory', reason: 'Arrears > EC$ 75,000' },
    { date: '2024-05-01', batch: 'BATCH-2024-05', selected: false, type: 'N/A', reason: 'Not selected' },
    { date: '2024-04-01', batch: 'BATCH-2024-04', selected: false, type: 'N/A', reason: 'Not selected' },
    { date: '2024-03-01', batch: 'BATCH-2024-03', selected: true, type: 'Risk', reason: 'High risk score' },
  ];

  // Past audits
  const pastAudits = [
    { date: '2022-03-15', type: 'Full Audit', findings: 'Late submissions, missing payments', penalty: 15000, status: 'Resolved' },
    { date: '2020-08-20', type: 'Desk Review', findings: 'Minor discrepancies', penalty: 0, status: 'Resolved' },
    { date: '2019-01-10', type: 'Full Audit', findings: 'No issues found', penalty: 0, status: 'Closed' },
  ];

  // C3 Filing behavior
  const c3Behavior = [
    { month: 'Jan 2024', status: 'Late', daysLate: 5 },
    { month: 'Feb 2024', status: 'Late', daysLate: 8 },
    { month: 'Mar 2024', status: 'On-Time', daysLate: 0 },
    { month: 'Apr 2024', status: 'Late', daysLate: 12 },
    { month: 'May 2024', status: 'Late', daysLate: 6 },
    { month: 'Jun 2024', status: 'Late', daysLate: 4 },
  ];

  // Arrears history
  const arrearsHistory = [
    { month: 'Jan', amount: 55000 },
    { month: 'Feb', amount: 62000 },
    { month: 'Mar', amount: 68000 },
    { month: 'Apr', amount: 72000 },
    { month: 'May', amount: 75000 },
    { month: 'Jun', amount: 78500 }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'XCD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getRiskBadgeColor = (band: string) => {
    switch (band) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title={employer.name}
        subtitle="Risk Profile & Audit History"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Employers', href: '/compliance/employers' },
          { label: 'Risk Profile' }
        ]}
      />

      {/* Employer Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">{employer.name}</CardTitle>
                <Badge className={getRiskBadgeColor(employer.currentRiskBand)}>
                  {employer.currentRiskBand} Risk
                </Badge>
              </div>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>ID: {employer.id}</span>
                <span>•</span>
                <span>Zone: {employer.zone}</span>
                <span>•</span>
                <span>Sector: {employer.sector}</span>
                <span>•</span>
                <span>Employees: {employer.employeeCount}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Current Risk Score</div>
              <div className="text-4xl font-bold text-destructive">{employer.currentRiskScore}</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Arrears Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(employer.arrears)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Audit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{employer.lastAuditDate}</div>
            <p className="text-xs text-muted-foreground mt-1">27 months ago</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Next Audit Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{employer.nextAuditDue}</div>
            <p className="text-xs text-muted-foreground mt-1">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">C3 Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">33%</div>
            <p className="text-xs text-muted-foreground mt-1">On-time (last 6 months)</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <TrendingUp className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="audits">
            <FileText className="h-4 w-4 mr-2" />
            Audit History
          </TabsTrigger>
          <TabsTrigger value="sampling">
            <Calendar className="h-4 w-4 mr-2" />
            Sampling History
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <AlertTriangle className="h-4 w-4 mr-2" />
            C3 Behavior
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Risk Score Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={riskScoreHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--destructive))" strokeWidth={2} name="Risk Score" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Arrears Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={arrearsHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="amount" fill="hsl(var(--destructive))" name="Arrears" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Past Audits & Findings</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Audit Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Findings</TableHead>
                    <TableHead>Penalty</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastAudits.map((audit, index) => (
                    <TableRow key={index}>
                      <TableCell>{audit.date}</TableCell>
                      <TableCell>{audit.type}</TableCell>
                      <TableCell className="max-w-xs">{audit.findings}</TableCell>
                      <TableCell>
                        {audit.penalty > 0 ? (
                          <span className="font-medium text-destructive">{formatCurrency(audit.penalty)}</span>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={audit.status === 'Resolved' ? 'default' : 'secondary'}>
                          {audit.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sampling" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sampling History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Selected</TableHead>
                    <TableHead>Selection Type</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {samplingHistory.map((sample, index) => (
                    <TableRow key={index}>
                      <TableCell>{sample.date}</TableCell>
                      <TableCell>{sample.batch}</TableCell>
                      <TableCell>
                        <Badge variant={sample.selected ? 'default' : 'secondary'}>
                          {sample.selected ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>{sample.type}</TableCell>
                      <TableCell>{sample.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>C3 Filing Behavior (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Days Late</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {c3Behavior.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell>{record.month}</TableCell>
                      <TableCell>
                        <Badge variant={record.status === 'On-Time' ? 'default' : 'destructive'}>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.daysLate > 0 ? (
                          <span className="text-destructive font-medium">{record.daysLate} days</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
