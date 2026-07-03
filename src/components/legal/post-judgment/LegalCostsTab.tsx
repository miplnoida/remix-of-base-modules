import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { summariseLegalCosts } from "@/services/legal/postJudgment/legalCostEngine";
import type { LegalCost } from "@/types/legal/postJudgment";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDateForDisplay } from "@/lib/format-config";

export function LegalCostsTab({ rows }: { rows: LegalCost[] }) {
  const s = summariseLegalCosts(rows);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Total Incurred" value={formatCurrency(s.total_incurred)} />
        <StatCard label="Recovered" value={formatCurrency(s.total_recovered)} />
        <StatCard label="Outstanding" value={formatCurrency(s.outstanding)} />
        <div className="rounded border p-3">
          <div className="text-xs text-muted-foreground">Recovery %</div>
          <div className="text-lg font-semibold">{s.recovery_pct.toFixed(1)}%</div>
          <Progress value={s.recovery_pct} className="h-1.5 mt-1" />
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Legal Costs ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Recovered</TableHead>
                <TableHead>Court Awarded</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs">{formatDateForDisplay(c.incurred_date)}</TableCell>
                  <TableCell><Badge variant="outline">{c.cost_type}</Badge></TableCell>
                  <TableCell className="text-sm">{c.description ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(c.amount)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(c.recovered_amount)}</TableCell>
                  <TableCell>{c.is_court_awarded ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "WRITTEN_OFF" ? "destructive" : "default"}>
                      {c.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground text-sm">
                    No legal costs.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
