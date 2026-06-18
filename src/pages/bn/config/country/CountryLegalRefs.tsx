/**
 * CountryLegalRefs — manages the structured Legal References master
 * (`bn_legal_reference`). Replaces the legacy loose-text screen so that
 * Product Catalog, eligibility rules, formulas, rate tables, medical tariffs,
 * letters and decisions can all bind to the same canonical reference rows.
 */
import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { BnCountryProvider, useBnCountry } from '@/contexts/BnCountryContext';
import CountrySelector from '@/components/bn/country/CountrySelector';
import {
  useLegalReferences,
  useUpsertLegalReference,
  useDeleteLegalReference,
  useSetLegalReferenceStatus,
} from '@/hooks/bn/useLegalReferences';
import { useReferenceValues } from '@/hooks/bn/useReferenceData';
import { BN_REF_GROUPS } from '@/services/bn/referenceDataService';
import type { BnLegalReference, LegalRefStatus } from '@/services/bn/legalReferenceService';
import { PageHeader } from '@/components/common/PageHeader';

const STATUS_FALLBACK = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUPERSEDED', label: 'Superseded' },
  { value: 'REPEALED', label: 'Repealed' },
];

const statusVariant = (s: LegalRefStatus) =>
  s === 'ACTIVE' ? 'default' : s === 'DRAFT' ? 'secondary' : s === 'SUPERSEDED' ? 'outline' : 'destructive';

const empty = (): Partial<BnLegalReference> => ({
  ref_code: '',
  short_title: '',
  act_name: '',
  chapter: null,
  section: null,
  subsection: null,
  regulation: null,
  full_reference_text: null,
  ref_url: null,
  effective_from: new Date().toISOString().slice(0, 10),
  effective_to: null,
  status: 'DRAFT',
  version_number: 1,
  supersedes_id: null,
  tags: null,
  notes: null,
  is_active: true,
});

