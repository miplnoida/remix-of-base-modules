import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import type { BnSimRuleTrace } from '@/types/bnSimulation';

interface Props {
  trace: BnSimRuleTrace[];
}

const severityIcon = (severity: string | null, passed: boolean | null) => {
  if (passed === false) return <XCircle className="h-4 w-4 text-destructive" />;
  if (passed === true) return <CheckCircle className="h-4 w-4 text-emerald-600" />;
  if (severity === 'ERROR' || severity === 'FATAL') return <XCircle className="h-4 w-4 text-destructive" />;
  if (severity === 'WARN') return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <Info className="h-4 w-4 text-muted-foreground" />;
};

const severityBadge = (severity: string | null) => {
  const variants: Record<string, string> = {
    INFO: 'bg-muted text-muted-foreground',
    WARN: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    ERROR: 'bg-destructive/10 text-destructive',
    FATAL: 'bg-destructive text-destructive-foreground',
  };
  return <Badge className={`text-xs ${variants[severity || 'INFO'] || variants.INFO}`}>{severity || 'INFO'}</Badge>;
};

export default function SimRuleTraceView({ trace }: Props) {
  if (trace.length === 0) {
    return <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">No rule trace data available.</p></CardContent></Card>;
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead className="w-10"></TableHead>
                <TableHead>Layer</TableHead>
                <TableHead>Rule</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-16">ms</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trace.map((item) => (
                <TableRow key={item.id} className={item.severity === 'ERROR' || item.severity === 'FATAL' ? 'bg-destructive/5' : item.severity === 'WARN' ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}>
                  <TableCell className="text-xs text-muted-foreground">{item.step_number}</TableCell>
                  <TableCell>{severityIcon(item.severity, item.passed)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{item.engine_layer}</Badge></TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{item.rule_code || '—'}</TableCell>
                  <TableCell className="text-sm font-medium">{item.rule_label || '—'}</TableCell>
                  <TableCell>{severityBadge(item.severity)}</TableCell>
                  <TableCell className="text-xs max-w-xs truncate">{item.message || ''}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{item.duration_ms ?? ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
