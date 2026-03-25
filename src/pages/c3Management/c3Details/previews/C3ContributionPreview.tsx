import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Printer, Download, User } from 'lucide-react';
import ssbLogo from '@/assets/stkitts-logo.png';

interface Props {
  open: boolean;
  onClose: () => void;
  data: any;
  loading: boolean;
}

function fmt(val: number | null | undefined) {
  return `$${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const C3ContributionPreview: React.FC<Props> = ({ open, onClose, data, loading }) => {
  const printRef = useRef<HTMLDivElement>(null);

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
      .text-red-600 { color: red; }
    </style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  };

  if (!open) return null;

  const companyName = data?.companyName || '';
  const tradeName = data?.tradeName || '';
  const regNo = data?.registrationNumber || '';
  const address = data?.address || '';
  const periodLabel = data?.periodLabel || '';
  const employees = data?.employees || [];
  const totals = data?.totals || {};
  const ag = data?.accountantGeneral || {};
  const ssb = data?.socialSecurityBoard || {};
  
  const creationDate = data?.creationDate || '';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[1200px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-4 w-4" /> Report
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div ref={printRef} className="bg-white p-4 text-xs">
              {/* Header */}
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h2 className="text-center font-bold text-sm">THE ST.CHRISTOPHER AND NEVIS - SOCIAL SECURITY BOARD</h2>
                  <h3 className="text-center font-bold text-xs">STATEMENT OF WAGES AND CONTRIBUTIONS</h3>
                  <p className="text-center text-[10px] text-muted-foreground">
                    Social Security Act, 1977, Housing and Social Development Levy Act, 1997, and the Protection of Employment Act, 1986
                  </p>
                </div>
                <img src={ssbLogo} alt="SSB Logo" className="h-12 w-12 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>

              <p className="text-xs mb-1"><strong>NB.</strong> To be used when reporting payments related to <strong>Employees.</strong></p>
              <p className="text-red-600 text-xs mb-3">(This form is in quadruplicate. Please read these notes carefully.)</p>

              {/* Employer Info */}
              <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
                <div><strong>Name of Employer</strong> <span className="border-b border-black ml-1">{companyName}</span></div>
                <div><strong>Trade Name</strong> <span className="border-b border-black ml-1">{tradeName}</span></div>
                <div><strong>Employer's Registration No.</strong> <span className="border border-black px-2">{regNo}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                <div><strong>Address (Location & Box No. If address changed)</strong> <span className="border-b border-black ml-1">{address}</span></div>
                <div className="text-right"><strong>Employee(s)</strong> <span className="border border-black px-2">{data?.employeeCount || employees.length}</span></div>
              </div>

              <p className="text-xs mb-1">
                <strong>To: Director of Social Security,</strong><br />
                &nbsp;&nbsp;&nbsp;&nbsp;With this statement is a cheque and/or cash in respect of the Acts mentioned above for the month of: <span className="border-b border-black px-4 font-semibold">{periodLabel}</span>
              </p>

              <div className="flex gap-8 mb-2 text-xs">
                <div>(1) Director, Social Security Board <span className="border-b border-black px-4 font-semibold">{fmt(ag.socialSecurity)}</span></div>
                <div>(2) Accountant General <span className="border-b border-black px-4 font-semibold">{fmt((ssb.levy || 0) + (ssb.severance || 0))}</span></div>
                <div className="ml-auto">Total <span className="border-b border-black px-4 font-semibold">{fmt(totals.grandTotal)}</span></div>
              </div>

              {/* Employee Table */}
              <table className="w-full border-collapse border border-black text-[9px] mt-2">
                <thead>
                  <tr>
                    <th className="border border-black p-1">(1)</th>
                    <th className="border border-black p-1">(2)<br/>Social Security Number<br/>(6 digits)</th>
                    <th className="border border-black p-1">(3)<br/>Name of Employee<br/>(Surname First)</th>
                    <th className="border border-black p-1" colSpan={5}>(5a) Put X in the Week(s) Worked</th>
                    <th className="border border-black p-1" colSpan={7}>(6) Record Wages/Salaries</th>
                    <th className="border border-black p-1">(7)<br/>Total Wages</th>
                    <th className="border border-black p-1">(8)<br/>Levy<br/>(EE+ER)</th>
                    <th className="border border-black p-1">(9)<br/>Social Security<br/>(Total)</th>
                    <th className="border border-black p-1">(10)<br/>Remarks</th>
                  </tr>
                  <tr>
                    <th className="border border-black p-1"></th>
                    <th className="border border-black p-1"></th>
                    <th className="border border-black p-1"></th>
                    <th className="border border-black p-1">1</th>
                    <th className="border border-black p-1">2</th>
                    <th className="border border-black p-1">3</th>
                    <th className="border border-black p-1">4</th>
                    <th className="border border-black p-1">5</th>
                    <th className="border border-black p-1">WK1</th>
                    <th className="border border-black p-1">WK2</th>
                    <th className="border border-black p-1">WK3</th>
                    <th className="border border-black p-1">WK4</th>
                    <th className="border border-black p-1">WK5</th>
                    <th className="border border-black p-1">HPay</th>
                    <th className="border border-black p-1">Bonus</th>
                    <th className="border border-black p-1"></th>
                    <th className="border border-black p-1"></th>
                    <th className="border border-black p-1"></th>
                    <th className="border border-black p-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp: any, idx: number) => (
                    <tr key={idx}>
                      <td className="border border-black p-1 text-center">{idx + 1}</td>
                      <td className="border border-black p-1">{emp.ssn}</td>
                      <td className="border border-black p-1">{emp.name}</td>
                      <td className="border border-black p-1 text-center">{emp.week1 > 0 ? 'x' : ''}</td>
                      <td className="border border-black p-1 text-center">{emp.week2 > 0 ? 'x' : ''}</td>
                      <td className="border border-black p-1 text-center">{emp.week3 > 0 ? 'x' : ''}</td>
                      <td className="border border-black p-1 text-center">{emp.week4 > 0 ? 'x' : ''}</td>
                      <td className="border border-black p-1 text-center">{emp.week5 > 0 ? 'x' : ''}</td>
                      <td className="border border-black p-1 text-right">{fmt(emp.week1)}</td>
                      <td className="border border-black p-1 text-right">{fmt(emp.week2)}</td>
                      <td className="border border-black p-1 text-right">{fmt(emp.week3)}</td>
                      <td className="border border-black p-1 text-right">{fmt(emp.week4)}</td>
                      <td className="border border-black p-1 text-right">{fmt(emp.week5)}</td>
                      <td className="border border-black p-1 text-right">{fmt(emp.holidayPay)}</td>
                      <td className="border border-black p-1 text-right">{fmt(emp.bonus)}</td>
                      <td className="border border-black p-1 text-right">{fmt(emp.totalWages)}</td>
                      <td className="border border-black p-1 text-right">{fmt((emp.levyEmployee || 0) + (emp.levyEmployer || 0))}</td>
                      <td className="border border-black p-1 text-right">{fmt(emp.ssTotal)}</td>
                      <td className="border border-black p-1">{emp.remark || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Footer */}
              <div className="mt-2 text-xs space-y-0.5">
                <div className="flex justify-between"><span>a) Total wages and employee levy contribution</span><span className="border-b border-black px-4">{fmt(totals.totalWages)}</span></div>
                <div className="flex justify-between"><span>b) Employer's 3% of Wages for levy Contribution</span><span className="border-b border-black px-4">{fmt(totals.levyEmployer)}</span></div>
                <div className="flex justify-between"><span>c) Employer's 1% of Wages for Severance Payments Contribution</span><span className="border-b border-black px-4">{fmt(totals.peTotal)}</span></div>
                <div className="flex justify-between"><span>d) Levy Penalty for the month (if any)</span><span className="border-b border-black px-4">{fmt(totals.levyPenalty)}</span></div>
                <div className="flex justify-between"><span>e) Severance Penalty for month (if any)</span><span className="border-b border-black px-4">{fmt(totals.pePenalty)}</span></div>
                <div className="flex justify-between font-semibold"><span>f) Total Accountant General</span><span className="border-b border-black px-4">{fmt((ssb.levy || 0) + (ssb.severance || 0))}</span></div>
                <div className="flex justify-between"><span>g) Social Security Contribution due for the month</span><span className="border-b border-black px-4">{fmt(totals.ssTotal)}</span></div>
                <div className="flex justify-between"><span>h) Fines due for the month (if any)</span><span className="border-b border-black px-4">{fmt(totals.ssPenalty)}</span></div>
                <div className="flex justify-between font-semibold"><span>i) Total Social Security Remittance due for the month</span><span className="border-b border-black px-4">{fmt((totals.ssTotal || 0) + (totals.ssPenalty || 0))}</span></div>
              </div>

              {/* Accountant General & SSB Summary */}
              <div className="mt-3 grid grid-cols-2 gap-4 text-xs border border-black p-2">
                <div>
                  <div className="font-semibold mb-1">Accountant General</div>
                  <div className="flex justify-between"><span>Social Security:</span><span>{fmt(ag.socialSecurity)}</span></div>
                  <div className="flex justify-between"><span>Employment Insurance:</span><span>{fmt(ag.employmentInsurance)}</span></div>
                </div>
                <div>
                  <div className="font-semibold mb-1">Social Security Board</div>
                  <div className="flex justify-between"><span>Levy:</span><span>{fmt(ssb.levy)}</span></div>
                  <div className="flex justify-between"><span>Severance:</span><span>{fmt(ssb.severance)}</span></div>
                </div>
              </div>

              {/* Official Use */}
              <div className="mt-3 text-right text-[9px] text-muted-foreground">
                <div>FOR OFFICIAL USE ONLY</div>
                <div>I- DATE RECEIVED</div>
                <div>II- PAID © No</div>
              </div>

              <p className="text-xs mt-4">I/We hereby certify that the particulars stated above are true and correct to the best of my/our knowledge and belief</p>
              <div className="flex justify-between mt-6">
                <div className="text-center">
                  <div className="border-b border-black w-48 mb-1" />
                  <span>Signature of Employer or Agent</span><br />
                  <span>(Please affix office stamp)</span>
                </div>
                <div className="text-center">
                  <span>Date: <span className="border-b border-black px-6">{creationDate}</span></span>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-3 mt-4">
              <Button variant="outline" className="border-red-500 text-red-600" onClick={onClose}>
                <X className="h-4 w-4 mr-1" /> Close
              </Button>
              <Button variant="outline" className="border-green-500 text-green-600" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" /> Print
              </Button>
              <Button variant="outline" className="border-blue-500 text-blue-600" onClick={handlePrint}>
                <Download className="h-4 w-4 mr-1" /> Download PDF
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default C3ContributionPreview;
