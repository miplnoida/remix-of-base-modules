import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Eye, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIADepartments, useIAAuditors } from '@/hooks/useAuditData';
import { useToast } from '@/hooks/use-toast';
import { PageShell, SearchBar, FilterBar, DataTable, StatusBadge, EntityModal } from '@/components/common';
import type { DataTableColumn, FilterField } from '@/components/common';

const REPORT_TYPES = [
  { id: 'plan-summary', title: 'Audit Plan Summary Report', description: 'Summary of audit plans by status, period, and department' },
  { id: 'activity-schedule', title: 'Activity Schedule Report', description: 'Scheduled and completed activities with auditor assignments' },
  { id: 'auditor-workload', title: 'Auditor Workload Report', description: 'Activities distribution across auditors' },
  { id: 'findings-compliance', title: 'Findings & Compliance Report', description: 'Audit findings analysis with risk and compliance data' },
  { id: 'followup-register', title: 'Follow-Up Action Register', description: 'Pending and overdue corrective actions' },
];

export default function AuditReports() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const { data: departments = [] } = useIADepartments();
  const { data: auditors = [] } = useIAAuditors();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all', reportType: 'all' });
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [viewReport, setViewReport] = useState<any>(null);

  // Mock generated reports list
  const [generatedReports] = useState<any[]>([]);

  const filteredReportTypes = REPORT_TYPES.filter(rt =>
    rt.title.toLowerCase().includes(searchTerm.toLowerCase()) || rt.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generateReport = async (reportType: typeof REPORT_TYPES[0]) => {
    setGeneratingId(reportType.id);
    // Simulate generation delay
    await new Promise(r => setTimeout(r, 1500));
    setGeneratingId(null);
    toast({ title: "Report Generated", description: `${reportType.title} has been generated successfully.` });
  };

  const filterFields: FilterField[] = [
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'all', label: 'All' }, { value: 'Draft', label: 'Draft' }, { value: 'Final', label: 'Final' },
    ]},
  ];

  const reportColumns: DataTableColumn<any>[] = [
    { key: 'title', header: 'Report', render: (r) => (
      <div><div className="font-medium">{r.title}</div><div className="text-xs text-muted-foreground">{r.generated_at}</div></div>
    )},
    { key: 'type', header: 'Type' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <PageShell
      title="Audit Reports"
      subtitle="Generate and manage audit reports"
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Audit Reports' }]}
      noPermission={!hasPermission('generate_reports')}
    >
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search report types..." />
            <FilterBar filters={filterFields} values={filters} onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))} onReset={() => setFilters({ status: 'all', reportType: 'all' })} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredReportTypes.map((rt) => (
          <Card key={rt.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-5 h-5 text-primary" />{rt.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{rt.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Department</Label>
                  <Select defaultValue="all">
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Input type="date" className="h-9" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => generateReport(rt)} disabled={generatingId === rt.id} className="flex-1">
                  {generatingId === rt.id ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Download className="w-4 h-4 mr-2" />Generate</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Generated Reports Table */}
      {generatedReports.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Generated Reports</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              columns={reportColumns}
              data={generatedReports}
              emptyMessage="No reports generated yet"
              renderActions={(r) => (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewReport(r)}><Eye className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="h-4 w-4" /></Button>
                </div>
              )}
            />
          </CardContent>
        </Card>
      )}

      <EntityModal open={!!viewReport} onOpenChange={() => setViewReport(null)} title="Report Preview" mode="view">
        {viewReport && <div className="text-center text-muted-foreground py-8">Report preview will be displayed here.</div>}
      </EntityModal>
    </PageShell>
  );
}
