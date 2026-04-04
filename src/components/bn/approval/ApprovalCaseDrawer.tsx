import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BnStatusBadge, BnEmptyState } from '@/components/bn/shared';
import { CheckCircle, XCircle, AlertTriangle, FileCheck, Calculator, ShieldCheck, Loader2 } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';
import { useBnApprovalCaseSummary } from '@/hooks/bn/useBnApprovalConsole';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface Props {
  claimId: string | null;
  onClose: () => void;
}

export const ApprovalCaseDrawer: React.FC<Props> = ({ claimId, onClose }) => {
  const { data: summary, isLoading } = useBnApprovalCaseSummary(claimId || undefined);

  return (
    <Sheet open={!!claimId} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Case Review</SheetTitle>
        </SheetHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && !summary && (
          <BnEmptyState type="error" description="Could not load case details." />
        )}

        {summary && (
          <div className="space-y-5 mt-4">
            {/* Claim Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-lg">
                  {summary.claim.claim_number || summary.claim.id.slice(0, 8)}
                </span>
                <BnStatusBadge status={summary.claim.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">SSN:</span>{' '}
                  <span className="font-mono">{summary.claim.ssn}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Benefit:</span>{' '}
                  {summary.product?.benefit_name || '—'}
                </div>
                <div>
                  <span className="text-muted-foreground">Claim Date:</span>{' '}
                  {formatDateForDisplay(summary.claim.claim_date)}
                </div>
                <div>
                  <span className="text-muted-foreground">Priority:</span>{' '}
                  <Badge variant={summary.claim.priority === 'URGENT' ? 'destructive' : 'secondary'} className="text-xs">
                    {summary.claim.priority}
                  </Badge>
                </div>
              </div>

              {/* Maker-checker indicator */}
              {summary.makerUserCode && (
                <div className="text-xs text-muted-foreground">
                  Submitted by: <span className="font-mono">{summary.makerUserCode}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Eligibility */}
            <div className="space-y-1">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Eligibility
              </h4>
              {summary.eligibility ? (
                <div className="flex items-center gap-2">
                  {summary.eligibility.overall_result ? (
                    <Badge className="bg-green-600 text-white text-xs">PASSED</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">FAILED</Badge>
                  )}
                  {summary.eligibility.override_applied && (
                    <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">OVERRIDE</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDateForDisplay(summary.eligibility.check_date)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <XCircle className="h-3.5 w-3.5" /> Not checked
                </div>
              )}
            </div>

            <Separator />

            {/* Calculation */}
            <div className="space-y-1">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Calculator className="h-4 w-4" /> Calculation
              </h4>
              {summary.calculation ? (
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded border p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Weekly</p>
                    <p className="font-mono font-bold text-sm">${(summary.calculation.weekly_rate ?? 0).toFixed(2)}</p>
                  </div>
                  <div className="rounded border p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Lump Sum</p>
                    <p className="font-mono font-bold text-sm">${(summary.calculation.lump_sum ?? 0).toFixed(2)}</p>
                  </div>
                  <div className="rounded border p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Total</p>
                    <p className="font-mono font-bold text-sm">${(summary.calculation.total_payable ?? 0).toFixed(2)}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <XCircle className="h-3.5 w-3.5" /> Not calculated
                </div>
              )}
            </div>

            <Separator />

            {/* Evidence */}
            <div className="space-y-1">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <FileCheck className="h-4 w-4" /> Evidence
              </h4>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-green-600">{summary.evidence.verified} verified</span>
                {summary.evidence.pending > 0 && (
                  <span className="text-amber-500">{summary.evidence.pending} pending</span>
                )}
                {summary.evidence.missing > 0 && (
                  <span className="text-destructive">{summary.evidence.missing} missing</span>
                )}
                <span className="text-muted-foreground">of {summary.evidence.total}</span>
              </div>
              {summary.evidence.missing === 0 && summary.evidence.pending === 0 && summary.evidence.total > 0 ? (
                <Badge className="bg-green-600 text-white text-xs">Complete</Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">Incomplete</Badge>
              )}
            </div>

            <Separator />

            {/* Latest Decision */}
            {summary.latestDecision && (
              <div className="space-y-1">
                <h4 className="text-sm font-medium">Latest Decision</h4>
                <div className="text-sm">
                  <span className="font-medium">{summary.latestDecision.action_code}</span>
                  {' → '}
                  <BnStatusBadge status={summary.latestDecision.to_status} />
                  <span className="text-xs text-muted-foreground ml-2">
                    by {summary.latestDecision.performed_by} on {formatDateForDisplay(summary.latestDecision.performed_at)}
                  </span>
                </div>
                {summary.latestDecision.narrative && (
                  <p className="text-xs text-muted-foreground italic">"{summary.latestDecision.narrative}"</p>
                )}
              </div>
            )}

            <Separator />

            {/* Links */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/bn/claims/${summary.claim.id}`}>Open Workbench</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/bn/claims/${summary.claim.id}/determination`}>View Determination</Link>
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
