import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MultiSelectCheckbox } from '@/components/ui/multi-select-checkbox';
import { Loader2, Settings, Save, ShieldCheck, Users, AlertTriangle, Coins, Plus, Trash2, FileText, Receipt, Edit2, Hash, CreditCard } from 'lucide-react';
import CardMachineTab from '@/components/payments/CardMachineTab';
import NumberFormatSegmentBuilder, { type Segment } from '@/components/cashier/NumberFormatSegmentBuilder';
import ReceiptTemplateTab from '@/components/cashier/ReceiptTemplateTab';
import InvoiceTemplateTab from '@/components/cashier/InvoiceTemplateTab';
import { usePaymentModuleConfig, useUpdatePaymentConfig } from '@/hooks/usePaymentModuleConfig';
import { useAllCurrencies, useAllCashierCurrencyConfigs, useDenominationsForCurrency } from '@/hooks/useCashierCurrencyConfig';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { logAuditTrail } from '@/services/auditService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

/* ─── Number Format Placeholder reference (for Available Placeholders card) ─── */
const SYSTEM_PLACEHOLDERS = [
  { key: '{YYYY}', desc: 'Four-digit year (e.g. 2026)' },
  { key: '{YY}', desc: 'Two-digit year (e.g. 26)' },
  { key: '{MM}', desc: 'Month (01–12)' },
  { key: '{DD}', desc: 'Day (01–31)' },
  { key: '{YYYYMM}', desc: 'Year-month (e.g. 202603)' },
  { key: '{YYYYMMDD}', desc: 'Date (e.g. 20260327)' },
  { key: '{DDMMYYYY}', desc: 'Date (e.g. 27032026)' },
  { key: '{HH}', desc: 'Hour 24h (00–23)' },
  { key: '{MI}', desc: 'Minutes (00–59)' },
  { key: '{SS}', desc: 'Seconds (00–59)' },
  { key: '{HHMM}', desc: 'Time (e.g. 1430)' },
  { key: '{HHMMSS}', desc: 'Time (e.g. 143025)' },
  { key: '{DDMMYYYYHHMM}', desc: 'DateTime (e.g. 270320261430)' },
  { key: '{SEQ}', desc: 'Auto-increment sequence (zero-padded)' },
  { key: '{OFFICE_CODE}', desc: 'Current user office code' },
];

const ENTITY_PLACEHOLDERS = [
  { key: '{PAYER_ID}', desc: 'Payer identifier' },
  { key: '{PAYER_TYPE}', desc: 'Payer type code (ER/IP/SE/AP)' },
  { key: '{USER_CODE}', desc: "Current cashier's user code" },
  { key: '{RECEIPT_ID}', desc: 'DB-generated receipt identity' },
  { key: '{INVOICE_ID}', desc: 'DB-generated invoice identity' },
  { key: '{BATCH_NUMBER}', desc: 'Parent batch number' },
];

/* ─── Currency Dialog ─── */
interface CurrencyFormData {
  currency_code: string;
  currency_name: string;
  symbol: string;
  exchange_rate: string;
  is_main_currency: boolean;
  sort_order: string;
}

const emptyCurrencyForm: CurrencyFormData = {
  currency_code: '',
  currency_name: '',
  symbol: '',
  exchange_rate: '1',
  is_main_currency: false,
  sort_order: '10',
};

