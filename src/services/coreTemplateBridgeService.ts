import { supabase } from "@/integrations/supabase/client";
import { coreTemplateService } from "./coreTemplateService";

/**
 * Bridge service: surfaces existing ce_audit_communication_templates (legacy Compliance)
 * inside the core template catalogue WITHOUT modifying existing Compliance runtime.
 *
 * - Read-only against ce_audit_communication_templates
 * - Optionally mirrors them into core_template with source_system='COMPLIANCE_LEGACY'
 * - Compliance UI continues to use auditCommunicationTemplateService unchanged.
 */
export const coreTemplateBridgeService = {
  async listLegacyComplianceTemplates() {
    const { data, error } = await (supabase as any)
      .from("ce_audit_communication_templates")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  /**
   * Mirror legacy compliance templates into core_template as read-only catalogue entries.
   * Idempotent: matches on code = 'CMP-LEGACY-<id>'.
   */
  async mirrorLegacyIntoCore(): Promise<{ created: number; skipped: number }> {
    const legacy = await this.listLegacyComplianceTemplates();
    const existing = await coreTemplateService.listTemplates({ source_system: "COMPLIANCE_LEGACY" });
    const existingCodes = new Set(existing.map(t => t.code));
    let created = 0, skipped = 0;
    for (const row of legacy as any[]) {
      const code = `CMP-LEGACY-${row.id}`;
      if (existingCodes.has(code)) { skipped++; continue; }
      try {
        await coreTemplateService.createTemplate({
          code,
          name: row.name || row.template_code || `Legacy ${row.id}`,
          description: row.description || "Mirrored from ce_audit_communication_templates",
          module_code: "COMPLIANCE",
          module_name: "Compliance (Legacy)",
          template_type: (row.channel || "LETTER").toUpperCase(),
          template_category: row.category || row.template_type || "LEGACY",
          owning_department: "COMPLIANCE",
          status: "ACTIVE",
          source_system: "COMPLIANCE_LEGACY",
          source_ref_id: row.id,
          is_active: true,
        });
        created++;
      } catch {
        skipped++;
      }
    }
    return { created, skipped };
  },
};
