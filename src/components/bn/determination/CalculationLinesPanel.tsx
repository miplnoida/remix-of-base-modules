import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calculator } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';
import type { CalculationSnapshot } from '@/services/bn/determinationService';
import { BnEmptyState } from '@/components/bn/shared';

interface Props {
  snapshots: CalculationSnapshot[];
}

export const CalculationLinesPanel: React.FC<Props> = ({ snapshots }) => {
  const latest = snapshots[0];

  if (!latest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" /> Calculation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BnEmptyState type="empty" title="No calculation performed" description="Run the calculation engine from the action bar." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calculator className="h-4 w-4" /> Calculation
          </span>
          <div className="flex items-center gap-2">
            <Badge variant={latest.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
              {latest.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDateForDisplay(latest.calc_date)}
            </span>
            {snapshots.length > 1 && (
              <span className="text-xs text-muted-foreground">
                ({snapshots.length} versions)
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary row */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Weekly Rate</p>
            <p className="text-lg font-bold font-mono">${(latest.weekly_rate ?? 0).toFixed(2)}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Lump Sum</p>
            <p className="text-lg font-bold font-mono">${(latest.lump_sum ?? 0).toFixed(2)}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Total Payable</p>
            <p className="text-lg font-bold font-mono">${(latest.total_payable ?? 0).toFixed(2)}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="text-lg font-bold">{latest.duration_weeks ?? '—'} wks</p>
          </div>
        </div>

        {/* Calculation Lines */}
        {latest.lines.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Calculation Lines</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Line</TableHead>
                  <TableHead>Formula</TableHead>
                  <TableHead className="text-right">Result</TableHead>
                  <TableHead>Explanation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latest.lines
                  .sort((a, b) => a.line_number - b.line_number)
                  .map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="text-xs text-muted-foreground">{line.line_number}</TableCell>
                      <TableCell className="text-sm font-medium">{line.line_label}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {line.formula_expression || '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold">
                        ${line.output_value.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-48 truncate">
                        {line.explanation || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
