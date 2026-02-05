import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Allowed payment codes for C3 Payments calculation
 * CON: Contribution
 * LVC/LVF: Levy (Calculated)
 * PEC/PEF: PE Contribution (Calculated)
 * SSE/SSF: Social Security (Employee)
 * SSC: Social Security (Calculated)
 * VOC/VOL: Voluntary (Calculated)
 */
const ALLOWED_PAYMENT_CODES = ['CON', 'LVC', 'LVF', 'PEC', 'PEF', 'SSE', 'SEF', 'SSC', 'SSF', 'VOC', 'VOL'];

interface UseC3PaymentsParams {
  payerId: string;
  payerType: string; // e.g., 'ER' for Employer
  periodYear: number | null;
  periodMonth: number | null; // 0-indexed (0 = January)
}

interface UseC3PaymentsResult {
  totalPayments: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to calculate total payments for a C3 period
 * 
 * This hook queries the database to sum all valid payment amounts for the selected
 * employer and C3 period. The logic follows:
 * 
 * - Joins cn_payment with cn_payment_header on payment_id
 * - Joins cn_receipt on payment_id where receipt status != 'C' (not cancelled)
 * - Filters by period month/year matching the C3 period
 * - Filters by payer_id matching the employer registration number
 * - Filters by payer_type matching the employer's payer type
 * - Restricts payment_code to allowed codes
 * - Treats NULL payment_amount as 0
 */
export function useC3Payments({
  payerId,
  payerType,
  periodYear,
  periodMonth
}: UseC3PaymentsParams): UseC3PaymentsResult {
  const [totalPayments, setTotalPayments] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    // Validate required parameters
    if (!payerId || !payerType || periodYear === null || periodMonth === null) {
      setTotalPayments(0);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build the period range for filtering
      // periodMonth is 0-indexed, so January = 0
      const periodStart = new Date(periodYear, periodMonth, 1);
      const periodEnd = new Date(periodYear, periodMonth + 1, 0, 23, 59, 59, 999);

      // First, get payment_ids from cn_payment_header that match payer_id and payer_type
      const { data: headers, error: headerError } = await supabase
        .from('cn_payment_header')
        .select('payment_id')
        .eq('payer_id', payerId)
        .eq('payer_type', payerType);

      if (headerError) {
        throw new Error(`Failed to fetch payment headers: ${headerError.message}`);
      }

      if (!headers || headers.length === 0) {
        setTotalPayments(0);
        setIsLoading(false);
        return;
      }

      const paymentIds = headers.map(h => h.payment_id);

      // Get receipts that are not cancelled (status != 'C')
      const { data: receipts, error: receiptError } = await supabase
        .from('cn_receipt')
        .select('payment_id')
        .in('payment_id', paymentIds)
        .neq('status', 'C');

      if (receiptError) {
        throw new Error(`Failed to fetch receipts: ${receiptError.message}`);
      }

      // If no valid receipts, return 0
      if (!receipts || receipts.length === 0) {
        setTotalPayments(0);
        setIsLoading(false);
        return;
      }

      const validPaymentIds = receipts.map(r => r.payment_id);

      // Get payments with allowed codes and matching period
      const { data: payments, error: paymentError } = await supabase
        .from('cn_payment')
        .select('payment_amount, period')
        .in('payment_id', validPaymentIds)
        .in('payment_code', ALLOWED_PAYMENT_CODES);

      if (paymentError) {
        throw new Error(`Failed to fetch payments: ${paymentError.message}`);
      }

      if (!payments || payments.length === 0) {
        setTotalPayments(0);
        setIsLoading(false);
        return;
      }

      // Filter payments by period matching the C3 period month/year
      const matchingPayments = payments.filter(payment => {
        if (!payment.period) return false;
        const paymentDate = new Date(payment.period);
        return (
          paymentDate >= periodStart &&
          paymentDate <= periodEnd
        );
      });

      // Sum payment amounts, treating NULL as 0
      const total = matchingPayments.reduce((sum, payment) => {
        const amount = payment.payment_amount ?? 0;
        return sum + Number(amount);
      }, 0);

      setTotalPayments(total);
    } catch (err) {
      console.error('Error fetching C3 payments:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching payments');
      setTotalPayments(0);
    } finally {
      setIsLoading(false);
    }
  }, [payerId, payerType, periodYear, periodMonth]);

  // Fetch payments when parameters change
  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return {
    totalPayments,
    isLoading,
    error,
    refetch: fetchPayments
  };
}

/**
 * Calculate the C3 Balance
 * 
 * Balance = (SS Contribution due for month + Total due to Accountant General) - Payments
 * 
 * Where:
 * - SS Contribution due for month = Employee SS + Employer SS + SS Fine
 * - Total due to Accountant General = Employee Levy + Employer Levy + Severance + Levy Penalty + Severance Penalty
 */
export function calculateC3Balance(
  ssContributionDue: number,
  totalDueToAG: number,
  payments: number
): number {
  return (ssContributionDue + totalDueToAG) - payments;
}
