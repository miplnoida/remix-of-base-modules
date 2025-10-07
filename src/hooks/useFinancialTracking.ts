import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WagePeriod {
  period: number; // 1-6
  wages_paid: number;
  payment_code: string;
  contribution_type: 'SS_Insured' | 'SS_Employer' | 'Levy' | 'EI';
  date_paid?: string;
  reference?: string;
}

export interface PayerInfo {
  payer_id: string;
  payer_type: 'Employer' | 'Insured Person';
  payer_name: string;
  registry_ref?: string;
}

export interface DetailedDebt {
  id: string;
  case_id: string;
  payer_info: PayerInfo;
  wage_periods: WagePeriod[];
  base_debt: {
    ss_insured: number;
    ss_employer: number;
    levy: number;
    ei: number;
  };
  penalties: {
    amount: number;
    rate: number;
    calculated_date: string;
    overdue_days: number;
  };
  payments: Array<{
    amount: number;
    date: string;
    method: string;
    reference?: string;
    applied_to_period?: number;
  }>;
  total_debt: number;
  total_paid: number;
  outstanding_balance: number;
  due_date: string;
  status: 'Pending' | 'Partial' | 'Paid' | 'Overdue' | 'Waived';
  created_at: string;
}

export const useFinancialTracking = (caseId: string) => {
  return useQuery({
    queryKey: ['financial-tracking', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('legal_penalties')
        .select('*')
        .eq('case_id', caseId)
        .order('due_on', { ascending: false });

      if (error) throw error;

      // Transform data to include detailed financial tracking
      const detailedDebts: DetailedDebt[] = data?.map(debt => {
        const metadata = (debt as any).payments || {};
        const wagePeriods = metadata.wage_periods || [];
        const payerInfo = metadata.payer_info || {
          payer_id: '',
          payer_type: 'Employer',
          payer_name: 'Unknown'
        };
        const baseDebt = metadata.base_debt || {
          ss_insured: 0,
          ss_employer: 0,
          levy: 0,
          ei: 0
        };
        const penalties = metadata.penalties || {
          amount: 0,
          rate: 0,
          calculated_date: new Date().toISOString(),
          overdue_days: 0
        };

        const payments = Array.isArray(metadata) ? metadata : (metadata.payment_records || []);
        const totalPaid = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
        const totalDebt = Number(debt.amount);
        const balance = totalDebt - totalPaid;

        return {
          id: debt.id,
          case_id: debt.case_id,
          payer_info: payerInfo,
          wage_periods: wagePeriods,
          base_debt: baseDebt,
          penalties,
          payments,
          total_debt: totalDebt,
          total_paid: totalPaid,
          outstanding_balance: balance,
          due_date: debt.due_on,
          status: debt.status as any,
          created_at: debt.created_at || '',
        };
      }) || [];

      return detailedDebts;
    },
    enabled: !!caseId,
  });
};

export const useCreateDetailedDebt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      caseId, 
      payerInfo,
      wagePeriods,
      baseDebt,
      dueDate
    }: { 
      caseId: string; 
      payerInfo: PayerInfo;
      wagePeriods: WagePeriod[];
      baseDebt: DetailedDebt['base_debt'];
      dueDate: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate total debt
      const totalBaseDebt = Object.values(baseDebt).reduce((sum, val) => sum + val, 0);
      
      // Calculate penalties (5% per month for overdue)
      const daysDiff = Math.floor((new Date().getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
      const overdueDays = Math.max(0, daysDiff);
      const penaltyRate = 0.05; // 5% per month
      const penaltyAmount = overdueDays > 0 ? (totalBaseDebt * penaltyRate * (overdueDays / 30)) : 0;
      
      const totalDebt = totalBaseDebt + penaltyAmount;

      const metadata = {
        payer_info: payerInfo,
        wage_periods: wagePeriods,
        base_debt: baseDebt,
        penalties: {
          amount: penaltyAmount,
          rate: penaltyRate,
          calculated_date: new Date().toISOString(),
          overdue_days: overdueDays
        },
        payment_records: []
      };

      const { data, error } = await supabase
        .from('legal_penalties')
        .insert([{
          case_id: caseId,
          type: 'Contributions',
          amount: totalDebt,
          status: overdueDays > 0 ? 'Overdue' : 'Pending',
          due_on: dueDate,
          payments: metadata as any,
          currency: 'XCD'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['financial-tracking', variables.caseId] });
      toast.success('Debt record created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create debt record: ' + error.message);
    },
  });
};

