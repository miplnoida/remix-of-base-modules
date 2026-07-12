/**
 * EPIC CH-TEST-4 — Canonical Business Communication Recipient Resolver.
 *
 * Safe, read-only recipient resolution for the Communication Test &
 * Diagnostics console. Does NOT create requests/messages, does NOT call
 * providers, does NOT write to communication_hub_trace.
 *
 * Registry-driven: each entry maps `${module}:${event}` to an internal
 * resolver function. The console only enables `resolved_business` mode
 * when a resolver exists and returns `ok`.
 *
 * First resolver wired:
 *   LEGAL / INTERNAL_CASE_ASSIGNMENT_NOTICE
 *   entity: legal_case  → lg_case_assignment (is_current=true)
 *                       → resolve_legal_officer_for_notice(user_id)
 */
import { supabase } from "@/integrations/supabase/client";

const db: any = supabase;

export type RecipientResolverMode = "resolved_business" | "resolved_with_override";
export type RecipientResolverStatus = "ok" | "blocked" | "not_configured";

export interface ResolveRecipientInput {
  moduleCode: string;
  eventCode: string;
  entityType?: string | null;
  entityId?: string | null;
  referenceNo?: string | null;
  payload?: Record<string, unknown>;
  mode: RecipientResolverMode;
}

export interface ResolvedRecipient {
  ok: boolean;
  recipient_mode: RecipientResolverMode;
  recipient_email_masked: string | null;
  /** Full email for internal send-payload use only. Never render this in general UI. */
  recipient_email_internal: string | null;
  recipient_name: string | null;
  recipient_domain: string | null;
  recipient_source: string | null;
  resolver_type: string | null;
  resolver_name: string | null;
  resolver_status: RecipientResolverStatus;
  blockers: string[];
  warnings: string[];
  technical_details: Record<string, unknown>;
}

export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const head = local.slice(0, 2);
  return `${head}${"*".repeat(Math.max(1, local.length - 2))}@${domain}`;
}

function domainOf(email: string | null | undefined): string | null {
  if (!email) return null;
  const parts = email.split("@");
  return parts.length === 2 ? parts[1].toLowerCase() : null;
}

// ---------------------------------------------------------------------------
// Resolver: LEGAL / INTERNAL_CASE_ASSIGNMENT_NOTICE
// ---------------------------------------------------------------------------
async function resolveLegalAssignedOfficer(input: ResolveRecipientInput): Promise<ResolvedRecipient> {
  const base: ResolvedRecipient = {
    ok: false,
    recipient_mode: input.mode,
    recipient_email_masked: null,
    recipient_email_internal: null,
    recipient_name: null,
    recipient_domain: null,
    recipient_source: "lg_case_assignment.assigned_to_user_id → resolve_legal_officer_for_notice",
    resolver_type: "internal_user_lookup",
    resolver_name: "legal.assigned_officer",
    resolver_status: "not_configured",
    blockers: [],
    warnings: [],
    technical_details: {},
  };

  const entityId = (input.entityId ?? "").trim();
  if (!entityId) {
    base.blockers.push("entity_required");
    base.resolver_status = "blocked";
    return base;
  }
  if (input.entityType && input.entityType !== "legal_case") {
    base.warnings.push("entity_type_mismatch_expected_legal_case");
  }

  // Look up current assignment. Accept either lg_case UUID or reference_no.
  let assignmentUserId: string | null = null;
  try {
    let caseId = entityId;
    // If it doesn't look like a UUID, try resolving from reference/case_no.
    if (!/^[0-9a-f-]{36}$/i.test(caseId)) {
      const { data: c } = await db
        .from("lg_case")
        .select("id")
        .or(`case_no.eq.${caseId},reference_no.eq.${caseId}`)
        .maybeSingle();
      caseId = c?.id ?? "";
    }
    if (!caseId) {
      base.blockers.push("recipient_not_found");
      base.resolver_status = "blocked";
      base.technical_details.reason = "legal_case_not_found";
      return base;
    }
    base.technical_details.legal_case_id = caseId;

    const { data: a } = await db
      .from("lg_case_assignment")
      .select("assigned_to_user_id, assigned_at")
      .eq("lg_case_id", caseId)
      .eq("is_current", true)
      .order("assigned_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    assignmentUserId = a?.assigned_to_user_id ?? null;
  } catch (e: any) {
    base.blockers.push("recipient_not_found");
    base.resolver_status = "blocked";
    base.technical_details.error = e?.message ?? "assignment_lookup_failed";
    return base;
  }

  if (!assignmentUserId) {
    base.blockers.push("recipient_not_found");
    base.resolver_status = "blocked";
    base.technical_details.reason = "no_current_assignment";
    return base;
  }
  base.technical_details.assigned_to_user_id = assignmentUserId;

  // Secure RPC: does not expose profiles.email to any other query surface.
  const { data: officerRaw, error } = await db.rpc("resolve_legal_officer_for_notice", {
    p_user_id: assignmentUserId,
  });
  if (error) {
    base.blockers.push("recipient_not_found");
    base.resolver_status = "blocked";
    base.technical_details.rpc_error = error.message;
    return base;
  }
  const officer: any = officerRaw ?? {};
  const email: string | null = officer.email ?? null;
  const eligible: boolean = !!officer.eligible_for_internal_pilot;

  base.recipient_name = officer.full_name ?? officer.user_code ?? null;
  base.recipient_email_internal = email;
  base.recipient_email_masked = maskEmail(email);
  base.recipient_domain = domainOf(email);
  base.technical_details.resolver_fallback_reason = officer.fallback_reason ?? null;
  base.technical_details.eligible_for_internal_pilot = eligible;

  if (!email) {
    base.blockers.push("recipient_invalid");
    base.resolver_status = "blocked";
    return base;
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    base.blockers.push("recipient_invalid");
    base.resolver_status = "blocked";
    return base;
  }
  if (!eligible) {
    base.blockers.push("recipient_not_internal");
    base.resolver_status = "blocked";
    return base;
  }

  base.ok = true;
  base.resolver_status = "ok";
  return base;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------
type ResolverFn = (input: ResolveRecipientInput) => Promise<ResolvedRecipient>;

const RESOLVER_REGISTRY: Record<string, {
  resolverName: string;
  resolverType: string;
  fn: ResolverFn;
}> = {
  "LEGAL:INTERNAL_CASE_ASSIGNMENT_NOTICE": {
    resolverName: "legal.assigned_officer",
    resolverType: "internal_user_lookup",
    fn: resolveLegalAssignedOfficer,
  },
};

export function hasRecipientResolver(moduleCode: string, eventCode: string): boolean {
  return !!RESOLVER_REGISTRY[`${moduleCode}:${eventCode}`];
}

export function listResolverKeys(): string[] {
  return Object.keys(RESOLVER_REGISTRY);
}

export async function resolveBusinessCommunicationRecipient(
  input: ResolveRecipientInput,
): Promise<ResolvedRecipient> {
  const entry = RESOLVER_REGISTRY[`${input.moduleCode}:${input.eventCode}`];
  if (!entry) {
    return {
      ok: false,
      recipient_mode: input.mode,
      recipient_email_masked: null,
      recipient_email_internal: null,
      recipient_name: null,
      recipient_domain: null,
      recipient_source: null,
      resolver_type: null,
      resolver_name: null,
      resolver_status: "not_configured",
      blockers: ["recipient_resolver_missing"],
      warnings: [],
      technical_details: {},
    };
  }
  return entry.fn(input);
}
