import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { BnStatusBadge } from '@/components/bn/shared/BnStatusBadge';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ExternalLink, Clock, FileText, CreditCard, Lock, Database } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';
import { useBnHistoricalClaimDetail } from '@/hooks/bn/useBnHistoricalInquiry';
import type { HistoricalClaimRecord } from '@/services/bn/historicalInquiryService';
import { useNavigate } from 'react-router-dom';

interface ClaimDetailDrawerProps {
  claim: HistoricalClaimRecord | null;
  open: boolean;
  onClose: () => void;
}

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between items-start py-1.5">
    <span className="text-xs text-muted-foreground shrink-0 w-36">{label}</span>
    <span className="text-sm text-right">{value || '—'}</span>
  </div>
);

export const ClaimDetailDrawer: React.FC<ClaimDetailDrawerProps> = ({ claim, open, onClose }) => {
  const navigate = useNavigate();
  const { data: detail, isLoading } = useBnHistoricalClaimDetail(claim?.id);

  if (!claim) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Claim Detail
            </SheetTitle>
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Read-Only</span>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-6 space-y-6">
            {/* Header Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-semibold">{claim.claim_number}</span>
                <BnStatusBadge status={claim.status} dot />
              </div>
              <p className="text-sm text-muted-foreground">{claim.benefit_name} — {claim.category}</p>
            </div>

            {/* Source Lineage */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Source:</span>
              <Badge variant="outline" className="text-[10px] font-mono">{claim.source_table}</Badge>
              {claim.legacy_ref && (
                <>
                  <span className="text-xs text-muted-foreground">Legacy Ref:</span>
                  <span className="text-xs font-mono">{claim.legacy_ref}</span>
                </>
              )}
            </div>

            <Separator />

            {/* Claim Fields */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Claim Information</h4>
              <DetailRow label="SSN" value={claim.ssn} />
              <DetailRow label="Claimant" value={claim.claimant_name} />
              <DetailRow label="Product Code" value={claim.product_code} />
              <DetailRow label="Filed Date" value={claim.entered_at ? formatDateForDisplay(claim.entered_at) : null} />
              <DetailRow label="Effective Date" value={claim.effective_date ? formatDateForDisplay(claim.effective_date) : null} />
              <DetailRow label="End Date" value={claim.end_date ? formatDateForDisplay(claim.end_date) : null} />
              <DetailRow label="Decision Date" value={claim.decision_date ? formatDateForDisplay(claim.decision_date) : null} />
              <DetailRow label="Decision Outcome" value={claim.decision_outcome} />
              <DetailRow label="Assigned To" value={claim.assigned_to} />
            </div>

            {/* Detail (JSONB) */}
            {detail?.detail && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-2">Benefit-Specific Detail</h4>
                  {Object.entries(detail.detail)
                    .filter(([k]) => !['id', 'claim_id', 'created_at', 'updated_at'].includes(k))
                    .map(([key, val]) => (
                      <DetailRow key={key} label={key.replace(/_/g, ' ')} value={String(val ?? '—')} />
                    ))}
                </div>
              </>
            )}

            {/* Event Timeline */}
            {detail?.events && detail.events.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    Event Timeline ({detail.events.length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {detail.events.map((evt) => (
                      <div key={evt.id} className="flex items-start gap-3 p-2 rounded bg-muted/30 border border-border">
                        <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">{evt.action.replace(/_/g, ' ')}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {evt.performed_at ? formatDateForDisplay(evt.performed_at) : ''}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{evt.performed_by}</p>
                          {evt.narrative && <p className="text-xs mt-0.5">{evt.narrative}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Linked Disbursements */}
            {detail?.disbursements && detail.disbursements.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4" />
                    Disbursements ({detail.disbursements.length})
                  </h4>
                  <div className="space-y-2">
                    {detail.disbursements.map((d, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border">
                        <div>
                          <span className="font-mono text-xs">{d.cheque_no || 'N/A'}</span>
                          <span className="text-xs text-muted-foreground ml-2">{d.payment_method}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-sm font-medium">
                            ${d.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                          <Badge variant="outline" className="text-[9px] ml-2">
                            {d.source_table.replace('cl_cheques', 'STD').replace('_holding', 'HELD').replace('_survivor', 'SURV')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {isLoading && (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading detail…</div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-background p-4 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => navigate(`/bn/person360?ssn=${claim.ssn}`)}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Person 360
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => navigate(`/bn/claims/${claim.id}`)}
          >
            <FileText className="h-3.5 w-3.5" />
            Open Claim
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
