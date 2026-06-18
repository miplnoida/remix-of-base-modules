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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, FileCode } from 'lucide-react';
import { toast } from 'sonner';
import { BnCountryProvider, useBnCountry } from '@/contexts/BnCountryContext';
import CountrySelector from '@/components/bn/country/CountrySelector';
import {
  useBnCountryPaymentConfig, useUpsertCountryPaymentConfig, useDeleteCountryPaymentConfig,
} from '@/hooks/bn/useBnCountryPack';
import { useReferenceValues } from '@/hooks/bn/useReferenceData';
import { BN_REF_GROUPS } from '@/services/bn/referenceDataService';
import { BN_PAYMENT_METHODS, BN_PAYMENT_CYCLES } from '@/types/bn';
import type { BnCountryPaymentConfig } from '@/types/bn';
import { PageHeader } from '@/components/common/PageHeader';
import { EFT_FORMAT_PRESETS, getPreset } from '@/lib/bn/eftFormatPresets';

const PAYMENT_METHOD_FALLBACK = BN_PAYMENT_METHODS.map((m) => ({ value: m, label: m }));

const empty = (): Partial<BnCountryPaymentConfig> => ({
  payment_method: '', method_label: '', is_default: false, requires_bank_account: false, requires_mobile_number: false,
  processing_days: 3, cut_off_day: null, payment_cycle: 'WEEKLY', calendar_config: {}, is_active: true,
  bank_file_format: '', file_naming_convention: '', file_date_format: '',
  header_record_format: '', detail_record_format: '', trailer_record_format: '',
  account_number_rule: '', routing_number_rule: '', bank_code: '',
});

