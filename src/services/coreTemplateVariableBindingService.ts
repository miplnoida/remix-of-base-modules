import { supabase } from "@/integrations/supabase/client";

export interface CoreTemplateVariableBinding {
  id: string;
  template_id: string;
  token_code: string;
  is_required: boolean;
  default_value: string | null;
}

export const coreTemplateVariableBindingService = {
  async listForTemplate(template_id: string) {
    const { data, error } = await (supabase as any)
      .from("core_template_variable_binding").select("*")
      .eq("template_id", template_id).order("token_code");
    if (error) throw error;
    return (data || []) as CoreTemplateVariableBinding[];
  },

  async upsert(input: Partial<CoreTemplateVariableBinding> & {
    template_id: string; token_code: string;
  }) {
    const existing = await (supabase as any)
      .from("core_template_variable_binding").select("id")
      .eq("template_id", input.template_id).eq("token_code", input.token_code)
      .maybeSingle();
    if (existing.data?.id) {
      const { data, error } = await (supabase as any)
        .from("core_template_variable_binding").update(input)
        .eq("id", existing.data.id).select("*").single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await (supabase as any)
      .from("core_template_variable_binding").insert(input).select("*").single();
    if (error) throw error;
    return data;
  },

  async remove(id: string) {
    const { error } = await (supabase as any)
      .from("core_template_variable_binding").delete().eq("id", id);
    if (error) throw error;
  },

  /** Validate tokens supplied at generation time against template required bindings */
  async validateTokens(template_id: string, supplied: Record<string, any>) {
    const bindings = await this.listForTemplate(template_id);
    const missing = bindings
      .filter((b) => b.is_required && (supplied[b.token_code] === undefined || supplied[b.token_code] === null || supplied[b.token_code] === ""))
      .map((b) => b.token_code);
    return { valid: missing.length === 0, missing };
  },
};
