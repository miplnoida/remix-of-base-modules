import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Save, Loader2, Coins, Building2 } from 'lucide-react';
import { usePaymentModuleConfig, useUpdatePaymentConfig } from '@/hooks/usePaymentModuleConfig';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserCode } from '@/hooks/useUserCode';
import { toast } from 'sonner';

const DefaultOpeningBalanceTab: React.FC = () => {
  const { data: configs } = usePaymentModuleConfig();
  const updateConfig = useUpdatePaymentConfig();
  const { userCode } = useUserCode();
  const queryClient = useQueryClient();

  // Global defaults
  const [headCashierBal, setHeadCashierBal] = useState('0');
  const [cashierBal, setCashierBal] = useState('0');

  // Offices
  const { data: offices } = useQuery({
    queryKey: ['tb-office-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tb_office').select('code, description').eq('is_active', true).order('code');
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Per-office balances
  const { data: officeBalances, isLoading: obLoading } = useQuery({
    queryKey: ['cn-office-opening-balance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cn_office_opening_balance')
        .select('*')
        .order('office_code');
      if (error) throw error;
      return (data || []) as { id: string; office_code: string; head_cashier_balance: number; cashier_balance: number }[];
    },
  });

  const [editingOffice, setEditingOffice] = useState<string | null>(null);
  const [officeHcBal, setOfficeHcBal] = useState('0');
  const [officeCashBal, setOfficeCashBal] = useState('0');
  const [savingOffice, setSavingOffice] = useState(false);

  useEffect(() => {
    if (!configs) return;
    const cfg = configs.find(c => c.config_key === 'default_opening_balance');
    if (cfg?.config_value) {
      setHeadCashierBal(String(cfg.config_value.head_cashier ?? 0));
      setCashierBal(String(cfg.config_value.cashier ?? 0));
    }
  }, [configs]);

  const handleSaveGlobal = () => {
    updateConfig.mutate({
      key: 'default_opening_balance',
      value: {
        head_cashier: parseFloat(headCashierBal) || 0,
        cashier: parseFloat(cashierBal) || 0,
      },
    });
  };

  const startEdit = (officeCode: string) => {
    const existing = officeBalances?.find(ob => ob.office_code === officeCode);
    setEditingOffice(officeCode);
    setOfficeHcBal(String(existing?.head_cashier_balance ?? ''));
    setOfficeCashBal(String(existing?.cashier_balance ?? ''));
  };

  const handleSaveOffice = async () => {
    if (!editingOffice) return;
    setSavingOffice(true);
    try {
      const hcVal = parseFloat(officeHcBal) || 0;
      const cashVal = parseFloat(officeCashBal) || 0;

      const { error } = await supabase
        .from('cn_office_opening_balance')
        .upsert({
          office_code: editingOffice,
          head_cashier_balance: hcVal,
          cashier_balance: cashVal,
          updated_by: userCode || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'office_code' });
      if (error) throw error;

      toast.success(`Opening balance saved for ${editingOffice}`);
      queryClient.invalidateQueries({ queryKey: ['cn-office-opening-balance'] });
      setEditingOffice(null);
    } catch (err: any) {
      toast.error('Failed to save', { description: err.message });
    } finally {
      setSavingOffice(false);
    }
  };

  const getOfficeBalance = (officeCode: string) => {
    return officeBalances?.find(ob => ob.office_code === officeCode);
  };

  return (
    <div className="space-y-6">
      {/* Global Default */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="h-4 w-4" />
            Global Default Opening Balances
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Fallback values used when no office-specific balance is configured.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Head Cashier Opening Balance</Label>
              <Input
                type="number"
                step="0.01"
                value={headCashierBal}
                onChange={e => setHeadCashierBal(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Regular Cashier Opening Balance</Label>
              <Input
                type="number"
                step="0.01"
                value={cashierBal}
                onChange={e => setCashierBal(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <Button size="sm" onClick={handleSaveGlobal} disabled={updateConfig.isPending}>
            {updateConfig.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save Global Defaults
          </Button>
        </CardContent>
      </Card>

      {/* Per-Office Balances */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Per-Branch Opening Balances
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Override the default opening balance for specific office locations. If not set, the global default applies.
          </p>
        </CardHeader>
        <CardContent>
          {obLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Office</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Head Cashier Balance</TableHead>
                  <TableHead>Cashier Balance</TableHead>
                  <TableHead className="w-32 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(offices || []).map((office: any) => {
                  const ob = getOfficeBalance(office.code);
                  const isEditing = editingOffice === office.code;
                  return (
                    <TableRow key={office.code}>
                      <TableCell className="font-mono font-semibold">{office.code}</TableCell>
                      <TableCell>{office.description}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={officeHcBal}
                            onChange={e => setOfficeHcBal(e.target.value)}
                            className="w-32 h-8"
                          />
                        ) : (
                          <span className={ob ? 'font-medium' : 'text-muted-foreground'}>
                            {ob ? ob.head_cashier_balance.toFixed(2) : `(${parseFloat(headCashierBal || '0').toFixed(2)})`}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={officeCashBal}
                            onChange={e => setOfficeCashBal(e.target.value)}
                            className="w-32 h-8"
                          />
                        ) : (
                          <span className={ob ? 'font-medium' : 'text-muted-foreground'}>
                            {ob ? ob.cashier_balance.toFixed(2) : `(${parseFloat(cashierBal || '0').toFixed(2)})`}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <Button size="sm" variant="default" onClick={handleSaveOffice} disabled={savingOffice}>
                              {savingOffice ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingOffice(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => startEdit(office.code)}>
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DefaultOpeningBalanceTab;
