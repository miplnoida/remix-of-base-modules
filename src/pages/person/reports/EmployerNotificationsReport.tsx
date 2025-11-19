import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Mail, FileText, CheckCircle, Clock } from 'lucide-react';
import { employerNotificationsData } from '@/services/mockData/reportsData';
import { StatusBadge } from '@/components/shared/StatusBadge';

export default function EmployerNotificationsReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'employer', label: 'Employer', type: 'text' as const },
    { name: 'letterType', label: 'Letter Type', type: 'select' as const, options: [
      { label: 'Overpayment', value: 'overpayment' },
      { label: 'Underpayment', value: 'underpayment' }
    ]},
    { name: 'status', label: 'Status', type: 'select' as const, options: [
      { label: 'Sent', value: 'sent' },
      { label: 'Acknowledged', value: 'acknowledged' }
    ]}
  ];

  return (
    <ReportLayout
      title="Employer Notification Letters on Contribution Over/Underpayment Report"
      subtitle="Track notification letters sent to employers regarding contribution discrepancies"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'Employer Notifications' }
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
          <MetricCard title="Total Letters" value={employerNotificationsData.summary.totalLetters.toString()} icon={Mail} variant="default" />
          <MetricCard title="Overpayment" value={employerNotificationsData.summary.overpayment.toString()} icon={FileText} variant="default" />
          <MetricCard title="Underpayment" value={employerNotificationsData.summary.underpayment.toString()} icon={FileText} variant="warning" />
          <MetricCard title="Acknowledged" value={employerNotificationsData.summary.acknowledged.toString()} icon={CheckCircle} variant="success" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Letters by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={employerNotificationsData.byType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Letters Sent Per Month</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={employerNotificationsData.byMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="overpayment" stroke="hsl(var(--primary))" name="Overpayment" />
                  <Line type="monotone" dataKey="underpayment" stroke="hsl(var(--warning))" name="Underpayment" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      }
      tableArea={
        <Card>
          <CardHeader>
            <CardTitle>Notification Letter Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employer ID</TableHead>
                  <TableHead>Employer Name</TableHead>
                  <TableHead>Letter ID</TableHead>
                  <TableHead>Letter Type</TableHead>
                  <TableHead>Date Sent</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employerNotificationsData.details.map((row) => (
                  <TableRow key={row.letterId}>
                    <TableCell className="font-medium">{row.employerId}</TableCell>
                    <TableCell>{row.employerName}</TableCell>
                    <TableCell>{row.letterId}</TableCell>
                    <TableCell>
                      <StatusBadge 
                        status={row.letterType} 
                        variant={row.letterType === 'Overpayment' ? 'info' : 'warning'} 
                      />
                    </TableCell>
                    <TableCell>{row.dateSent}</TableCell>
                    <TableCell>{row.method}</TableCell>
                    <TableCell>
                      <StatusBadge 
                        status={row.status} 
                        variant={row.status === 'Acknowledged' ? 'success' : 'info'} 
                      />
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
