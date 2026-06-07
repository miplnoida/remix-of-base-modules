/**
 * React Query hooks over BN master tables used by intake & payment UIs.
 * Backed by bn_bank_master / bn_bank_branch / bn_payment_method / bn_workbasket.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  listBanks,
  listBranches,
  listPaymentMethods,
} from '@/services/bn/payment/bankMasterService';
import type { BnBankMaster, BnBankBranch, BnPaymentMethod } from '@/types/bnBankEft';

const db = supabase as any;

export interface BnWorkbasketRow {
  id: string;
  basket_code: string;
  basket_name: string;
  description: string | null;
  assigned_role: string;
  product_category: string | null;
  country_code: string | null;
  is_active: boolean;
}

export function useBanks(countryCode?: string | null) {
  return useQuery<BnBankMaster[]>({
    queryKey: ['bn', 'masters', 'banks', countryCode ?? null],
    queryFn: () => listBanks(countryCode ?? null),
    staleTime: 5 * 60_000,
  });
}

export function useBankBranches(bankCode?: string | null) {
  return useQuery<BnBankBranch[]>({
    queryKey: ['bn', 'masters', 'branches', bankCode ?? null],
    queryFn: () => listBranches(bankCode ?? null),
    enabled: !!bankCode,
    staleTime: 5 * 60_000,
  });
}

export function usePaymentMethods() {
  return useQuery<BnPaymentMethod[]>({
    queryKey: ['bn', 'masters', 'paymentMethods'],
    queryFn: () => listPaymentMethods(),
    staleTime: 5 * 60_000,
  });
}

export function useWorkbaskets(opts?: { productCategory?: string | null; countryCode?: string | null; activeOnly?: boolean }) {
  const { productCategory = null, countryCode = null, activeOnly = true } = opts ?? {};
  return useQuery<BnWorkbasketRow[]>({
    queryKey: ['bn', 'masters', 'workbaskets', productCategory, countryCode, activeOnly],
    queryFn: async () => {
      let q = db.from('bn_workbasket').select('*').order('basket_name');
      if (activeOnly) q = q.eq('is_active', true);
      if (productCategory) q = q.eq('product_category', productCategory);
      if (countryCode) q = q.eq('country_code', countryCode);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as BnWorkbasketRow[];
    },
    staleTime: 60_000,
  });
}
