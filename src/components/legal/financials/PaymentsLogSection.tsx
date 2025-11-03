import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ChevronDown, ChevronUp, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AddPaymentDialog } from "./AddPaymentDialog";

interface Payment {
  id: string;
  paymentDate: string;
  funds: string[];
  amountPaid: number;
  appliedPeriod: string;
  receiptReference: string;
  remainingBalance: number;
}

interface PaymentsLogSectionProps {
  caseId: string;
  payments: Payment[];
  periods: any[];
  isOpen: boolean;
  onToggle: () => void;
}

export function PaymentsLogSection({ caseId, payments, periods, isOpen, onToggle }: PaymentsLogSectionProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);

  return (
    <>
      <Card>
        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={onToggle}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payments Log
              <Badge variant="secondary">{payments.length} payments</Badge>
            </CardTitle>
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </CardHeader>

        {isOpen && (
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-sm">
                  <span className="text-muted-foreground">Total Paid: </span>
                  <span className="font-semibold text-green-600">${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <Button onClick={() => setAddDialogOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Fund(s)</TableHead>
                        <TableHead className="text-right">Amount Paid</TableHead>
                        <TableHead>Applied Period</TableHead>
                        <TableHead>Receipt/Reference</TableHead>
                        <TableHead className="text-right">Remaining Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No payments recorded. Click "Add Payment" to create one.
                          </TableCell>
                        </TableRow>
                      ) : (
                        payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {payment.funds.map((fund) => (
                                  <Badge key={fund} variant="outline" className="text-xs">
                                    {fund}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-green-600">
                              ${payment.amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>{payment.appliedPeriod}</TableCell>
                            <TableCell className="font-mono text-sm">{payment.receiptReference}</TableCell>
                            <TableCell className="text-right">
                              ${payment.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <AddPaymentDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        caseId={caseId}
        periods={periods}
      />
    </>
  );
}
