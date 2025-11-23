import { useState } from 'react';
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Heart, TrendingUp } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";
import { QueryByFilter } from "@/components/shared/QueryByFilter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ExportActions } from '@/components/reports/ExportActions';
import { ExportColumn } from '@/utils/exportUtils';

const chartData = [
  { type: 'Age Pension', amount: 8500000, recipients: 1200 },
  { type: 'Sickness', amount: 3200000, recipients: 680 },
  { type: 'Maternity', amount: 2800000, recipients: 420 },
  { type: 'Employment Injury', amount: 1900000, recipients: 245 },
  { type: 'Survivors', amount: 1800000, recipients: 300 },
];

const mockData = [
  { benefitType: 'Age Pension', totalPaid: 8500000, recipients: 1200, avgPayment: 7083, percentage: 46.7 },
  { benefitType: 'Sickness', totalPaid: 3200000, recipients: 680, avgPayment: 4706, percentage: 17.6 },
  { benefitType: 'Maternity', totalPaid: 2800000, recipients: 420, avgPayment: 6667, percentage: 15.4 },
  { benefitType: 'Employment Injury', totalPaid: 1900000, recipients: 245, avgPayment: 7755, percentage: 10.4 },
  { benefitType: 'Survivors', totalPaid: 1800000, recipients: 300, avgPayment: 6000, percentage: 9.9 },
];

const exportColumns: ExportColumn[] = [
  { header: 'Benefit Type', key: 'benefitType', width: 25 },
  { header: 'Total Paid (EC$)', key: 'totalPaid', width: 20 },
  { header: 'Recipients', key: 'recipients', width: 15 },
  { header: 'Avg Payment (EC$)', key: 'avgPayment', width: 20 },
  { header: 'Percentage (%)', key: 'percentage', width: 15 },
];

export default function PaymentsByTypeReport() {
  const [filters, setFilters] = useState({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'benefitType', label: 'Benefit Type', type: 'select' as const, options: [
      { label: 'All Types', value: 'all' },
      { label: 'Age Pension', value: 'age' },
      { label: 'Sickness', value: 'sickness' },
      { label: 'Maternity', value: 'maternity' },
      { label: 'Employment Injury', value: 'injury' },
      { label: 'Survivors', value: 'survivors' }
    ]}
  ];

  return (
    <div className="container mx-auto p-6 space-y-6" id="payments-by-type-report">
      <div className="flex justify-between items-start">
        <PageHeader
          title="Benefit Payments by Type"
          subtitle="Distribution of benefit payments across categories"
          breadcrumbs={[
            { label: "Benefits", href: "#" },
            { label: "Reports", href: "#" },
            { label: "Payments by Type" }
          ]}
        />
        <ExportActions
          reportTitle="Benefit Payments by Type"
          fileName="benefit-payments-by-type"
          data={mockData}
          columns={exportColumns}
          additionalInfo={[
            { label: 'Report Date', value: new Date().toLocaleDateString() },
            { label: 'Total Paid', value: 'EC$ 18.2M' },
          ]}
        />
      </div>

      <div className="no-print">
        <QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total Paid"
          value="EC$ 18.2M"
          icon={DollarSign}
          trend={{ value: 5.6, label: "vs last year", isPositive: true }}
          variant="success"
        />
        <MetricCard
          title="Total Recipients"
          value="2,845"
          icon={Heart}
          subtitle="Active beneficiaries"
          variant="info"
        />
        <MetricCard
          title="Average Payment"
          value="EC$ 6,398"
          icon={TrendingUp}
          subtitle="Per recipient"
          variant="default"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Distribution by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="type" stroke="#64748B" />
              <YAxis stroke="#64748B" />
              <Tooltip />
              <Legend />
              <Bar dataKey="amount" fill="#009B4C" name="Amount (EC$)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Details by Benefit Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Benefit Type</TableHead>
                <TableHead>Total Paid (EC$)</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Avg Payment (EC$)</TableHead>
                <TableHead>Percentage (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockData.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{row.benefitType}</TableCell>
                  <TableCell>{row.totalPaid.toLocaleString()}</TableCell>
                  <TableCell>{row.recipients}</TableCell>
                  <TableCell>{row.avgPayment.toLocaleString()}</TableCell>
                  <TableCell>{row.percentage.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
