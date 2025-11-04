import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AddWaiverDialog } from "./AddWaiverDialog";

// Format date as dd-mm-yyyy
const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

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
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Waiver
        </Button>
      </div>

      <AddWaiverDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        caseId={caseId}
      />

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Authorized By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Applied Periods</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {waivers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No waivers recorded. Click "Add Waiver" to create one.
                </TableCell>
              </TableRow>
            ) : (
              waivers.map((waiver) => (
                <TableRow key={waiver.id}>
                  <TableCell>
                    <Badge variant="outline">{waiver.waiverType}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    ${waiver.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    {waiver.percent && <span className="text-muted-foreground ml-1">({waiver.percent}%)</span>}
                  </TableCell>
                  <TableCell>{waiver.authorizedBy}</TableCell>
                  <TableCell>{formatDate(waiver.date)}</TableCell>
                  <TableCell className="max-w-xs truncate">{waiver.reason}</TableCell>
                  <TableCell className="text-sm">
                    {waiver.appliedPeriods.map((period, idx) => (
                      <Badge key={idx} variant="secondary" className="mr-1">{period}</Badge>
                    ))}
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
