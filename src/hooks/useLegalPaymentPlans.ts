import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PaymentPlan {
  installments: Array<{
    amount: number;
    dueDate: string;
    paid: boolean;
    paidDate?: string;
    paidAmount?: number;
  }>;
  totalAmount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly';
  startDate: string;
  notes?: string;
}

export const useLegalPaymentPlans = (caseId: string) => {
  return useQuery({
    queryKey: ['legal-payment-plans', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('legal_settlements')
        .select('*')
        .eq('case_id', caseId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!caseId,
  });
};

export const useCreatePaymentPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ caseId, plan, terms }: { caseId: string; plan: PaymentPlan; terms: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('legal_settlements')
        .insert([{
          case_id: caseId,
          terms,
          payment_plan: plan as any,
          status: 'Proposed',
          created_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['legal-payment-plans', variables.caseId] });
      toast.success('Payment plan created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create payment plan: ' + error.message);
    },
  });
};

export const useUpdatePaymentPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, caseId, updates }: { id: string; caseId: string; updates: any }) => {
      const { data, error } = await supabase
        .from('legal_settlements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['legal-payment-plans', variables.caseId] });
      toast.success('Payment plan updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update payment plan: ' + error.message);
    },
  });
};
