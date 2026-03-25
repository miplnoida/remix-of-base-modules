import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, FileText, AlertTriangle, Loader2, Lock } from 'lucide-react';
import type { ClosureGateResult } from '@/hooks/useAuditCommunicationStages';

interface ClosureGatePanelProps {
  closureGate: ClosureGateResult | null | undefined;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function ClosureGatePanel({ closureGate, isLoading, onRefresh }: ClosureGatePanelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">Checking closure readiness...</span>
        </CardContent>
      </Card>
    );
  }

  if (!closureGate) return null;

  const checks = [
    { label: 'Report issued', passed: !closureGate.reasons.some(r => r.includes('report')), icon: FileText },
    { label: 'All findings have action plans', passed: !closureGate.reasons.some(r => r.includes('action plan')), icon: CheckCircle2 },
    { label: 'Follow-up structure created', passed: !closureGate.reasons.some(r => r.includes('follow-up')), icon: CheckCircle2 },
    { label: 'Exit meeting completed', passed: !closureGate.reasons.some(r => r.includes('Exit meeting')), icon: CheckCircle2 },
  ];

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          Closure Gate Checklist
        </CardTitle>
        {onRefresh && (
          <Button variant="ghost" size="sm" onClick={onRefresh} className="text-xs h-7">Refresh</Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {checks.map((check, i) => (
          <div key={i} className={`flex items-center gap-3 rounded-md border px-3 py-2 ${check.passed ? 'border-green-200 bg-green-50/30' : 'border-destructive/30 bg-destructive/5'}`}>
            <check.icon className={`h-4 w-4 shrink-0 ${check.passed ? 'text-green-600' : 'text-destructive'}`} />
            <span className={`text-sm font-medium flex-1 ${check.passed ? 'text-green-800' : 'text-destructive'}`}>{check.label}</span>
            {check.passed ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" /> : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
          </div>
        ))}

        {closureGate.can_close ? (
          <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">✓ Ready for closure</Badge>
        ) : (
          <Badge variant="destructive" className="text-xs">✗ Closure requirements not met</Badge>
        )}

        {closureGate.reasons.length > 0 && !closureGate.can_close && (
          <div className="mt-2 space-y-1">
            {closureGate.reasons.map((r, i) => (
              <div key={i} className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                {r}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
