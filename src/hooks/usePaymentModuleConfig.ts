import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from 'sonner';
import { logAuditTrail } from '@/services/auditService';

// ── Fetch all config rows ──
export function usePaymentModuleConfig() {
  return useQuery({
    queryKey: ['payment-module-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_module_config')
        .select('*')
        .order('config_key');
      if (error) throw error;
      return data as { id: string; config_key: string; config_value: any; description: string | null; updated_at: string; updated_by: string | null }[];
    },
  });
}

// ── Fetch single config by key ──
export function usePaymentConfig(key: string) {
  return useQuery({
    queryKey: ['payment-module-config', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_module_config')
        .select('*')
        .eq('config_key', key)
        .single();
      if (error) throw error;
      return data as { id: string; config_key: string; config_value: any; description: string | null };
    },
  });
}

// ── Update a config value ──
export function useUpdatePaymentConfig() {
  const queryClient = useQueryClient();
  const { profile, user } = useSupabaseAuth();

  return useMutation({
    mutationKey: ['Admin', 'payment_module_config', 'update'],
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      // Fetch current value before update for audit
      const { data: existing } = await supabase
        .from('payment_module_config')
        .select('id, config_key, config_value')
        .eq('config_key', key)
        .single();

      const beforeValue = existing?.config_value;

      const { error } = await supabase
        .from('payment_module_config')
        .update({
          config_value: value,
          updated_at: new Date().toISOString(),
          updated_by: profile?.user_code || null,
        })
        .eq('config_key', key);
      if (error) throw error;

      // Write audit log
      const auditResult = await logAuditTrail({
        action: 'update',
        entityType: 'payment_module_config',
        entityId: existing?.id || key,
        module: 'Payment Module Configuration',
        beforeValue: { config_key: key, config_value: beforeValue },
        afterValue: { config_key: key, config_value: value },
        userCode: profile?.user_code || undefined,
        userId: user?.id,
        metadata: { route: '/cashier/payment-module-config', config_key: key },
      });
      if (!auditResult) {
        console.error('[PaymentConfig] Audit log creation failed for config key:', key);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-module-config'] });
      toast.success('Configuration saved successfully');
    },
    onError: (err: any) => {
      toast.error('Failed to save configuration', { description: err.message });
    },
  });
}

// ── Check if current user can manage all batches ──
export function useCanManageAllBatches() {
  const { roles } = useSupabaseAuth();
  const { data: config, isLoading } = usePaymentConfig('manage_all_batches_roles');

  const canManage = !isLoading && config
    ? (config.config_value as string[]).some((r: string) => roles.includes(r))
    : false;

  return { canManageAllBatches: canManage, isLoading };
}

// ── Check if current user is a configured cashier ──
export function useIsCashierRole() {
  const { roles } = useSupabaseAuth();
  const { data: config, isLoading } = usePaymentConfig('cashier_roles');

  const isCashier = !isLoading && config
    ? (config.config_value as string[]).some((r: string) => roles.includes(r))
    : false;

  return { isCashier, isLoading };
}

// ── Fetch users whose roles intersect with configured cashier_roles ──
export interface CashierUser {
  id: string;
  full_name: string | null;
  user_code: string | null;
  office_code: string | null;
  office_description: string | null;
}

export function useCashierUsers() {
  const { data: config } = usePaymentConfig('cashier_roles');

  return useQuery({
    queryKey: ['cashier-users', config?.config_value],
    enabled: !!config,
    queryFn: async () => {
      const cashierRoles = config!.config_value as string[];
      if (!cashierRoles.length) return [] as CashierUser[];

      // Get user_ids that have any of the cashier roles
      const { data: roleAssignments, error: roleErr } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', cashierRoles);
      if (roleErr) throw roleErr;

      const userIds = [...new Set((roleAssignments || []).map(r => r.user_id))];
      if (!userIds.length) return [] as CashierUser[];

      // Get profiles with office info
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select(`id, full_name, user_code, office_code, office:tb_office!profiles_office_code_fkey(description)`)
        .in('id', userIds)
        .eq('is_active', true)
        .order('full_name');
      if (profErr) throw profErr;

      return (profiles || []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        user_code: p.user_code,
        office_code: p.office_code,
        office_description: p.office?.description || null,
      })) as CashierUser[];
    },
  });
}

// ── Fetch duplicate batch config ──
export function useDuplicateBatchMode() {
  const { data: config, isLoading } = usePaymentConfig('duplicate_open_batch');
  const mode = config?.config_value?.mode || 'warning';
  return { mode: mode as 'warning' | 'restriction', isLoading };
}

// ── Fetch MOP detail display config ──
export function useMopDetailConfig() {
  const { data: chequeConfig, isLoading: chqLoading } = useQuery({
    queryKey: ['payment-module-config', 'show_cheque_details'],
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_module_config')
        .select('*')
        .eq('config_key', 'show_cheque_details')
        .single();
      if (error) throw error;
      return data as { id: string; config_key: string; config_value: any; description: string | null };
    },
  });
  const { data: cardConfig, isLoading: crdLoading } = useQuery({
    queryKey: ['payment-module-config', 'show_card_details'],
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_module_config')
        .select('*')
        .eq('config_key', 'show_card_details')
        .single();
      if (error) throw error;
      return data as { id: string; config_key: string; config_value: any; description: string | null };
    },
  });

  return {
    showChequeDetails: chequeConfig?.config_value !== false,
    showCardDetails: cardConfig?.config_value !== false,
    isLoading: chqLoading || crdLoading,
  };
}

// ── Fetch C3 payment types config ──
export function useC3PaymentTypes() {
  const { data: config, isLoading } = usePaymentConfig('c3_payment_types');
  const c3PaymentTypes = (!isLoading && config && Array.isArray(config.config_value))
    ? (config.config_value as string[])
    : [];
  return { c3PaymentTypes, isLoading };
}
