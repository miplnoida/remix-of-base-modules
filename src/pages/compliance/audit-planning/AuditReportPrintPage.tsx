/**
 * Pure print page - no app chrome.
 * Reachable at /compliance/field/audit-report/:reportId/print/:variant
 *
 * - User opens this in a new tab from the viewer.
 * - Toolbar (no-print) provides Print and Variant switch.
 * - window.print() uses native browser print with @media print rules.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, FileText } from 'lucide-react';
import { auditReportService } from '@/services/auditReportService';
import { fieldAuditService } from '@/services/fieldAuditService';
import { AuditReportPrintLayout } from '@/components/compliance/audit-report/AuditReportPrintLayout';
import type { FullAuditReport, AuditReportSignature, AuditViolationRow } from '@/types/auditReport';
import type { InspectionFinding, InspectionEvidence } from '@/types/inspectionTypes';
import { employerPriorContextService, type EmployerPriorContext } from '@/services/employerPriorContextService';
import { toast } from 'sonner';

type Variant = 'INTERNAL' | 'EMPLOYER';

export default function AuditReportPrintPage() {
  const { reportId, variant: variantParam } = useParams<{ reportId: string; variant: string }>();
  const navigate = useNavigate();
  const variant: Variant = variantParam === 'employer' ? 'EMPLOYER' : 'INTERNAL';

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<FullAuditReport | null>(null);
  const [findings, setFindings] = useState<InspectionFinding[]>([]);
  const [evidence, setEvidence] = useState<InspectionEvidence[]>([]);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [signatures, setSignatures] = useState<AuditReportSignature[]>([]);
  const [violations, setViolations] = useState<AuditViolationRow[]>([]);
  const [priorContext, setPriorContext] = useState<EmployerPriorContext | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) return;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        // The :reportId param may actually be either the audit report PK
        // OR the inspection_id (depending on which screen launched print).
        // Try report PK first, then fall back to inspection lookup.
        let r = await auditReportService.getReport(reportId).catch(() => null);
        if (!r) {
          r = await auditReportService.getReportByInspection(reportId).catch(() => null);
        }
        if (!r) {
          setLoadError(
            `No audit report exists for id "${reportId}". Open the report viewer first so the draft is generated, then try Print again.`,
          );
          return;
        }
        // Canonical count refresh BEFORE assembling payload — guarantees print
        // shows the same numbers as the source tables (fixes "1 violation in
        // section, 0 in summary" mismatch when print is opened directly).
        if (r.status !== 'FINAL') {
          try { await fieldAuditService.recomputeReportMetrics(r.inspectionId); } catch {}
          // Re-fetch report so totals reflect the recompute
          r = await auditReportService.getReport(r.id);
        }
        const data = await auditReportService.assembleFullPayload(r!.inspectionId);
        setReport(r);
        setFindings(data.findings);
        setEvidence(data.evidence);
        setChecklist(data.checklist);
        setSignatures(data.signatures);
        setViolations(data.violations);
      } catch (e: any) {
        console.error('[AuditReportPrintPage] load failed', e);
        setLoadError(e?.message ?? 'Failed to load report');
        toast.error(e?.message ?? 'Failed to load report');
      } finally {
        setLoading(false);
      }
    })();
  }, [reportId]);

  const handlePrint = () => window.print();

  if (loading) return <div className="p-8 text-muted-foreground">Loading report…</div>;
  if (loadError || !report)
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-3">
        <div className="text-destructive font-medium">Unable to load audit report</div>
        <div className="text-sm text-muted-foreground">{loadError ?? 'Report not found.'}</div>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>
    );

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Toolbar - hidden on print */}
      <div className="no-print sticky top-0 z-10 bg-card border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground mr-2">View:</span>
            <Button
              variant={variant === 'INTERNAL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => navigate(`/compliance/field/audit-report/${reportId}/print/internal`)}
            >
              <FileText className="h-4 w-4 mr-1" /> Internal
            </Button>
            <Button
              variant={variant === 'EMPLOYER' ? 'default' : 'outline'}
              size="sm"
              onClick={() => navigate(`/compliance/field/audit-report/${reportId}/print/employer`)}
            >
              <FileText className="h-4 w-4 mr-1" /> Employer Copy
            </Button>
            <Button onClick={handlePrint} size="sm">
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>
        </div>
      </div>

      {/* Printable area */}
      <div className="py-6 print:py-0">
        <div
          className="bg-white shadow-md print:shadow-none mx-auto print:max-w-none"
          style={{ maxWidth: '8.5in', padding: '0.6in 0.5in' }}
        >
          <AuditReportPrintLayout
            report={report}
            findings={findings}
            evidence={evidence}
            checklist={checklist}
            signatures={signatures}
            violations={violations}
            priorContext={priorContext}
            variant={variant}
          />
        </div>
      </div>
    </div>
  );
}
