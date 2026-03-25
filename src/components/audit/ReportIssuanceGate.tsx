import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, FileText, FolderOpen, AlertTriangle, MessageSquare, Loader2, ShieldCheck, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ReportGateResult } from '@/hooks/useAuditWorkflowGates';

interface ReportIssuanceGateProps {
  gateResult: ReportGateResult | null | undefined;
  isLoading?: boolean;
  onCheck?: () => void;
  onFinalize?: () => void;
  isFinalizing?: boolean;
}

export function ReportIssuanceGate({ gateResult, isLoading, onCheck, onFinalize, isFinalizing }: ReportIssuanceGateProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking issuance requirements...
      </div>
    );
  }

  if (!gateResult) {
    return onCheck ? (
      <Button variant="outline" size="sm" onClick={onCheck}>
        <ShieldCheck className="h-4 w-4 mr-1" />
        Check Issuance Gate
      </Button>
    ) : null;
  }

  return (
    <Card className={gateResult.can_issue ? 'border-green-200 bg-green-50/20' : 'border-destructive/30 bg-destructive/5'}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {gateResult.can_issue ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          )}
          Report Issuance Gate
          {gateResult.can_issue ? (
            <Badge className="bg-green-100 text-green-800 border-green-300 text-xs ml-auto">Passed</Badge>
          ) : (
            <Badge variant="destructive" className="text-xs ml-auto">Blocked</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded border p-2">
            <FolderOpen className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-semibold">{gateResult.evidence_count}</p>
            <p className="text-[10px] text-muted-foreground">Evidence</p>
          </div>
          <div className="rounded border p-2">
            <FileText className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-semibold">{gateResult.working_papers_count}</p>
            <p className="text-[10px] text-muted-foreground">Working Papers</p>
          </div>
          <div className="rounded border p-2">
            <AlertTriangle className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-semibold">{gateResult.findings_count}</p>
            <p className="text-[10px] text-muted-foreground">Findings</p>
          </div>
        </div>

        {gateResult.reasons.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gate Checks</p>
            {gateResult.reasons.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-destructive">
                <XCircle className="h-3 w-3 shrink-0 mt-0.5" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        )}
        {gateResult.can_issue && (
          <div className="flex items-start gap-2 text-xs text-green-700">
            <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />
            <span>All communication stages and artefact requirements met</span>
          </div>
        )}

        {gateResult.can_issue && onFinalize && (
          <Button onClick={onFinalize} disabled={isFinalizing} className="w-full mt-2" size="sm">
            {isFinalizing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
            Finalize & Issue Report
          </Button>
        )}

        {onCheck && (
          <Button variant="ghost" size="sm" onClick={onCheck} className="w-full text-xs">
            Re-check Gate
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
