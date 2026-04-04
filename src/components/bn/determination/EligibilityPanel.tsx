import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';
import type { EligibilitySnapshot } from '@/services/bn/determinationService';
import { BnEmptyState } from '@/components/bn/shared';

interface Props {
  snapshots: EligibilitySnapshot[];
}

export const EligibilityPanel: React.FC<Props> = ({ snapshots }) => {
  const latest = snapshots[0];

  if (!latest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Eligibility Check
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BnEmptyState type="empty" title="No eligibility check performed" description="Run eligibility validation from the action bar." />
        </CardContent>
      </Card>
    );
  }

  const rules = (latest.rule_results || []) as Array<{
    ruleCode?: string;
    ruleName?: string;
    ruleGroup?: string;
    passed?: boolean;
    actualValue?: unknown;
    requiredValue?: unknown;
    message?: string;
    severity?: string;
  }>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Eligibility Check
          </span>
          <div className="flex items-center gap-2">
            {latest.overall_result ? (
              <Badge className="bg-green-600 text-white text-xs">PASSED</Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">FAILED</Badge>
            )}
            {latest.override_applied && (
              <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">OVERRIDE</Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDateForDisplay(latest.check_date)}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Rule</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>Actual</TableHead>
              <TableHead>Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule, i) => (
              <TableRow key={i} className={!rule.passed ? 'bg-destructive/5' : ''}>
                <TableCell>
                  {rule.passed ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : rule.severity === 'WARN' ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                </TableCell>
                <TableCell className="text-sm font-medium">{rule.ruleName || rule.ruleCode}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{rule.ruleGroup || '—'}</TableCell>
                <TableCell className="text-sm font-mono">{String(rule.requiredValue ?? '—')}</TableCell>
                <TableCell className="text-sm font-mono">{String(rule.actualValue ?? '—')}</TableCell>
                <TableCell>
                  <span className={`text-xs font-medium ${rule.passed ? 'text-green-600' : 'text-destructive'}`}>
                    {rule.passed ? 'Pass' : rule.message || 'Fail'}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {latest.notes && (
          <div className="p-3 border-t text-sm text-muted-foreground">{latest.notes}</div>
        )}
      </CardContent>
    </Card>
  );
};
