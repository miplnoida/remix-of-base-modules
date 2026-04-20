/**
 * Prior Compliance Context block — rendered in the Internal report.
 * Shows: prior open violations, repeat-offence (same-type) violations,
 * active arrangements, and recent visits — so the report stands on its
 * own as a defensible enforcement document.
 */
import type { EmployerPriorContext } from '@/services/employerPriorContextService';
import { formatDateForDisplay } from '@/lib/format-config';
import { formatMoney } from './reportShared';

export function PriorContextSection({ ctx }: { ctx?: EmployerPriorContext | null }) {
  if (!ctx || !ctx.hasAnyContext) {
    return (
      <p className="muted">No prior compliance history on record for this employer.</p>
    );
  }

  return (
    <div className="prior-context">
      {ctx.priorSameTypeViolations.length > 0 && (
        <div className="pc-block">
          <div className="pc-title">Repeat-offence pattern (same violation type)</div>
          <table>
            <thead>
              <tr>
                <th style={{ width: 110 }}>Violation #</th>
                <th style={{ width: 90 }}>Status</th>
                <th>Summary</th>
                <th style={{ width: 90 }}>Created</th>
                <th style={{ width: 90 }} className="right">Total</th>
              </tr>
            </thead>
            <tbody>
              {ctx.priorSameTypeViolations.map((v) => (
                <tr key={v.id}>
                  <td><strong>{v.violationNumber ?? '—'}</strong></td>
                  <td>{v.status ?? '—'}</td>
                  <td>{v.summary ?? '—'}</td>
                  <td>{v.createdAt ? formatDateForDisplay(v.createdAt) : '—'}</td>
                  <td className="right">{formatMoney(v.totalAmount ?? undefined)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ctx.priorOpenViolations.length > 0 && (
        <div className="pc-block">
          <div className="pc-title">Other open violations</div>
          <table>
            <thead>
              <tr>
                <th style={{ width: 110 }}>Violation #</th>
                <th style={{ width: 110 }}>Type</th>
                <th style={{ width: 90 }}>Status</th>
                <th>Summary</th>
                <th style={{ width: 90 }} className="right">Total</th>
              </tr>
            </thead>
            <tbody>
              {ctx.priorOpenViolations.slice(0, 8).map((v) => (
                <tr key={v.id}>
                  <td><strong>{v.violationNumber ?? '—'}</strong></td>
                  <td>{v.violationType ?? '—'}</td>
                  <td>{v.status ?? '—'}</td>
                  <td>{v.summary ?? '—'}</td>
                  <td className="right">{formatMoney(v.totalAmount ?? undefined)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ctx.priorArrangements.length > 0 && (
        <div className="pc-block">
          <div className="pc-title">Prior / active payment arrangements</div>
          <table>
            <thead>
              <tr>
                <th style={{ width: 130 }}>Arrangement #</th>
                <th style={{ width: 90 }}>Status</th>
                <th style={{ width: 90 }} className="right">Debt</th>
                <th style={{ width: 90 }} className="right">Paid</th>
                <th style={{ width: 70 }} className="right">Missed</th>
                <th style={{ width: 90 }}>Next Due</th>
                <th style={{ width: 80 }}>Breach?</th>
              </tr>
            </thead>
            <tbody>
              {ctx.priorArrangements.map((a) => (
                <tr key={a.id}>
                  <td><strong>{a.arrangementNumber ?? '—'}</strong></td>
                  <td>{a.status ?? '—'}</td>
                  <td className="right">{formatMoney(a.totalDebt ?? undefined)}</td>
                  <td className="right">{formatMoney(a.totalPaid ?? undefined)}</td>
                  <td className="right">{a.missedPayments ?? 0}</td>
                  <td>{a.nextDueDate ? formatDateForDisplay(a.nextDueDate) : '—'}</td>
                  <td>{a.breachDetected ? 'YES' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ctx.priorVisits.length > 0 && (
        <div className="pc-block">
          <div className="pc-title">Recent inspection visits</div>
          <table>
            <thead>
              <tr>
                <th style={{ width: 130 }}>Inspection #</th>
                <th style={{ width: 100 }}>Status</th>
                <th style={{ width: 100 }}>Visit Date</th>
                <th>Inspector</th>
                <th style={{ width: 70 }} className="right">Findings</th>
                <th style={{ width: 70 }} className="right">Violations</th>
              </tr>
            </thead>
            <tbody>
              {ctx.priorVisits.map((v) => (
                <tr key={v.id}>
                  <td><strong>{v.inspectionNumber}</strong></td>
                  <td>{v.status}</td>
                  <td>{v.actualEnd ? formatDateForDisplay(v.actualEnd) : v.visitDate ? formatDateForDisplay(v.visitDate) : '—'}</td>
                  <td>{v.inspectorName ?? '—'}</td>
                  <td className="right">{v.findingsCount}</td>
                  <td className="right">{v.violationsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .prior-context .pc-block { margin: 10px 0 14px; }
        .prior-context .pc-title {
          font-weight: bold;
          font-size: 10pt;
          color: #1e40af;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      `}</style>
    </div>
  );
}
