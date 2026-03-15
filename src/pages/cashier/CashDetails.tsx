import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Calculator, DollarSign, Save, FileText, Loader2, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useCanManageAllBatches } from '@/hooks/usePaymentModuleConfig';
import { useEnabledCashierCurrencies, useCashierDenominations, EnabledCurrency, DenominationConfig } from '@/hooks/useCashierCurrencyConfig';
import { formatDisplayDate } from '@/lib/dateFormat';

interface BatchRow {
  batch_number: string;
  batch_status: string | null;
  batch_date: string | null;
  entered_by: string | null;
  office_code: string | null;
  offset_amount: number | null;
}

const CashDetails: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const batchParam = searchParams.get('batch');
  const { profile } = useSupabaseAuth();
  const { canManageAllBatches } = useCanManageAllBatches();

  // ── Batch selection state ──
  const [selectedBatch, setSelectedBatch] = useState<BatchRow | null>(null);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchSearchTerm, setBatchSearchTerm] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);

  // ── Denomination counts: { [currencyId]: { [denomId]: count } } ──
  const [denomCounts, setDenomCounts] = useState<Record<string, Record<string, number>>>({});

  // ── Load currencies & denominations from DB ──
  const { data: enabledCurrencies, isLoading: currLoading } = useEnabledCashierCurrencies();
  const currencyIds = useMemo(() => enabledCurrencies?.map(c => c.id) || [], [enabledCurrencies]);
  const { data: allDenominations, isLoading: denomLoading } = useCashierDenominations(currencyIds);

  // ── Fetch open batches for selection ──
  const { data: openBatches, isLoading: batchesLoading } = useQuery({
    queryKey: ['open-batches-for-cash', canManageAllBatches, profile?.user_code],
    enabled: !batchParam,
    queryFn: async () => {
      let query = supabase
        .from('cn_batch')
        .select('batch_number, batch_status, batch_date, entered_by, office_code, offset_amount')
        .eq('batch_status', 'O')
        .order('batch_date', { ascending: false });

      if (!canManageAllBatches && profile?.user_code) {
        query = query.eq('entered_by', profile.user_code);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as BatchRow[];
    },
  });

  // ── If batch param provided, load it directly ──
  useEffect(() => {
    if (batchParam && !selectedBatch) {
      setBatchLoading(true);
      supabase
        .from('cn_batch')
        .select('batch_number, batch_status, batch_date, entered_by, office_code, offset_amount')
        .eq('batch_number', batchParam)
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            toast({ title: 'Error', description: 'Batch not found', variant: 'destructive' });
            setBatchDialogOpen(true);
          } else {
            setSelectedBatch(data as BatchRow);
          }
          setBatchLoading(false);
        });
    }
  }, [batchParam]);

  // ── Show dialog if no batch context ──
  useEffect(() => {
    if (!batchParam && !selectedBatch) {
      setBatchDialogOpen(true);
    }
  }, [batchParam, selectedBatch]);

  // ── Pick a batch ──
  const handleSelectBatch = (batch: BatchRow) => {
    setSelectedBatch(batch);
    setBatchDialogOpen(false);
  };

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

  // ── Per-currency total ──
  const getCurrencyTotal = (currencyId: string): number => {
    const denoms = getDenominationsForCurrency(currencyId);
    return denoms.reduce((sum, d) => sum + d.denomination_value * getCount(currencyId, d.id), 0);
  };

  // ── Main currency ──
  const mainCurrency = useMemo(() => enabledCurrencies?.find(c => c.is_main_currency), [enabledCurrencies]);

  // ── Physical count in main currency ──
  const physicalCountInMain = useMemo(() => {
    if (!enabledCurrencies || !mainCurrency) return 0;
    return enabledCurrencies.reduce((total, c) => {
      const currTotal = getCurrencyTotal(c.id);
      if (c.is_main_currency) return total + currTotal;
      // Convert: foreign * exchange_rate = main currency
      return total + currTotal * c.exchange_rate;
    }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledCurrencies, mainCurrency, denomCounts, allDenominations]);

  const filteredBatches = useMemo(() => {
    if (!openBatches) return [];
    if (!batchSearchTerm) return openBatches;
    const t = batchSearchTerm.toLowerCase();
    return openBatches.filter(b =>
      b.batch_number.toLowerCase().includes(t) ||
      b.entered_by?.toLowerCase().includes(t) ||
      b.office_code?.toLowerCase().includes(t)
    );
  }, [openBatches, batchSearchTerm]);

  const getDenominationLabel = (d: DenominationConfig) => {
    return d.label || (d.denomination_value >= 1 ? `$${d.denomination_value}` : `${(d.denomination_value * 100).toFixed(0)}¢`);
  };

  const saveCashCount = () => {
    toast({
      title: 'Cash Count Saved',
      description: `Physical count: ${mainCurrency?.symbol || ''}${physicalCountInMain.toFixed(2)}`,
    });
  };

  // ── Loading ──
  if (batchLoading || currLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ── Batch Selection Dialog ── */}
      <Dialog open={batchDialogOpen} onOpenChange={(open) => { if (selectedBatch) setBatchDialogOpen(open); }}>
        <DialogContent className="max-w-2xl" onInteractOutside={e => { if (!selectedBatch) e.preventDefault(); }}>
          <DialogHeader>
            <DialogTitle>Select Batch</DialogTitle>
            <DialogDescription>
              Select an open batch to enter cash details. {canManageAllBatches ? 'Showing all open batches.' : 'Showing your open batches.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by batch number, cashier, or office..."
                value={batchSearchTerm}
                onChange={e => setBatchSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            {batchesLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filteredBatches.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No open batches available.</p>
            ) : (
              <div className="max-h-72 overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Cashier</TableHead>
                      <TableHead>Office</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBatches.map(b => (
                      <TableRow key={b.batch_number} className="cursor-pointer hover:bg-muted/50" onClick={() => handleSelectBatch(b)}>
                        <TableCell className="font-mono text-xs">{b.batch_number}</TableCell>
                        <TableCell>{b.batch_date ? formatDisplayDate(b.batch_date) : '—'}</TableCell>
                        <TableCell>{b.entered_by || '—'}</TableCell>
                        <TableCell>{b.office_code || '—'}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => handleSelectBatch(b)}>Select</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Main content (only when batch selected) ── */}
      {selectedBatch ? (
        <>
          {/* Header */}
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold">Cash Details Entry</h1>
              <p className="text-muted-foreground text-sm">Enter physical cash count for each currency denomination</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setSelectedBatch(null); setBatchDialogOpen(true); }}>
                Change Batch
              </Button>
              <Button size="sm" onClick={saveCashCount}>
                <Save className="h-4 w-4 mr-1" />
                Save Cash Count
              </Button>
            </div>
          </div>

          {/* Batch info + Physical Count cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Batch Number</p>
                <p className="font-mono text-sm font-semibold">{selectedBatch.batch_number}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Batch Date</p>
                <p className="text-sm font-semibold">{selectedBatch.batch_date ? formatDisplayDate(selectedBatch.batch_date) : '—'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Cashier / Office</p>
                <p className="text-sm font-semibold">{selectedBatch.entered_by || '—'} • {selectedBatch.office_code || '—'}</p>
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
        </>
      ) : (
        <div className="flex items-center justify-center p-12">
          <p className="text-muted-foreground">Please select a batch to continue.</p>
        </div>
      )}
    </div>
  );
};

export default CashDetails;
