import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DistributionRecipient {
  id: string;
  name: string;
  email: string;
  recipient_type: string;
  designation?: string;
  organization?: string;
  is_active: boolean;
  created_by?: string;
  created_at?: string;
}

export function useDistributionRecipients(recipientType?: string) {
  return useQuery({
    queryKey: ['ia_distribution_recipients', recipientType],
    queryFn: async () => {
      let query = supabase
        .from('ia_distribution_recipients' as any)
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (recipientType) {
        query = query.eq('recipient_type', recipientType);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as DistributionRecipient[];
    },
  });
}

export function useDistributionRecipientMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (recipient: Omit<DistributionRecipient, 'id' | 'is_active' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('ia_distribution_recipients' as any)
        .insert(recipient)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_distribution_recipients'] });
      toast({ title: 'Recipient Saved', description: 'Recipient added to the saved list.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('ia_distribution_recipients' as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_distribution_recipients'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ia_distribution_recipients' as any)
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_distribution_recipients'] });
      toast({ title: 'Recipient Removed' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { create, update, remove };
}

// Distribution templates
export interface DistributionTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  template_type: string;
  is_default: boolean;
  is_active: boolean;
}

export function useDistributionTemplates(templateType?: string) {
  return useQuery({
    queryKey: ['ia_distribution_templates', templateType],
    queryFn: async () => {
      let query = supabase
        .from('ia_distribution_templates' as any)
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (templateType) {
        query = query.eq('template_type', templateType);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as DistributionTemplate[];
    },
  });
}
