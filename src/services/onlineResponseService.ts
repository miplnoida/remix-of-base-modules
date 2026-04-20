/**
 * Employer Online Response — admin configuration service.
 * Backed by:
 *   - public.ce_online_response_settings (singleton)
 *   - public.ce_online_response_policies (matrix)
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  OnlineResponseSettings,
  OnlineResponsePolicy,
} from '@/types/onlineResponse';

const SETTINGS = 'ce_online_response_settings' as const;
const POLICIES = 'ce_online_response_policies' as const;

export const onlineResponseService = {
  // ── Global settings (singleton) ──────────────────────────────
  async getSettings(): Promise<OnlineResponseSettings | null> {
    const { data, error } = await supabase
      .from(SETTINGS)
      .select('*')
      .eq('is_singleton', true)
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as OnlineResponseSettings) || null;
  },

  async updateSettings(
    id: string,
    patch: Partial<OnlineResponseSettings>,
    userCode?: string,
  ): Promise<OnlineResponseSettings> {
    const { data, error } = await supabase
      .from(SETTINGS)
      .update({ ...patch, updated_by: userCode || null })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as unknown as OnlineResponseSettings;
  },

  // ── Policy matrix ────────────────────────────────────────────
  async listPolicies(opts: { activeOnly?: boolean } = {}): Promise<OnlineResponsePolicy[]> {
    let q = supabase
      .from(POLICIES)
      .select('*')
      .order('priority', { ascending: false })
      .order('policy_name', { ascending: true });
    if (opts.activeOnly) q = q.eq('is_active', true);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as unknown as OnlineResponsePolicy[];
  },

  async getPolicy(id: string): Promise<OnlineResponsePolicy | null> {
    const { data, error } = await supabase
      .from(POLICIES)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as OnlineResponsePolicy) || null;
  },

  async createPolicy(
    payload: Partial<OnlineResponsePolicy>,
    userCode?: string,
  ): Promise<OnlineResponsePolicy> {
    const { data, error } = await supabase
      .from(POLICIES)
      .insert({
        ...payload,
        policy_name: payload.policy_name!,
        created_by: userCode || null,
        updated_by: userCode || null,
      } as any)
      .select('*')
      .single();
    if (error) throw error;
    return data as unknown as OnlineResponsePolicy;
  },

  async updatePolicy(
    id: string,
    patch: Partial<OnlineResponsePolicy>,
    userCode?: string,
  ): Promise<OnlineResponsePolicy> {
    const { data, error } = await supabase
      .from(POLICIES)
      .update({ ...patch, updated_by: userCode || null })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as unknown as OnlineResponsePolicy;
  },

  async setActive(id: string, isActive: boolean, userCode?: string) {
    return this.updatePolicy(id, { is_active: isActive }, userCode);
  },

  async deletePolicy(id: string): Promise<void> {
    const { error } = await supabase.from(POLICIES).delete().eq('id', id);
    if (error) throw error;
  },
};
