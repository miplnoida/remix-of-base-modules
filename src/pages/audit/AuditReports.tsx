import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Download, FileText, RefreshCw, Share2 } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { useIADepartments, useIAAuditors } from '@/hooks/useAuditData';
import { PageShell, SearchBar, FilterBar, DataTable, StatusBadge, EntityModal } from '@/components/common';
import type { DataTableColumn, FilterField } from '@/components/common';

const REPORT_TYPES = [
  'Plan Summary',
  'Activity Schedule',
  'Auditor Workload',
  'Findings Compliance',
  'Follow-up Register',
];

export default function AuditReports() {
  
  const { toast } = useToast();

  const { data: departments = [] } = useIADepartments();
  const { data: auditors = [] } = useIAAuditors();

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ fiscalYear: 'all', departmentId: 'all', reportType: 'all', status: 'all' });
  const [viewReport, setViewReport] = useState<any>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const [reports, setReports] = useState<any[]>([
    {
      id: 'RPT-001',
      title: 'Annual Plan Summary',
      department_id: 'all',
      period: '2026 Q1',
      fiscal_year: '2026',
      report_type: 'Plan Summary',
      prepared_by: 'System',
      status: 'Draft',
      generated_on: null,
    },
    {
      id: 'RPT-002',
      title: 'Findings Compliance Overview',
      department_id: 'all',
      period: '2026 Q1',
      fiscal_year: '2026',
      report_type: 'Findings Compliance',
      prepared_by: 'System',
      status: 'Draft',
      generated_on: null,
    },
  ]);

  const preparedByFallback = auditors[0]?.name || 'System';

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const departmentName = report.department_id === 'all' ? 'All Departments' : departments.find((d: any) => d.id === report.department_id)?.name || '-';

      const matchesSearch =
        report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        departmentName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFiscalYear = filters.fiscalYear === 'all' || report.fiscal_year === filters.fiscalYear;
      const matchesDepartment = filters.departmentId === 'all' || report.department_id === filters.departmentId;
      const matchesType = filters.reportType === 'all' || report.report_type === filters.reportType;
      const matchesStatus = filters.status === 'all' || report.status === filters.status;

      return matchesSearch && matchesFiscalYear && matchesDepartment && matchesType && matchesStatus;
    });
  }, [reports, searchTerm, filters, departments]);

  const fiscalYears = useMemo(() => {
    const values = reports.map((report) => report.fiscal_year).filter(Boolean);
    return [...new Set(values)];
  }, [reports]);

  const columns: DataTableColumn<any>[] = [
    { key: 'id', header: 'Report ID' },
    { key: 'title', header: 'Report Title' },
    {
      key: 'department',
      header: 'Department',
      render: (row) => (row.department_id === 'all' ? 'All Departments' : departments.find((d: any) => d.id === row.department_id)?.name || '-'),
    },
    { key: 'period', header: 'Period' },
    { key: 'prepared_by', header: 'Prepared By' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'generated_on', header: 'Generated On', render: (row) => (row.generated_on ? new Date(row.generated_on).toLocaleDateString() : '-') },
  ];

  const filterFields: FilterField[] = [
    {
      key: 'fiscalYear',
      label: 'Fiscal Year',
      type: 'select',
      options: [{ value: 'all', label: 'All Years' }, ...fiscalYears.map((year) => ({ value: year, label: year }))],
    },
    {
      key: 'departmentId',
      label: 'Department',
      type: 'select',
      options: [{ value: 'all', label: 'All Departments' }, ...(departments || []).map((dept: any) => ({ value: dept.id, label: dept.name }))],
    },
    {
      key: 'reportType',
      label: 'Report Type',
      type: 'select',
      options: [{ value: 'all', label: 'All Types' }, ...REPORT_TYPES.map((type) => ({ value: type, label: type }))],
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [{ value: 'all', label: 'All Statuses' }, { value: 'Draft', label: 'Draft' }, { value: 'Final', label: 'Final' }],
    },
  ];

  const handleGenerate = (report: any) => {
    setGeneratingId(report.id);
    window.setTimeout(() => {
      setReports((prev) =>
        prev.map((item) =>
          item.id === report.id
            ? { ...item, status: 'Final', generated_on: new Date().toISOString(), prepared_by: item.prepared_by || preparedByFallback }
            : item
        )
      );
      setGeneratingId(null);
      toast({ title: 'Report generated', description: `${report.title} is ready.` });
    }, 900);
  };

  return (
    <PageShell
      title="Audit Reports"
      subtitle="Generate, preview, and download reports"
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Audit Reports' }]}
      
      actions={
        <Button
          variant="outline"
          onClick={() => {
            const nextId = `RPT-${String(reports.length + 1).padStart(3, '0')}`;
            setReports((prev) => [
              {
                id: nextId,
                title: 'New Report Draft',
                department_id: 'all',
                period: '2026 Q1',
                fiscal_year: '2026',
                report_type: 'Plan Summary',
                prepared_by: preparedByFallback,
                status: 'Draft',
                generated_on: null,
              },
              ...prev,
            ]);
          }}
        >
          <FileText className="w-4 h-4 mr-2" />New Draft
        </Button>
      }
    >
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search report id, title, or department..." />
            <FilterBar
              filters={filterFields}
              values={filters}
              onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
              onReset={() => setFilters({ fiscalYear: 'all', departmentId: 'all', reportType: 'all', status: 'all' })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredReports}
            emptyMessage="No reports found"
            renderActions={(report) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewReport(report)}><Eye className="h-4 w-4" /></Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={generatingId === report.id || report.status === 'Final'}
                  onClick={() => handleGenerate(report)}
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${generatingId === report.id ? 'animate-spin' : ''}`} />Generate
                </Button>
                <Button size="sm" variant="outline" onClick={() => toast({ title: 'Download started', description: `${report.title} PDF download queued.` })}>
                  <Download className="w-4 h-4 mr-1" />PDF
                </Button>
                <Button size="sm" variant="outline" onClick={() => toast({ title: 'Export ready', description: `${report.title} export created.` })}>
                  <Share2 className="w-4 h-4 mr-1" />Export
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      <EntityModal open={!!viewReport} onOpenChange={() => setViewReport(null)} title="Report Preview" mode="view">
        {viewReport && (
          <div className="space-y-3">
            <p><strong>Report ID:</strong> {viewReport.id}</p>
            <p><strong>Title:</strong> {viewReport.title}</p>
            <p><strong>Type:</strong> {viewReport.report_type}</p>
            <p><strong>Period:</strong> {viewReport.period}</p>
            <p><strong>Status:</strong> <StatusBadge status={viewReport.status} /></p>
            <p className="text-sm text-muted-foreground">Preview placeholder is active and safe even when no report content exists.</p>
          </div>
        )}
      </EntityModal>
    </PageShell>
  );
}
