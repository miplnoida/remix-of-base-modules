import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/common/PageHeader';
import { ArrowLeft, FileText, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/formatCurrency';
import { accountsPayableService } from '@/services/accountsPayableService';
import { PendingPayable } from '@/types/accountsPayable';

const CreateAPBatch: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [payables, setPayables] = useState<PendingPayable[]>([]);
  const [selectedPayables, setSelectedPayables] = useState<PendingPayable[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'CHECK' | 'DIRECT_DEPOSIT' | 'MIXED'>('MIXED');
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const selectedIds = (location.state as any)?.selectedIds || [];

  useEffect(() => {
    loadPayables();
  }, []);

  const loadPayables = async () => {
    setLoading(true);
    const data = await accountsPayableService.getPendingPayables();
    setPayables(data);
    
    if (selectedIds.length > 0) {
      const selected = data.filter(p => selectedIds.includes(p.id));
      setSelectedPayables(selected);
      
      // Auto-detect payment method
      const hasCheck = selected.some(p => p.paymentMethod === 'CHECK');
      const hasDD = selected.some(p => p.paymentMethod === 'DIRECT_DEPOSIT');
      if (hasCheck && hasDD) {
        setPaymentMethod('MIXED');
      } else if (hasCheck) {
        setPaymentMethod('CHECK');
      } else {
        setPaymentMethod('DIRECT_DEPOSIT');
      }
    }
    setLoading(false);
  };

  const totals = {
    items: selectedPayables.length,
    grossAmount: selectedPayables.reduce((sum, p) => sum + p.payableAmount, 0),
    deductions: selectedPayables.reduce((sum, p) => sum + p.deductions.reduce((d, ded) => d + ded.amount, 0), 0),
    netAmount: selectedPayables.reduce((sum, p) => sum + p.netPayableAmount, 0),
    checkCount: selectedPayables.filter(p => p.paymentMethod === 'CHECK').length,
    ddCount: selectedPayables.filter(p => p.paymentMethod === 'DIRECT_DEPOSIT').length
  };

  const handleCreateBatch = async () => {
    if (selectedPayables.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select payable items to create a batch.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const batch = await accountsPayableService.createAPBatch(
        selectedPayables.map(p => p.id),
        paymentMethod
      );
      
      toast({
        title: "Batch Created Successfully",
        description: `AP Batch ${batch.batchNumber} has been created with ${batch.totalItems} items.`,
      });
      
      navigate('/finance/accounts-payable/batches');
    } catch (error) {
      toast({
        title: "Error Creating Batch",
        description: "Failed to create AP batch. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Create AP Batch"
        subtitle="Create a new Accounts Payable batch for benefit payments"
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Accounts Payable', href: '/finance/accounts-payable' },
          { label: 'Create Batch' }
        ]}
      />

      <Button variant="outline" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batch Configuration */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Batch Configuration
            </CardTitle>
            <CardDescription>Configure the AP batch settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="batchDate">Batch Date</Label>
              <Input
                id="batchDate"
                type="date"
                value={batchDate}
                onChange={(e) => setBatchDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CHECK">Check Only</SelectItem>
                  <SelectItem value="DIRECT_DEPOSIT">Direct Deposit Only</SelectItem>
                  <SelectItem value="MIXED">Mixed (Check + DD)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Optional batch notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Batch Summary */}
            <div className="pt-4 border-t space-y-3">
              <h4 className="font-medium">Batch Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Items:</span>
                  <span className="font-medium">{totals.items}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Check Payments:</span>
                  <span className="font-medium">{totals.checkCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Direct Deposits:</span>
                  <span className="font-medium">{totals.ddCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gross Amount:</span>
                  <span className="font-medium">{formatCurrency(totals.grossAmount)}</span>
                </div>
                <div className="flex justify-between text-destructive">
                  <span>Deductions:</span>
                  <span>-{formatCurrency(totals.deductions)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Net Amount:</span>
                  <span className="text-green-600">{formatCurrency(totals.netAmount)}</span>
                </div>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={handleCreateBatch}
              disabled={submitting || selectedPayables.length === 0}
            >
              <Save className="h-4 w-4 mr-2" />
              {submitting ? 'Creating...' : 'Create AP Batch'}
            </Button>
          </CardContent>
        </Card>

        {/* Selected Items */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Selected Payable Items</CardTitle>
            <CardDescription>
              {selectedPayables.length} items selected for this batch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim #</TableHead>
                  <TableHead>Insured Person</TableHead>
                  <TableHead>Benefit Type</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                  </TableRow>
                ) : selectedPayables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-8 w-8 text-muted-foreground" />
                        <p>No items selected</p>
                        <Button variant="outline" size="sm" onClick={() => navigate('/finance/accounts-payable/pending')}>
                          Select Payables
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  selectedPayables.map((payable) => (
                    <TableRow key={payable.id}>
                      <TableCell className="font-medium">{payable.claimNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p>{payable.insuredPersonName}</p>
                          <p className="text-xs text-muted-foreground">{payable.insuredPersonSSN}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{payable.benefitType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={payable.paymentMethod === 'DIRECT_DEPOSIT' ? 'default' : 'secondary'}>
                          {payable.paymentMethod === 'DIRECT_DEPOSIT' ? 'DD' : 'Check'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(payable.payableAmount)}</TableCell>
                      <TableCell className="text-right text-destructive">
                        {payable.deductions.length > 0 
                          ? `-${formatCurrency(payable.deductions.reduce((s, d) => s + d.amount, 0))}` 
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(payable.netPayableAmount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Accounting Preview */}
            {selectedPayables.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Accounting Entry Preview
                </h4>
                <div className="bg-muted rounded-lg p-4 text-sm">
                  <div className="grid grid-cols-3 gap-4 font-medium border-b pb-2 mb-2">
                    <span>Account</span>
                    <span className="text-right">Debit</span>
                    <span className="text-right">Credit</span>
                  </div>
                  {/* Group by benefit type for debits */}
                  {Object.entries(
                    selectedPayables.reduce((acc, p) => {
                      acc[p.benefitType] = (acc[p.benefitType] || 0) + p.netPayableAmount;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([type, amount]) => (
                    <div key={type} className="grid grid-cols-3 gap-4 py-1">
                      <span>{type} Expense</span>
                      <span className="text-right">{formatCurrency(amount)}</span>
                      <span className="text-right">-</span>
                    </div>
                  ))}
                  {/* Credits */}
                  {totals.checkCount > 0 && (
                    <div className="grid grid-cols-3 gap-4 py-1">
                      <span>AP Liability - Checks</span>
                      <span className="text-right">-</span>
                      <span className="text-right">
                        {formatCurrency(selectedPayables.filter(p => p.paymentMethod === 'CHECK').reduce((s, p) => s + p.netPayableAmount, 0))}
                      </span>
                    </div>
                  )}
                  {totals.ddCount > 0 && (
                    <div className="grid grid-cols-3 gap-4 py-1">
                      <span>Bank - Operating Account</span>
                      <span className="text-right">-</span>
                      <span className="text-right">
                        {formatCurrency(selectedPayables.filter(p => p.paymentMethod === 'DIRECT_DEPOSIT').reduce((s, p) => s + p.netPayableAmount, 0))}
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-4 pt-2 mt-2 border-t font-medium">
                    <span>Total</span>
                    <span className="text-right">{formatCurrency(totals.netAmount)}</span>
                    <span className="text-right">{formatCurrency(totals.netAmount)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateAPBatch;
