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
  template_id: string;
  template_version_id: string | null;
  channel_code: string;
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  sender_address: string | null;
  reply_to_address: string | null;
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

  async listVariantsForTemplate(template_id: string) {
    const { data, error } = await (supabase as any)
      .from("core_template_channel_variant").select("*")
      .eq("template_id", template_id)
      .order("channel_code");
    if (error) throw error;
    return (data || []) as CoreTemplateChannelVariant[];
  },

  async getVariant(template_id: string, channel_code: string) {
    const { data, error } = await (supabase as any)
      .from("core_template_channel_variant").select("*")
      .eq("template_id", template_id).eq("channel_code", channel_code)
      .eq("is_active", true).maybeSingle();
    if (error) throw error;
    return data as CoreTemplateChannelVariant | null;
  },

  async upsertVariant(input: Partial<CoreTemplateChannelVariant> & {
    template_id: string; channel_code: string;
  }) {
    const existing = await this.getVariant(input.template_id, input.channel_code);
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