const Content: React.FC = () => {
  const { activeCountryCode } = useBnCountry();
  const { data: configs = [] } = useBnCountryPaymentConfig(activeCountryCode);
  const upsert = useUpsertCountryPaymentConfig();
  const remove = useDeleteCountryPaymentConfig();
  const { options: methodOptions } = useReferenceValues(BN_REF_GROUPS.PAYMENT_METHOD_TYPE, PAYMENT_METHOD_FALLBACK);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<BnCountryPaymentConfig>>(empty());

  const isEft = (form.payment_method || '').toUpperCase() === 'EFT';

  const applyPreset = (key: string) => {
    const p = getPreset(key);
    if (!p) return;
    setForm((f) => ({
      ...f,
      bank_file_format: p.bank_file_format,
      file_naming_convention: p.file_naming_convention,
      file_date_format: p.file_date_format,
      header_record_format: p.header_record_format,
      detail_record_format: p.detail_record_format,
      trailer_record_format: p.trailer_record_format,
      account_number_rule: p.account_number_rule || '',
      routing_number_rule: p.routing_number_rule || '',
    }));
    toast.success(`Applied preset: ${p.label}`);
  };

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({ ...form, country_code: activeCountryCode });
      toast.success('Payment config saved');
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Country Payment Config" subtitle="Configure payment methods, calendars and EFT formats per country"
        breadcrumbs={[{ label: 'Benefit Management' }, { label: 'Country Config' }, { label: 'Payment Config' }]} />
      <div className="flex items-center justify-between">
        <CountrySelector />
        <Button size="sm" onClick={() => { setForm(empty()); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Method</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Method</TableHead><TableHead>Label</TableHead><TableHead>Cycle</TableHead>
            <TableHead>Format</TableHead><TableHead>Default</TableHead><TableHead>Active</TableHead>
            <TableHead className="w-20">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {configs.map((c: BnCountryPaymentConfig) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-sm">{c.payment_method}</TableCell>
                <TableCell>{c.method_label}</TableCell>
                <TableCell><Badge variant="outline">{c.payment_cycle}</Badge></TableCell>
                <TableCell className="text-xs">{c.bank_file_format || '—'}</TableCell>
                <TableCell>{c.is_default && <Badge>Default</Badge>}</TableCell>
                <TableCell><Badge variant={c.is_active ? 'default' : 'secondary'}>{c.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setForm(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon"
                      onClick={async () => { if (confirm('Delete?')) { try { await remove.mutateAsync(c.id); toast.success('Deleted'); } catch (e: any) { toast.error(e.message); } } }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!configs.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No payment methods configured</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? 'Edit' : 'Add'} Payment Method</DialogTitle></DialogHeader>
          <Tabs defaultValue="basics">
            <TabsList>
              <TabsTrigger value="basics">Basics</TabsTrigger>
              <TabsTrigger value="eft" disabled={!isEft}>EFT Format</TabsTrigger>
            </TabsList>
            <TabsContent value="basics">
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div><Label>Payment Method *</Label>
                  <Select
                    value={form.payment_method || ''}
                    onValueChange={(v) => {
                      const chosen = methodOptions.find((o) => o.value === v);
                      setForm((f) => ({ ...f, payment_method: v, method_label: f.method_label || chosen?.label || v }));
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                    <SelectContent>{methodOptions.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Display Label</Label><Input value={form.method_label || ''} onChange={e => setForm(f => ({ ...f, method_label: e.target.value }))} placeholder="Auto-filled from method" /></div>
                <div><Label>Payment Cycle</Label>
                  <Select value={form.payment_cycle || 'WEEKLY'} onValueChange={v => setForm(f => ({ ...f, payment_cycle: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{BN_PAYMENT_CYCLES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Processing Days</Label>
                  <Input type="number" value={form.processing_days ?? 3}
                    onChange={e => setForm(f => ({ ...f, processing_days: parseInt(e.target.value) || 3 }))} />
                </div>
                <div className="flex items-center gap-2"><Switch checked={form.is_default ?? false} onCheckedChange={v => setForm(f => ({ ...f, is_default: v }))} /><Label>Default</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.requires_bank_account ?? false} onCheckedChange={v => setForm(f => ({ ...f, requires_bank_account: v }))} /><Label>Requires Bank Account</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.is_active ?? true} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Active</Label></div>
              </div>
            </TabsContent>

            <TabsContent value="eft">
              <div className="space-y-4 mt-2">
                <div className="flex items-end gap-2 p-3 bg-muted/40 rounded-md">
                  <div className="flex-1">
                    <Label className="text-xs flex items-center gap-1.5"><FileCode className="h-3.5 w-3.5" /> Load Preset</Label>
                    <Select onValueChange={applyPreset}>
                      <SelectTrigger><SelectValue placeholder="Choose a bank-format preset…" /></SelectTrigger>
                      <SelectContent>
                        {EFT_FORMAT_PRESETS.map((p) => (
                          <SelectItem key={p.key} value={p.key}>
                            <div>
                              <div className="font-medium">{p.label}</div>
                              <div className="text-[10px] text-muted-foreground">{p.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Bank File Format</Label>
                    <Input value={form.bank_file_format || ''} onChange={(e) => setForm(f => ({ ...f, bank_file_format: e.target.value }))} placeholder="CSV / NACHA / SWIFT" />
                  </div>
                  <div><Label className="text-xs">Bank Code</Label>
                    <Input value={form.bank_code || ''} onChange={(e) => setForm(f => ({ ...f, bank_code: e.target.value }))} />
                  </div>
                  <div><Label className="text-xs">File Naming Convention</Label>
                    <Input value={form.file_naming_convention || ''} onChange={(e) => setForm(f => ({ ...f, file_naming_convention: e.target.value }))} placeholder="BN_EFT_{batch_number}_{yyyymmdd}.csv" />
                  </div>
                  <div><Label className="text-xs">File Date Format</Label>
                    <Input value={form.file_date_format || ''} onChange={(e) => setForm(f => ({ ...f, file_date_format: e.target.value }))} placeholder="YYYYMMDD" />
                  </div>
                  <div><Label className="text-xs">Account Number Rule</Label>
                    <Input value={form.account_number_rule || ''} onChange={(e) => setForm(f => ({ ...f, account_number_rule: e.target.value }))} />
                  </div>
                  <div><Label className="text-xs">Routing Number Rule</Label>
                    <Input value={form.routing_number_rule || ''} onChange={(e) => setForm(f => ({ ...f, routing_number_rule: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Header Record Format</Label>
                  <Textarea rows={2} value={form.header_record_format || ''} onChange={(e) => setForm(f => ({ ...f, header_record_format: e.target.value }))} className="font-mono text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Detail Record Format</Label>
                  <Textarea rows={3} value={form.detail_record_format || ''} onChange={(e) => setForm(f => ({ ...f, detail_record_format: e.target.value }))} className="font-mono text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Trailer Record Format</Label>
                  <Textarea rows={2} value={form.trailer_record_format || ''} onChange={(e) => setForm(f => ({ ...f, trailer_record_format: e.target.value }))} className="font-mono text-xs" />
                </div>

                <div className="text-[11px] text-muted-foreground p-2 bg-muted/30 rounded">
                  Tokens: <code>{'{file_reference}'}</code> <code>{'{generated_date}'}</code> <code>{'{count}'}</code> <code>{'{total_amount}'}</code> <code>{'{batch_number}'}</code> <code>{'{bank_code}'}</code> <code>{'{seq}'}</code> <code>{'{payee_name}'}</code> <code>{'{account_number}'}</code> <code>{'{routing_number}'}</code> <code>{'{amount}'}</code> <code>{'{currency}'}</code> <code>{'{reference}'}</code> <code>{'{ssn}'}</code>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CountryPaymentConfig: React.FC = () => <BnCountryProvider><Content /></BnCountryProvider>;
export default CountryPaymentConfig;
