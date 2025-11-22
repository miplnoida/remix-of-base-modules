import { useState } from 'react';
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { QueryByFilter, FilterField } from "@/components/shared/QueryByFilter";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CHART_COLORS } from '@/lib/chartColors';

const statusData = [
  { status: "Active", count: 1156, percentage: 93.7, color: CHART_COLORS.success },
  { status: "Inactive", count: 62, percentage: 5.0, color: CHART_COLORS.warning },
  { status: "Suspended", count: 16, percentage: 1.3, color: CHART_COLORS.error }
];

const trendData = [
  { month: 'Jan', active: 1120, inactive: 65, suspended: 18 },
  { month: 'Feb', active: 1128, inactive: 64, suspended: 17 },
  { month: 'Mar', active: 1142, inactive: 62, suspended: 16 },
  { month: 'Apr', active: 1150, inactive: 62, suspended: 16 },
  { month: 'May', active: 1154, inactive: 62, suspended: 16 },
  { month: 'Jun', active: 1156, inactive: 62, suspended: 16 }
];

export default function ActiveInactiveReport() {
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
      name: 'industry', 
      label: 'Industry', 
      type: 'select' as const,
      options: [
        { label: 'All Industries', value: 'all' },
        { label: 'Retail', value: 'retail' },
        { label: 'Hospitality', value: 'hospitality' },
        { label: 'Construction', value: 'construction' }
      ]
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Active vs Inactive Employers"
        subtitle="Status distribution of registered employers"
        breadcrumbs={[
          { label: "Employers", href: "/employers-management/dashboard" },
          { label: "Reports", href: "#" },
          { label: "Active vs Inactive" }
        ]}
      />

      <QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Active Employers"
          value="1,156"
          icon={CheckCircle}
          subtitle="93.7% of total"
          variant="success"
        />
        <MetricCard
          title="Inactive Employers"
          value="62"
          icon={XCircle}
          subtitle="5.0% of total"
          variant="warning"
        />
        <MetricCard
          title="Suspended"
          value="16"
          icon={AlertCircle}
          subtitle="1.3% of total"
          variant="error"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, percentage }) => `${status} ${percentage}%`}
                  outerRadius={80}
                  innerRadius={40}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {statusData.map((entry, index) => (
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
            <CardTitle>Status Trend (6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.gridline} />
                <XAxis dataKey="month" stroke={CHART_COLORS.text} />
                <YAxis stroke={CHART_COLORS.text} />
                <Tooltip />
                <Legend />
                <Bar dataKey="active" stackId="a" fill={CHART_COLORS.success} name="Active" />
                <Bar dataKey="inactive" stackId="a" fill={CHART_COLORS.warning} name="Inactive" />
                <Bar dataKey="suspended" stackId="a" fill={CHART_COLORS.error} name="Suspended" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {statusData.map((item) => (
              <div key={item.status} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <StatusBadge status={item.status} />
                  <span className="font-medium">{item.status} Employers</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">{item.count} employers</span>
                  <span className="font-semibold text-primary">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}