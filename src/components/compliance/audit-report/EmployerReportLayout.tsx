/**
 * Employer Audit Report — acknowledgment copy.
 * Audience: Employer / their representative.
 * Excludes internal working papers; surfaces violations clearly with
 * statutory reference, amount, due date, and dispute path.
 */
import type { FullAuditReport, AuditReportSignature, AuditViolationRow } from '@/types/auditReport';
import type { InspectionFinding } from '@/types/inspectionTypes';
import { formatDateForDisplay } from '@/lib/format-config';
import {
  CoverPage, PageHeader, PageFooter, Section, SamplingDisclaimer,
  AuditContactCard, SignatureBlock, SEV_COLOR, formatMoney,
} from './reportShared';

interface Props {
  report: FullAuditReport;
  findings: InspectionFinding[];
  violations: AuditViolationRow[];
  signatures: AuditReportSignature[];
}

const DEFAULT_DISPUTE_TEXT =
  'If you wish to dispute any violation listed above, you must submit a written objection to the Compliance Department of the Social Security Board within fourteen (14) calendar days of the date you acknowledge this report. Your objection must reference the Violation Number and clearly state the grounds for dispute, accompanied by any supporting documentation.';

export function EmployerReportLayout({ report, findings, violations, signatures }: Props) {
  const isDraft = report.status !== 'FINAL';
  const empSig = signatures.find((s) => s.signerRole === 'EMPLOYER_REP');
  const inspSig = signatures.find((s) => s.signerRole === 'INSPECTOR');
  const witSig = signatures.find((s) => s.signerRole === 'WITNESS');

  const totalPenalty = violations.reduce((s, v) => s + (v.totalAmount ?? 0), 0);

  return (
    <>
      <CoverPage report={report} variant="EMPLOYER" />
      {isDraft && <div className="draft-watermark-fixed" aria-hidden="true">DRAFT</div>}
      <div className="page-break" />
      <PageHeader report={report} variant="EMPLOYER" />

      <div className="variant-banner employer">EMPLOYER COPY — FOR YOUR RECORDS</div>

      <Section title="1. Purpose & Scope">
        <p>{report.purposeScope || report.scope || 'Not specified.'}</p>
      </Section>

      <Section title="2. Executive Summary">
        <p>{report.executiveSummary || 'No executive summary provided.'}</p>
      </Section>

      <Section title="3. Records Reviewed">
        <p>{report.recordsReviewed || 'No records reviewed entry recorded.'}</p>
      </Section>

      <Section title="4. Audit Summary">
        <table className="summary-table">
          <tbody>
            <tr>
              <th>Total Findings Communicated</th><td>{findings.length}</td>
              <th>Violations Issued</th><td>{violations.length}</td>
            </tr>
            <tr>
              <th>Total Amount Due</th>
              <td colSpan={3}><strong>{formatMoney(totalPenalty)}</strong></td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="5. Findings Communicated to Employer">
        {findings.length === 0 ? <p className="muted">No findings were recorded for this audit.</p> : (
          <table className="findings-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th>Finding</th>
                <th style={{ width: 90 }}>Severity</th>
                <th style={{ width: 120 }}>Category</th>
              </tr>
            </thead>
            <tbody>
              {findings.map((f, i) => (
                <tr key={f.id} className="finding-row">
                  <td>{i + 1}</td>
                  <td>
                    <div className="finding-title">{f.title}</div>
                    <div className="finding-desc">{f.description}</div>
                    {f.recommendedAction && (
                      <div className="finding-rec"><strong>Required Action:</strong> {f.recommendedAction}</div>
                    )}
                  </td>
                  <td><span className="sev-pill" style={{ background: SEV_COLOR[f.severity] ?? '#666' }}>{f.severity}</span></td>
                  <td>{f.category || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="6. Violations Issued">
        {violations.length === 0 ? (
          <div className="no-violations">No violations were issued from this audit.</div>
        ) : (
          <>
            <table className="violations-table">
              <thead>
                <tr>
                  <th style={{ width: 30 }}>#</th>
                  <th style={{ width: 110 }}>Violation #</th>
                  <th>Nature of Violation</th>
                  <th style={{ width: 120 }}>Statutory Reference</th>
                  <th style={{ width: 110 }}>Period</th>
                  <th style={{ width: 90 }} className="right">Principal</th>
                  <th style={{ width: 90 }} className="right">Penalty</th>
                  <th style={{ width: 100 }} className="right">Amount Due</th>
                  <th style={{ width: 90 }}>Due Date</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {violations.map((v, i) => (
                  <tr key={v.id}>
                    <td>{i + 1}</td>
                    <td><strong>{v.violationNumber ?? '—'}</strong></td>
                    <td>
                      <div>{v.summary ?? v.description ?? v.violationTypeName ?? '—'}</div>
                      {v.violationTypeName && v.summary && (
                        <div className="small muted">{v.violationTypeName}</div>
                      )}
                    </td>
                    <td>{v.statutoryReference ?? '—'}</td>
                    <td>{v.periodFrom ?? '—'}{v.periodTo ? ` → ${v.periodTo}` : ''}</td>
                    <td className="vio-amount">{formatMoney(v.principalAmount)}</td>
                    <td className="vio-amount">{formatMoney(v.penaltyAmount)}</td>
                    <td className="vio-amount vio-total">{formatMoney(v.totalAmount)}</td>
                    <td>{v.dueDate ? formatDateForDisplay(v.dueDate) : '—'}</td>
                    <td>
                      {v.sourceFindingNumber
                        ? <span className="source-finding">From Finding #{v.sourceFindingNumber}</span>
                        : <span className="small muted">—</span>}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={7} className="right"><strong>Total Amount Due</strong></td>
                  <td className="vio-amount vio-total">{formatMoney(totalPenalty)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>

            <div className="dispute-box">
              <strong>How to dispute a violation:</strong>
              <p style={{ margin: '6px 0 0' }}>
                {report.disputeInstructions || DEFAULT_DISPUTE_TEXT}
              </p>
            </div>
          </>
        )}
      </Section>

      <Section title="7. Required Actions">
        <p>{report.recommendations || 'No required actions specified.'}</p>
      </Section>

      <Section title="8. Compliance Conclusion">
        <p>{report.complianceConclusion || report.conclusions || 'No conclusion recorded.'}</p>
      </Section>

      <SamplingDisclaimer sectionLabel="9. Audit Scope Disclaimer" />

      <section className="signature-block">
        <h2 className="section-title">10. Acknowledgment & Signatures</h2>
        <AuditContactCard report={report} />
        <p className="ack-statement">
          I, the undersigned representative of <strong>{report.employerName ?? 'the employer'}</strong>,
          acknowledge that I have received and reviewed the contents of this audit report. My signature
          below indicates receipt of the report and does not constitute agreement with all findings unless
          explicitly stated in the comments section.
        </p>

        <div className="signature-grid">
          <SignatureBlock
            title="Employer Representative — Signatory"
            sig={empSig}
            auditContactName={report.auditContactName}
          />
          {inspSig && <SignatureBlock title="Inspector" sig={inspSig} />}
          {witSig && <SignatureBlock title="Witness" sig={witSig} />}
        </div>
      </section>

      <PageFooter report={report} />
    </>
  );
}
