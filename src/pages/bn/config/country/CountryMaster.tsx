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
  useToggleCountryActive, useSeedCountryPack, useOrphanCountryRefs, useDeleteCountry,
} from '@/hooks/bn/useBnCountryMaster';
import type { BnCountryInput, BnCountryRow } from '@/services/bn/countryMasterService';
import { countActiveProductsForCountry, getCountryUsage } from '@/services/bn/countryMasterService';
import { Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBnCountry } from '@/contexts/BnCountryContext';
import { BnCountryProvider } from '@/contexts/BnCountryContext';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  COUNTRY_MASTER, CURRENCY_MASTER, LANGUAGE_MASTER, LOCALE_MASTER, FISCAL_MONTHS,
  timezonesForCountry, findCountry, findCurrency, isValidIanaTimezone, isValidLocale,
} from '@/data/masters/commonMasters';

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
  const deleteMut = useDeleteCountry();

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
    // 1) Identity
    if (!form.country_code.trim() || !form.country_name.trim()) {
      toast.error('Country must be selected'); return;
    }
    if (isNew) {
      if (!findCountry(form.country_code)) {
        toast.error('Selected country must exist in Country Master'); return;
      }
      if (countries.some(c => c.country_code === form.country_code)) {
        toast.error(`Country ${form.country_code} already exists`); return;
      }
    }
    // 2) Currency
    if (!form.currency_code || !findCurrency(form.currency_code)) {
      toast.error('Valid currency must be selected'); return;
    }
    // 3) Timezone
    if (!form.timezone || !isValidIanaTimezone(form.timezone)) {
      toast.error('A valid IANA timezone must be selected'); return;
    }
    // 4) Locale & language
    if (!form.locale || !isValidLocale(form.locale)) {
      toast.error('A valid locale must be selected'); return;
    }
    const lang = LANGUAGE_MASTER.find(l => l.code === form.default_language);
    if (!lang || !lang.is_active) {
      toast.error('Default language must be an active language'); return;
    }
    // 5) Fiscal month
    const fm = form.fiscal_year_start_month ?? 0;
    if (fm < 1 || fm > 12) { toast.error('Fiscal year start month must be 1–12'); return; }
    // 6) Retirement age
    const age = form.default_retirement_age ?? 0;
    if (age < 0 || age > 120) { toast.error('Retirement age must be between 0 and 120'); return; }

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
      if (c.is_active) {
        const used = await countActiveProductsForCountry(c.country_code);
        if (used > 0) {
          const confirmed = window.confirm(
            `${c.country_code} is used by ${used} active product${used > 1 ? 's' : ''}.\n\nDeactivating it may break dependent configurations. Continue?`,
          );
          if (!confirmed) return;
        }
      }
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

  const handleDelete = async (c: BnCountryRow) => {
    try {
      const usage = await getCountryUsage(c.country_code);
      if (usage.total > 0) {
        const detail = usage.byTable.map(r => `• ${r.table}: ${r.count}`).join('\n');
        window.alert(
          `Cannot delete ${c.country_code}.\n\nIt is still referenced by:\n${detail}\n\nPlease remove all dependent records first, then try again.`
        );
        return;
      }
      const confirmed = window.confirm(`Delete country ${c.country_code} (${c.country_name})? This cannot be undone.`);
      if (!confirmed) return;
      await deleteMut.mutateAsync({ code: c.country_code });
      toast.success(`Country ${c.country_code} deleted`);
    } catch (e: any) { toast.error(e.message ?? 'Delete failed'); }
  };

  // Pick a country from ISO master → auto-fill identity + suggested defaults.
  const onSelectIsoCountry = (iso2: string) => {
    const iso = findCountry(iso2);
    if (!iso) return;
    const cur = findCurrency(iso.default_currency);
    setForm(f => ({
      ...f,
      country_code: iso.iso2,
      country_name: iso.name,
      currency_code: iso.default_currency,
      currency_symbol: cur?.symbol ?? f.currency_symbol ?? '',
      timezone: iso.default_timezone,
      locale: iso.default_locale,
      default_language: iso.default_language,
    }));
  };

  const onSelectCurrency = (code: string) => {
    const cur = findCurrency(code);
    setForm(f => ({ ...f, currency_code: code, currency_symbol: cur?.symbol ?? f.currency_symbol ?? '' }));
  };

  const tzOptions = useMemo(() => {
    const list = form.country_code ? timezonesForCountry(form.country_code) : [];
    return list.map(tz => ({ value: tz, label: tz }));
  }, [form.country_code]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Country Master"
        subtitle="Source of truth for every country used across Benefits — products, formulas, rate tables, legal references and payment config all read from here."
        breadcrumbs={[{ label: 'Benefit Management' }, { label: 'Configuration' }, { label: 'Country Master' }]}
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Country</Button>}
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
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(c)} title="Delete country" disabled={deleteMut.isPending} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isNew ? 'New Country' : `Edit ${editing?.country_code}`}</DialogTitle></DialogHeader>

          <div className="space-y-5 py-2">
            {/* ---------------- Country identity ---------------- */}
            <section className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Country identity</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Country (ISO master) *</Label>
                  <SearchableSelect
                    options={COUNTRY_MASTER.map(c => ({
                      value: c.iso2,
                      label: `${c.name} (${c.iso2} · ${c.iso3})`,
                      searchText: `${c.iso3} ${c.numeric_code} ${c.phone_code}`,
                    }))}
                    value={form.country_code}
                    onValueChange={onSelectIsoCountry}
                    placeholder="Select country from ISO master…"
                    searchPlaceholder="Search by name, ISO2, ISO3…"
                    disabled={!isNew}
                  />
                </div>
                <div>
                  <Label>Country Code (ISO-2)</Label>
                  <Input value={form.country_code} disabled />
                </div>
                <div>
                  <Label>Country Name</Label>
                  <Input value={form.country_name} disabled />
                </div>
                {form.country_code && (() => {
                  const iso = findCountry(form.country_code);
                  if (!iso) return null;
                  return (
                    <div className="col-span-2 text-xs text-muted-foreground grid grid-cols-3 gap-2 bg-muted/40 rounded px-3 py-2">
                      <div>ISO-3: <span className="font-mono">{iso.iso3}</span></div>
                      <div>Numeric: <span className="font-mono">{iso.numeric_code}</span></div>
                      <div>Phone: <span className="font-mono">{iso.phone_code}</span></div>
                    </div>
                  );
                })()}
              </div>
            </section>

            {/* ---------------- Regional settings ---------------- */}
            <section className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Regional settings</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Currency *</Label>
                  <SearchableSelect
                    options={CURRENCY_MASTER.map(c => ({
                      value: c.code,
                      label: `${c.code} — ${c.name} (${c.symbol})`,
                      searchText: c.name,
                    }))}
                    value={form.currency_code}
                    onValueChange={onSelectCurrency}
                    placeholder="Select currency…"
                    searchPlaceholder="Search currency…"
                  />
                </div>
                <div>
                  <Label>Currency Symbol</Label>
                  <Input value={form.currency_symbol ?? ''} disabled placeholder="Auto" />
                </div>
                <div className="col-span-2">
                  <Label>Timezone (IANA) *</Label>
                  <SearchableSelect
                    options={tzOptions}
                    value={form.timezone ?? ''}
                    onValueChange={v => setForm(f => ({ ...f, timezone: v }))}
                    placeholder={form.country_code ? 'Select timezone…' : 'Select country first'}
                    searchPlaceholder="Search timezone…"
                    disabled={!form.country_code}
                  />
                </div>
                <div>
                  <Label>Default Language *</Label>
                  <SearchableSelect
                    options={LANGUAGE_MASTER.filter(l => l.is_active).map(l => ({
                      value: l.code, label: `${l.code} — ${l.name}`,
                    }))}
                    value={form.default_language ?? ''}
                    onValueChange={v => setForm(f => ({ ...f, default_language: v }))}
                    placeholder="Select language…"
                  />
                </div>
                <div>
                  <Label>Locale *</Label>
                  <SearchableSelect
                    options={LOCALE_MASTER.map(l => ({ value: l.code, label: `${l.code} — ${l.name}` }))}
                    value={form.locale ?? ''}
                    onValueChange={v => setForm(f => ({ ...f, locale: v }))}
                    placeholder="Select locale…"
                    searchPlaceholder="Search locale…"
                  />
                </div>
              </div>
            </section>

            {/* ---------------- Benefit defaults ---------------- */}
            <section className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Benefit defaults</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Default Retirement Age</Label>
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    value={form.default_retirement_age ?? 62}
                    onChange={e => setForm(f => ({ ...f, default_retirement_age: parseInt(e.target.value) || 0 }))}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">0–120. Overridable per product parameter.</p>
                </div>
                <div>
                  <Label>Fiscal Year Start Month</Label>
                  <SearchableSelect
                    options={FISCAL_MONTHS.map(m => ({ value: String(m.value), label: `${m.value} — ${m.label}` }))}
                    value={String(form.fiscal_year_start_month ?? 1)}
                    onValueChange={v => setForm(f => ({ ...f, fiscal_year_start_month: parseInt(v) || 1 }))}
                    placeholder="Select month…"
                  />
                </div>
              </div>
            </section>

            {/* ---------------- Status ---------------- */}
            <section className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Status</h4>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active ?? true} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                <Label>Active</Label>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Deactivating a country used by active products will require admin confirmation.
              </p>
            </section>
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
