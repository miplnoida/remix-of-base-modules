import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Scan, FileText, Users, TrendingUp } from 'lucide-react';
import { scanningActivityData } from '@/services/mockData/reportsData';

export default function ScanningActivityReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'documentType', label: 'Document Type', type: 'select' as const, options: [
      { label: 'C3 Forms', value: 'c3' },
      { label: 'Claim Forms', value: 'claim' },
      { label: 'Registration', value: 'registration' },
      { label: 'Replacement', value: 'replacement' }
    ]},
    { name: 'station', label: 'Scanner Station', type: 'text' as const },
    { name: 'officer', label: 'Officer', type: 'text' as const }
  ];

  return (
    <ReportLayout
      title="Scanning Activity Report"
      subtitle="Monitor document scanning volume and activity by type and station"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'Scanning Activity' }
      ]}
      filterPanel={
        <QueryByFilter
          fields={filterFields}
          onFilter={setFilters}
          defaultExpanded={false}
        />
      }
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Scanned" value={scanningActivityData.summary.totalScanned.toString()} icon={Scan} variant="default" />
          <MetricCard title="C3 Documents" value={scanningActivityData.summary.c3Documents.toString()} icon={FileText} variant="default" />
          <MetricCard title="Claim Forms" value={scanningActivityData.summary.claimForms.toString()} icon={FileText} variant="default" />
          <MetricCard title="Registration Forms" value={scanningActivityData.summary.registrationForms.toString()} icon={Users} variant="default" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Documents Scanned by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scanningActivityData.byType} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="type" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Daily Scanning Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={scanningActivityData.timeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="c3" stroke="hsl(var(--primary))" name="C3" />
                  <Line type="monotone" dataKey="claims" stroke="hsl(var(--success))" name="Claims" />
                  <Line type="monotone" dataKey="registration" stroke="hsl(var(--warning))" name="Registration" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Scanning Activity Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document ID</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Related Entity</TableHead>
                  <TableHead>Scan Date</TableHead>
                  <TableHead>Scanned By</TableHead>
                  <TableHead>Station</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scanningActivityData.details.map((row) => (
                  <TableRow key={row.documentId}>
                    <TableCell className="font-medium">{row.documentId}</TableCell>
                    <TableCell>{row.documentType}</TableCell>
                    <TableCell>{row.relatedEntity}</TableCell>
                    <TableCell>{row.scanDate}</TableCell>
                    <TableCell>{row.scannedBy}</TableCell>
                    <TableCell>{row.station}</TableCell>
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
