import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ChevronDown, ChevronUp, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RecordPaymentDialog } from "./RecordPaymentDialog";

interface Payment {
  id: string;
  paymentDate: string;
  fund: string;
  amountPaid: number;
  appliedPeriod: string;
  receiptReference: string;
  remainingBalance: number;
}

interface ArrearsPeriod {
  id: string;
  employer: string;
  periodFrom: string;
  periodTo: string;
}

interface PaymentsLogSectionProps {
  caseId: string;
  payments: Payment[];
  periods: ArrearsPeriod[];
  isOpen: boolean;
  onToggle: () => void;
}

export function PaymentsLogSection({ caseId, payments, periods, isOpen, onToggle }: PaymentsLogSectionProps) {
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);

  return (
    <>
      <Card className="border-2 shadow-md">
        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={onToggle}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Payments Log
              <Badge className="bg-green-600/10 text-green-700 hover:bg-green-600/20 font-semibold">
                {payments.length} {payments.length === 1 ? 'Record' : 'Records'}
              </Badge>
            </CardTitle>
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </CardHeader>

        {isOpen && (
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setRecordDialogOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Fund</TableHead>
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
                          No payments recorded. Click "Record Payment" to add one.
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{payment.fund}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            ${payment.amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-sm">{payment.appliedPeriod}</TableCell>
                          <TableCell className="text-sm font-mono">{payment.receiptReference}</TableCell>
                          <TableCell className="text-right font-semibold">
                            ${payment.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <RecordPaymentDialog
        open={recordDialogOpen}
        onOpenChange={setRecordDialogOpen}
        caseId={caseId}
        periods={periods}
      />
    </>
  );
}
