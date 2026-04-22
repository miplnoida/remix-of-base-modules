/**
 * commTriggerRuleService — CRUD for `ce_audit_comm_trigger_rules` plus
 * a small "evaluate for visit" convenience that loads active rules,
 * builds the dedup map from `ce_audit_communications`, and runs the
 * pure engine.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  CommTriggerRule,
  TriggerContext,
  TriggerDecision,
} from '@/types/commTriggerRule';
import { evaluateTriggerRules } from '@/lib/compliance/commTriggerEngine';

const T = 'ce_audit_comm_trigger_rules' as any;
const COMM = 'ce_audit_communications' as any;

export const commTriggerRuleService = {
  async listAll(): Promise<CommTriggerRule[]> {
    const { data, error } = await (supabase.from(T) as any)
      .select('*')
      .order('field_stage')
      .order('priority');
    if (error) throw error;
    return (data || []) as CommTriggerRule[];
  },

  async listActive(): Promise<CommTriggerRule[]> {
    const { data, error } = await (supabase.from(T) as any)
      .select('*')
      .eq('is_active', true)
      .order('priority');
    if (error) throw error;
    return (data || []) as CommTriggerRule[];
  },

  async create(input: Partial<CommTriggerRule> & { rule_code: string; rule_name: string; field_stage: string; comm_type: string }, userCode?: string): Promise<CommTriggerRule> {
    const { data, error } = await (supabase.from(T) as any)
      .insert({ ...input, created_by: userCode ?? null, updated_by: userCode ?? null })
      .select()
      .single();
    if (error) throw error;
    return data as CommTriggerRule;
  },

  async update(id: string, patch: Partial<CommTriggerRule>, userCode?: string): Promise<CommTriggerRule> {
    const { data, error } = await (supabase.from(T) as any)
      .update({ ...patch, updated_by: userCode ?? null })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as CommTriggerRule;
  },

  async remove(id: string): Promise<void> {
    const { error } = await (supabase.from(T) as any).delete().eq('id', id);
    if (error) throw error;
  },

  /**
   * Build the de-dup map (lastSentAt + count) per comm_type for the visit.
   * Counts only rows that left the draft state.
   */
  async buildExistingByType(inspectionId: string): Promise<TriggerContext['existingByType']> {
    const { data, error } = await (supabase.from(COMM) as any)
      .select('comm_type, status, sent_at, created_at')
      .eq('inspection_id', inspectionId);
    if (error) throw error;
    const out: NonNullable<TriggerContext['existingByType']> = {};
    for (const row of (data || []) as Array<{ comm_type: string; status: string; sent_at: string | null; created_at: string }>) {
      const counted = row.status !== 'draft' && row.status !== 'cancelled' && row.status !== 'rejected';
      if (!counted) continue;
      const slot = out[row.comm_type] || { lastSentAt: null, count: 0 };
      slot.count += 1;
      const ts = row.sent_at || row.created_at;
      if (ts && (!slot.lastSentAt || new Date(ts) > new Date(slot.lastSentAt))) {
        slot.lastSentAt = ts;
      }
      out[row.comm_type] = slot;
    }
    return out;
  },

  /**
   * One-shot helper: load active rules, build dedup map for the visit,
   * run engine. The caller passes the *visit-derived* portion of the
   * context (lifecycle + findings); this method merges in `existingByType`.
   */
  async evaluateForVisit(
    inspectionId: string,
    visitCtx: Omit<TriggerContext, 'existingByType'>,
  ): Promise<TriggerDecision[]> {
    const [rules, existingByType] = await Promise.all([
      this.listActive(),
      this.buildExistingByType(inspectionId),
    ]);
    return evaluateTriggerRules(rules, { ...visitCtx, existingByType });
  },
};
