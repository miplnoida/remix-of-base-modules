/**
 * Generic Configuration Assignment Resolver.
 *
 * Reads `public.core_configuration_assignment` and returns the single row that
 * wins for the requested (domain, business_event, resource_type, scopeHints)
 * according to the universal scope precedence hierarchy documented in
 * docs/architecture/scope-precedence.md.
 *
 * Precedence (most specific → least):
 *   USER > WORKFLOW_STAGE > WORKFLOW > LOCATION > DEPARTMENT > MODULE > ORG > GLOBAL
 *
 * Within a tier: higher `priority` wins, tie broken by newer `effective_from`.
 */
import { supabase } from "@/integrations/supabase/client";

export type ScopeLevel =
  | "GLOBAL" | "ORG" | "MODULE" | "DEPARTMENT" | "LOCATION"
  | "WORKFLOW" | "WORKFLOW_STAGE" | "USER";

export const SCOPE_PRECEDENCE: ScopeLevel[] = [
  "USER", "WORKFLOW_STAGE", "WORKFLOW",
  "LOCATION", "DEPARTMENT", "MODULE",
  "ORG", "GLOBAL",
];

export interface ScopeHints {
  userId?: string;
  workflowCode?: string;
  stageCode?: string;
  locationId?: string;
  departmentCode?: string;
  moduleCode?: string;
  organizationId?: string;
}

export interface ResolveRequest {
  domain: string;
  businessEvent: string;
  resourceType: string;
  scopeHints?: ScopeHints;
}

export interface AssignmentRow {
  id: string;
  domain: string;
  business_event: string | null;
  scope_level: ScopeLevel;
  scope_ref: Record<string, unknown>;
  resource_type: string;
  resource_ref: Record<string, unknown>;
  rule_set: Record<string, unknown>;
  priority: number;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
  notes: string | null;
}

export interface TraceStep {
  tier: ScopeLevel;
  candidates: number;
  matched: boolean;
  winnerId?: string;
  reason: string;
}

export interface ResolveResult {
  winner: AssignmentRow | null;
  trace: TraceStep[];
}

/** Map scope hints → the scope_ref keys required at each tier. */
function scopeRefFor(tier: ScopeLevel, h: ScopeHints): Record<string, unknown> | null {
  switch (tier) {
    case "USER":           return h.userId ? { user_id: h.userId } : null;
    case "WORKFLOW_STAGE": return h.workflowCode && h.stageCode ? { workflow_code: h.workflowCode, stage_code: h.stageCode } : null;
    case "WORKFLOW":       return h.workflowCode ? { workflow_code: h.workflowCode } : null;
    case "LOCATION":       return h.locationId ? { location_id: h.locationId } : null;
    case "DEPARTMENT":     return h.departmentCode ? { department_code: h.departmentCode } : null;
    case "MODULE":         return h.moduleCode ? { module_code: h.moduleCode } : null;
    case "ORG":            return h.organizationId ? { organization_id: h.organizationId } : {};
    case "GLOBAL":         return {};
  }
}

/** Check: every key in required is present with equal value in candidate. */
function scopeRefMatches(required: Record<string, unknown>, candidate: Record<string, unknown>): boolean {
  for (const [k, v] of Object.entries(required)) {
    if (candidate[k] !== v) return false;
  }
  return true;
}

function withinEffective(row: AssignmentRow, now: Date): boolean {
  if (row.effective_from && new Date(row.effective_from) > now) return false;
  if (row.effective_to && new Date(row.effective_to) < now) return false;
  return true;
}

function pickWinner(rows: AssignmentRow[]): AssignmentRow {
  return rows.slice().sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const af = a.effective_from ? new Date(a.effective_from).getTime() : 0;
    const bf = b.effective_from ? new Date(b.effective_from).getTime() : 0;
    return bf - af;
  })[0];
}

/**
 * Load all active candidate rows for (domain, resource_type). We keep the
 * query broad and filter tiers client-side — the tables are small (config,
 * not runtime), and this keeps the trace exact.
 */
export async function loadCandidates(req: ResolveRequest): Promise<AssignmentRow[]> {
  const { data, error } = await supabase
    .from("core_configuration_assignment")
    .select("*")
    .eq("domain", req.domain)
    .eq("resource_type", req.resourceType)
    .eq("is_active", true);

  if (error) throw error;
  const rows = (data ?? []) as unknown as AssignmentRow[];
  return rows.filter((r) =>
    r.business_event === null || r.business_event === req.businessEvent,
  );
}

export async function resolveConfiguration(req: ResolveRequest): Promise<ResolveResult> {
  const hints = req.scopeHints ?? {};
  const candidates = await loadCandidates(req);
  const now = new Date();
  const active = candidates.filter((r) => withinEffective(r, now));
  const trace: TraceStep[] = [];

  for (const tier of SCOPE_PRECEDENCE) {
    const required = scopeRefFor(tier, hints);
    if (required === null) {
      trace.push({ tier, candidates: 0, matched: false, reason: "hint not provided" });
      continue;
    }
    const tierRows = active.filter(
      (r) => r.scope_level === tier && scopeRefMatches(required, r.scope_ref ?? {}),
    );
    if (tierRows.length === 0) {
      trace.push({ tier, candidates: 0, matched: false, reason: "no active row at this tier" });
      continue;
    }
    const winner = pickWinner(tierRows);
    trace.push({
      tier,
      candidates: tierRows.length,
      matched: true,
      winnerId: winner.id,
      reason: tierRows.length > 1 ? `picked by priority=${winner.priority}` : "single match",
    });
    return { winner, trace };
  }

  return { winner: null, trace };
}
