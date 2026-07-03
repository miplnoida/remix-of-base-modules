import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { computeComplianceCalc } from "@/services/legal/postJudgment/judgmentComplianceEngine";
import type { JudgmentCompliance } from "@/types/legal/postJudgment";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDateForDisplay } from "@/lib/format-config";

const statusVariant = (s: string): "default" | "destructive" | "secondary" | "outline" => {
  if (s === "BREACHED" || s === "OVERDUE") return "destructive";
  if (s === "PARTIAL" || s === "IN_PROGRESS") return "secondary";
  if (s === "COMPLIED" || s === "CLOSED") return "outline";
  return "default";
};

export function JudgmentComplianceTab({ rows }: { rows: JudgmentCompliance[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Judgment Compliance ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead className="text-right">Ordered</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Compliance</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const c = computeComplianceCalc(r);
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.order_id.slice(0, 8)}…</TableCell>
                  <TableCell className="text-right">{formatCurrency(c.total_ordered)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(c.paid)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(c.outstanding)}</TableCell>
                  <TableCell className="w-40">
                    <Progress value={c.compliance_pct} className="h-2" />
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {c.compliance_pct.toFixed(0)}%
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.compliance_due_date ? formatDateForDisplay(r.compliance_due_date) : "—"}
                    {c.is_overdue && <div className="text-destructive">Overdue</div>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(r.compliance_status)}>{r.compliance_status}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground text-sm">
                  No judgments to comply with.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
