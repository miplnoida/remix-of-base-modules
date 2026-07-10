/**
 * EPIC CH-T1 — Communication Hub Template Preview service.
 *
 * Thin wrapper around the `render_comm_hub_template_preview` RPC.
 * IMPORTANT: This is a pure resolver. It does NOT create a
 * communication_request / communication_message and does NOT send email.
 */
import { supabase } from "@/integrations/supabase/client";

export interface CommHubPreviewInput {
  module_code: string;
  event_code: string;
  channel?: string;
  recipient_email: string;
  recipient_name?: string;
  entity_type?: string | null;
  entity_id?: string | null;
  reference_no?: string | null;
  tokens?: Record<string, string | number | null | undefined>;
  context?: Record<string, unknown>;
}

export interface CommHubReviewPolicy {
  id: string;
  module_code: string;
  event_code: string;
  channel: string;
  review_mode:
    | "hidden"
    | "preview_optional"
    | "preview_required"
    | "approval_required"
    | "legal_approval_required";
  preview_required: boolean;
  allow_operator_edit_tokens: boolean;
  allow_operator_edit_body: boolean;
  allow_operator_change_recipient: boolean;
  show_template_to_operator: boolean;
  show_template_to_recipient_portal: boolean;
  require_template_approval: boolean;
  require_legal_approval: boolean;
  require_business_approval: boolean;
  approval_status:
    | "draft"
    | "under_review"
    | "approved_internal"
    | "approved_external"
    | "rejected"
    | "retired";
  approved_template_version_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
}

export interface CommHubPreviewResult {
  ok: boolean;
  resolved_template_code?: string;
  template_id?: string;
  template_version_id?: string | null;
  version_no?: number | null;
  version_status?: string | null;
  from_email?: string | null;
  from_display_name?: string | null;
  reply_to_email?: string | null;
  sender_profile_id?: string | null;
  sender_enabled?: boolean;
  sender_verified?: boolean;
  subject_preview?: string;
  html_preview?: string;
  text_preview?: string;
  token_values?: Record<string, unknown>;
  missing_tokens?: string[];
  unresolved_tokens?: string[];
  review_policy?: CommHubReviewPolicy | null;
  send_policy?: any;
  warnings?: string[];
  blockers?: string[];
  recipient_email?: string;
  recipient_name?: string;
  generated_at?: string;
}

export async function renderCommHubTemplatePreview(
  input: CommHubPreviewInput
): Promise<CommHubPreviewResult> {
  const payload: Record<string, unknown> = {
    module_code: input.module_code,
    event_code: input.event_code,
    channel: input.channel ?? "email",
    recipient_email: input.recipient_email,
    recipient_name: input.recipient_name ?? "",
    entity_type: input.entity_type ?? null,
    entity_id: input.entity_id ?? null,
    reference_no: input.reference_no ?? null,
    tokens: input.tokens ?? {},
    context: input.context ?? {},
  };
  const { data, error } = await (supabase as any).rpc(
    "render_comm_hub_template_preview",
    { p_payload: payload }
  );
  if (error) throw error;
  return (data ?? { ok: false, blockers: ["rpc_returned_null"] }) as CommHubPreviewResult;
}

export function previewSatisfiesSendGate(p: CommHubPreviewResult | null): {
  ready: boolean;
  reasons: string[];
} {
  if (!p) return { ready: false, reasons: ["preview_not_generated"] };
  const reasons: string[] = [];
  if (!p.ok) reasons.push("preview_failed");
  if ((p.blockers ?? []).length > 0) reasons.push(...(p.blockers ?? []));
  const rp = p.review_policy;
  if (!rp) reasons.push("review_policy_missing");
  else {
    if (
      rp.require_template_approval &&
      !["approved_internal", "approved_external"].includes(rp.approval_status)
    ) {
      reasons.push("template_not_approved");
    }
    if (
      rp.approved_template_version_id &&
      p.template_version_id &&
      rp.approved_template_version_id !== p.template_version_id
    ) {
      reasons.push("version_mismatch_with_approved");
    }
  }
  if ((p.unresolved_tokens ?? []).length > 0) reasons.push("unresolved_tokens_present");
  return { ready: reasons.length === 0, reasons: Array.from(new Set(reasons)) };
}
