import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";

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
}

export function ArrangementsTab({ caseId, arrangements }: ArrangementsTabProps) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "On Track": "default",
      "Missed": "destructive",
      "Completed": "secondary",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Create Arrangement Plan
        </Button>
      </div>

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
                        Started: {new Date(arrangement.startDate).toLocaleDateString()} • {arrangement.durationMonths} months
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
                        <span className="font-semibold">{new Date(nextDue.date).toLocaleDateString()}</span>
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
                            <TableCell>{new Date(installment.date).toLocaleDateString()}</TableCell>
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
