import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Loader2, Download } from 'lucide-react';
import { FilterBar, FilterField } from '@/components/common/FilterBar';
import { exportReportToExcel, ReportColumn } from '@/utils/reportExcelExport';
import { fetchViolationReportRows, ViolationReportRow } from '@/services/violationReportsService';

interface Props {
  title: string;
  subtitle: string;
  breadcrumbLabel: string;
  filters: Array<'dateRange' | 'status' | 'type' | 'fund' | 'zone' | 'severity'>;
  /** Render the report body once filtered rows are known. */
  renderBody: (rows: ViolationReportRow[]) => React.ReactNode;
  /** Optional export filename (without extension) */
  exportFilename?: string;
  /** Columns for the export. If omitted, no export button is rendered. */
  exportColumns?: ReportColumn[];
  /** Map row → export shape. Defaults to identity. */
  mapExportRow?: (r: ViolationReportRow) => Record<string, any>;
}

export default function ViolationReportShell({
  title,
  subtitle,
  breadcrumbLabel,
  filters,
  renderBody,
  exportFilename,
  exportColumns,
  mapExportRow,
}: Props) {
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ['violation_reports', 'all'],
    queryFn: fetchViolationReportRows,
    staleTime: 60_000,
  });

  const [values, setValues] = useState<Record<string, string>>({});

  const typeOptions = useMemo(() => {
    const set = new Map<string, string>();
    rows.forEach(r => {
      if (r.violation_type_name) set.set(r.violation_type_name, r.violation_type_name);
    });
    return Array.from(set.keys()).sort().map(v => ({ value: v, label: v }));
  }, [rows]);

  const zoneOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => set.add(r.zone_name || 'Unassigned'));
    return Array.from(set).sort().map(v => ({ value: v, label: v }));
  }, [rows]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => r.status && set.add(r.status));
    return Array.from(set).sort().map(v => ({ value: v, label: v.replace(/_/g, ' ') }));
  }, [rows]);

  const fundOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => r.fund_type && set.add(r.fund_type));
    return Array.from(set).sort().map(v => ({ value: v, label: v }));
  }, [rows]);

  const severityOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => r.severity && set.add(r.severity));
    return Array.from(set).sort().map(v => ({ value: v, label: v }));
  }, [rows]);

  const fields: FilterField[] = [];
  if (filters.includes('dateRange')) {
    fields.push({ key: 'from', label: 'From', type: 'date' });
    fields.push({ key: 'to', label: 'To', type: 'date' });
  }
  if (filters.includes('status')) {
    fields.push({ key: 'status', label: 'Status', type: 'select', options: [{ value: 'all', label: 'All' }, ...statusOptions] });
  }
  if (filters.includes('type')) {
    fields.push({ key: 'type', label: 'Violation Type', type: 'select', options: [{ value: 'all', label: 'All' }, ...typeOptions] });
  }
  if (filters.includes('fund')) {
    fields.push({ key: 'fund', label: 'Fund', type: 'select', options: [{ value: 'all', label: 'All' }, ...fundOptions] });
  }
  if (filters.includes('zone')) {
    fields.push({ key: 'zone', label: 'Zone / Office', type: 'select', options: [{ value: 'all', label: 'All' }, ...zoneOptions] });
  }
  if (filters.includes('severity')) {
    fields.push({ key: 'severity', label: 'Severity', type: 'select', options: [{ value: 'all', label: 'All' }, ...severityOptions] });
  }

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const ref = r.discovered_date || r.created_at?.slice(0, 10) || '';
      if (values.from && ref && ref < values.from) return false;
      if (values.to && ref && ref > values.to) return false;
      if (values.status && values.status !== 'all' && r.status !== values.status) return false;
      if (values.type && values.type !== 'all' && r.violation_type_name !== values.type) return false;
      if (values.fund && values.fund !== 'all' && r.fund_type !== values.fund) return false;
      if (values.zone && values.zone !== 'all' && (r.zone_name || 'Unassigned') !== values.zone) return false;
      if (values.severity && values.severity !== 'all' && r.severity !== values.severity) return false;
      return true;
    });
  }, [rows, values]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Reports', href: '/compliance/reports' },
          { label: 'Violation Reports', href: '/compliance/reports/violations' },
          { label: breadcrumbLabel },
        ]}
      />

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent>
          <FilterBar
            filters={fields}
            values={values}
            onChange={(k, v) => setValues(prev => ({ ...prev, [k]: v }))}
            onReset={() => setValues({})}
          />
        </CardContent>
      </Card>

      {exportColumns && exportFilename && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            disabled={filtered.length === 0}
            onClick={async () => {
              const data = filtered.map(mapExportRow ? mapExportRow : (r) => r as any);
              await exportReportToExcel(data, exportColumns, exportFilename, breadcrumbLabel);
            }}
          >
            <Download className="h-4 w-4 mr-2" />Export
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <EmptyState title="Unable to load violations" description="Please retry shortly or contact support." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={`No violations match this ${breadcrumbLabel.toLowerCase()} report`}
          description={
            rows.length === 0
              ? 'No violations have been recorded yet.'
              : 'Try adjusting the filters above to broaden the results.'
          }
        />
      ) : (
        renderBody(filtered)
      )}
    </div>
  );
}
