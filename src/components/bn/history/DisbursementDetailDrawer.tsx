import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { BnStatusBadge } from '@/components/bn/shared/BnStatusBadge';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { CreditCard, Lock, Database, ExternalLink, AlertTriangle } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';
import type { HistoricalDisbursementRecord } from '@/services/bn/historicalInquiryService';
import { useNavigate } from 'react-router-dom';

interface DisbursementDetailDrawerProps {
  record: HistoricalDisbursementRecord | null;
  open: boolean;
  onClose: () => void;
}

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between items-start py-1.5">
    <span className="text-xs text-muted-foreground shrink-0 w-36">{label}</span>
    <span className="text-sm text-right">{value || '—'}</span>
  </div>
);

const SOURCE_DESCRIPTIONS: Record<string, string> = {
  cl_cheques: 'Standard issued benefit payment — persisted in cl_cheques.',
  cl_cheques_holding: 'Payment placed on hold pending condition clearance — persisted in cl_cheques_holding.',
  cl_cheques_survivor: 'Survivor-specific benefit payment — persisted in cl_cheques_survivor.',
};

export const DisbursementDetailDrawer: React.FC<DisbursementDetailDrawerProps> = ({ record, open, onClose }) => {
  const navigate = useNavigate();
  if (!record) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Disbursement Detail
            </SheetTitle>
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Read-Only</span>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-6 space-y-6">
            {/* Amount & Status */}
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold font-mono">
                  ${record.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <BnStatusBadge status={record.status} dot />
              </div>
              <p className="text-sm text-muted-foreground">{record.payee_name}</p>
            </div>

            {/* Source Lineage */}
            <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-1.5">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Persistence Source:</span>
                <Badge variant="outline" className="text-[10px] font-mono">{record.source_table}</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {SOURCE_DESCRIPTIONS[record.source_table] || 'Unknown source table.'}
              </p>
              {record.legacy_ref && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Legacy Ref:</span>
                  <span className="text-xs font-mono font-medium">{record.legacy_ref}</span>
                </div>
              )}
            </div>

            {/* Holding-specific */}
            {record.source_table === 'cl_cheques_holding' && record.hold_reason && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Hold Reason</p>
                  <p className="text-sm">{record.hold_reason}</p>
                </div>
              </div>
            )}

            {/* Survivor-specific */}
            {record.source_table === 'cl_cheques_survivor' && record.survivor_id && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <CreditCard className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Survivor ID</p>
                  <p className="text-sm font-mono">{record.survivor_id}</p>
                </div>
              </div>
            )}

            <Separator />

            {/* Payment Info */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Payment Information</h4>
              <DetailRow label="Cheque / Ref #" value={<span className="font-mono">{record.cheque_no}</span>} />
              <DetailRow label="Claim Number" value={<span className="font-mono">{record.claim_number}</span>} />
              <DetailRow label="SSN" value={<span className="font-mono">{record.ssn}</span>} />
              <DetailRow label="Payment Method" value={record.payment_method} />
              <DetailRow label="Payment Date" value={record.payment_date ? formatDateForDisplay(record.payment_date) : null} />
              <DetailRow label="Issue Date" value={record.issue_date ? formatDateForDisplay(record.issue_date) : null} />
            </div>

            <Separator />

            {/* Period & Banking */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Period & Banking</h4>
              <DetailRow label="Period Start" value={record.period_start ? formatDateForDisplay(record.period_start) : null} />
              <DetailRow label="Period End" value={record.period_end ? formatDateForDisplay(record.period_end) : null} />
              <DetailRow label="Bank Code" value={record.bank_code} />
              <DetailRow label="Account (masked)" value={record.account_number ? <span className="font-mono">{record.account_number}</span> : null} />
            </div>

            {/* cn_* disclaimer */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <strong>Note:</strong> This record reflects an <em>outbound benefit disbursement</em> persisted in the 
                claims payment structure ({record.source_table}). Incoming collections, receipts, and refunds 
                are tracked separately in cn_payment*, cn_receipt, and cn_refund tables and are not shown here.
              </p>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-background p-4 flex items-center gap-2">
          <Button
            variant="outline" size="sm" className="gap-1.5"
            onClick={() => navigate(`/bn/person360?ssn=${record.ssn}`)}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Person 360
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
