import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LegalOrder {
  id: string;
  case_id: string;
  number: string | null;
  draft_html: string | null;
  published_pdf_id: string | null;
  findings: string | null;
  directives: string | null;
  compliance_due: string | null;
  status: string;
  published_at: string | null;
  created_at: string;
  created_by: string | null;
  legal_cases?: {
    number: string;
    title: string;
    case_type: string;
  };
}

export const useLegalOrders = (filters?: Record<string, any>) => {
  return useQuery({
    queryKey: ['legal-orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('legal_orders')
        .select(`
          *,
          legal_cases (
            number,
            title,
            case_type
          )
        `)
        .order('created_at', { ascending: false });

      if (filters?.status?.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.case_type) {
        // This requires joining through legal_cases
        // For now, we'll filter client-side
      }

      if (filters?.search) {
        query = query.or(`number.ilike.%${filters.search}%,findings.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Client-side filtering for case_type if needed
      let filteredData = data as LegalOrder[];
      if (filters?.case_type) {
        filteredData = filteredData.filter(
          (order) => order.legal_cases?.case_type === filters.case_type
        );
      }

      return filteredData;
    },
  });
};

export const useLegalOrder = (id: string) => {
  return useQuery({
    queryKey: ['legal-order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('legal_orders')
        .select(`
          *,
          legal_cases (
            number,
            title,
            case_type
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as LegalOrder | null;
    },
    enabled: !!id,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('legal_orders')
        .insert({
          ...orderData,
          created_by: user.id,
          status: 'Draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-orders'] });
      toast.success('Order draft created successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to create order: ' + error.message);
    },
  });
};

export const useUpdateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('legal_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-orders'] });
      toast.success('Order updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update order: ' + error.message);
    },
  });
};

export const useApproveOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('legal_orders')
        .update({ status: 'Approved' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-orders'] });
      toast.success('Order approved successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to approve order: ' + error.message);
    },
  });
};

export const usePublishOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: existingOrders } = await supabase
        .from('legal_orders')
        .select('number')
        .not('number', 'is', null)
        .order('number', { ascending: false })
        .limit(1);

      const lastNumber = existingOrders?.[0]?.number || 'ORD-2025-000';
      const nextNum = parseInt(lastNumber.split('-')[2]) + 1;
      const newNumber = `ORD-2025-${String(nextNum).padStart(3, '0')}`;

      const { data, error } = await supabase
        .from('legal_orders')
        .update({
          status: 'Published',
          number: newNumber,
          published_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-orders'] });
      toast.success('Order published successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to publish order: ' + error.message);
    },
  });
};
