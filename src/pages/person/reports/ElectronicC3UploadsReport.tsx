import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Upload, Building2, TrendingUp, CheckCircle } from 'lucide-react';
import { electronicC3Data } from '@/services/mockData/reportsData';
import { StatusBadge } from '@/components/shared/StatusBadge';

export default function ElectronicC3UploadsReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'employer', label: 'Employer', type: 'text' as const },
    { name: 'method', label: 'Upload Method', type: 'select' as const, options: [
      { label: 'Portal', value: 'portal' },
      { label: 'API', value: 'api' }
    ]}
  ];

  return (
    <ReportLayout
      title="Electronic C3 Uploads by Employers Report"
      subtitle="Track electronic C3 submissions and adoption by employers"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'Electronic C3 Uploads' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={false} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Electronic" value={electronicC3Data.summary.totalElectronic.toString()} icon={Upload} variant="success" />
          <MetricCard title="Employers Using Portal" value={electronicC3Data.summary.employersUsingPortal.toString()} icon={Building2} variant="info" />
          <MetricCard title="Portal Uploads" value={electronicC3Data.summary.portalUploads.toString()} icon={CheckCircle} variant="success" />
          <MetricCard title="API Uploads" value={electronicC3Data.summary.apiUploads.toString()} icon={TrendingUp} variant="info" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Top Employers</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={electronicC3Data.byEmployer}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="employer" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--success))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Electronic vs Manual</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={electronicC3Data.electronicVsManual}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="electronic" stroke="hsl(var(--success))" name="Electronic" />
                  <Line type="monotone" dataKey="manual" stroke="hsl(var(--muted-foreground))" name="Manual" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      }
      tableArea={
        <Card>
          <CardHeader><CardTitle>Electronic Upload Details</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>C3 Period</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {electronicC3Data.details.map((row) => (
                  <TableRow key={`${row.employerId}-${row.c3Period}`}>
                    <TableCell className="font-medium">{row.employerId}</TableCell>
                    <TableCell>{row.employerName}</TableCell>
                    <TableCell>{row.c3Period}</TableCell>
                    <TableCell>{row.uploadDate}</TableCell>
                    <TableCell>{row.uploadMethod}</TableCell>
                    <TableCell><StatusBadge status={row.status} variant={row.status === 'Processed' ? 'success' : 'warning'} /></TableCell>
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
