import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { summariseCounselFees } from "@/services/legal/postJudgment/externalCounselEngine";
import type { ExternalCounselEngagement, ExternalCounselInvoice } from "@/types/legal/postJudgment";
import { formatCurrency } from "@/utils/formatCurrency";

export function ExternalCounselTab({
  rows,
}: {
  rows: Array<{ engagement: ExternalCounselEngagement; invoices: ExternalCounselInvoice[] }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">External Counsel ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Engagement</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Estimate</TableHead>
              <TableHead className="text-right">Incurred</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Utilisation</TableHead>
              <TableHead>Invoices</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ engagement, invoices }) => {
              const s = summariseCounselFees(engagement, invoices);
              return (
                <TableRow key={engagement.id}>
                  <TableCell className="font-mono text-xs">{engagement.id.slice(0, 8)}…</TableCell>
                  <TableCell>
                    <Badge variant={engagement.status === "TERMINATED" ? "destructive" : "default"}>
                      {engagement.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(s.total_estimate)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(s.total_incurred)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(s.total_outstanding)}</TableCell>
                  <TableCell className="w-32">
                    <Progress value={s.utilisation_pct} className="h-2" />
                    {s.is_over_budget && <div className="text-xs text-destructive mt-0.5">Over budget</div>}
                  </TableCell>
                  <TableCell className="text-xs">{invoices.length}</TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground text-sm">
                  No counsel engagements.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
