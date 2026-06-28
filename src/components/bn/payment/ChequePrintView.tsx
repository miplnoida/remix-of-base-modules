/**
 * ChequePrintView — print-ready cheque layout (A4).
 * Opens a new browser window with the rendered HTML for printing.
 * Pure presentation, no business logic.
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import type { ChequeRegisterRow } from '@/services/bn/payment/chequePrintService';
import { formatNumber } from '@/lib/culture/culture';
import { useEnterpriseContext } from '@/hooks/enterprise/useEnterpriseContext';

interface Props {
  cheques: ChequeRegisterRow[];
  organisationName?: string;
  bankName?: string;
  currency?: string;
  onAfterPrint?: () => void;
}

const numberToWords = (n: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const chunk = (num: number): string => {
    if (num === 0) return '';
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + chunk(num % 100) : '');
  };
  if (!Number.isFinite(n)) return '';
  const whole = Math.floor(Math.abs(n));
  const cents = Math.round((Math.abs(n) - whole) * 100);
  const scales = ['', 'Thousand', 'Million', 'Billion'];
  let i = 0; let rest = whole; const parts: string[] = [];
  if (rest === 0) parts.push('Zero');
  while (rest > 0) {
    const c = rest % 1000;
    if (c) parts.unshift(chunk(c) + (scales[i] ? ' ' + scales[i] : ''));
    rest = Math.floor(rest / 1000); i++;
  }
  let str = parts.join(' ');
  if (cents) str += ` and ${cents}/100`;
  return str + ' Only';
};

const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

const renderCheque = (
  c: ChequeRegisterRow,
  org: string,
  bank: string,
  currency: string,
): string => {
  const amount = Number(c.amount || 0);
  const amountStr = formatNumber(amount, 2);
  const words = numberToWords(amount);
  const date = c.cheque_date ? new Date(c.cheque_date).toLocaleDateString('en-GB') : '';
  return `
  <div class="cheque">
    <div class="cheque-header">
      <div>
        <div class="bank">${esc(bank)}</div>
        <div class="org">${esc(org)}</div>
      </div>
      <div class="cheque-no">No. <strong>${esc(c.cheque_number)}</strong></div>
    </div>
    <div class="cheque-row">
      <div class="label">Pay</div>
      <div class="payee">${esc(c.payee_name || '')}</div>
      <div class="label">Date</div>
      <div class="date">${esc(date)}</div>
    </div>
    <div class="cheque-row">
      <div class="label">The sum of</div>
      <div class="words">${esc(words)}</div>
      <div class="amount-box">${esc(currency)} ${esc(amountStr)}</div>
    </div>
    <div class="cheque-footer">
      <div class="signature">Authorised Signature</div>
      <div class="micr">&#9416; ${esc(c.cheque_number)} &#9416; ${esc((c.batch_id || '').slice(0, 8))} &#9416;</div>
    </div>
  </div>`;
};

const buildHtml = (
  cheques: ChequeRegisterRow[],
  org: string,
  bank: string,
  currency: string,
): string => `<!doctype html>
<html><head><meta charset="utf-8"/><title>Cheque Print</title>
<style>
  @page { size: A4; margin: 12mm; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color:#111; margin:0; }
  .cheque {
    border: 1px solid #222; padding: 12px 16px; margin-bottom: 8mm;
    height: 88mm; box-sizing: border-box; position: relative;
    background: linear-gradient(135deg,#fff 0%, #f7f9fc 100%);
    page-break-inside: avoid;
  }
  .cheque-header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px dashed #999; padding-bottom:6px; }
  .bank { font-weight:700; font-size:14pt; }
  .org { font-size:9pt; color:#555; }
  .cheque-no { font-size:10pt; }
  .cheque-row { display:grid; grid-template-columns: 70px 1fr 70px 1fr; gap:8px; margin-top:14px; align-items:center; }
  .label { font-size:9pt; color:#666; }
  .payee, .date, .words { border-bottom:1px dotted #333; padding:4px 6px; font-size:11pt; min-height:18pt; }
  .words { grid-column: span 2; font-style:italic; }
  .amount-box { border:1.5px solid #222; padding:6px 10px; font-weight:700; text-align:right; font-size:12pt; }
  .cheque-footer { position:absolute; bottom:10px; left:16px; right:16px; display:flex; justify-content:space-between; align-items:flex-end; }
  .signature { border-top:1px solid #444; padding-top:4px; font-size:9pt; min-width:50mm; text-align:center; }
  .micr { font-family: 'OCR-B', 'Courier New', monospace; font-size:11pt; letter-spacing:2px; }
  @media print { .no-print { display:none; } }
</style></head>
<body>
  <div class="no-print" style="padding:8px; background:#f3f4f6; display:flex; justify-content:space-between;">
    <span>${cheques.length} cheque(s) ready to print</span>
    <button onclick="window.print()">Print</button>
  </div>
  ${cheques.map((c) => renderCheque(c, org, bank, currency)).join('')}
</body></html>`;

export const ChequePrintView: React.FC<Props> = ({
  cheques, organisationName, bankName = 'Bank', currency = 'XCD', onAfterPrint,
}) => {
  const { data: ctx } = useEnterpriseContext({ moduleCode: 'BENEFITS' });
  const resolvedOrg = organisationName ?? ctx?.organization?.name ?? 'Social Security Board';
  const printable = cheques.filter(
    (c) => c.status === 'ASSIGNED' || c.status === 'PRINTED' || c.status === 'REPRINTED',
  );
  const handlePrint = () => {
    const html = buildHtml(printable, resolvedOrg, bankName, currency);
    const w = window.open('', '_blank', 'width=900,height=1100');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 300);
    onAfterPrint?.();
  };
  return (
    <Button size="sm" variant="outline" disabled={!printable.length} onClick={handlePrint}>
      <Printer className="h-3.5 w-3.5 mr-1.5" />
      Print Cheques ({printable.length})
    </Button>
  );
};
