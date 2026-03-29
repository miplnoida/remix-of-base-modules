import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, Landmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useEnabledCashierCurrencies, useCashierDenominations, DenominationConfig } from '@/hooks/useCashierCurrencyConfig';
import { BatchSelectionGuard, BatchInfoBar } from '@/components/payments/BatchSelectionGuard';
import { useBatchSelection } from '@/hooks/useBatchSelection';
import { formatCurrency } from '@/utils/formatCurrency';
import { useUserCode } from '@/hooks/useUserCode';
import { CardTransactionEntry, CardTransaction } from '@/components/payments/CardTransactionEntry';
import { ChequeVerificationList } from '@/components/payments/ChequeVerificationList';

const CashDetails: React.FC = () => {
  const { toast } = useToast();
  const batchSel = useBatchSelection({ skipDateFilter: true });
  const { userCode } = useUserCode();
  const [saving, setSaving] = useState(false);
  const [loadingCounts, setLoadingCounts] = useState(false);

  // Card transactions (machine-based)
  const [cardTransactions, setCardTransactions] = useState<CardTransaction[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  // Verified cheque total from ChequeVerificationList
  const [verifiedChequeTotal, setVerifiedChequeTotal] = useState(0);

  // Load card transactions from DB
  useEffect(() => {
    const loadCards = async () => {
      const batchNumber = batchSel.selectedBatch?.batch_number;
      if (!batchNumber) { setCardTransactions([]); return; }
      setLoadingCards(true);
      try {
        const { data, error } = await supabase
          .from('cn_batch_card_transaction')
          .select('id, batch_number, machine_id, card_type, amount, cn_card_machine(machine_code, machine_name)')
          .eq('batch_number', batchNumber)
          .order('created_at');
        if (error) throw error;
        setCardTransactions((data || []).map((r: any) => ({
          id: r.id,
          machine_id: r.machine_id,
          card_type: r.card_type,
          amount: Number(r.amount),
          machine_code: r.cn_card_machine?.machine_code,
          machine_name: r.cn_card_machine?.machine_name,
        })));
      } catch (err) {
        console.error('Failed to load card transactions:', err);
      } finally {
        setLoadingCards(false);
      }
    };
    loadCards();
  }, [batchSel.selectedBatch?.batch_number]);

  // Denomination counts
  const [denomCounts, setDenomCounts] = useState<Record<string, Record<string, number>>>({});

  const { data: enabledCurrencies, isLoading: currLoading } = useEnabledCashierCurrencies();
  const currencyIds = useMemo(() => enabledCurrencies?.map(c => c.id) || [], [enabledCurrencies]);
  const { data: allDenominations, isLoading: denomLoading } = useCashierDenominations(currencyIds);

  // Load saved cash counts from DB
  useEffect(() => {
    const loadCashCounts = async () => {
      const batchNumber = batchSel.selectedBatch?.batch_number;
      if (!batchNumber) {
        setDenomCounts({});
        return;
      }
      setLoadingCounts(true);
      try {
        const { data, error } = await supabase
          .from('cn_cash_count')
          .select('currency_id, denomination_id, count')
          .eq('batch_number', batchNumber);
        if (error) throw error;
        const counts: Record<string, Record<string, number>> = {};
        (data || []).forEach((row: any) => {
          if (!counts[row.currency_id]) counts[row.currency_id] = {};
          counts[row.currency_id][row.denomination_id] = row.count;
        });
        setDenomCounts(counts);
      } catch (err) {
        console.error('Failed to load cash counts:', err);
      } finally {
        setLoadingCounts(false);
      }
    };
    loadCashCounts();
  }, [batchSel.selectedBatch?.batch_number]);

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

  const cashPhysicalTotal = useMemo(() => {
    if (!enabledCurrencies || !mainCurrency) return 0;
    return enabledCurrencies.reduce((total, c) => {
      const currTotal = getCurrencyTotal(c.id);
      if (c.is_main_currency) return total + currTotal;
      return total + currTotal * c.exchange_rate;
    }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledCurrencies, mainCurrency, denomCounts, allDenominations]);

  const creditCardTotal = useMemo(() => cardTransactions.filter(t => t.card_type === 'CRD').reduce((s, t) => s + t.amount, 0), [cardTransactions]);
  const debitCardTotal = useMemo(() => cardTransactions.filter(t => t.card_type === 'DRD').reduce((s, t) => s + t.amount, 0), [cardTransactions]);
  const openingBalance = Number(batchSel.selectedBatch?.offset_amount || 0);
  const physicalCountInMain = openingBalance + cashPhysicalTotal + verifiedChequeTotal + creditCardTotal + debitCardTotal;

  const getDenominationLabel = (d: DenominationConfig) => {
    return d.label || (d.denomination_value >= 1 ? `$${d.denomination_value}` : `${(d.denomination_value * 100).toFixed(0)}¢`);
  };

  const handleChequeVerifiedTotalChange = useCallback((total: number) => {
    setVerifiedChequeTotal(total);
  }, []);

  // Save all: cash counts + card transactions (cheques are verified in-place, no save needed)
  const saveAll = async () => {
    const batchNumber = batchSel.selectedBatch?.batch_number;
    if (!batchNumber) return;

    setSaving(true);
    try {
      // 1. Save cash counts
      const rows: any[] = [];
      const zeroDenomIds: string[] = [];

      if (enabledCurrencies && allDenominations) {
        for (const currency of enabledCurrencies) {
          const denoms = getDenominationsForCurrency(currency.id);
          for (const d of denoms) {
            const count = getCount(currency.id, d.id);
            if (count > 0) {
              rows.push({
                batch_number: batchNumber,
                currency_id: currency.id,
                denomination_id: d.id,
                count,
                created_by: userCode || null,
                updated_by: userCode || null,
                updated_at: new Date().toISOString(),
              });
            } else {
              zeroDenomIds.push(d.id);
            }
          }
        }
      }

      if (rows.length > 0) {
        const { error: upsertErr } = await supabase
          .from('cn_cash_count')
          .upsert(rows, { onConflict: 'batch_number,denomination_id' });
        if (upsertErr) throw upsertErr;
      }
      if (zeroDenomIds.length > 0) {
        const { error: delErr } = await supabase
          .from('cn_cash_count')
          .delete()
          .eq('batch_number', batchNumber)
          .in('denomination_id', zeroDenomIds);
        if (delErr) throw delErr;
      }

      // 2. Save card transactions via RPC
      const txnPayload = cardTransactions.map(t => ({
        machine_id: t.machine_id,
        card_type: t.card_type,
        amount: t.amount,
      }));
      const { error: cardErr } = await supabase.rpc('save_batch_card_transactions', {
        p_batch_number: batchNumber,
        p_transactions: txnPayload,
        p_user_code: userCode || 'SYSTEM',
      });
      if (cardErr) throw cardErr;

      toast({
        title: 'Cash Details Saved',
        description: `Physical count: ${mainCurrency?.symbol || ''}${physicalCountInMain.toFixed(2)}`,
      });
    } catch (err: any) {
      console.error('Save failed:', err);
      toast({ title: 'Save Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
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
            <p className="text-muted-foreground text-sm">Enter physical cash, verify cheques, and record card machine totals</p>
          </div>
          <Button size="sm" onClick={saveAll} disabled={saving || loadingCounts}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            {saving ? 'Saving...' : 'Save All'}
          </Button>
        </div>

        {batchSel.selectedBatch && (
          <BatchInfoBar batch={batchSel.selectedBatch} onChangeBatch={batchSel.changeBatch} />
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-3 text-center">
              <span className="text-xs text-muted-foreground block">Opening Balance</span>
              <p className="text-lg font-bold text-primary">{formatCurrency(openingBalance)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <span className="text-xs text-muted-foreground block">Cash (CSH)</span>
              <p className="text-lg font-bold">{formatCurrency(cashPhysicalTotal)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <span className="text-xs text-muted-foreground block">Cheques (CHQ)</span>
              <p className="text-lg font-bold">{formatCurrency(verifiedChequeTotal)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <span className="text-xs text-muted-foreground block">Credit Card (CRD)</span>
              <p className="text-lg font-bold">{formatCurrency(creditCardTotal)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <span className="text-xs text-muted-foreground block">Debit Card (DRD)</span>
              <p className="text-lg font-bold">{formatCurrency(debitCardTotal)}</p>
            </CardContent>
          </Card>
          <Card className="border-primary">
            <CardContent className="p-3 text-center">
              <span className="text-xs text-muted-foreground block">Physical Count</span>
              <p className="text-lg font-bold text-primary">{formatCurrency(physicalCountInMain)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Currency Tabs for cash denominations */}
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
                        <p className="text-center text-muted-foreground py-6">No denominations configured for {currency.currency_code}.</p>
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
                                    <Input type="number" min="0" value={count || ''} onChange={e => setCount(currency.id, d.id, e.target.value)} placeholder="Count" className="flex-1" />
                                    <Badge variant="secondary" className="text-[10px] px-1">{currency.symbol} {amount.toFixed(2)}</Badge>
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
              No currencies configured for cashier use.
            </CardContent>
          </Card>
        )}

        {/* Cheque Verification Section — auto-populated from payment flows */}
        <ChequeVerificationList
          batchNumber={batchSel.selectedBatch?.batch_number || null}
          onTotalChange={handleChequeVerifiedTotalChange}
        />

        {/* Card Machine Transactions Section */}
        <CardTransactionEntry
          batchNumber={batchSel.selectedBatch?.batch_number || null}
          transactions={cardTransactions}
          onChange={setCardTransactions}
          loading={loadingCards}
        />
      </div>
    </BatchSelectionGuard>
  );
};

export default CashDetails;