const PaymentModuleConfig: React.FC = () => {
  const { data: configs, isLoading } = usePaymentModuleConfig();
  const updateConfig = useUpdatePaymentConfig();
  const queryClient = useQueryClient();
  const { profile, user } = useSupabaseAuth();

  const { data: allRoles } = useQuery({
    queryKey: ['all-active-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('role_name')
        .eq('is_active', true)
        .order('role_name');
      if (error) throw error;
      return data.map(r => ({ value: r.role_name, label: r.role_name }));
    },
  });

  const { data: allCurrencies, refetch: refetchCurrencies } = useAllCurrencies();
  const { data: currencyConfigs } = useAllCashierCurrencyConfigs();

  const [cashierRoles, setCashierRoles] = useState<string[]>([]);
  const [manageAllRoles, setManageAllRoles] = useState<string[]>([]);
  const [duplicateMode, setDuplicateMode] = useState<string>('warning');
  const [c3PaymentTypes, setC3PaymentTypes] = useState<string[]>([]);
  const [selectedDenomCurrencyId, setSelectedDenomCurrencyId] = useState<string | null>(null);
  const { data: denominations, refetch: refetchDenoms } = useDenominationsForCurrency(selectedDenomCurrencyId);

  const [newDenomValue, setNewDenomValue] = useState('');
  const [newDenomType, setNewDenomType] = useState('note');
  const [newDenomLabel, setNewDenomLabel] = useState('');
  const [savingCurrency, setSavingCurrency] = useState(false);

  // Currency CRUD dialog
  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);
  const [editingCurrencyId, setEditingCurrencyId] = useState<string | null>(null);
  const [currencyForm, setCurrencyForm] = useState<CurrencyFormData>(emptyCurrencyForm);
  const [currencyFormErrors, setCurrencyFormErrors] = useState<Record<string, string>>({});
  const [savingCurrencyForm, setSavingCurrencyForm] = useState(false);

  // Number Format segment states
  const [invoiceSegments, setInvoiceSegments] = useState<Segment[]>([]);
  const [receiptSegments, setReceiptSegments] = useState<Segment[]>([]);
  const [batchSegments, setBatchSegments] = useState<Segment[]>([]);

  // Fetch all payment types from tb_payment_type
  const { data: allPaymentTypes } = useQuery({
    queryKey: ['tb-payment-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_payment_type')
        .select('payment_code, payment_type_description')
        .order('payment_code');
      if (error) throw error;
      return (data || []).map((pt: any) => ({
        value: pt.payment_code,
        label: `${pt.payment_code} — ${pt.payment_type_description}`,
      }));
    },
  });

  useEffect(() => {
    if (!configs) return;
    const getVal = (key: string) => configs.find(c => c.config_key === key)?.config_value;
    const cr = getVal('cashier_roles');
    if (Array.isArray(cr)) setCashierRoles(cr);
    const mr = getVal('manage_all_batches_roles');
    if (Array.isArray(mr)) setManageAllRoles(mr);
    const dm = getVal('duplicate_open_batch');
    if (dm?.mode) setDuplicateMode(dm.mode);
    const c3pt = getVal('c3_payment_types');
    if (Array.isArray(c3pt)) setC3PaymentTypes(c3pt);

    // Number formats — segments
    const invFmt = getVal('invoice_number_format');
    if (invFmt && typeof invFmt === 'object' && Array.isArray((invFmt as any).segments)) {
      setInvoiceSegments((invFmt as any).segments as Segment[]);
    }
    const rcptFmt = getVal('receipt_number_format');
    if (rcptFmt && typeof rcptFmt === 'object' && Array.isArray((rcptFmt as any).segments)) {
      setReceiptSegments((rcptFmt as any).segments as Segment[]);
    }
    const batchFmt = getVal('batch_number_format');
    if (batchFmt && typeof batchFmt === 'object' && Array.isArray((batchFmt as any).segments)) {
      setBatchSegments((batchFmt as any).segments as Segment[]);
    }
  }, [configs]);

  // Auto-select first currency for denomination management
  useEffect(() => {
    if (allCurrencies?.length && !selectedDenomCurrencyId) {
      setSelectedDenomCurrencyId(allCurrencies[0].id);
    }
  }, [allCurrencies, selectedDenomCurrencyId]);

  const handleSave = async (key: string, value: any) => {
    await updateConfig.mutateAsync({ key, value });
  };

  const auditLog = async (action: string, entityType: string, entityId: string, before: any, after: any, meta?: Record<string, any>) => {
    const result = await logAuditTrail({
      action,
      entityType,
      entityId,
      module: 'Payment Module Configuration',
      beforeValue: before,
      afterValue: after,
      userCode: profile?.user_code || undefined,
      userId: user?.id,
      metadata: { route: '/cashier/payment-module-config', ...meta },
    });
    if (!result) console.error('[PaymentConfig] Audit log failed:', action, entityType, entityId);
  };

  // ─── Currency enable/disable ───
  const toggleCurrencyEnabled = async (currencyId: string, currentlyEnabled: boolean) => {
    setSavingCurrency(true);
    const currencyName = allCurrencies?.find(c => c.id === currencyId)?.currency_code || currencyId;
    try {
      const existing = currencyConfigs?.find(c => c.currency_id === currencyId);
      if (existing) {
        const { error } = await supabase
          .from('cashier_currency_config')
          .update({ is_enabled: !currentlyEnabled, updated_by: profile?.user_code || null, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cashier_currency_config')
          .insert({ currency_id: currencyId, is_enabled: true, sort_order: 99, updated_by: profile?.user_code || null });
        if (error) throw error;
      }
      await auditLog(
        currentlyEnabled ? 'disable' : 'enable',
        'cashier_currency_config',
        currencyId,
        { currency: currencyName, is_enabled: currentlyEnabled },
        { currency: currencyName, is_enabled: !currentlyEnabled },
      );
      queryClient.invalidateQueries({ queryKey: ['cashier-currency-config-all'] });
      queryClient.invalidateQueries({ queryKey: ['cashier-currency-config-enabled'] });
      toast.success('Currency configuration updated');
    } catch (err: any) {
      toast.error('Failed to update currency', { description: err.message });
    } finally {
      setSavingCurrency(false);
    }
  };

  // ─── Currency CRUD ───
  const openCurrencyDialog = (currencyId?: string) => {
    setCurrencyFormErrors({});
    if (currencyId && allCurrencies) {
      const c = allCurrencies.find(x => x.id === currencyId);
      if (c) {
        setEditingCurrencyId(currencyId);
        setCurrencyForm({
          currency_code: c.currency_code,
          currency_name: c.currency_name,
          symbol: c.symbol || '',
          exchange_rate: String(c.exchange_rate),
          is_main_currency: c.is_main_currency,
          sort_order: String(c.sort_order),
        });
      }
    } else {
      setEditingCurrencyId(null);
      setCurrencyForm(emptyCurrencyForm);
    }
    setCurrencyDialogOpen(true);
  };

  const validateCurrencyForm = (): boolean => {
    const errors: Record<string, string> = {};
    const code = currencyForm.currency_code.trim().toUpperCase();
    if (!code || code.length !== 3 || !/^[A-Z]{3}$/.test(code)) errors.currency_code = 'Must be 3 uppercase letters';
    // Check uniqueness
    if (!editingCurrencyId && allCurrencies?.some(c => c.currency_code === code)) errors.currency_code = 'Currency code already exists';
    if (editingCurrencyId) {
      const existing = allCurrencies?.find(c => c.currency_code === code && c.id !== editingCurrencyId);
      if (existing) errors.currency_code = 'Currency code already exists';
    }
    if (!currencyForm.currency_name.trim()) errors.currency_name = 'Required';
    const rate = parseFloat(currencyForm.exchange_rate);
    if (isNaN(rate) || rate <= 0) errors.exchange_rate = 'Must be greater than 0';
    const sort = parseInt(currencyForm.sort_order);
    if (isNaN(sort) || sort < 0) errors.sort_order = 'Must be a valid number';
    setCurrencyFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveCurrency = async () => {
    if (!validateCurrencyForm()) return;
    setSavingCurrencyForm(true);
    const code = currencyForm.currency_code.trim().toUpperCase();
    const payload = {
      currency_code: code,
      currency_name: currencyForm.currency_name.trim(),
      symbol: currencyForm.symbol.trim() || null,
      exchange_rate: parseFloat(currencyForm.exchange_rate),
      is_main_currency: currencyForm.is_main_currency,
      sort_order: parseInt(currencyForm.sort_order) || 10,
    };

    try {
      // If setting as main, demote existing main first
      if (payload.is_main_currency) {
        const currentMain = allCurrencies?.find(c => c.is_main_currency && c.id !== editingCurrencyId);
        if (currentMain) {
          const { error: demoteErr } = await supabase
            .from('tb_currencies')
            .update({ is_main_currency: false })
            .eq('id', currentMain.id);
          if (demoteErr) throw demoteErr;
          await auditLog('update', 'tb_currencies', currentMain.id,
            { currency_code: currentMain.currency_code, is_main_currency: true },
            { currency_code: currentMain.currency_code, is_main_currency: false },
            { reason: 'Demoted from main currency' },
          );
        }
      }

      if (editingCurrencyId) {
        const before = allCurrencies?.find(c => c.id === editingCurrencyId);
        const { error } = await supabase
          .from('tb_currencies')
          .update(payload)
          .eq('id', editingCurrencyId);
        if (error) throw error;
        await auditLog('update', 'tb_currencies', editingCurrencyId, before, payload);
        toast.success('Currency updated successfully');
      } else {
        const { data: inserted, error } = await supabase
          .from('tb_currencies')
          .insert({ ...payload, is_active: true })
          .select('id')
          .single();
        if (error) throw error;
        await auditLog('create', 'tb_currencies', inserted?.id || '', null, payload);
        toast.success('Currency created successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['tb-currencies'] });
      queryClient.invalidateQueries({ queryKey: ['cashier-currency-config-enabled'] });
      setCurrencyDialogOpen(false);
    } catch (err: any) {
      toast.error('Failed to save currency', { description: err.message });
    } finally {
      setSavingCurrencyForm(false);
    }
  };

  // ─── Denominations ───
  const addDenomination = async () => {
    if (!selectedDenomCurrencyId || !newDenomValue) return;
    const val = parseFloat(newDenomValue);
    if (isNaN(val) || val <= 0) {
      toast.error('Enter a valid denomination value');
      return;
    }
    const currencyName = allCurrencies?.find(c => c.id === selectedDenomCurrencyId)?.currency_code || '';
    const label = newDenomLabel || (val >= 1 ? `$${val}` : `${(val * 100).toFixed(0)}¢`);
    try {
      const maxSort = denominations?.length ? Math.max(...denominations.map(d => d.sort_order)) + 1 : 1;
      const { data: inserted, error } = await supabase
        .from('cashier_currency_denominations')
        .insert({
          currency_id: selectedDenomCurrencyId,
          denomination_value: val,
          denomination_type: newDenomType,
          label,
          sort_order: maxSort,
          updated_by: profile?.user_code || null,
        })
        .select('id')
        .single();
      if (error) throw error;
      await auditLog('create', 'cashier_currency_denominations', inserted?.id || '', null, {
        currency: currencyName, denomination_value: val, denomination_type: newDenomType, label,
      });
      setNewDenomValue('');
      setNewDenomLabel('');
      refetchDenoms();
      queryClient.invalidateQueries({ queryKey: ['cashier-denominations'] });
      toast.success('Denomination added');
    } catch (err: any) {
      toast.error('Failed to add denomination', { description: err.message });
    }
  };

  const toggleDenomActive = async (denomId: string, isActive: boolean) => {
    const denom = denominations?.find(d => d.id === denomId);
    const { error } = await supabase
      .from('cashier_currency_denominations')
      .update({ is_active: !isActive, updated_by: profile?.user_code || null, updated_at: new Date().toISOString() })
      .eq('id', denomId);
    if (error) {
      toast.error('Failed to update denomination');
      return;
    }
    await auditLog(isActive ? 'disable' : 'enable', 'cashier_currency_denominations', denomId,
      { denomination_value: denom?.denomination_value, is_active: isActive },
      { denomination_value: denom?.denomination_value, is_active: !isActive },
    );
    refetchDenoms();
    queryClient.invalidateQueries({ queryKey: ['cashier-denominations'] });
    toast.success('Denomination updated');
  };

  const deleteDenomination = async (denomId: string) => {
    const denom = denominations?.find(d => d.id === denomId);
    const { error } = await supabase
      .from('cashier_currency_denominations')
      .delete()
      .eq('id', denomId);
    if (error) {
      toast.error('Failed to delete denomination');
      return;
    }
    await auditLog('delete', 'cashier_currency_denominations', denomId,
      { denomination_value: denom?.denomination_value, label: denom?.label, denomination_type: denom?.denomination_type },
      null,
    );
    refetchDenoms();
    queryClient.invalidateQueries({ queryKey: ['cashier-denominations'] });
    toast.success('Denomination removed');
  };

  const isCurrencyEnabled = (currencyId: string) => {
    return currencyConfigs?.find(c => c.currency_id === currencyId)?.is_enabled ?? false;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Payment Module Configuration
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure roles, permissions, currencies, and behavior for the Payments module.
        </p>
      </div>

      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="c3-payment-types">C3 Payment Types</TabsTrigger>
          <TabsTrigger value="mop-details">MOP Detail Settings</TabsTrigger>
          <TabsTrigger value="currencies">Cashier Currencies</TabsTrigger>
          <TabsTrigger value="denominations">Denominations</TabsTrigger>
          <TabsTrigger value="number-formats">Number Formats</TabsTrigger>
          <TabsTrigger value="receipt">Receipt & Invoice</TabsTrigger>
          <TabsTrigger value="card-machines">
            <CreditCard className="h-3.5 w-3.5 mr-1" />
            Card Machines
          </TabsTrigger>
        </TabsList>

        {/* ─── ROLES TAB ─── */}
        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Cashier Roles
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Roles eligible to be selected as cashier when opening a new batch.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <MultiSelectCheckbox
                options={allRoles || []}
                selected={cashierRoles}
                onChange={setCashierRoles}
                placeholder="Select cashier roles..."
              />
              <Button size="sm" onClick={() => handleSave('cashier_roles', cashierRoles)} disabled={updateConfig.isPending}>
                {updateConfig.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save Cashier Roles
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4" />
                Manage All Batches — Roles
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Roles that can view and manage ALL batches (not just their own).
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <MultiSelectCheckbox
                options={allRoles || []}
                selected={manageAllRoles}
                onChange={setManageAllRoles}
                placeholder="Select roles..."
              />
              <Button size="sm" onClick={() => handleSave('manage_all_batches_roles', manageAllRoles)} disabled={updateConfig.isPending}>
                {updateConfig.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save Access Roles
              </Button>
            </CardContent>
          </Card>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4" />
                Duplicate Open Batch Handling
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Controls what happens when a user tries to open a new batch for the same cashier and date when one already exists.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={duplicateMode} onValueChange={setDuplicateMode}>
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="warning" id="dup-warning" />
                  <Label htmlFor="dup-warning" className="cursor-pointer">
                    <span className="font-medium">Warning</span>
                    <p className="text-xs text-muted-foreground">Show a warning message but still allow batch creation.</p>
                  </Label>
                </div>
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="restriction" id="dup-restriction" />
                  <Label htmlFor="dup-restriction" className="cursor-pointer">
                    <span className="font-medium">Restriction</span>
                    <p className="text-xs text-muted-foreground">Block batch creation entirely when an OPEN batch already exists.</p>
                  </Label>
                </div>
              </RadioGroup>
              <Button size="sm" onClick={() => handleSave('duplicate_open_batch', { mode: duplicateMode })} disabled={updateConfig.isPending}>
                {updateConfig.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save Duplicate Handling
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── C3 PAYMENT TYPES TAB ─── */}
        <TabsContent value="c3-payment-types" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                C3 Payment Types
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Select which payment types from the master list should be treated as C3 payments.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <MultiSelectCheckbox
                options={allPaymentTypes || []}
                selected={c3PaymentTypes}
                onChange={(selected) => setC3PaymentTypes([...new Set(selected)])}
                placeholder="Select C3 payment types..."
              />
              {c3PaymentTypes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {c3PaymentTypes.map(code => {
                    const pt = allPaymentTypes?.find(p => p.value === code);
                    return (
                      <Badge key={code} variant="secondary" className="text-xs">
                        {pt ? pt.label : code}
                      </Badge>
                    );
                  })}
                </div>
              )}
              <Button
                size="sm"
                onClick={() => handleSave('c3_payment_types', [...new Set(c3PaymentTypes)])}
                disabled={updateConfig.isPending}
              >
                {updateConfig.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save C3 Payment Types
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── MOP DETAIL SETTINGS TAB ─── */}
        <TabsContent value="mop-details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4" />
                Method of Payment — Detail Entry
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Control whether supplementary detail fields appear when specific payment methods are selected during payment entry.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Cheque Details Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Show Cheque Details</Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, cheque detail fields (cheque number, bank, date, etc.) appear when CHQ method is selected.
                  </p>
                </div>
                <Switch
                  checked={configs?.find(c => c.config_key === 'show_cheque_details')?.config_value !== false}
                  onCheckedChange={(checked) => handleSave('show_cheque_details', checked)}
                  disabled={updateConfig.isPending}
                />
              </div>

              {/* Card Details Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Show Card Details</Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, card detail fields (card type, card number, expiry, etc.) appear when <strong>CRD (Credit Card)</strong> or <strong>DRD (Debit Card)</strong> method is selected.
                  </p>
                </div>
                <Switch
                  checked={configs?.find(c => c.config_key === 'show_card_details')?.config_value !== false}
                  onCheckedChange={(checked) => handleSave('show_card_details', checked)}
                  disabled={updateConfig.isPending}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── CURRENCIES TAB ─── */}
        <TabsContent value="currencies" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Coins className="h-4 w-4" />
                    Cashier Currencies
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Manage currencies and enable/disable them for cashier use. The main system currency is always enabled.
                  </p>
                </div>
                <Button size="sm" onClick={() => openCurrencyDialog()}>
                  <Plus className="h-4 w-4 mr-1" /> Add Currency
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Currency</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Exchange Rate (to Main)</TableHead>
                    <TableHead>Main</TableHead>
                    <TableHead className="text-center">Enabled</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allCurrencies?.map(c => {
                    const enabled = isCurrencyEnabled(c.id);
                    const isMain = c.is_main_currency;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.currency_code} — {c.currency_name}</TableCell>
                        <TableCell>{c.symbol || '—'}</TableCell>
                        <TableCell>{isMain ? '1.000000 (base)' : c.exchange_rate.toFixed(6)}</TableCell>
                        <TableCell>{isMain ? <Badge variant="default">Main</Badge> : '—'}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={isMain ? true : enabled}
                            disabled={isMain || savingCurrency}
                            onCheckedChange={() => toggleCurrencyEnabled(c.id, enabled)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="sm" onClick={() => openCurrencyDialog(c.id)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── DENOMINATIONS TAB ─── */}
        <TabsContent value="denominations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Coins className="h-4 w-4" />
                Denomination Configuration
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Configure the notes and coins available for each currency in the Cash Details screen.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Label className="whitespace-nowrap">Currency:</Label>
                <Select value={selectedDenomCurrencyId || ''} onValueChange={setSelectedDenomCurrencyId}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select currency..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allCurrencies?.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.currency_code} — {c.currency_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedDenomCurrencyId && (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Value</TableHead>
                        <TableHead>Label</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead className="text-center">Active</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {denominations?.map(d => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.denomination_value}</TableCell>
                          <TableCell>{d.label || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={d.denomination_type === 'note' ? 'default' : 'secondary'}>
                              {d.denomination_type}
                            </Badge>
                          </TableCell>
                          <TableCell>{d.sort_order}</TableCell>
                          <TableCell className="text-center">
                            <Switch checked={d.is_active} onCheckedChange={() => toggleDenomActive(d.id, d.is_active)} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="sm" onClick={() => deleteDenomination(d.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!denominations || denominations.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                            No denominations configured for this currency.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  <Separator />

                  <div className="flex items-end gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Value</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={newDenomValue}
                        onChange={e => setNewDenomValue(e.target.value)}
                        placeholder="e.g. 50"
                        className="w-28"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Label</Label>
                      <Input
                        value={newDenomLabel}
                        onChange={e => setNewDenomLabel(e.target.value)}
                        placeholder="e.g. $50"
                        className="w-28"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select value={newDenomType} onValueChange={setNewDenomType}>
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="note">Note</SelectItem>
                          <SelectItem value="coin">Coin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button size="sm" onClick={addDenomination}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── NUMBER FORMATS TAB ─── */}
        <TabsContent value="number-formats" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <NumberFormatSegmentBuilder
              title="Invoice Number"
              description="Configure the segment-based format for invoice_number in cn_invoices."
              configKey="invoice_number_format"
              segments={invoiceSegments}
              onChange={setInvoiceSegments}
              onSave={() => handleSave('invoice_number_format', { segments: invoiceSegments })}
              saving={updateConfig.isPending}
            />
            <NumberFormatSegmentBuilder
              title="Receipt Number"
              description="Configure the segment-based format for receipt_number in cn_receipt."
              configKey="receipt_number_format"
              segments={receiptSegments}
              onChange={setReceiptSegments}
              onSave={() => handleSave('receipt_number_format', { segments: receiptSegments })}
              saving={updateConfig.isPending}
            />
            <NumberFormatSegmentBuilder
              title="Batch Number"
              description="Configure the segment-based format for batch_number in cn_batch."
              configKey="batch_number_format"
              segments={batchSegments}
              onChange={setBatchSegments}
              onSave={() => handleSave('batch_number_format', { segments: batchSegments })}
              saving={updateConfig.isPending}
            />
          </div>

          {/* Placeholder Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Available Placeholders</CardTitle>
              <p className="text-xs text-muted-foreground">
                Use these placeholders when adding segments. Each placeholder supports an optional min-length for zero-padding.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold mb-2">System Placeholders</h4>
                  <div className="space-y-1">
                    {SYSTEM_PLACEHOLDERS.map(p => (
                      <div key={p.key} className="flex gap-2 text-xs">
                        <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-primary whitespace-nowrap">{p.key}</code>
                        <span className="text-muted-foreground">{p.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Entity Placeholders</h4>
                  <div className="space-y-1">
                    {ENTITY_PLACEHOLDERS.map(p => (
                      <div key={p.key} className="flex gap-2 text-xs">
                        <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-primary whitespace-nowrap">{p.key}</code>
                        <span className="text-muted-foreground">{p.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── RECEIPT & INVOICE TAB ─── */}
        <TabsContent value="receipt" className="space-y-6">
          <Tabs defaultValue="receipt-tpl" className="space-y-4">
            <TabsList>
              <TabsTrigger value="receipt-tpl">
                <Receipt className="h-3.5 w-3.5 mr-1" />
                Receipt Template
              </TabsTrigger>
              <TabsTrigger value="invoice-tpl">
                <FileText className="h-3.5 w-3.5 mr-1" />
                Invoice Template
              </TabsTrigger>
            </TabsList>
            <TabsContent value="receipt-tpl">
              <ReceiptTemplateTab />
            </TabsContent>
            <TabsContent value="invoice-tpl">
              <InvoiceTemplateTab />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ─── CARD MACHINES TAB ─── */}
        <TabsContent value="card-machines" className="space-y-6">
          <CardMachineTab />
        </TabsContent>
      </Tabs>

      {/* ─── Currency Add/Edit Dialog ─── */}
      <Dialog open={currencyDialogOpen} onOpenChange={setCurrencyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCurrencyId ? 'Edit Currency' : 'Add New Currency'}</DialogTitle>
            <DialogDescription>
              {editingCurrencyId ? 'Update the currency details below.' : 'Enter details for the new currency.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Currency Code (3 letters, e.g. USD)</Label>
              <Input
                value={currencyForm.currency_code}
                onChange={e => { setCurrencyForm(f => ({ ...f, currency_code: e.target.value.toUpperCase().slice(0, 3) })); setCurrencyFormErrors(prev => ({ ...prev, currency_code: '' })); }}
                maxLength={3}
                className={currencyFormErrors.currency_code ? 'border-destructive' : ''}
                disabled={!!editingCurrencyId}
              />
              {currencyFormErrors.currency_code && <p className="text-xs text-destructive">{currencyFormErrors.currency_code}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Currency Name</Label>
              <Input
                value={currencyForm.currency_name}
                onChange={e => { setCurrencyForm(f => ({ ...f, currency_name: e.target.value })); setCurrencyFormErrors(prev => ({ ...prev, currency_name: '' })); }}
                className={currencyFormErrors.currency_name ? 'border-destructive' : ''}
              />
              {currencyFormErrors.currency_name && <p className="text-xs text-destructive">{currencyFormErrors.currency_name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Symbol</Label>
                <Input value={currencyForm.symbol} onChange={e => setCurrencyForm(f => ({ ...f, symbol: e.target.value }))} placeholder="e.g. $" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sort Order</Label>
                <Input type="number" value={currencyForm.sort_order} onChange={e => setCurrencyForm(f => ({ ...f, sort_order: e.target.value }))} className={currencyFormErrors.sort_order ? 'border-destructive' : ''} />
                {currencyFormErrors.sort_order && <p className="text-xs text-destructive">{currencyFormErrors.sort_order}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Exchange Rate (to main currency)</Label>
              <Input type="number" step="0.000001" min="0.000001" value={currencyForm.exchange_rate} onChange={e => setCurrencyForm(f => ({ ...f, exchange_rate: e.target.value }))} className={currencyFormErrors.exchange_rate ? 'border-destructive' : ''} />
              {currencyFormErrors.exchange_rate && <p className="text-xs text-destructive">{currencyFormErrors.exchange_rate}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={currencyForm.is_main_currency}
                onCheckedChange={(checked) => setCurrencyForm(f => ({ ...f, is_main_currency: !!checked }))}
              />
              <Label className="text-xs cursor-pointer">Set as main (system) currency</Label>
            </div>
            {currencyForm.is_main_currency && allCurrencies?.some(c => c.is_main_currency && c.id !== editingCurrencyId) && (
              <div className="rounded-md bg-muted border border-border p-2 text-xs text-foreground/70">
                <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                The current main currency ({allCurrencies.find(c => c.is_main_currency)?.currency_code}) will be demoted.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCurrencyDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveCurrency} disabled={savingCurrencyForm}>
              {savingCurrencyForm ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              {editingCurrencyId ? 'Update Currency' : 'Create Currency'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentModuleConfig;
