/**
 * EPIC CH-P4 — Review policy runtime enforcement helper.
 *
 * Evaluates whether an event is ready for live auto-send based on the
 * `communication_hub_event_review_policy` row plus rendered payload state.
 *
 * Returns structured blockers; live auto-send MUST refuse when any
 * blocker is present. Dry-run may warn instead.
 *
 * This helper is read-only: no writes, no sends.
 */
import { supabase } from "@/integrations/supabase/client";

const db: any = supabase;

export type ReviewPolicyBlockerCode =
  | "review_policy_missing"
  | "preview_required"
  | "template_not_approved_for_internal"
  | "template_version_not_approved"
  | "unresolved_tokens_present"
  | "dummy_template_wording_detected";

export interface EvaluateReviewPolicyInput {
  moduleCode: string;
  eventCode: string;
  channel?: string;
  previewShown?: boolean;
  renderedTemplateVersionId?: string | null;
  unresolvedTokens?: string[];
  renderedSubject?: string | null;
  renderedBody?: string | null;
  mode: "dry_run" | "live";
}

export interface EvaluateReviewPolicyResult {
  authorized: boolean;
  blockers: ReviewPolicyBlockerCode[];
  warnings: ReviewPolicyBlockerCode[];
  policy: any | null;
  note: string;
}

const DUMMY_PATTERNS = [/\btest\b/i, /\bdummy\b/i, /\bplaceholder\b/i, /\{\{[^}]+\}\}/];

export async function evaluateEventReviewPolicy(
  input: EvaluateReviewPolicyInput,
): Promise<EvaluateReviewPolicyResult> {
  const blockers: ReviewPolicyBlockerCode[] = [];
  const warnings: ReviewPolicyBlockerCode[] = [];

  const { data: policy } = await db
    .from("communication_hub_event_review_policy")
    .select("*")
    .eq("module_code", input.moduleCode)
    .eq("event_code", input.eventCode)
    .eq("channel", input.channel ?? "email")
    .maybeSingle();

  if (!policy) {
    blockers.push("review_policy_missing");
    return {
      authorized: false,
      blockers,
      warnings,
      policy: null,
      note: "No review policy configured.",
    };
  }

  if (policy.preview_required && !input.previewShown) {
    blockers.push("preview_required");
  }

  if (policy.require_template_approval) {
    if (policy.approval_status !== "approved_internal" && policy.approval_status !== "approved_external") {
      blockers.push("template_not_approved_for_internal");
    }
    if (
      policy.approved_template_version_id &&
      input.renderedTemplateVersionId &&
      policy.approved_template_version_id !== input.renderedTemplateVersionId
    ) {
      blockers.push("template_version_not_approved");
    }
  }

  if (input.unresolvedTokens && input.unresolvedTokens.length > 0) {
    blockers.push("unresolved_tokens_present");
  }

  const composite = [input.renderedSubject ?? "", input.renderedBody ?? ""].join(" ");
  if (composite && DUMMY_PATTERNS.some((r) => r.test(composite))) {
    if (input.mode === "live") blockers.push("dummy_template_wording_detected");
    else warnings.push("dummy_template_wording_detected");
  }

  // Dry-run: convert blockers other than review_policy_missing/preview_required to warnings.
  if (input.mode === "dry_run") {
    const keepAsBlockers = new Set<ReviewPolicyBlockerCode>(["review_policy_missing"]);
    const remaining = blockers.filter((b) => keepAsBlockers.has(b));
    warnings.push(...blockers.filter((b) => !keepAsBlockers.has(b)));
    return {
      authorized: remaining.length === 0,
      blockers: remaining,
      warnings,
      policy,
      note: remaining.length ? "Blocked by review policy." : "Dry-run authorized with warnings.",
    };
  }

  return {
    authorized: blockers.length === 0,
    blockers,
    warnings,
    policy,
    note: blockers.length ? "Blocked by review policy." : "Review policy authorized.",
  };
}
