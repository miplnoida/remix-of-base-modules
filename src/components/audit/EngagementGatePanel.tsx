import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, FileText, FolderOpen, AlertTriangle, MessageSquare, Loader2, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CompletenessResult, EngagementGateResult } from '@/hooks/useAuditWorkflowGates';

interface EngagementGatePanelProps {
  canStart?: EngagementGateResult | null;
  completeness?: CompletenessResult | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

function GateItem({ label, passed, detail, icon: Icon }: { label: string; passed: boolean; detail?: string; icon: React.ElementType }) {
  return (
    <div className={`flex items-center gap-3 rounded-md border px-3 py-2.5 ${passed ? 'border-green-200 bg-green-50/30' : 'border-destructive/30 bg-destructive/5'}`}>
      <Icon className={`h-4 w-4 shrink-0 ${passed ? 'text-green-600' : 'text-destructive'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${passed ? 'text-green-800' : 'text-destructive'}`}>{label}</p>
        {detail && <p className="text-xs text-muted-foreground truncate">{detail}</p>}
      </div>
      {passed ? (
        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-destructive shrink-0" />
      )}
    </div>
  );
}

export function EngagementGatePanel({ canStart, completeness, isLoading, onRefresh }: EngagementGatePanelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">Checking gates...</span>
        </CardContent>
      </Card>
    );
  }

  const hasStartGate = canStart !== null && canStart !== undefined;
  const hasCompleteness = completeness !== null && completeness !== undefined;

  if (!hasStartGate && !hasCompleteness) return null;

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-primary" />
          Execution Gate Checklist
        </CardTitle>
        {onRefresh && (
          <Button variant="ghost" size="sm" onClick={onRefresh} className="text-xs h-7">
            Refresh
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Start gate checks */}
        {hasStartGate && (
          <>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Execution Prerequisites</p>
            <GateItem
              icon={FileText}
              label="Parent plan approved"
              passed={canStart!.can_start || !canStart!.reasons.some(r => r.includes('plan status'))}
              detail={canStart!.plan_status ? `Plan status: ${canStart!.plan_status}` : undefined}
            />
            <GateItem
              icon={FileText}
              label="Lead auditor assigned"
              passed={!canStart!.reasons.some(r => r.includes('lead auditor'))}
            />
            <GateItem
              icon={FileText}
              label="Planned dates set"
              passed={!canStart!.reasons.some(r => r.includes('dates'))}
            />
            <GateItem
              icon={Send}
              label="Audit intimation sent"
              passed={!canStart!.reasons.some(r => r.includes('intimation'))}
              detail={canStart!.reasons.find(r => r.includes('intimation'))}
            />
            <GateItem
              icon={Send}
              label="Team & scope notice sent"
              passed={!canStart!.reasons.some(r => r.includes('Team and scope'))}
              detail={canStart!.reasons.find(r => r.includes('Team and scope'))}
            />
            {canStart!.can_start && (
              <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">✓ Ready to start execution</Badge>
            )}
          </>
        )}

        {/* Completeness checks */}
        {hasCompleteness && (
          <>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-3">Closure / Report Readiness</p>
            <GateItem
              icon={FolderOpen}
              label={`Evidence (${completeness!.evidence_count} item${completeness!.evidence_count !== 1 ? 's' : ''})`}
              passed={!completeness!.reasons.some(r => r.includes('evidence'))}
              detail={completeness!.reasons.find(r => r.includes('evidence'))}
            />
            <GateItem
              icon={FileText}
              label={`Working Papers (${completeness!.working_papers_count})`}
              passed={!completeness!.reasons.some(r => r.includes('working paper'))}
              detail={completeness!.reasons.find(r => r.includes('working paper'))}
            />
            <GateItem
              icon={AlertTriangle}
              label={`Findings (${completeness!.findings_count})`}
              passed={!completeness!.reasons.some(r => r.includes('finding'))}
              detail={completeness!.reasons.find(r => r.includes('finding'))}
            />
            <GateItem
              icon={MessageSquare}
              label="Management Responses"
              passed={!completeness!.reasons.some(r => r.includes('management response'))}
              detail={completeness!.reasons.find(r => r.includes('management response'))}
            />
            {completeness!.passed ? (
              <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">✓ Ready for closure / reporting</Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">✗ Completeness requirements not met</Badge>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
