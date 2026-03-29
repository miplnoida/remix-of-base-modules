import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, FileText, Loader2, BarChart3, ExternalLink } from 'lucide-react';
import { StatusBadge } from '@/components/common';
import { useIAAuditReportMutations } from '@/hooks/useAuditReports';
import { useUserCode } from '@/hooks/useUserCode';
import { useToast } from '@/hooks/use-toast';
import { notifyReportGenerated } from '@/services/auditNotificationService';
import { useNavigate } from 'react-router-dom';

interface AuditReportTabProps {
  auditId: string;
  audit: any;
  auditFindings: any[];
  auditResponses: any[];
  auditActions: any[];
  getDeptName: (id: string) => string;
  getAuditorName: (id: string) => string;
}

export function AuditReportTab({ auditId, audit, auditFindings, auditResponses, auditActions, getDeptName, getAuditorName }: AuditReportTabProps) {
  const { create } = useIAAuditReportMutations();
  const { userCode } = useUserCode();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [previewContent, setPreviewContent] = useState<any>(null);

  const buildReportContent = () => {
    const findingsSummary = auditFindings.map(f => `• ${f.title} (${f.risk_rating}): ${f.condition || ''}`).join('\n');
    const recommendationsSummary = auditFindings.filter(f => f.recommendation).map(f => `• ${f.title}: ${f.recommendation}`).join('\n');
    const responsesSummary = auditResponses.map(r => {
      const finding = auditFindings.find(f => f.id === r.finding_id);
      return `• ${finding?.title || 'N/A'}: ${r.response_text || 'No response'} (${r.status})`;
    }).join('\n');
    const actionsSummary = auditActions.map(a => {
      const finding = auditFindings.find(f => f.id === a.finding_id);
      return `• ${finding?.title || 'N/A'}: ${a.action_description || ''} — ${a.responsible_person || 'Unassigned'} (${a.status})`;
    }).join('\n');
    const riskCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    auditFindings.forEach(f => { if (f.risk_rating && riskCounts[f.risk_rating as keyof typeof riskCounts] !== undefined) riskCounts[f.risk_rating as keyof typeof riskCounts]++; });

    return {
      executive_summary: `This audit report covers the ${audit?.engagement_name || 'audit'} conducted for ${audit?.department_id ? getDeptName(audit.department_id) : 'the organization'}. A total of ${auditFindings.length} finding(s) were identified with ${auditResponses.length} management response(s) received and ${auditActions.length} corrective action(s) assigned.`,
      audit_objective: audit?.objectives || 'To evaluate the effectiveness of internal controls and compliance with established policies and procedures.',
      audit_scope: audit?.scope || 'The audit covered the period and operations as defined in the engagement letter.',
      methodology: audit?.methodology || 'The audit was conducted in accordance with the International Standards for the Professional Practice of Internal Auditing.',
      findings_summary: findingsSummary || 'No findings recorded.',
      risk_summary: `Critical: ${riskCounts.Critical}, High: ${riskCounts.High}, Medium: ${riskCounts.Medium}, Low: ${riskCounts.Low}`,
      recommendations: recommendationsSummary || 'No recommendations.',
      management_responses: responsesSummary || 'No management responses received.',
      corrective_actions: actionsSummary || 'No corrective actions assigned.',
    };
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    const content = buildReportContent();
    const reportNumber = `RPT-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    create.mutate({
      title: `Audit Report — ${audit?.engagement_name}`,
      report_type: 'Engagement Report', engagement_id: auditId,
      department_id: audit?.department_id || null,
      fiscal_year: audit?.planned_start_date ? new Date(audit.planned_start_date).getFullYear().toString() : new Date().getFullYear().toString(),
      period: `${audit?.planned_start_date || ''} to ${audit?.planned_end_date || ''}`,
      report_number: reportNumber, executive_summary: content.executive_summary,
      audit_objective: content.audit_objective, audit_scope: content.audit_scope,
      methodology: content.methodology, recommendations: content.recommendations,
      risk_rating: content.risk_summary, overall_assessment: content.findings_summary,
      prepared_by: userCode || null, status: 'Draft',
      generated_on: new Date().toISOString(), created_by: userCode || null,
    } as any, {
      onSuccess: () => {
        setGenerating(false);
        toast({ title: 'Report Generated', description: 'The audit report has been created.' });
        notifyReportGenerated(audit?.engagement_name, audit?.department_id);
      },
      onError: () => setGenerating(false),
    });
  };

  // Auto-populated summary cards
  const summaryItems = [
    { label: 'Audit', value: audit?.engagement_name },
    { label: 'Department', value: audit?.department_id ? getDeptName(audit.department_id) : '—' },
    { label: 'Lead Auditor', value: audit?.lead_auditor_id ? getAuditorName(audit.lead_auditor_id) : '—' },
    { label: 'Period', value: `${audit?.planned_start_date || '—'} to ${audit?.planned_end_date || '—'}` },
    { label: 'Findings', value: auditFindings.length },
    { label: 'Responses', value: auditResponses.length },
    { label: 'Actions', value: auditActions.length },
  ];

  return (
    <div className="space-y-4">
      {/* Auto-populated metadata */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />Report Data (Auto-populated from Audit)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {summaryItems.map((item) => (
              <div key={item.label} className="p-2 rounded bg-background border border-border/50">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium truncate">{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setPreviewContent(buildReportContent())} variant="outline">
          <Eye className="h-4 w-4 mr-1" />Preview Report
        </Button>
        <Button onClick={handleGenerateReport} disabled={generating}>
          {generating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Generating...</> : <><FileText className="h-4 w-4 mr-1" />Generate Audit Report</>}
        </Button>
        <Button variant="outline" onClick={() => navigate('/audit/audit-reports')}>
          <ExternalLink className="h-4 w-4 mr-1" />Open Report Center
        </Button>
      </div>

      {/* Preview */}
      {previewContent && (
        <div className="space-y-3">
          {[
            { title: '1. Executive Summary', content: previewContent.executive_summary },
            { title: '2. Audit Objective', content: previewContent.audit_objective },
            { title: '3. Audit Scope', content: previewContent.audit_scope },
            { title: '4. Methodology', content: previewContent.methodology },
            { title: '5. Findings Summary', content: previewContent.findings_summary },
            { title: '6. Risk Summary', content: previewContent.risk_summary },
            { title: '7. Recommendations', content: previewContent.recommendations },
            { title: '8. Management Responses', content: previewContent.management_responses },
            { title: '9. Corrective Actions', content: previewContent.corrective_actions },
          ].map((section) => (
            <Card key={section.title}>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{section.title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap leading-relaxed">{section.content}</p></CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
