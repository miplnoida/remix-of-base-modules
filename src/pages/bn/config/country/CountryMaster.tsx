/**
 * Country Master — source-of-truth CRUD for bn_country.
 * Lists every country, shows Country Pack completeness, lets the user
 * create / edit / activate-deactivate countries and seed a default pack.
 */
import React, { useMemo, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Plus, Pencil, Power, Sparkles, CheckCircle2, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import {
  useCountryMasterList, useCountryPackStatuses, useCreateCountry, useUpdateCountry,
  useToggleCountryActive, useSeedCountryPack, useOrphanCountryRefs,
} from '@/hooks/bn/useBnCountryMaster';
import type { BnCountryInput, BnCountryRow } from '@/services/bn/countryMasterService';
import { Link } from 'react-router-dom';
import { useBnCountry } from '@/contexts/BnCountryContext';
import { BnCountryProvider } from '@/contexts/BnCountryContext';

const emptyForm: BnCountryInput = {
  country_code: '', country_name: '', currency_code: '', currency_symbol: '',
  locale: 'en', timezone: '', default_language: 'en', is_active: true,
  default_retirement_age: 62, fiscal_year_start_month: 1,
};

const CountryMasterInner: React.FC = () => {
  const { data: countries = [], isLoading } = useCountryMasterList();
  const codes = useMemo(() => countries.map(c => c.country_code), [countries]);
  const { data: statuses = {} } = useCountryPackStatuses(codes);
  const { data: orphans = [] } = useOrphanCountryRefs();
  const { setActiveCountryCode } = useBnCountry();

  const createMut = useCreateCountry();
  const updateMut = useUpdateCountry();
  const toggleMut = useToggleCountryActive();
  const seedMut = useSeedCountryPack();

  const [editing, setEditing] = useState<BnCountryRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<BnCountryInput>(emptyForm);

  const openCreate = () => { setIsNew(true); setEditing(null); setForm(emptyForm); };
  const openEdit = (c: BnCountryRow) => {
    setIsNew(false); setEditing(c);
    setForm({
      country_code: c.country_code, country_name: c.country_name, currency_code: c.currency_code,
      currency_symbol: c.currency_symbol ?? '', locale: c.locale ?? 'en', timezone: c.timezone ?? '',
      default_language: c.default_language ?? 'en', is_active: c.is_active,
      default_retirement_age: c.default_retirement_age ?? 62,
      fiscal_year_start_month: c.fiscal_year_start_month ?? 1,
    });
  };
  const closeDialog = () => { setEditing(null); setIsNew(false); };

  const handleSave = async () => {
    if (!form.country_code.trim() || !form.country_name.trim() || !form.currency_code.trim()) {
      toast.error('Country code, name and currency are required'); return;
    }
    try {
      if (isNew) {
        await createMut.mutateAsync({ input: form });
        toast.success(`Country ${form.country_code.toUpperCase()} created`);
      } else if (editing) {
        const { country_code, ...patch } = form;
        await updateMut.mutateAsync({ code: editing.country_code, patch });
        toast.success(`Country ${editing.country_code} updated`);
      }
      closeDialog();
    } catch (e: any) {
      toast.error(e.message ?? 'Save failed');
    }
  };

  const handleToggle = async (c: BnCountryRow) => {
    try {
      await toggleMut.mutateAsync({ code: c.country_code, isActive: !c.is_active });
      toast.success(`${c.country_code} ${!c.is_active ? 'activated' : 'deactivated'}`);
    } catch (e: any) { toast.error(e.message ?? 'Failed'); }
  };

  const handleSeed = async (c: BnCountryRow) => {
    try {
      const res = await seedMut.mutateAsync({ code: c.country_code });
      if (res.seeded.length === 0) toast.info('Country Pack already configured — nothing to seed');
      else toast.success(`Seeded: ${res.seeded.join(', ')}`);
    } catch (e: any) { toast.error(e.message ?? 'Seed failed'); }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Country Master"
        subtitle="Source of truth for every country used across Benefits — products, formulas, rate tables, legal references and payment config all read from here."
        breadcrumbs={[{ label: 'Benefit Management' }, { label: 'Configuration' }, { label: 'Country Master' }]}
        action={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Country</Button>}
      />

      {orphans.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Orphan country references detected</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 text-xs mt-1">
              {orphans.map((o, i) => (
                <li key={i}><code>{o.country_code}</code> referenced in <code>{o.table}</code> ({o.count} row{o.count > 1 ? 's' : ''}) but missing from Country Master.</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Countries ({countries.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading countries…</div>
          ) : countries.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No countries configured yet. Click <b>New Country</b> to add the first one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Timezone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Country Pack</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {countries.map((c) => {
                  const s = statuses[c.country_code];
                  const complete = s?.isComplete;
                  return (
                    <TableRow key={c.country_code}>
                      <TableCell className="font-mono font-semibold">{c.country_code}</TableCell>
                      <TableCell>{c.country_name}</TableCell>
                      <TableCell>{c.currency_symbol ? `${c.currency_symbol} ` : ''}{c.currency_code}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.timezone || '—'}</TableCell>
                      <TableCell>
                        {c.is_active
                          ? <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Active</Badge>
                          : <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> Inactive</Badge>}
                      </TableCell>
                      <TableCell>
                        {!s ? <span className="text-xs text-muted-foreground">…</span> : (
                          <div className="flex flex-wrap gap-1 text-[10px]">
                            <PackChip label="ID" n={s.idRules} />
                            <PackChip label="Addr" n={s.addressModel} />
                            <PackChip label="Part" n={s.participantTypes} />
                            <PackChip label="Pay" n={s.paymentConfig} />
                            <PackChip label="Legal" n={s.legalRefs} />
                            <PackChip label="Prod" n={s.products} />
                            {complete && <Badge variant="default" className="h-5 text-[10px]">Complete</Badge>}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(c)} title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleSeed(c)} title="Seed default Country Pack" disabled={seedMut.isPending}>
                            <Sparkles className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleToggle(c)} title={c.is_active ? 'Deactivate' : 'Activate'} disabled={toggleMut.isPending}>
                            <Power className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" asChild title="Open Country Pack">
                            <Link to="/bn/config/country" onClick={() => setActiveCountryCode(c.country_code)}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isNew || !!editing} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{isNew ? 'New Country' : `Edit ${editing?.country_code}`}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <Label>Country Code *</Label>
              <Input maxLength={3} value={form.country_code} disabled={!isNew}
                onChange={e => setForm(f => ({ ...f, country_code: e.target.value.toUpperCase() }))} placeholder="e.g. KN" />
            </div>
            <div>
              <Label>Country Name *</Label>
              <Input value={form.country_name} onChange={e => setForm(f => ({ ...f, country_name: e.target.value }))} placeholder="St. Kitts and Nevis" />
            </div>
            <div>
              <Label>Currency Code *</Label>
              <Input maxLength={3} value={form.currency_code} onChange={e => setForm(f => ({ ...f, currency_code: e.target.value.toUpperCase() }))} placeholder="XCD" />
            </div>
            <div>
              <Label>Currency Symbol</Label>
              <Input value={form.currency_symbol ?? ''} onChange={e => setForm(f => ({ ...f, currency_symbol: e.target.value }))} placeholder="$" />
            </div>
            <div>
              <Label>Locale</Label>
              <Input value={form.locale ?? ''} onChange={e => setForm(f => ({ ...f, locale: e.target.value }))} placeholder="en" />
            </div>
            <div>
              <Label>Default Language</Label>
              <Input value={form.default_language ?? ''} onChange={e => setForm(f => ({ ...f, default_language: e.target.value }))} placeholder="en" />
            </div>
            <div className="col-span-2">
              <Label>Timezone</Label>
              <Input value={form.timezone ?? ''} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))} placeholder="America/St_Kitts" />
            </div>
            <div>
              <Label>Default Retirement Age</Label>
              <Input type="number" value={form.default_retirement_age ?? 62} onChange={e => setForm(f => ({ ...f, default_retirement_age: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Fiscal Year Start Month</Label>
              <Input type="number" min={1} max={12} value={form.fiscal_year_start_month ?? 1} onChange={e => setForm(f => ({ ...f, fiscal_year_start_month: parseInt(e.target.value) || 1 }))} />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Switch checked={form.is_active ?? true} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const PackChip: React.FC<{ label: string; n: number }> = ({ label, n }) => (
  <Badge variant={n > 0 ? 'outline' : 'secondary'} className="h-5 text-[10px] font-normal">
    {label}: {n}
  </Badge>
);

const CountryMaster: React.FC = () => (
  <BnCountryProvider>
    <CountryMasterInner />
  </BnCountryProvider>
);

export default CountryMaster;
