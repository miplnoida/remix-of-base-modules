import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, FileText, Download, CheckCircle2, RefreshCcw } from 'lucide-react';
import { fieldAuditService, type EmployerAuditReportRow } from '@/services/fieldAuditService';
import { toast } from 'sonner';
import { htmlToPdfBase64 } from '@/lib/htmlToPdf';
import { supabase } from '@/integrations/supabase/client';

export default function EmployerAuditReportViewer() {
  const { inspectionId } = useParams<{ inspectionId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<EmployerAuditReportRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [executiveSummary, setExecutiveSummary] = useState('');
  const [scope, setScope] = useState('');
  const [conclusions, setConclusions] = useState('');
  const [recommendations, setRecommendations] = useState('');

  useEffect(() => {
    if (!inspectionId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectionId]);

  const load = async () => {
    try {
      setLoading(true);
      let r = await fieldAuditService.getEmployerAuditReport(inspectionId!);
      if (!r) {
        r = await fieldAuditService.generateEmployerAuditReport(inspectionId!);
      }
      hydrate(r);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const hydrate = (r: EmployerAuditReportRow) => {
    setReport(r);
    setExecutiveSummary(r.executiveSummary ?? '');
    setScope(r.scope ?? '');
    setConclusions(r.conclusions ?? '');
    setRecommendations(r.recommendations ?? '');
  };

  const handleRegenerate = async () => {
    if (!inspectionId) return;
    try {
      setSaving(true);
      const r = await fieldAuditService.generateEmployerAuditReport(inspectionId);
      hydrate(r);
      toast.success('Report counts refreshed');
    } catch (e: any) {
      toast.error(e.message ?? 'Refresh failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!report) return;
    try {
      setSaving(true);
      await fieldAuditService.updateAuditReportNarrative(report.id, {
        executiveSummary,
        scope,
        conclusions,
        recommendations,
      });
      toast.success('Narrative saved');
    } catch (e: any) {
      toast.error(e.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!report) return;
    try {
      setSaving(true);
      // Save narrative first
      await fieldAuditService.updateAuditReportNarrative(report.id, {
        executiveSummary,
        scope,
        conclusions,
        recommendations,
      });
      // Generate PDF
      const html = buildReportHtml({ report, executiveSummary, scope, conclusions, recommendations });
      const pdfBase64 = await htmlToPdfBase64(html);
      const path = `audit-reports/${report.reportNumber}.pdf`;
      const blob = base64ToBlob(pdfBase64, 'application/pdf');
      const { error: upErr } = await supabase.storage
        .from('documents')
        .upload(path, blob, { upsert: true, contentType: 'application/pdf' });
      let pdfUrl: string | undefined;
      if (!upErr) {
        const { data } = supabase.storage.from('documents').getPublicUrl(path);
        pdfUrl = data.publicUrl;
      }
      await fieldAuditService.finalizeAuditReport(report.id, pdfUrl);
      toast.success('Audit report finalized');
      load();
    } catch (e: any) {
      toast.error(e.message ?? 'Finalize failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading audit report…</div>;
  if (!report) return <div className="p-6 text-muted-foreground">Report not found.</div>;

  const isFinal = report.status === 'FINAL';

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={`Employer Audit Report — ${report.reportNumber}`}
        subtitle={`${report.employerName ?? '—'} • ${report.reportDate}`}
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Field', href: '/compliance/field/my-plans' },
          { label: 'Audit Report' },
        ]}
      />

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex gap-2">
          <Badge variant={isFinal ? 'default' : 'secondary'}>{report.status}</Badge>
          {report.pdfUrl && (
            <a href={report.pdfUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" /> Download PDF
              </Button>
            </a>
          )}
          <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={saving || isFinal}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Refresh Counts
          </Button>
        </div>
      </div>

      {/* Summary Counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Findings" value={report.totalFindings} />
        <Stat label="Evidence" value={report.totalEvidence} />
        <Stat label="Violations" value={report.totalViolations} />
        <Stat label="Checklist" value={`${report.checklistCompletionPct}%`} />
      </div>

      {/* Narrative editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Report Narrative
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Executive Summary</Label>
            <Textarea
              rows={4}
              value={executiveSummary}
              onChange={(e) => setExecutiveSummary(e.target.value)}
              disabled={isFinal}
              placeholder="High-level summary of the audit visit, employer cooperation, and headline outcomes…"
            />
          </div>
          <div>
            <Label>Scope</Label>
            <Textarea
              rows={3}
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              disabled={isFinal}
              placeholder="Period reviewed, areas covered (payroll, contributions, wage book), records examined…"
            />
          </div>
          <div>
            <Label>Conclusions</Label>
            <Textarea
              rows={4}
              value={conclusions}
              onChange={(e) => setConclusions(e.target.value)}
              disabled={isFinal}
              placeholder="Compliance status, key issues, severity assessment…"
            />
          </div>
          <div>
            <Label>Recommendations</Label>
            <Textarea
              rows={4}
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              disabled={isFinal}
              placeholder="Required corrective actions, follow-up plan, escalation suggestions…"
            />
          </div>
          <Separator />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleSave} disabled={saving || isFinal}>
              Save Draft
            </Button>
            <Button onClick={handleFinalize} disabled={saving || isFinal}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Finalize & Generate PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function base64ToBlob(b64: string, mime: string): Blob {
  const byteChars = atob(b64);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
  return new Blob([byteArray], { type: mime });
}

function buildReportHtml(opts: {
  report: EmployerAuditReportRow;
  executiveSummary: string;
  scope: string;
  conclusions: string;
  recommendations: string;
}): string {
  const { report, executiveSummary, scope, conclusions, recommendations } = opts;
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;color:#111;padding:32px;font-size:12px;line-height:1.5}
.cover{text-align:center;padding:60px 0;border-bottom:2px solid #111}
.brand{font-size:14px;color:#666;letter-spacing:2px;text-transform:uppercase}
.title{font-size:28px;font-weight:bold;margin:16px 0 8px}
.report-no{font-size:14px;color:#444}
.meta{margin:24px 0;padding:12px;background:#f5f5f5;border-radius:4px}
.meta div{margin:4px 0}
h2{font-size:16px;margin-top:24px;border-bottom:1px solid #ccc;padding-bottom:4px}
.kpi{display:flex;gap:12px;margin:12px 0}
.kpi-box{flex:1;padding:10px;background:#f5f5f5;border-radius:4px;text-align:center}
.kpi-val{font-size:20px;font-weight:bold}
.kpi-lbl{font-size:10px;color:#666;text-transform:uppercase}
.section{margin:16px 0}
.section p{white-space:pre-wrap;margin:8px 0}
.footer{margin-top:40px;padding-top:12px;border-top:1px solid #ccc;text-align:center;color:#666;font-size:10px}
</style></head><body>
<div class="cover">
  <div class="brand">Misha Infotech</div>
  <div class="title">Employer Audit Report</div>
  <div class="report-no">${report.reportNumber}</div>
</div>
<div class="meta">
  <div><b>Employer:</b> ${report.employerName ?? '—'} (${report.employerId ?? '—'})</div>
  <div><b>Inspector:</b> ${report.inspectorName ?? '—'}</div>
  <div><b>Report Date:</b> ${report.reportDate}</div>
  <div><b>Status:</b> ${report.status}</div>
</div>
<div class="kpi">
  <div class="kpi-box"><div class="kpi-val">${report.totalFindings}</div><div class="kpi-lbl">Findings</div></div>
  <div class="kpi-box"><div class="kpi-val">${report.totalEvidence}</div><div class="kpi-lbl">Evidence</div></div>
  <div class="kpi-box"><div class="kpi-val">${report.totalViolations}</div><div class="kpi-lbl">Violations</div></div>
  <div class="kpi-box"><div class="kpi-val">${report.checklistCompletionPct}%</div><div class="kpi-lbl">Checklist</div></div>
</div>
<h2>Executive Summary</h2><div class="section"><p>${escapeHtml(executiveSummary) || '—'}</p></div>
<h2>Scope</h2><div class="section"><p>${escapeHtml(scope) || '—'}</p></div>
<h2>Conclusions</h2><div class="section"><p>${escapeHtml(conclusions) || '—'}</p></div>
<h2>Recommendations</h2><div class="section"><p>${escapeHtml(recommendations) || '—'}</p></div>
<div class="footer">Generated by Misha Infotech Compliance Platform • ${new Date().toLocaleString()}</div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return (s || '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)
  );
}
