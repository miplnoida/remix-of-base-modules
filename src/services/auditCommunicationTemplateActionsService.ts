/**
 * Audit Communication Template Actions Service —
 * CRUD over ce_audit_communication_template_actions plus a helper to compute
 * the effective enabled-action set (merging legacy attachment_rule_json).
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  AuditCommunicationTemplateAction,
  CeCommActionKey,
  CommAttachmentRule,
} from '@/types/auditCommunication';
import { COMMUNICATION_ACTIONS, mergeEffectiveActions } from '@/lib/audit/communicationActions';

const TBL = 'ce_audit_communication_template_actions' as any;

export const auditCommunicationTemplateActionsService = {
  async listForTemplate(templateId: string): Promise<AuditCommunicationTemplateAction[]> {
    const { data, error } = await (supabase.from(TBL) as any)
      .select('*')
      .eq('template_id', templateId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data || []) as AuditCommunicationTemplateAction[];
  },

  /**
   * Replace the action set for a template in one go.
   * Any action_key not present in `actions` is removed.
   */
  async replaceAll(
    templateId: string,
    actions: Array<Pick<AuditCommunicationTemplateAction, 'action_key' | 'is_enabled' | 'config_json' | 'sort_order'>>,
  ): Promise<AuditCommunicationTemplateAction[]> {
    const { error: delErr } = await (supabase.from(TBL) as any)
      .delete()
      .eq('template_id', templateId);
    if (delErr) throw delErr;

    if (!actions.length) return [];

    const rows = actions.map((a) => ({
      template_id: templateId,
      action_key: a.action_key,
      is_enabled: a.is_enabled,
      config_json: a.config_json ?? {},
      sort_order: a.sort_order ?? 0,
    }));

    const { data, error } = await (supabase.from(TBL) as any).insert(rows).select();
    if (error) throw error;
    return (data || []) as AuditCommunicationTemplateAction[];
  },

  async setEnabled(templateId: string, actionKey: CeCommActionKey, isEnabled: boolean) {
    const def = COMMUNICATION_ACTIONS.find((a) => a.key === actionKey);
    const { data, error } = await (supabase.from(TBL) as any)
      .upsert(
        {
          template_id: templateId,
          action_key: actionKey,
          is_enabled: isEnabled,
          config_json: def?.defaultConfig ?? {},
          sort_order: def?.sortOrder ?? 0,
        },
        { onConflict: 'template_id,action_key' },
      )
      .select()
      .single();
    if (error) throw error;
    return data as AuditCommunicationTemplateAction;
  },

  async updateConfig(templateId: string, actionKey: CeCommActionKey, configJson: Record<string, unknown>) {
    const { data, error } = await (supabase.from(TBL) as any)
      .update({ config_json: configJson })
      .eq('template_id', templateId)
      .eq('action_key', actionKey)
      .select()
      .single();
    if (error) throw error;
    return data as AuditCommunicationTemplateAction;
  },

  /** Merge structured rows + legacy JSON into the effective enabled set. */
  effective(rows: AuditCommunicationTemplateAction[], legacy: CommAttachmentRule | null | undefined) {
    return mergeEffectiveActions(rows, legacy);
  },
};
