import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import type { BnCalcTraceEntry, BnEngineLayer } from '@/types/bnCalcEngine';

interface Props {
  trace: BnCalcTraceEntry[];
}

const LAYER_LABELS: Record<BnEngineLayer, string> = {
  ELIGIBILITY: 'Eligibility',
  CONTRIBUTION_WINDOW: 'Contribution Window',
  WAGE_AGGREGATION: 'Wage Aggregation',
  FORMULA: 'Formula',
  BENEFICIARY_ALLOCATION: 'Beneficiary Allocation',
  PAYMENT_SCHEDULE: 'Payment Schedule',
  VALIDATION: 'Validation',
  OVERRIDE: 'Override',
  SIMULATION: 'Simulation',
  COMPARISON: 'Comparison',
};

const severityIcon = (severity: string, passed?: boolean | null) => {
  if (passed === false) return <XCircle className="h-4 w-4 text-destructive" />;
  if (passed === true) return <CheckCircle className="h-4 w-4 text-emerald-600" />;
  if (severity === 'ERROR' || severity === 'FATAL') return <XCircle className="h-4 w-4 text-destructive" />;
  if (severity === 'WARN') return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <Info className="h-4 w-4 text-muted-foreground" />;
};

const severityBadge = (severity: string) => {
  const variants: Record<string, string> = {
    INFO: 'bg-muted text-muted-foreground',
    WARN: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    ERROR: 'bg-destructive/10 text-destructive',
    FATAL: 'bg-destructive text-destructive-foreground',
  };
  return <Badge className={`text-xs ${variants[severity] || variants.INFO}`}>{severity}</Badge>;
};

export default function CalcTraceViewer({ trace }: Props) {
  // Group by layer
  const layers = Object.keys(LAYER_LABELS) as BnEngineLayer[];
  const grouped = layers.reduce((acc, layer) => {
    const items = trace.filter(t => t.engineLayer === layer);
    if (items.length > 0) acc[layer] = items;
    return acc;
  }, {} as Record<BnEngineLayer, BnCalcTraceEntry[]>);

  if (trace.length === 0) {
    return <p className="text-sm text-muted-foreground p-4">No trace data available.</p>;
  }

  return (
    <Accordion type="multiple" className="w-full" defaultValue={Object.keys(grouped)}>
      {Object.entries(grouped).map(([layer, items]) => (
        <AccordionItem key={layer} value={layer}>
          <AccordionTrigger className="text-sm font-medium">
            <div className="flex items-center gap-2">
              {LAYER_LABELS[layer as BnEngineLayer]}
              <Badge variant="outline" className="text-xs">{items.length} steps</Badge>
              {items.some(i => i.severity === 'ERROR' || i.severity === 'FATAL') && (
                <Badge className="bg-destructive/10 text-destructive text-xs">Has errors</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Step</TableHead>
                    <TableHead>Rule</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-16">ms</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx} className={item.severity === 'ERROR' || item.severity === 'FATAL' ? 'bg-destructive/5' : item.severity === 'WARN' ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}>
                      <TableCell className="text-xs text-muted-foreground">{item.stepNumber}</TableCell>
                      <TableCell>{severityIcon(item.severity, item.passed)}</TableCell>
                      <TableCell className="text-sm font-medium">{item.stepLabel}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{item.ruleCode || '—'}</TableCell>
                      <TableCell className="text-sm font-mono">
                        {item.outputValue != null ? item.outputValue.toLocaleString() : item.outputText || '—'}
                      </TableCell>
                      <TableCell>{severityBadge(item.severity)}</TableCell>
                      <TableCell className="text-xs max-w-xs truncate">{item.message || ''}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.durationMs ?? ''}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
