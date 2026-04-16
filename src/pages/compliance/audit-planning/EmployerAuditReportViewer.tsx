import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChevronLeft, FileText, CheckCircle2, RefreshCcw, Printer, PenTool, History, Plus, RotateCcw, Download, Send, User, Users } from 'lucide-react';
import { fieldAuditService } from '@/services/fieldAuditService';
import { auditReportService } from '@/services/auditReportService';
import { auditReportPdfService } from '@/services/auditReportPdfService';
import { CaptureSignatureDialog } from '@/components/compliance/audit-report/CaptureSignatureDialog';
import { SendAcknowledgmentDialog } from '@/components/compliance/audit-report/SendAcknowledgmentDialog';
import type { FullAuditReport, AuditReportSignature, SignerRole, AuditReportVersion, AuditReportSignatureEvent } from '@/types/auditReport';
import { toast } from 'sonner';
import { formatDateForDisplay } from '@/lib/format-config';

export default function EmployerAuditReportViewer() {
  const { inspectionId } = useParams<{ inspectionId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<FullAuditReport | null>(null);
  const [signatures, setSignatures] = useState<AuditReportSignature[]>([]);
  const [versions, setVersions] = useState<AuditReportVersion[]>([]);
  const [events, setEvents] = useState<AuditReportSignatureEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // narrative + audit contact fields
  const [purposeScope, setPurposeScope] = useState('');
  const [executiveSummary, setExecutiveSummary] = useState('');
  const [recordsReviewed, setRecordsReviewed] = useState('');
  const [scope, setScope] = useState('');
  const [conclusions, setConclusions] = useState('');
  const [complianceConclusion, setComplianceConclusion] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [auditDate, setAuditDate] = useState('');
  const [auditLocation, setAuditLocation] = useState('');
  const [employerRegNumber, setEmployerRegNumber] = useState('');
  // Audit Contact (person met during audit)
  const [auditContactName, setAuditContactName] = useState('');
  const [auditContactDesignation, setAuditContactDesignation] = useState('');
  const [auditContactRelationship, setAuditContactRelationship] = useState('');
  const [auditContactPresent, setAuditContactPresent] = useState(true);

  const [sigRole, setSigRole] = useState<SignerRole | null>(null);
  const [showSendAck, setShowSendAck] = useState(false);

  useEffect(() => {
    if (!inspectionId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectionId]);

  const load = async () => {
    if (!inspectionId) return;
    try {
      setLoading(true);
      let r = await auditReportService.getReportByInspection(inspectionId);
      if (!r) {
        await fieldAuditService.generateEmployerAuditReport(inspectionId);
        r = await auditReportService.getReportByInspection(inspectionId);
      }
      if (!r) throw new Error('Could not initialize report');
      hydrate(r);
      const [sigs, vers, evts] = await Promise.all([
        auditReportService.listSignatures(r.id),
        auditReportService.listVersions(r.id),
        auditReportService.listSignatureEvents(r.id),
      ]);
      setSignatures(sigs);
      setVersions(vers);
      setEvents(evts);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const hydrate = (r: FullAuditReport) => {
    setReport(r);
    setPurposeScope(r.purposeScope ?? '');
    setExecutiveSummary(r.executiveSummary ?? '');
    setRecordsReviewed(r.recordsReviewed ?? '');
    setScope(r.scope ?? '');
    setConclusions(r.conclusions ?? '');
    setComplianceConclusion(r.complianceConclusion ?? '');
    setRecommendations(r.recommendations ?? '');
    setAuditDate(r.auditDate ?? '');
    setAuditLocation(r.auditLocation ?? '');
    setEmployerRegNumber(r.employerRegNumber ?? '');
    setAuditContactName(r.auditContactName ?? r.employerRepName ?? '');
    setAuditContactDesignation(r.auditContactDesignation ?? r.employerRepDesignation ?? '');
    setAuditContactRelationship(r.auditContactRelationship ?? '');
    setAuditContactPresent(r.auditContactPresent ?? true);
  };

  const handleRegenerate = async () => {
    if (!inspectionId) return;
    try {
      setSaving(true);
      await fieldAuditService.generateEmployerAuditReport(inspectionId);
      await load();
      toast.success('Report counts refreshed');
    } catch (e: any) {
      toast.error(e.message ?? 'Refresh failed');
    } finally {
      setSaving(false);
    }
  };

  const buildNarrativePayload = () => ({
    purposeScope, executiveSummary, recordsReviewed, scope,
    conclusions, complianceConclusion, recommendations,
    auditDate: auditDate || undefined,
    auditLocation, employerRegNumber,
    auditContactName, auditContactDesignation,
    auditContactRelationship, auditContactPresent,
  });

  const handleSave = async () => {
    if (!report) return;
    try {
      setSaving(true);
      await auditReportService.updateNarrative(report.id, buildNarrativePayload());
      await auditReportService.snapshotVersion(report.id, { notes: 'Draft saved' });
      toast.success('Draft saved (version snapshot created)');
      load();
    } catch (e: any) {
      toast.error(e.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!report) return;
    if (!confirm('Finalize this report? It will be locked from further edits.')) return;
    try {
      setSaving(true);
      await auditReportService.updateNarrative(report.id, buildNarrativePayload());
      await auditReportService.finalize(report.id);
      toast.success('Audit report finalized');
      load();
    } catch (e: any) {
      toast.error(e.message ?? 'Finalize failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReplaceSignature = async (id: string) => {
    const reason = prompt('Reason for replacing this signature?');
    if (!reason?.trim()) return;
    try {
      await auditReportService.supersedeSignature(id, reason.trim());
      toast.success('Signature superseded — capture a new one');
      load();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed');
    }
  };

  const openPrint = (variant: 'internal' | 'employer') => {
    if (!report) return;
    window.open(`/compliance/field/audit-report/${report.id}/print/${variant}`, '_blank');
  };

  const downloadPdf = async (variant: 'INTERNAL' | 'EMPLOYER') => {
    if (!report) return;
    try {
      const data = await auditReportService.assembleFullPayload(report.inspectionId);
      auditReportPdfService.download({
        report,
        findings: data.findings,
        evidence: data.evidence,
        checklist: data.checklist,
        signatures: data.signatures,
        variant,
      });
    } catch (e: any) {
      toast.error(e.message ?? 'PDF generation failed');
    }
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading audit report…</div>;
  if (!report) return <div className="p-6 text-muted-foreground">Report not found.</div>;

  const isFinal = report.status === 'FINAL';
  const auditContact = {
    name: auditContactName,
    designation: auditContactDesignation,
    relationship: auditContactRelationship,
    present: auditContactPresent,
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={`Employer Audit Report — ${report.reportNumber}`}
        subtitle={`${report.employerName ?? '—'} • ${formatDateForDisplay(report.reportDate)}`}
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Field', href: '/compliance/field/my-plans' },
          { label: 'Audit Report' },
        ]}
      />

      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex gap-2 flex-wrap">
          <Badge variant={isFinal ? 'default' : 'secondary'}>{report.status}</Badge>
          <Badge variant="outline">v{report.currentVersion}</Badge>
          <Button variant="outline" size="sm" onClick={() => openPrint('internal')}>
            <Printer className="h-4 w-4 mr-1" /> Internal Print
          </Button>
          <Button variant="outline" size="sm" onClick={() => openPrint('employer')}>
            <Printer className="h-4 w-4 mr-1" /> Employer Copy
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadPdf('INTERNAL')}>
            <Download className="h-4 w-4 mr-1" /> Internal PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadPdf('EMPLOYER')}>
            <Download className="h-4 w-4 mr-1" /> Employer PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSendAck(true)} disabled={!isFinal}>
            <Send className="h-4 w-4 mr-1" /> Send Ack Link
          </Button>
          <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={saving || isFinal}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Refresh Counts
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Findings" value={report.totalFindings} />
        <Stat label="Evidence" value={report.totalEvidence} />
        <Stat label="Violations" value={report.totalViolations} />
        <Stat label="Checklist" value={`${report.checklistCompletionPct}%`} />
      </div>

      <Tabs defaultValue="narrative">
        <TabsList>
          <TabsTrigger value="narrative"><FileText className="h-4 w-4 mr-1" />Narrative</TabsTrigger>
          <TabsTrigger value="signatures"><PenTool className="h-4 w-4 mr-1" />Signatures ({signatures.length})</TabsTrigger>
          <TabsTrigger value="versions"><History className="h-4 w-4 mr-1" />Versions ({versions.length})</TabsTrigger>
          <TabsTrigger value="audit"><Users className="h-4 w-4 mr-1" />Audit Trail ({events.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="narrative">
          <Card>
            <CardHeader><CardTitle>Report Narrative</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><Label>Audit Date</Label><Input type="date" value={auditDate} onChange={(e) => setAuditDate(e.target.value)} disabled={isFinal} /></div>
                <div><Label>Audit Location</Label><Input value={auditLocation} onChange={(e) => setAuditLocation(e.target.value)} disabled={isFinal} placeholder="Employer site address" /></div>
                <div><Label>Employer Reg. No.</Label><Input value={employerRegNumber} onChange={(e) => setEmployerRegNumber(e.target.value)} disabled={isFinal} /></div>
              </div>

              <Separator />

              {/* Audit Contact (person met during audit) */}
              <div className="rounded-md border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Audit Contact (person met during audit)</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  The employer representative who was present and engaged with during the on-site audit.
                  This identity is preserved on record even if a different person signs the report later.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div><Label>Full Name</Label><Input value={auditContactName} onChange={(e) => setAuditContactName(e.target.value)} disabled={isFinal} placeholder="e.g. Jane Doe" /></div>
                  <div><Label>Designation</Label><Input value={auditContactDesignation} onChange={(e) => setAuditContactDesignation(e.target.value)} disabled={isFinal} placeholder="e.g. HR Manager" /></div>
                  <div><Label>Relationship to Employer</Label><Input value={auditContactRelationship} onChange={(e) => setAuditContactRelationship(e.target.value)} disabled={isFinal} placeholder="e.g. Employee, Director" /></div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={auditContactPresent} onCheckedChange={setAuditContactPresent} disabled={isFinal} id="present" />
                  <Label htmlFor="present" className="text-sm font-normal">Was present during the audit visit</Label>
                </div>
              </div>

              <NarrativeField label="1. Purpose & Scope" value={purposeScope} onChange={setPurposeScope} disabled={isFinal} placeholder="Why this audit was conducted, period reviewed, scope boundaries…" />
              <NarrativeField label="2. Executive Summary" value={executiveSummary} onChange={setExecutiveSummary} disabled={isFinal} placeholder="High-level summary of the audit visit and headline outcomes…" />
              <NarrativeField label="3. Records Reviewed" value={recordsReviewed} onChange={setRecordsReviewed} disabled={isFinal} placeholder="Wage book, payroll registers, contribution records, etc." />
              <NarrativeField label="Recommendations / Required Actions" value={recommendations} onChange={setRecommendations} disabled={isFinal} placeholder="Required corrective actions, follow-up plan…" />
              <NarrativeField label="Conclusions (Internal)" value={conclusions} onChange={setConclusions} disabled={isFinal} placeholder="Detailed internal conclusions, severity assessment…" />
              <NarrativeField label="Compliance Conclusion (Employer-facing)" value={complianceConclusion} onChange={setComplianceConclusion} disabled={isFinal} placeholder="Employer-facing compliance verdict…" />
              <Separator />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleSave} disabled={saving || isFinal}>Save Draft</Button>
                <Button onClick={handleFinalize} disabled={saving || isFinal}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Finalize Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signatures">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Signatures & Acknowledgment</span>
                <span className="text-xs text-muted-foreground font-normal">
                  Signatures can be captured at any time. Replacing a signature preserves the original in the audit trail.
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {auditContactName && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm flex items-center gap-3">
                  <User className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Audit Contact (recorded during audit)</div>
                    <div><strong>{auditContactName}</strong>{auditContactDesignation && ` — ${auditContactDesignation}`}</div>
                  </div>
                  {auditContactPresent && <Badge variant="outline" className="text-[10px]">Present at audit</Badge>}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(['EMPLOYER_REP', 'INSPECTOR', 'WITNESS', 'SUPERVISOR'] as SignerRole[]).map((role) => {
                  const sig = signatures.find((s) => s.signerRole === role);
                  return (
                    <Card key={role} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-sm">{ROLE_LABELS[role]}</div>
                        {sig ? (
                          <Badge variant={sig.signatureType === 'REFUSED' || sig.signatureType === 'UNAVAILABLE' ? 'destructive' : 'default'}>
                            {sig.signatureType}
                          </Badge>
                        ) : <Badge variant="outline">Pending</Badge>}
                      </div>
                      {sig ? (
                        <div className="text-sm space-y-1">
                          <div><strong>{sig.signerName}</strong></div>
                          {sig.signerDesignation && <div className="text-muted-foreground">{sig.signerDesignation}</div>}
                          {role === 'EMPLOYER_REP' && (
                            sig.signerSameAsContact
                              ? <Badge variant="outline" className="text-[10px]">Same as audit contact</Badge>
                              : <Badge variant="secondary" className="text-[10px]">Different from audit contact</Badge>
                          )}
                          {sig.signerAuthorityNote && (
                            <div className="text-xs italic text-muted-foreground mt-1">"{sig.signerAuthorityNote}"</div>
                          )}
                          {sig.signedAt && <div className="text-xs text-muted-foreground">Signed: {formatDateForDisplay(sig.signedAt)}</div>}
                          {sig.signatureImageUrl && <img src={sig.signatureImageUrl} alt="signature" className="max-h-12 border-b mt-1" />}
                          {sig.typedName && <div className="italic text-base" style={{ fontFamily: 'cursive' }}>/s/ {sig.typedName}</div>}
                          {sig.refusalReason && <div className="text-xs text-destructive">Reason: {sig.refusalReason}</div>}
                          {sig.witnessName && (
                            <div className="text-xs text-muted-foreground border-l-2 border-muted pl-2 mt-1">
                              Witness: {sig.witnessName}{sig.witnessDesignation && ` (${sig.witnessDesignation})`}
                            </div>
                          )}
                          {sig.comments && <div className="text-xs italic">"{sig.comments}"</div>}
                          <Button variant="ghost" size="sm" onClick={() => handleReplaceSignature(sig.id)} className="text-muted-foreground mt-1">
                            <RotateCcw className="h-3 w-3 mr-1" /> Replace
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setSigRole(role)}>
                          <Plus className="h-3 w-3 mr-1" /> Capture Signature
                        </Button>
                      )}
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions">
          <Card>
            <CardHeader><CardTitle>Version History</CardTitle></CardHeader>
            <CardContent>
              {versions.length === 0 ? (
                <p className="text-muted-foreground text-sm">No saved versions yet. Save the draft to create a snapshot.</p>
              ) : (
                <div className="space-y-2">
                  {versions.map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <div className="font-semibold">Version {v.versionNumber} {v.isFinal && <Badge className="ml-2">FINAL</Badge>}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateForDisplay(v.createdAt)} • by {v.createdBy} {v.notes && `• ${v.notes}`}
                        </div>
                      </div>
                      {v.pdfUrl && (
                        <a href={v.pdfUrl} target="_blank" rel="noreferrer">
                          <Button variant="outline" size="sm">View PDF</Button>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader><CardTitle>Signature Audit Trail</CardTitle></CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-muted-foreground text-sm">No events yet.</p>
              ) : (
                <div className="space-y-2">
                  {events.map((e) => (
                    <div key={e.id} className="text-sm border-l-2 border-primary/40 pl-3 py-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{e.eventType}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDateForDisplay(e.eventAt)} • {e.actorUserCode ?? 'system'}</span>
                      </div>
                      {e.metadata && Object.keys(e.metadata).length > 0 && (
                        <pre className="text-[10px] text-muted-foreground mt-1 font-mono">{JSON.stringify(e.metadata)}</pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {sigRole && report && (
        <CaptureSignatureDialog
          reportId={report.id}
          signerRole={sigRole}
          auditContact={sigRole === 'EMPLOYER_REP' ? auditContact : undefined}
          inspectorName={report.inspectorName}
          onClose={() => setSigRole(null)}
          onCaptured={load}
        />
      )}

      {showSendAck && report && (
        <SendAcknowledgmentDialog
          reportId={report.id}
          defaultRecipientName={report.employerName ?? ''}
          onClose={() => setShowSendAck(false)}
          onSent={load}
        />
      )}
    </div>
  );
}

const ROLE_LABELS: Record<SignerRole, string> = {
  EMPLOYER_REP: 'Employer Representative',
  INSPECTOR: 'Lead Inspector',
  SUPERVISOR: 'Supervisor',
  WITNESS: 'Witness',
};

function NarrativeField({ label, value, onChange, disabled, placeholder }: { label: string; value: string; onChange: (v: string) => void; disabled: boolean; placeholder?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} />
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