export const useUpdateWagePeriod = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      debtId, 
      caseId,
      wagePeriod 
    }: { 
      debtId: string; 
      caseId: string;
      wagePeriod: WagePeriod;
    }) => {
      // Fetch current debt
      const { data: debt, error: fetchError } = await supabase
        .from('legal_penalties')
        .select('*')
        .eq('id', debtId)
        .single();

      if (fetchError) throw fetchError;

      const metadata = (debt.payments as any) || {};
      const wagePeriods = metadata.wage_periods || [];
      
      // Update or add wage period
      const existingIndex = wagePeriods.findIndex((wp: WagePeriod) => wp.period === wagePeriod.period);
      if (existingIndex >= 0) {
        wagePeriods[existingIndex] = wagePeriod;
      } else {
        wagePeriods.push(wagePeriod);
      }

      // Recalculate base debt
      const baseDebt = metadata.base_debt || { ss_insured: 0, ss_employer: 0, levy: 0, ei: 0 };
      const contributionTypeMap: Record<string, keyof typeof baseDebt> = {
        'SS_Insured': 'ss_insured',
        'SS_Employer': 'ss_employer',
        'Levy': 'levy',
        'EI': 'ei'
      };
      
      // Reset and recalculate from all wage periods
      Object.keys(baseDebt).forEach(key => {
        const typedKey = key as keyof typeof baseDebt;
        baseDebt[typedKey] = 0;
      });
      wagePeriods.forEach((wp: WagePeriod) => {
        const key = contributionTypeMap[wp.contribution_type];
        if (key) {
          baseDebt[key] += Number(wp.wages_paid);
        }
      });

      const totalBaseDebt: number = (Object.values(baseDebt) as number[]).reduce((sum: number, val: number) => sum + Number(val), 0);
      
      // Recalculate penalties
      const daysDiff = Math.floor((new Date().getTime() - new Date(debt.due_on).getTime()) / (1000 * 60 * 60 * 24));
      const overdueDays = Math.max(0, daysDiff);
      const penaltyRate = Number(metadata.penalties?.rate || 0.05);
      const penaltyAmount: number = overdueDays > 0 ? (totalBaseDebt * penaltyRate * (overdueDays / 30)) : 0;
      
      const totalDebt: number = totalBaseDebt + penaltyAmount;

      const updatedMetadata = {
        ...metadata,
        wage_periods: wagePeriods,
        base_debt: baseDebt,
        penalties: {
          ...metadata.penalties,
          amount: penaltyAmount,
          overdue_days: overdueDays,
          calculated_date: new Date().toISOString()
        }
      };

      const { data, error } = await supabase
        .from('legal_penalties')
        .update({
          amount: totalDebt,
          payments: updatedMetadata as any,
          status: overdueDays > 0 ? 'Overdue' : debt.status
        })
        .eq('id', debtId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['financial-tracking', variables.caseId] });
      toast.success('Wage period updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update wage period: ' + error.message);
    },
  });
};

export const useFinancialSummary = (caseId: string) => {
  const { data: debts } = useFinancialTracking(caseId);
  
  const summary = {
    total_ss_insured: debts?.reduce((sum, d) => sum + Number(d.base_debt.ss_insured), 0) || 0,
    total_ss_employer: debts?.reduce((sum, d) => sum + Number(d.base_debt.ss_employer), 0) || 0,
    total_levy: debts?.reduce((sum, d) => sum + Number(d.base_debt.levy), 0) || 0,
    total_ei: debts?.reduce((sum, d) => sum + Number(d.base_debt.ei), 0) || 0,
    total_penalties: debts?.reduce((sum, d) => sum + Number(d.penalties?.amount || 0), 0) || 0,
    total_debt: debts?.reduce((sum, d) => sum + Number(d.total_debt), 0) || 0,
    total_paid: debts?.reduce((sum, d) => sum + Number(d.total_paid), 0) || 0,
    outstanding_balance: debts?.reduce((sum, d) => sum + Number(d.outstanding_balance), 0) || 0,
    overdue_count: debts?.filter(d => d.status === 'Overdue').length || 0,
    payment_count: debts?.reduce((sum, d) => sum + Number(d.payments.length), 0) || 0,
    wage_periods_count: debts?.reduce((sum, d) => sum + Number(d.wage_periods.length), 0) || 0,
  };

  return summary;
};
