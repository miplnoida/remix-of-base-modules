import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PaymentRecord {
  amount: number;
  date: string;
  method: string;
  reference?: string;
}

export interface DebtRecord {
  id: string;
  case_id: string;
  type: string;
  amount: number;
  status: 'Pending' | 'Partial' | 'Paid' | 'Overdue' | 'Waived';
  due_on: string;
  payments: PaymentRecord[];
  created_at: string;
  currency?: string;
  order_id?: string;
}

export const useLegalDebtTracking = (caseId: string) => {
  return useQuery({
    queryKey: ['legal-debt-tracking', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('legal_penalties')
        .select('*')
        .eq('case_id', caseId)
        .order('due_on', { ascending: false });

      if (error) throw error;
      
      // Calculate balances
      const debtsWithBalance = data?.map(debt => {
        const payments = (debt.payments as any) || [];
        const paymentArray = Array.isArray(payments) ? payments : [];
        const totalPaid = paymentArray.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
        const balance = Number(debt.amount) - totalPaid;
        return {
          id: debt.id,
          case_id: debt.case_id,
          type: debt.type,
          amount: Number(debt.amount),
          status: debt.status as DebtRecord['status'],
          due_on: debt.due_on,
          payments: paymentArray,
          created_at: debt.created_at || '',
          currency: debt.currency,
          order_id: debt.order_id || undefined,
          totalPaid,
          balance,
          isOverdue: new Date(debt.due_on) < new Date() && balance > 0
        };
      });

      return debtsWithBalance;
    },
    enabled: !!caseId,
  });
};

export const useRecordPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['Legal', 'legal_debt', 'mutation'],
    mutationFn: async ({ penaltyId, caseId, payment }: { 
      penaltyId: string; 
      caseId: string;
      payment: { amount: number; date: string; method: string; reference?: string } 
    }) => {
      // Get current penalty
      const { data: penalty, error: fetchError } = await supabase
        .from('legal_penalties')
        .select('*')
        .eq('id', penaltyId)
        .single();

      if (fetchError) throw fetchError;

      const currentPayments = (penalty.payments as any[] || []);
      const updatedPayments = [...currentPayments, payment];
      
      const totalPaid = updatedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const balance = Number(penalty.amount) - totalPaid;
      
      // Update status based on balance
      let newStatus: 'Pending' | 'Paid' | 'Overdue' | 'Waived' = penalty.status as any;
      if (balance <= 0) {
        newStatus = 'Paid';
      } else if (totalPaid > 0 && new Date(penalty.due_on) < new Date()) {
        newStatus = 'Overdue';
      } else if (totalPaid > 0) {
        newStatus = 'Pending';
      }

      const { data, error } = await supabase
        .from('legal_penalties')
        .update({
          payments: updatedPayments,
          status: newStatus
        })
        .eq('id', penaltyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['legal-debt-tracking', variables.caseId] });
      toast.success('Payment recorded successfully');
    },
    onError: (error) => {
      toast.error('Failed to record payment: ' + error.message);
    },
  });
};

export const useDebtSummary = (caseId: string) => {
  const { data: debts } = useLegalDebtTracking(caseId);
  
  const summary = {
    totalDebt: debts?.reduce((sum, d) => sum + Number(d.amount), 0) || 0,
    totalPaid: debts?.reduce((sum, d) => sum + d.totalPaid, 0) || 0,
    totalBalance: debts?.reduce((sum, d) => sum + d.balance, 0) || 0,
    overdueCount: debts?.filter(d => d.isOverdue).length || 0,
    overdueAmount: debts?.filter(d => d.isOverdue).reduce((sum, d) => sum + d.balance, 0) || 0,
  };

  return summary;
};
