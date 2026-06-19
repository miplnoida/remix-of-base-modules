import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, Pencil, Trash2, FileCode, Info, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
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
import PaymentCycleMethodMatrix from '@/components/bn/country/PaymentCycleMethodMatrix';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getEftFormatReadiness, type SourceFormatStatus } from '@/services/bn/payment/paymentSourceAccountService';

type MethodCategory = 'EFT' | 'CHEQUE' | 'CASH' | 'MOBILE' | 'CARD' | 'MONEY_ORDER' | 'WIRE' | 'OTHER';

interface MethodMeta {
  category: MethodCategory;
  requires_bank_account_default: boolean;
  requires_mobile_number_default: boolean;
  supports_provider_direct_pay: boolean;
  supports_third_party_payee: boolean;
}

const DEFAULT_META: MethodMeta = {
  category: 'OTHER',
  requires_bank_account_default: false,
  requires_mobile_number_default: false,
  supports_provider_direct_pay: false,
  supports_third_party_payee: true,
};

const PAYMENT_METHOD_FALLBACK = BN_PAYMENT_METHODS.map((m) => ({ value: m, label: m }));

const empty = (): Partial<BnCountryPaymentConfig> => ({
  payment_method: '', method_label: '',
  is_default: false, is_method_enabled: true, is_active: true,
  requires_bank_account: false, requires_mobile_number: false,
  allow_third_party_payee: true, allow_provider_direct_pay: false,
  processing_days: 3, cut_off_day: null, payment_cycle: 'WEEKLY', calendar_config: {},
  default_priority: 100,
  bank_file_format: '', file_naming_convention: '', file_date_format: '',
  header_record_format: '', detail_record_format: '', trailer_record_format: '',
  account_number_rule: '', routing_number_rule: '', bank_code: '',
  cheque_stock_required: false, cheque_format_template_id: null,
  method_config: {},
});

function readMeta(opt: { metadata?: any } | undefined): MethodMeta {
  const m = (opt?.metadata ?? {}) as Record<string, any>;
  return {
    category: (m.method_category as MethodCategory) || DEFAULT_META.category,
    requires_bank_account_default: !!m.requires_bank_account_default,
    requires_mobile_number_default: !!m.requires_mobile_number_default,
    supports_provider_direct_pay: !!m.supports_provider_direct_pay,
    supports_third_party_payee: m.supports_third_party_payee !== false,
  };
}

/** Per-method validation. Returns [] if valid. */
function validateConfig(form: Partial<BnCountryPaymentConfig>, meta: MethodMeta): string[] {
  const errs: string[] = [];
  if (!form.payment_method) errs.push('Payment method is required.');
  if (!form.is_method_enabled) return errs; // disabled rows don't need full config
  const mc = (form.method_config ?? {}) as Record<string, any>;
  switch (meta.category) {
    case 'EFT':
      if (!form.requires_bank_account) errs.push('EFT requires "Requires Bank Account" to be true.');
      // Bank file format now belongs to Funding Source Account, not country row. No country-level requirement.
      break;
    case 'CHEQUE':
      if (!form.cheque_stock_required && !form.cheque_format_template_id && !mc.cheque_print_layout) {
        errs.push('Cheque: cheque stock OR template OR print layout must be configured.');
      }
      break;
    case 'CASH':
      if (!mc.cash_office && !mc.cash_counter) errs.push('Cash: cash office / counter is required.');
      if (mc.collection_authorization_required === undefined) errs.push('Cash: collection authorization flag is required.');
      break;
    case 'MOBILE':
      if (!form.requires_mobile_number) errs.push('Mobile Money: "Requires Mobile Number" must be true.');
      if (!mc.mobile_provider) errs.push('Mobile Money: provider is required.');
      break;
    case 'CARD':
      if (!mc.payment_gateway) errs.push('Card: payment gateway is required.');
      if (!mc.merchant_account) errs.push('Card: merchant account is required.');
      break;
    case 'MONEY_ORDER':
      if (!mc.issuer) errs.push('Money Order: issuer is required.');
      break;
    case 'WIRE':
      if (!mc.swift_bic) errs.push('Wire Transfer: SWIFT/BIC is required.');
      if (!mc.iban && !mc.account_number) errs.push('Wire Transfer: IBAN or account number is required.');
      break;
  }
  return errs;
}

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h4 className="text-sm font-semibold text-foreground mt-4 mb-2 border-b pb-1">{children}</h4>
);

