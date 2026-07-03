import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { computeConsentCompliance } from "@/services/legal/postJudgment/consentOrderEngine";
import type { ConsentOrder, ConsentInstallment } from "@/types/legal/postJudgment";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDateForDisplay } from "@/lib/format-config";

export function ConsentOrdersTab({
  rows,
}: {
  rows: Array<{ order: ConsentOrder; installments: ConsentInstallment[] }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Consent Orders ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Missed</TableHead>
              <TableHead>Next Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recommendation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ order, installments }) => {
              const c = computeConsentCompliance(order, installments);
              return (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">{order.code}</TableCell>
                  <TableCell className="text-sm">{order.title}</TableCell>
                  <TableCell className="text-right">{formatCurrency(c.total_amount)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(c.paid)}</TableCell>
                  <TableCell className="w-32">
                    <Progress value={c.paid_pct} className="h-2" />
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.missed_count > 0 ? "destructive" : "outline"}>
                      {c.missed_count}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {c.next_due_date ? formatDateForDisplay(c.next_due_date) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={order.status === "BREACHED" ? "destructive" : "default"}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{c.recommendation ?? "—"}</TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground text-sm">
                  No consent orders.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
