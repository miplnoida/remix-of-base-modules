import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { UserX, Users, TrendingUp, Calendar } from 'lucide-react';
import { age62WithoutClaimData } from '@/services/mockData/reportsData';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))'];

export default function Age62WithoutClaimReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'ageRange', label: 'Age Range', type: 'select' as const, options: [
      { label: '62-64', value: '62-64' },
      { label: '65-67', value: '65-67' },
      { label: '68+', value: '68+' }
    ]},
    { name: 'contributionYears', label: 'Min. Contribution Years', type: 'text' as const },
    { name: 'branch', label: 'Branch', type: 'select' as const, options: [
      { label: 'Basseterre', value: 'basseterre' },
      { label: 'Charlestown', value: 'charlestown' }
    ]},
    { name: 'gender', label: 'Gender', type: 'select' as const, options: [
      { label: 'Male', value: 'male' },
      { label: 'Female', value: 'female' }
    ]}
  ];

  const handleFilter = (newFilters: Record<string, any>) => {
    setFilters(newFilters);
  };

  return (
    <ReportLayout
      title="Insured Persons Aged 62+ Without Age Claim Report"
      subtitle="Identify eligible persons who have not filed age benefit claims"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'Age 62+ Without Claim' }
      ]}
      filterPanel={
        <QueryByFilter
          fields={filterFields}
          onFilter={handleFilter}
          defaultExpanded={false}
        />
      }
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Eligible" value={age62WithoutClaimData.summary.totalEligible.toString()} icon={UserX} variant="warning" />
          <MetricCard title="Age 62-64" value={age62WithoutClaimData.summary.age6264.toString()} icon={Users} variant="default" />
          <MetricCard title="Age 65-67" value={age62WithoutClaimData.summary.age6567.toString()} icon={Users} variant="default" />
          <MetricCard title="Over 68" value={age62WithoutClaimData.summary.over68.toString()} icon={Calendar} variant="error" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Distribution by Age</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={age62WithoutClaimData.byAge}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="age" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--warning))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Distribution by Gender</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={age62WithoutClaimData.byGender}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.gender}: ${entry.count}`}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="count"
                  >
                    {age62WithoutClaimData.byGender.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Eligible Persons Without Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Contribution Years</TableHead>
                  <TableHead>Last Contribution</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Claim Filed?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {age62WithoutClaimData.details.map((row) => (
                  <TableRow key={row.ipId}>
                    <TableCell className="font-medium">{row.ipId}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.dob}</TableCell>
                    <TableCell>{row.age}</TableCell>
                    <TableCell>{row.contributionYears}</TableCell>
                    <TableCell>{row.lastContribution}</TableCell>
                    <TableCell>{row.branch}</TableCell>
                    <TableCell>{row.contact}</TableCell>
                    <TableCell>
                      <span className="text-destructive font-semibold">{row.claimFiled}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      }
      onExportCSV={() => console.log('Export CSV')}
      onExportPDF={() => console.log('Export PDF')}
    />
  );
}