const Content: React.FC = () => {
  const { activeCountryCode } = useBnCountry();
  const { data: refs = [], isLoading } = useLegalReferences(activeCountryCode, { includeInactive: true });
  const upsert = useUpsertLegalReference();
  const remove = useDeleteLegalReference();
  const setStatus = useSetLegalReferenceStatus();
  const { options: statusOptions } = useReferenceValues(BN_REF_GROUPS.LEGAL_REF_STATUS ?? 'BN_LEGAL_REF_STATUS', STATUS_FALLBACK);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<BnLegalReference>>(empty());
  const [tagInput, setTagInput] = useState('');

  const supersedeOptions = useMemo(
    () => refs.filter((r) => r.id !== form.id).map((r) => ({ value: r.id, label: `${r.ref_code} v${r.version_number} · ${r.short_title}` })),
    [refs, form.id],
  );

  const handleSave = async () => {
    if (!form.ref_code || !form.short_title || !form.effective_from) {
      toast.error('Reference code, short title and effective-from are required');
      return;
    }
    try {
      await upsert.mutateAsync({
        ref: {
          ...form,
          country_code: activeCountryCode,
          ref_code: form.ref_code!,
          short_title: form.short_title!,
          effective_from: form.effective_from!,
          tags: tagInput ? tagInput.split(',').map((t) => t.trim()).filter(Boolean) : form.tags ?? null,
        },
      });
      toast.success('Legal reference saved');
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const openEdit = (r: BnLegalReference) => {
    setForm(r);
    setTagInput((r.tags ?? []).join(', '));
    setOpen(true);
  };

  const openNew = () => {
    setForm(empty());
    setTagInput('');
    setOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Legal References"
        subtitle="Structured master of acts, chapters, sections and regulations used by products, rules, letters and decisions"
        breadcrumbs={[{ label: 'Benefit Management' }, { label: 'Country Pack' }, { label: 'Legal References' }]}
      />
      <div className="flex items-center justify-between">
        <CountrySelector />
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" />Add Reference
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Short Title</TableHead>
                <TableHead>Act / Regulation</TableHead>
                <TableHead>Chapter / Section</TableHead>
                <TableHead>Effective</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {refs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.ref_code}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {r.short_title}
                      {r.ref_url && (
                        <a href={r.ref_url} target="_blank" rel="noopener noreferrer" aria-label="Open reference URL">
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                    {r.tags?.length ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.tags.map((t) => (
                          <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                        ))}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.act_name ?? '—'}
                    {r.regulation && <div className="text-xs text-muted-foreground">Reg: {r.regulation}</div>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[r.chapter && `Ch. ${r.chapter}`, r.section && `§ ${r.section}`, r.subsection && `(${r.subsection})`]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.effective_from}
                    {r.effective_to ? ` → ${r.effective_to}` : ''}
                  </TableCell>
                  <TableCell><Badge variant="outline">v{r.version_number}</Badge></TableCell>
                  <TableCell>
                    <Select
                      value={r.status}
                      onValueChange={(v) => setStatus.mutate({ id: r.id, status: v as LegalRefStatus })}
                    >
                      <SelectTrigger className="h-7 text-xs px-2 w-32">
                        <SelectValue>
                          <Badge variant={statusVariant(r.status)} className="text-[10px]">{r.status}</Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          if (!confirm('Delete this reference? It cannot be deleted if it is in use.')) return;
                          try {
                            await remove.mutateAsync(r.id);
                            toast.success('Deleted');
                          } catch (e: any) {
                            toast.error(e.message);
                          }
                        }}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!refs.length && !isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No legal references configured
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit' : 'Add'} Legal Reference</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Reference Code *</Label>
              <Input value={form.ref_code || ''} onChange={(e) => setForm((f) => ({ ...f, ref_code: e.target.value.toUpperCase() }))} placeholder="SSA_CAP329_S12" />
            </div>
            <div>
              <Label>Version *</Label>
              <Input type="number" value={form.version_number ?? 1} onChange={(e) => setForm((f) => ({ ...f, version_number: parseInt(e.target.value) || 1 }))} />
            </div>
            <div className="col-span-2">
              <Label>Short Title *</Label>
              <Input value={form.short_title || ''} onChange={(e) => setForm((f) => ({ ...f, short_title: e.target.value }))} placeholder="Social Security Act §12 — Sickness Benefit" />
            </div>
            <div>
              <Label>Act Name</Label>
              <Input value={form.act_name || ''} onChange={(e) => setForm((f) => ({ ...f, act_name: e.target.value }))} placeholder="Social Security Act" />
            </div>
            <div>
              <Label>Chapter</Label>
              <Input value={form.chapter || ''} onChange={(e) => setForm((f) => ({ ...f, chapter: e.target.value || null }))} placeholder="329" />
            </div>
            <div>
              <Label>Section</Label>
              <Input value={form.section || ''} onChange={(e) => setForm((f) => ({ ...f, section: e.target.value || null }))} placeholder="12" />
            </div>
            <div>
              <Label>Subsection</Label>
              <Input value={form.subsection || ''} onChange={(e) => setForm((f) => ({ ...f, subsection: e.target.value || null }))} placeholder="(a)(ii)" />
            </div>
            <div className="col-span-2">
              <Label>Regulation</Label>
              <Input value={form.regulation || ''} onChange={(e) => setForm((f) => ({ ...f, regulation: e.target.value || null }))} placeholder="Social Security (Benefits) Regulations 1978" />
            </div>
            <div className="col-span-2">
              <Label>Full Reference Text</Label>
              <Textarea
                value={form.full_reference_text || ''}
                onChange={(e) => setForm((f) => ({ ...f, full_reference_text: e.target.value || null }))}
                rows={2}
                placeholder="Social Security Act, Cap. 329, §12(a)(ii), as amended"
              />
            </div>
            <div className="col-span-2">
              <Label>URL</Label>
              <Input value={form.ref_url || ''} onChange={(e) => setForm((f) => ({ ...f, ref_url: e.target.value || null }))} placeholder="https://…" />
            </div>
            <div>
              <Label>Effective From *</Label>
              <Input type="date" value={form.effective_from || ''} onChange={(e) => setForm((f) => ({ ...f, effective_from: e.target.value }))} />
            </div>
            <div>
              <Label>Effective To</Label>
              <Input type="date" value={form.effective_to || ''} onChange={(e) => setForm((f) => ({ ...f, effective_to: e.target.value || null }))} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status || 'DRAFT'} onValueChange={(v) => setForm((f) => ({ ...f, status: v as LegalRefStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Supersedes</Label>
              <Select
                value={form.supersedes_id ?? '__none__'}
                onValueChange={(v) => setForm((f) => ({ ...f, supersedes_id: v === '__none__' ? null : v }))}
              >
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {supersedeOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Tags (comma-separated)</Label>
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="sickness, eligibility, contribution" />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes || ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))} rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active ?? true} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CountryLegalRefs: React.FC = () => (
  <BnCountryProvider>
    <Content />
  </BnCountryProvider>
);
export default CountryLegalRefs;
