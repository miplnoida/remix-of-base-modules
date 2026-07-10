/**
 * EPIC CH-P4 — Shared DB-backed module automation settings service.
 *
 * Replaces localStorage-based per-browser settings (Legal assignment
 * automation flag) with a shared, audited setting in
 * `communication_hub_module_automation_setting`.
 *
 * All mutation flows through `set_comm_hub_module_automation_setting`,
 * which enforces:
 *   - reason required
 *   - allowed_values check
 *   - typed confirmation for `auto_live_internal`
 *   - audit into `communication_hub_control_audit`
 *
 * No email/queue/message writes here.
 */
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const db: any = supabase;

export interface ModuleAutomationSetting {
  id: string;
  module_code: string;
  setting_key: string;
  setting_value: string;
  environment_scope: string;
  is_enabled: boolean;
  allowed_values: string[];
  description: string | null;
  risk_level: string;
  requires_approval: boolean;
  approved_by: string | null;
  approved_at: string | null;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

export async function getAutomationSetting(
  moduleCode: string,
  settingKey: string,
  environmentScope: string = "production",
): Promise<ModuleAutomationSetting | null> {
  const { data, error } = await db.rpc("get_comm_hub_module_automation_setting", {
    p_module_code: moduleCode,
    p_setting_key: settingKey,
    p_environment_scope: environmentScope,
  });
  if (error) throw error;
  return (data as ModuleAutomationSetting) ?? null;
}

export async function listAutomationSettings(): Promise<ModuleAutomationSetting[]> {
  const { data, error } = await db
    .from("communication_hub_module_automation_setting")
    .select("*")
    .order("module_code", { ascending: true })
    .order("setting_key", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ModuleAutomationSetting[];
}

export interface SetAutomationSettingInput {
  moduleCode: string;
  settingKey: string;
  settingValue: string;
  reason: string;
  typedConfirmation?: string | null;
  environmentScope?: string;
}

export interface SetAutomationSettingResult {
  ok: boolean;
  error?: string;
  expected?: string;
  allowed_values?: string[];
  setting?: ModuleAutomationSetting;
}

export async function setAutomationSetting(
  input: SetAutomationSettingInput,
): Promise<SetAutomationSettingResult> {
  const { data: userData } = await db.auth.getUser();
  const actorId = userData?.user?.id ?? null;
  const { data, error } = await db.rpc("set_comm_hub_module_automation_setting", {
    p_module_code: input.moduleCode,
    p_setting_key: input.settingKey,
    p_setting_value: input.settingValue,
    p_reason: input.reason,
    p_typed_confirmation: input.typedConfirmation ?? null,
    p_actor_user_id: actorId,
    p_environment_scope: input.environmentScope ?? "production",
  });
  if (error) return { ok: false, error: error.message };
  return (data as SetAutomationSettingResult) ?? { ok: false, error: "no_response" };
}

export function useAutomationSetting(
  moduleCode: string,
  settingKey: string,
  environmentScope: string = "production",
) {
  return useQuery({
    queryKey: ["comm-hub-automation-setting", moduleCode, settingKey, environmentScope],
    queryFn: () => getAutomationSetting(moduleCode, settingKey, environmentScope),
    staleTime: 30_000,
  });
}

export function useListAutomationSettings() {
  return useQuery({
    queryKey: ["comm-hub-automation-settings-list"],
    queryFn: listAutomationSettings,
    staleTime: 30_000,
  });
}

export function useSetAutomationSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SetAutomationSettingInput) => setAutomationSetting(input),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["comm-hub-automation-setting", vars.moduleCode, vars.settingKey] });
      qc.invalidateQueries({ queryKey: ["comm-hub-automation-settings-list"] });
    },
  });
}

export function expectedTypedConfirmation(moduleCode: string, settingValue: string): string | null {
  if (settingValue !== "auto_live_internal") return null;
  return `ENABLE AUTO LIVE INTERNAL ${moduleCode.replace(/_/g, " ").toUpperCase()} ASSIGNMENT NOTICE`;
}
