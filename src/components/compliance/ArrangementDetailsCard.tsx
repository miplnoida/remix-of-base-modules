import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ComponentPaymentArrangement } from '@/types/paymentArrangement';
import { COMPONENT_LABELS } from '@/types/contributionComponents';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface ArrangementDetailsCardProps {
  arrangement: ComponentPaymentArrangement;
  onRecordPayment?: (installmentId: string) => void;
}

export function ArrangementDetailsCard({ arrangement, onRecordPayment }: ArrangementDetailsCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'XCD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
      ACTIVE: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-blue-100 text-blue-800',
      DEFAULTED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const progressPercentage = (arrangement.installmentsPaid / arrangement.numberOfInstallments) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{arrangement.arrangementNumber}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Created: {formatDate(arrangement.createdDate)} by {arrangement.createdByName}
            </p>
          </div>
          <Badge className={getStatusColor(arrangement.status)}>
            {arrangement.status.replace(/_/g, ' ')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Financial Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Debt</p>
            <p className="text-lg font-bold">{formatCurrency(arrangement.totalDebtAmount)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Paid</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(arrangement.totalPaid)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="text-lg font-bold text-destructive">{formatCurrency(arrangement.outstandingBalance)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">On-Time Rate</p>
            <p className="text-lg font-bold">{arrangement.onTimePaymentRate.toFixed(0)}%</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Payment Progress</span>
            <span className="font-medium">{arrangement.installmentsPaid} / {arrangement.numberOfInstallments} installments</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Component Breakdown */}
        <div>
          <h4 className="text-sm font-medium mb-3">Component Breakdown</h4>
          <div className="grid grid-cols-2 gap-2">
            {arrangement.componentBreakdown.map(comp => (
              <div key={comp.component} className="flex justify-between items-center p-2 bg-muted/30 rounded text-sm">
                <Badge variant="outline">{comp.component}</Badge>
                <span className="font-medium">{formatCurrency(comp.totalAmount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Next Payment Due */}
        {arrangement.nextDueDate && arrangement.status === 'ACTIVE' && (
          <Card className="bg-yellow-50/30 border-yellow-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Next Payment Due</p>
                  <p className="text-xs text-muted-foreground">{formatDate(arrangement.nextDueDate)}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">
                    {formatCurrency(arrangement.installments.find(inst => !inst.paid)?.totalAmount || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Installment Schedule */}
        <div>
          <h4 className="text-sm font-medium mb-3">Installment Schedule</h4>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arrangement.installments.map((installment) => (
                  <TableRow key={installment.id} className={installment.overdue ? 'bg-red-50/30' : ''}>
                    <TableCell className="font-medium">{installment.installmentNumber}</TableCell>
                    <TableCell>{formatDate(installment.dueDate)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(installment.totalAmount)}</TableCell>
                    <TableCell>
                      {installment.paid ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Paid
                        </Badge>
                      ) : installment.overdue ? (
                        <Badge className="bg-red-100 text-red-800">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Overdue
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {installment.paidDate ? formatDate(installment.paidDate) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {!installment.paid && arrangement.status === 'ACTIVE' && onRecordPayment && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onRecordPayment(installment.id)}
                        >
                          Record Payment
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="space-y-2 pt-4 border-t">
          <h4 className="text-sm font-medium">Terms & Conditions</h4>
          <p className="text-sm text-muted-foreground">{arrangement.terms}</p>
          {arrangement.conditions.length > 0 && (
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              {arrangement.conditions.map((condition, index) => (
                <li key={index}>{condition}</li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
