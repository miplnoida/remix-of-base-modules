/**
 * Print-friendly Audit Report Layout — thin router.
 *
 * Internal vs Employer reports now have materially different structures:
 *  - INTERNAL → working-paper grade (methodology, sampling, checklist,
 *    evidence chain of custody, full violations register).
 *  - EMPLOYER → acknowledgment copy (employer-safe findings + violations
 *    table with statutory ref + dispute instructions).
 *
 * This component picks the right body, mounts the shared print CSS once,
 * and is rendered by both the in-app print page and the public
 * acknowledgment portal.
 */
import type { FullAuditReport, AuditReportSignature, AuditViolationRow } from '@/types/auditReport';
import type { InspectionFinding, InspectionEvidence } from '@/types/inspectionTypes';
import { PRINT_CSS } from './reportShared';
import { InternalReportLayout } from './InternalReportLayout';
import { EmployerReportLayout } from './EmployerReportLayout';

export interface ReportLayoutProps {
  report: FullAuditReport;
  findings: InspectionFinding[];
  evidence: InspectionEvidence[];
  checklist: any[];
  signatures: AuditReportSignature[];
  /**
   * Violations attached to this audit. May be omitted by older callers
   * (acknowledgment portal pre-update). When omitted, the report shows
   * "No violations were issued from this audit."
   */
  violations?: AuditViolationRow[];
  variant: 'INTERNAL' | 'EMPLOYER';
}

export function AuditReportPrintLayout({
  report,
  findings,
  evidence,
  checklist,
  signatures,
  violations = [],
  variant,
}: ReportLayoutProps) {
  const isDraft = report.status !== 'FINAL';
  return (
    <div className={`audit-report-print ${isDraft ? 'is-draft' : ''}`}>
      <style>{PRINT_CSS}</style>
      {variant === 'INTERNAL' ? (
        <InternalReportLayout
          report={report}
          findings={findings}
          evidence={evidence}
          checklist={checklist}
          violations={violations}
          signatures={signatures}
        />
      ) : (
        <EmployerReportLayout
          report={report}
          findings={findings}
          violations={violations}
          signatures={signatures}
        />
      )}
    </div>
  );
}
