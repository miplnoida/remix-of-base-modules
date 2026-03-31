import { usePaymentConfig } from '@/hooks/usePaymentModuleConfig';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isAfter, isBefore, parse, lastDayOfMonth, addDays, format, isWeekend } from 'date-fns';

interface BatchConfigValue {
  enabled: boolean;
  schedule_mode?: 'always' | 'date_range' | 'working_days_after_month';
  date_from?: string;
  date_to?: string;
  working_days_count?: number;
  until_month_year?: string | null;
}

function evaluateSchedule(config: BatchConfigValue | undefined, nonWorkingDays: number[], holidays: string[]): boolean {
  if (!config?.enabled) return false;

  const mode = config.schedule_mode || 'always';
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  if (mode === 'always') return true;

  if (mode === 'date_range') {
    if (!config.date_from) return true;
    const from = parse(config.date_from, 'yyyy-MM-dd', new Date());
    if (isBefore(today, from)) return false;
    if (config.date_to) {
      const to = parse(config.date_to, 'yyyy-MM-dd', new Date());
      if (isAfter(today, to)) return false;
    }
    return true;
  }

  if (mode === 'working_days_after_month') {
    // Check until_month_year limit
    if (config.until_month_year) {
      const limitDate = parse(config.until_month_year + '-01', 'yyyy-MM-dd', new Date());
      const limitEnd = lastDayOfMonth(limitDate);
      if (isAfter(today, limitEnd)) return false;
    }

    // Calculate: from last day of previous month, count N working days forward
    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDay = lastDayOfMonth(prevMonth);
    const workingDaysNeeded = config.working_days_count || 5;

    let workingDaysCounted = 0;
    let checkDate = addDays(lastDay, 1); // start from 1st of current month

    while (workingDaysCounted < workingDaysNeeded) {
      const dayOfWeek = checkDate.getDay(); // 0=Sun, 6=Sat
      const dateStr = format(checkDate, 'yyyy-MM-dd');

      const isNonWorking = nonWorkingDays.includes(dayOfWeek);
      const isHoliday = holidays.includes(dateStr);

      if (!isNonWorking && !isHoliday) {
        workingDaysCounted++;
      }
      if (workingDaysCounted < workingDaysNeeded) {
        checkDate = addDays(checkDate, 1);
      }
    }

    // If today is on or before the Nth working day, the config is active
    return !isAfter(today, checkDate);
  }

  return config.enabled;
}

export function useBatchBehaviorConfig() {
  const { data: batchConfig, isLoading: l1 } = usePaymentConfig('allow_new_batch_with_previous_open');
  const { data: paymentConfig, isLoading: l2 } = usePaymentConfig('allow_current_date_payment_in_old_batch');

  // Fetch non-working days from system_settings
  const { data: nwdConfig } = useQuery({
    queryKey: ['system-settings', 'non_working_days'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'non_working_days')
        .single();
      if (error) return null;
      return data?.setting_value;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch current month's public holidays
  const { data: publicHolidays } = useQuery({
    queryKey: ['public-holidays-current'],
    queryFn: async () => {
      const now = new Date();
      const year = now.getFullYear();
      const { data, error } = await supabase
        .from('public_holidays')
        .select('holiday_date')
        .eq('year', year)
        .eq('is_active', true);
      if (error) return [];
      return (data || []).map((h: any) => h.holiday_date);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Parse non-working days (array of day-of-week numbers: 0=Sun, 6=Sat)
  const nonWorkingDays: number[] = (() => {
    if (!nwdConfig) return [0, 6]; // default: weekends
    if (Array.isArray(nwdConfig)) return nwdConfig.map(Number);
    if (typeof nwdConfig === 'object' && nwdConfig.days) return nwdConfig.days.map(Number);
    return [0, 6];
  })();

  const holidays = publicHolidays || [];

  const batchVal = batchConfig?.config_value as BatchConfigValue | undefined;
  const paymentVal = paymentConfig?.config_value as BatchConfigValue | undefined;

  const allowNewBatchWithPreviousOpen = evaluateSchedule(batchVal, nonWorkingDays, holidays);
  const allowCurrentDatePaymentInOldBatch = evaluateSchedule(paymentVal, nonWorkingDays, holidays);

  return {
    allowNewBatchWithPreviousOpen,
    allowCurrentDatePaymentInOldBatch,
    isLoading: l1 || l2,
  };
}

export function useDefaultOpeningBalance(officeCode?: string) {
  const { data: config, isLoading: globalLoading } = usePaymentConfig('default_opening_balance');

  const { data: officeBalance, isLoading: officeLoading } = useQuery({
    queryKey: ['cn-office-opening-balance', officeCode],
    enabled: !!officeCode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cn_office_opening_balance')
        .select('head_cashier_balance, cashier_balance')
        .eq('office_code', officeCode!)
        .single();
      if (error) return null;
      return data;
    },
  });

  // Per-office takes priority over global
  const headCashierBalance = officeBalance?.head_cashier_balance ?? config?.config_value?.head_cashier ?? 0;
  const cashierBalance = officeBalance?.cashier_balance ?? config?.config_value?.cashier ?? 0;

  return {
    headCashierBalance,
    cashierBalance,
    isLoading: globalLoading || (!!officeCode && officeLoading),
    isOfficeSpecific: !!officeBalance,
  };
}
