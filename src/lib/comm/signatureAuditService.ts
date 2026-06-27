/**
 * Audit logging for every signature/stamp usage on a generated document
 * and for test prints.
 */
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type DocChannel = "PRINT" | "PDF" | "EMAIL" | "DMS" | "PORTAL";

export interface SignatureUsagePayload {
  document_generation_id?: string | null;
  template_id?: string | null;
  template_version_no?: number | null;
  signature_asset_id?: string | null;
  stamp_asset_id?: string | null;
  seal_asset_id?: string | null;
  approval_stamp_asset_id?: string | null;
  generated_by_user_code?: string | null;
  signature_user_code?: string | null;
  approval_user_code?: string | null;
  channel: DocChannel;
  is_test_print?: boolean;
  is_draft?: boolean;
  reason?: string | null;
  metadata?: Record<string, any>;
}

export async function logSignatureUsage(payload: SignatureUsagePayload): Promise<void> {
  const { error } = await sb.from("core_document_signature_usage").insert({
    ...payload,
    metadata: payload.metadata ?? {},
    generated_at: new Date().toISOString(),
  });
  if (error) {
    // Fire-and-forget logging per project standard — never block UX
    // eslint-disable-next-line no-console
    console.warn("[signatureAudit] failed to log usage", error);
  }
}

export interface TestPrintPayload {
  template_id?: string | null;
  template_version_no?: number | null;
  performed_by_user_code?: string | null;
  mode: "PLACEHOLDER" | "REAL";
  signature_asset_id?: string | null;
  stamp_asset_id?: string | null;
  notes?: string | null;
  metadata?: Record<string, any>;
}

export async function logTestPrint(payload: TestPrintPayload): Promise<void> {
  const { error } = await sb.from("core_document_test_print_log").insert({
    ...payload,
    metadata: payload.metadata ?? {},
    performed_at: new Date().toISOString(),
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[signatureAudit] failed to log test print", error);
  }
}
