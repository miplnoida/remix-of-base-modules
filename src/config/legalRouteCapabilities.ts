import type { LegalCapability } from "@/hooks/legal/useLegalCapability";

/**
 * Route → required capability mapping for every Legal / Legal Enforcement /
 * Legal Advanced screen. The LegalRouteGuard uses this to decide whether the
 * current user may render the screen. A `null` capability means any
 * authenticated user with ANY legal role (including LEGAL_READ_ONLY) may view.
 *
 * Patterns are matched longest-prefix-first. Use `:id` style placeholders to
 * mirror React Router paths — only the static prefix is matched.
 */
export type LegalCapKey = keyof LegalCapability | "view";

interface RuleEntry {
  prefix: string;
  cap: LegalCapKey;
}

const RULES: RuleEntry[] = [
  // Admin-only configuration surface
  { prefix: "/legal/admin/routing", cap: "canManageRouting" },
  { prefix: "/legal/admin/teams", cap: "canAssignCase" },
  { prefix: "/legal/admin/staff", cap: "canAssignCase" },
  { prefix: "/legal/admin/fees", cap: "canManageReferenceData" },
  { prefix: "/legal/admin/fee-bundles", cap: "canManageReferenceData" },
  { prefix: "/legal/admin/waiver-policies", cap: "canManageReferenceData" },
  { prefix: "/legal/admin/policy", cap: "canManageRouting" },
  { prefix: "/legal/admin/workflow", cap: "canManageRouting" },
  { prefix: "/legal/admin/templates", cap: "canManageTemplates" },
  { prefix: "/legal/admin/codesets", cap: "canManageReferenceData" },
  { prefix: "/legal/admin/code-sets", cap: "canManageReferenceData" },
  { prefix: "/legal/admin/complainant", cap: "canManageReferenceData" },
  { prefix: "/legal/admin/legal-references", cap: "canManageReferenceData" },
  { prefix: "/legal/admin/stage-template-mapping", cap: "canManageRouting" },
  { prefix: "/legal/admin/stage-reference-mapping", cap: "canManageRouting" },
  { prefix: "/legal/admin/stage-document-rules", cap: "canManageRouting" },
  { prefix: "/legal/admin/profile", cap: "canManageReferenceData" },
  { prefix: "/legal/admin/document-types", cap: "canManageReferenceData" },
  { prefix: "/legal/admin/permissions", cap: "canManageRouting" },
  { prefix: "/legal/admin/audit", cap: "canRunIntegrityChecks" },
  { prefix: "/legal/admin/validation", cap: "canRunIntegrityChecks" },
  { prefix: "/legal/admin/referral-integrity", cap: "canRunIntegrityChecks" },
  { prefix: "/legal/admin/case-integrity", cap: "canRunIntegrityChecks" },
  { prefix: "/legal/admin/assignment-integrity", cap: "canRunIntegrityChecks" },
  { prefix: "/legal/admin/sla-rules", cap: "canManageSla" },
  { prefix: "/legal/admin/courts", cap: "canManageReferenceData" },
  { prefix: "/legal/admin/intake-validation", cap: "canRunIntegrityChecks" },
  { prefix: "/legal/admin", cap: "canManageRouting" },
  { prefix: "/legal/settings", cap: "canManageReferenceData" },
  { prefix: "/legal/config", cap: "canManageReferenceData" },
  { prefix: "/legal-advanced/admin", cap: "canManageRouting" },
  { prefix: "/legal-advanced/settings", cap: "canManageReferenceData" },

  // Operational — any legal role (including read-only)
  { prefix: "/legal/referrals-workbench", cap: "canViewWorkbench" },
  { prefix: "/legal/workbench", cap: "canViewWorkbench" },
  { prefix: "/legal/dashboard", cap: "view" },
  { prefix: "/legal/lg/dashboard", cap: "view" },
  { prefix: "/legal/ops", cap: "view" },
  { prefix: "/legal/lg/hearings", cap: "view" },
  { prefix: "/legal/lg/cases", cap: "view" },
  { prefix: "/legal/cases", cap: "view" },
  { prefix: "/legal/case-intake", cap: "view" },
  { prefix: "/legal/case-tracking", cap: "view" },
  { prefix: "/legal/case-detail", cap: "view" },
  { prefix: "/legal/case-edit", cap: "view" },
  { prefix: "/legal/hearings", cap: "view" },
  { prefix: "/legal/court-orders", cap: "view" },
  { prefix: "/legal/enforcement", cap: "view" },
  { prefix: "/legal/notices", cap: "view" },
  { prefix: "/legal/appeals", cap: "view" },
  { prefix: "/legal/evidence", cap: "view" },
  { prefix: "/legal/payment-plans", cap: "view" },
  { prefix: "/legal/reports", cap: "view" },
  { prefix: "/legal/contract-review", cap: "view" },
  { prefix: "/legal/advice", cap: "view" },
  { prefix: "/legal/templates", cap: "view" },
  { prefix: "/legal-advanced", cap: "view" },
  { prefix: "/legal-final", cap: "view" },

  // Catch-all
  { prefix: "/legal", cap: "view" },
];

// Sort longest-prefix-first so admin rules win over generic /legal.
const SORTED_RULES = [...RULES].sort((a, b) => b.prefix.length - a.prefix.length);

export function getRequiredLegalCap(pathname: string): LegalCapKey {
  const match = SORTED_RULES.find((r) => pathname.startsWith(r.prefix));
  return match?.cap ?? "view";
}

export function userCanAccessLegalRoute(
  pathname: string,
  capability: LegalCapability,
): boolean {
  if (!capability.isLegal) return false;
  const required = getRequiredLegalCap(pathname);
  if (required === "view") return true;
  return Boolean(capability[required as keyof LegalCapability]);
}
