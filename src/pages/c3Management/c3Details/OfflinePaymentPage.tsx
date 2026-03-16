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
import {
  getContributionPreview,
  getNwdContributionPreview,
  getSeContributionPreview,
  getOfflinePaymentData,
  searchBimaReceipt,
  submitOfflinePayment,
  type OfflinePaymentPageData,
  type BimaSearchResult,
  type SubmitPaymentResult,
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
type PaymentMode = 'Cash' | 'Cheque' | 'JV' | 'CreditDebit' | '';

function mapMopCode(code: string): PaymentMode {
  if (!code) return '';
  const c = code.toUpperCase();
  if (c === 'CSH') return 'Cash';
  if (c === 'CHQ') return 'Cheque';
  if (c === 'CRD') return 'CreditDebit';
  if (c === 'JV') return 'JV';
  return '';
}

// ─── Inline Report Components ─────────────────────────
// (Employer, NWD, SE report rendering — kept from preview data)

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

// ─── Post-Payment Receipt Screen ──────────────────────
const PostPaymentReceipt: React.FC<{
  result: SubmitPaymentResult;
  onGoBack: () => void;
}> = ({ result, onGoBack }) => {
  const handleDownload = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Payment Confirmation</title><style>
      body { font-family: Arial, sans-serif; max-width: 500px; margin: 40px auto; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 8px 12px; border-bottom: 1px solid #eee; }
      td:first-child { font-weight: bold; }
      .header { text-align: center; margin-bottom: 20px; }
    </style></head><body>
      <div class="header"><h2>Social Security Board</h2><h3>Payment Confirmation</h3></div>
      <table>
        <tr><td>Payment Mode</td><td>${result.paymentStatus}</td></tr>
        <tr><td>Payment Type</td><td>${result.mode}</td></tr>
        <tr><td>Bima Ref No.</td><td>${result.bimaRefNum}</td></tr>
        <tr><td>Transaction</td><td>${result.paymentGatewayTransactionID}</td></tr>
        <tr><td>Amount</td><td>$${result.needToPay.toFixed(2)}</td></tr>
        <tr><td>Customer</td><td>${result.refCustomerName}</td></tr>
        <tr><td>Trans Date</td><td>${result.transactionDate}</td></tr>
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

          <table className="w-full text-sm">
            <tbody>
              {[
                ['Payment Mode', result.paymentStatus],
                ['Payment Type', result.mode],
                ['Bima Ref No.', result.bimaRefNum],
                ['Transaction', result.paymentGatewayTransactionID],
                ['Amount', fmt(result.needToPay)],
                ['Customer', result.refCustomerName],
                ['Trans Date', result.transactionDate],
              ].map(([label, value]) => (
                <tr key={label} className="border-b">
                  <td className="py-2 font-bold w-1/3">{label}</td>
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

  // Section states
  const [reportOpen, setReportOpen] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);

  // BEMA search (manual receipt input, search on blur)
  const [receiptNumber, setReceiptNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [bemaData, setBemaData] = useState<BimaSearchResult | null>(null);

  // Payment mode
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('');
  // Conditional fields
  const [bankName, setBankName] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [jvNumber, setJvNumber] = useState('');
  const [jvDate, setJvDate] = useState('');
  const [creditCardCode, setCreditCardCode] = useState('');

  // Pay action
  const [paying, setPaying] = useState(false);

  // Post-payment receipt
  const [paymentResult, setPaymentResult] = useState<SubmitPaymentResult | null>(null);

  const backRoute = type === 'c3' ? '/c3-management/c3-contribution'
    : type === 'nw_director' ? '/c3-management/nw-director'
    : '/c3-management/self-employed-c3';

  // Load page data (report + payment details)
  useEffect(() => {
    if (!id) return;
    setLoading(true);

    // Load report preview data
    const legacyType = type === 'c3' ? 'employer' : type === 'nw_director' ? 'nwd' : 'self_employed';
    const previewPromise = type === 'self_employed'
      ? getSeContributionPreview(id)
      : companyIdParam
        ? (type === 'c3'
            ? getContributionPreview(id, companyIdParam)
            : getNwdContributionPreview(id, companyIdParam))
        : Promise.resolve({ data: null });

    // Also try to load offline payment data
    const paymentDataPromise = getOfflinePaymentData({
      header_id: id,
      entity_type: type,
    }).catch(() => ({ data: null }));

    Promise.all([previewPromise, paymentDataPromise])
      .then(([reportRes, paymentRes]) => {
        setReportData(reportRes.data || null);

        if (paymentRes.data) {
          setPageData(paymentRes.data);
        } else if (reportRes.data) {
          // Build fallback from preview data
          setPageData(buildFallbackPageData(legacyType as any, reportRes.data, companyIdParam));
        }
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load page data');
      })
      .finally(() => setLoading(false));
  }, [id, type, companyIdParam]);

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

  // Search BIMA receipt on blur
  const handleSearchReceipt = useCallback(async () => {
    if (!receiptNumber.trim()) return;
    setSearching(true);
    try {
      const res = await searchBimaReceipt({
        receipt_id: receiptNumber.trim(),
        header_id: id,
        entity_type: type,
      });
      if (!res.data) {
        toast.error('Receipt number not found. Please verify and try again.');
        return;
      }
      setBemaData(res.data);
      // Auto-set payment mode from mopCode
      const mode = mapMopCode(res.data.mopCode);
      if (mode) setPaymentMode(mode);
    } catch (err: any) {
      toast.error(err.message || 'Unable to connect to payment system. Please try again later.');
    } finally {
      setSearching(false);
    }
  }, [receiptNumber, id, type]);

  // Validate & submit payment
  const handlePay = useCallback(async () => {
    if (!bemaData || !pageData) return;
    if (!paymentMode) { toast.error('Please select a payment type'); return; }

    // Validate conditional fields
    if (paymentMode === 'Cheque') {
      if (!bankName.trim()) { toast.error('Bank Name is required for Cheque payment'); return; }
      if (!chequeNo.trim() || chequeNo.length < 3) { toast.error('Cheque Number must be at least 3 digits'); return; }
      if (!chequeDate) { toast.error('Cheque Date is required'); return; }
    }
    if (paymentMode === 'JV') {
      if (!jvNumber.trim()) { toast.error('Journal Voucher Number is required'); return; }
      if (!jvDate) { toast.error('Journal Voucher Date is required'); return; }
    }
    if (paymentMode === 'CreditDebit') {
      if (!creditCardCode.trim() || creditCardCode.length !== 4) { toast.error('Credit Card last 4 digits are required'); return; }
    }

    setPaying(true);
    try {
      const transDate = bemaData.batch?.batchDate
        ? fmtDate(bemaData.batch.batchDate)
        : format(new Date(), 'dd-MMM-yyyy');

      const res = await submitOfflinePayment({
        header_id: id,
        entity_type: type,
        mode: paymentMode,
        transaction_date: transDate,
        bima_ref_num: bemaData.batch?.batchNumber || '',
        need_to_pay: bemaData.totalAmount || pageData.c3_details.total,
        bank_name: paymentMode === 'Cheque' ? bankName : null,
        check_num: paymentMode === 'Cheque' ? chequeNo : null,
        check_date: paymentMode === 'Cheque' ? chequeDate : null,
        jv_number: paymentMode === 'JV' ? jvNumber : null,
        jv_date: paymentMode === 'JV' ? jvDate : null,
        credit_card_code: paymentMode === 'CreditDebit' ? creditCardCode : null,
      });
      toast.success('Offline payment recorded successfully');
      if (res.data) {
        setPaymentResult(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply payment');
    } finally {
      setPaying(false);
    }
  }, [bemaData, pageData, paymentMode, id, type, bankName, chequeNo, chequeDate, jvNumber, jvDate, creditCardCode]);

  const c3 = pageData?.c3_details;

  if (loading) {
    return (
      <div className="p-6 flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show post-payment receipt screen
  if (paymentResult) {
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
          <PostPaymentReceipt result={paymentResult} onGoBack={() => navigate(backRoute)} />
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
              {type === 'c3' && <EmployerReport data={reportData} printRef={printRef} />}
              {type === 'nw_director' && <NwdReport data={reportData} printRef={printRef} />}
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
                {/* Left: Payment Details Form */}
                <Card className="border">
                  <CardContent className="pt-4 space-y-4">
                    <h3 className="font-bold text-sm text-green-700">Payment Details</h3>

                    {/* Receipt Number — manual input, search on blur */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Receipt Number *</Label>
                      <div className="flex gap-1">
                        <Input
                          placeholder="Enter Receipt Number (e.g. 123BER)"
                          value={receiptNumber}
                          onChange={(e) => setReceiptNumber(e.target.value)}
                          onBlur={handleSearchReceipt}
                          maxLength={64}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearchReceipt()}
                        />
                        <Button variant="ghost" size="icon" onClick={handleSearchReceipt} disabled={searching}>
                          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Batch Number (auto-filled, read-only) */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Batch Number</Label>
                      <Input value={bemaData?.batch?.batchNumber || ''} readOnly className="bg-muted/30" />
                    </div>

                    {/* Transaction Date (auto-filled) */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Transaction Date</Label>
                      <Input value={bemaData?.batch?.batchDate ? fmtDate(bemaData.batch.batchDate) : ''} readOnly className="bg-muted/30" />
                    </div>

                    {/* Payment Mode selection */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Select Payment Type</Label>
                      <div className="space-y-1.5">
                        {([
                          ['Cash', 'Cash Payment'],
                          ['Cheque', 'Cheque Payment'],
                          ['JV', 'JV Payment'],
                          ['CreditDebit', 'Credit Card'],
                        ] as [PaymentMode, string][]).map(([val, label]) => (
                          <label key={val} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="radio"
                              name="paymentMode"
                              checked={paymentMode === val}
                              onChange={() => setPaymentMode(val)}
                              className="accent-primary"
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Conditional fields */}
                    {paymentMode === 'Cheque' && (
                      <div className="space-y-2 border-l-2 border-primary pl-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Bank Name *</Label>
                          <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Cheque No. *</Label>
                          <Input value={chequeNo} onChange={(e) => setChequeNo(e.target.value.replace(/\D/g, ''))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Cheque Date *</Label>
                          <Input type="date" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} />
                        </div>
                      </div>
                    )}
                    {paymentMode === 'JV' && (
                      <div className="space-y-2 border-l-2 border-primary pl-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Journal Voucher No. *</Label>
                          <Input value={jvNumber} onChange={(e) => setJvNumber(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Journal Voucher Date *</Label>
                          <Input type="date" value={jvDate} onChange={(e) => setJvDate(e.target.value)} />
                        </div>
                      </div>
                    )}
                    {paymentMode === 'CreditDebit' && (
                      <div className="space-y-2 border-l-2 border-primary pl-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Credit Card Number (last 4 digits) *</Label>
                          <Input value={creditCardCode} onChange={(e) => setCreditCardCode(e.target.value.replace(/\D/g, '').slice(0, 4))} maxLength={4} />
                        </div>
                      </div>
                    )}

                    {/* Total Contributions (from BIMA) */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Total Contributions</Label>
                      <Input value={bemaData ? fmt(bemaData.totalAmount) : '$0.00'} readOnly className="bg-muted/30" />
                    </div>

                    {/* Total Pay (from C3 header) */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Total Pay</Label>
                      <Input value={c3 ? fmt(c3.total) : '$0.00'} readOnly className="bg-muted/30" />
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-between pt-4">
                      <Button variant="outline" size="sm" onClick={() => navigate(backRoute)}>
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back
                      </Button>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(backRoute)}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={!bemaData || paying || !paymentMode}
                          onClick={handlePay}
                        >
                          {paying ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <DollarSign className="h-4 w-4 mr-1" />}
                          Pay
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Right: Payment Report List */}
                <Card className="border">
                  <CardContent className="pt-4 space-y-3">
                    <h3 className="font-bold text-sm text-green-700">Payment Report List</h3>

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
                        <span className="font-medium">Total Wages ($)</span>
                        <span>{c3 ? fmt(c3.wages) : ''}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b">
                        <span className="font-medium">Social Security</span>
                        <span>{c3 ? fmt(c3.ss_contributions) : ''}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b">
                        <span className="font-medium">Levy ($)</span>
                        <span>{c3 ? fmt(c3.lv_contributions) : ''}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b">
                        <span className="font-medium">Contribution</span>
                        <span>{c3 ? fmt(c3.ss_contributions) : ''}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b">
                        <span className="font-medium">Penalty ($)</span>
                        <span>{c3 ? fmt((c3.ss_penalty || 0) + (c3.lv_penalty || 0) + (c3.pe_penalty || 0)) : ''}</span>
                      </div>
                      {type === 'c3' && (
                        <div className="flex justify-between py-1.5 border-b">
                          <span className="font-medium">Severance ($)</span>
                          <span>{c3 ? fmt(c3.pe_contributions) : ''}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between font-semibold text-red-600 pt-2 text-sm">
                      <span>Total ($)</span>
                      <span>{c3 ? fmt(c3.total) : '$0.00'}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
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
