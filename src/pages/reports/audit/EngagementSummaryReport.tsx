import { useState } from 'react';
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, CheckCircle2, Clock } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";
import { QueryByFilter } from "@/components/shared/QueryByFilter";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ExportActions } from '@/components/reports/ExportActions';
import { ExportColumn } from '@/utils/exportUtils';

const chartData = [
  { name: 'Completed', value: 38, color: '#009B4C' },
  { name: 'In Progress', value: 4, color: '#F59E0B' },
];

const mockData = [
  { auditId: 'AUD-2024-001', auditName: 'C3 Compliance Review', status: 'Completed', startDate: '2024-01-15', endDate: '2024-02-28', findings: 3 },
  { auditId: 'AUD-2024-002', auditName: 'Benefits Processing', status: 'Completed', startDate: '2024-02-01', endDate: '2024-03-15', findings: 2 },
  { auditId: 'AUD-2024-003', auditName: 'Employer Registration', status: 'In Progress', startDate: '2024-03-01', endDate: null, findings: 0 },
  { auditId: 'AUD-2024-004', auditName: 'Financial Controls', status: 'Completed', startDate: '2024-01-20', endDate: '2024-02-20', findings: 5 },
  { auditId: 'AUD-2024-005', auditName: 'IT Security', status: 'In Progress', startDate: '2024-03-15', endDate: null, findings: 1 },
];

const exportColumns: ExportColumn[] = [
  { header: 'Audit ID', key: 'auditId', width: 18 },
  { header: 'Audit Name', key: 'auditName', width: 30 },
  { header: 'Status', key: 'status', width: 15 },
  { header: 'Start Date', key: 'startDate', width: 18 },
  { header: 'End Date', key: 'endDate', width: 18 },
  { header: 'Findings', key: 'findings', width: 15 },
];

export default function EngagementSummaryReport() {
  const [filters, setFilters] = useState({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'status', label: 'Status', type: 'select' as const, options: [
      { label: 'All', value: 'all' },
      { label: 'Completed', value: 'completed' },
      { label: 'In Progress', value: 'in-progress' }
    ]}
  ];

  return (
    <div className="container mx-auto p-6 space-y-6" id="engagement-summary-report">
      <div className="flex justify-between items-start">
        <PageHeader
          title="Audit Engagement Summary"
          subtitle="Overview of audit engagements"
          breadcrumbs={[
            { label: "Internal Audit", href: "/audit/plans" },
            { label: "Reports", href: "#" },
            { label: "Engagement Summary" }
          ]}
        />
        <ExportActions
          reportTitle="Audit Engagement Summary"
          fileName="audit-engagement-summary"
          data={mockData}
          columns={exportColumns}
          additionalInfo={[
            { label: 'Report Date', value: new Date().toLocaleDateString() },
            { label: 'Total Audits', value: '42' },
          ]}
        />
      </div>

      <div className="no-print">
        <QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Total Audits" value="42" icon={BarChart3} variant="info" />
        <MetricCard title="Completed" value="38" icon={CheckCircle2} variant="success" />
        <MetricCard title="In Progress" value="4" icon={Clock} variant="default" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Engagements</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Audit ID</TableHead>
                <TableHead>Audit Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Findings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockData.map((row) => (
                <TableRow key={row.auditId}>
                  <TableCell className="font-medium">{row.auditId}</TableCell>
                  <TableCell>{row.auditName}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      row.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {row.status}
                    </span>
                  </TableCell>
                  <TableCell>{row.startDate}</TableCell>
                  <TableCell>{row.endDate || '-'}</TableCell>
                  <TableCell>{row.findings}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