const Content: React.FC = () => {
  const { activeCountryCode } = useBnCountry();
  const { data: configs = [] } = useBnCountryPaymentConfig(activeCountryCode);
  const upsert = useUpsertCountryPaymentConfig();
  const remove = useDeleteCountryPaymentConfig();
  const { options: methodOptions } = useReferenceValues(BN_REF_GROUPS.PAYMENT_METHOD_TYPE, PAYMENT_METHOD_FALLBACK);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<BnCountryPaymentConfig>>(empty());

  const selectedOpt = useMemo(
    () => methodOptions.find((o) => o.value === form.payment_method),
    [methodOptions, form.payment_method],
  );
  const meta = useMemo(() => readMeta(selectedOpt as any), [selectedOpt]);
  const cat = meta.category;
  const mc = (form.method_config ?? {}) as Record<string, any>;
  const setMc = (patch: Record<string, any>) =>
    setForm((f) => ({ ...f, method_config: { ...(f.method_config ?? {}), ...patch } }));

  const onPickMethod = (v: string) => {
    const opt = methodOptions.find((o) => o.value === v);
    const m = readMeta(opt as any);
    setForm((f) => ({
      ...f,
      payment_method: v,
      method_label: f.method_label || opt?.label || v,
      requires_bank_account: f.requires_bank_account ?? m.requires_bank_account_default,
      requires_mobile_number: f.requires_mobile_number ?? m.requires_mobile_number_default,
      allow_provider_direct_pay: f.allow_provider_direct_pay ?? m.supports_provider_direct_pay,
      allow_third_party_payee: f.allow_third_party_payee ?? m.supports_third_party_payee,
    }));
  };

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
    const errs = validateConfig(form, meta);
    if (errs.length) { toast.error(errs[0]); return; }
    try {
      await upsert.mutateAsync({ ...form, country_code: activeCountryCode });
      toast.success('Payment config saved');
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const categoryBadge = (method: string) => {
    const m = readMeta(methodOptions.find((o) => o.value === method) as any);
    return <Badge variant="outline" className="text-[10px]">{m.category}</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Country Payment Config"
        subtitle="Configure country-level payment methods, validation rules, processing calendars, and method-specific formats."
        breadcrumbs={[{ label: 'Benefit Management' }, { label: 'Country Config' }, { label: 'Payment Config' }]}
      />
      <div className="flex items-center justify-between">
        <CountrySelector />
        <Button size="sm" onClick={() => { setForm(empty()); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Method</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Method</TableHead><TableHead>Category</TableHead><TableHead>Label</TableHead>
            <TableHead title="Default processing cycle — actual cycle availability is controlled by the matrix below">Default Cycle</TableHead><TableHead>Default</TableHead>
            <TableHead>Enabled</TableHead><TableHead className="w-20">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {configs.map((c: BnCountryPaymentConfig) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-sm">{c.payment_method}</TableCell>
                <TableCell>{categoryBadge(c.payment_method)}</TableCell>
                <TableCell>{c.method_label}</TableCell>
                <TableCell><Badge variant="outline">{c.payment_cycle}</Badge></TableCell>
                <TableCell>{c.is_default && <Badge>Default</Badge>}</TableCell>
                <TableCell>
                  <Badge variant={c.is_method_enabled ? 'default' : 'secondary'}>
                    {c.is_method_enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </TableCell>
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

      {activeCountryCode && <PaymentCycleMethodMatrix countryCode={activeCountryCode} />}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {form.id ? 'Edit' : 'Add'} Payment Method
              {form.payment_method && <Badge variant="outline">{cat}</Badge>}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basics">
            <TabsList>
              <TabsTrigger value="basics">Basics</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="requirements">Requirements</TabsTrigger>
              <TabsTrigger value="method">Method-Specific</TabsTrigger>
            </TabsList>

            {/* ── Basics ─────────────────────────────────────────── */}
            <TabsContent value="basics">
              <SectionTitle>Basic Method</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Payment Method *</Label>
                  <Select value={form.payment_method || ''} onValueChange={onPickMethod}>
                    <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                    <SelectContent>
                      {methodOptions.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label} <span className="text-[10px] text-muted-foreground ml-1">({readMeta(m as any).category})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Display Label</Label>
                  <Input value={form.method_label || ''} onChange={(e) => setForm((f) => ({ ...f, method_label: e.target.value }))} />
                </div>
              </div>

              <SectionTitle>Availability</SectionTitle>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2"><Switch checked={form.is_method_enabled ?? true} onCheckedChange={(v) => setForm((f) => ({ ...f, is_method_enabled: v }))} /><Label>Enabled (national capability)</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.is_active ?? true} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} /><Label>Active</Label></div>
              </div>

              <SectionTitle>Default / Priority</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2"><Switch checked={form.is_default ?? false} onCheckedChange={(v) => setForm((f) => ({ ...f, is_default: v }))} /><Label>Default method for country</Label></div>
                <div>
                  <Label>Default Priority</Label>
                  <Input type="number" value={form.default_priority ?? 100}
                    onChange={(e) => setForm((f) => ({ ...f, default_priority: parseInt(e.target.value) || 100 }))} />
                </div>
              </div>
            </TabsContent>

            {/* ── Calendar ───────────────────────────────────────── */}
            <TabsContent value="calendar">
              <SectionTitle>Processing Calendar</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Default Processing Cycle</Label>
                  <Select value={form.payment_cycle || 'WEEKLY'} onValueChange={(v) => setForm((f) => ({ ...f, payment_cycle: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{BN_PAYMENT_CYCLES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">Hint only. Actual cycle × method availability is controlled by the Cycle Availability matrix.</p>
                </div>
                <div>
                  <Label>Processing Days</Label>
                  <Input type="number" value={form.processing_days ?? 3}
                    onChange={(e) => setForm((f) => ({ ...f, processing_days: parseInt(e.target.value) || 3 }))} />
                </div>
                <div>
                  <Label>Cut-off Day</Label>
                  <Input type="number" value={form.cut_off_day ?? ''} placeholder="e.g. 25"
                    onChange={(e) => setForm((f) => ({ ...f, cut_off_day: e.target.value ? parseInt(e.target.value) : null }))} />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3 flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 mt-0.5" />
                Cycle-level method availability (which methods run weekly vs monthly) is managed in the
                "Cycle × Method Availability" matrix below this dialog — not duplicated per row here.
              </p>
            </TabsContent>

            {/* ── Requirements ───────────────────────────────────── */}
            <TabsContent value="requirements">
              <SectionTitle>Requirements</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2"><Switch checked={form.requires_bank_account ?? false} onCheckedChange={(v) => setForm((f) => ({ ...f, requires_bank_account: v }))} /><Label>Requires Bank Account</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.requires_mobile_number ?? false} onCheckedChange={(v) => setForm((f) => ({ ...f, requires_mobile_number: v }))} /><Label>Requires Mobile Number</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.allow_third_party_payee ?? true} onCheckedChange={(v) => setForm((f) => ({ ...f, allow_third_party_payee: v }))} /><Label>Allow Third-Party Payee</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.allow_provider_direct_pay ?? false} onCheckedChange={(v) => setForm((f) => ({ ...f, allow_provider_direct_pay: v }))} /><Label>Allow Provider Direct Pay</Label></div>
              </div>
            </TabsContent>

            {/* ── Method-Specific ────────────────────────────────── */}
            <TabsContent value="method">
              {!form.payment_method && (
                <p className="text-sm text-muted-foreground py-6 text-center">Pick a payment method first to see its specific configuration.</p>
              )}

              {cat === 'EFT' && (
                <>
                  <SectionTitle>EFT / Bank Transfer Configuration</SectionTitle>
                  <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 mb-3 text-xs flex gap-2">
                    <Info className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
                    <div>
                      <strong>Bank file format now lives on the Funding Source Account.</strong> Configure EFT
                      file layout per funding bank/account under Country Pack → Funding Source Accounts. The fields
                      below are kept as a legacy country-wide fallback and are <em>only</em> used when no active
                      source account exists.
                    </div>
                  </div>
                  <div className="flex items-end gap-2 p-3 bg-muted/40 rounded-md mb-3">
                    <div className="flex-1">
                      <Label className="text-xs flex items-center gap-1.5"><FileCode className="h-3.5 w-3.5" /> Load Preset</Label>
                      <Select onValueChange={applyPreset}>
                        <SelectTrigger><SelectValue placeholder="Choose a bank-format preset…" /></SelectTrigger>
                        <SelectContent>
                          {EFT_FORMAT_PRESETS.map((p) => (
                            <SelectItem key={p.key} value={p.key}>
                              <div><div className="font-medium">{p.label}</div><div className="text-[10px] text-muted-foreground">{p.description}</div></div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Bank File Format *</Label><Input value={form.bank_file_format || ''} onChange={(e) => setForm((f) => ({ ...f, bank_file_format: e.target.value }))} placeholder="CSV / NACHA / SWIFT" /></div>
                    <div><Label className="text-xs">Bank Code</Label><Input value={form.bank_code || ''} onChange={(e) => setForm((f) => ({ ...f, bank_code: e.target.value }))} /></div>
                    <div><Label className="text-xs">File Naming Convention</Label><Input value={form.file_naming_convention || ''} onChange={(e) => setForm((f) => ({ ...f, file_naming_convention: e.target.value }))} placeholder="BN_EFT_{batch_number}_{yyyymmdd}.csv" /></div>
                    <div><Label className="text-xs">File Date Format</Label><Input value={form.file_date_format || ''} onChange={(e) => setForm((f) => ({ ...f, file_date_format: e.target.value }))} placeholder="YYYYMMDD" /></div>
                    <div><Label className="text-xs">Account Number Rule</Label><Input value={form.account_number_rule || ''} onChange={(e) => setForm((f) => ({ ...f, account_number_rule: e.target.value }))} /></div>
                    <div><Label className="text-xs">Routing Number Rule</Label><Input value={form.routing_number_rule || ''} onChange={(e) => setForm((f) => ({ ...f, routing_number_rule: e.target.value }))} /></div>
                    <div className="col-span-2"><Label className="text-xs">Bank Validation Rule Set (JSON)</Label>
                      <Textarea rows={2} className="font-mono text-xs"
                        value={JSON.stringify(form.bank_validation_rule_set ?? {}, null, 0)}
                        onChange={(e) => { try { setForm((f) => ({ ...f, bank_validation_rule_set: JSON.parse(e.target.value || '{}') })); } catch { /* ignore */ } }} />
                    </div>
                  </div>
                  <div className="mt-3"><Label className="text-xs">Header Record Format</Label>
                    <Textarea rows={2} value={form.header_record_format || ''} onChange={(e) => setForm((f) => ({ ...f, header_record_format: e.target.value }))} className="font-mono text-xs" /></div>
                  <div><Label className="text-xs">Detail Record Format *</Label>
                    <Textarea rows={3} value={form.detail_record_format || ''} onChange={(e) => setForm((f) => ({ ...f, detail_record_format: e.target.value }))} className="font-mono text-xs" /></div>
                  <div><Label className="text-xs">Trailer Record Format</Label>
                    <Textarea rows={2} value={form.trailer_record_format || ''} onChange={(e) => setForm((f) => ({ ...f, trailer_record_format: e.target.value }))} className="font-mono text-xs" /></div>
                </>
              )}

              {cat === 'CHEQUE' && (
                <>
                  <SectionTitle>Cheque Configuration</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2"><Switch checked={form.cheque_stock_required ?? false} onCheckedChange={(v) => setForm((f) => ({ ...f, cheque_stock_required: v }))} /><Label>Cheque Stock Required</Label></div>
                    <div><Label className="text-xs">Cheque Format Template ID</Label><Input value={form.cheque_format_template_id || ''} onChange={(e) => setForm((f) => ({ ...f, cheque_format_template_id: e.target.value || null }))} /></div>
                    <div><Label className="text-xs">Print Layout</Label><Input value={mc.cheque_print_layout || ''} onChange={(e) => setMc({ cheque_print_layout: e.target.value })} placeholder="e.g. A4_PORTRAIT_3UP" /></div>
                    <div><Label className="text-xs">Signature Rule</Label><Input value={mc.cheque_signature_rule || ''} onChange={(e) => setMc({ cheque_signature_rule: e.target.value })} placeholder="e.g. SINGLE / DUAL" /></div>
                    <div className="col-span-2"><Label className="text-xs">Cheque Number Rule</Label><Input value={mc.cheque_number_rule || ''} onChange={(e) => setMc({ cheque_number_rule: e.target.value })} placeholder="e.g. CHQ-{branch}-{seq:6}" /></div>
                  </div>
                </>
              )}

              {cat === 'CASH' && (
                <>
                  <SectionTitle>Cash Pickup Configuration</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Cash Office</Label><Input value={mc.cash_office || ''} onChange={(e) => setMc({ cash_office: e.target.value })} /></div>
                    <div><Label className="text-xs">Cash Counter</Label><Input value={mc.cash_counter || ''} onChange={(e) => setMc({ cash_counter: e.target.value })} /></div>
                    <div className="flex items-center gap-2"><Switch checked={!!mc.collection_authorization_required} onCheckedChange={(v) => setMc({ collection_authorization_required: v })} /><Label>Collection Authorization Required</Label></div>
                    <div className="flex items-center gap-2"><Switch checked={!!mc.id_verification_required} onCheckedChange={(v) => setMc({ id_verification_required: v })} /><Label>ID Verification Required</Label></div>
                    <div><Label className="text-xs">Pickup Expiry Days</Label><Input type="number" value={mc.pickup_expiry_days ?? ''} onChange={(e) => setMc({ pickup_expiry_days: parseInt(e.target.value) || null })} /></div>
                  </div>
                </>
              )}

              {cat === 'MOBILE' && (
                <>
                  <SectionTitle>Mobile Money Configuration</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Mobile Provider *</Label><Input value={mc.mobile_provider || ''} onChange={(e) => setMc({ mobile_provider: e.target.value })} placeholder="e.g. Digicel, FLOW" /></div>
                    <div><Label className="text-xs">Mobile Number Validation Rule</Label><Input value={mc.mobile_number_rule || ''} onChange={(e) => setMc({ mobile_number_rule: e.target.value })} placeholder="e.g. ^1869\\d{7}$" /></div>
                    <div className="col-span-2"><Label className="text-xs">Wallet Verification Rule</Label><Input value={mc.wallet_verification_rule || ''} onChange={(e) => setMc({ wallet_verification_rule: e.target.value })} /></div>
                  </div>
                </>
              )}

              {cat === 'CARD' && (
                <>
                  <SectionTitle>Card Configuration</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Payment Gateway *</Label><Input value={mc.payment_gateway || ''} onChange={(e) => setMc({ payment_gateway: e.target.value })} placeholder="e.g. Stripe, CyberSource" /></div>
                    <div><Label className="text-xs">Merchant Account *</Label><Input value={mc.merchant_account || ''} onChange={(e) => setMc({ merchant_account: e.target.value })} /></div>
                    <div className="col-span-2"><Label className="text-xs">Settlement Rule</Label><Input value={mc.settlement_rule || ''} onChange={(e) => setMc({ settlement_rule: e.target.value })} placeholder="e.g. T+2 daily" /></div>
                  </div>
                </>
              )}

              {cat === 'MONEY_ORDER' && (
                <>
                  <SectionTitle>Money Order Configuration</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Issuer *</Label><Input value={mc.issuer || ''} onChange={(e) => setMc({ issuer: e.target.value })} placeholder="e.g. Post Office" /></div>
                    <div><Label className="text-xs">Reference Number Rule</Label><Input value={mc.reference_number_rule || ''} onChange={(e) => setMc({ reference_number_rule: e.target.value })} /></div>
                    <div className="col-span-2"><Label className="text-xs">Template</Label><Input value={mc.template || ''} onChange={(e) => setMc({ template: e.target.value })} /></div>
                  </div>
                </>
              )}

              {cat === 'WIRE' && (
                <>
                  <SectionTitle>Wire Transfer Configuration</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">SWIFT / BIC *</Label><Input value={mc.swift_bic || ''} onChange={(e) => setMc({ swift_bic: e.target.value })} /></div>
                    <div><Label className="text-xs">IBAN / Account Number *</Label><Input value={mc.iban || mc.account_number || ''} onChange={(e) => setMc({ iban: e.target.value })} /></div>
                    <div><Label className="text-xs">Intermediary Bank</Label><Input value={mc.intermediary_bank || ''} onChange={(e) => setMc({ intermediary_bank: e.target.value })} /></div>
                    <div><Label className="text-xs">Correspondent Bank</Label><Input value={mc.correspondent_bank || ''} onChange={(e) => setMc({ correspondent_bank: e.target.value })} /></div>
                    <div className="col-span-2"><Label className="text-xs">Wire Fee Rule</Label><Input value={mc.wire_fee_rule || ''} onChange={(e) => setMc({ wire_fee_rule: e.target.value })} placeholder="e.g. flat $25 or 0.1%" /></div>
                  </div>
                </>
              )}

              {cat === 'OTHER' && form.payment_method && (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No method-specific configuration schema is defined for <code>{form.payment_method}</code>. Add a
                  <code> method_category</code> on the reference value to enable a method-specific section.
                </p>
              )}
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
