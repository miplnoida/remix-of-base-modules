import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from 'sonner';

// ─── Types ───
export type RolloutState = 'hidden' | 'internal_pilot' | 'public';
export type ReleaseState = 'planned' | 'deploying' | 'deployed' | 'validated' | 'active' | 'rolled_back';
export type ConfigPromotionStatus = 'draft' | 'pending_review' | 'approved' | 'promoting' | 'promoted' | 'failed' | 'rolled_back';

export interface FeatureFlag {
  id: string;
  flag_key: string;
  display_name: string;
  description: string | null;
  module_id: string | null;
  is_enabled: boolean;
  rollout_state: RolloutState;
  pilot_user_ids: string[];
  pilot_role_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface ReleaseEntry {
  id: string;
  release_name: string;
  module_name: string | null;
  code_version: string | null;
  db_migration_version: string | null;
  config_pack_version: string | null;
  release_state: ReleaseState;
  release_notes: string | null;
  applied_by: string | null;
  applied_at: string | null;
  validated_by: string | null;
  validated_at: string | null;
  activated_by: string | null;
  activated_at: string | null;
  rollback_reference: string | null;
  rollback_notes: string | null;
  created_at: string;
}

export interface ModuleRolloutInfo {
  id: string;
  name: string;
  display_name: string;
  is_enabled: boolean;
  show_in_menu: boolean;
  rollout_state: string;
  internal_only: boolean;
  routes_enabled: boolean;
  actions_enabled: boolean;
  release_version: string | null;
}

// ─── Feature Flags ───
export function useFeatureFlags() {
  return useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as FeatureFlag[];
    },
  });
}

export function useCheckFeatureFlag(flagKey: string) {
  const { user } = useSupabaseAuth();
  return useQuery({
    queryKey: ['feature-flag-check', flagKey, user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await (supabase.rpc as any)('check_feature_flag', {
        _flag_key: flagKey,
        _user_id: user.id,
      });
      if (error) return false;
      return data as boolean;
    },
    enabled: !!user?.id && !!flagKey,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; updates: Partial<FeatureFlag> }) => {
      const { error } = await supabase
        .from('feature_flags')
        .update(params.updates as any)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feature-flags'] });
      toast.success('Feature flag updated');
    },
    onError: (e: any) => toast.error('Failed to update flag: ' + e.message),
  });
}

export function useCreateFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { flag_key: string; display_name: string; description?: string | null; module_id?: string | null; is_enabled?: boolean; rollout_state?: RolloutState; pilot_user_ids?: string[]; pilot_role_ids?: string[] }) => {
      const { error } = await supabase.from('feature_flags').insert(params as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feature-flags'] });
      toast.success('Feature flag created');
    },
    onError: (e: any) => toast.error('Failed to create flag: ' + e.message),
  });
}

// ─── Release Registry ───
export function useReleaseRegistry() {
  return useQuery({
    queryKey: ['release-registry'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('release_registry')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ReleaseEntry[];
    },
  });
}

export function useCreateRelease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: Partial<ReleaseEntry>) => {
      const { error } = await supabase.from('release_registry').insert(params as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['release-registry'] });
      toast.success('Release entry created');
    },
    onError: (e: any) => toast.error('Failed: ' + e.message),
  });
}

export function useUpdateRelease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; updates: Partial<ReleaseEntry> }) => {
      const { error } = await supabase
        .from('release_registry')
        .update(params.updates as any)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['release-registry'] });
      toast.success('Release updated');
    },
    onError: (e: any) => toast.error('Failed: ' + e.message),
  });
}

// ─── Module Rollout Controls ───
export function useModuleRolloutControls() {
  return useQuery({
    queryKey: ['module-rollout-controls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_modules')
        .select('id, name, display_name, is_enabled, show_in_menu, rollout_state, internal_only, routes_enabled, actions_enabled, release_version')
        .order('sort_order');
      if (error) throw error;
      return (data || []) as ModuleRolloutInfo[];
    },
  });
}

export function useUpdateModuleRollout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; updates: Partial<ModuleRolloutInfo> }) => {
      const { error } = await supabase
        .from('app_modules')
        .update(params.updates as any)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['module-rollout-controls'] });
      qc.invalidateQueries({ queryKey: ['dynamic-navigation'] });
      toast.success('Module rollout updated');
    },
    onError: (e: any) => toast.error('Failed: ' + e.message),
  });
}

// ─── Migration Logs ───
export function useMigrationLogs() {
  return useQuery({
    queryKey: ['migration-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('migration_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useLogMigration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: Record<string, any>) => {
      const { error } = await supabase.from('migration_logs').insert(params as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['migration-logs'] }),
  });
}

// ─── Config Promotion ───
export interface ConfigPromotionPack {
  id: string;
  pack_name: string;
  description: string | null;
  source_environment: string;
  config_type: string;
  status: ConfigPromotionStatus;
  config_payload: any;
  dependency_check: any;
  item_count: number | null;
  promoted_by: string | null;
  promoted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rollback_notes: string | null;
  release_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ConfigPromotionItem {
  id: string;
  pack_id: string;
  table_name: string;
  record_id: string | null;
  operation: string;
  payload: any;
  status: string;
  error_message: string | null;
  promoted_at: string | null;
  created_at: string;
}

export function useConfigPromotionPacks() {
  return useQuery({
    queryKey: ['config-promotion-packs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('config_promotion_packs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ConfigPromotionPack[];
    },
  });
}

export function useConfigPromotionItems(packId: string | null) {
  return useQuery({
    queryKey: ['config-promotion-items', packId],
    queryFn: async () => {
      if (!packId) return [];
      const { data, error } = await supabase
        .from('config_promotion_items')
        .select('*')
        .eq('pack_id', packId)
        .order('created_at');
      if (error) throw error;
      return (data || []) as ConfigPromotionItem[];
    },
    enabled: !!packId,
  });
}

export function useCreateConfigPack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      pack_name: string;
      description?: string;
      source_environment?: string;
      config_type: string;
      config_payload: any;
      item_count?: number;
      created_by?: string;
    }) => {
      const { data, error } = await supabase
        .from('config_promotion_packs')
        .insert({
          ...params,
          status: 'draft',
          source_environment: params.source_environment || 'test',
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config-promotion-packs'] });
      toast.success('Config promotion pack created');
    },
    onError: (e: any) => toast.error('Failed: ' + e.message),
  });
}

export function useUpdateConfigPack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; updates: Partial<ConfigPromotionPack> }) => {
      const { error } = await supabase
        .from('config_promotion_packs')
        .update(params.updates as any)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config-promotion-packs'] });
      toast.success('Config pack updated');
    },
    onError: (e: any) => toast.error('Failed: ' + e.message),
  });
}

export function useAddConfigItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      pack_id: string;
      table_name: string;
      record_id?: string;
      operation: string;
      payload: any;
    }) => {
      const { error } = await supabase
        .from('config_promotion_items')
        .insert({ ...params, status: 'pending' } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['config-promotion-items', vars.pack_id] });
      toast.success('Item added to pack');
    },
    onError: (e: any) => toast.error('Failed: ' + e.message),
  });
}

// ─── User Provisioning Logs ───
export function useUserProvisioningLogs() {
  return useQuery({
    queryKey: ['user-provisioning-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_provisioning_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });
}
