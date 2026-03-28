import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CreditCard, Plus, Trash2, Pencil, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/utils/formatCurrency';

export interface CardTransaction {
  id?: string;
  machine_id: string;
  card_type: 'CRD' | 'DRD';
  amount: number;
  // Display fields (from join)
  machine_code?: string;
  machine_name?: string;
}

interface CardMachineOption {
  id: string;
  machine_code: string;
  machine_name: string;
  card_type_support: string;
  bank_code: string | null;
}

interface Props {
  batchNumber: string | null;
  transactions: CardTransaction[];
  onChange: (txns: CardTransaction[]) => void;
  loading?: boolean;
}

const emptyRow = { machine_id: '', card_type: 'CRD' as const, amount: 0 };

export const CardTransactionEntry: React.FC<Props> = ({ batchNumber, transactions, onChange, loading }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<{ machine_id: string; card_type: string; amount: string }>({
    machine_id: '',
    card_type: 'CRD',
    amount: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: machines = [], isLoading: machinesLoading } = useQuery({
    queryKey: ['cn_card_machine_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cn_card_machine')
        .select('id, machine_code, machine_name, card_type_support, bank_code')
        .eq('is_active', true)
        .order('machine_code');
      if (error) throw error;
      return (data || []) as CardMachineOption[];
    },
  });

  const getCardTypeOptions = (machineId: string): { value: string; label: string }[] => {
    const machine = machines.find(m => m.id === machineId);
    if (!machine) return [];
    switch (machine.card_type_support) {
      case 'CRD': return [{ value: 'CRD', label: 'Credit Card' }];
      case 'DRD': return [{ value: 'DRD', label: 'Debit Card' }];
      case 'BOTH': return [{ value: 'CRD', label: 'Credit Card' }, { value: 'DRD', label: 'Debit Card' }];
      default: return [];
    }
  };

  const openAdd = () => {
    setEditingIndex(null);
    setForm({ machine_id: '', card_type: 'CRD', amount: '' });
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (index: number) => {
    const txn = transactions[index];
    setEditingIndex(index);
    setForm({
      machine_id: txn.machine_id,
      card_type: txn.card_type,
      amount: txn.amount.toString(),
    });
    setErrors({});
    setDialogOpen(true);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.machine_id) errs.machine_id = 'Select a machine';
    if (!form.card_type) errs.card_type = 'Select card type';
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) errs.amount = 'Amount must be greater than zero';
    
    if (form.machine_id) {
      const machine = machines.find(m => m.id === form.machine_id);
      if (machine && !machine.bank_code) {
        errs.machine_id = 'Selected machine has no bank linkage';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const machine = machines.find(m => m.id === form.machine_id);
    const newTxn: CardTransaction = {
      machine_id: form.machine_id,
      card_type: form.card_type as 'CRD' | 'DRD',
      amount: parseFloat(parseFloat(form.amount).toFixed(2)),
      machine_code: machine?.machine_code,
      machine_name: machine?.machine_name,
    };

    if (editingIndex !== null) {
      const updated = [...transactions];
      updated[editingIndex] = { ...updated[editingIndex], ...newTxn };
      onChange(updated);
    } else {
      onChange([...transactions, newTxn]);
    }
    setDialogOpen(false);
  };

  const removeTxn = (index: number) => {
    onChange(transactions.filter((_, i) => i !== index));
  };

  const crdTotal = transactions.filter(t => t.card_type === 'CRD').reduce((s, t) => s + t.amount, 0);
  const drdTotal = transactions.filter(t => t.card_type === 'DRD').reduce((s, t) => s + t.amount, 0);

  // When machine changes, auto-select card type if only one option
  const handleMachineChange = (machineId: string) => {
    const machine = machines.find(m => m.id === machineId);
    let cardType = form.card_type;
    if (machine) {
      if (machine.card_type_support === 'CRD') cardType = 'CRD';
      else if (machine.card_type_support === 'DRD') cardType = 'DRD';
    }
    setForm(f => ({ ...f, machine_id: machineId, card_type: cardType }));
    setErrors(e => ({ ...e, machine_id: '' }));
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Card Machine Transactions
            </CardTitle>
            <Button size="sm" variant="outline" onClick={openAdd} disabled={machinesLoading}>
              <Plus className="h-4 w-4 mr-1" /> Add Transaction
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">
              No card transactions entered. Click "Add Transaction" to add one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Machine Code</TableHead>
                    <TableHead>Machine Name</TableHead>
                    <TableHead>Card Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-20 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono font-semibold text-sm">{txn.machine_code || '—'}</TableCell>
                      <TableCell className="text-sm">{txn.machine_name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={txn.card_type === 'CRD' ? 'default' : 'secondary'} className="text-xs">
                          {txn.card_type === 'CRD' ? 'Credit Card' : 'Debit Card'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(txn.amount)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(idx)} className="h-7 w-7">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => removeTxn(idx)} className="h-7 w-7">
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {transactions.length > 0 && (
            <div className="mt-4 p-3 bg-muted rounded-lg space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold">Credit Card (CRD) Total:</span>
                <span className="font-bold">{formatCurrency(crdTotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold">Debit Card (DRD) Total:</span>
                <span className="font-bold">{formatCurrency(drdTotal)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Transaction Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingIndex !== null ? 'Edit Card Transaction' : 'Add Card Transaction'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Machine *</Label>
              <Select value={form.machine_id} onValueChange={handleMachineChange}>
                <SelectTrigger><SelectValue placeholder="Select machine..." /></SelectTrigger>
                <SelectContent>
                  {machines.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.machine_code} — {m.machine_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.machine_id && <p className="text-xs text-destructive">{errors.machine_id}</p>}
            </div>

            <div className="space-y-1">
              <Label>Card Type *</Label>
              <Select
                value={form.card_type}
                onValueChange={v => { setForm(f => ({ ...f, card_type: v })); setErrors(e => ({ ...e, card_type: '' })); }}
                disabled={!form.machine_id}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {getCardTypeOptions(form.machine_id).map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.card_type && <p className="text-xs text-destructive">{errors.card_type}</p>}
            </div>

            <div className="space-y-1">
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={e => { setForm(f => ({ ...f, amount: e.target.value })); setErrors(er => ({ ...er, amount: '' })); }}
                placeholder="0.00"
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingIndex !== null ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
