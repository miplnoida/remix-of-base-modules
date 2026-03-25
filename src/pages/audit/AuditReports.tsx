import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, RefreshCw, Eye, Mail, Download, Loader2, ShieldAlert, ClipboardList, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIADepartments, useIAFindings, useIAManagementResponses, useIAActionTracking } from '@/hooks/useAuditData';
import { useIAEngagements } from '@/hooks/useAuditDataPhase2';
import { useIAAuditReports, useIAAuditReportMutations } from '@/hooks/useAuditReports';
import { PageShell, StandardSearchFilterBar, DataTable, StatusBadge, EntityModal } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { EngagementFilterBanner, useEngagementFilter } from '@/components/audit/EngagementFilterBanner';
import { useUserCode } from '@/hooks/useUserCode';
import { formatDateForDisplay } from '@/lib/format-config';
import { notifyReportGenerated } from '@/services/auditNotificationService';
import { notifyReportIssued } from '@/services/iaNotificationService';
import { useCanIssueReport } from '@/hooks/useAuditWorkflowGates';
import { ReportIssuanceGate } from '@/components/audit/ReportIssuanceGate';

interface ReportPreview {
  title: string;
  report_type: string;
  engagement_id: string;
  department_id: string | null;
  executive_summary: string;
  audit_objective: string;
  audit_scope: string;
  methodology: string;
  overall_assessment: string;
  risk_rating: string;
  recommendations: string;
  follow_up_actions: string;
  prepared_by: string | null;
  period: string;
  fiscal_year: string;
  generated_on: string;
}

function joinLines(lines: string[]) {
  return lines.length ? lines.join('\n') : 'None recorded.';
}

