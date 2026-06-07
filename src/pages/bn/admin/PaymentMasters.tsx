/**
 * Payment Masters Admin
 * Configurable Bank, Branch, Payment Method, EFT Format & Field Layout setup.
 * Drives the EFT generation engine in eftFormatService / eftFileService.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from 'sonner';
import {
  listBanks, upsertBank, deleteBank,
  listBranches, upsertBranch, deleteBranch,
  listPaymentMethods, upsertPaymentMethod,
} from '@/services/bn/payment/bankMasterService';
import { supabase } from '@/integrations/supabase/client';
import type {
  BnBankMaster, BnBankBranch, BnPaymentMethod,
  BnEftFormat, BnEftFormatField, EftRecordType, EftPadding,
} from '@/types/bnBankEft';

const db = supabase as any;

function useUserCode() {
  const { user } = useSupabaseAuth();
  return (user as any)?.user_metadata?.user_code || (user as any)?.email || 'SYSTEM';
}

/* ───────────────────────── Bank Master ───────────────────────── */
const BanksTab: React.FC = () => {
  const userCode = useUserCode();
  const [rows, setRows] = useState<BnBankMaster[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<BnBankMaster> | null>(null);
  const load = async () => setRows(await listBanks());
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.bank_code || !editing?.bank_name || !editing?.country_code) {
      toast.error('Bank code, name and country are required'); return;
    }
    try {
      await upsertBank({ ...editing, active: editing.active ?? true }, userCode);
      toast.success('Bank saved'); setOpen(false); setEditing(null); load();
    } catch (e: any) { toast.error(e.message); }
  };
  const remove = async (code: string) => {
    if (!confirm(`Delete bank ${code}?`)) return;
    try { await deleteBank(code, userCode); toast.success('Deleted'); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Bank Master</CardTitle>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing({ active: true })}>Add Bank</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing?.id ? 'Edit' : 'Add'} Bank</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Bank Code *</Label><Input value={editing?.bank_code ?? ''} onChange={e => setEditing({ ...editing, bank_code: e.target.value })} disabled={!!editing?.id} /></div>
              <div><Label>Country Code *</Label><Input value={editing?.country_code ?? ''} onChange={e => setEditing({ ...editing, country_code: e.target.value.toUpperCase() })} maxLength={3} /></div>
              <div className="col-span-2"><Label>Bank Name *</Label><Input value={editing?.bank_name ?? ''} onChange={e => setEditing({ ...editing, bank_name: e.target.value })} /></div>
              <div><Label>SWIFT</Label><Input value={editing?.swift_code ?? ''} onChange={e => setEditing({ ...editing, swift_code: e.target.value })} /></div>
              <div><Label>Clearing Code</Label><Input value={editing?.clearing_code ?? ''} onChange={e => setEditing({ ...editing, clearing_code: e.target.value })} /></div>
              <div><Label>Default Currency</Label><Input value={editing?.default_currency ?? ''} onChange={e => setEditing({ ...editing, default_currency: e.target.value.toUpperCase() })} maxLength={3} /></div>
              <div className="flex items-center gap-2 mt-6"><Switch checked={editing?.active ?? true} onCheckedChange={v => setEditing({ ...editing, active: v })} /><Label>Active</Label></div>
              <div className="col-span-2"><Label>Notes</Label><Textarea value={editing?.notes ?? ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Country</TableHead>
            <TableHead>SWIFT</TableHead><TableHead>Currency</TableHead><TableHead>Active</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.bank_code}</TableCell><TableCell>{r.bank_name}</TableCell>
                <TableCell>{r.country_code}</TableCell><TableCell>{r.swift_code}</TableCell>
                <TableCell>{r.default_currency}</TableCell>
                <TableCell><Badge variant={r.active ? 'default' : 'secondary'}>{r.active ? 'Yes' : 'No'}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r.bank_code)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No banks configured</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

