/**
 * Communication Hub — Manual One-Time Dispatch service (Phase 1C-B8-D-A).
 *
 * Invokes the admin-only `comm-hub-manual-dispatch-test` edge function via
 * the user's session JWT. Never handles service_role or dispatch secrets.
 *
 * Supports three modes:
 *   - dry-run    : testMode=true, typedConfirmation="DISPATCH ONE TEST MESSAGE"
 *   - live       : executeLive=true, testMode=false, typedConfirmation="SEND ONE LIVE EMAIL TO ROHIT"
 *                  Backend enforces all live gates; blocked under current safe state.
 *   - preflight  : action="preflight" — evaluates gates only, no create, no dispatch.
 */
import { supabase } from "@/integrations/supabase/client";

export const TYPED_CONFIRMATION = "DISPATCH ONE TEST MESSAGE";
export const TYPED_CONFIRMATION_LIVE = "SEND ONE LIVE EMAIL";

export interface ManualDispatchInput {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  bodyText: string;
  testMode: boolean;
  executeLive?: boolean;
  reason: string;
  typedConfirmation: string;
}

export interface ManualDispatchResult {
  ok: boolean;
  mode?: "dry-run" | "live" | "preflight";
  blocked?: boolean;
  reason?: string;
  reasons?: string[];
  gates?: Record<string, boolean>;
  settings?: Record<string, unknown>;
  envEmailLive?: boolean;
  envAllowlistOk?: boolean;
  cronPresent?: boolean | null;
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

export interface EnvReadinessSnapshot {
  resendApiKeyPresent: boolean;
  dispatchSecretPresent: boolean;
  resendWebhookSecretPresent: boolean;
  emailLiveEnvPresent: boolean;
  emailLiveEnvTrue: boolean;
  emailLiveAllowlistConfigured: boolean;
  emailLiveAllowlistCount: number;
  emailLiveAllowlistEmailCount: number;
  emailLiveAllowlistDomainCount: number;
  cronScheduled: boolean;
}

export interface LivePreflightResult {
  ok: boolean;
  mode?: "preflight";
  ready?: boolean;
  gates?: Record<string, boolean>;
  reasons?: string[];
  settings?: Record<string, unknown>;
  envEmailLive?: boolean;
  envAllowlistOk?: boolean;
  cronPresent?: boolean | null;
  envReadiness?: EnvReadinessSnapshot;
  error?: string;
  detail?: string;
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

export async function checkLiveReadiness(
  recipientEmail?: string,
): Promise<LivePreflightResult> {
  const { data, error } = await supabase.functions.invoke("comm-hub-manual-dispatch-test", {
    body: { action: "preflight", recipientEmail: recipientEmail ?? null },
  });
  if (error) {
    return { ok: false, error: "invoke_failed", detail: error.message };
  }
  return data as LivePreflightResult;
}
