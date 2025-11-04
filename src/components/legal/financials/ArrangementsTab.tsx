import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { CreateArrangementDialog } from "./CreateArrangementDialog";

// Format date as dd-mm-yyyy
const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

interface Arrangement {
  id: string;
  terms: string;
  durationMonths: number;
  startDate: string;
  status: string;
  installments: Array<{
    date: string;
    amount: number;
    paid: boolean;
  }>;
}

interface ArrangementsTabProps {
  caseId: string;
  arrangements: Arrangement[];
  totalAmount?: number;
}

export function ArrangementsTab({ caseId, arrangements, totalAmount = 0 }: ArrangementsTabProps) {
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "success" | "destructive" | "outline"> = {
      "On Track": "outline",
      "Missed": "destructive",
      "Completed": "success",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setIsCreatePlanOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Plan
        </Button>
      </div>

      <CreateArrangementDialog
        open={isCreatePlanOpen}
        onOpenChange={setIsCreatePlanOpen}
        caseId={caseId}
        totalAmount={totalAmount}
      />

      {arrangements.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          No payment arrangements created. Click "Create Arrangement Plan" to set one up.
        </div>
      ) : (
        <div className="space-y-4">
          {arrangements.map((arrangement) => {
            const totalInstallments = arrangement.installments.length;
            const paidInstallments = arrangement.installments.filter(i => i.paid).length;
            const progress = (paidInstallments / totalInstallments) * 100;
            const nextDue = arrangement.installments.find(i => !i.paid);

            return (
              <Card key={arrangement.id} className="p-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{arrangement.terms}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Started: {formatDate(arrangement.startDate)} • {arrangement.durationMonths} months
                      </p>
                    </div>
                    {getStatusBadge(arrangement.status)}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{paidInstallments} of {totalInstallments} paid</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {nextDue && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">Next Payment Due</p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="font-semibold">{formatDate(nextDue.date)}</span>
                        <span className="font-semibold">${nextDue.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Due Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {arrangement.installments.map((installment, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{formatDate(installment.date)}</TableCell>
                            <TableCell className="text-right">${installment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell>
                              {installment.paid ? (
                                <Badge variant="secondary">Paid</Badge>
                              ) : (
                                <Badge variant="outline">Pending</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
