import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Loader2, Coins } from 'lucide-react';
import { usePaymentModuleConfig, useUpdatePaymentConfig } from '@/hooks/usePaymentModuleConfig';

const DefaultOpeningBalanceTab: React.FC = () => {
  const { data: configs } = usePaymentModuleConfig();
  const updateConfig = useUpdatePaymentConfig();

  const [headCashierBal, setHeadCashierBal] = useState('0');
  const [cashierBal, setCashierBal] = useState('0');

  useEffect(() => {
    if (!configs) return;
    const cfg = configs.find(c => c.config_key === 'default_opening_balance');
    if (cfg?.config_value) {
      setHeadCashierBal(String(cfg.config_value.head_cashier ?? 0));
      setCashierBal(String(cfg.config_value.cashier ?? 0));
    }
  }, [configs]);

  const handleSave = () => {
    updateConfig.mutate({
      key: 'default_opening_balance',
      value: {
        head_cashier: parseFloat(headCashierBal) || 0,
        cashier: parseFloat(cashierBal) || 0,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Coins className="h-4 w-4" />
          Default Opening Balances
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Configure the default opening balance auto-populated when creating a new batch. 
          The value depends on whether the cashier is assigned as Head Cashier for that day.
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
        <Button size="sm" onClick={handleSave} disabled={updateConfig.isPending}>
          {updateConfig.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Save Opening Balances
        </Button>
      </CardContent>
    </Card>
  );
};

export default DefaultOpeningBalanceTab;
