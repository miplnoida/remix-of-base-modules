import { useState, useMemo } from 'react';
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, TrendingUp, Activity } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";
import { QueryByFilter, FilterField } from "@/components/shared/QueryByFilter";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CHART_COLORS } from '@/lib/chartColors';
import { ExportActions } from '@/components/reports/ExportActions';
import { ExportColumn } from '@/utils/exportUtils';

// Mock data for employer table
const employerTableData = [
  { employerId: 'EMP001', employerName: 'ABC Retail Ltd', industry: 'Retail', zone: 'Zone 1', registrationDate: '2023-01-15', status: 'Active', employeeCount: 45 },
  { employerId: 'EMP002', employerName: 'Grand Hotel', industry: 'Hospitality', zone: 'Zone 2', registrationDate: '2023-02-20', status: 'Active', employeeCount: 78 },
  { employerId: 'EMP003', employerName: 'Build Pro Construction', industry: 'Construction', zone: 'Zone 1', registrationDate: '2023-03-10', status: 'Active', employeeCount: 32 },
  { employerId: 'EMP004', employerName: 'Tech Services Inc', industry: 'Services', zone: 'Zone 3', registrationDate: '2023-03-25', status: 'Active', employeeCount: 56 },
  { employerId: 'EMP005', employerName: 'Manufacturing Co', industry: 'Manufacturing', zone: 'Zone 2', registrationDate: '2023-04-12', status: 'Inactive', employeeCount: 23 },
];

const exportColumns: ExportColumn[] = [
  { header: 'Employer ID', key: 'employerId', width: 15 },
  { header: 'Employer Name', key: 'employerName', width: 30 },
  { header: 'Industry', key: 'industry', width: 20 },
  { header: 'Zone', key: 'zone', width: 15 },
  { header: 'Registration Date', key: 'registrationDate', width: 20 },
  { header: 'Status', key: 'status', width: 15 },
  { header: 'Employee Count', key: 'employeeCount', width: 15 },
];

// Mock data for registration trend
const registrationTrendData = [
  { month: 'Jan', count: 42 },
  { month: 'Feb', count: 38 },
  { month: 'Mar', count: 51 },
  { month: 'Apr', count: 45 },
  { month: 'May', count: 56 },
  { month: 'Jun', count: 63 }
];

// Mock data for industry breakdown
const industryData = [
  { name: 'Retail', value: 285, color: CHART_COLORS.primary },
  { name: 'Hospitality', value: 198, color: CHART_COLORS.blue },
  { name: 'Construction', value: 156, color: CHART_COLORS.teal },
  { name: 'Services', value: 224, color: CHART_COLORS.gold },
  { name: 'Manufacturing', value: 145, color: CHART_COLORS.primaryDark },
  { name: 'Other', value: 226, color: CHART_COLORS.gray }
];

export default function RegisteredSummaryReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  // Calculate current quarter dates
  const getCurrentQuarter = () => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const startMonth = quarter * 3;
    const startDate = new Date(now.getFullYear(), startMonth, 1);
    const endDate = new Date(now.getFullYear(), startMonth + 3, 0);
    return {
      from: startDate.toISOString().split('T')[0],
      to: endDate.toISOString().split('T')[0]
    };
  };

  const currentQuarter = useMemo(() => getCurrentQuarter(), []);

  const filterFields: FilterField[] = [
    { 
      name: 'dateRange', 
      label: 'Date Range (Default: Current Quarter)', 
      type: 'daterange' as const
    },
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
      name: 'industry', 
      label: 'Industry', 
      type: 'select' as const,
      options: [
        { label: 'All Industries', value: 'all' },
        { label: 'Retail', value: 'retail' },
        { label: 'Hospitality', value: 'hospitality' },
        { label: 'Construction', value: 'construction' },
        { label: 'Services', value: 'services' },
        { label: 'Manufacturing', value: 'manufacturing' }
      ]
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-start">
        <PageHeader
          title="Registered Employers Summary"
          subtitle="Overview of all registered employers"
          breadcrumbs={[
            { label: "Employers", href: "/employers-management/dashboard" },
            { label: "Reports", href: "#" },
            { label: "Registered Summary" }
          ]}
        />
        <ExportActions
          reportTitle="Registered Employers Summary"
          fileName="registered-employers-summary"
          data={employerTableData}
          columns={exportColumns}
          additionalInfo={[
            { label: 'Report Date', value: new Date().toLocaleDateString() },
            { label: 'Total Employers', value: '1,234' },
            { label: 'Active Employers', value: '1,156' }
          ]}
        />
      </div>

      <QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Employers"
          value="1,234"
          icon={Building2}
          trend={{ value: 4.5, label: "vs last month", isPositive: true }}
          variant="default"
        />
        <MetricCard
          title="Active Employers"
          value="1,156"
          icon={Activity}
          subtitle="93.7% of total"
          variant="success"
        />
        <MetricCard
          title="Total Employees"
          value="12,450"
          icon={Users}
          trend={{ value: 6.2, label: "vs last month", isPositive: true }}
          variant="info"
        />
        <MetricCard
          title="New This Quarter"
          value="295"
          icon={TrendingUp}
          variant="default"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registration Trend (Current Quarter)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={registrationTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.gridline} />
              <XAxis dataKey="month" stroke={CHART_COLORS.text} />
              <YAxis stroke={CHART_COLORS.text} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke={CHART_COLORS.primary} 
                strokeWidth={2}
                name="New Registrations"
                dot={{ fill: CHART_COLORS.primary, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Employer Distribution by Industry</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={industryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {industryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Industries by Employer Count</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={industryData.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.gridline} />
                <XAxis type="number" stroke={CHART_COLORS.text} />
                <YAxis dataKey="name" type="category" width={100} stroke={CHART_COLORS.text} />
                <Tooltip />
                <Bar dataKey="value" fill={CHART_COLORS.primary} radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}