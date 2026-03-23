import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Calculator, DollarSign, Save, Loader2, TrendingUp, Plus, Trash2, CreditCard, Landmark, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useEnabledCashierCurrencies, useCashierDenominations, DenominationConfig } from '@/hooks/useCashierCurrencyConfig';
import { BatchSelectionGuard, BatchInfoBar } from '@/components/payments/BatchSelectionGuard';
import { useBatchSelection } from '@/hooks/useBatchSelection';
import { formatCurrency } from '@/utils/formatCurrency';
import { useUserCode } from '@/hooks/useUserCode';
import { useQuery } from '@tanstack/react-query';
import { ChequeEntryModal, ChequeEntry } from '@/components/payments/ChequeEntryModal';
import { formatDateForDisplay } from '@/lib/format-config';

const CashDetails: React.FC = () => {
  const { toast } = useToast();
  const batchSel = useBatchSelection();
  const { userCode } = useUserCode();
  const [systemTotal, setSystemTotal] = useState<number>(0);
  const [systemTotalLoading, setSystemTotalLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingCounts, setLoadingCounts] = useState(false);

  // Cheque entries
  const [cheques, setCheques] = useState<ChequeEntry[]>([]);
  const [loadingCheques, setLoadingCheques] = useState(false);
  const [chequeModalOpen, setChequeModalOpen] = useState(false);
  const [editingChequeIndex, setEditingChequeIndex] = useState<number | null>(null);
  const addChequeButtonRef = useRef<HTMLButtonElement>(null);

  // Card totals
  const [creditCardTotal, setCreditCardTotal] = useState<number>(0);
  const [debitCardTotal, setDebitCardTotal] = useState<number>(0);
  const [loadingCards, setLoadingCards] = useState(false);

  // Bank codes lookup
  const { data: banks = [] } = useQuery({
    queryKey: ['tb_bank_code'],
    queryFn: async () => {
      const { data } = await supabase.from('tb_bank_code').select('bank_code, name').order('name');
      return data || [];
    },
  });

  // Fetch system total from DB whenever batch changes
  const fetchSystemTotal = useCallback(async (batchNumber: string) => {
    setSystemTotalLoading(true);
    try {
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

  // Load cheques from DB
  useEffect(() => {
    const loadCheques = async () => {
      const batchNumber = batchSel.selectedBatch?.batch_number;
      if (!batchNumber) { setCheques([]); return; }
      setLoadingCheques(true);
      try {
        const { data, error } = await supabase
          .from('cn_batch_cheque')
          .select('*')
          .eq('batch_number', batchNumber)
          .order('created_at');
        if (error) throw error;
        setCheques((data || []).map((r: any) => ({
          id: r.id,
          cheque_number: r.cheque_number,
          bank_code: r.bank_code || '',
          amount: Number(r.amount),
          currency_code: r.currency_code || 'XCD',
          date_of_issue: r.date_of_issue ? new Date(r.date_of_issue) : undefined,
        })));
      } catch (err) {
        console.error('Failed to load cheques:', err);
      } finally {
        setLoadingCheques(false);
      }
    };
    loadCheques();
  }, [batchSel.selectedBatch?.batch_number]);

  // Load card totals from DB
  useEffect(() => {
    const loadCards = async () => {
      const batchNumber = batchSel.selectedBatch?.batch_number;
      if (!batchNumber) { setCreditCardTotal(0); setDebitCardTotal(0); return; }
      setLoadingCards(true);
      try {
        const { data, error } = await supabase
          .from('cn_batch_card_total')
          .select('mop_code, amount')
          .eq('batch_number', batchNumber);
        if (error) throw error;
        (data || []).forEach((r: any) => {
          if (r.mop_code === 'CRD') setCreditCardTotal(Number(r.amount));
          if (r.mop_code === 'DRD') setDebitCardTotal(Number(r.amount));
        });
      } catch (err) {
        console.error('Failed to load card totals:', err);
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

  // Convert cheque amounts to base currency
  const getBaseAmount = useCallback((chq: ChequeEntry): number => {
    if (!enabledCurrencies) return chq.amount;
    const curr = enabledCurrencies.find(c => c.currency_code === chq.currency_code);
    if (!curr || curr.is_main_currency) return chq.amount;
    return chq.amount * curr.exchange_rate;
  }, [enabledCurrencies]);

  const chequesTotal = useMemo(
    () => cheques.reduce((sum, c) => sum + getBaseAmount(c), 0),
    [cheques, getBaseAmount]
  );

  const physicalCountInMain = cashPhysicalTotal + chequesTotal + creditCardTotal + debitCardTotal;

  const getDenominationLabel = (d: DenominationConfig) => {
    return d.label || (d.denomination_value >= 1 ? `$${d.denomination_value}` : `${(d.denomination_value * 100).toFixed(0)}¢`);
  };

  // Cheque modal handlers
  const openAddCheque = () => {
    setEditingChequeIndex(null);
    setChequeModalOpen(true);
  };

  const openEditCheque = (index: number) => {
    setEditingChequeIndex(index);
    setChequeModalOpen(true);
  };

  const handleChequeModalClose = () => {
    setChequeModalOpen(false);
    setEditingChequeIndex(null);
    // Restore focus to Add Cheque button
    setTimeout(() => addChequeButtonRef.current?.focus(), 50);
  };

  const handleChequeModalSave = (entry: ChequeEntry) => {
    if (editingChequeIndex !== null) {
      setCheques(prev => prev.map((c, i) => i === editingChequeIndex ? { ...entry, id: c.id } : c));
    } else {
      setCheques(prev => [...prev, entry]);
    }
    handleChequeModalClose();
  };

  const removeCheque = (index: number) => {
    setCheques(prev => prev.filter((_, i) => i !== index));
  };

  const getBankName = (bankCode: string): string => {
    const bank = banks.find((b: any) => b.bank_code === bankCode);
    return bank ? (bank as any).name : bankCode;
  };

  // Save all: cash counts + cheques + card totals
  const saveAll = async () => {
    const batchNumber = batchSel.selectedBatch?.batch_number;
    if (!batchNumber) return;

    setSaving(true);
    try {
      // 1. Save cash counts (existing logic)
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

      // 2. Save cheques: delete all for batch, then insert
      const { error: delChqErr } = await supabase
        .from('cn_batch_cheque')
        .delete()
        .eq('batch_number', batchNumber);
      if (delChqErr) throw delChqErr;

      const validCheques = cheques.filter(c => c.cheque_number.trim() && c.amount > 0);
      if (validCheques.length > 0) {
        const chequeRows = validCheques.map(c => ({
          batch_number: batchNumber,
          cheque_number: c.cheque_number.trim(),
          bank_code: c.bank_code || null,
          amount: c.amount,
          currency_code: c.currency_code || 'XCD',
          date_of_issue: c.date_of_issue ? c.date_of_issue.toISOString().slice(0, 10) : null,
          created_by: userCode || null,
        }));
        const { error: insChqErr } = await supabase
          .from('cn_batch_cheque')
          .insert(chequeRows);
        if (insChqErr) throw insChqErr;
      }

      // 3. Save card totals via upsert
      const cardRows = [
        { batch_number: batchNumber, mop_code: 'CRD', amount: creditCardTotal, updated_by: userCode || null, updated_at: new Date().toISOString() },
        { batch_number: batchNumber, mop_code: 'DRD', amount: debitCardTotal, updated_by: userCode || null, updated_at: new Date().toISOString() },
      ];
      const { error: cardErr } = await supabase
        .from('cn_batch_card_total')
        .upsert(cardRows, { onConflict: 'batch_number,mop_code' });
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
            <p className="text-muted-foreground text-sm">Enter physical cash, cheques, and card machine totals</p>
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {/* <Card>
            <CardContent className="p-3 text-center">
              <span className="text-xs text-muted-foreground block">System Total</span>
              {systemTotalLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (
                <p className="text-lg font-bold">{formatCurrency(systemTotal)}</p>
              )}
            </CardContent>
          </Card> */}
          <Card>
            <CardContent className="p-3 text-center">
              <span className="text-xs text-muted-foreground block">Cash (CSH)</span>
              <p className="text-lg font-bold">{formatCurrency(cashPhysicalTotal)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <span className="text-xs text-muted-foreground block">Cheques (CHQ)</span>
              <p className="text-lg font-bold">{formatCurrency(chequesTotal)}</p>
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

        {/* Variance */}
        {/* <Card>
          <CardContent className="py-2 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className={`h-4 w-4 ${(systemTotal - physicalCountInMain) >= 0 ? 'text-green-600' : 'text-destructive'}`} />
                <span className="text-sm font-medium">Variance</span>
              </div>
              <span className={`text-lg font-bold ${(systemTotal - physicalCountInMain) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                {(systemTotal - physicalCountInMain) >= 0 ? '+' : ''}{formatCurrency(systemTotal - physicalCountInMain)}
              </span>
            </div>
          </CardContent>
        </Card> */}

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
              No currencies configured for cashier use.
            </CardContent>
          </Card>
        )}

        {/* Cheque Entry Section — Read-only display with modal for add/edit */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Landmark className="h-4 w-4" />
                Cheque Entries (CHQ)
              </CardTitle>
              <Button ref={addChequeButtonRef} size="sm" variant="outline" onClick={openAddCheque}>
                <Plus className="h-4 w-4 mr-1" /> Add Cheque
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingCheques ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : cheques.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">No cheques entered. Click "Add Cheque" to add one.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cheque #</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Base Amount</TableHead>
                      <TableHead>Date of Issue</TableHead>
                      <TableHead className="w-20 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cheques.map((chq, idx) => {
                      const baseAmt = getBaseAmount(chq);
                      const isConverted = chq.currency_code !== (mainCurrency?.currency_code || 'XCD');
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-sm">{chq.cheque_number}</TableCell>
                          <TableCell className="text-sm">{chq.bank_code ? getBankName(chq.bank_code) : '—'}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {chq.currency_code} {chq.amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {isConverted ? (
                              <span className="text-muted-foreground">{mainCurrency?.currency_code || 'XCD'} {baseAmt.toFixed(2)}</span>
                            ) : (
                              <span>{mainCurrency?.currency_code || 'XCD'} {baseAmt.toFixed(2)}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {chq.date_of_issue ? formatDateForDisplay(chq.date_of_issue.toISOString()) : '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button size="icon" variant="ghost" onClick={() => openEditCheque(idx)} className="h-7 w-7">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => removeCheque(idx)} className="h-7 w-7">
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            {cheques.length > 0 && (
              <div className="mt-4 p-3 bg-muted rounded-lg flex justify-between items-center">
                <span className="font-semibold text-sm">Total Cheques ({mainCurrency?.currency_code || 'XCD'}):</span>
                <span className="text-lg font-bold">{formatCurrency(chequesTotal)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card Totals Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Card Machine Totals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCards ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="crdTotal">Credit Card Machine Total (CRD)</Label>
                  <Input
                    id="crdTotal"
                    type="number"
                    step="0.01"
                    min="0"
                    value={creditCardTotal || ''}
                    onChange={e => setCreditCardTotal(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="drdTotal">Debit Card Machine Total (DRD)</Label>
                  <Input
                    id="drdTotal"
                    type="number"
                    step="0.01"
                    min="0"
                    value={debitCardTotal || ''}
                    onChange={e => setDebitCardTotal(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cheque Entry Modal */}
        <ChequeEntryModal
          open={chequeModalOpen}
          onClose={handleChequeModalClose}
          onSave={handleChequeModalSave}
          initialData={editingChequeIndex !== null ? cheques[editingChequeIndex] : null}
          enabledCurrencies={enabledCurrencies || []}
        />
      </div>
    </BatchSelectionGuard>
  );
};

export default CashDetails;
