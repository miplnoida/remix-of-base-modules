import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface PaymentHeaderData {
  payment_id: number;
  batch_number: string;
  payer_type: string;
  payer_id: string;
  date_received: string | null;
  remarks: string | null;
  created_at: string | null;
}

export interface PaymentDetailData {
  payment_id: number;
  payment_sequence_no: number;
  payment_code: string;
  fund_code: string;
  payment_amount: number | null;
  mop_code: string;
  period: string | null;
  bank_code: string | null;
  bank_lodgement_code: string | null;
  credit_card_code: string | null;
  expiration_date: string | null;
  cheque_date: string | null;
  mop_number: string | null;
  mop_account_number: string | null;
  mop_transit_number: string | null;
  mop_notes1: string | null;
  payment_date: string | null;
}

export interface PayerInfo {
  id: string;
  name: string;
  status: string | null;
}

export function usePaymentEntry() {
  const [currentHeader, setCurrentHeader] = useState<PaymentHeaderData | null>(null);
  const [detailRows, setDetailRows] = useState<PaymentDetailData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getNextPaymentId = useCallback(async (): Promise<number> => {
    const { data: maxData, error } = await supabase
      .from('cn_payment_header')
      .select('payment_id')
      .order('payment_id', { ascending: false })
      .limit(1);

    if (error) throw error;

    return maxData && maxData.length > 0 ? Number(maxData[0].payment_id) + 1 : 1;
  }, []);

  const lookupPayer = useCallback(async (
    payerType: string,
    payerId: string
  ): Promise<PayerInfo | null> => {
    try {
      if (payerType === 'ER') {
        // Employer: lookup by regno in er_master
        const { data, error } = await supabase
          .from('er_master')
          .select('regno, name, status')
          .eq('regno', payerId)
          .single();
        if (error || !data) return null;
        return { id: data.regno, name: data.name, status: data.status };
      } else if (payerType === 'SE') {
        // Self-Employed: lookup by ssn in ip_self_employ, then get name from ip_master
        const { data: seData, error: seError } = await supabase
          .from('ip_self_employ')
          .select('ssn, status')
          .eq('ssn', payerId)
          .limit(1)
          .maybeSingle();
        if (seError || !seData) return null;
        // Get name from ip_master
        const { data: ipData } = await supabase
          .from('ip_master')
          .select('ssn, firstname, surname')
          .eq('ssn', seData.ssn)
          .single();
        return {
          id: seData.ssn || payerId,
          name: ipData ? `${ipData.firstname} ${ipData.surname}` : payerId,
          status: seData.status,
        };
      } else {
        // IP, VC: lookup by ssn in ip_master
        const { data, error } = await supabase
          .from('ip_master')
          .select('ssn, firstname, surname, status')
          .eq('ssn', payerId)
          .single();
        if (error || !data) return null;
        return {
          id: data.ssn || payerId,
          name: `${data.firstname} ${data.surname}`,
          status: data.status,
        };
      }
    } catch {
      return null;
    }
  }, []);

  const searchPayers = useCallback(async (
    payerType: string,
    searchTerm: string
  ): Promise<PayerInfo[]> => {
    try {
      if (payerType === 'ER') {
        const { data } = await supabase
          .from('er_master')
          .select('regno, name, status')
          .or(`regno.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
          .limit(20);
        return (data || []).map(d => ({ id: d.regno, name: d.name, status: d.status }));
      } else if (payerType === 'SE') {
        // Self-Employed: search in ip_self_employ joined with ip_master for name
        const { data } = await supabase
          .from('ip_self_employ')
          .select('ssn, status')
          .ilike('ssn', `%${searchTerm}%`)
          .limit(20);
        if (!data || data.length === 0) return [];
        const ssns = data.map(d => d.ssn).filter(Boolean) as string[];
        const { data: ipData } = await supabase
          .from('ip_master')
          .select('ssn, firstname, surname')
          .in('ssn', ssns);
        const ipMap = new Map((ipData || []).map(d => [d.ssn, d]));
        return data.map(d => ({
          id: d.ssn || '',
          name: ipMap.has(d.ssn!) ? `${ipMap.get(d.ssn!)!.firstname} ${ipMap.get(d.ssn!)!.surname}` : d.ssn || '',
          status: d.status,
        }));
      } else {
        const { data } = await supabase
          .from('ip_master')
          .select('ssn, firstname, surname, status')
          .or(`ssn.ilike.%${searchTerm}%,firstname.ilike.%${searchTerm}%,surname.ilike.%${searchTerm}%`)
          .limit(20);
        return (data || []).map(d => ({
          id: d.ssn || '',
          name: `${d.firstname} ${d.surname}`,
          status: d.status,
        }));
      }
    } catch {
      return [];
    }
  }, []);

  const createPaymentHeader = useCallback(async (
    batchNumber: string,
    payerType: string,
    payerId: string,
    dateReceived: string,
    remarks: string
  ): Promise<PaymentHeaderData | null> => {
    setIsLoading(true);
    try {
      // Use atomic RPC to generate payment_id and insert header in one call
      const { data: paymentId, error: rpcErr } = await supabase.rpc('create_payment_header_with_next_id', {
        p_batch_number: batchNumber,
        p_payer_type: payerType,
        p_payer_id: payerId,
        p_date_received: dateReceived,
        p_remarks: remarks || null,
      });
      if (rpcErr) throw rpcErr;
      if (!paymentId) throw new Error('Failed to generate payment header ID.');

      // Fetch the created header to populate state
      const { data, error } = await supabase
        .from('cn_payment_header')
        .select('*')
        .eq('payment_id', paymentId)
        .single();
      if (error) throw error;
      setCurrentHeader(data);
      setDetailRows([]);
      return data;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addDetailRow = useCallback(async (
    paymentId: number,
    detail: Omit<PaymentDetailData, 'payment_id' | 'payment_sequence_no'>
  ): Promise<PaymentDetailData | null> => {
    setIsLoading(true);
    try {
      const row: any = {
        payment_id: paymentId,
        ...detail,
      };
      const { data, error } = await supabase
        .from('cn_payment')
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      setDetailRows(prev => [...prev, data]);
      return data;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteDetailRow = useCallback(async (
    paymentId: number,
    sequenceNo: number
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('cn_payment')
        .delete()
        .eq('payment_id', paymentId)
        .eq('payment_sequence_no', sequenceNo);
      if (error) throw error;
      setDetailRows(prev => prev.filter(r => r.payment_sequence_no !== sequenceNo));
      return true;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPaymentDetails = useCallback(async (paymentId: number) => {
    const { data } = await supabase
      .from('cn_payment')
      .select('*')
      .eq('payment_id', paymentId)
      .order('payment_sequence_no');
    setDetailRows(data || []);
  }, []);

  const loadPaymentsByBatch = useCallback(async (batchNumber: string): Promise<PaymentHeaderData[]> => {
    const { data } = await supabase
      .from('cn_payment_header')
      .select('*')
      .eq('batch_number', batchNumber)
      .order('payment_id');
    return data || [];
  }, []);

  const totalPaymentAmount = detailRows.reduce((sum, r) => sum + (r.payment_amount || 0), 0);

  return {
    currentHeader,
    setCurrentHeader,
    detailRows,
    setDetailRows,
    isLoading,
    lookupPayer,
    searchPayers,
    createPaymentHeader,
    addDetailRow,
    deleteDetailRow,
    loadPaymentDetails,
    loadPaymentsByBatch,
    totalPaymentAmount,
    getNextPaymentId,
  };
}
