import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Upload, Building2, TrendingUp, CheckCircle, Loader2, Inbox } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

async function fetchElectronicC3() {
  const { data, error } = await supabase
    .from('electronic_c3_uploads')
    .select('*')
    .order('upload_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export default function ElectronicC3UploadsReport() {
  const { data: uploads = [], isLoading } = useQuery({
    queryKey: ['electronic-c3-uploads'],
    queryFn: fetchElectronicC3,
  });

  const totalElectronic = uploads.length;
  const uniqueEmployers = new Set(uploads.filter(u => u.upload_method === 'Portal').map(u => u.employer_id)).size;
  const portalUploads = uploads.filter(u => u.upload_method === 'Portal').length;
  const apiUploads = uploads.filter(u => u.upload_method === 'API').length;

  // Top employers by count
  const byEmployer = Object.entries(
    uploads.reduce<Record<string, number>>((acc, u) => {
      acc[u.employer_name] = (acc[u.employer_name] || 0) + 1;
      return acc;
    }, {})
  ).map(([employer, count]) => ({ employer, count })).sort((a, b) => b.count - a.count).slice(0, 5);

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'employer', label: 'Employer', type: 'text' as const },
    { name: 'method', label: 'Upload Method', type: 'select' as const, options: [
      { label: 'Portal', value: 'portal' },
      { label: 'API', value: 'api' }
    ]}
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ReportLayout
      title="Electronic C3 Uploads by Employers Report"
      subtitle="Track electronic C3 submissions and adoption by employers"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'Electronic C3 Uploads' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={() => {}} defaultExpanded={false} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Electronic" value={totalElectronic.toString()} icon={Upload} variant="success" />
          <MetricCard title="Employers Using Portal" value={uniqueEmployers.toString()} icon={Building2} variant="info" />
          <MetricCard title="Portal Uploads" value={portalUploads.toString()} icon={CheckCircle} variant="success" />
          <MetricCard title="API Uploads" value={apiUploads.toString()} icon={TrendingUp} variant="info" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader><CardTitle>Top Employers</CardTitle></CardHeader>
          <CardContent>
            {byEmployer.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <Inbox className="h-10 w-10 mb-2" /><p>No upload data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={byEmployer}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="employer" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--success))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader><CardTitle>Electronic Upload Details</CardTitle></CardHeader>
          <CardContent>
            {uploads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Inbox className="h-10 w-10 mb-2" /><p>No uploads recorded</p>
              </div>
            ) : (
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
                  {uploads.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.employer_id}</TableCell>
                      <TableCell>{row.employer_name}</TableCell>
                      <TableCell>{row.c3_period}</TableCell>
                      <TableCell>{row.upload_date}</TableCell>
                      <TableCell>{row.upload_method}</TableCell>
                      <TableCell><StatusBadge status={row.status} variant={row.status === 'Processed' ? 'success' : 'warning'} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      }
      onExportCSV={() => console.log('Export CSV')}
      onExportPDF={() => console.log('Export PDF')}
    />
  );
}
