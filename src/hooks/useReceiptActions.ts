import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { logApplicationError } from '@/lib/globalErrorHandler';

export interface ReceiptData {
  receipt_id: string;
  payment_id: number;
  status: string | null;
  receipt_total: number | null;
  total_number_of_payments: number | null;
  reprint_times: number | null;
  cancel_date: string | null;
  cancel_reason: string | null;
  cancel_user: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_by: string | null;
  updated_at: string | null;
}

export function useReceiptActions() {
  const [currentReceipt, setCurrentReceipt] = useState<ReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateReceiptId = (): string => {
    const now = new Date();
    return `RCP-${format(now, 'yyyyMMdd-HHmmss')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  };

  const printReceipt = useCallback(async (
    paymentId: number,
    receiptTotal: number,
    totalPayments: number,
    createdBy: string
  ): Promise<ReceiptData | null> => {
    setIsLoading(true);
    try {
      // Check if receipt already exists
      const { data: existing } = await supabase
        .from('cn_receipt')
        .select('*')
        .eq('payment_id', paymentId)
        .maybeSingle();

      if (existing) {
        toast({ title: 'Receipt Exists', description: 'Use Reprint for existing receipts.', variant: 'destructive' });
        setCurrentReceipt(existing);
        return existing;
      }

      const receiptId = generateReceiptId();
      const row: any = {
        receipt_id: receiptId,
        payment_id: paymentId,
        status: 'P',
        receipt_total: receiptTotal,
        total_number_of_payments: totalPayments,
        reprint_times: 0,
        created_by: createdBy,
        updated_by: createdBy,
      };

      const { data, error } = await supabase
        .from('cn_receipt')
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      setCurrentReceipt(data);
      toast({ title: 'Receipt Printed', description: `Receipt ${receiptId} generated.` });
      return data;
    } catch (err: any) {
      await logApplicationError(err, { module: 'useReceiptActions', action: 'printReceipt', entity_type: 'cn_receipt', request_payload: { paymentId, receiptTotal, totalPayments } });
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reprintReceipt = useCallback(async (
    paymentId: number,
    updatedBy: string
  ): Promise<ReceiptData | null> => {
    setIsLoading(true);
    try {
      const { data: existing } = await supabase
        .from('cn_receipt')
        .select('*')
        .eq('payment_id', paymentId)
        .single();
      if (!existing) throw new Error('No receipt found for this payment.');
      if (existing.status === 'C') throw new Error('Cannot reprint a cancelled receipt.');

      const { data, error } = await supabase
        .from('cn_receipt')
        .update({
          status: 'R',
          reprint_times: (existing.reprint_times || 0) + 1,
          updated_by: updatedBy,
          updated_at: new Date().toISOString(),
        })
        .eq('receipt_id', existing.receipt_id)
        .select()
        .single();
      if (error) throw error;
      setCurrentReceipt(data);
      toast({ title: 'Receipt Reprinted', description: `Reprint #${data.reprint_times}` });
      return data;
    } catch (err: any) {
      await logApplicationError(err, { module: 'useReceiptActions', action: 'reprintReceipt', entity_type: 'cn_receipt', request_payload: { paymentId } });
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancelReceipt = useCallback(async (
    paymentId: number,
    reason: string,
    cancelUser: string
  ): Promise<ReceiptData | null> => {
    setIsLoading(true);
    try {
      const { data: existing } = await supabase
        .from('cn_receipt')
        .select('*')
        .eq('payment_id', paymentId)
        .single();
      if (!existing) throw new Error('No receipt found for this payment.');
      if (existing.status === 'C') throw new Error('Receipt already cancelled.');

      const { data, error } = await supabase
        .from('cn_receipt')
        .update({
          status: 'C',
          cancel_date: new Date().toISOString(),
          cancel_reason: reason,
          cancel_user: cancelUser,
          updated_by: cancelUser,
          updated_at: new Date().toISOString(),
        })
        .eq('receipt_id', existing.receipt_id)
        .select()
        .single();
      if (error) throw error;
      setCurrentReceipt(data);
      toast({ title: 'Receipt Cancelled', description: 'Receipt has been cancelled.' });
      return data;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadReceipt = useCallback(async (paymentId: number) => {
    const { data } = await supabase
      .from('cn_receipt')
      .select('*')
      .eq('payment_id', paymentId)
      .maybeSingle();
    setCurrentReceipt(data || null);
    return data;
  }, []);

  return {
    currentReceipt,
    setCurrentReceipt,
    isLoading,
    printReceipt,
    reprintReceipt,
    cancelReceipt,
    loadReceipt,
  };
}
