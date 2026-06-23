import { supabase } from "@/integrations/supabase/client";

export interface CoreTemplateChannel {
  id: string;
  channel_code: string;
  channel_name: string;
  channel_group: string;
  delivery_mode: string;
  supports_html: boolean;
  supports_text: boolean;
  max_length: number | null;
  is_active: boolean;
}

export interface CoreTemplateChannelVariant {
  id: string;
  template_version_id: string | null;
  channel_code: string;
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  sender_address?: string | null;
  reply_to_address?: string | null;
  is_default: boolean;
  is_active: boolean;
}

export const coreTemplateChannelService = {
  async listChannels() {
    const { data, error } = await (supabase as any)
      .from("core_template_channel").select("*")
      .eq("is_active", true)
      .order("channel_group").order("channel_code");
    if (error) throw error;
    return (data || []) as CoreTemplateChannel[];
  },

  /** List all variants for a given template version (preferred). */
  async listVariantsForVersion(template_version_id: string) {
    const { data, error } = await (supabase as any)
      .from("core_template_channel_variant").select("*")
      .eq("template_version_id", template_version_id)
      .order("channel_code");
    if (error) throw error;
    return (data || []) as CoreTemplateChannelVariant[];
  },

  /** Get the active variant for a given template version + channel. */
  async getVariant(template_version_id: string | null | undefined, channel_code: string) {
    if (!template_version_id) return null;
    const { data, error } = await (supabase as any)
      .from("core_template_channel_variant").select("*")
      .eq("template_version_id", template_version_id)
      .eq("channel_code", channel_code)
      .eq("is_active", true).maybeSingle();
    if (error) throw error;
    return data as CoreTemplateChannelVariant | null;
  },

  async upsertVariant(input: Partial<CoreTemplateChannelVariant> & {
    template_version_id: string; channel_code: string;
  }) {
    const existing = await this.getVariant(input.template_version_id, input.channel_code);
    if (existing) {
      const { data, error } = await (supabase as any)
        .from("core_template_channel_variant").update(input).eq("id", existing.id)
        .select("*").single();
      if (error) throw error;
      return data as CoreTemplateChannelVariant;
    }
    const { data, error } = await (supabase as any)
      .from("core_template_channel_variant").insert({ is_active: true, ...input })
      .select("*").single();
    if (error) throw error;
    return data as CoreTemplateChannelVariant;
  },

  async deleteVariant(id: string) {
    const { error } = await (supabase as any)
      .from("core_template_channel_variant").delete().eq("id", id);
    if (error) throw error;
  },
};
