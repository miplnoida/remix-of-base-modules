import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logApplicationError } from '@/lib/globalErrorHandler';

export interface InvoiceData {
  id: number;
  invoice_number: string;
  status: string;
  reprint_times: number;
  cancel_date: string | null;
  cancel_reason: string | null;
  cancel_user: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_by: string | null;
  updated_at: string | null;
  total_amount: number;
  total_amount_base: number;
  payer_name: string | null;
  payer_id: string;
  invoice_type: string;
  currency_code: string;
}

export function useInvoiceActions() {
  const [currentInvoice, setCurrentInvoice] = useState<InvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadInvoice = useCallback(async (invoiceId: number) => {
    const { data } = await supabase
      .from('cn_invoices')
      .select('*')
      .eq('id', invoiceId)
      .maybeSingle();
    setCurrentInvoice((data as unknown as InvoiceData) || null);
    return data as unknown as InvoiceData;
  }, []);

  const reprintInvoice = useCallback(async (
    invoiceId: number,
    updatedBy: string
  ): Promise<InvoiceData | null> => {
    setIsLoading(true);
    try {
      const { data: existing } = await supabase
        .from('cn_invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();
      if (!existing) throw new Error('No invoice found.');
      if (existing.status === 'C') throw new Error('Cannot reprint a cancelled invoice.');

      const { data, error } = await supabase
        .from('cn_invoices')
        .update({
          status: 'R',
          reprint_times: (existing.reprint_times || 0) + 1,
          updated_by: updatedBy,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', invoiceId)
        .select()
        .single();
      if (error) throw error;
      setCurrentInvoice(data as unknown as InvoiceData);
      toast({ title: 'Invoice Reprinted', description: `Reprint #${data.reprint_times}` });
      return data as unknown as InvoiceData;
    } catch (err: any) {
      await logApplicationError(err, { module: 'useInvoiceActions', action: 'reprintInvoice', entity_type: 'cn_invoices', request_payload: { invoiceId } });
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancelInvoice = useCallback(async (
    invoiceId: number,
    reason: string,
    cancelUser: string
  ): Promise<InvoiceData | null> => {
    setIsLoading(true);
    try {
      const { data: existing } = await supabase
        .from('cn_invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();
      if (!existing) throw new Error('No invoice found.');
      if (existing.status === 'C') throw new Error('Invoice already cancelled.');

      const { data, error } = await supabase
        .from('cn_invoices')
        .update({
          status: 'C',
          cancel_date: new Date().toISOString(),
          cancel_reason: reason,
          cancel_user: cancelUser,
          updated_by: cancelUser,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', invoiceId)
        .select()
        .single();
      if (error) throw error;
      setCurrentInvoice(data as unknown as InvoiceData);
      toast({ title: 'Invoice Cancelled', description: 'Invoice has been cancelled.' });
      return data as unknown as InvoiceData;
    } catch (err: any) {
      await logApplicationError(err, { module: 'useInvoiceActions', action: 'cancelInvoice', entity_type: 'cn_invoices', request_payload: { invoiceId, reason } });
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    currentInvoice,
    setCurrentInvoice,
    isLoading,
    loadInvoice,
    reprintInvoice,
    cancelInvoice,
  };
}
