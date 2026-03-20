import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MultiSelectCheckbox } from '@/components/ui/multi-select-checkbox';
import { Loader2, Settings, Save, ShieldCheck, Users, AlertTriangle, Coins, Plus, Trash2, FileText, Receipt } from 'lucide-react';
import ReceiptTemplateTab from '@/components/cashier/ReceiptTemplateTab';
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

const PaymentModuleConfig: React.FC = () => {
  const { data: configs, isLoading } = usePaymentModuleConfig();
  const updateConfig = useUpdatePaymentConfig();
  const queryClient = useQueryClient();
  const { profile } = useSupabaseAuth();

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

  const { data: allCurrencies } = useAllCurrencies();
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

  const { user } = useSupabaseAuth();

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

  const isMainCurrency = (currencyId: string) => {
    return allCurrencies?.find(c => c.id === currencyId)?.is_main_currency ?? false;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedCurrencyName = allCurrencies?.find(c => c.id === selectedDenomCurrencyId);

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
          <TabsTrigger value="currencies">Cashier Currencies</TabsTrigger>
          <TabsTrigger value="denominations">Denominations</TabsTrigger>
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
                    <p className="text-xs text-muted-foreground">Block batch creation entirely when a duplicate exists.</p>
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
                Select which payment types from the master list should be treated as C3 payments. These are persisted and used across the system for C3-specific processing logic.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <MultiSelectCheckbox
                options={allPaymentTypes || []}
                selected={c3PaymentTypes}
                onChange={(selected) => {
                  // Deduplicate just in case
                  setC3PaymentTypes([...new Set(selected)]);
                }}
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

        <TabsContent value="currencies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Coins className="h-4 w-4" />
                Cashier Currencies
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Enable or disable currencies that cashiers can use in the Cash Details screen. The main system currency is always enabled.
              </p>
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
      </Tabs>
    </div>
  );
};

export default PaymentModuleConfig;
