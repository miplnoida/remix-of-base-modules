import { usePaymentConfig } from '@/hooks/usePaymentModuleConfig';

export function useBatchBehaviorConfig() {
  const { data: batchConfig, isLoading: l1 } = usePaymentConfig('allow_new_batch_with_previous_open');
  const { data: paymentConfig, isLoading: l2 } = usePaymentConfig('allow_current_date_payment_in_old_batch');

  const allowNewBatchWithPreviousOpen = batchConfig?.config_value?.enabled === true;
  const allowCurrentDatePaymentInOldBatch = paymentConfig?.config_value?.enabled === true;

  return {
    allowNewBatchWithPreviousOpen,
    allowCurrentDatePaymentInOldBatch,
    isLoading: l1 || l2,
  };
}

export function useDefaultOpeningBalance() {
  const { data: config, isLoading } = usePaymentConfig('default_opening_balance');

  const headCashierBalance = config?.config_value?.head_cashier ?? 0;
  const cashierBalance = config?.config_value?.cashier ?? 0;

  return { headCashierBalance, cashierBalance, isLoading };
}
