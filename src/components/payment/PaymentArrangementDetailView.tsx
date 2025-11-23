import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  PaymentArrangement, 
  ArrangementStatus, 
  InstallmentStatus 
} from '@/types/centralPaymentArrangement';
import { centralPaymentArrangementService } from '@/services/centralPaymentArrangementService';
import { format } from 'date-fns';
import { CheckCircle, Clock, FileText, DollarSign, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentArrangementDetailViewProps {
  arrangementId: string;
}

export function PaymentArrangementDetailView({ arrangementId }: PaymentArrangementDetailViewProps) {
  const [arrangement, setArrangement] = useState<PaymentArrangement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArrangement();
  }, [arrangementId]);

  const loadArrangement = async () => {
    setLoading(true);
    try {
      const data = await centralPaymentArrangementService.getArrangementById(arrangementId);
      if (data) setArrangement(data);
    } catch (error) {
      console.error('Error loading arrangement:', error);
      toast.error('Failed to load arrangement');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: ArrangementStatus) => {
    const variants: Record<ArrangementStatus, any> = {
      [ArrangementStatus.DRAFT]: 'secondary',
      [ArrangementStatus.ACTIVE]: 'default',
      [ArrangementStatus.COMPLETED]: 'default',
      [ArrangementStatus.SUPERSEDED]: 'secondary',
      [ArrangementStatus.CANCELLED]: 'destructive'
    };
    return variants[status] || 'secondary';
  };

  const getInstallmentStatusBadge = (status: InstallmentStatus) => {
    const variants: Record<InstallmentStatus, any> = {
      [InstallmentStatus.PLANNED]: 'secondary',
      [InstallmentStatus.PARTIALLY_PAID]: 'default',
      [InstallmentStatus.PAID]: 'default',
      [InstallmentStatus.OVERDUE]: 'destructive',
      [InstallmentStatus.CANCELLED]: 'secondary'
    };
    return variants[status] || 'secondary';
  };

  if (loading) {
    return <div className="p-6 text-center">Loading arrangement...</div>;
  }

  if (!arrangement) {
    return <div className="p-6 text-center">Arrangement not found</div>;
  }

  const paymentProgress = arrangement.totalArrangedAmount > 0 
    ? (arrangement.totalPaidAmount / arrangement.totalArrangedAmount) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{arrangement.arrangementNumber}</CardTitle>
              <p className="text-muted-foreground mt-1">
                {arrangement.employerName} • Version {arrangement.versionNumber}
              </p>
            </div>
            <Badge variant={getStatusBadge(arrangement.status)}>
              {arrangement.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Source Module</p>
              <p className="font-medium">{arrangement.arrangementSourceModule}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium">{arrangement.arrangementType.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Start Date</p>
              <p className="font-medium">{format(new Date(arrangement.startDate), 'MMM dd, yyyy')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created By</p>
              <p className="font-medium">{arrangement.createdByName}</p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Payment Progress</p>
              <p className="text-sm font-medium">{paymentProgress.toFixed(1)}%</p>
            </div>
            <Progress value={paymentProgress} className="h-2" />
            <div className="flex items-center justify-between mt-2 text-sm">
              <span className="text-muted-foreground">
                Paid: ${arrangement.totalPaidAmount.toLocaleString()}
              </span>
              <span className="text-muted-foreground">
                Outstanding: ${arrangement.outstandingBalance.toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="items" className="w-full">
        <TabsList>
          <TabsTrigger value="items">
            <FileText className="h-4 w-4 mr-2" />
            Dues Included ({arrangement.items.length})
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <Clock className="h-4 w-4 mr-2" />
            Payment Schedule ({arrangement.installments.length})
          </TabsTrigger>
        </TabsList>

        {/* Items Tab */}
        <TabsContent value="items">
          <Card>
            <CardHeader>
              <CardTitle>Dues Included in Arrangement</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Original</TableHead>
                    <TableHead className="text-right">Arranged</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arrangement.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="outline">{item.sourceModule}</Badge>
                      </TableCell>
                      <TableCell>{item.sourceType.replace(/_/g, ' ')}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.sourceDescription}</TableCell>
                      <TableCell className="font-mono text-sm">{item.sourceReferenceId}</TableCell>
                      <TableCell className="text-right font-mono">
                        ${item.originalOutstandingAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${item.arrangedAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${item.paidAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${item.remainingBalance.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Payment Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead>Last Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arrangement.installments.map((installment) => (
                    <TableRow key={installment.id}>
                      <TableCell className="font-medium">{installment.installmentNumber}</TableCell>
                      <TableCell>{format(new Date(installment.dueDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="text-right font-mono">
                        ${installment.installmentAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getInstallmentStatusBadge(installment.status)}>
                          {installment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${installment.paidAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${installment.remainingAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {installment.lastPaymentDate 
                          ? format(new Date(installment.lastPaymentDate), 'MMM dd, yyyy')
                          : '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
