import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useUserCode } from '@/hooks/useUserCode';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, CreditCard, Loader2, Search } from 'lucide-react';

interface CardMachine {
  id: string;
  machine_code: string;
  machine_name: string;
  card_type_support: string;
  is_active: boolean;
  bank_code: string | null;
  settlement_account_no: string | null;
  settlement_account_name: string | null;
  notes: string | null;
  office_code: string | null;
  created_by: string | null;
  created_at: string;
  modified_by: string | null;
  modified_at: string | null;
}

const emptyForm = {
  machine_code: '',
  machine_name: '',
  card_type_support: 'BOTH',
  is_active: true,
  bank_code: '',
  settlement_account_no: '',
  settlement_account_name: '',
  notes: '',
  office_code: '',
};

const CardMachineTab: React.FC = () => {
  const { toast } = useToast();
  const { userCode } = useUserCode();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: machines = [], isLoading } = useQuery({
    queryKey: ['cn_card_machine'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cn_card_machine')
        .select('*')
        .order('machine_code');
      if (error) throw error;
      return (data || []) as CardMachine[];
    },
  });

  const { data: banks = [] } = useQuery({
    queryKey: ['tb_bank_code'],
    queryFn: async () => {
      const { data } = await supabase.from('tb_bank_code').select('bank_code, name').order('name');
      return data || [];
    },
  });

  const { data: offices = [] } = useQuery({
    queryKey: ['tb-office-list'],
    queryFn: async () => {
      const { data } = await supabase.from('tb_office').select('code, description').eq('is_active', true).order('code');
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const getOfficeName = (code: string | null) => {
    if (!code) return '—';
    const o = offices.find((x: any) => x.code === code);
    return o ? `${(o as any).description} (${code})` : code;
  };

  const getBankName = (code: string | null) => {
    if (!code) return '—';
    const bank = banks.find((b: any) => b.bank_code === code);
    return bank ? `${(bank as any).name} (${code})` : code;
  };

  const getCardTypeLabel = (type: string) => {
    switch (type) {
      case 'CRD': return 'Credit Card Only';
      case 'DRD': return 'Debit Card Only';
      case 'BOTH': return 'Credit & Debit';
      default: return type;
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (machine: CardMachine) => {
    setEditingId(machine.id);
    setForm({
      machine_code: machine.machine_code,
      machine_name: machine.machine_name,
      card_type_support: machine.card_type_support,
      is_active: machine.is_active,
      bank_code: machine.bank_code || '',
      settlement_account_no: machine.settlement_account_no || '',
      settlement_account_name: machine.settlement_account_name || '',
      notes: machine.notes || '',
    });
    setErrors({});
    setDialogOpen(true);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.machine_code.trim()) errs.machine_code = 'Machine code is required';
    if (!form.machine_name.trim()) errs.machine_name = 'Machine name is required';
    if (!form.bank_code) errs.bank_code = 'Bank is required';
    if (!form.settlement_account_no.trim()) errs.settlement_account_no = 'Settlement account number is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('cn_card_machine')
          .update({
            machine_code: form.machine_code.trim().toUpperCase(),
            machine_name: form.machine_name.trim(),
            card_type_support: form.card_type_support,
            is_active: form.is_active,
            bank_code: form.bank_code || null,
            settlement_account_no: form.settlement_account_no.trim() || null,
            settlement_account_name: form.settlement_account_name.trim() || null,
            notes: form.notes.trim() || null,
            modified_by: userCode || null,
            modified_at: new Date().toISOString(),
          })
          .eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Machine Updated', description: `${form.machine_code} updated successfully.` });
      } else {
        const { error } = await supabase
          .from('cn_card_machine')
          .insert({
            machine_code: form.machine_code.trim().toUpperCase(),
            machine_name: form.machine_name.trim(),
            card_type_support: form.card_type_support,
            is_active: form.is_active,
            bank_code: form.bank_code || null,
            settlement_account_no: form.settlement_account_no.trim() || null,
            settlement_account_name: form.settlement_account_name.trim() || null,
            notes: form.notes.trim() || null,
            created_by: userCode || null,
          });
        if (error) throw error;
        toast({ title: 'Machine Created', description: `${form.machine_code} created successfully.` });
      }
      queryClient.invalidateQueries({ queryKey: ['cn_card_machine'] });
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Save Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (machine: CardMachine) => {
    try {
      const { error } = await supabase
        .from('cn_card_machine')
        .update({
          is_active: !machine.is_active,
          modified_by: userCode || null,
          modified_at: new Date().toISOString(),
        })
        .eq('id', machine.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['cn_card_machine'] });
      toast({
        title: machine.is_active ? 'Machine Deactivated' : 'Machine Activated',
        description: `${machine.machine_code} is now ${machine.is_active ? 'inactive' : 'active'}.`,
      });
    } catch (err: any) {
      toast({ title: 'Update Failed', description: err.message, variant: 'destructive' });
    }
  };

  const filtered = machines.filter(m =>
    m.machine_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.machine_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Card Payment Machines ({filtered.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search machines..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" /> Add Machine
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No machines found. Click "Add Machine" to create one.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Card Type</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Settlement A/C</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="w-24 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(m => (
                    <TableRow key={m.id} className={!m.is_active ? 'opacity-50' : ''}>
                      <TableCell className="font-mono font-semibold">{m.machine_code}</TableCell>
                      <TableCell>{m.machine_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{getCardTypeLabel(m.card_type_support)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{getBankName(m.bank_code)}</TableCell>
                      <TableCell className="text-sm font-mono">{m.settlement_account_no || '—'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={m.is_active ? 'default' : 'secondary'} className="text-xs">
                          {m.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(m)} className="h-7 w-7">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Switch checked={m.is_active} onCheckedChange={() => toggleActive(m)} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Card Machine' : 'Add Card Machine'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Machine Code *</Label>
                <Input
                  value={form.machine_code}
                  onChange={e => { setForm(f => ({ ...f, machine_code: e.target.value })); setErrors(e2 => ({ ...e2, machine_code: '' })); }}
                  placeholder="POS-01"
                  maxLength={20}
                />
                {errors.machine_code && <p className="text-xs text-destructive">{errors.machine_code}</p>}
              </div>
              <div className="space-y-1">
                <Label>Machine Name *</Label>
                <Input
                  value={form.machine_name}
                  onChange={e => { setForm(f => ({ ...f, machine_name: e.target.value })); setErrors(e2 => ({ ...e2, machine_name: '' })); }}
                  placeholder="Front Desk POS"
                  maxLength={100}
                />
                {errors.machine_name && <p className="text-xs text-destructive">{errors.machine_name}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Card Type Support *</Label>
              <Select value={form.card_type_support} onValueChange={v => setForm(f => ({ ...f, card_type_support: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BOTH">Credit & Debit Card</SelectItem>
                  <SelectItem value="CRD">Credit Card Only</SelectItem>
                  <SelectItem value="DRD">Debit Card Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Bank *</Label>
              <Select value={form.bank_code} onValueChange={v => { setForm(f => ({ ...f, bank_code: v })); setErrors(e2 => ({ ...e2, bank_code: '' })); }}>
                <SelectTrigger><SelectValue placeholder="Select bank..." /></SelectTrigger>
                <SelectContent>
                  {banks.map((b: any) => (
                    <SelectItem key={b.bank_code} value={b.bank_code}>{b.name} ({b.bank_code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bank_code && <p className="text-xs text-destructive">{errors.bank_code}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Settlement Account No *</Label>
                <Input
                  value={form.settlement_account_no}
                  onChange={e => { setForm(f => ({ ...f, settlement_account_no: e.target.value })); setErrors(e2 => ({ ...e2, settlement_account_no: '' })); }}
                  placeholder="1234567890"
                  maxLength={50}
                />
                {errors.settlement_account_no && <p className="text-xs text-destructive">{errors.settlement_account_no}</p>}
              </div>
              <div className="space-y-1">
                <Label>Account Name</Label>
                <Input
                  value={form.settlement_account_name}
                  onChange={e => setForm(f => ({ ...f, settlement_account_name: e.target.value }))}
                  placeholder="SSB Settlement"
                  maxLength={100}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Active</Label>
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              {editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CardMachineTab;
