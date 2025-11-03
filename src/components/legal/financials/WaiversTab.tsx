import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Waiver {
  id: string;
  waiverType: string;
  amount: number;
  percent?: number;
  authorizedBy: string;
  date: string;
  reason: string;
  appliedPeriods: string[];
}

interface WaiversTabProps {
  caseId: string;
  waivers: Waiver[];
}

export function WaiversTab({ caseId, waivers }: WaiversTabProps) {
  const totalWaived = waivers.reduce((sum, w) => sum + w.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm">
          <span className="text-muted-foreground">Total Waived: </span>
          <span className="font-semibold text-green-600">${totalWaived.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Waiver
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount/Percent</TableHead>
              <TableHead>Authorized By</TableHead>
              <TableHead>Applied Periods</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {waivers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No waivers applied. Click "Add Waiver" to create one.
                </TableCell>
              </TableRow>
            ) : (
              waivers.map((waiver) => (
                <TableRow key={waiver.id}>
                  <TableCell>{new Date(waiver.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{waiver.waiverType}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-green-600">
                    {waiver.percent ? `${waiver.percent}%` : `$${waiver.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                  </TableCell>
                  <TableCell>{waiver.authorizedBy}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{waiver.appliedPeriods.length} periods</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {waiver.reason}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
