import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ClipboardList, TrendingUp, UserCog } from 'lucide-react';
import { CHART_COLORS, CHART_STYLES } from '@/lib/chartColors';

const mockData = {
  summary: { totalClaims: 678, avgPerOfficer: 85, peakDay: 42 },
  byOfficer: [
    { officer: 'Officer A', claims: 142 },
    { officer: 'Officer B', claims: 135 },
    { officer: 'Officer C', claims: 128 },
    { officer: 'Officer D', claims: 115 },
    { officer: 'Others', claims: 158 }
  ],
  byType: [
    { type: 'Age Benefit', count: 234 },
    { type: 'Disability', count: 189 },
    { type: 'Survivor', count: 145 },
    { type: 'Maternity', count: 110 }
  ],
  timeline: [
    { week: 'Week 1', claims: 128 },
    { week: 'Week 2', claims: 142 },
    { week: 'Week 3', claims: 135 },
    { week: 'Week 4', claims: 145 },
    { week: 'Week 5', claims: 128 }
  ],
  details: [
    { claimId: 'CLM-001', personId: 'IP-2024-001', type: 'Age Benefit', officer: 'Officer A', date: '2024-05-15' },
    { claimId: 'CLM-002', personId: 'IP-2024-002', type: 'Disability', officer: 'Officer B', date: '2024-05-14' },
    { claimId: 'CLM-003', personId: 'IP-2024-003', type: 'Survivor', officer: 'Officer A', date: '2024-05-13' },
    { claimId: 'CLM-004', personId: 'IP-2024-004', type: 'Maternity', officer: 'Officer C', date: '2024-05-12' }
  ]
};

export default function ClaimsEnteredByOfficerReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'claimType', label: 'Claim Type', type: 'select' as const, options: [
      { label: 'Age Benefit', value: 'age' },
      { label: 'Disability', value: 'disability' },
      { label: 'Survivor', value: 'survivor' },
      { label: 'Maternity', value: 'maternity' }
    ]},
    { name: 'officer', label: 'Officer', type: 'text' as const }
  ];

  return (
    <ReportLayout
      title="Claims Entered by CRD Officer Report"
      subtitle="Track claims intake and entry at CRD by officer"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'Claims Entered by Officer' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={false} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard title="Total Claims Entered" value={mockData.summary.totalClaims.toString()} icon={ClipboardList} variant="info" />
          <MetricCard title="Avg. Per Officer" value={mockData.summary.avgPerOfficer.toString()} icon={UserCog} variant="info" />
          <MetricCard title="Peak Day" value={mockData.summary.peakDay.toString()} icon={TrendingUp} variant="success" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Claims by Officer</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mockData.byOfficer}>
                  <CartesianGrid {...CHART_STYLES.grid} />
                  <XAxis dataKey="officer" {...CHART_STYLES.axis} />
                  <YAxis {...CHART_STYLES.axis} />
                  <Tooltip {...CHART_STYLES.tooltip} />
                  <Bar dataKey="claims" fill={CHART_COLORS.primary} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Weekly Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockData.timeline}>
                  <CartesianGrid {...CHART_STYLES.grid} />
                  <XAxis dataKey="week" {...CHART_STYLES.axis} />
                  <YAxis {...CHART_STYLES.axis} />
                  <Tooltip {...CHART_STYLES.tooltip} />
                  <Line type="monotone" dataKey="claims" stroke={CHART_COLORS.primary} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      }
      tableArea={
        <Card>
          <CardHeader><CardTitle>Claim Entry Details</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim ID</TableHead>
                  <TableHead>Person ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Officer</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.details.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.claimId}</TableCell>
                    <TableCell>{row.personId}</TableCell>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>{row.officer}</TableCell>
                    <TableCell>{row.date}</TableCell>
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
