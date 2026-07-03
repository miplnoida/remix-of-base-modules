import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { computeSettlementCompliance } from "@/services/legal/postJudgment/settlementEngine";
import { formatCurrency } from "@/utils/formatCurrency";

export function LegalSettlementsTab({
  rows,
}: {
  rows: Array<{ status: string; agreed_amount: number; paid_amount: number }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Legal Settlements ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Agreed</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s, i) => {
              const c = computeSettlementCompliance(s.agreed_amount, s.paid_amount, 0);
              return (
                <TableRow key={i}>
                  <TableCell>
                    <Badge variant={s.status === "BREACHED" ? "destructive" : "default"}>
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(c.total)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(c.paid)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(c.outstanding)}</TableCell>
                  <TableCell className="w-32"><Progress value={c.paid_pct} className="h-2" /></TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground text-sm">
                  No settlements recorded.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
