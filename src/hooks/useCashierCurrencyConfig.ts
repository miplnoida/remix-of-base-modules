import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CurrencyMaster {
  id: string;
  currency_code: string;
  currency_name: string;
  symbol: string | null;
  is_active: boolean;
  is_main_currency: boolean;
  exchange_rate: number;
  sort_order: number;
}

export interface EnabledCurrency extends CurrencyMaster {
  config_id: string;
}

export interface DenominationConfig {
  id: string;
  currency_id: string;
  denomination_value: number;
  denomination_type: string;
  label: string | null;
  sort_order: number;
  is_active: boolean;
}

// Fetch all currencies
export function useAllCurrencies() {
  return useQuery({
    queryKey: ['tb-currencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tb_currencies')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as CurrencyMaster[];
    },
  });
}

// Fetch enabled cashier currencies with their master data
export function useEnabledCashierCurrencies() {
  return useQuery({
    queryKey: ['cashier-currency-config-enabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cashier_currency_config')
        .select('id, currency_id, sort_order, is_enabled, currency:tb_currencies!cashier_currency_config_currency_id_fkey(*)')
        .eq('is_enabled', true)
        .order('sort_order');
      if (error) throw error;
      return (data || []).map((row: any) => ({
        config_id: row.id,
        ...row.currency,
      })) as EnabledCurrency[];
    },
  });
}

// Fetch denominations for enabled currencies
export function useCashierDenominations(currencyIds: string[]) {
  return useQuery({
    queryKey: ['cashier-denominations', currencyIds],
    enabled: currencyIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cashier_currency_denominations')
        .select('*')
        .in('currency_id', currencyIds)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as DenominationConfig[];
    },
  });
}

// Admin: fetch all cashier currency configs (including disabled)
export function useAllCashierCurrencyConfigs() {
  return useQuery({
    queryKey: ['cashier-currency-config-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cashier_currency_config')
        .select('id, currency_id, is_enabled, sort_order')
        .order('sort_order');
      if (error) throw error;
      return data as { id: string; currency_id: string; is_enabled: boolean; sort_order: number }[];
    },
  });
}

// Admin: fetch all denominations for a currency
export function useDenominationsForCurrency(currencyId: string | null) {
  return useQuery({
    queryKey: ['admin-denominations', currencyId],
    enabled: !!currencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cashier_currency_denominations')
        .select('*')
        .eq('currency_id', currencyId!)
        .order('sort_order');
      if (error) throw error;
      return data as DenominationConfig[];
    },
  });
}
