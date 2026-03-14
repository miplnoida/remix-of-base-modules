import React, { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight, Search, Loader2, CheckCircle, AlertCircle, Inbox } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDisplayDate } from '@/lib/dateFormat';

interface TransferablePayment {
  payment_id: number;
  batch_number: string;
  date_received: string | null;
  payer_id: string;
  amount: number;
  selected: boolean;
}

interface EmployerInfo {
  regno: string;
  name: string;
  status: string | null;
}

const TransferPayments = () => {
  const [sourceRegno, setSourceRegno] = useState('');
  const [sourceEmployer, setSourceEmployer] = useState<EmployerInfo | null>(null);
  const [destRegno, setDestRegno] = useState('');
  const [destEmployer, setDestEmployer] = useState<EmployerInfo | null>(null);
  const [payments, setPayments] = useState<TransferablePayment[]>([]);
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferComplete, setTransferComplete] = useState(false);

  const lookupEmployer = async (regno: string): Promise<EmployerInfo | null> => {
    const { data } = await supabase
      .from('er_master')
      .select('regno, name, status')
      .eq('regno', regno)
      .single();
    return data ? { regno: data.regno, name: data.name, status: data.status } : null;
  };

  const handleRetrieveSource = useCallback(async () => {
    if (!sourceRegno.trim()) return;
    setIsRetrieving(true);
    setTransferComplete(false);
    try {
      const emp = await lookupEmployer(sourceRegno.trim());
      if (!emp) {
        toast({ title: 'Not Found', description: 'Source employer not found.', variant: 'destructive' });
        return;
      }
      setSourceEmployer(emp);

      // Get payments for source
      const { data: headers } = await supabase
        .from('cn_payment_header')
        .select('payment_id, batch_number, date_received, payer_id')
        .eq('payer_id', sourceRegno.trim())
        .eq('payer_type', 'ER');

      if (!headers || headers.length === 0) {
        setPayments([]);
        toast({ title: 'No Payments', description: 'No transferable payments found.' });
        return;
      }

      const ids = headers.map(h => h.payment_id);
      const { data: details } = await supabase
        .from('cn_payment')
        .select('payment_id, payment_amount')
        .in('payment_id', ids);

      const amountMap: Record<number, number> = {};
      (details || []).forEach(d => {
        amountMap[d.payment_id] = (amountMap[d.payment_id] || 0) + (d.payment_amount || 0);
      });

      setPayments(headers.map(h => ({
        payment_id: h.payment_id,
        batch_number: h.batch_number,
        date_received: h.date_received,
        payer_id: h.payer_id,
        amount: amountMap[h.payment_id] || 0,
        selected: true,
      })));
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsRetrieving(false);
    }
  }, [sourceRegno]);

  const handleValidateDestination = useCallback(async () => {
    if (!destRegno.trim()) return;
    if (destRegno.trim() === sourceRegno.trim()) {
      toast({ title: 'Invalid', description: 'Destination cannot be the same as source.', variant: 'destructive' });
      return;
    }
    const emp = await lookupEmployer(destRegno.trim());
    if (!emp) {
      toast({ title: 'Not Found', description: 'Destination employer not found.', variant: 'destructive' });
      return;
    }
    if (emp.status !== 'A' && emp.status !== 'Active') {
      toast({ title: 'Inactive', description: 'Destination employer is not active.', variant: 'destructive' });
    }
    setDestEmployer(emp);
  }, [destRegno, sourceRegno]);

  const handleTransfer = useCallback(async () => {
    if (!destEmployer) return;
    const selected = payments.filter(p => p.selected);
    if (selected.length === 0) {
      toast({ title: 'None Selected', description: 'Select payments to transfer.', variant: 'destructive' });
      return;
    }

    setIsTransferring(true);
    try {
      const ids = selected.map(p => p.payment_id);
      const { error } = await supabase
        .from('cn_payment_header')
        .update({ payer_id: destEmployer.regno } as any)
        .in('payment_id', ids);
      if (error) throw error;

      toast({ title: 'Transfer Complete', description: `${selected.length} payments transferred to ${destEmployer.name}.` });
      setTransferComplete(true);
      setPayments([]);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsTransferring(false);
    }
  }, [payments, destEmployer]);

  const togglePayment = (id: number) => {
    setPayments(prev => prev.map(p => p.payment_id === id ? { ...p, selected: !p.selected } : p));
  };

  const selectedTotal = payments.filter(p => p.selected).reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transfer Payments</h1>
        <p className="text-sm text-muted-foreground">Move payment balances from one employer to another for restructuring or correction.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Source */}
        <Card>
          <CardHeader className="py-3 pb-2">
            <CardTitle className="text-base">Source Employer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Registration No.</Label>
              <div className="flex gap-1">
                <Input value={sourceRegno} onChange={e => setSourceRegno(e.target.value)} placeholder="Enter Reg. No." />
                <Button variant="outline" size="icon" onClick={handleRetrieveSource} disabled={isRetrieving}>
                  {isRetrieving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {sourceEmployer && (
              <div className="p-2 rounded bg-muted text-sm">
                <p className="font-semibold">{sourceEmployer.name}</p>
                <p className="text-xs text-muted-foreground">Status: {sourceEmployer.status || '—'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payments */}
        <Card>
          <CardHeader className="py-3 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              Transferable Payments
              {payments.length > 0 && (
                <Badge variant="secondary">{payments.filter(p => p.selected).length} selected</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Inbox className="h-8 w-8 mx-auto mb-2" />
                {transferComplete ? 'Transfer complete.' : 'Retrieve source employer to see payments.'}
              </div>
            ) : (
              <div className="max-h-[300px] overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map(p => (
                      <TableRow key={p.payment_id} className="cursor-pointer" onClick={() => togglePayment(p.payment_id)}>
                        <TableCell>
                          <input type="checkbox" checked={p.selected} onChange={() => togglePayment(p.payment_id)} />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{p.payment_id}</TableCell>
                        <TableCell className="text-xs">{formatDisplayDate(p.date_received)}</TableCell>
                        <TableCell className="text-right font-mono">${p.amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {payments.length > 0 && (
              <div className="mt-2 text-sm text-right font-mono font-semibold">
                Selected Total: ${selectedTotal.toFixed(2)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Destination */}
        <Card>
          <CardHeader className="py-3 pb-2">
            <CardTitle className="text-base">Destination Employer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Registration No.</Label>
              <div className="flex gap-1">
                <Input value={destRegno} onChange={e => setDestRegno(e.target.value)} placeholder="Enter Reg. No." />
                <Button variant="outline" size="icon" onClick={handleValidateDestination}>
                  <CheckCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {destEmployer && (
              <div className="p-2 rounded bg-muted text-sm">
                <p className="font-semibold">{destEmployer.name}</p>
                <p className="text-xs text-muted-foreground">Status: {destEmployer.status || '—'}</p>
              </div>
            )}
            <Button
              className="w-full"
              onClick={handleTransfer}
              disabled={!destEmployer || payments.filter(p => p.selected).length === 0 || isTransferring}
            >
              {isTransferring ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-1" />}
              Transfer Payments
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TransferPayments;
