import { useState } from 'react';
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, Calendar } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";
import { QueryByFilter } from "@/components/shared/QueryByFilter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ExportActions } from '@/components/reports/ExportActions';
import { ExportColumn } from '@/utils/exportUtils';

const monthlyTrendData = [
  { month: 'Jan', collections: 1800000 },
  { month: 'Feb', collections: 1950000 },
  { month: 'Mar', collections: 2100000 },
  { month: 'Apr', collections: 1880000 },
  { month: 'May', collections: 2050000 },
  { month: 'Jun', collections: 2100000 },
];

const mockData = [
  { employer: 'ABC Retail Ltd', amount: 125000, employees: 45, status: 'Paid', date: '2024-01-31' },
  { employer: 'Grand Hotel Group', amount: 98000, employees: 78, status: 'Paid', date: '2024-01-31' },
  { employer: 'Construction Ltd', amount: 87000, employees: 32, status: 'Paid', date: '2024-01-31' },
  { employer: 'Tech Services Inc', amount: 76000, employees: 56, status: 'Paid', date: '2024-01-31' },
  { employer: 'Manufacturing Co', amount: 65000, employees: 23, status: 'Pending', date: '2024-01-31' },
];

const exportColumns: ExportColumn[] = [
  { header: 'Employer', key: 'employer', width: 30 },
  { header: 'Amount (EC$)', key: 'amount', width: 20 },
  { header: 'Employees', key: 'employees', width: 15 },
  { header: 'Status', key: 'status', width: 15 },
  { header: 'Date', key: 'date', width: 18 },
];

export default function MonthlyCollectionsReport() {
  const [filters, setFilters] = useState({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'status', label: 'Payment Status', type: 'select' as const, options: [
      { label: 'All', value: 'all' },
      { label: 'Paid', value: 'paid' },
      { label: 'Pending', value: 'pending' }
    ]}
  ];

  return (
    <div className="container mx-auto p-6 space-y-6" id="monthly-collections-report">
      <div className="flex justify-between items-start">
        <PageHeader
          title="Monthly C3 Collections Report"
          subtitle="Monthly contribution collections from employers"
          breadcrumbs={[
            { label: "C3 Management", href: "/c3-management/dashboard" },
            { label: "Reports", href: "#" },
            { label: "Monthly Collections" }
          ]}
        />
        <ExportActions
          reportTitle="Monthly C3 Collections Report"
          fileName="monthly-c3-collections"
          data={mockData}
          columns={exportColumns}
          additionalInfo={[
            { label: 'Report Date', value: new Date().toLocaleDateString() },
            { label: 'This Month', value: 'EC$ 2.1M' },
          ]}
        />
      </div>

      <div className="no-print">
        <QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="This Month"
          value="EC$ 2.1M"
          icon={DollarSign}
          trend={{ value: 7.8, label: "vs last month", isPositive: true }}
          variant="success"
        />
        <MetricCard
          title="Year to Date"
          value="EC$ 18.4M"
          icon={Calendar}
          trend={{ value: 12.3, label: "vs last year", isPositive: true }}
          variant="info"
        />
        <MetricCard
          title="Collection Rate"
          value="96.5%"
          icon={TrendingUp}
          subtitle="On-time payments"
          variant="default"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" stroke="#64748B" />
              <YAxis stroke="#64748B" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="collections" stroke="#009B4C" strokeWidth={2} name="Collections (EC$)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Contributing Employers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employer</TableHead>
                <TableHead>Amount (EC$)</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockData.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{row.employer}</TableCell>
                  <TableCell>{row.amount.toLocaleString()}</TableCell>
                  <TableCell>{row.employees}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      row.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {row.status}
                    </span>
                  </TableCell>
                  <TableCell>{row.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
