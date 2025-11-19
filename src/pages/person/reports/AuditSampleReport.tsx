import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ListChecks, FileText, Percent, Calendar } from 'lucide-react';
import { auditSampleData } from '@/services/mockData/reportsData';
import { StatusBadge } from '@/components/shared/StatusBadge';

export default function AuditSampleReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [sampleGenerated, setSampleGenerated] = useState(true);

  const filterFields = [
    { name: 'dataSet', label: 'Data Set', type: 'select' as const, options: auditSampleData.dataSetOptions },
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'employer', label: 'Employer (Optional)', type: 'text' as const },
    { name: 'sampleSize', label: 'Sample Size / Percentage', type: 'text' as const }
  ];

  const handleGenerateSample = () => {
    console.log('Generating random sample...');
    setSampleGenerated(true);
  };

  const handleExportSample = () => {
    console.log('Exporting sample list...');
  };

  return (
    <ReportLayout
      title="Internal Audit Random Sample Lists Report"
      subtitle="Generate random samples for internal audit verification"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'Internal Audit Sample' }
      ]}
      filterPanel={
        <div className="space-y-4">
          <QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={true} />
          <div className="flex gap-2">
            <Button onClick={handleGenerateSample} variant="default">
              <ListChecks className="mr-2 h-4 w-4" />
              Generate Random Sample
            </Button>
            {sampleGenerated && (
              <Button onClick={handleExportSample} variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Export Sample List
              </Button>
            )}
          </div>
        </div>
      }
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Population" value={auditSampleData.summary.totalPopulation.toLocaleString()} icon={FileText} variant="info" />
          <MetricCard title="Sample Size" value={auditSampleData.summary.sampleSize.toString()} icon={ListChecks} variant="success" />
          <MetricCard title="Sample Percentage" value={`${auditSampleData.summary.samplePercentage}%`} icon={Percent} variant="info" />
          <MetricCard title="Generated Date" value={auditSampleData.summary.generatedDate} icon={Calendar} variant="info" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader>
            <CardTitle>Sample Generation Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p><strong>Purpose:</strong> Generate random samples of records for internal audit verification.</p>
              <p><strong>How to use:</strong></p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Select the data set you want to sample (C3s, Claims, Registrations, or Replacements)</li>
                <li>Specify the date range to limit the population</li>
                <li>Optionally filter by employer for targeted sampling</li>
                <li>Enter desired sample size (number) or percentage</li>
                <li>Click "Generate Random Sample" to create a random selection</li>
                <li>Review the sample list below</li>
                <li>Click "Export Sample List" to download for audit use</li>
              </ol>
              <p className="text-primary font-medium">The system uses cryptographically secure random selection to ensure unbiased sampling.</p>
            </div>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader><CardTitle>Random Sample Records</CardTitle></CardHeader>
          <CardContent>
            {sampleGenerated ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Record ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Employer / IP ID</TableHead>
                    <TableHead>Period / Claim Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditSampleData.sampleRecords.map((row) => (
                    <TableRow key={row.recordId}>
                      <TableCell className="font-medium">{row.recordId}</TableCell>
                      <TableCell>{row.type}</TableCell>
                      <TableCell>{row.type === 'C3' ? row.employer : (row as any).ipId}</TableCell>
                      <TableCell>{row.type === 'C3' ? row.period : (row as any).claimType || (row as any).registrationType || (row as any).reason}</TableCell>
                      <TableCell>{row.type === 'C3' ? row.submittedDate : (row as any).receivedDate || (row as any).registeredDate || (row as any).requestDate}</TableCell>
                      <TableCell><StatusBadge status={row.status} variant={row.status === 'Verified' || row.status === 'Processed' || row.status === 'Approved' || row.status === 'Completed' ? 'success' : 'info'} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <ListChecks className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No sample generated yet. Use the filters above and click "Generate Random Sample".</p>
              </div>
            )}
          </CardContent>
        </Card>
      }
      onExportCSV={() => console.log('Export CSV')}
      onExportPDF={() => console.log('Export PDF')}
    />
  );
}
