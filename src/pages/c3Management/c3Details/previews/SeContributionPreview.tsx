import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Printer, Download, User } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  data: any;
  loading: boolean;
  seName: string;
  seSsn: string;
}

function fmt(val: number | null | undefined) {
  return `$${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const SeContributionPreview: React.FC<Props> = ({ open, onClose, data, loading, seName, seSsn }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>SE C3 Report</title><style>
      body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #333; padding: 4px 8px; text-align: left; font-size: 11px; }
      th { background: #f0f0f0; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .font-bold { font-weight: bold; }
    </style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  };

  if (!open) return null;

  const contribution = data?.contribution || {};
  const weeks = data?.weeks || {};
  const periodLabel = `${contribution.period_month || ''} ${contribution.period_year || ''}`;

  // Parse name into "LastName FirstName" format
  const nameParts = seName.split(' ');
  const displayName = nameParts.length >= 2 ? `${nameParts[nameParts.length - 1]} ${nameParts.slice(0, -1).join(' ')}` : seName;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto">
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
            <div ref={printRef} className="bg-white p-6 text-sm">
              <h3 className="text-center text-xs text-muted-foreground mb-1">Self Employed C3 Report</h3>
              <h2 className="text-center font-bold text-base mb-0.5">SOCIAL SECURITY BOARD</h2>
              <h3 className="text-center font-semibold text-xs mb-3">SELF EMPLOYED PERSON CONTRIBUTION REMITTANCE FORM</h3>

              <p className="text-sm mb-3"><strong className="text-base">For</strong> <span className="border-b border-black px-2">{periodLabel}</span></p>

              <div className="space-y-1.5 text-sm mb-4">
                <div><strong>Name of Self Employed:</strong> <span>{displayName}</span></div>
                <div><strong>Social Security Number</strong> <span>{seSsn}</span></div>
                <div><strong>Address: (Location & Box No.)</strong> <span>{contribution.address || ''}</span></div>
                <div><strong>Income Category Selected:</strong> <span>{contribution.income_category || ''}</span></div>
              </div>

              <p className="text-sm mb-1"><strong>To: Director Social Security.</strong></p>
              <p className="text-sm mb-3"><strong>With this statement is a cheque and/or cash for</strong> <span className="border-b border-black px-2">{fmt(contribution.total_contribution)}</span></p>

              <p className="text-center text-xs font-semibold mb-2">Complete table if you are not paying for all the weeks in this month</p>

              <table className="w-full border-collapse border border-black text-xs mb-3">
                <thead>
                  <tr>
                    <th className="border border-black p-2 text-left text-[10px]" colSpan={5}>
                      Put 'X' for wks worked, 'S' for sick leave<br/>sickness, 'M' for Maternity & 'U'<br/>for unemployment.
                    </th>
                    <th className="border border-black p-2">Self Employed Contribution</th>
                    <th className="border border-black p-2">Remarks</th>
                  </tr>
                  <tr>
                    <th className="border border-black p-1 text-center">WK1</th>
                    <th className="border border-black p-1 text-center">WK2</th>
                    <th className="border border-black p-1 text-center">WK3</th>
                    <th className="border border-black p-1 text-center">WK4</th>
                    <th className="border border-black p-1 text-center">WK5</th>
                    <th className="border border-black p-1"></th>
                    <th className="border border-black p-1"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-1 text-center">{weeks.wk1 || 'S'}</td>
                    <td className="border border-black p-1 text-center">{weeks.wk2 || 'S'}</td>
                    <td className="border border-black p-1 text-center">{weeks.wk3 || 'S'}</td>
                    <td className="border border-black p-1 text-center">{weeks.wk4 || 'S'}</td>
                    <td className="border border-black p-1 text-center">{weeks.wk5 || 'X'}</td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                  </tr>
                </tbody>
              </table>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between border-b border-dotted border-black py-1">
                  <span><strong>a) Total Contribution:</strong></span>
                  <span className="font-semibold">{fmt(contribution.total_contribution)}</span>
                </div>
                <div className="flex justify-between border-b border-dotted border-black py-1">
                  <span><strong>b) Fines:</strong></span>
                  <span>{fmt(contribution.fine_amount)}</span>
                </div>
                <div className="flex justify-between border-b border-dotted border-black py-1">
                  <span><strong>c) Grand Total:</strong></span>
                  <span className="font-semibold">{fmt((contribution.total_contribution || 0) + (contribution.fine_amount || 0))}</span>
                </div>
              </div>

              <p className="text-center text-blue-600 text-xs mt-6">
                I hereby certify that the particulars stated above are true and correct<br />
                the best of my knowledge and belief
              </p>

              <div className="flex justify-between mt-8">
                <div className="text-center">
                  <div className="border-b border-black w-40 mb-1" />
                  <span className="text-xs">Signature</span>
                </div>
                <div className="text-center">
                  <div className="border-b border-black w-40 mb-1">
                    <span className="text-xs">{contribution.creation_date || ''}</span>
                  </div>
                  <span className="text-xs">Date</span>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-3 mt-4">
              <Button variant="outline" className="border-red-500 text-red-600" onClick={onClose}><X className="h-4 w-4 mr-1" /> Close</Button>
              <Button variant="outline" className="border-green-500 text-green-600" onClick={handlePrint}><Printer className="h-4 w-4 mr-1" /> Print</Button>
              <Button variant="outline" className="border-blue-500 text-blue-600" onClick={() => handlePrint()}><Download className="h-4 w-4 mr-1" /> Download PDF</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SeContributionPreview;
