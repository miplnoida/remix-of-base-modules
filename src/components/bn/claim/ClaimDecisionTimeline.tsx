import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Clock, Download, AlertTriangle, Shield, ArrowRight } from 'lucide-react';
import { useBnClaimDecisions } from '@/hooks/bn/useBnDecisionEngine';
import { BN_ACTION_LABELS, BN_CLAIM_STATUS_LABELS } from '@/types/bn';
import { formatDateForDisplay } from '@/lib/format-config';
import { exportDecisionAudit } from '@/services/bn/decisionEngine';
import { toast } from 'sonner';
import type { BnClaimDecision } from '@/types/bn';

interface ClaimDecisionTimelineProps {
  claimId: string;
}

export function ClaimDecisionTimeline({ claimId }: ClaimDecisionTimelineProps) {
  const { data: decisions = [], isLoading } = useBnClaimDecisions(claimId);

  const handleExport = async () => {
    try {
      const snapshot = await exportDecisionAudit(claimId);
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `decision-audit-${claimId.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Audit snapshot exported');
    } catch {
      toast.error('Failed to export audit');
    }
  };

  const getActionColor = (actionCode: string) => {
    switch (actionCode) {
      case 'APPROVE': return 'bg-green-500/10 text-green-700 border-green-300';
      case 'DENY': case 'DISALLOW': return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'SUSPEND': case 'HOLD': return 'bg-orange-500/10 text-orange-700 border-orange-300';
      case 'ESCALATE': return 'bg-yellow-500/10 text-yellow-700 border-yellow-300';
      case 'SEND_BACK': return 'bg-blue-500/10 text-blue-700 border-blue-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return <Card><CardContent className="py-6 text-sm text-muted-foreground">Loading decisions...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-primary" />
          Decision Timeline
        </CardTitle>
        {decisions.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-3 w-3" /> Export Audit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {decisions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No decisions recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {decisions.map((decision: BnClaimDecision, index: number) => (
              <div key={decision.id}>
                <div className={`rounded-lg border p-4 ${getActionColor(decision.action_code)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {(BN_ACTION_LABELS as any)[decision.action_code] || decision.action_code}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs">
                        <span>{(BN_CLAIM_STATUS_LABELS as any)[decision.from_status] || decision.from_status}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-medium">{(BN_CLAIM_STATUS_LABELS as any)[decision.to_status] || decision.to_status}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDateForDisplay(decision.performed_at)}
                    </span>
                  </div>

                  {decision.reason_code && (
                    <p className="mt-2 text-sm">
                      <span className="font-medium">Reason:</span> {decision.reason_code.reason_label}
                    </p>
                  )}

                  {decision.narrative && (
                    <p className="mt-1 text-sm italic">"{decision.narrative}"</p>
                  )}

                  {decision.effective_date && (
                    <p className="mt-1 text-xs">
                      Effective: {formatDateForDisplay(decision.effective_date)}
                    </p>
                  )}

                  {decision.override_id && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
                      <AlertTriangle className="h-3 w-3" />
                      Override applied
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    by {decision.performed_by}
                  </div>
                </div>
                {index < decisions.length - 1 && (
                  <div className="ml-6 h-4 border-l-2 border-muted" />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
