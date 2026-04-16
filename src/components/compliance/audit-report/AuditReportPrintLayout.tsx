/**
 * Print-friendly Audit Report Layout
 *
 * Single source of truth for both:
 *  - On-screen preview at /print/:reportId
 *  - Browser native print (window.print())
 *  - jsPDF html() rendering for stored finalized PDF
 *
 * Uses scoped CSS + @media print rules so the layout looks identical
 * on screen and on paper.
 */
import type { FullAuditReport, AuditReportSignature } from '@/types/auditReport';
import type { InspectionFinding, InspectionEvidence } from '@/types/inspectionTypes';
import { formatDateForDisplay } from '@/lib/format-config';

export interface ReportLayoutProps {
  report: FullAuditReport;
  findings: InspectionFinding[];
  evidence: InspectionEvidence[];
  checklist: any[];
  signatures: AuditReportSignature[];
  variant: 'INTERNAL' | 'EMPLOYER';
}

const sevColor: Record<string, string> = {
  Low: '#16a34a',
  Medium: '#ca8a04',
  High: '#ea580c',
  Critical: '#dc2626',
};

export function AuditReportPrintLayout({
  report,
  findings,
  evidence,
  checklist,
  signatures,
  variant,
}: ReportLayoutProps) {
  const isEmployer = variant === 'EMPLOYER';
  const reportTitle = isEmployer ? 'Employer Audit Acknowledgment Report' : 'Internal Audit Report';
  const checklistAnswered = checklist.filter((c: any) => c.response).length;
  const findingsBySeverity = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1;
    return acc;
  }, {});
  const empSig = signatures.find((s) => s.signerRole === 'EMPLOYER_REP');
  const inspSig = signatures.find((s) => s.signerRole === 'INSPECTOR');
  const witSig = signatures.find((s) => s.signerRole === 'WITNESS');
  const supSig = signatures.find((s) => s.signerRole === 'SUPERVISOR');

  const isDraft = report.status !== 'FINAL';

  return (
    <div className={`audit-report-print ${isDraft ? 'is-draft' : ''}`}>
      <style>{printStyles}</style>

      {/* ── COVER PAGE ── */}
      <section className="cover-page">
        <div className="brand-bar">SOCIAL SECURITY BOARD</div>
        <div className="cover-inner">
          <div className="confidential-stamp">
            {isEmployer ? 'EMPLOYER COPY' : 'CONFIDENTIAL — INTERNAL'}
          </div>
          <h1 className="cover-title">{reportTitle}</h1>
          <div className="cover-subtitle">Compliance Field Audit Engagement</div>

          {/* Prominent employer identity panel */}
          <div className="employer-identity-panel">
            <div className="employer-identity-name">{report.employerName ?? '—'}</div>
            <div className="employer-identity-meta">
              <span><strong>Reg No:</strong> {report.employerRegNumber ?? report.employerId ?? '—'}</span>
              <span><strong>Audit Date:</strong> {report.auditDate ? formatDateForDisplay(report.auditDate) : formatDateForDisplay(report.reportDate)}</span>
              <span><strong>Report No:</strong> {report.reportNumber}</span>
            </div>
          </div>

          <div className="cover-meta">
            <Row label="Report Number" value={report.reportNumber} />
            <Row label="Employer" value={report.employerName ?? '—'} />
            <Row label="Registration No." value={report.employerRegNumber ?? report.employerId ?? '—'} />
            <Row label="Audit Date" value={report.auditDate ? formatDateForDisplay(report.auditDate) : formatDateForDisplay(report.reportDate)} />
            <Row label="Location" value={report.auditLocation ?? '—'} />
            <Row label="Inspector" value={report.inspectorName ?? '—'} />
            <Row label="Status" value={report.status} />
            {report.verificationRef && <Row label="Verification Ref" value={report.verificationRef} />}
          </div>
        </div>
      </section>

      {/* DRAFT watermark — fixed-positioned, repeats on every printed page */}
      {isDraft && <div className="draft-watermark-fixed" aria-hidden="true">DRAFT</div>}

      <div className="page-break" />

      {/* ── BODY ── */}
      <header className="page-header">
        <div><strong>{report.reportNumber}</strong></div>
        <div><strong>{report.employerName ?? '—'}</strong>{report.employerRegNumber ? ` • ${report.employerRegNumber}` : ''}</div>
        <div>{isEmployer ? 'EMPLOYER COPY' : 'CONFIDENTIAL'}</div>
      </header>

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
              <th>Total Findings</th>
              <td>{findings.length}</td>
              <th>Evidence Items</th>
              <td>{evidence.length}</td>
            </tr>
            <tr>
              <th>Checklist Completion</th>
              <td>{report.checklistCompletionPct}% ({checklistAnswered}/{checklist.length})</td>
              <th>Violations Opened</th>
              <td>{report.totalViolations}</td>
            </tr>
            <tr>
              <th colSpan={4} className="severity-row-header">Findings by Severity</th>
            </tr>
            <tr>
              <td colSpan={4}>
                {(['Critical', 'High', 'Medium', 'Low'] as const).map((s) => (
                  <span key={s} className="sev-pill" style={{ background: sevColor[s] }}>
                    {s}: {findingsBySeverity[s] ?? 0}
                  </span>
                ))}
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="5. Detailed Findings">
        {findings.length === 0 ? (
          <p className="muted">No findings were recorded for this audit.</p>
        ) : (
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
                      <div className="finding-rec">
                        <strong>Recommended Action:</strong> {f.recommendedAction}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="sev-pill" style={{ background: sevColor[f.severity] ?? '#666' }}>
                      {f.severity}
                    </span>
                  </td>
                  <td>{f.category || '—'}</td>
                  <td className="center">{f.evidenceIds?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {!isEmployer && evidence.length > 0 && (
        <Section title="6. Evidence Register (Internal)">
          <table className="evidence-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th>File</th>
                <th style={{ width: 100 }}>Type</th>
                <th style={{ width: 130 }}>Captured</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      <Section title={isEmployer ? '6. Required Actions' : '7. Recommendations'}>
        <p>{report.recommendations || 'No recommendations issued.'}</p>
      </Section>

      <Section title={isEmployer ? '7. Compliance Conclusion' : '8. Conclusions'}>
        <p>{report.complianceConclusion || report.conclusions || 'No conclusion recorded.'}</p>
      </Section>

      {/* ── SAMPLING DISCLAIMER ── */}
      <section className="report-section sampling-disclaimer">
        <h2 className="section-title">{isEmployer ? '7a. Audit Scope Disclaimer' : '8a. Audit Scope Disclaimer'}</h2>
        <div className="disclaimer-box">
          <p>
            <strong>Sampling Notice:</strong> This audit was conducted based on selected
            samples, records reviewed, and procedures performed during the stated audit
            period. The findings, observations, and conclusions expressed in this report
            are based solely on the sample examined and the information made available
            to the auditor at the time of the visit. They should not be interpreted as
            a complete or exhaustive review of all records, transactions, or compliance
            activities of the employer.
          </p>
          <p>
            The Social Security Board reserves the right to conduct further reviews,
            request additional records, or initiate enforcement action should subsequent
            information indicate non-compliance beyond the scope of this audit.
          </p>
        </div>
      </section>

      {/* ── AUDIT CONTACT vs SIGNATORY identity block ── */}
      <section className="signature-block">
        <h2 className="section-title">{isEmployer ? '8. Acknowledgment & Signatures' : '9. Sign-off'}</h2>

        {/* Audit Contact recorded during audit */}
        {report.auditContactName && (
          <div className="audit-contact-card">
            <div className="audit-contact-label">Audit Contact (recorded during audit visit)</div>
            <div className="audit-contact-name">{report.auditContactName}</div>
            {report.auditContactDesignation && <div className="audit-contact-meta">{report.auditContactDesignation}</div>}
            {report.auditContactRelationship && <div className="audit-contact-meta">Relationship: {report.auditContactRelationship}</div>}
            <div className="audit-contact-meta">
              Present during audit: <strong>{report.auditContactPresent === false ? 'No' : 'Yes'}</strong>
            </div>
          </div>
        )}

        {isEmployer && (
          <p className="ack-statement">
            I, the undersigned representative of <strong>{report.employerName ?? 'the employer'}</strong>,
            acknowledge that I have received and reviewed the contents of this audit report. My signature
            below indicates receipt of the report and does not constitute agreement with all findings unless
            explicitly stated in the comments section.
          </p>
        )}

        <div className="signature-grid">
          {/* Employer Rep is always shown — acknowledgment is the legal point of the report. */}
          <SignatureBlock
            title="Employer Representative — Signatory"
            sig={empSig}
            auditContactName={report.auditContactName}
          />
          {/* Inspector / Supervisor / Witness blocks render ONLY when actually captured.
              Inspector signature appears when the logged-in inspector signs;
              Supervisor signature appears only after an approval has been performed. */}
          {inspSig && <SignatureBlock title="Inspector" sig={inspSig} />}
          {supSig && <SignatureBlock title="Supervisor (Approval)" sig={supSig} />}
          {witSig && <SignatureBlock title="Witness" sig={witSig} />}
        </div>
      </section>

      <footer className="page-footer">
        <div>Report ID: {report.reportNumber}</div>
        <div>Generated: {new Date().toLocaleString()}</div>
        <div>Verification: {report.verificationRef ?? 'PENDING-FINALIZATION'}</div>
      </footer>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="cover-row">
      <span className="cover-row-label">{label}</span>
      <span className="cover-row-value">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="report-section">
      <h2 className="section-title">{title}</h2>
      <div className="section-body">{children}</div>
    </section>
  );
}

function SignatureBlock({ title, sig, auditContactName }: { title: string; sig?: AuditReportSignature; auditContactName?: string }) {
  if (!sig) {
    return (
      <div className="sig-block">
        <div className="sig-label">{title}</div>
        <div className="sig-line" />
        <div className="sig-name muted">Pending</div>
        <div className="sig-meta">Name: ____________________</div>
        <div className="sig-meta">Designation: ____________________</div>
        <div className="sig-meta">Date: ____________________</div>
      </div>
    );
  }

  const isRefused = sig.signatureType === 'REFUSED' || sig.signatureType === 'UNAVAILABLE';
  const showIdentityChip = auditContactName !== undefined;
  const sameAsContact = sig.signerSameAsContact === true;

  return (
    <div className="sig-block">
      <div className="sig-label">{title}</div>

      {isRefused ? (
        <div className="sig-refused">
          <div className="refused-stamp">{sig.signatureType === 'REFUSED' ? 'REFUSED TO SIGN' : 'UNAVAILABLE'}</div>
          {sig.refusalReason && <div className="muted small">Reason: {sig.refusalReason}</div>}
        </div>
      ) : sig.signatureImageUrl ? (
        <img src={sig.signatureImageUrl} alt="signature" className="sig-image" />
      ) : sig.typedName ? (
        <div className="sig-typed">/s/ {sig.typedName}</div>
      ) : (
        <div className="sig-line" />
      )}

      <div className="sig-name">{sig.signerName}</div>
      {sig.signerDesignation && <div className="sig-meta">{sig.signerDesignation}</div>}

      {showIdentityChip && !isRefused && (
        <div className="sig-identity-chip" data-same={sameAsContact ? 'true' : 'false'}>
          {sameAsContact ? '✓ Same as audit contact' : '⚠ Different from audit contact'}
        </div>
      )}
      {sig.signerRelationship && <div className="sig-meta">Authority: {sig.signerRelationship}</div>}
      {sig.signerAuthorityNote && <div className="sig-meta italic">"{sig.signerAuthorityNote}"</div>}

      {sig.signedAt && <div className="sig-meta">Signed: {formatDateForDisplay(sig.signedAt)}</div>}
      {sig.signatureType === 'ELECTRONIC' && <div className="sig-meta small muted">Electronic signature</div>}
      {sig.signatureType === 'TYPED_ATTESTATION' && <div className="sig-meta small muted">Typed attestation</div>}
      {sig.comments && <div className="sig-meta italic">"{sig.comments}"</div>}

      {sig.witnessName && (
        <div className="witness-block">
          <div className="witness-label">Witness</div>
          {sig.witnessSignatureImageUrl && <img src={sig.witnessSignatureImageUrl} alt="witness signature" className="witness-image" />}
          <div className="sig-meta"><strong>{sig.witnessName}</strong></div>
          {sig.witnessDesignation && <div className="sig-meta">{sig.witnessDesignation}</div>}
        </div>
      )}
    </div>
  );
}

const printStyles = `
.audit-report-print {
  font-family: Arial, Helvetica, sans-serif;
  color: #111;
  font-size: 11pt;
  line-height: 1.5;
  background: white;
  max-width: 8.5in;
  margin: 0 auto;
  padding: 0.5in;
  box-sizing: border-box;
}
.audit-report-print .cover-page {
  min-height: 9in;
  display: flex;
  flex-direction: column;
  position: relative;
}
.audit-report-print .brand-bar {
  background: #0E5F3A;
  color: white;
  padding: 14px;
  text-align: center;
  font-weight: bold;
  letter-spacing: 3px;
  font-size: 12pt;
}
.audit-report-print .cover-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 60px 20px;
  position: relative;
}
.audit-report-print .confidential-stamp {
  border: 2px solid #dc2626;
  color: #dc2626;
  padding: 4px 16px;
  font-weight: bold;
  letter-spacing: 2px;
  margin-bottom: 32px;
}
.audit-report-print .cover-title {
  font-size: 28pt;
  font-weight: bold;
  margin: 0 0 8px;
  color: #0E5F3A;
}
.audit-report-print .cover-subtitle {
  font-size: 12pt;
  color: #555;
  margin-bottom: 48px;
}
.audit-report-print .cover-meta {
  width: 100%;
  max-width: 5in;
  border-top: 2px solid #0E5F3A;
  padding-top: 24px;
}
.audit-report-print .cover-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px dotted #ccc;
}
.audit-report-print .cover-row-label {
  font-weight: bold;
  color: #555;
}
.audit-report-print .cover-row-value {
  text-align: right;
}
.audit-report-print .draft-watermark-fixed {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-30deg);
  font-size: 140pt;
  color: rgba(220, 38, 38, 0.10);
  font-weight: 900;
  letter-spacing: 12px;
  pointer-events: none;
  z-index: 9999;
  user-select: none;
}
.audit-report-print .employer-identity-panel {
  width: 100%;
  max-width: 6in;
  margin: 0 auto 32px;
  padding: 18px 24px;
  border: 2px solid #0E5F3A;
  background: #f0f8f4;
  border-radius: 4px;
  text-align: center;
}
.audit-report-print .employer-identity-name {
  font-size: 20pt;
  font-weight: bold;
  color: #0E5F3A;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}
.audit-report-print .employer-identity-meta {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 10pt;
  color: #333;
}
.audit-report-print .employer-identity-meta span {
  white-space: nowrap;
}
.audit-report-print .sampling-disclaimer .disclaimer-box {
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-left: 4px solid #d97706;
  padding: 12px 16px;
  font-size: 10pt;
  color: #1f2937;
  border-radius: 3px;
}
.audit-report-print .sampling-disclaimer .disclaimer-box p {
  margin: 6px 0;
}
.audit-report-print .page-break {
  page-break-after: always;
  height: 0;
}
.audit-report-print .page-header {
  display: flex;
  justify-content: space-between;
  font-size: 9pt;
  color: #333;
  border-bottom: 2px solid #0E5F3A;
  padding-bottom: 6px;
  margin-bottom: 16px;
}
.audit-report-print .report-section {
  margin: 18px 0;
  page-break-inside: avoid;
}
.audit-report-print .section-title {
  font-size: 13pt;
  font-weight: bold;
  color: #0E5F3A;
  border-bottom: 1px solid #0E5F3A;
  padding-bottom: 3px;
  margin: 0 0 10px;
}
.audit-report-print .section-body p {
  margin: 6px 0;
  white-space: pre-wrap;
}
.audit-report-print table {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;
  font-size: 10pt;
}
.audit-report-print table th, .audit-report-print table td {
  border: 1px solid #c0c0c0;
  padding: 6px 8px;
  text-align: left;
  vertical-align: top;
}
.audit-report-print table th {
  background: #f0f8f4;
  font-weight: bold;
  color: #0E5F3A;
}
.audit-report-print .summary-table th {
  width: 25%;
}
.audit-report-print .severity-row-header {
  text-align: center;
  background: #0E5F3A !important;
  color: white !important;
}
.audit-report-print .sev-pill {
  display: inline-block;
  padding: 2px 8px;
  margin: 2px;
  color: white;
  border-radius: 3px;
  font-size: 9pt;
  font-weight: bold;
}
.audit-report-print .findings-table .finding-row {
  page-break-inside: avoid;
}
.audit-report-print .finding-title {
  font-weight: bold;
  margin-bottom: 4px;
}
.audit-report-print .finding-desc {
  margin-bottom: 4px;
}
.audit-report-print .finding-rec {
  background: #f0f8f4;
  padding: 4px 6px;
  border-left: 3px solid #0E5F3A;
  font-size: 9pt;
  margin-top: 4px;
}
.audit-report-print .center { text-align: center; }
.audit-report-print .muted { color: #777; }
.audit-report-print .small { font-size: 9pt; }
.audit-report-print .italic { font-style: italic; }
.audit-report-print .signature-block {
  margin-top: 40px;
  page-break-inside: avoid;
  border-top: 2px solid #0E5F3A;
  padding-top: 20px;
}
.audit-report-print .ack-statement {
  background: #f9fafb;
  border-left: 4px solid #0E5F3A;
  padding: 10px 14px;
  font-size: 10pt;
  margin-bottom: 20px;
}
.audit-report-print .signature-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px 40px;
  margin-top: 16px;
}
.audit-report-print .sig-block {
  page-break-inside: avoid;
  min-height: 130px;
}
.audit-report-print .sig-label {
  font-weight: bold;
  color: #0E5F3A;
  font-size: 10pt;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.audit-report-print .sig-line {
  border-bottom: 1px solid #333;
  height: 60px;
  margin-bottom: 4px;
}
.audit-report-print .sig-image {
  max-height: 60px;
  max-width: 100%;
  margin-bottom: 4px;
  border-bottom: 1px solid #333;
}
.audit-report-print .sig-typed {
  font-style: italic;
  font-family: 'Brush Script MT', cursive;
  font-size: 18pt;
  color: #1e40af;
  border-bottom: 1px solid #333;
  padding: 8px 0;
  margin-bottom: 4px;
  min-height: 60px;
}
.audit-report-print .sig-name {
  font-weight: bold;
  font-size: 10pt;
}
.audit-report-print .sig-meta {
  font-size: 9pt;
  color: #555;
  margin-top: 2px;
}
.audit-report-print .sig-refused {
  border: 2px dashed #dc2626;
  padding: 12px;
  text-align: center;
  margin-bottom: 8px;
  min-height: 60px;
}
.audit-report-print .refused-stamp {
  color: #dc2626;
  font-weight: bold;
  letter-spacing: 1px;
  font-size: 11pt;
}
.audit-report-print .page-footer {
  margin-top: 30px;
  padding-top: 8px;
  border-top: 1px solid #ccc;
  display: flex;
  justify-content: space-between;
  font-size: 9pt;
  color: #666;
}

.audit-report-print .audit-contact-card {
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  border-left: 4px solid #0E5F3A;
  padding: 10px 14px;
  margin-bottom: 16px;
  border-radius: 3px;
}
.audit-report-print .audit-contact-label {
  font-size: 8pt;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #64748b;
  font-weight: bold;
  margin-bottom: 4px;
}
.audit-report-print .audit-contact-name {
  font-weight: bold;
  font-size: 11pt;
}
.audit-report-print .audit-contact-meta {
  font-size: 9pt;
  color: #475569;
}
.audit-report-print .sig-identity-chip {
  display: inline-block;
  font-size: 8pt;
  padding: 1px 6px;
  border-radius: 3px;
  margin-top: 2px;
  font-weight: bold;
}
.audit-report-print .sig-identity-chip[data-same="true"] {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
}
.audit-report-print .sig-identity-chip[data-same="false"] {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fcd34d;
}
.audit-report-print .witness-block {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px dashed #cbd5e1;
}
.audit-report-print .witness-label {
  font-size: 8pt;
  text-transform: uppercase;
  color: #64748b;
  font-weight: bold;
  margin-bottom: 2px;
}
.audit-report-print .witness-image {
  max-height: 35px;
  border-bottom: 1px solid #333;
  margin-bottom: 2px;
}
  @page {
    size: letter;
    margin: 0.5in;
  }
  body {
    margin: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .no-print { display: none !important; }
  .audit-report-print {
    padding: 0;
    max-width: none;
  }
  .audit-report-print .page-header,
  .audit-report-print .page-footer {
    position: running(header);
  }
}
`;
