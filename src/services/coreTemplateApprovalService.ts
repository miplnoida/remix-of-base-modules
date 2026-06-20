import { supabase } from "@/integrations/supabase/client";
import { coreTemplateService } from "./coreTemplateService";

export type ApprovalStage = "DRAFT" | "REVIEW" | "APPROVED" | "PUBLISHED" | "REJECTED";

export interface CoreTemplateApproval {
  id: string;
  template_id: string;
  template_version_id: string | null;
  stage: ApprovalStage | string;
  actor_user_code: string | null;
  comments: string | null;
  created_at: string;
}

export const coreTemplateApprovalService = {
  async history(template_id: string) {
    const { data, error } = await (supabase as any)
      .from("core_template_approval").select("*")
      .eq("template_id", template_id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as CoreTemplateApproval[];
  },

  async submitForReview(template_id: string, version_id: string, actor?: string, comments?: string) {
    return this._record(template_id, version_id, "REVIEW", actor, comments);
  },

  async approve(template_id: string, version_id: string, actor?: string, comments?: string) {
    return this._record(template_id, version_id, "APPROVED", actor, comments);
  },

  async reject(template_id: string, version_id: string, actor?: string, comments?: string) {
    return this._record(template_id, version_id, "REJECTED", actor, comments);
  },

  async publish(template_id: string, version_id: string, actor?: string, comments?: string) {
    await coreTemplateService.publishVersion(version_id);
    return this._record(template_id, version_id, "PUBLISHED", actor, comments);
  },

  async _record(template_id: string, template_version_id: string, stage: ApprovalStage,
                actor?: string, comments?: string) {
    const { data, error } = await (supabase as any)
      .from("core_template_approval").insert({
        template_id, template_version_id, stage,
        actor_user_code: actor || "SYSTEM",
        comments: comments || null,
      }).select("*").single();
    if (error) throw error;
    return data as CoreTemplateApproval;
  },
};
