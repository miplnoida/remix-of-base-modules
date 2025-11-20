import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileSearch, Users, CheckCircle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CHART_COLORS, CHART_STYLES } from '@/lib/chartColors';

const mockData = {
  summary: { populationSize: 45000, sampleSize: 150, samplePercentage: 0.33, categories: 5 },
  byCategory: [
    { category: 'Active Contributors', population: 15000, sample: 50 },
    { category: 'Inactive', population: 12000, sample: 40 },
    { category: 'Self-Employed', population: 8000, sample: 27 },
    { category: 'Pensioners', population: 7000, sample: 23 },
    { category: 'New Registrants', population: 3000, sample: 10 }
  ],
  sampleRecords: [
    { personId: 'IP-2024-001', name: 'John Doe', category: 'Active Contributors', registrationDate: '2020-01-15', branch: 'Basseterre' },
    { personId: 'IP-2024-045', name: 'Jane Smith', category: 'Self-Employed', registrationDate: '2019-06-22', branch: 'Charlestown' },
    { personId: 'IP-2024-089', name: 'Michael Brown', category: 'Pensioners', registrationDate: '2015-03-10', branch: 'Basseterre' },
    { personId: 'IP-2024-123', name: 'Sarah Wilson', category: 'Inactive', registrationDate: '2018-11-05', branch: 'Basseterre' },
    { personId: 'IP-2024-156', name: 'David Lee', category: 'New Registrants', registrationDate: '2024-02-01', branch: 'Charlestown' }
  ]
};

export default function AuditSampleIPReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'datasetType', label: 'Dataset Type', type: 'select' as const, options: [
      { label: 'All Insured Persons', value: 'all' },
      { label: 'Active Contributors', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
      { label: 'Self-Employed', value: 'self-employed' },
      { label: 'Pensioners', value: 'pensioners' },
      { label: 'New Registrants', value: 'new' }
    ]},
    { name: 'dateRange', label: 'Registration Date Range', type: 'daterange' as const },
    { name: 'sampleSize', label: 'Sample Size', type: 'text' as const },
    { name: 'branch', label: 'Branch', type: 'select' as const, options: [
      { label: 'Basseterre', value: 'basseterre' },
      { label: 'Charlestown', value: 'charlestown' }
    ]}
  ];

  const handleGenerateSample = () => {
    console.log('Generate random sample with filters:', filters);
  };

  return (
    <ReportLayout
      title="Internal Audit Random Sample Lists (Insured Persons)"
      subtitle="Generate random samples from insured person population for audit purposes"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'Internal Audit Sample' }
      ]}
      filterPanel={
        <div className="space-y-4">
          <QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={false} />
          <div className="flex gap-2">
            <Button onClick={handleGenerateSample}>
              <Filter className="mr-2 h-4 w-4" />
              Generate Random Sample
            </Button>
          </div>
        </div>
      }
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Population Size" value={mockData.summary.populationSize.toLocaleString()} icon={Users} variant="info" />
          <MetricCard title="Sample Size" value={mockData.summary.sampleSize.toString()} icon={FileSearch} variant="success" />
          <MetricCard title="Sample %" value={`${mockData.summary.samplePercentage}%`} icon={CheckCircle} variant="default" />
          <MetricCard title="Categories" value={mockData.summary.categories.toString()} icon={Filter} variant="info" />
        </div>
      }
      chartArea={
        <Card>
          <CardHeader><CardTitle>Sample Distribution by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockData.byCategory} layout="horizontal">
                <CartesianGrid {...CHART_STYLES.grid} />
                <XAxis type="number" {...CHART_STYLES.axis} />
                <YAxis dataKey="category" type="category" width={150} {...CHART_STYLES.axis} />
                <Tooltip {...CHART_STYLES.tooltip} />
                <Bar dataKey="population" fill={CHART_COLORS.grayDark} name="Population" />
                <Bar dataKey="sample" fill={CHART_COLORS.primary} name="Sample" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }
      tableArea={
        <Card>
          <CardHeader><CardTitle>Sampled Records</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead>Branch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.sampleRecords.map((row) => (
                  <TableRow key={row.personId}>
                    <TableCell className="font-medium">{row.personId}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.category}</TableCell>
                    <TableCell>{row.registrationDate}</TableCell>
                    <TableCell>{row.branch}</TableCell>
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
