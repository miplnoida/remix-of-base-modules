import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export interface BatchData {
  batch_number: string;
  batch_status: string | null;
  balance_status: string | null;
  entered_by: string | null;
  date_entered: string | null;
  verified_by: string | null;
  date_verified: string | null;
  posted_by: string | null;
  date_posted: string | null;
  offset_amount: number | null;
  balance_forward: number | null;
  office_code: string | null;
  batch_date: string | null;
}

/** Resolve batch number format from config, falling back to legacy */
function resolveBatchFormat(formatStr: string | null, officeCode: string): string {
  const now = new Date();
  if (!formatStr) {
    // Legacy fallback
    const dateStr = format(now, 'yyyyMMdd');
    const timeStr = format(now, 'HHmmss');
    return `${officeCode}-${dateStr}-${timeStr}`;
  }

  let result = formatStr;
  result = result.replace('{OFFICE_CODE}', officeCode);
  result = result.replace('{YYYY}', format(now, 'yyyy'));
  result = result.replace('{YY}', format(now, 'yy'));
  result = result.replace('{YYYYMMDD}', format(now, 'yyyyMMdd'));
  result = result.replace('{YYYYMM}', format(now, 'yyyyMM'));
  result = result.replace('{DDMMYYYY}', format(now, 'ddMMyyyy'));
  result = result.replace('{DDMMYYYYHHMM}', format(now, 'ddMMyyyyHHmm'));
  result = result.replace('{MM}', format(now, 'MM'));
  result = result.replace('{DD}', format(now, 'dd'));
  result = result.replace('{HHMMSS}', format(now, 'HHmmss'));
  result = result.replace('{HHMM}', format(now, 'HHmm'));
  result = result.replace('{HH}', format(now, 'HH'));
  result = result.replace('{MI}', format(now, 'mm'));
  result = result.replace('{SS}', format(now, 'ss'));
  return result;
}

export function usePaymentBatch() {
  const [currentBatch, setCurrentBatch] = useState<BatchData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateBatchNumber = useCallback(async (officeCode: string): Promise<string> => {
    try {
      const { data } = await supabase
        .from('payment_module_config')
        .select('config_value')
        .eq('config_key', 'batch_number_format')
        .maybeSingle();

      const formatStr = data?.config_value
        ? (typeof data.config_value === 'object' ? (data.config_value as any).format : null)
        : null;

      return resolveBatchFormat(formatStr, officeCode);
    } catch {
      // Fallback on error
      return resolveBatchFormat(null, officeCode);
    }
  }, []);

  const getBalanceForward = useCallback(async (): Promise<number> => {
    const { data } = await supabase
      .from('cn_batch')
      .select('balance_forward, offset_amount')
      .order('date_entered', { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      return (data[0].balance_forward || 0) + (data[0].offset_amount || 0);
    }
    return 0;
  }, []);

  const createBatch = useCallback(async (
    batchDate: string,
    officeCode: string,
    enteredBy: string,
    isHistorical: boolean = false
  ): Promise<BatchData | null> => {
    setIsLoading(true);
    try {
      const batchNumber = await generateBatchNumber(officeCode);
      const balanceForward = await getBalanceForward();
      const now = new Date().toISOString();

      const newBatch: any = {
        batch_number: batchNumber,
        batch_date: batchDate,
        batch_status: 'O',
        balance_status: isHistorical ? 'H' : 'N',
        balance_forward: balanceForward,
        offset_amount: 0,
        office_code: officeCode,
        entered_by: enteredBy,
        date_entered: now,
      };

      const { data, error } = await supabase
        .from('cn_batch')
        .insert(newBatch)
        .select()
        .single();

      if (error) throw error;
      setCurrentBatch(data);
      toast({ title: 'Batch Created', description: `Batch ${batchNumber} created successfully.` });
      return data;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [generateBatchNumber, getBalanceForward]);

  const loadBatch = useCallback(async (batchNumber: string): Promise<BatchData | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cn_batch')
        .select('*')
        .eq('batch_number', batchNumber)
        .single();
      if (error) throw error;
      setCurrentBatch(data);
      return data;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const isBatchOpen = currentBatch?.batch_status === 'O';

  return {
    currentBatch,
    setCurrentBatch,
    isLoading,
    createBatch,
    loadBatch,
    getBalanceForward,
    generateBatchNumber,
    isBatchOpen,
  };
}
