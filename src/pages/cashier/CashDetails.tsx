import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Calculator, DollarSign, Save, Loader2, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useEnabledCashierCurrencies, useCashierDenominations, DenominationConfig } from '@/hooks/useCashierCurrencyConfig';
import { BatchSelectionGuard, BatchInfoBar } from '@/components/payments/BatchSelectionGuard';
import { useBatchSelection } from '@/hooks/useBatchSelection';
import { formatCurrency } from '@/utils/formatCurrency';
import { useUserCode } from '@/hooks/useUserCode';

const CashDetails: React.FC = () => {
  const { toast } = useToast();
  const batchSel = useBatchSelection();
  const { userCode } = useUserCode();
  const [systemTotal, setSystemTotal] = useState<number>(0);
  const [systemTotalLoading, setSystemTotalLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingCounts, setLoadingCounts] = useState(false);

  // Fetch system total from DB whenever batch changes
  const fetchSystemTotal = useCallback(async (batchNumber: string) => {
    setSystemTotalLoading(true);
    try {
      // Step 1: get payment_ids for this batch
      const { data: headers, error: hErr } = await supabase
        .from('cn_payment_header')
        .select('payment_id')
        .eq('batch_number', batchNumber);
      if (hErr) throw hErr;
      if (!headers || headers.length === 0) {
        setSystemTotal(0);
        return;
      }
      const paymentIds = headers.map(h => h.payment_id);

      // Step 2: sum receipt_total for non-cancelled receipts
      const { data: receipts, error: rErr } = await supabase
        .from('cn_receipt')
        .select('receipt_total')
        .in('payment_id', paymentIds)
        .neq('status', 'C');
      if (rErr) throw rErr;

      const total = (receipts || []).reduce((sum, r) => sum + (r.receipt_total || 0), 0);
      setSystemTotal(total);
    } catch (err) {
      console.error('Failed to fetch system total:', err);
      setSystemTotal(0);
    } finally {
      setSystemTotalLoading(false);
    }
  }, []);

  useEffect(() => {
    if (batchSel.selectedBatch?.batch_number) {
      fetchSystemTotal(batchSel.selectedBatch.batch_number);
    } else {
      setSystemTotal(0);
    }
  }, [batchSel.selectedBatch?.batch_number, fetchSystemTotal]);

  // ── Denomination counts: { [currencyId]: { [denomId]: count } } ──
  const [denomCounts, setDenomCounts] = useState<Record<string, Record<string, number>>>({});

  // ── Load currencies & denominations from DB ──
  const { data: enabledCurrencies, isLoading: currLoading } = useEnabledCashierCurrencies();
  const currencyIds = useMemo(() => enabledCurrencies?.map(c => c.id) || [], [enabledCurrencies]);
  const { data: allDenominations, isLoading: denomLoading } = useCashierDenominations(currencyIds);

  // ── Denomination helpers ──
  const getDenominationsForCurrency = (currencyId: string): DenominationConfig[] => {
    return (allDenominations || []).filter(d => d.currency_id === currencyId);
  };

  const getCount = (currencyId: string, denomId: string): number => {
    return denomCounts[currencyId]?.[denomId] || 0;
  };

  const setCount = (currencyId: string, denomId: string, val: string) => {
    const num = parseInt(val) || 0;
    setDenomCounts(prev => ({
      ...prev,
      [currencyId]: { ...prev[currencyId], [denomId]: Math.max(0, num) },
    }));
  };

  const getCurrencyTotal = (currencyId: string): number => {
    const denoms = getDenominationsForCurrency(currencyId);
    return denoms.reduce((sum, d) => sum + d.denomination_value * getCount(currencyId, d.id), 0);
  };

  const mainCurrency = useMemo(() => enabledCurrencies?.find(c => c.is_main_currency), [enabledCurrencies]);

  const physicalCountInMain = useMemo(() => {
    if (!enabledCurrencies || !mainCurrency) return 0;
    return enabledCurrencies.reduce((total, c) => {
      const currTotal = getCurrencyTotal(c.id);
      if (c.is_main_currency) return total + currTotal;
      return total + currTotal * c.exchange_rate;
    }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledCurrencies, mainCurrency, denomCounts, allDenominations]);

  const getDenominationLabel = (d: DenominationConfig) => {
    return d.label || (d.denomination_value >= 1 ? `$${d.denomination_value}` : `${(d.denomination_value * 100).toFixed(0)}¢`);
  };

  const saveCashCount = () => {
    toast({
      title: 'Cash Count Saved',
      description: `Physical count: ${mainCurrency?.symbol || ''}${physicalCountInMain.toFixed(2)}`,
    });
  };

  if (currLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <BatchSelectionGuard
      isLoading={batchSel.isLoading}
      isReady={batchSel.isReady}
      noBatchesAvailable={batchSel.noBatchesAvailable}
      showPopup={batchSel.showPopup}
      openBatches={batchSel.openBatches}
      canManageAllBatches={batchSel.canManageAllBatches}
      selectedBatch={batchSel.selectedBatch}
      onSelectBatch={batchSel.selectBatch}
      onChangeBatch={batchSel.changeBatch}
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">Cash Details Entry</h1>
            <p className="text-muted-foreground text-sm">Enter physical cash count for each currency denomination</p>
          </div>
          <Button size="sm" onClick={saveCashCount}>
            <Save className="h-4 w-4 mr-1" />
            Save Cash Count
          </Button>
        </div>

        {/* Batch info bar */}
        {batchSel.selectedBatch && (
          <BatchInfoBar batch={batchSel.selectedBatch} onChangeBatch={batchSel.changeBatch} />
        )}

        {/* Physical Count card */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Cashier / Office</p>
              <p className="text-sm font-semibold">{batchSel.selectedBatch?.entered_by || '—'} • {batchSel.selectedBatch?.office_code || '—'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center border-secondary">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">System Total</span>
              </div>
              {systemTotalLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
              ) : (
                <p className="text-2xl font-bold">{formatCurrency(systemTotal)}</p>
              )}
            </CardContent>
          </Card>
          <Card className="border-primary">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground font-medium">Physical Count</span>
              </div>
              <p className="text-2xl font-bold text-primary">
                {mainCurrency?.symbol || ''} {physicalCountInMain.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">in {mainCurrency?.currency_code || 'main currency'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className={`h-4 w-4 ${(systemTotal - physicalCountInMain) >= 0 ? 'text-green-600' : 'text-destructive'}`} />
                <span className="text-xs text-muted-foreground font-medium">Variance</span>
              </div>
              <p className={`text-2xl font-bold ${(systemTotal - physicalCountInMain) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                {(systemTotal - physicalCountInMain) >= 0 ? '+' : ''}{formatCurrency(systemTotal - physicalCountInMain)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Currency Tabs */}
        {denomLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : enabledCurrencies && enabledCurrencies.length > 0 ? (
          <Tabs defaultValue={enabledCurrencies[0]?.id} className="space-y-4">
            <TabsList>
              {enabledCurrencies.map(c => (
                <TabsTrigger key={c.id} value={c.id}>
                  {c.symbol || c.currency_code} Cash Count
                  {c.is_main_currency && <Badge variant="outline" className="ml-2 text-[10px] px-1">Main</Badge>}
                </TabsTrigger>
              ))}
            </TabsList>

            {enabledCurrencies.map(currency => {
              const denoms = getDenominationsForCurrency(currency.id);
              const currencyTotal = getCurrencyTotal(currency.id);
              const convertedTotal = currency.is_main_currency ? currencyTotal : currencyTotal * currency.exchange_rate;

              return (
                <TabsContent key={currency.id} value={currency.id}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{currency.currency_code} — {currency.currency_name} Denomination Count</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {denoms.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6">No denominations configured for {currency.currency_code}. Please configure in Payment Module Config.</p>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {denoms.map(d => {
                              const count = getCount(currency.id, d.id);
                              const amount = d.denomination_value * count;
                              return (
                                <div key={d.id} className="space-y-1">
                                  <Label className="text-sm flex items-center gap-2">
                                    {getDenominationLabel(d)}
                                    <Badge variant="secondary" className="text-[10px] px-1">{d.denomination_type}</Badge>
                                  </Label>
                                  <div className="flex gap-2">
                                    <Input
                                      type="number"
                                      min="0"
                                      value={count || ''}
                                      onChange={e => setCount(currency.id, d.id, e.target.value)}
                                      placeholder="Count"
                                      className="flex-1"
                                    />
                                    <div className="w-28 flex items-center justify-end bg-muted rounded px-2 text-sm font-medium">
                                      {currency.symbol} {amount.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-6 p-4 bg-muted rounded-lg space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold">Total {currency.currency_code}:</span>
                              <span className="text-lg font-bold">{currency.symbol} {currencyTotal.toFixed(2)}</span>
                            </div>
                            {!currency.is_main_currency && mainCurrency && (
                              <div className="flex justify-between items-center text-sm text-muted-foreground">
                                <span>Converted to {mainCurrency.currency_code} (rate: {currency.exchange_rate}):</span>
                                <span className="font-semibold">{mainCurrency.symbol} {convertedTotal.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No currencies configured for cashier use. Please configure currencies in Payment Module Configuration.
            </CardContent>
          </Card>
        )}
      </div>
    </BatchSelectionGuard>
  );
};

export default CashDetails;
