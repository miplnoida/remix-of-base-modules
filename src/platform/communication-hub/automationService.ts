/**
 * Phase 4A — Automation activation service.
 *
 * Automation is a SEPARATE state from operating mode. Selecting
 * AUTOMATED_PRODUCTION lands the platform in STANDBY with scheduler,
 * automatic triggers, retry worker, batch and bulk still OFF. Arming
 * is a distinct, server-authorised action guarded by role, typed
 * confirmation and Phase 4B certification evidence.
 */
import { supabase } from "@/integrations/supabase/client";

export const ARM_CONFIRMATION_PHRASE = "ARM AUTOMATED PRODUCTION" as const;

export interface AutomationRpcResult {
  ok: boolean;
  automation_state: "STANDBY" | "ARMED" | "SUSPENDED";
  configuration_version: number;
}

export async function armAutomation(params: {
  reason: string;
  confirmation: string;
  expectedVersion?: number;
}): Promise<AutomationRpcResult> {
  const { data, error } = await (supabase as any).rpc("arm_comm_hub_automation", {
    p_reason: params.reason,
    p_confirmation: params.confirmation,
    p_expected_version: params.expectedVersion ?? null,
  });
  if (error) throw new Error(error.message ?? "arm_comm_hub_automation failed");
  return data as AutomationRpcResult;
}

export async function disarmAutomation(params: {
  reason: string;
  suspend?: boolean;
}): Promise<AutomationRpcResult> {
  const { data, error } = await (supabase as any).rpc("disarm_comm_hub_automation", {
    p_reason: params.reason,
    p_suspend: params.suspend ?? false,
  });
  if (error) throw new Error(error.message ?? "disarm_comm_hub_automation failed");
  return data as AutomationRpcResult;
}

/** Translate raw server errors to plain-language operator messages. */
export function mapAutomationError(msg: string): string {
  if (msg.includes("automation_certification_evidence_incomplete")) {
    return "Automation could not be armed. Lifecycle certification evidence is not yet available (Phase 4B).";
  }
  if (msg.includes("automation_already_armed")) return "Automation is already armed.";
  if (msg.includes("automation_not_in_automated_production")) {
    return "Automation can only be armed while the platform is in Automated Production.";
  }
  if (msg.includes("typed_confirmation_mismatch")) return "Confirmation phrase does not match.";
  if (msg.includes("reason_required")) return "A reason is required.";
  if (msg.includes("configuration_version_conflict")) {
    return "Settings were changed elsewhere. Refresh and try again.";
  }
  if (msg.includes("not_authorised")) return "You do not have permission to change automation.";
  if (msg.includes("authentication_required")) return "Your session has expired. Please sign in again.";
  return "Automation could not be armed. No scheduler or automatic processing was enabled.";
}
