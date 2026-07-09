/**
 * Communication Hub — Manual One-Time Dispatch Test service (Phase 1C-B8-C).
 *
 * Invokes the admin-only `comm-hub-manual-dispatch-test` edge function via
 * the user's session JWT. Never handles service_role or dispatch secrets.
 */
import { supabase } from "@/integrations/supabase/client";

export const TYPED_CONFIRMATION = "DISPATCH ONE TEST MESSAGE";

export interface ManualDispatchInput {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  bodyText: string;
  testMode: boolean;
  reason: string;
  typedConfirmation: string;
}

export interface ManualDispatchResult {
  ok: boolean;
  phaseGate?: { forcedTestMode: boolean; liveBlockedThisPhase: boolean };
  warning?: string;
  request?: { id: string; request_no: string };
  message?: any;
  attempts?: any[];
  events?: any[];
  dispatch?: any;
  error?: string;
  detail?: string;
  expected?: string;
}

export async function invokeManualDispatchTest(
  input: ManualDispatchInput,
): Promise<ManualDispatchResult> {
  const { data, error } = await supabase.functions.invoke("comm-hub-manual-dispatch-test", {
    body: input,
  });
  if (error) {
    return { ok: false, error: "invoke_failed", detail: error.message };
  }
  return data as ManualDispatchResult;
}
