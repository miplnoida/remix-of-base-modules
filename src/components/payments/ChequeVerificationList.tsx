import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Landmark, Pencil, CheckCircle2, AlertTriangle, CheckCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserCode } from '@/hooks/useUserCode';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateForDisplay } from '@/lib/format-config';
import { ChequeEditModal } from './ChequeEditModal';

export interface VerificationCheque {
  cheque_number: string | null;
  bank_code: string | null;
  bank_name: string | null;
  amount: number;
  currency_code: string;
  cheque_date: string | null;
  payer_id: string | null;
  payer_type: string | null;
  source_table: string;
  source_record_id: string;
  payment_id: number;
  is_verified: boolean;
  override_cheque_number: string | null;
  override_bank_code: string | null;
  override_amount: number | null;
  override_cheque_date: string | null;
  edit_reason: string | null;
  verification_id: string | null;
}

interface ChequeVerificationListProps {
  batchNumber: string | null;
  onTotalChange?: (verifiedTotal: number) => void;
}

const SOURCE_LABELS: Record<string, string> = {
  cn_payment: 'Payment Entry',
  c3_payment_methods: 'C3 Payment',
};

export function ChequeVerificationList({ batchNumber, onTotalChange }: ChequeVerificationListProps) {
  const { userCode } = useUserCode();
  const { toast } = useToast();
  const [cheques, setCheques] = useState<VerificationCheque[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [editingCheque, setEditingCheque] = useState<VerificationCheque | null>(null);

  const fetchCheques = useCallback(async () => {
    if (!batchNumber) { setCheques([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_batch_cheques_for_verification' as any, {
        p_batch_number: batchNumber,
      });
      if (error) throw error;
      setCheques((data || []) as unknown as VerificationCheque[]);
    } catch (err: any) {
      console.error('Failed to fetch cheques for verification:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [batchNumber, toast]);

  useEffect(() => { fetchCheques(); }, [fetchCheques]);

  // Notify parent of verified total changes
  useEffect(() => {
    const total = cheques
      .filter(c => c.is_verified)
      .reduce((sum, c) => sum + (c.override_amount ?? c.amount), 0);
    onTotalChange?.(total);
  }, [cheques, onTotalChange]);

  const handleVerify = async (cheque: VerificationCheque, checked: boolean) => {
    if (!batchNumber || !userCode) return;
    const key = `${cheque.source_table}-${cheque.source_record_id}`;
    setVerifying(key);
    try {
      const { error } = await supabase.rpc('verify_batch_cheque' as any, {
        p_batch_number: batchNumber,
        p_source_table: cheque.source_table,
        p_source_record_id: cheque.source_record_id,
        p_source_payment_id: cheque.payment_id,
        p_is_verified: checked,
        p_user_code: userCode,
      });
      if (error) throw error;
      setCheques(prev => prev.map(c =>
        c.source_table === cheque.source_table && c.source_record_id === cheque.source_record_id
          ? { ...c, is_verified: checked }
          : c
      ));
    } catch (err: any) {
      toast({ title: 'Verification Failed', description: err.message, variant: 'destructive' });
    } finally {
      setVerifying(null);
    }
  };

  const handleBulkVerify = async () => {
    if (!batchNumber || !userCode) return;
    const unverified = cheques.filter(c => !c.is_verified);
    if (unverified.length === 0) return;
    setVerifying('bulk');
    try {
      for (const cheque of unverified) {
        const { error } = await supabase.rpc('verify_batch_cheque' as any, {
          p_batch_number: batchNumber,
          p_source_table: cheque.source_table,
          p_source_record_id: cheque.source_record_id,
          p_source_payment_id: cheque.payment_id,
          p_is_verified: true,
          p_user_code: userCode,
        });
        if (error) throw error;
      }
      setCheques(prev => prev.map(c => ({ ...c, is_verified: true })));
      toast({ title: 'All Verified', description: `${unverified.length} cheque(s) marked as verified.` });
    } catch (err: any) {
      toast({ title: 'Bulk Verification Failed', description: err.message, variant: 'destructive' });
      fetchCheques(); // Refresh to get actual state
    } finally {
      setVerifying(null);
    }
  };

  const handleEditSave = () => {
    setEditingCheque(null);
    fetchCheques();
  };

  const getDisplayValue = (cheque: VerificationCheque, field: 'cheque_number' | 'bank_code' | 'bank_name' | 'amount' | 'cheque_date') => {
    if (field === 'cheque_number') return cheque.override_cheque_number || cheque.cheque_number || '—';
    if (field === 'bank_name') {
      if (cheque.override_bank_code) return cheque.override_bank_code;
      return cheque.bank_name || cheque.bank_code || '—';
    }
    if (field === 'amount') return cheque.override_amount ?? cheque.amount;
    if (field === 'cheque_date') return cheque.override_cheque_date || cheque.cheque_date;
    return null;
  };

  const verifiedCount = cheques.filter(c => c.is_verified).length;
  const unverifiedCount = cheques.length - verifiedCount;
  const verifiedTotal = cheques.filter(c => c.is_verified).reduce((s, c) => s + (c.override_amount ?? c.amount), 0);
  const allVerified = cheques.length > 0 && unverifiedCount === 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Landmark className="h-4 w-4" />
              Cheque Verification (CHQ)
              {cheques.length > 0 && (
                <Badge variant={allVerified ? 'default' : 'secondary'} className="ml-2">
                  {verifiedCount}/{cheques.length} verified
                </Badge>
              )}
            </CardTitle>
            {unverifiedCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkVerify}
                disabled={verifying === 'bulk'}
              >
                {verifying === 'bulk' ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4 mr-1" />
                )}
                Verify All ({unverifiedCount})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : cheques.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">
              No cheques found for this batch. Cheques are created through Payment Entry, C3 Payments, or Invoice Payments.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">Verify</TableHead>
                    <TableHead>Cheque #</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Payer</TableHead>
                    <TableHead className="w-16 text-center">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cheques.map((chq) => {
                    const key = `${chq.source_table}-${chq.source_record_id}`;
                    const isEdited = !!(chq.override_cheque_number || chq.override_bank_code || chq.override_amount || chq.override_cheque_date);
                    const displayAmount = getDisplayValue(chq, 'amount') as number;
                    const displayDate = getDisplayValue(chq, 'cheque_date') as string | null;

                    return (
                      <TableRow
                        key={key}
                        className={
                          chq.is_verified
                            ? 'border-l-4 border-l-green-500 bg-green-50/30 dark:bg-green-950/10'
                            : 'border-l-4 border-l-amber-400 bg-amber-50/20 dark:bg-amber-950/10'
                        }
                      >
                        <TableCell className="text-center">
                          {verifying === key ? (
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          ) : (
                            <Checkbox
                              checked={chq.is_verified}
                              onCheckedChange={(checked) => handleVerify(chq, !!checked)}
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          <div className="flex items-center gap-1">
                            {getDisplayValue(chq, 'cheque_number')}
                            {isEdited && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0">edited</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{getDisplayValue(chq, 'bank_name')}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {chq.currency_code} {displayAmount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {displayDate ? formatDateForDisplay(displayDate) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {SOURCE_LABELS[chq.source_table] || chq.source_table}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-mono">{chq.payer_id || '—'}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setEditingCheque(chq)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {cheques.length > 0 && (
            <div className="mt-4 p-3 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Verified Total:
                </span>
                <span className="text-lg font-bold">{formatCurrency(verifiedTotal)}</span>
              </div>
              {unverifiedCount > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    {unverifiedCount} cheque(s) pending verification
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ChequeEditModal
        open={!!editingCheque}
        onClose={() => setEditingCheque(null)}
        onSave={handleEditSave}
        cheque={editingCheque}
        batchNumber={batchNumber}
      />
    </>
  );
}
