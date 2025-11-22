import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAPBatches, getInvoicesByBatchId, generatePayments } from '@/services/apBenefitsService';
import { useToast } from '@/hooks/use-toast';
import { Printer, Download } from 'lucide-react';

export default function GeneratePayments() {
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'EFT' | 'CHEQUE'>('EFT');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [chequeStartNumber, setChequeStartNumber] = useState('');
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const { toast } = useToast();

  const batches = getAPBatches().filter(b => b.status === 'OPEN');
  const invoices = selectedBatchId ? getInvoicesByBatchId(selectedBatchId) : [];

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInvoices(invoices.map(inv => inv.id));
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleSelectInvoice = (invoiceId: string, checked: boolean) => {
    if (checked) {
      setSelectedInvoices([...selectedInvoices, invoiceId]);
    } else {
      setSelectedInvoices(selectedInvoices.filter(id => id !== invoiceId));
    }
  };

  const handleGenerate = () => {
    if (selectedInvoices.length === 0) {
      toast({
        title: "No invoices selected",
        description: "Please select at least one invoice to generate payments.",
        variant: "destructive"
      });
      return;
    }

    if (paymentMethod === 'CHEQUE' && !chequeStartNumber) {
      toast({
        title: "Missing cheque number",
        description: "Please enter the starting cheque number.",
        variant: "destructive"
      });
      return;
    }

    const payments = generatePayments(
      selectedInvoices,
      paymentMethod,
      paymentDate,
      paymentMethod === 'CHEQUE' ? parseInt(chequeStartNumber) : undefined
    );

    toast({
      title: "Payments generated",
      description: `Successfully generated ${payments.length} ${paymentMethod === 'CHEQUE' ? 'cheques' : 'EFT entries'}.`
    });

    setSelectedInvoices([]);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Generate Benefit Payments</h1>
        <p className="text-muted-foreground mt-1">Generate cheques or EFT files for benefit payments</p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>AP Batch</Label>
            <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
              <SelectTrigger>
                <SelectValue placeholder="Select batch" />
              </SelectTrigger>
              <SelectContent>
                {batches.map(batch => (
                  <SelectItem key={batch.id} value={batch.id}>
                    {batch.id} - {batch.batchReference} (XCD ${batch.totalAmount.toFixed(2)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'EFT' | 'CHEQUE')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EFT">EFT</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Payment Date</Label>
            <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>

          {paymentMethod === 'CHEQUE' && (
            <div className="space-y-2">
              <Label>Starting Cheque Number</Label>
              <Input 
                type="number" 
                value={chequeStartNumber} 
                onChange={(e) => setChequeStartNumber(e.target.value)}
                placeholder="e.g., 100001"
              />
            </div>
          )}
        </div>

        {selectedBatchId && (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Payee Name</TableHead>
                    <TableHead>SSN</TableHead>
                    <TableHead>Benefit Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedInvoices.includes(invoice.id)}
                          onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>{invoice.payeeName}</TableCell>
                      <TableCell>***-**-****</TableCell>
                      <TableCell>{invoice.reference.split('-')[0]}</TableCell>
                      <TableCell className="text-right">XCD ${invoice.amount.toFixed(2)}</TableCell>
                      <TableCell>{paymentMethod}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {selectedInvoices.length} of {invoices.length} selected
              </div>
              <div className="flex gap-2">
                {paymentMethod === 'CHEQUE' && (
                  <Button variant="outline">
                    <Printer className="h-4 w-4 mr-2" />
                    Print Cheques
                  </Button>
                )}
                {paymentMethod === 'EFT' && (
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download EFT File
                  </Button>
                )}
                <Button onClick={handleGenerate}>
                  Generate Payments
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
