/**
 * Internal Audit Report — working-paper grade.
 * Audience: Audit Manager, Supervisor, Legal, future auditors.
 * Includes methodology, sampling basis, full checklist, evidence chain,
 * and a full violations register (with internal fields).
 */
import type { FullAuditReport, AuditReportSignature, AuditViolationRow } from '@/types/auditReport';
import type { InspectionFinding, InspectionEvidence } from '@/types/inspectionTypes';
import type { EmployerPriorContext } from '@/services/employerPriorContextService';
import { formatDateForDisplay } from '@/lib/format-config';
import {
  CoverPage, PageHeader, PageFooter, Section, SamplingDisclaimer,
  AuditContactCard, SignatureBlock, SEV_COLOR, formatMoney,
} from './reportShared';
import { PriorContextSection } from './PriorContextSection';

interface Props {
  report: FullAuditReport;
  findings: InspectionFinding[];
  evidence: InspectionEvidence[];
  checklist: any[];
  violations: AuditViolationRow[];
  signatures: AuditReportSignature[];
  priorContext?: EmployerPriorContext | null;
}

export function InternalReportLayout({ report, findings, evidence, checklist, violations, signatures, priorContext }: Props) {
  const isDraft = report.status !== 'FINAL';
  const checklistAnswered = checklist.filter((c: any) => c.response).length;
  const findingsBySeverity = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1; return acc;
  }, {});
  const empSig = signatures.find((s) => s.signerRole === 'EMPLOYER_REP');
  const inspSig = signatures.find((s) => s.signerRole === 'INSPECTOR');
  const supSig = signatures.find((s) => s.signerRole === 'SUPERVISOR');
  const witSig = signatures.find((s) => s.signerRole === 'WITNESS');

  const totalPenalty = violations.reduce((s, v) => s + (v.totalAmount ?? 0), 0);

  return (
    <>
      <CoverPage report={report} variant="INTERNAL" />
      {isDraft && <div className="draft-watermark-fixed" aria-hidden="true">DRAFT</div>}
      <div className="page-break" />
      <PageHeader report={report} variant="INTERNAL" />

      <div className="variant-banner internal">INTERNAL WORKING-PAPER REPORT — NOT FOR EXTERNAL DISTRIBUTION</div>

      <Section title="1. Purpose & Scope">
        <p>{report.purposeScope || report.scope || 'Not specified.'}</p>
      </Section>

      <Section title="2. Executive Summary">
        <p>{report.executiveSummary || 'No executive summary provided.'}</p>
      </Section>

      <Section title="3. Audit Methodology & Procedures Performed">
        <p>{report.methodology || 'Methodology not documented. (Internal field — required before finalization.)'}</p>
      </Section>

      <Section title="4. Sampling Basis & Population">
        <p>{report.samplingBasis || 'Sampling basis not documented. (Internal field — required before finalization.)'}</p>
      </Section>

      <Section title="5. Records Reviewed">
        <p>{report.recordsReviewed || 'No records reviewed entry recorded.'}</p>
      </Section>

      <Section title="6. Working Papers — Checklist Responses">
        {checklist.length === 0 ? (
          <p className="muted">No checklist responses recorded.</p>
        ) : (
          <table className="working-paper-checklist">
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th>Question / Procedure</th>
                <th style={{ width: 120 }}>Category</th>
                <th style={{ width: 70 }}>Response</th>
                <th>Inspector Notes</th>
              </tr>
            </thead>
            <tbody>
              {checklist.map((c: any, i: number) => (
                <tr key={c.id ?? i}>
                  <td>{i + 1}</td>
                  <td>{c.question_text ?? c.questionText ?? c.title ?? '—'}</td>
                  <td>{c.category ?? '—'}</td>
                  <td className="response" data-r={c.response ?? '—'}>{c.response ?? '—'}</td>
                  <td>{c.notes ?? c.response_notes ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="7. Audit Summary">
        <table className="summary-table">
          <tbody>
            <tr>
              <th>Total Findings</th><td>{findings.length}</td>
              <th>Evidence Items</th><td>{evidence.length}</td>
            </tr>
            <tr>
              <th>Checklist Completion</th>
              <td>{report.checklistCompletionPct}% ({checklistAnswered}/{checklist.length})</td>
              <th>Violations Raised</th><td>{violations.length}</td>
            </tr>
            <tr><th colSpan={4} className="severity-row-header">Findings by Severity</th></tr>
            <tr>
              <td colSpan={4}>
                {(['Critical', 'High', 'Medium', 'Low'] as const).map((s) => (
                  <span key={s} className="sev-pill" style={{ background: SEV_COLOR[s] }}>
                    {s}: {findingsBySeverity[s] ?? 0}
                  </span>
                ))}
              </td>
            </tr>
            {report.riskRating && (
              <tr><th>Overall Risk Rating</th><td colSpan={3}><strong>{report.riskRating}</strong></td></tr>
            )}
          </tbody>
        </table>
      </Section>

      <Section title="8. Detailed Findings">
        {findings.length === 0 ? <p className="muted">No findings were recorded for this audit.</p> : (
          <table className="findings-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th>Finding</th>
                <th style={{ width: 90 }}>Severity</th>
                <th style={{ width: 120 }}>Category</th>
                <th style={{ width: 60 }}>Evidence</th>
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
                      <div className="finding-rec"><strong>Recommended Action:</strong> {f.recommendedAction}</div>
                    )}
                  </td>
                  <td><span className="sev-pill" style={{ background: SEV_COLOR[f.severity] ?? '#666' }}>{f.severity}</span></td>
                  <td>{f.category || '—'}</td>
                  <td className="center">{f.evidenceIds?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="9. Evidence Register (Chain of Custody)">
        {evidence.length === 0 ? <p className="muted">No evidence captured.</p> : (
          <table className="evidence-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th>File</th>
                <th style={{ width: 80 }}>Type</th>
                <th style={{ width: 130 }}>Captured</th>
                <th>Captured By / GPS</th>
              </tr>
            </thead>
            <tbody>
              {evidence.map((e, i) => (
                <tr key={e.id}>
                  <td>{i + 1}</td>
                  <td>
                    <div>{e.fileName}</div>
                    {e.description && <div className="muted small">{e.description}</div>}
                  </td>
                  <td>{e.evidenceType}</td>
                  <td>{e.capturedAt ? formatDateForDisplay(e.capturedAt) : '—'}</td>
                  <td className="evidence-chain-meta">
                    {e.capturedByName ?? e.capturedBy ?? '—'}
                    {(e.gpsLat != null && e.gpsLng != null) && (
                      <div>GPS: {e.gpsLat.toFixed(5)}, {e.gpsLng.toFixed(5)}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="10. Violations Raised From This Audit">
        {violations.length === 0 ? (
          <div className="no-violations">No violations were issued from this audit.</div>
        ) : (
          <table className="violations-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th style={{ width: 110 }}>Violation #</th>
                <th>Type / Statutory Ref</th>
                <th>Description</th>
                <th style={{ width: 110 }}>Period</th>
                <th style={{ width: 90 }} className="right">Principal</th>
                <th style={{ width: 90 }} className="right">Penalty</th>
                <th style={{ width: 90 }} className="right">Total</th>
                <th style={{ width: 90 }}>Due</th>
                <th style={{ width: 80 }}>Status</th>
                <th>Source / Assigned</th>
              </tr>
            </thead>
            <tbody>
              {violations.map((v, i) => (
                <tr key={v.id}>
                  <td>{i + 1}</td>
                  <td><strong>{v.violationNumber ?? '—'}</strong></td>
                  <td>
                    <div>{v.violationTypeName ?? '—'}</div>
                    {v.statutoryReference && <div className="small muted">Code: {v.statutoryReference}</div>}
                  </td>
                  <td>{v.summary ?? v.description ?? '—'}</td>
                  <td>{v.periodFrom ?? '—'}{v.periodTo ? ` → ${v.periodTo}` : ''}</td>
                  <td className="vio-amount">{formatMoney(v.principalAmount)}</td>
                  <td className="vio-amount">{formatMoney(v.penaltyAmount)}</td>
                  <td className="vio-amount vio-total">{formatMoney(v.totalAmount)}</td>
                  <td>{v.dueDate ? formatDateForDisplay(v.dueDate) : '—'}</td>
                  <td>{v.status ?? '—'}</td>
                  <td>
                    {v.sourceFindingNumber && <div className="source-finding">From Finding #{v.sourceFindingNumber}</div>}
                    {v.assignedToName && <div className="small muted">Assigned: {v.assignedToName}</div>}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={7} className="right"><strong>Total Exposure</strong></td>
                <td className="vio-amount vio-total">{formatMoney(totalPenalty)}</td>
                <td colSpan={3}></td>
              </tr>
            </tbody>
          </table>
        )}
      </Section>

      <Section title="11. Prior Compliance Context (Same Employer)">
        <PriorContextSection ctx={priorContext} />
      </Section>

      <Section title="12. Inspector Recommendations">
        <p>{report.recommendations || 'No recommendations issued.'}</p>
      </Section>

      <Section title="12. Conclusions & Risk Assessment">
        <p>{report.conclusions || report.complianceConclusion || 'No conclusion recorded.'}</p>
        {report.riskRating && <p><strong>Overall Risk Rating:</strong> {report.riskRating}</p>}
      </Section>

      <SamplingDisclaimer sectionLabel="13. Audit Scope Disclaimer" />

      <section className="signature-block">
        <h2 className="section-title">14. Sign-off</h2>
        <AuditContactCard report={report} />
        <div className="signature-grid">
          <SignatureBlock title="Inspector" sig={inspSig} />
          <SignatureBlock title="Supervisor (Approval)" sig={supSig} />
          {empSig && <SignatureBlock title="Employer Representative" sig={empSig} auditContactName={report.auditContactName} />}
          {witSig && <SignatureBlock title="Witness" sig={witSig} />}
        </div>
      </section>

      <PageFooter report={report} />
    </>
  );
}
