/**
 * PHASE 4B3 Slice 2 — Canonical variable resolver client.
 *
 * READ-ONLY wrapper around `public.resolve_comm_hub_template_variables`.
 * The browser MUST NOT reproduce the resolution rules. It only forwards
 * the caller-supplied context bundles. The server:
 *   - loads the exact version-bound variable contract,
 *   - reads each variable from its declared source_type and canonical_path,
 *   - materialises the value under the exact template variable name (alias),
 *   - returns a deterministic token map + per-variable evidence,
 *   - returns a deduplicated unresolved-variable list with reason codes.
 *
 * Rendering, snapshot creation, provider dispatch and lifecycle changes are
 * out of scope for this call.
 */
import { supabase } from "@/integrations/supabase/client";

export type CommHubResolutionMode =
  | "PREVIEW_TEST"
  | "CERTIFICATION_TEST"
  | "DRY_RUN_TEST"
  | "CONTROLLED_STUB"
  | "PRODUCTION_EVENT"
  | "DOCUMENT_GENERATION"
  | "MANUAL_CORRESPONDENCE";

export type CommHubVariableReasonCode =
  | "SOURCE_NOT_CONFIGURED"
  | "SOURCE_PATH_MISSING"
  | "SOURCE_VALUE_NULL"
  | "SOURCE_VALUE_BLANK"
  | "SOURCE_TYPE_MISMATCH"
  | "FORMATTER_FAILED"
  | "DEFAULT_NOT_DECLARED"
  | "LATE_BOUND_NOT_AVAILABLE"
  | "RAW_TOKEN_REMAINING"
  | "CONTRACT_MISSING"
  | "CONTRACT_STALE";

export interface CommHubUnresolvedVariable {
  variable: string;
  source_type: string | null;
  canonical_path: string | null;
  reason_code: CommHubVariableReasonCode | string;
  required: boolean;
  occurrence_count: number;
  locations: string[];
}

export interface CommHubVariableEvidenceEntry {
  resolved: boolean;
  source_type: string | null;
  canonical_path: string | null;
  is_required: boolean;
  reason_code?: string;
}

export interface CommHubVariableResolverEnvelope {
  ok: boolean;
  resolution_mode: CommHubResolutionMode | string;
  template_version_id: string | null;
  module_code: string;
  event_code: string;
  channel: string;
  test_scenario_id: string | null;
  test_scenario_key: string | null;
  test_scenario_hash: string | null;
  contract_count: number;
  contract_missing: boolean;
  tokens: Record<string, unknown>;
  evidence: Record<string, CommHubVariableEvidenceEntry>;
  unresolved_variables: CommHubUnresolvedVariable[];
  resolver_version: string;
  resolved_at: string;
}

export interface ResolveCommHubVariablesInput {
  templateVersionId: string | null;
  moduleCode: string;
  eventCode: string;
  channel?: string;
  resolutionMode?: CommHubResolutionMode;
  testScenarioId?: string | null;
  eventPayload?: Record<string, unknown> | null;
  recipientContext?: Record<string, unknown> | null;
  requestContext?: Record<string, unknown> | null;
  systemContext?: Record<string, unknown> | null;
}

export async function resolveCommHubTemplateVariables(
  input: ResolveCommHubVariablesInput,
): Promise<CommHubVariableResolverEnvelope> {
  const { data, error } = await (supabase as any).rpc(
    "resolve_comm_hub_template_variables",
    {
      p_template_version_id: input.templateVersionId,
      p_module_code: input.moduleCode,
      p_event_code: input.eventCode,
      p_channel: input.channel ?? "email",
      p_resolution_mode: input.resolutionMode ?? "PREVIEW_TEST",
      p_test_scenario_id: input.testScenarioId ?? null,
      p_event_payload: input.eventPayload ?? null,
      p_recipient_context: input.recipientContext ?? null,
      p_request_context: input.requestContext ?? null,
      p_system_context: input.systemContext ?? null,
    },
  );
  if (error) throw new Error(error.message ?? "resolve_comm_hub_template_variables failed");
  return data as CommHubVariableResolverEnvelope;
}

/**
 * Deduplicate unresolved variables by name and combine `locations` sets.
 * The server already emits one entry per variable, but callers combining
 * resolver output with a final raw-token safety scan should apply this
 * helper before displaying findings.
 */
export function mergeUnresolvedVariables(
  ...lists: CommHubUnresolvedVariable[][]
): CommHubUnresolvedVariable[] {
  const bag = new Map<string, CommHubUnresolvedVariable>();
  for (const list of lists) {
    for (const item of list ?? []) {
      const key = item.variable;
      const existing = bag.get(key);
      if (!existing) {
        bag.set(key, {
          ...item,
          locations: Array.from(new Set(item.locations ?? [])).sort(),
          occurrence_count: item.occurrence_count ?? 1,
        });
      } else {
        existing.locations = Array.from(
          new Set([...(existing.locations ?? []), ...(item.locations ?? [])]),
        ).sort();
        existing.occurrence_count = (existing.occurrence_count ?? 1) + (item.occurrence_count ?? 1);
        // Keep the most precise (non-generic) reason.
        if (existing.reason_code === "RAW_TOKEN_REMAINING" && item.reason_code !== "RAW_TOKEN_REMAINING") {
          existing.reason_code = item.reason_code;
        }
      }
    }
  }
  return Array.from(bag.values()).sort((a, b) => a.variable.localeCompare(b.variable));
}

/** Plain-language message for the operator UI. */
export function describeUnresolvedVariable(u: CommHubUnresolvedVariable): {
  title: string;
  source: string;
  action: string;
} {
  const source =
    u.source_type === "event_payload"
      ? `Test scenario → ${u.canonical_path ?? "(path missing)"}`
      : u.source_type === "recipient_context"
        ? "Test recipient identity"
        : u.source_type === "request_context"
          ? "Request context (generated on Preview)"
          : u.source_type === "system_context"
            ? "System context (platform-generated)"
            : u.source_type === "template_default"
              ? "Template default"
              : u.source_type === "derived"
                ? "Server-side derived resolver"
                : u.source_type ?? "Unknown source";
  const action =
    u.source_type === "recipient_context"
      ? "Configure recipient display name"
      : u.source_type === "event_payload"
        ? "Add a value to the active test scenario"
        : u.reason_code === "CONTRACT_MISSING"
          ? "Add the variable to the template variable contract"
          : u.reason_code === "CONTRACT_STALE"
            ? "Revalidate the variable contract for this template version"
            : "Complete the missing configuration and prepare a new Preview";
  return {
    title: u.variable.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    source,
    action,
  };
}
