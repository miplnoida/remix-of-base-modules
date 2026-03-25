import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Home, ChevronDown, ChevronUp, Search, Printer, Download, DollarSign, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import ssbLogo from '@/assets/stkitts-logo.png';
import SelectPaymentModal from '@/components/c3/SelectPaymentModal';
import {
  getContributionPreview,
  getNwdContributionPreview,
  getSeContributionPreview,
  getOfflinePaymentData,
  getPeriodPaymentList,
  applyOfflinePayment,
  type OfflinePaymentPageData,
  type BimaPeriodPayment,
  type ApplyPaymentResult,
} from '@/services/wizC3DetailsService';

// ─── Helpers ──────────────────────────────────────────
function fmt(val: number | null | undefined) {
  return `$${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(dateStr: string | null | undefined) {
  if (!dateStr) return '';
  try { return format(parseISO(dateStr), 'dd-MMM-yyyy'); } catch { return dateStr; }
}

type EntityType = 'c3' | 'nw_director' | 'self_employed';

// ─── Inline Report Components ─────────────────────────

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
      <p className="text-destructive text-xs mb-3">(This form is in quadruplicate. Please read these notes carefully.)</p>
      <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
        <div><strong>Name of Employer</strong> <span className="border-b border-foreground ml-1">{companyName}</span></div>
        <div><strong>Trade Name</strong> <span className="border-b border-foreground ml-1">{tradeName}</span></div>
        <div><strong>Employer's Registration No.</strong> <span className="border border-foreground px-2">{regNo}</span></div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
        <div><strong>Address</strong> <span className="border-b border-foreground ml-1">{address}</span></div>
        <div className="text-right"><strong>Employee(s)</strong> <span className="border border-foreground px-2">{data.employeeCount || employees.length}</span></div>
      </div>
      <p className="text-xs mb-1"><strong>To: Director of Social Security,</strong><br />&nbsp;&nbsp;&nbsp;&nbsp;With this statement is a cheque and/or cash for the month of: <span className="border-b border-foreground px-4 font-semibold">{periodLabel}</span></p>
      <div className="flex gap-8 mb-2 text-xs">
        <div>(1) Director, Social Security Board <span className="border-b border-foreground px-4 font-semibold">{fmt(ag.socialSecurity)}</span></div>
        <div>(2) Accountant General <span className="border-b border-foreground px-4 font-semibold">{fmt((ssb.levy || 0) + (ssb.severance || 0))}</span></div>
        <div className="ml-auto">Total <span className="border-b border-foreground px-4 font-semibold">{fmt(totals.grandTotal)}</span></div>
      </div>
      <table className="w-full border-collapse border border-foreground text-[9px] mt-2">
        <thead>
          <tr>
            <th className="border border-foreground p-1">(1)</th>
            <th className="border border-foreground p-1">(2)<br/>SSN</th>
            <th className="border border-foreground p-1">(3)<br/>Name</th>
            <th className="border border-foreground p-1" colSpan={5}>(5a) Weeks Worked</th>
            <th className="border border-foreground p-1" colSpan={7}>(6) Wages</th>
            <th className="border border-foreground p-1">(7) Total</th>
            <th className="border border-foreground p-1">(8) Levy</th>
            <th className="border border-foreground p-1">(9) SS</th>
            <th className="border border-foreground p-1">(10)</th>
          </tr>
          <tr>
            <th className="border border-foreground p-1"></th><th className="border border-foreground p-1"></th><th className="border border-foreground p-1"></th>
            {['1','2','3','4','5'].map(w => <th key={w} className="border border-foreground p-1">{w}</th>)}
            {['WK1','WK2','WK3','WK4','WK5','HPay','Bonus'].map(w => <th key={w} className="border border-foreground p-1">{w}</th>)}
            <th className="border border-foreground p-1"></th><th className="border border-foreground p-1"></th><th className="border border-foreground p-1"></th><th className="border border-foreground p-1"></th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp: any, idx: number) => (
            <tr key={idx}>
              <td className="border border-foreground p-1 text-center">{idx + 1}</td>
              <td className="border border-foreground p-1">{emp.ssn}</td>
              <td className="border border-foreground p-1">{emp.name}</td>
              {[emp.week1, emp.week2, emp.week3, emp.week4, emp.week5].map((w: number, i: number) => (
                <td key={i} className="border border-foreground p-1 text-center">{w > 0 ? 'x' : ''}</td>
              ))}
              {[emp.week1, emp.week2, emp.week3, emp.week4, emp.week5, emp.holidayPay, emp.bonus].map((w: number, i: number) => (
                <td key={`w${i}`} className="border border-foreground p-1 text-right">{fmt(w)}</td>
              ))}
              <td className="border border-foreground p-1 text-right">{fmt(emp.totalWages)}</td>
              <td className="border border-foreground p-1 text-right">{fmt((emp.levyEmployee || 0) + (emp.levyEmployer || 0))}</td>
              <td className="border border-foreground p-1 text-right">{fmt(emp.ssTotal)}</td>
              <td className="border border-foreground p-1">{emp.remark || ''}</td>
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
        <div className="text-center"><div className="border-b border-foreground w-48 mb-1" /><span>Signature of Employer or Agent</span></div>
        <div className="text-center"><span>Date: <span className="border-b border-foreground px-6">{creationDate}</span></span></div>
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
      <p className="text-destructive text-xs mb-3">(This form is in quadruplicate. Please read these notes carefully.)</p>
      <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
        <div><strong>Name of Employer</strong> <span className="border-b border-foreground ml-1">{companyName}</span></div>
        <div><strong>Trade Name</strong> <span className="border-b border-foreground ml-1">{tradeName}</span></div>
        <div><strong>Employer's Registration No.</strong> <span className="border border-foreground px-2">{regNo}</span></div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
        <div><strong>Address</strong> <span className="border-b border-foreground ml-1">{address}</span></div>
        <div className="text-right"><strong>Director(s)</strong> <span className="border border-foreground px-2">{data.directorCount || directors.length}</span></div>
      </div>
      <p className="text-xs mb-2"><strong>To: Director of Social Security,</strong><br />&nbsp;&nbsp;&nbsp;&nbsp;With this statement for the month of: <span className="border-b border-foreground px-4 font-semibold">{periodLabel}</span></p>
      <div className="mb-2 text-xs">(1) Accountant General: <span className="border-b border-foreground px-4 font-semibold">{fmt(totals.grandTotal)}</span></div>
      <table className="w-full border-collapse border border-foreground text-[9px] mt-2">
        <thead>
          <tr>
            <th className="border border-foreground p-1">(1)</th>
            <th className="border border-foreground p-1">(2) SSN</th>
            <th className="border border-foreground p-1">(3) Name</th>
            {['WK1','WK2','WK3','WK4','WK5'].map(w => <th key={w} className="border border-foreground p-1">{w}</th>)}
            <th className="border border-foreground p-1">(5) Total Wages</th>
            <th className="border border-foreground p-1">(6) Levy EE</th>
            <th className="border border-foreground p-1">(6) Levy ER</th>
            <th className="border border-foreground p-1">(7) Remarks</th>
          </tr>
        </thead>
        <tbody>
          {directors.map((d: any, idx: number) => (
            <tr key={idx}>
              <td className="border border-foreground p-1 text-center">{idx + 1}</td>
              <td className="border border-foreground p-1">{d.ssn}</td>
              <td className="border border-foreground p-1">{d.name}</td>
              {[d.week1, d.week2, d.week3, d.week4, d.week5].map((w: number, i: number) => (
                <td key={i} className="border border-foreground p-1 text-right">{fmt(w)}</td>
              ))}
              <td className="border border-foreground p-1 text-right">{fmt(d.totalWages)}</td>
              <td className="border border-foreground p-1 text-right">{fmt(d.levyEmployee)}</td>
              <td className="border border-foreground p-1 text-right">{fmt(d.levyEmployer)}</td>
              <td className="border border-foreground p-1"></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 text-xs space-y-0.5">
        <div className="flex justify-between"><span>a) Total Fees and Directors levy Contribution</span><span>{fmt(totals.levyTotal)}</span></div>
        <div className="flex justify-between"><span>b) Levy Penalty for the month (if any)</span><span>{fmt(totals.levyPenalty)}</span></div>
        <div className="flex justify-between font-semibold"><span>c) Total Accountant General</span><span>{fmt(totals.grandTotal)}</span></div>
      </div>
      <p className="text-xs mt-4">I/We hereby certify that the particulars stated above are true and correct to the best of my/our knowledge and belief</p>
      <div className="flex justify-between mt-6">
        <div className="text-center"><div className="border-b border-foreground w-48 mb-1" /><span>Signature of Employer or Agent</span></div>
        <div className="text-center"><span>Date: <span className="border-b border-foreground px-6"></span></span></div>
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
      <p className="text-sm mb-3"><strong className="text-base">For</strong> <span className="border-b border-foreground px-2">{periodLabel}</span></p>
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
      <p className="text-sm mb-3"><strong>With this statement is a cheque and/or cash for</strong> <span className="border-b border-foreground px-2">{fmt(totalContribution)}</span></p>
      <p className="text-center text-xs font-semibold mb-2">Contribution Breakdown</p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between border-b border-dotted border-foreground py-1"><span><strong>Declared Income:</strong></span><span>{fmt(declaredIncome)}</span></div>
        <div className="flex justify-between border-b border-dotted border-foreground py-1"><span><strong>a) Social Security Contribution:</strong></span><span>{fmt(ssContribution)}</span></div>
        <div className="flex justify-between border-b border-dotted border-foreground py-1"><span><strong>b) Levy Contribution:</strong></span><span>{fmt(levyContribution)}</span></div>
        <div className="flex justify-between border-b border-dotted border-foreground py-1"><span><strong>c) Fines:</strong></span><span>{fmt(fineAmount)}</span></div>
        {penaltyAmount > 0 && <div className="flex justify-between border-b border-dotted border-foreground py-1"><span><strong>d) Penalties:</strong></span><span>{fmt(penaltyAmount)}</span></div>}
        <div className="flex justify-between border-b border-dotted border-foreground py-1"><span><strong>e) Total Contribution:</strong></span><span className="font-semibold">{fmt(totalContribution)}</span></div>
      </div>
      <p className="text-center text-primary text-xs mt-6">I hereby certify that the particulars stated above are true and correct<br />the best of my knowledge and belief</p>
      <div className="flex justify-between mt-8">
        <div className="text-center"><div className="border-b border-foreground w-40 mb-1" /><span className="text-xs">Signature</span></div>
        <div className="text-center"><div className="border-b border-foreground w-40 mb-1" /><span className="text-xs">Date</span></div>
      </div>
    </div>
  );
};

// ─── Post-Payment Receipt Screen ──────────────────────
const PostPaymentReceipt: React.FC<{
  receipt: ApplyPaymentResult['receipt'];
  onGoBack: () => void;
}> = ({ receipt, onGoBack }) => {
  const handleDownload = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Payment Receipt</title><style>
      body { font-family: Arial, sans-serif; max-width: 500px; margin: 40px auto; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 8px 12px; border-bottom: 1px solid #eee; }
      td:first-child { font-weight: bold; }
      .header { text-align: center; margin-bottom: 20px; }
      .receipt-badge { display: inline-block; background: #f0f0f0; padding: 6px 16px; border-radius: 4px; font-weight: bold; margin: 12px 0; }
    </style></head><body>
      <div class="header">
        <h2>Social Security Board</h2>
        <p>Head Office: Robert Llewellyn Bradshaw Building, P.O. Box 79, Bay Rd, Basseterre, St. Kitts</p>
        <p>+1 (869) 465-2535 | pubinfo@socialsecurity.kn</p>
        <div class="receipt-badge">RECEIPT# ${receipt.receipt_number}</div>
      </div>
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
        <tr><td><strong>Amount</strong></td><td><strong>$${receipt.amount.toFixed(2)}</strong></td></tr>
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
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div className="grid grid-cols-2 gap-4 text-left max-w-sm mx-auto">
                <div>
                  <p className="font-semibold">Head Office</p>
                  <p>Robert Llewellyn Bradshaw Building</p>
                  <p>P.O. Box 79, Bay Rd</p>
                  <p>Basseterre, St. Kitts</p>
                  <p>+1 (869) 465-2535</p>
                  <p>pubinfo@socialsecurity.kn</p>
                </div>
                <div>
                  <p className="font-semibold">Branch Office</p>
                  <p>Pinney's Commercial Site</p>
                  <p>P.O. Box 667 Nevis</p>
                  <p>+1 (869) 469-5245</p>
                  <p>nevis@socialsecurity.kn</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <span className="bg-muted px-4 py-1.5 rounded font-bold text-sm">RECEIPT# {receipt.receipt_number}</span>
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
                <tr key={label} className="border-b">
                  <td className="py-2 font-bold w-1/3">{label}</td>
                  <td className="py-2">{label === 'Amount' ? <strong>{value}</strong> : value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-center gap-3 pt-4">
            <Button className="bg-primary text-primary-foreground" onClick={handleDownload}>
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

// ─── Main Page ────────────────────────────────────────
const OfflinePaymentPage: React.FC = () => {
  const { entityType, headerId } = useParams<{ entityType: string; headerId: string }>();
  const [searchParams] = useSearchParams();
  const companyIdParam = Number(searchParams.get('companyId') || 0);
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const type: EntityType = entityType === 'nw_director' ? 'nw_director'
    : entityType === 'self_employed' ? 'self_employed'
    : 'c3';
  const id = Number(headerId || 0);

  // Page data
  const [pageData, setPageData] = useState<OfflinePaymentPageData | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Section states (Report collapsed, Payment expanded per guide)
  const [reportOpen, setReportOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(true);

  // Auto-fetched BIMA data
  const [selectedPayment, setSelectedPayment] = useState<BimaPeriodPayment | null>(null);
  const [bimaPayments, setBimaPayments] = useState<BimaPeriodPayment[]>([]);
  const [bimaLoading, setBimaLoading] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [applyingReceipt] = useState<string | null>(null);

  // Pay action
  const [paying, setPaying] = useState(false);

  // Post-payment receipt
  const [paymentReceipt, setPaymentReceipt] = useState<ApplyPaymentResult['receipt'] | null>(null);

  // Is this a "Paid" read-only view?
  const isPaid = pageData?.is_paid === true;

  const backRoute = type === 'c3' ? '/c3-management/c3-contribution'
    : type === 'nw_director' ? '/c3-management/nw-director'
    : '/c3-management/self-employed-c3';

  // Step 1: Load page data + report preview
  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const previewPromise = type === 'self_employed'
      ? getSeContributionPreview(id)
      : companyIdParam
        ? (type === 'c3'
            ? getContributionPreview(id, companyIdParam)
            : getNwdContributionPreview(id, companyIdParam))
        : Promise.resolve({ data: null });

    const paymentDataPromise = getOfflinePaymentData({
      header_id: id,
      entity_type: type,
    }).catch(() => ({ data: null }));

    Promise.all([previewPromise, paymentDataPromise])
      .then(([reportRes, paymentRes]) => {
        setReportData(reportRes.data || null);

        const legacyType = type === 'c3' ? 'employer' : type === 'nw_director' ? 'nwd' : 'self_employed';
        if (paymentRes.data) {
          setPageData(paymentRes.data);
        } else if (reportRes.data) {
          setPageData(buildFallbackPageData(legacyType, reportRes.data, companyIdParam));
        }
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load page data');
      })
      .finally(() => setLoading(false));
  }, [id, type, companyIdParam]);

  // Step 2: Auto-fetch BIMA payments once pageData is ready (and not already paid)
  useEffect(() => {
    if (!pageData || isPaid) return;

    // If already paid, populate selectedPayment from existing_payment
    if (pageData.existing_payment) {
      setSelectedPayment({
        receipt_number: pageData.existing_payment.receipt_number || pageData.existing_payment.bima_receipt_number || '',
        batch_number: pageData.existing_payment.batch_number || '',
        payment_date: pageData.existing_payment.payment_date || '',
        payment_mode: pageData.existing_payment.payment_mode || '',
        ss_amount: pageData.existing_payment.ss_amount || 0,
        lv_amount: pageData.existing_payment.lv_amount || 0,
        pe_amount: pageData.existing_payment.pe_amount || 0,
        total: pageData.existing_payment.total || 0,
        is_applied: true,
        validation_warnings: [],
      });
      return;
    }

    const c3 = pageData.c3_details;
    if (!c3.registration_number || !c3.period_month || !c3.period_year) return;

    setBimaLoading(true);
    getPeriodPaymentList({
      header_id: id,
      entity_type: type,
      registration_number: c3.registration_number,
      period_month: c3.period_month,
      period_year: c3.period_year,
    })
      .then((res) => {
        const payments = res.data?.payments || [];
        setBimaPayments(payments);

        if (payments.length === 0) {
          toast.warning('No BIMA payments found for this period. Please verify the payment was posted to BIMA.');
        } else if (payments.length === 1) {
          // Single payment — auto-fill
          setSelectedPayment(payments[0]);
        } else {
          // Multiple — show selection modal
          setShowSelectModal(true);
        }
      })
      .catch((err) => {
        toast.error(err.message || 'Unable to connect to payment system. Please try again later.');
      })
      .finally(() => setBimaLoading(false));
  }, [pageData, isPaid, id, type]);

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
    </style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  };

  // Handle payment selection from modal
  const handleSelectPayment = (payment: BimaPeriodPayment) => {
    setSelectedPayment(payment);
    setShowSelectModal(false);
  };

  // Submit payment
  const handlePay = useCallback(async () => {
    if (!selectedPayment || !pageData) return;

    setPaying(true);
    try {
      const res = await applyOfflinePayment({
        header_id: id,
        entity_type: type,
        receipt_number: selectedPayment.receipt_number,
        batch_number: selectedPayment.batch_number,
        payment_date: selectedPayment.payment_date,
        payment_mode: selectedPayment.payment_mode,
        ss_amount: selectedPayment.ss_amount,
        lv_amount: selectedPayment.lv_amount,
        pe_amount: selectedPayment.pe_amount,
        total_amount: selectedPayment.total,
        admin_user_id: 1, // TODO: get from auth context
        notes: '',
      });
      toast.success('Offline payment recorded successfully');
      if (res.data?.receipt) {
        setPaymentReceipt(res.data.receipt);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply payment');
    } finally {
      setPaying(false);
    }
  }, [selectedPayment, pageData, id, type]);

  const c3 = pageData?.c3_details;

  if (loading) {
    return (
      <div className="p-6 flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className="p-6 space-y-4">
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-destructive font-medium">Failed to load payment data. The service may be temporarily unavailable.</p>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show post-payment receipt screen
  if (paymentReceipt) {
    return (
      <div className="p-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbPage className="cursor-pointer flex items-center gap-1" onClick={() => navigate('/c3-management/dashboard')}><Home className="h-3.5 w-3.5" /> Admin Dashboard</BreadcrumbPage></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Payment Confirmation</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="mt-4">
          <PostPaymentReceipt receipt={paymentReceipt} onGoBack={() => navigate(backRoute)} />
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

      {/* Report Section — collapsed by default */}
      <Collapsible open={reportOpen} onOpenChange={setReportOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between px-6 py-3 cursor-pointer hover:bg-muted/50">
              <span className="text-primary font-semibold text-sm">Report</span>
              {reportOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {type === 'c3' && <EmployerReport data={reportData} printRef={printRef} />}
              {type === 'nw_director' && <NwdReport data={reportData} printRef={printRef} />}
              {type === 'self_employed' && <SeReport data={reportData} printRef={printRef} />}

              <div className="flex justify-between mt-4">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-1" /> Print
                  </Button>
                  <Button variant="outline" onClick={handlePrint}>
                    <Download className="h-4 w-4 mr-1" /> Download PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Payment Section — expanded by default */}
      <Collapsible open={paymentOpen} onOpenChange={setPaymentOpen}>
        <Card id="payment-section">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between px-6 py-3 cursor-pointer hover:bg-muted/50">
              <span className="text-primary font-semibold text-sm">Payment</span>
              {paymentOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Panel: BEMA Payment Details (AUTO-FETCHED, read-only) */}
                <Card className="border">
                  <CardContent className="pt-4 space-y-4">
                    <div>
                      <h3 className="font-bold text-sm text-primary">BEMA Payment Details</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Retrieve the payment details to enter the BEMA receipt number for the correct employer and C3 period.
                      </p>
                    </div>

                    {bimaLoading && (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                        <span className="text-sm text-muted-foreground">Fetching BIMA payments...</span>
                      </div>
                    )}

                    {!bimaLoading && !selectedPayment && !isPaid && (
                      <div className="text-center py-6 text-sm text-muted-foreground">
                        {bimaPayments.length === 0
                          ? 'No BIMA payments found for this period.'
                          : 'Please select a payment from the available options.'}
                        {bimaPayments.length > 1 && (
                          <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowSelectModal(true)}>
                            Select Payment
                          </Button>
                        )}
                      </div>
                    )}

                    {selectedPayment && (
                      <>
                        {/* Receipt Number — READ-ONLY, auto-populated */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Receipt Number</Label>
                          <div className="flex gap-1">
                            <Input value={selectedPayment.receipt_number} readOnly className="bg-muted/30" />
                            <Button variant="ghost" size="icon" disabled>
                              <Search className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>

                        {/* Batch Number */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Batch Number</Label>
                          <Input value={selectedPayment.batch_number} readOnly className="bg-muted/30" />
                        </div>

                        {/* Payment Date */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Payment Date</Label>
                          <Input value={fmtDate(selectedPayment.payment_date)} readOnly className="bg-muted/30" />
                        </div>

                        {/* Payment Mode — read-only from BIMA */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Payment Mode</Label>
                          <Input value={selectedPayment.payment_mode} readOnly className="bg-muted/30" />
                        </div>

                        {/* Contribution amounts */}
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between py-1 border-b">
                            <span>🟢 SS Contributions</span>
                            <span>{fmt(selectedPayment.ss_amount)}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b">
                            <span>🟢 LV Contributions</span>
                            <span>{fmt(selectedPayment.lv_amount)}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b">
                            <span>🟢 PE Contributions</span>
                            <span>{fmt(selectedPayment.pe_amount)}</span>
                          </div>
                          <div className="flex justify-between py-1 font-semibold text-destructive">
                            <span>Total</span>
                            <span>{fmt(selectedPayment.total)}</span>
                          </div>
                        </div>

                        {/* Validation warnings */}
                        {(selectedPayment.validation_warnings?.length ?? 0) > 0 && (
                          <div className="text-xs p-2 bg-amber-50 border border-amber-200 rounded space-y-1">
                            {selectedPayment.validation_warnings.map((w, i) => (
                              <p key={i} className="text-amber-800">⚠ {w}</p>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {/* Buttons */}
                    <div className="flex justify-between pt-4">
                      <Button variant="outline" size="sm" onClick={() => navigate(backRoute)}>
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back
                      </Button>
                      {!isPaid && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={!selectedPayment || paying || bimaLoading}
                          onClick={handlePay}
                        >
                          {paying ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <DollarSign className="h-4 w-4 mr-1" />}
                          Pay
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Right Panel: C3 Payment Details */}
                <Card className="border">
                  <CardContent className="pt-4 space-y-3">
                    <h3 className="font-bold text-sm text-primary">C3 Payment Details</h3>

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

                      {/* Entity-specific contribution rows */}
                      {type === 'nw_director' ? (
                        <>
                          <div className="flex justify-between py-1.5 border-b text-muted-foreground">
                            <span className="font-medium">SS Nil Return</span>
                            <span>{fmt(0)}</span>
                          </div>
                          <div className="flex justify-between py-1.5 border-b text-muted-foreground">
                            <span className="font-medium">LV Nil Return</span>
                            <span>{fmt(0)}</span>
                          </div>
                          <div className="flex justify-between py-1.5 border-b">
                            <span className="font-medium">🟢 LV Contributions</span>
                            <span>{c3 ? fmt(c3.lv_contributions) : ''}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between py-1.5 border-b">
                            <span className="font-medium">🟢 SS Contributions</span>
                            <span>{c3 ? fmt(c3.ss_contributions) : ''}</span>
                          </div>
                          <div className="flex justify-between py-1.5 border-b">
                            <span className="font-medium">🟢 LV Contributions</span>
                            <span>{c3 ? fmt(c3.lv_contributions) : ''}</span>
                          </div>
                          {type === 'c3' && (
                            <div className="flex justify-between py-1.5 border-b">
                              <span className="font-medium">🟢 PE Contributions</span>
                              <span>{c3 ? fmt(c3.pe_contributions) : ''}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex justify-between font-semibold text-destructive pt-2 text-sm">
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

      {/* Select Payment Modal (multiple BIMA payments) */}
      <SelectPaymentModal
        open={showSelectModal}
        onClose={() => setShowSelectModal(false)}
        payments={bimaPayments}
        period={pageData?.c3_details.period || ''}
        onSelect={handleSelectPayment}
        applyingReceipt={applyingReceipt}
      />
    </div>
  );
};

// ─── Fallback builder ─────────────────────────────────
function buildFallbackPageData(legacyType: string, previewData: any, companyIdParam: number): OfflinePaymentPageData | null {
  if (!previewData) return null;

  if (legacyType === 'self_employed') {
    const declaredIncome = Number(previewData.declaredIncome || 0);
    const ssContribution = Number(previewData.socialSecurityContribution || 0);
    const levyContribution = Number(previewData.levyContribution || 0);
    const penaltyAmount = Number(previewData.penaltyAmount || 0);
    const totalContribution = Number(previewData.totalContribution || (ssContribution + levyContribution + penaltyAmount));
    return {
      c3_details: {
        period: previewData.periodLabel || [previewData.periodMonth, previewData.periodYear].filter(Boolean).join(' '),
        period_month: String(previewData.periodMonth || ''),
        period_year: String(previewData.periodYear || ''),
        creation_date: previewData.creationDate || new Date().toISOString(),
        schedule: 0,
        is_nil_return: Boolean(previewData.isNilReturn),
        wages: declaredIncome,
        ss_contributions: ssContribution,
        lv_contributions: levyContribution,
        pe_contributions: 0,
        ss_penalty: penaltyAmount,
        lv_penalty: 0,
        pe_penalty: 0,
        total: totalContribution,
        company_id: 0,
        company_name: previewData.name || '',
        registration_number: previewData.socialSecurityNumber || '',
        trade_name: previewData.occupation || '',
        address: previewData.address || '',
      },
      existing_payment: null,
      is_paid: false,
    };
  }

  const totals = previewData.totals || {};
  const period = previewData.periodLabel || [previewData.periodMonth, previewData.periodYear].filter(Boolean).join(' ');
  const companyId = Number(companyIdParam || 0);
  const isNwd = legacyType === 'nwd';
  const ssContributions = isNwd ? 0 : Number(totals.ssTotal || 0);
  const lvContributions = Number(totals.levyTotal || 0);
  const peContributions = isNwd ? 0 : Number(totals.peTotal || 0);
  const ssPenalty = isNwd ? 0 : Number(totals.ssPenalty || 0);
  const lvPenalty = Number(totals.levyPenalty || 0);
  const pePenalty = isNwd ? 0 : Number(totals.pePenalty || 0);
  const grandTotal = Number(totals.grandTotal || (ssContributions + lvContributions + peContributions + ssPenalty + lvPenalty + pePenalty));

  return {
    c3_details: {
      period,
      period_month: String(previewData.periodMonth || ''),
      period_year: String(previewData.periodYear || ''),
      creation_date: previewData.creationDate || new Date().toISOString(),
      schedule: Number(previewData.scheduleNumber || 0),
      is_nil_return: Boolean(previewData.isNilReturn),
      wages: Number(totals.totalWages || 0),
      ss_contributions: ssContributions,
      lv_contributions: lvContributions,
      pe_contributions: peContributions,
      ss_penalty: ssPenalty,
      lv_penalty: lvPenalty,
      pe_penalty: pePenalty,
      total: grandTotal,
      company_id: companyId,
      company_name: previewData.companyName || '',
      registration_number: previewData.registrationNumber || '',
      trade_name: previewData.tradeName || '',
      address: previewData.address || '',
    },
    existing_payment: null,
    is_paid: false,
  };
}

export default OfflinePaymentPage;