/* ───────────────────────── Branches ───────────────────────── */
const BranchesTab: React.FC = () => {
  const userCode = useUserCode();
  const [banks, setBanks] = useState<BnBankMaster[]>([]);
  const [bank, setBank] = useState<string>('');
  const [rows, setRows] = useState<BnBankBranch[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<BnBankBranch> | null>(null);

  useEffect(() => { listBanks().then(setBanks); }, []);
  useEffect(() => { listBranches(bank || null).then(setRows); }, [bank]);

  const save = async () => {
    if (!editing?.bank_code || !editing?.branch_code || !editing?.branch_name) {
      toast.error('Bank, branch code and name are required'); return;
    }
    try {
      await upsertBranch({ ...editing, active: editing.active ?? true }, userCode);
      toast.success('Branch saved'); setOpen(false); setEditing(null);
      listBranches(bank || null).then(setRows);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Bank Branches</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={bank} onValueChange={setBank}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Filter by bank" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All banks</SelectItem>
              {banks.map(b => <SelectItem key={b.bank_code} value={b.bank_code}>{b.bank_code} — {b.bank_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild><Button onClick={() => setEditing({ active: true, bank_code: bank || undefined })}>Add Branch</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing?.id ? 'Edit' : 'Add'} Branch</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Bank *</Label>
                  <Select value={editing?.bank_code ?? ''} onValueChange={v => setEditing({ ...editing, bank_code: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{banks.map(b => <SelectItem key={b.bank_code} value={b.bank_code}>{b.bank_code} — {b.bank_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Branch Code *</Label><Input value={editing?.branch_code ?? ''} onChange={e => setEditing({ ...editing, branch_code: e.target.value })} /></div>
                <div className="col-span-2"><Label>Branch Name *</Label><Input value={editing?.branch_name ?? ''} onChange={e => setEditing({ ...editing, branch_name: e.target.value })} /></div>
                <div className="col-span-2"><Label>Routing Number</Label><Input value={editing?.routing_number ?? ''} onChange={e => setEditing({ ...editing, routing_number: e.target.value })} /></div>
                <div className="flex items-center gap-2"><Switch checked={editing?.active ?? true} onCheckedChange={v => setEditing({ ...editing, active: v })} /><Label>Active</Label></div>
              </div>
              <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Bank</TableHead><TableHead>Branch Code</TableHead><TableHead>Branch Name</TableHead>
            <TableHead>Routing</TableHead><TableHead>Active</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.bank_code}</TableCell><TableCell>{r.branch_code}</TableCell>
                <TableCell>{r.branch_name}</TableCell><TableCell>{r.routing_number}</TableCell>
                <TableCell><Badge variant={r.active ? 'default' : 'secondary'}>{r.active ? 'Yes' : 'No'}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={async () => { if (confirm('Delete branch?')) { await deleteBranch(r.id, userCode); listBranches(bank || null).then(setRows); } }}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No branches</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

/* ───────────────────────── Payment Methods ───────────────────────── */
const MethodsTab: React.FC = () => {
  const userCode = useUserCode();
  const [rows, setRows] = useState<BnPaymentMethod[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<BnPaymentMethod> | null>(null);
  const load = () => listPaymentMethods().then(setRows);
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.method_code || !editing?.method_name) { toast.error('Code & name required'); return; }
    try {
      await upsertPaymentMethod({ ...editing, active: editing.active ?? true, sort_order: editing.sort_order ?? 0 }, userCode);
      toast.success('Saved'); setOpen(false); setEditing(null); load();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Payment Methods</CardTitle>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button onClick={() => setEditing({ active: true })}>Add Method</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Payment Method</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code *</Label><Input value={editing?.method_code ?? ''} onChange={e => setEditing({ ...editing, method_code: e.target.value.toUpperCase() })} disabled={!!editing?.id} /></div>
              <div><Label>Name *</Label><Input value={editing?.method_name ?? ''} onChange={e => setEditing({ ...editing, method_name: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={editing?.requires_bank_account ?? false} onCheckedChange={v => setEditing({ ...editing, requires_bank_account: v })} /><Label>Requires bank account</Label></div>
              <div className="flex items-center gap-2"><Switch checked={editing?.requires_postal_address ?? false} onCheckedChange={v => setEditing({ ...editing, requires_postal_address: v })} /><Label>Requires postal address</Label></div>
              <div className="flex items-center gap-2"><Switch checked={editing?.generates_eft_file ?? false} onCheckedChange={v => setEditing({ ...editing, generates_eft_file: v })} /><Label>Generates EFT file</Label></div>
              <div className="flex items-center gap-2"><Switch checked={editing?.consumes_cheque_stock ?? false} onCheckedChange={v => setEditing({ ...editing, consumes_cheque_stock: v })} /><Label>Consumes cheque stock</Label></div>
              <div><Label>Sort Order</Label><Input type="number" value={editing?.sort_order ?? 0} onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></div>
              <div className="flex items-center gap-2 mt-6"><Switch checked={editing?.active ?? true} onCheckedChange={v => setEditing({ ...editing, active: v })} /><Label>Active</Label></div>
            </div>
            <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Bank Acct</TableHead>
            <TableHead>Postal</TableHead><TableHead>EFT</TableHead><TableHead>Cheque</TableHead><TableHead>Active</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.method_code}</TableCell><TableCell>{r.method_name}</TableCell>
                <TableCell>{r.requires_bank_account ? '✓' : ''}</TableCell>
                <TableCell>{r.requires_postal_address ? '✓' : ''}</TableCell>
                <TableCell>{r.generates_eft_file ? '✓' : ''}</TableCell>
                <TableCell>{r.consumes_cheque_stock ? '✓' : ''}</TableCell>
                <TableCell><Badge variant={r.active ? 'default' : 'secondary'}>{r.active ? 'Yes' : 'No'}</Badge></TableCell>
                <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>Edit</Button></TableCell>
              </TableRow>
            ))}
            {!rows.length && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No payment methods</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

/* ───────────────────────── EFT Formats + Field Layout ───────────────────────── */
const EftFormatsTab: React.FC = () => {
  const userCode = useUserCode();
  const [formats, setFormats] = useState<BnEftFormat[]>([]);
  const [selected, setSelected] = useState<BnEftFormat | null>(null);
  const [fields, setFields] = useState<BnEftFormatField[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<BnEftFormat> | null>(null);
  const [fieldOpen, setFieldOpen] = useState(false);
  const [editingField, setEditingField] = useState<Partial<BnEftFormatField> | null>(null);

  const loadFormats = async () => {
    const { data } = await db.from('bn_eft_format').select('*').order('format_code');
    setFormats((data ?? []) as BnEftFormat[]);
  };
  const loadFields = async (code: string) => {
    const { data } = await db.from('bn_eft_format_field').select('*').eq('format_code', code).order('record_type').order('order_index');
    setFields((data ?? []) as BnEftFormatField[]);
  };
  useEffect(() => { loadFormats(); }, []);
  useEffect(() => { if (selected) loadFields(selected.format_code); else setFields([]); }, [selected]);

  const saveFormat = async () => {
    if (!editing?.format_code || !editing?.format_name) { toast.error('Code & name required'); return; }
    const payload = {
      ...editing,
      active: editing.active ?? true,
      header_required: editing.header_required ?? false,
      trailer_required: editing.trailer_required ?? false,
      amount_decimals: editing.amount_decimals ?? 2,
      record_separator: editing.record_separator ?? '\n',
      date_format: editing.date_format ?? 'YYYYMMDD',
      amount_format: editing.amount_format ?? 'CENTS',
      encoding: editing.encoding ?? 'UTF-8',
      file_extension: editing.file_extension ?? 'txt',
    };
    const { error } = await db.from('bn_eft_format').upsert(payload, { onConflict: 'format_code' });
    if (error) return toast.error(error.message);
    toast.success('Format saved'); setOpen(false); setEditing(null); loadFormats();
  };

  const saveField = async () => {
    if (!editingField?.field_name || !selected) { toast.error('Field name required'); return; }
    const payload = {
      ...editingField,
      format_code: selected.format_code,
      padding: editingField.padding ?? 'NONE',
      pad_char: editingField.pad_char ?? ' ',
      required: editingField.required ?? false,
      order_index: editingField.order_index ?? fields.filter(f => f.record_type === editingField.record_type).length,
    };
    const { error } = editingField.id
      ? await db.from('bn_eft_format_field').update(payload).eq('id', editingField.id)
      : await db.from('bn_eft_format_field').insert(payload);
    if (error) return toast.error(error.message);
    toast.success('Field saved'); setFieldOpen(false); setEditingField(null);
    loadFields(selected.format_code);
  };

  const deleteField = async (id: string) => {
    if (!confirm('Delete field?')) return;
    await db.from('bn_eft_format_field').delete().eq('id', id);
    if (selected) loadFields(selected.format_code);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>EFT Formats</CardTitle>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild><Button onClick={() => setEditing({ active: true, amount_decimals: 2, file_extension: 'txt', date_format: 'YYYYMMDD', amount_format: 'CENTS', encoding: 'UTF-8', record_separator: '\n' })}>Add Format</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{editing?.id ? 'Edit' : 'Add'} EFT Format</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Format Code *</Label><Input value={editing?.format_code ?? ''} onChange={e => setEditing({ ...editing, format_code: e.target.value })} disabled={!!editing?.id} /></div>
                <div><Label>Format Name *</Label><Input value={editing?.format_name ?? ''} onChange={e => setEditing({ ...editing, format_name: e.target.value })} /></div>
                <div><Label>Country</Label><Input value={editing?.country_code ?? ''} maxLength={3} onChange={e => setEditing({ ...editing, country_code: e.target.value.toUpperCase() })} /></div>
                <div><Label>Bank (optional)</Label><Input value={editing?.bank_code ?? ''} onChange={e => setEditing({ ...editing, bank_code: e.target.value })} /></div>
                <div><Label>File Extension</Label><Input value={editing?.file_extension ?? ''} onChange={e => setEditing({ ...editing, file_extension: e.target.value })} /></div>
                <div><Label>Delimiter (blank = fixed-width)</Label><Input value={editing?.delimiter ?? ''} onChange={e => setEditing({ ...editing, delimiter: e.target.value })} /></div>
                <div><Label>Date Format</Label><Input value={editing?.date_format ?? ''} onChange={e => setEditing({ ...editing, date_format: e.target.value })} /></div>
                <div><Label>Amount Format</Label>
                  <Select value={editing?.amount_format ?? 'CENTS'} onValueChange={v => setEditing({ ...editing, amount_format: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CENTS">CENTS (integer)</SelectItem>
                      <SelectItem value="DECIMAL">DECIMAL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Amount Decimals</Label><Input type="number" value={editing?.amount_decimals ?? 2} onChange={e => setEditing({ ...editing, amount_decimals: Number(e.target.value) })} /></div>
                <div><Label>Encoding</Label><Input value={editing?.encoding ?? 'UTF-8'} onChange={e => setEditing({ ...editing, encoding: e.target.value })} /></div>
                <div className="flex items-center gap-2"><Switch checked={editing?.header_required ?? false} onCheckedChange={v => setEditing({ ...editing, header_required: v })} /><Label>Header required</Label></div>
                <div className="flex items-center gap-2"><Switch checked={editing?.trailer_required ?? false} onCheckedChange={v => setEditing({ ...editing, trailer_required: v })} /><Label>Trailer required</Label></div>
                <div className="flex items-center gap-2"><Switch checked={editing?.active ?? true} onCheckedChange={v => setEditing({ ...editing, active: v })} /><Label>Active</Label></div>
                <div className="col-span-2"><Label>Notes</Label><Textarea value={editing?.notes ?? ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={saveFormat}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Country</TableHead><TableHead>Bank</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
            <TableBody>
              {formats.map(f => (
                <TableRow key={f.id} className={selected?.id === f.id ? 'bg-muted/50 cursor-pointer' : 'cursor-pointer'} onClick={() => setSelected(f)}>
                  <TableCell>{f.format_code}</TableCell><TableCell>{f.format_name}</TableCell>
                  <TableCell>{f.country_code}</TableCell><TableCell>{f.bank_code}</TableCell>
                  <TableCell><Badge variant={f.active ? 'default' : 'secondary'}>{f.active ? 'Yes' : 'No'}</Badge></TableCell>
                </TableRow>
              ))}
              {!formats.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No formats</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Field Layout {selected && <span className="text-sm font-normal text-muted-foreground">— {selected.format_code}</span>}</CardTitle>
          {selected && (
            <Dialog open={fieldOpen} onOpenChange={(o) => { setFieldOpen(o); if (!o) setEditingField(null); }}>
              <DialogTrigger asChild><Button size="sm" onClick={() => setEditingField({ record_type: 'DETAIL', padding: 'NONE', pad_char: ' ', required: false })}>Add Field</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingField?.id ? 'Edit' : 'Add'} Field</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Record Type</Label>
                    <Select value={editingField?.record_type ?? 'DETAIL'} onValueChange={v => setEditingField({ ...editingField, record_type: v as EftRecordType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HEADER">HEADER</SelectItem>
                        <SelectItem value="DETAIL">DETAIL</SelectItem>
                        <SelectItem value="TRAILER">TRAILER</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Order</Label><Input type="number" value={editingField?.order_index ?? 0} onChange={e => setEditingField({ ...editingField, order_index: Number(e.target.value) })} /></div>
                  <div className="col-span-2"><Label>Field Name *</Label><Input value={editingField?.field_name ?? ''} onChange={e => setEditingField({ ...editingField, field_name: e.target.value })} /></div>
                  <div className="col-span-2"><Label>Source Field (dotted path, e.g. profile.account_number)</Label><Input value={editingField?.source_field ?? ''} onChange={e => setEditingField({ ...editingField, source_field: e.target.value })} /></div>
                  <div><Label>Start Position</Label><Input type="number" value={editingField?.start_position ?? ''} onChange={e => setEditingField({ ...editingField, start_position: e.target.value ? Number(e.target.value) : null })} /></div>
                  <div><Label>Length</Label><Input type="number" value={editingField?.length ?? ''} onChange={e => setEditingField({ ...editingField, length: e.target.value ? Number(e.target.value) : null })} /></div>
                  <div><Label>Padding</Label>
                    <Select value={editingField?.padding ?? 'NONE'} onValueChange={v => setEditingField({ ...editingField, padding: v as EftPadding })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">NONE</SelectItem>
                        <SelectItem value="LEFT">LEFT</SelectItem>
                        <SelectItem value="RIGHT">RIGHT</SelectItem>
                        <SelectItem value="ZERO">ZERO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Pad Char</Label><Input value={editingField?.pad_char ?? ' '} maxLength={1} onChange={e => setEditingField({ ...editingField, pad_char: e.target.value || ' ' })} /></div>
                  <div><Label>Default Value</Label><Input value={editingField?.default_value ?? ''} onChange={e => setEditingField({ ...editingField, default_value: e.target.value })} /></div>
                  <div><Label>Transform</Label>
                    <Select value={editingField?.transform ?? ''} onValueChange={v => setEditingField({ ...editingField, transform: v || null })}>
                      <SelectTrigger><SelectValue placeholder="(none)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">(none)</SelectItem>
                        <SelectItem value="UPPER">UPPER</SelectItem>
                        <SelectItem value="LOWER">LOWER</SelectItem>
                        <SelectItem value="DATE_FMT">DATE_FMT</SelectItem>
                        <SelectItem value="AMOUNT_CENTS">AMOUNT_CENTS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2"><Switch checked={editingField?.required ?? false} onCheckedChange={v => setEditingField({ ...editingField, required: v })} /><Label>Required</Label></div>
                </div>
                <DialogFooter><Button onClick={saveField}>Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {!selected ? (
            <div className="text-sm text-muted-foreground">Select a format to view its field layout.</div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Type</TableHead><TableHead>#</TableHead><TableHead>Field</TableHead>
                <TableHead>Source</TableHead><TableHead>Pos</TableHead><TableHead>Len</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {fields.map(f => (
                  <TableRow key={f.id}>
                    <TableCell><Badge variant="outline">{f.record_type}</Badge></TableCell>
                    <TableCell>{f.order_index}</TableCell>
                    <TableCell>{f.field_name}{f.required && ' *'}</TableCell>
                    <TableCell className="font-mono text-xs">{f.source_field ?? f.default_value ?? ''}</TableCell>
                    <TableCell>{f.start_position ?? ''}</TableCell>
                    <TableCell>{f.length ?? ''}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => { setEditingField(f); setFieldOpen(true); }}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteField(f.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!fields.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No fields defined</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/* ───────────────────────── Page Shell ───────────────────────── */
export default function PaymentMasters() {
  return (
    <div className="container mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Payment Masters</h1>
        <p className="text-sm text-muted-foreground">Configure banks, branches, payment methods, and EFT file layouts used by Payment Preparation.</p>
      </div>
      <Tabs defaultValue="banks">
        <TabsList>
          <TabsTrigger value="banks">Banks</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="eft">EFT Formats & Layout</TabsTrigger>
        </TabsList>
        <TabsContent value="banks"><BanksTab /></TabsContent>
        <TabsContent value="branches"><BranchesTab /></TabsContent>
        <TabsContent value="methods"><MethodsTab /></TabsContent>
        <TabsContent value="eft"><EftFormatsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
