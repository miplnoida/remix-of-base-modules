import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Eye, Download, FileText, RefreshCw, Share2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIADepartments, useIAAuditors } from '@/hooks/useAuditData';
import { useIAAuditReports, useIAAuditReportMutations } from '@/hooks/useAuditReports';
import { PageShell, StandardSearchFilterBar, DataTable, StatusBadge, EntityModal, ExportDropdown } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EngagementFilterBanner, useEngagementFilter } from '@/components/audit/EngagementFilterBanner';

const REPORT_TYPES = ['Plan Summary', 'Activity Schedule', 'Auditor Workload', 'Findings Compliance', 'Follow-up Register'];

export default function AuditReports() {
  const { toast } = useToast();
  const { engagementId } = useEngagementFilter();
  const { data: departments = [] } = useIADepartments();
  const { data: auditors = [] } = useIAAuditors();
  const { data: reports = [], isLoading } = useIAAuditReports();
  const { create, update } = useIAAuditReportMutations();

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ fiscalYear: 'all', departmentId: 'all', reportType: 'all', status: 'all' });
  const [viewReport, setViewReport] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', report_type: 'Plan Summary', fiscal_year: new Date().getFullYear().toString(), period: '', department_id: '', prepared_by: '' });

  const filteredReports = useMemo(() => {
    return reports.filter((report: any) => {
      const departmentName = !report.department_id ? 'All Departments' : departments.find((d: any) => d.id === report.department_id)?.name || '-';
      const matchesSearch = (report.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || departmentName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFiscalYear = filters.fiscalYear === 'all' || report.fiscal_year === filters.fiscalYear;
      const matchesDepartment = filters.departmentId === 'all' || report.department_id === filters.departmentId;
      const matchesType = filters.reportType === 'all' || report.report_type === filters.reportType;
      const matchesStatus = filters.status === 'all' || report.status === filters.status;
      const matchesEngagement = !engagementId || report.engagement_id === engagementId;
      return matchesSearch && matchesFiscalYear && matchesDepartment && matchesType && matchesStatus && matchesEngagement;
    });
  }, [reports, searchTerm, filters, departments, engagementId]);

  const fiscalYears = useMemo(() => {
    const values = reports.map((r: any) => r.fiscal_year).filter(Boolean);
    return [...new Set(values)];
  }, [reports]);

  const handleCreate = () => {
    if (!formData.title) { toast({ title: 'Validation Error', description: 'Title is required', variant: 'destructive' }); return; }
    const reportNumber = `RPT-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    create.mutate({
      ...formData,
      report_number: reportNumber,
      department_id: formData.department_id || null,
      ...(engagementId ? { engagement_id: engagementId } : {}),
    }, {
      onSuccess: () => { setIsCreateOpen(false); setFormData({ title: '', report_type: 'Plan Summary', fiscal_year: new Date().getFullYear().toString(), period: '', department_id: '', prepared_by: '' }); }
    });
  };

  const handleGenerate = (report: any) => {
    update.mutate({ id: report.id, status: 'Final', generated_on: new Date().toISOString() });
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'report_number', header: 'Report ID', render: (r) => r.report_number || r.id.slice(0, 8) },
    { key: 'title', header: 'Report Title' },
    { key: 'department', header: 'Department', render: (r) => !r.department_id ? 'All Departments' : departments.find((d: any) => d.id === r.department_id)?.name || '-' },
    { key: 'period', header: 'Period' },
    { key: 'prepared_by', header: 'Prepared By' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'generated_on', header: 'Generated On', render: (r) => r.generated_on ? new Date(r.generated_on).toLocaleDateString() : '-' },
  ];

  const filterFields: StandardFilterField[] = [
    { key: 'fiscalYear', label: 'Fiscal Year', type: 'select', options: [{ value: 'all', label: 'All Years' }, ...fiscalYears.map((y) => ({ value: y, label: y }))] },
    { key: 'departmentId', label: 'Department', type: 'select', options: [{ value: 'all', label: 'All Departments' }, ...(departments || []).map((d: any) => ({ value: d.id, label: d.name }))] },
    { key: 'reportType', label: 'Report Type', type: 'select', options: [{ value: 'all', label: 'All Types' }, ...REPORT_TYPES.map((t) => ({ value: t, label: t }))] },
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'all', label: 'All Statuses' }, { value: 'Draft', label: 'Draft' }, { value: 'Final', label: 'Final' }] },
  ];

  return (
    <PageShell
      title="Audit Reports"
      subtitle="Generate, preview, and download reports"
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Audit Reports' }]}
      isLoading={isLoading}
      actions={<Button onClick={() => setIsCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />New Report</Button>}
    >
      <EngagementFilterBanner />

      <StandardSearchFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search report title or department..."
        filters={filterFields}
        filterValues={filters}
        onFilterChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))}
        onReset={() => setFilters({ fiscalYear: 'all', departmentId: 'all', reportType: 'all', status: 'all' })}
      />

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredReports}
            emptyMessage="No reports found"
            onView={(r) => setViewReport(r)}
            renderActions={(report) => (
              <div className="flex gap-1">
                <Button size="sm" variant="outline" disabled={report.status === 'Final'} onClick={() => handleGenerate(report)}>
                  <RefreshCw className="w-4 h-4 mr-1" />Generate
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Create Modal */}
      <EntityModal open={isCreateOpen} onOpenChange={setIsCreateOpen} title="Create New Report" mode="create" onSave={handleCreate} saveLabel="Create Report" isSaving={create.isPending}>
        <div className="space-y-4">
          <div><Label>Title *</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Report title" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Report Type</Label>
              <Select value={formData.report_type} onValueChange={v => setFormData({...formData, report_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REPORT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Fiscal Year</Label><Input value={formData.fiscal_year} onChange={e => setFormData({...formData, fiscal_year: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Period</Label><Input value={formData.period} onChange={e => setFormData({...formData, period: e.target.value})} placeholder="e.g. 2026 Q1" /></div>
            <div><Label>Department</Label>
              <Select value={formData.department_id} onValueChange={v => setFormData({...formData, department_id: v})}>
                <SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger>
                <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Prepared By</Label><Input value={formData.prepared_by} onChange={e => setFormData({...formData, prepared_by: e.target.value})} placeholder="Auditor name" /></div>
        </div>
      </EntityModal>

      {/* View Modal */}
      <EntityModal open={!!viewReport} onOpenChange={() => setViewReport(null)} title="Report Details" mode="view">
        {viewReport && (
          <div className="space-y-3">
            <div><Label className="text-muted-foreground">Report ID</Label><p className="font-medium">{viewReport.report_number || viewReport.id.slice(0, 8)}</p></div>
            <div><Label className="text-muted-foreground">Title</Label><p>{viewReport.title}</p></div>
            <div><Label className="text-muted-foreground">Type</Label><p>{viewReport.report_type}</p></div>
            <div><Label className="text-muted-foreground">Fiscal Year</Label><p>{viewReport.fiscal_year || '-'}</p></div>
            <div><Label className="text-muted-foreground">Period</Label><p>{viewReport.period || '-'}</p></div>
            <div><Label className="text-muted-foreground">Status</Label><div className="mt-1"><StatusBadge status={viewReport.status} /></div></div>
            <div><Label className="text-muted-foreground">Prepared By</Label><p>{viewReport.prepared_by || '-'}</p></div>
            <div><Label className="text-muted-foreground">Generated On</Label><p>{viewReport.generated_on ? new Date(viewReport.generated_on).toLocaleDateString() : '-'}</p></div>
          </div>
        )}
      </EntityModal>
    </PageShell>
  );
}
