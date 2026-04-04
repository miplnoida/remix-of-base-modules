import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { BnCountryProvider, useBnCountry } from '@/contexts/BnCountryContext';
import CountrySelector from '@/components/bn/country/CountrySelector';
import { useBnCountryLegalRefs, useUpsertCountryLegalRef, useDeleteCountryLegalRef } from '@/hooks/bn/useBnCountryPack';
import type { BnCountryLegalRef } from '@/types/bn';
import PageHeader from '@/components/common/PageHeader';

const empty = (): Partial<BnCountryLegalRef> => ({
  ref_code: '', ref_title: '', ref_section: null, ref_url: null, applicable_products: null,
  effective_from: new Date().toISOString().slice(0, 10), effective_to: null, version_number: 1,
  supersedes_id: null, notes: null, is_active: true,
});

const Content: React.FC = () => {
  const { activeCountryCode } = useBnCountry();
  const { data: refs = [] } = useBnCountryLegalRefs(activeCountryCode);
  const upsert = useUpsertCountryLegalRef();
  const remove = useDeleteCountryLegalRef();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<BnCountryLegalRef>>(empty());

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({ ...form, country_code: activeCountryCode });
      toast.success('Legal reference saved');
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Country Legal References" subtitle="Track governing legislation per country with version history" breadcrumbs={[{ label: 'Benefit Management' }, { label: 'Country Config' }, { label: 'Legal References' }]} />
      <div className="flex items-center justify-between">
        <CountrySelector />
        <Button size="sm" onClick={() => { setForm(empty()); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Reference</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Code</TableHead><TableHead>Title</TableHead><TableHead>Section</TableHead>
            <TableHead>Effective From</TableHead><TableHead>Version</TableHead><TableHead>Active</TableHead><TableHead className="w-20">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {refs.map((r: BnCountryLegalRef) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-sm">{r.ref_code}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {r.ref_title}
                    {r.ref_url && <a href={r.ref_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 text-muted-foreground" /></a>}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.ref_section || '—'}</TableCell>
                <TableCell>{r.effective_from}</TableCell>
                <TableCell><Badge variant="outline">v{r.version_number}</Badge></TableCell>
                <TableCell><Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setForm(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={async () => { if (confirm('Delete?')) { try { await remove.mutateAsync(r.id); toast.success('Deleted'); } catch (e: any) { toast.error(e.message); } } }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!refs.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No legal references configured</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? 'Edit' : 'Add'} Legal Reference</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Reference Code</Label><Input value={form.ref_code || ''} onChange={e => setForm(f => ({ ...f, ref_code: e.target.value.toUpperCase() }))} placeholder="SSA_CAP329" /></div>
            <div><Label>Version</Label><Input type="number" value={form.version_number ?? 1} onChange={e => setForm(f => ({ ...f, version_number: parseInt(e.target.value) || 1 }))} /></div>
            <div className="col-span-2"><Label>Title</Label><Input value={form.ref_title || ''} onChange={e => setForm(f => ({ ...f, ref_title: e.target.value }))} placeholder="Social Security Act, Cap 329" /></div>
            <div className="col-span-2"><Label>Section</Label><Input value={form.ref_section || ''} onChange={e => setForm(f => ({ ...f, ref_section: e.target.value || null }))} placeholder="Part III — Short-Term Benefits" /></div>
            <div className="col-span-2"><Label>URL</Label><Input value={form.ref_url || ''} onChange={e => setForm(f => ({ ...f, ref_url: e.target.value || null }))} placeholder="https://..." /></div>
            <div><Label>Effective From</Label><Input type="date" value={form.effective_from || ''} onChange={e => setForm(f => ({ ...f, effective_from: e.target.value }))} /></div>
            <div><Label>Effective To</Label><Input type="date" value={form.effective_to || ''} onChange={e => setForm(f => ({ ...f, effective_to: e.target.value || null }))} /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value || null }))} rows={2} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active ?? true} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={upsert.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CountryLegalRefs: React.FC = () => <BnCountryProvider><Content /></BnCountryProvider>;
export default CountryLegalRefs;
