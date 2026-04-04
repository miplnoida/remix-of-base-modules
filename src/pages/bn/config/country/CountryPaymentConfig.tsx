import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { BnCountryProvider, useBnCountry } from '@/contexts/BnCountryContext';
import CountrySelector from '@/components/bn/country/CountrySelector';
import { useBnCountryPaymentConfig, useUpsertCountryPaymentConfig, useDeleteCountryPaymentConfig } from '@/hooks/bn/useBnCountryPack';
import { BN_PAYMENT_METHODS, BN_PAYMENT_CYCLES } from '@/types/bn';
import type { BnCountryPaymentConfig } from '@/types/bn';
import PageHeader from '@/components/common/PageHeader';

const empty = (): Partial<BnCountryPaymentConfig> => ({
  payment_method: '', method_label: '', is_default: false, requires_bank_account: false, requires_mobile_number: false,
  processing_days: 3, cut_off_day: null, payment_cycle: 'WEEKLY', calendar_config: {}, is_active: true,
});

const Content: React.FC = () => {
  const { activeCountryCode } = useBnCountry();
  const { data: configs = [] } = useBnCountryPaymentConfig(activeCountryCode);
  const upsert = useUpsertCountryPaymentConfig();
  const remove = useDeleteCountryPaymentConfig();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<BnCountryPaymentConfig>>(empty());

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({ ...form, country_code: activeCountryCode });
      toast.success('Payment config saved');
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Country Payment Config" subtitle="Configure payment methods and calendars per country" breadcrumbs={[{ label: 'Benefit Management' }, { label: 'Country Config' }, { label: 'Payment Config' }]} />
      <div className="flex items-center justify-between">
        <CountrySelector />
        <Button size="sm" onClick={() => { setForm(empty()); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Method</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Method</TableHead><TableHead>Label</TableHead><TableHead>Cycle</TableHead>
            <TableHead>Processing Days</TableHead><TableHead>Default</TableHead><TableHead>Active</TableHead><TableHead className="w-20">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {configs.map((c: BnCountryPaymentConfig) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-sm">{c.payment_method}</TableCell>
                <TableCell>{c.method_label}</TableCell>
                <TableCell><Badge variant="outline">{c.payment_cycle}</Badge></TableCell>
                <TableCell>{c.processing_days}</TableCell>
                <TableCell>{c.is_default && <Badge>Default</Badge>}</TableCell>
                <TableCell><Badge variant={c.is_active ? 'default' : 'secondary'}>{c.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setForm(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={async () => { if (confirm('Delete?')) { try { await remove.mutateAsync(c.id); toast.success('Deleted'); } catch (e: any) { toast.error(e.message); } } }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!configs.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No payment methods configured</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? 'Edit' : 'Add'} Payment Method</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Method Code</Label>
              <Select value={form.payment_method || ''} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>{BN_PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Label</Label><Input value={form.method_label || ''} onChange={e => setForm(f => ({ ...f, method_label: e.target.value }))} /></div>
            <div><Label>Payment Cycle</Label>
              <Select value={form.payment_cycle || 'WEEKLY'} onValueChange={v => setForm(f => ({ ...f, payment_cycle: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BN_PAYMENT_CYCLES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Processing Days</Label><Input type="number" value={form.processing_days ?? 3} onChange={e => setForm(f => ({ ...f, processing_days: parseInt(e.target.value) || 3 }))} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_default ?? false} onCheckedChange={v => setForm(f => ({ ...f, is_default: v }))} /><Label>Default</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.requires_bank_account ?? false} onCheckedChange={v => setForm(f => ({ ...f, requires_bank_account: v }))} /><Label>Requires Bank Account</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active ?? true} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={upsert.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CountryPaymentConfig: React.FC = () => <BnCountryProvider><Content /></BnCountryProvider>;
export default CountryPaymentConfig;
