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

export function usePaymentBatch() {
  const [currentBatch, setCurrentBatch] = useState<BatchData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateBatchNumber = (officeCode: string): string => {
    const now = new Date();
    const dateStr = format(now, 'yyyyMMdd');
    const timeStr = format(now, 'HHmmss');
    return `${officeCode}-${dateStr}-${timeStr}`;
  };

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
      const batchNumber = generateBatchNumber(officeCode);
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
  }, [getBalanceForward]);

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
