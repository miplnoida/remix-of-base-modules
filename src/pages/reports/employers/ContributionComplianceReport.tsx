import { useState } from 'react';
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";
import { QueryByFilter, FilterField } from "@/components/shared/QueryByFilter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CHART_COLORS } from '@/lib/chartColors';
import { Badge } from '@/components/ui/badge';

const complianceTrendData = [
  { month: 'Jan', compliant: 94.5, late: 4.2, missing: 1.3 },
  { month: 'Feb', compliant: 93.8, late: 4.8, missing: 1.4 },
  { month: 'Mar', compliant: 94.0, late: 4.5, missing: 1.5 },
  { month: 'Apr', compliant: 94.2, late: 4.4, missing: 1.4 },
  { month: 'May', compliant: 94.1, late: 4.5, missing: 1.4 },
  { month: 'Jun', compliant: 94.2, late: 4.4, missing: 1.4 }
];

const nonCompliantEmployers = [
  { id: 'EMP-001', name: 'ABC Trading Ltd', lastSubmission: '2024-01-15', missedMonths: 5, status: 'Critical' },
  { id: 'EMP-002', name: 'XYZ Services Inc', lastSubmission: '2024-02-20', missedMonths: 4, status: 'High' },
  { id: 'EMP-003', name: 'Global Import Co', lastSubmission: '2024-03-10', missedMonths: 3, status: 'Medium' },
  { id: 'EMP-004', name: 'Tech Solutions Ltd', lastSubmission: '2024-03-28', missedMonths: 3, status: 'Medium' },
  { id: 'EMP-005', name: 'Retail Plus Inc', lastSubmission: '2024-04-15', missedMonths: 2, status: 'Low' },
  { id: 'EMP-006', name: 'Construction Works', lastSubmission: '2024-04-20', missedMonths: 2, status: 'Low' },
  { id: 'EMP-007', name: 'Transport Co Ltd', lastSubmission: '2024-05-05', missedMonths: 1, status: 'Low' }
];

export default function ContributionComplianceReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields: FilterField[] = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { 
      name: 'zone', 
      label: 'Zone', 
      type: 'select' as const, 
      options: [
        { label: 'All Zones', value: 'all' },
        { label: 'Zone 1', value: 'zone1' },
        { label: 'Zone 2', value: 'zone2' },
        { label: 'Zone 3', value: 'zone3' },
        { label: 'Zone 4', value: 'zone4' }
      ]
    },
    { 
      name: 'complianceStatus', 
      label: 'Compliance Status', 
      type: 'select' as const,
      options: [
        { label: 'All Statuses', value: 'all' },
        { label: 'Compliant', value: 'compliant' },
        { label: 'Late', value: 'late' },
        { label: 'Non-Compliant', value: 'non-compliant' }
      ]
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'Critical': 'destructive',
      'High': 'destructive',
      'Medium': 'secondary',
      'Low': 'outline'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Employer Contribution Compliance"
        subtitle="Compliance status of employer contributions"
        breadcrumbs={[
          { label: "Employers", href: "/employers-management/dashboard" },
          { label: "Reports", href: "#" },
          { label: "Contribution Compliance" }
        ]}
      />

      <QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Fully Compliant"
          value="1,089"
          icon={CheckCircle}
          subtitle="94.2% on time"
          variant="success"
        />
        <MetricCard
          title="Late Submissions"
          value="51"
          icon={AlertTriangle}
          subtitle="4.4% late"
          variant="warning"
        />
        <MetricCard
          title="Non-Compliant"
          value="16"
          icon={XCircle}
          subtitle="1.4% missing"
          variant="error"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compliance Trend (6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={complianceTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.gridline} />
              <XAxis dataKey="month" stroke={CHART_COLORS.text} />
              <YAxis stroke={CHART_COLORS.text} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="compliant" 
                stroke={CHART_COLORS.success} 
                strokeWidth={2}
                name="Compliant %"
                dot={{ fill: CHART_COLORS.success, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="late" 
                stroke={CHART_COLORS.warning} 
                strokeWidth={2}
                name="Late %"
                dot={{ fill: CHART_COLORS.warning, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="missing" 
                stroke={CHART_COLORS.error} 
                strokeWidth={2}
                name="Non-Compliant %"
                dot={{ fill: CHART_COLORS.error, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Non-Compliant Employers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employer ID</TableHead>
                <TableHead>Employer Name</TableHead>
                <TableHead>Last Submission</TableHead>
                <TableHead>Missed Months</TableHead>
                <TableHead>Risk Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nonCompliantEmployers.map((employer) => (
                <TableRow key={employer.id}>
                  <TableCell className="font-medium">{employer.id}</TableCell>
                  <TableCell>{employer.name}</TableCell>
                  <TableCell>{employer.lastSubmission}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      employer.missedMonths >= 4 ? 'bg-red-100 text-red-800' : 
                      employer.missedMonths >= 2 ? 'bg-orange-100 text-orange-800' : 
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {employer.missedMonths}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(employer.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}