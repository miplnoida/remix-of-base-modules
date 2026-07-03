import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { evaluateFilingDeadline } from "@/services/legal/postJudgment/courtFilingEngine";
import type { CourtFiling } from "@/types/legal/postJudgment";
import { formatDateForDisplay } from "@/lib/format-config";

export function CourtFilingsTab({ rows }: { rows: CourtFiling[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Court Filings ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Filed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>SLA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((f) => {
              const d = evaluateFilingDeadline(f);
              const sla = d.is_overdue ? "Overdue"
                : d.is_at_risk ? "At Risk"
                : d.days_to_deadline !== null ? `${d.days_to_deadline}d` : "—";
              return (
                <TableRow key={f.id}>
                  <TableCell className="text-sm">{f.title}</TableCell>
                  <TableCell><Badge variant="outline">{f.filing_type}</Badge></TableCell>
                  <TableCell className="text-xs">
                    {f.deadline ? formatDateForDisplay(f.deadline) : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {f.filed_at ? formatDateForDisplay(f.filed_at) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={f.status === "REJECTED" ? "destructive" : "default"}>
                      {f.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={d.is_overdue ? "destructive" : d.is_at_risk ? "secondary" : "outline"}>
                      {sla}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground text-sm">
                  No court filings.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
