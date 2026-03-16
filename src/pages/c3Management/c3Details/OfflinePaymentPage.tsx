import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Home, ChevronDown, ChevronUp, Search, Printer, Download, DollarSign, ArrowLeft, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import ssbLogo from '@/assets/stkitts-logo.png';
import {
  getOfflinePaymentPage,
  getContributionPreview,
  getNwdContributionPreview,
  getSeContributionPreview,
  searchBimaReceipt,
  applyOfflinePayment,
  type OfflinePaymentPageData,
  type BimaPayment,
  type OfflinePaymentReceipt,
} from '@/services/wizC3DetailsService';

// ─── Helpers ──────────────────────────────────────────
function fmt(val: number | null | undefined) {
  return `$${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(dateStr: string | null | undefined) {
  if (!dateStr) return '';
  try { return format(parseISO(dateStr), 'dd-MMM-yyyy'); } catch { return dateStr; }
}

// ─── Inline Report Components (reuse preview content) ─
const EmployerReport: React.FC<{ data: any; printRef: React.RefObject<HTMLDivElement | null> }> = ({ data, printRef }) => {
  if (!data) return null;
  const companyName = data.companyName || '';
  const tradeName = data.tradeName || '';
  const regNo = data.registrationNumber || '';
  const address = data.address || '';
  const periodLabel = data.periodLabel || '';
  const employees = data.employees || [];
  const totals = data.totals || {};
  const ag = data.accountantGeneral || {};
  const ssb = data.socialSecurityBoard || {};
  const creationDate = data.creationDate || '';

  return (
    <div ref={printRef} className="bg-white p-4 text-xs">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h2 className="text-center font-bold text-sm">THE ST.CHRISTOPHER AND NEVIS - SOCIAL SECURITY BOARD</h2>
          <h3 className="text-center font-bold text-xs">STATEMENT OF WAGES AND CONTRIBUTIONS</h3>
          <p className="text-center text-[10px] text-muted-foreground">Social Security Act, 1977, Housing and Social Development Levy Act, 1997, and the Protection of Employment Act, 1986</p>
        </div>
        <img src={ssbLogo} alt="SSB Logo" className="h-12 w-12 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      </div>
      <p className="text-xs mb-1"><strong>NB.</strong> To be used when reporting payments related to <strong>Employees.</strong></p>
      <p className="text-red-600 text-xs mb-3">(This form is in quadruplicate. Please read these notes carefully.)</p>
      <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
        <div><strong>Name of Employer</strong> <span className="border-b border-black ml-1">{companyName}</span></div>
        <div><strong>Trade Name</strong> <span className="border-b border-black ml-1">{tradeName}</span></div>
        <div><strong>Employer's Registration No.</strong> <span className="border border-black px-2">{regNo}</span></div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
        <div><strong>Address (Location & Box No. If address changed)</strong> <span className="border-b border-black ml-1">{address}</span></div>
        <div className="text-right"><strong>Employee(s)</strong> <span className="border border-black px-2">{data.employeeCount || employees.length}</span></div>
      </div>
      <p className="text-xs mb-1"><strong>To: Director of Social Security,</strong><br />&nbsp;&nbsp;&nbsp;&nbsp;With this statement is a cheque and/or cash in respect of the Acts mentioned above for the month of: <span className="border-b border-black px-4 font-semibold">{periodLabel}</span></p>
      <div className="flex gap-8 mb-2 text-xs">
        <div>(1) Director, Social Security Board <span className="border-b border-black px-4 font-semibold">{fmt(ag.socialSecurity)}</span></div>
        <div>(2) Accountant General <span className="border-b border-black px-4 font-semibold">{fmt((ssb.levy || 0) + (ssb.severance || 0))}</span></div>
        <div className="ml-auto">Total <span className="border-b border-black px-4 font-semibold">{fmt(totals.grandTotal)}</span></div>
      </div>
      <table className="w-full border-collapse border border-black text-[9px] mt-2">
        <thead>
          <tr>
            <th className="border border-black p-1">(1)</th>
            <th className="border border-black p-1">(2)<br/>SSN</th>
            <th className="border border-black p-1">(3)<br/>Name</th>
            <th className="border border-black p-1" colSpan={5}>(5a) Weeks Worked</th>
            <th className="border border-black p-1" colSpan={7}>(6) Wages</th>
            <th className="border border-black p-1">(7) Total</th>
            <th className="border border-black p-1">(8) Levy</th>
            <th className="border border-black p-1">(9) SS</th>
            <th className="border border-black p-1">(10)</th>
          </tr>
          <tr>
            <th className="border border-black p-1"></th><th className="border border-black p-1"></th><th className="border border-black p-1"></th>
            {['1','2','3','4','5'].map(w => <th key={w} className="border border-black p-1">{w}</th>)}
            {['WK1','WK2','WK3','WK4','WK5','HPay','Bonus'].map(w => <th key={w} className="border border-black p-1">{w}</th>)}
            <th className="border border-black p-1"></th><th className="border border-black p-1"></th><th className="border border-black p-1"></th><th className="border border-black p-1"></th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp: any, idx: number) => (
            <tr key={idx}>
              <td className="border border-black p-1 text-center">{idx + 1}</td>
              <td className="border border-black p-1">{emp.ssn}</td>
              <td className="border border-black p-1">{emp.name}</td>
              {[emp.week1, emp.week2, emp.week3, emp.week4, emp.week5].map((w: number, i: number) => (
                <td key={i} className="border border-black p-1 text-center">{w > 0 ? 'x' : ''}</td>
              ))}
              {[emp.week1, emp.week2, emp.week3, emp.week4, emp.week5, emp.holidayPay, emp.bonus].map((w: number, i: number) => (
                <td key={`w${i}`} className="border border-black p-1 text-right">{fmt(w)}</td>
              ))}
              <td className="border border-black p-1 text-right">{fmt(emp.totalWages)}</td>
              <td className="border border-black p-1 text-right">{fmt((emp.levyEmployee || 0) + (emp.levyEmployer || 0))}</td>
              <td className="border border-black p-1 text-right">{fmt(emp.ssTotal)}</td>
              <td className="border border-black p-1"></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 text-xs space-y-0.5">
        <div className="flex justify-between"><span>a) Total wages and employee levy contribution</span><span>{fmt(totals.totalWages)}</span></div>
        <div className="flex justify-between"><span>b) Employer's 3% of Wages for levy Contribution</span><span>{fmt(totals.levyEmployer)}</span></div>
        <div className="flex justify-between"><span>c) Employer's 1% of Wages for Severance Payments Contribution</span><span>{fmt(totals.peTotal)}</span></div>
        <div className="flex justify-between"><span>d) Levy Penalty for the month (if any)</span><span>{fmt(totals.levyPenalty)}</span></div>
        <div className="flex justify-between"><span>e) Severance Penalty for month (if any)</span><span>{fmt(totals.pePenalty)}</span></div>
        <div className="flex justify-between font-semibold"><span>f) Total Accountant General</span><span>{fmt((ssb.levy || 0) + (ssb.severance || 0))}</span></div>
        <div className="flex justify-between"><span>g) Social Security Contribution due for the month</span><span>{fmt(totals.ssTotal)}</span></div>
        <div className="flex justify-between"><span>h) Fines due for the month (if any)</span><span>{fmt(totals.ssPenalty)}</span></div>
        <div className="flex justify-between font-semibold"><span>i) Total Social Security Remittance due for the month</span><span>{fmt((totals.ssTotal || 0) + (totals.ssPenalty || 0))}</span></div>
      </div>
      <p className="text-xs mt-4">I/We hereby certify that the particulars stated above are true and correct to the best of my/our knowledge and belief</p>
      <div className="flex justify-between mt-6">
        <div className="text-center"><div className="border-b border-black w-48 mb-1" /><span>Signature of Employer or Agent</span><br /><span>(Please affix office stamp)</span></div>
        <div className="text-center"><span>Date: <span className="border-b border-black px-6">{creationDate}</span></span></div>
      </div>
    </div>
  );
};

const NwdReport: React.FC<{ data: any; printRef: React.RefObject<HTMLDivElement | null> }> = ({ data, printRef }) => {
  if (!data) return null;
  const companyName = data.companyName || '';
  const tradeName = data.tradeName || '';
  const regNo = data.registrationNumber || '';
  const address = data.address || '';
  const periodLabel = data.periodLabel || '';
  const directors = data.directors || [];
  const totals = data.totals || {};

  return (
    <div ref={printRef} className="bg-white p-4 text-xs">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h2 className="text-center font-bold text-sm">THE ST.CHRISTOPHER AND NEVIS - SOCIAL SECURITY BOARD</h2>
          <h3 className="text-center font-bold text-xs">STATEMENT OF WAGES AND CONTRIBUTIONS</h3>
          <p className="text-center text-[10px] text-muted-foreground">Social Security Act, 1977, Housing and Social Development Levy Act, 1997, and the Protection of Employment Act, 1986</p>
        </div>
        <img src={ssbLogo} alt="SSB Logo" className="h-12 w-12 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      </div>
      <p className="text-xs mb-1"><strong>NB.</strong> To be used when reporting payments related to <strong>Non-Working Directors.</strong></p>
      <p className="text-red-600 text-xs mb-3">(This form is in quadruplicate. Please read these notes carefully.)</p>
      <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
        <div><strong>Name of Employer</strong> <span className="border-b border-black ml-1">{companyName}</span></div>
        <div><strong>Trade Name</strong> <span className="border-b border-black ml-1">{tradeName}</span></div>
        <div><strong>Employer's Registration No.</strong> <span className="border border-black px-2">{regNo}</span></div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
        <div><strong>Address (Location & Box No. If address changed)</strong> <span className="border-b border-black ml-1">{address}</span></div>
        <div className="text-right"><strong>Director(s)</strong> <span className="border border-black px-2">{data.directorCount || directors.length}</span></div>
      </div>
      <p className="text-xs mb-2"><strong>To: Director of Social Security,</strong><br />&nbsp;&nbsp;&nbsp;&nbsp;With this statement is a cheque and/or cash in respect of the Acts mentioned above for the month of: <span className="border-b border-black px-4 font-semibold">{periodLabel}</span></p>
      <div className="mb-2 text-xs">(1) Accountant General: <span className="border-b border-black px-4 font-semibold">{fmt(totals.grandTotal)}</span></div>
      <table className="w-full border-collapse border border-black text-[9px] mt-2">
        <thead>
          <tr>
            <th className="border border-black p-1">(1)</th>
            <th className="border border-black p-1">(2) SSN</th>
            <th className="border border-black p-1">(3) Name</th>
            {['WK1','WK2','WK3','WK4','WK5'].map(w => <th key={w} className="border border-black p-1">{w}</th>)}
            <th className="border border-black p-1">(5) Total Wages</th>
            <th className="border border-black p-1">(6) Levy EE</th>
            <th className="border border-black p-1">(6) Levy ER</th>
            <th className="border border-black p-1">(7) Remarks</th>
          </tr>
        </thead>
        <tbody>
          {directors.map((d: any, idx: number) => (
            <tr key={idx}>
              <td className="border border-black p-1 text-center">{idx + 1}</td>
              <td className="border border-black p-1">{d.ssn}</td>
              <td className="border border-black p-1">{d.name}</td>
              {[d.week1, d.week2, d.week3, d.week4, d.week5].map((w: number, i: number) => (
                <td key={i} className="border border-black p-1 text-right">{fmt(w)}</td>
              ))}
              <td className="border border-black p-1 text-right">{fmt(d.totalWages)}</td>
              <td className="border border-black p-1 text-right">{fmt(d.levyEmployee)}</td>
              <td className="border border-black p-1 text-right">{fmt(d.levyEmployer)}</td>
              <td className="border border-black p-1"></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 text-xs space-y-0.5">
        <div className="flex justify-between"><span>a) Total Fees and Directors levy Contribution</span><span>{fmt(totals.levyTotal)}</span></div>
        <div className="flex justify-between"><span>b) Levy Penalty for the month (if any)</span><span>{fmt(totals.levyPenalty)}</span></div>
        <div className="flex justify-between font-semibold"><span>c) Total Accountant General</span><span>{fmt(totals.grandTotal)}</span></div>
      </div>
      <div className="mt-3 text-right text-[9px] text-muted-foreground"><div>FOR OFFICIAL USE ONLY</div><div>I- DATE RECEIVED</div><div>II- PAID © No</div></div>
      <p className="text-xs mt-4">I/We hereby certify that the particulars stated above are true and correct to the best of my/our knowledge and belief</p>
      <div className="flex justify-between mt-6">
        <div className="text-center"><div className="border-b border-black w-48 mb-1" /><span>Signature of Employer or Agent</span><br /><span>(Please affix office stamp)</span></div>
        <div className="text-center"><span>Date: <span className="border-b border-black px-6"></span></span></div>
      </div>
    </div>
  );
};

const SeReport: React.FC<{ data: any; printRef: React.RefObject<HTMLDivElement | null> }> = ({ data, printRef }) => {
  if (!data) return null;
  const name = data.name || '';
  const ssn = data.socialSecurityNumber || '';
  const address = data.address || '';
  const occupation = data.occupation || '';
  const periodLabel = data.periodLabel || '';
  const declaredIncome = data.declaredIncome || 0;
  const ssContribution = data.socialSecurityContribution || 0;
  const levyContribution = data.levyContribution || 0;
  const fineAmount = data.fineAmount || 0;
  const penaltyAmount = data.penaltyAmount || 0;
  const totalContribution = data.totalContribution || 0;
  const wageCategory = data.wageCategory || {};

  return (
    <div ref={printRef} className="bg-white p-6 text-sm">
      <h3 className="text-center text-xs text-muted-foreground mb-1">Self Employed C3 Report</h3>
      <h2 className="text-center font-bold text-base mb-0.5">SOCIAL SECURITY BOARD</h2>
      <h3 className="text-center font-semibold text-xs mb-3">SELF EMPLOYED PERSON CONTRIBUTION REMITTANCE FORM</h3>
      <p className="text-sm mb-3"><strong className="text-base">For</strong> <span className="border-b border-black px-2">{periodLabel}</span></p>
      <div className="space-y-1.5 text-sm mb-4">
        <div><strong>Name of Self Employed:</strong> <span>{name}</span></div>
        <div><strong>Social Security Number:</strong> <span>{ssn}</span></div>
        <div><strong>Address:</strong> <span>{address}</span></div>
        <div><strong>Occupation:</strong> <span>{occupation}</span></div>
        {wageCategory.name && (
          <div><strong>Income Category:</strong> <span>{wageCategory.name} ({fmt(wageCategory.minWage)} – {fmt(wageCategory.maxWage)}, Rate: {((wageCategory.rate || 0) * 100).toFixed(0)}%)</span></div>
        )}
      </div>
      <p className="text-sm mb-1"><strong>To: Director Social Security.</strong></p>
      <p className="text-sm mb-3"><strong>With this statement is a cheque and/or cash for</strong> <span className="border-b border-black px-2">{fmt(totalContribution)}</span></p>
      <p className="text-center text-xs font-semibold mb-2">Contribution Breakdown</p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between border-b border-dotted border-black py-1"><span><strong>Declared Income:</strong></span><span>{fmt(declaredIncome)}</span></div>
        <div className="flex justify-between border-b border-dotted border-black py-1"><span><strong>a) Social Security Contribution:</strong></span><span>{fmt(ssContribution)}</span></div>
        <div className="flex justify-between border-b border-dotted border-black py-1"><span><strong>b) Levy Contribution:</strong></span><span>{fmt(levyContribution)}</span></div>
        <div className="flex justify-between border-b border-dotted border-black py-1"><span><strong>c) Fines:</strong></span><span>{fmt(fineAmount)}</span></div>
        {penaltyAmount > 0 && <div className="flex justify-between border-b border-dotted border-black py-1"><span><strong>d) Penalties:</strong></span><span>{fmt(penaltyAmount)}</span></div>}
        <div className="flex justify-between border-b border-dotted border-black py-1"><span><strong>e) Total Contribution:</strong></span><span className="font-semibold">{fmt(totalContribution)}</span></div>
      </div>
      <p className="text-center text-blue-600 text-xs mt-6">I hereby certify that the particulars stated above are true and correct<br />the best of my knowledge and belief</p>
      <div className="flex justify-between mt-8">
        <div className="text-center"><div className="border-b border-black w-40 mb-1" /><span className="text-xs">Signature</span></div>
        <div className="text-center"><div className="border-b border-black w-40 mb-1" /><span className="text-xs">Date</span></div>
      </div>
    </div>
  );
};

// ─── Receipt Screen ───────────────────────────────────
const ReceiptScreen: React.FC<{ receipt: OfflinePaymentReceipt; onGoBack: () => void }> = ({ receipt, onGoBack }) => {
  const handleDownload = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Receipt #${receipt.receipt_number}</title><style>
      body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 8px 12px; border-bottom: 1px solid #eee; }
      td:first-child { font-weight: bold; }
      h1 { font-size: 18px; }
      .header { text-align: center; margin-bottom: 20px; }
    </style></head><body>
      <div class="header"><h1>Social Security Board</h1></div>
      <div style="border:2px solid #333; display:inline-block; padding:8px 16px; font-weight:bold; margin-bottom:20px;">RECEIPT# ${receipt.receipt_number}</div>
      <table>
        <tr><td>Reg No.</td><td>${receipt.reg_no}</td></tr>
        <tr><td>Customer Name</td><td>${receipt.customer_name}</td></tr>
        <tr><td>Period</td><td>${receipt.period}</td></tr>
        <tr><td>Batch Number</td><td>${receipt.batch_number}</td></tr>
        <tr><td>Payment Date</td><td>${receipt.payment_date}</td></tr>
        <tr><td>Payment Mode</td><td>${receipt.payment_mode}</td></tr>
        <tr><td>Status</td><td>${receipt.status}</td></tr>
        <tr><td>SS Contributions</td><td>$${receipt.ss_contributions.toFixed(2)}</td></tr>
        <tr><td>LV Contribution</td><td>$${receipt.lv_contribution.toFixed(2)}</td></tr>
        <tr><td>PE Contributions</td><td>$${receipt.pe_contributions.toFixed(2)}</td></tr>
        <tr><td>Amount</td><td>$${receipt.amount.toFixed(2)}</td></tr>
      </table>
    </body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="max-w-xl mx-auto">
      <Card className="border-2">
        <CardContent className="pt-6 space-y-4">
          <div className="text-center space-y-2">
            <img src={ssbLogo} alt="SSB Logo" className="h-16 w-16 mx-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <h2 className="font-bold text-lg">Social Security Board</h2>
          </div>

          <div className="grid grid-cols-2 gap-x-8 text-xs">
            <div>
              <p className="font-bold">Head Office</p>
              <p>Robert Llewellyn Bradshaw Building</p>
              <p>P.O. Box 79, Bay Road, Basseterre, St. Kitts</p>
              <p>PHONE: +1 (869) 465-2535</p>
              <p>EMAIL: pubinfo@socialsecurity.kn</p>
            </div>
            <div>
              <p className="font-bold">Branch Office</p>
              <p>Pinney's Commercial Site</p>
              <p>P.O. Box 667 Nevis</p>
              <p>PHONE: +1 (869) 469-5245</p>
              <p>EMAIL: nevis@socialsecurity.kn</p>
            </div>
          </div>

          <div className="border-2 border-foreground inline-block px-4 py-2">
            <span className="font-bold text-lg">RECEIPT# {receipt.receipt_number}</span>
          </div>

          <table className="w-full text-sm">
            <tbody>
              {[
                ['Reg No.', receipt.reg_no],
                ['Customer Name', receipt.customer_name],
                ['Period', receipt.period],
                ['Batch Number', receipt.batch_number],
                ['Payment Date', receipt.payment_date],
                ['Payment Mode', receipt.payment_mode],
                ['Status', receipt.status],
                ['SS Contributions', fmt(receipt.ss_contributions)],
                ['LV Contribution', fmt(receipt.lv_contribution)],
                ['PE Contributions', fmt(receipt.pe_contributions)],
                ['Amount', fmt(receipt.amount)],
              ].map(([label, value]) => (
                <tr key={String(label)} className="border-b">
                  <td className="py-2 font-bold">{label}</td>
                  <td className="py-2">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-center gap-3 pt-4">
            <Button variant="outline" className="border-blue-500 text-blue-600" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" /> Download
            </Button>
            <Button variant="outline" onClick={onGoBack}>
              Go To DashBoard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Select Payment Modal ─────────────────────────────
const SelectPaymentModal: React.FC<{
  open: boolean;
  onClose: () => void;
  payments: BimaPayment[];
  period: string;
  onApply: (payment: BimaPayment) => void;
}> = ({ open, onClose, payments, period, onApply }) => {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Payment</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 text-sm text-amber-600 mb-3">
          <AlertTriangle className="h-4 w-4" />
          <span>There are {payments.length} C3 payments for {period}. Please review the details below and click Apply to confirm the correct payment.</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {payments.map((p, idx) => (
            <Card key={idx} className="border">
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="font-semibold">Period: {period}</div>
                <div>Receipt: {p.receipt_number}</div>
                <div>Mode: {p.payment_mode}</div>
                <div>Batch: {p.batch_number}</div>
                <div>Date: {fmtDate(p.payment_date)}</div>
                <div className="pt-2 font-semibold text-xs">Payment Details</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> SS <span className="ml-auto">{fmt(p.ss_amount)}</span></div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> LV <span className="ml-auto">{fmt(p.lv_amount)}</span></div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> PE <span className="ml-auto">{fmt(p.pe_amount)}</span></div>
                <div className="flex justify-between font-semibold text-red-600 pt-1">
                  <span>Total</span><span>{fmt(p.total)}</span>
                </div>
                {p.validation_warnings.length > 0 && (
                  <div className="text-xs text-amber-600 mt-1">
                    {p.validation_warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
                  </div>
                )}
                <div className="pt-2">
                  {p.is_applied ? (
                    <Button variant="outline" size="sm" disabled className="w-full">✓ Applied</Button>
                  ) : (
                    <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => onApply(p)}>Apply</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Page ────────────────────────────────────────
const OfflinePaymentPage: React.FC = () => {
  const { entityType, headerId } = useParams<{ entityType: string; headerId: string }>();
  const [searchParams] = useSearchParams();
  const isPaidMode = searchParams.get('mode') === 'paid';
  const companyIdParam = Number(searchParams.get('companyId') || 0);
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const type = (entityType || 'employer') as 'employer' | 'nwd' | 'self_employed';
  const id = Number(headerId || 0);

  // Page data
  const [pageData, setPageData] = useState<OfflinePaymentPageData | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Section states
  const [reportOpen, setReportOpen] = useState(!isPaidMode);
  const [paymentOpen, setPaymentOpen] = useState(isPaidMode);

  // BEMA search
  const [receiptNumber, setReceiptNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [bemaData, setBemaData] = useState<BimaPayment | null>(null);

  // Multiple payments modal
  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [multiplePayments, setMultiplePayments] = useState<BimaPayment[]>([]);
  const [modalPeriod, setModalPeriod] = useState('');

  // Pay action
  const [paying, setPaying] = useState(false);

  // Receipt screen
  const [receiptScreen, setReceiptScreen] = useState<OfflinePaymentReceipt | null>(null);

  const backRoute = type === 'employer' ? '/c3-management/c3-contribution'
    : type === 'nwd' ? '/c3-management/nw-director'
    : '/c3-management/self-employed-c3';

  // Load page data
  useEffect(() => {
    if (!id) return;
    setLoading(true);

    // Build promises - preview needs companyId for employer/nwd
    const pagePromise = getOfflinePaymentPage({ header_id: id, entity_type: type });
    const previewPromise = type === 'self_employed'
      ? getSeContributionPreview(id).catch(() => ({ data: null }))
      : companyIdParam
        ? (type === 'employer'
            ? getContributionPreview(id, companyIdParam)
            : getNwdContributionPreview(id, companyIdParam)
          ).catch(() => ({ data: null }))
        : Promise.resolve({ data: null });

    Promise.all([pagePromise, previewPromise]).then(([pageRes, reportRes]) => {
      setPageData(pageRes.data || null);
      setReportData(reportRes.data || null);

      // If already paid, pre-fill BEMA data
      if (pageRes.data?.is_paid && pageRes.data.existing_payment) {
        const ep = pageRes.data.existing_payment;
        setBemaData({
          receipt_number: ep.receipt_number,
          batch_number: ep.batch_number,
          payment_date: ep.payment_date,
          payment_mode: ep.payment_mode,
          ss_amount: ep.ss_amount,
          lv_amount: ep.lv_amount,
          pe_amount: ep.pe_amount,
          total: ep.total,
          is_applied: true,
          validation_warnings: [],
        });
        setReceiptNumber(ep.receipt_number);
      }

      // If no preview loaded yet and pageData has company_id, load it
      if (!reportRes.data && pageRes.data?.c3_details?.company_id && type !== 'self_employed') {
        const cid = pageRes.data.c3_details.company_id;
        const fn = type === 'employer' ? getContributionPreview : getNwdContributionPreview;
        fn(id, cid).then(r => setReportData(r.data)).catch(() => {});
      }
    }).catch((err) => {
      toast.error(err.message || 'Failed to load page data');
    }).finally(() => setLoading(false));
  }, [id, type, companyIdParam]);

  // Also try loading with company_id from page data for employer/nwd previews
  useEffect(() => {
    if (!pageData?.c3_details?.company_id || !id) return;
    const companyId = pageData.c3_details.company_id;
    if (type === 'employer') {
      getContributionPreview(id, companyId).then(res => setReportData(res.data)).catch(() => {});
    } else if (type === 'nwd') {
      getNwdContributionPreview(id, companyId).then(res => setReportData(res.data)).catch(() => {});
    }
  }, [pageData?.c3_details?.company_id, id, type]);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>C3 Report</title><style>
      body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #333; padding: 3px 6px; text-align: left; font-size: 10px; }
      th { background: #f0f0f0; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .font-bold { font-weight: bold; }
    </style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  };

  const handleSearchReceipt = useCallback(async () => {
    if (!receiptNumber.trim()) {
      toast.error('Please enter a receipt number');
      return;
    }
    setSearching(true);
    try {
      const res = await searchBimaReceipt({
        receipt_number: receiptNumber.trim(),
        header_id: id,
        entity_type: type,
      });
      const data = res.data;
      if (!data || !data.payments || data.payments.length === 0) {
        toast.error('Receipt number not found. Please verify and try again.');
        return;
      }
      if (data.multiple && data.payments.length > 1) {
        setMultiplePayments(data.payments);
        setModalPeriod(data.period);
        setSelectModalOpen(true);
      } else {
        setBemaData(data.payments[0]);
      }
    } catch (err: any) {
      toast.error(err.message || 'Unable to connect to payment system. Please try again later.');
    } finally {
      setSearching(false);
    }
  }, [receiptNumber, id, type]);

  const handleApplyFromModal = (payment: BimaPayment) => {
    setBemaData(payment);
    setReceiptNumber(payment.receipt_number);
    setSelectModalOpen(false);
  };

  const handlePay = useCallback(async () => {
    if (!bemaData || !pageData) return;
    setPaying(true);
    try {
      const res = await applyOfflinePayment({
        header_id: id,
        entity_type: type,
        receipt_number: bemaData.receipt_number,
        batch_number: bemaData.batch_number,
        payment_date: bemaData.payment_date,
        payment_mode: bemaData.payment_mode,
        ss_amount: bemaData.ss_amount,
        lv_amount: bemaData.lv_amount,
        pe_amount: bemaData.pe_amount,
        total_amount: bemaData.total,
        admin_user_id: 1,
      });
      toast.success(res.data?.message || 'Offline payment recorded successfully');
      if (res.data?.receipt) {
        setReceiptScreen(res.data.receipt);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply payment');
    } finally {
      setPaying(false);
    }
  }, [bemaData, pageData, id, type]);

  const c3 = pageData?.c3_details;
  const isAlreadyPaid = pageData?.is_paid || false;

  if (loading) {
    return (
      <div className="p-6 flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show receipt screen
  if (receiptScreen) {
    return (
      <div className="p-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbPage className="cursor-pointer flex items-center gap-1" onClick={() => navigate('/c3-management/dashboard')}><Home className="h-3.5 w-3.5" /> Admin Dashboard</BreadcrumbPage></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Payment Receipt</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="mt-4">
          <ReceiptScreen receipt={receiptScreen} onGoBack={() => navigate(backRoute)} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbPage className="cursor-pointer flex items-center gap-1" onClick={() => navigate('/c3-management/dashboard')}><Home className="h-3.5 w-3.5" /> Admin Dashboard</BreadcrumbPage></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Offline Payment</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Report Section */}
      <Collapsible open={reportOpen} onOpenChange={setReportOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between px-6 py-3 cursor-pointer hover:bg-muted/50">
              <span className="text-green-700 font-semibold text-sm">Report</span>
              {reportOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {type === 'employer' && <EmployerReport data={reportData} printRef={printRef} />}
              {type === 'nwd' && <NwdReport data={reportData} printRef={printRef} />}
              {type === 'self_employed' && <SeReport data={reportData} printRef={printRef} />}

              <div className="flex justify-between mt-4">
                <div className="flex gap-2">
                  <Button variant="outline" className="border-green-500 text-green-600" onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-1" /> Print
                  </Button>
                  <Button variant="outline" className="border-blue-500 text-blue-600" onClick={handlePrint}>
                    <Download className="h-4 w-4 mr-1" /> Download PDF
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="border-green-500 text-green-600"
                  onClick={() => {
                    setPaymentOpen(true);
                    setTimeout(() => {
                      document.getElementById('payment-section')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                >
                  <DollarSign className="h-4 w-4 mr-1" /> Payment
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Payment Section */}
      <Collapsible open={paymentOpen} onOpenChange={setPaymentOpen}>
        <Card id="payment-section">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between px-6 py-3 cursor-pointer hover:bg-muted/50">
              <span className="text-green-700 font-semibold text-sm">Payment</span>
              {paymentOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: BEMA Payment Details */}
                <Card className="border">
                  <CardContent className="pt-4 space-y-4">
                    <h3 className="font-bold text-sm">BEMA Payment Details</h3>
                    <p className="text-xs text-muted-foreground">
                      Retrieve the payment details to enter the BEMA receipt number for the correct employer and C3 period.
                    </p>

                    <div className="space-y-1">
                      <label className="text-xs font-medium">Receipt Number *</label>
                      <div className="flex gap-1">
                        <Input
                          placeholder="Enter Receipt Number (e.g. 123BER)"
                          value={receiptNumber}
                          onChange={(e) => setReceiptNumber(e.target.value)}
                          disabled={isAlreadyPaid}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearchReceipt()}
                        />
                        <Button variant="ghost" size="icon" onClick={handleSearchReceipt} disabled={isAlreadyPaid || searching}>
                          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1.5 border-b">
                        <span className="font-medium">Batch Number</span>
                        <span>{bemaData?.batch_number || ''}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b">
                        <span className="font-medium">Payment Date</span>
                        <span>{bemaData ? fmtDate(bemaData.payment_date) : ''}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b">
                        <span className="font-medium">Payment Mode</span>
                        <span>{bemaData?.payment_mode || ''}</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm pt-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>SS Contributions</span>
                        <span className="ml-auto">{bemaData ? fmt(bemaData.ss_amount) : ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>LV Contribution</span>
                        <span className="ml-auto">{bemaData ? fmt(bemaData.lv_amount) : ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>PE Contributions</span>
                        <span className="ml-auto">{bemaData ? fmt(bemaData.pe_amount) : ''}</span>
                      </div>
                    </div>

                    <div className="flex justify-between font-semibold text-red-600 pt-2 text-sm">
                      <span>Total</span>
                      <span>{bemaData ? fmt(bemaData.total) : '$0.00'}</span>
                    </div>

                    <div className="flex justify-between pt-4">
                      <Button variant="outline" size="sm" onClick={() => navigate(backRoute)}>
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back
                      </Button>
                      {!isAlreadyPaid && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={!bemaData || paying}
                          onClick={handlePay}
                        >
                          {paying ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <DollarSign className="h-4 w-4 mr-1" />}
                          Pay
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Right: C3 Payment Details */}
                <Card className="border">
                  <CardContent className="pt-4 space-y-3">
                    <h3 className="font-bold text-sm">C3 Payment Details</h3>

                    {c3?.is_nil_return && (
                      <div className="text-center text-sm font-medium text-muted-foreground">Nil Return</div>
                    )}

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1.5 border-b">
                        <span className="font-medium">Period</span>
                        <span>{c3?.period || ''}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b">
                        <span className="font-medium">Creation Date</span>
                        <span>{c3 ? fmtDate(c3.creation_date) : ''}</span>
                      </div>
                      {type !== 'self_employed' && (
                        <div className="flex justify-between py-1.5 border-b">
                          <span className="font-medium">Schedule</span>
                          <span>{c3?.schedule || ''}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-1.5 border-b">
                        <span className="font-medium">Wages</span>
                        <span>{c3 ? fmt(c3.wages) : ''}</span>
                      </div>
                    </div>

                    {/* Contribution details - entity-specific */}
                    <div className="space-y-2 text-sm pt-2">
                      {type === 'nwd' ? (
                        <>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">SS Nil Return</span>
                            <span className="ml-auto">{fmt(0)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">LV Nil Return</span>
                            <span className="ml-auto">{fmt(0)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>LV Contributions</span>
                            <span className="ml-auto">{c3 ? fmt(c3.lv_contributions) : ''}</span>
                          </div>
                        </>
                      ) : type === 'self_employed' ? (
                        <>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>SS Contributions</span>
                            <span className="ml-auto">{c3 ? fmt(c3.ss_contributions) : ''}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>LV Contributions</span>
                            <span className="ml-auto">{c3 ? fmt(c3.lv_contributions) : ''}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>SS Contributions</span>
                            <span className="ml-auto">{c3 ? fmt(c3.ss_contributions) : ''}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>LV Contributions</span>
                            <span className="ml-auto">{c3 ? fmt(c3.lv_contributions) : ''}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>PE Contributions</span>
                            <span className="ml-auto">{c3 ? fmt(c3.pe_contributions) : ''}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex justify-between font-semibold text-red-600 pt-2 text-sm">
                      <span>Total</span>
                      <span>{c3 ? fmt(c3.total) : '$0.00'}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Select Payment Modal */}
      <SelectPaymentModal
        open={selectModalOpen}
        onClose={() => setSelectModalOpen(false)}
        payments={multiplePayments}
        period={modalPeriod}
        onApply={handleApplyFromModal}
      />
    </div>
  );
};

export default OfflinePaymentPage;
