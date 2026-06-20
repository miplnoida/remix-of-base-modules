import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Legal access model — four roles, capability-based.
 *
 * Roles (matched case-insensitive against the central user_roles table):
 *  - LEGAL_OFFICER
 *  - SENIOR_LEGAL_OFFICER
 *  - LEGAL_MANAGER
 *  - LEGAL_READ_ONLY
 *
 * Admin / system-admin always has full legal access.
 */
export type LgRole =
  | "LEGAL_OFFICER"
  | "SENIOR_LEGAL_OFFICER"
  | "LEGAL_MANAGER"
  | "LEGAL_READ_ONLY";

export type LgCapability =
  | "viewCase"
  | "createCase"
  | "editCase"
  | "closeCase"
  | "acceptReferral"
  | "rejectReferral"
  | "assignOfficer"
  | "changeStage"
  | "addHearing"
  | "recordHearingOutcome"
  | "generateNotice"
  | "linkDocument"
  | "createSettlement"
  | "approveSettlement"
  | "postFee"
  | "createOrder"
  | "manageTemplates";

const MATRIX: Record<LgRole, LgCapability[]> = {
  LEGAL_READ_ONLY: ["viewCase"],
  LEGAL_OFFICER: [
    "viewCase", "createCase", "editCase",
    "addHearing", "recordHearingOutcome",
    "generateNotice", "linkDocument",
    "createSettlement", "postFee", "createOrder",
    "changeStage",
  ],
  SENIOR_LEGAL_OFFICER: [
    "viewCase", "createCase", "editCase", "closeCase",
    "acceptReferral", "rejectReferral", "assignOfficer", "changeStage",
    "addHearing", "recordHearingOutcome",
    "generateNotice", "linkDocument",
    "createSettlement", "approveSettlement", "postFee", "createOrder",
  ],
  LEGAL_MANAGER: [
    "viewCase", "createCase", "editCase", "closeCase",
    "acceptReferral", "rejectReferral", "assignOfficer", "changeStage",
    "addHearing", "recordHearingOutcome",
    "generateNotice", "linkDocument",
    "createSettlement", "approveSettlement", "postFee", "createOrder",
    "manageTemplates",
  ],
};

const ADMIN_ROLES = new Set([
  "Admin", "SystemAdmin", "SuperAdmin",
  "LegalAdmin", "Legal Admin",
]);

function normalize(role: string): LgRole | null {
  const r = role.replace(/[\s-]/g, "_").toUpperCase();
  // Canonical legal roles
  if (r === "LEGAL_OFFICER") return "LEGAL_OFFICER";
  if (r === "SENIOR_LEGAL_OFFICER" || r === "LEGAL_SENIOR_OFFICER") return "SENIOR_LEGAL_OFFICER";
  if (r === "LEGAL_MANAGER") return "LEGAL_MANAGER";
  if (r === "LEGAL_READ_ONLY" || r === "LEGAL_READONLY") return "LEGAL_READ_ONLY";
  // Compliance-side legal roles present in the central user_roles table
  if (r === "COMPLIANCELEGALOFFICER" || r === "COMPLIANCE_LEGAL_OFFICER") return "SENIOR_LEGAL_OFFICER";
  if (r === "COMPLIANCEHEAD" || r === "COMPLIANCE_HEAD") return "LEGAL_MANAGER";
  if (r === "COMPLIANCEADMIN" || r === "COMPLIANCE_ADMIN") return "LEGAL_MANAGER";
  if (r === "COMPLIANCEREPORTSVIEWER" || r === "COMPLIANCE_REPORTS_VIEWER") return "LEGAL_READ_ONLY";
  return null;
}

export function useLgAccess() {
  const { user } = useSupabaseAuth();

  const { data: rolesData } = useQuery({
    queryKey: ["lg_access", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.role as string);
    },
    staleTime: 5 * 60_000,
  });

  return useMemo(() => {
    const roles = rolesData ?? [];
    const isAdmin = roles.some((r) => ADMIN_ROLES.has(r));
    const lgRoles = roles.map(normalize).filter((r): r is LgRole => !!r);
    const caps = new Set<LgCapability>();
    if (isAdmin) {
      // All caps
      (Object.values(MATRIX) as LgCapability[][]).forEach((arr) => arr.forEach((c) => caps.add(c)));
    } else {
      lgRoles.forEach((r) => MATRIX[r].forEach((c) => caps.add(c)));
    }
    const can = (cap: LgCapability) => caps.has(cap);
    return {
      roles: lgRoles,
      rawRoles: roles,
      isAdmin,
      isReadOnly: lgRoles.length > 0 && lgRoles.every((r) => r === "LEGAL_READ_ONLY") && !isAdmin,
      hasLegalAccess: isAdmin || lgRoles.length > 0,
      can,
    };
  }, [rolesData]);
}