export default function AuditReports() {
  const { toast } = useToast();
  const { userCode } = useUserCode();
  const { engagementId } = useEngagementFilter();
  const { data: departments = [] } = useIADepartments();
  const { data: engagements = [] } = useIAEngagements();
  const { data: findings = [] } = useIAFindings();
  const { data: responses = [] } = useIAManagementResponses();
  const { data: actions = [] } = useIAActionTracking();
  const { data: reports = [], isLoading } = useIAAuditReports();
  const { create, update } = useIAAuditReportMutations();

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ departmentId: 'all', status: 'all' });
  const [selectedEngagementId, setSelectedEngagementId] = useState(engagementId || '');
  const [previewReport, setPreviewReport] = useState<ReportPreview | null>(null);
  const [viewReport, setViewReport] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [gateCheckReportId, setGateCheckReportId] = useState<string | null>(null);

  // Report issuance gate
  const { data: reportGate, isLoading: gateLoading } = useCanIssueReport(gateCheckReportId || undefined);

  const departmentNameById = useMemo(
    () => Object.fromEntries(departments.map((department: any) => [department.id, department.name])),
    [departments]
  );

  const engagementById = useMemo(
    () => Object.fromEntries(engagements.map((engagement: any) => [engagement.id, engagement])),
    [engagements]
  );

  const scopedReports = useMemo(() => {
    return reports.filter((report: any) => {
      const departmentName = report.department_id ? departmentNameById[report.department_id] || '' : '';
      const engagementName = report.engagement_id ? engagementById[report.engagement_id]?.engagement_name || '' : '';
      const matchesSearch = [report.title, report.report_number, departmentName, engagementName]
        .join(' ')
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesStatus = filters.status === 'all' || report.status === filters.status;
      const matchesDepartment = filters.departmentId === 'all' || report.department_id === filters.departmentId;
      const matchesEngagement = !engagementId || report.engagement_id === engagementId;
      return matchesSearch && matchesStatus && matchesDepartment && matchesEngagement;
    });
  }, [reports, searchTerm, filters, departmentNameById, engagementById, engagementId]);

  const selectedEngagement = useMemo(
    () => engagements.find((engagement: any) => engagement.id === selectedEngagementId) || null,
    [engagements, selectedEngagementId]
  );

  const selectedFindings = useMemo(
    () => findings.filter((finding: any) => finding.engagement_id === selectedEngagementId),
    [findings, selectedEngagementId]
  );

  const selectedResponses = useMemo(() => {
    const findingIds = new Set(selectedFindings.map((finding: any) => finding.id));
    return responses.filter((response: any) => response.engagement_id === selectedEngagementId || findingIds.has(response.finding_id));
  }, [responses, selectedFindings, selectedEngagementId]);

  const selectedActions = useMemo(
    () => actions.filter((action: any) => action.engagement_id === selectedEngagementId),
    [actions, selectedEngagementId]
  );

  const stats = useMemo(() => ({
    totalReports: scopedReports.length,
    finalReports: scopedReports.filter((report: any) => report.status === 'Final').length,
    selectedFindings: selectedFindings.length,
    openActions: selectedActions.filter((action: any) => !['Completed', 'Closed'].includes(action.status || '')).length,
  }), [scopedReports, selectedFindings, selectedActions]);

  const buildPreview = (): ReportPreview | null => {
    if (!selectedEngagement) {
      toast({ title: 'Select an audit', description: 'Choose an audit engagement first.', variant: 'destructive' });
      return null;
    }

    const riskCounts = selectedFindings.reduce(
      (accumulator: Record<string, number>, finding: any) => {
        const key = finding.risk_rating || 'Unrated';
        accumulator[key] = (accumulator[key] || 0) + 1;
        return accumulator;
      },
      {}
    );

    const findingsSummary = joinLines(
      selectedFindings.map((finding: any, index: number) => `${index + 1}. ${finding.title || 'Untitled finding'} — ${finding.condition || 'No condition recorded.'}`)
    );

    const recommendations = joinLines(
      selectedFindings.map((finding: any, index: number) => `${index + 1}. ${finding.recommendation || 'No recommendation recorded.'}`)
    );

    const managementResponses = joinLines(
      selectedResponses.map((response: any, index: number) => {
        const finding = selectedFindings.find((item: any) => item.id === response.finding_id);
        return `${index + 1}. ${finding?.title || 'Finding'} — ${response.response_text || 'No response text.'} [${response.status || 'Pending'}]`;
      })
    );

    const correctiveActions = joinLines(
      selectedActions.map((action: any, index: number) => {
        const finding = selectedFindings.find((item: any) => item.id === action.finding_id);
        return `${index + 1}. ${finding?.title || 'Finding'} — ${action.action_description || 'No action description.'} / Owner: ${action.responsible_person || 'Unassigned'} / Status: ${action.status || 'Open'}`;
      })
    );

    return {
      title: `Audit Report - ${selectedEngagement.engagement_name || selectedEngagement.engagement_code || 'Engagement'}`,
      report_type: 'Engagement Report',
      engagement_id: selectedEngagement.id,
      department_id: selectedEngagement.department_id || null,
      executive_summary: `This report covers ${selectedEngagement.engagement_name || 'the selected audit engagement'} for ${selectedEngagement.department_id ? departmentNameById[selectedEngagement.department_id] || 'the assigned department' : 'the assigned department'}. ${selectedFindings.length} finding(s), ${selectedResponses.length} management response(s), and ${selectedActions.length} corrective action(s) were recorded.`,
      audit_objective: selectedEngagement.objectives || 'Assess internal controls, compliance, and operational effectiveness for the selected audit engagement.',
      audit_scope: selectedEngagement.scope || 'The audit scope covers the approved audit period, selected control areas, and supporting documents linked to this engagement.',
      methodology: selectedEngagement.methodology || 'Walkthroughs, document review, interviews, sampling, and control testing were performed based on the engagement plan.',
      overall_assessment: findingsSummary,
      risk_rating: Object.entries(riskCounts).length ? Object.entries(riskCounts).map(([risk, count]) => `${risk}: ${count}`).join(' | ') : 'No findings recorded.',
      recommendations,
      follow_up_actions: `${managementResponses}\n\nCorrective Actions\n${correctiveActions}`,
      prepared_by: userCode || null,
      period: `${selectedEngagement.planned_start_date ? formatDateForDisplay(selectedEngagement.planned_start_date) : '—'} to ${selectedEngagement.planned_end_date ? formatDateForDisplay(selectedEngagement.planned_end_date) : '—'}`,
      fiscal_year: selectedEngagement.planned_start_date ? String(new Date(selectedEngagement.planned_start_date).getFullYear()) : String(new Date().getFullYear()),
      generated_on: new Date().toISOString(),
    };
  };

  const openPreview = () => {
    const nextPreview = buildPreview();
    if (nextPreview) setPreviewReport(nextPreview);
  };

  const handleGenerate = () => {
    const nextPreview = buildPreview();
    if (!nextPreview) return;
    setIsGenerating(true);
    create.mutate(
      {
        ...nextPreview,
        report_number: `RPT-${Date.now().toString(36).toUpperCase().slice(-6)}`,
        status: 'Draft',
        created_by: userCode || null,
      } as any,
      {
        onSuccess: () => {
          setIsGenerating(false);
          setPreviewReport(nextPreview);
          toast({ title: 'Audit report generated' });
        },
        onError: () => setIsGenerating(false),
      }
    );
  };

  const downloadPdf = async (report: any) => {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const sections = [
      ['Executive Summary', report.executive_summary],
      ['Audit Objective', report.audit_objective],
      ['Audit Scope', report.audit_scope],
      ['Audit Methodology', report.methodology],
      ['Findings Summary', report.overall_assessment],
      ['Risk Rating', report.risk_rating],
      ['Recommendations', report.recommendations],
      ['Management Responses & Corrective Actions', report.follow_up_actions],
    ];

    let y = 52;
    pdf.setFontSize(18);
    pdf.text(report.title || 'Audit Report', 40, y);
    y += 24;
    pdf.setFontSize(10);
    pdf.text(`Generated: ${report.generated_on ? formatDateForDisplay(report.generated_on) : formatDateForDisplay(new Date().toISOString())}`, 40, y);
    y += 20;

    sections.forEach(([heading, body]) => {
      if (y > 740) {
        pdf.addPage();
        y = 52;
      }
      pdf.setFontSize(13);
      pdf.text(String(heading), 40, y);
      y += 16;
      pdf.setFontSize(10);
      const lines = pdf.splitTextToSize(String(body || '—'), 515);
      lines.forEach((line: string) => {
        if (y > 780) {
          pdf.addPage();
          y = 52;
        }
        pdf.text(line, 40, y);
        y += 14;
      });
      y += 12;
    });

    pdf.save(`${(report.title || 'audit-report').replace(/\s+/g, '-').toLowerCase()}.pdf`);
  };

  const handleEmailReport = async (report: any) => {
    if (!report.department_id) {
      toast({ title: 'Department missing', description: 'This report has no linked department.', variant: 'destructive' });
      return;
    }
    setIsEmailing(true);
    await notifyReportGenerated(report.title || report.report_number || 'Audit Report', report.department_id);
    setIsEmailing(false);
    toast({ title: 'Report notification sent' });
  };

  const finalizeReport = (report: any) => {
    // Trigger gate check first - the gate panel handles the actual finalize
    setGateCheckReportId(report.id);
  };

  const handleGateFinalize = () => {
    if (!gateCheckReportId) return;
    const report = scopedReports.find((r: any) => r.id === gateCheckReportId);
    update.mutate(
      { id: gateCheckReportId, status: 'Final', generated_on: new Date().toISOString(), issued_at: new Date().toISOString(), issued_by: userCode || 'SYSTEM' } as any,
      {
        onSuccess: () => {
          setGateCheckReportId(null);
          toast({ title: 'Report Finalized & Issued' });
          notifyReportIssued(gateCheckReportId, {
            report_title: report?.title || 'Audit Report',
            report_number: report?.report_number || '',
            issued_by: userCode || 'SYSTEM',
            department_name: report?.department_id ? departmentNameById[report.department_id] || '' : '',
          });
        },
      }
    );
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'report_number', header: 'Report ID', render: (report) => report.report_number || report.id?.slice(0, 8) },
    { key: 'title', header: 'Report', render: (report) => <span className="font-medium">{report.title}</span> },
    { key: 'engagement', header: 'Audit', render: (report) => engagementById[report.engagement_id]?.engagement_name || '—' },
    { key: 'department', header: 'Department', render: (report) => report.department_id ? departmentNameById[report.department_id] || '—' : '—' },
    { key: 'status', header: 'Status', render: (report) => <StatusBadge status={report.status || 'Draft'} /> },
    { key: 'generated_on', header: 'Report Date', render: (report) => report.generated_on ? formatDateForDisplay(report.generated_on) : '—' },
  ];

  const filterFields: StandardFilterField[] = [
    {
      key: 'departmentId',
      label: 'Department',
      type: 'select',
      options: [{ value: 'all', label: 'All Departments' }, ...departments.map((department: any) => ({ value: department.id, label: department.name }))],
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'Draft', label: 'Draft' },
        { value: 'Final', label: 'Final' },
      ],
    },
  ];

  const activePreview = previewReport || viewReport;

  return (
    <PageShell
      title="Audit Reports"
      subtitle="Generate complete lifecycle reports from audit engagements, findings, responses, and corrective actions."
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Audit Reports' }]}
      isLoading={isLoading}
      actions={
        <Button onClick={handleGenerate} disabled={isGenerating || !selectedEngagementId}>
          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Generate Audit Report
        </Button>
      }
    >
      <EngagementFilterBanner />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><FileText className="h-5 w-5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Reports</p><p className="text-xl font-semibold">{stats.totalReports}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Final Reports</p><p className="text-xl font-semibold">{stats.finalReports}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><ShieldAlert className="h-5 w-5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Selected Findings</p><p className="text-xl font-semibold">{stats.selectedFindings}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><ClipboardList className="h-5 w-5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Open Actions</p><p className="text-xl font-semibold">{stats.openActions}</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate from Audit</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="space-y-2">
            <Label>Audit Engagement</Label>
            <Select value={selectedEngagementId} onValueChange={setSelectedEngagementId}>
              <SelectTrigger>
                <SelectValue placeholder="Select audit engagement" />
              </SelectTrigger>
              <SelectContent>
                {engagements
                  .filter((engagement: any) => !engagementId || engagement.id === engagementId)
                  .map((engagement: any) => (
                    <SelectItem key={engagement.id} value={engagement.id}>
                      {engagement.engagement_name || engagement.engagement_code || engagement.id}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={openPreview} disabled={!selectedEngagementId}><Eye className="mr-2 h-4 w-4" />Preview</Button>
            <Button variant="outline" onClick={() => previewReport && downloadPdf(previewReport)} disabled={!previewReport}><Download className="mr-2 h-4 w-4" />Download PDF</Button>
            <Button variant="outline" onClick={() => previewReport && handleEmailReport(previewReport)} disabled={!previewReport || isEmailing}>{isEmailing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}Email Report</Button>
            <Button onClick={handleGenerate} disabled={isGenerating || !selectedEngagementId}>{isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Generate</Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Issuance Gate Panel */}
      {gateCheckReportId && (
        <ReportIssuanceGate
          gateResult={reportGate}
          isLoading={gateLoading}
          onCheck={() => setGateCheckReportId(gateCheckReportId)}
          onFinalize={reportGate?.can_issue ? handleGateFinalize : undefined}
          isFinalizing={update.isPending}
        />
      )}

      <StandardSearchFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search report, audit, or department..."
        filters={filterFields}
        filterValues={filters}
        onFilterChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
        onReset={() => setFilters({ departmentId: 'all', status: 'all' })}
      />

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={scopedReports}
            emptyMessage="No audit reports generated yet."
            onView={(report) => setViewReport(report)}
            renderActions={(report) => (
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="outline" onClick={() => setViewReport(report)}><Eye className="mr-1 h-3 w-3" />Preview</Button>
                <Button size="sm" variant="outline" onClick={() => downloadPdf(report)}><Download className="mr-1 h-3 w-3" />PDF</Button>
                <Button size="sm" variant="outline" onClick={() => handleEmailReport(report)}><Mail className="mr-1 h-3 w-3" />Email</Button>
                {report.status !== 'Final' && (
                  <Button size="sm" variant="outline" onClick={() => finalizeReport(report)}><RefreshCw className="mr-1 h-3 w-3" />Finalize</Button>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      <EntityModal
        open={!!activePreview}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewReport(null);
            setViewReport(null);
          }
        }}
        title={activePreview?.title || 'Audit Report Preview'}
        mode="view"
        maxWidth="5xl"
      >
        {activePreview && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div><Label className="text-muted-foreground">Audit</Label><p className="text-sm font-medium">{engagementById[activePreview.engagement_id]?.engagement_name || activePreview.title}</p></div>
              <div><Label className="text-muted-foreground">Department</Label><p className="text-sm font-medium">{activePreview.department_id ? departmentNameById[activePreview.department_id] || '—' : '—'}</p></div>
              <div><Label className="text-muted-foreground">Report Date</Label><p className="text-sm font-medium">{activePreview.generated_on ? formatDateForDisplay(activePreview.generated_on) : '—'}</p></div>
            </div>

            {[
              ['1. Executive Summary', activePreview.executive_summary],
              ['2. Audit Objective', activePreview.audit_objective],
              ['3. Audit Scope', activePreview.audit_scope],
              ['4. Audit Methodology', activePreview.methodology],
              ['5. Findings Summary', activePreview.overall_assessment],
              ['6. Risk Rating', activePreview.risk_rating],
              ['7. Recommendations', activePreview.recommendations],
              ['8. Management Responses & Corrective Actions', activePreview.follow_up_actions],
            ].map(([title, body]) => (
              <div key={title} className="space-y-2">
                <h3 className="text-sm font-semibold">{title}</h3>
                <div className="rounded-md border bg-card p-4">
                  <p className="whitespace-pre-wrap text-sm leading-6">{body || '—'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </EntityModal>
    </PageShell>
  );
}
