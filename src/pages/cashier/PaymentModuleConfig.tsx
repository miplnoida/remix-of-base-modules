import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MultiSelectCheckbox } from '@/components/ui/multi-select-checkbox';
import { Loader2, Settings, Save, ShieldCheck, Users, AlertTriangle } from 'lucide-react';
import { usePaymentModuleConfig, useUpdatePaymentConfig } from '@/hooks/usePaymentModuleConfig';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Separator } from '@/components/ui/separator';

const PaymentModuleConfig: React.FC = () => {
  const { data: configs, isLoading } = usePaymentModuleConfig();
  const updateConfig = useUpdatePaymentConfig();

  // Fetch all active roles for dropdown options
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

  const [cashierRoles, setCashierRoles] = useState<string[]>([]);
  const [manageAllRoles, setManageAllRoles] = useState<string[]>([]);
  const [duplicateMode, setDuplicateMode] = useState<string>('warning');

  // Populate state from DB config
  useEffect(() => {
    if (!configs) return;
    const getVal = (key: string) => configs.find(c => c.config_key === key)?.config_value;
    const cr = getVal('cashier_roles');
    if (Array.isArray(cr)) setCashierRoles(cr);
    const mr = getVal('manage_all_batches_roles');
    if (Array.isArray(mr)) setManageAllRoles(mr);
    const dm = getVal('duplicate_open_batch');
    if (dm?.mode) setDuplicateMode(dm.mode);
  }, [configs]);

  const handleSave = async (key: string, value: any) => {
    await updateConfig.mutateAsync({ key, value });
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
          Configure roles, permissions, and behavior for the Payments module.
        </p>
      </div>

      {/* Cashier Roles */}
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
          <Button
            size="sm"
            onClick={() => handleSave('cashier_roles', cashierRoles)}
            disabled={updateConfig.isPending}
          >
            {updateConfig.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save Cashier Roles
          </Button>
        </CardContent>
      </Card>

      {/* All-Batch Access Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Manage All Batches — Roles
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Roles that can view and manage ALL batches (not just their own). These users can also select any configured cashier when opening a batch.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <MultiSelectCheckbox
            options={allRoles || []}
            selected={manageAllRoles}
            onChange={setManageAllRoles}
            placeholder="Select roles..."
          />
          <Button
            size="sm"
            onClick={() => handleSave('manage_all_batches_roles', manageAllRoles)}
            disabled={updateConfig.isPending}
          >
            {updateConfig.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save Access Roles
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Duplicate Open Batch Handling */}
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
                <p className="text-xs text-muted-foreground">
                  Show a warning message but still allow batch creation.
                </p>
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <RadioGroupItem value="restriction" id="dup-restriction" />
              <Label htmlFor="dup-restriction" className="cursor-pointer">
                <span className="font-medium">Restriction</span>
                <p className="text-xs text-muted-foreground">
                  Block batch creation entirely when a duplicate exists.
                </p>
              </Label>
            </div>
          </RadioGroup>
          <Button
            size="sm"
            onClick={() => handleSave('duplicate_open_batch', { mode: duplicateMode })}
            disabled={updateConfig.isPending}
          >
            {updateConfig.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save Duplicate Handling
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentModuleConfig;
