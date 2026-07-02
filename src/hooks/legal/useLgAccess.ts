import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Legal access model — role-type based, capability driven, fully configurable.
 *
 * The system has six legal role-types:
 *   LG_CASE_HANDLER      — owns cases, takes substantive legal actions
 *   LG_LEGAL_ASSISTANT   — prepares drafts, no approval/sending
 *   LG_REVIEWER          — reviews assistant drafts before approval
 *   LG_APPROVER          — final sign-off (lawyer)
 *   LG_ADMIN             — full legal admin, can configure policies/mappings
 *   LG_READ_ONLY         — view only
 *
 * The mapping from real system roles (Security module) to legal role-types
 * lives in `lg_role_type_mapping` so a small department can give one person
 * many role-types, and a large department can split them across people.
 *
 * Capabilities below are intentionally split into PREPARE vs APPROVE so the UI
 * can render different action buttons for assistants vs lawyers.
 */

export type LgRoleType =
  | "LG_CASE_HANDLER"
  | "LG_LEGAL_ASSISTANT"
  | "LG_REVIEWER"
  | "LG_APPROVER"
  | "LG_ADMIN"
  | "LG_READ_ONLY";

// Legacy role aliases — kept for backward compatibility with older code that
// still imports `LgRole`. Maps onto the new role-type model.
export type LgRole =
  | "LEGAL_OFFICER"
  | "SENIOR_LEGAL_OFFICER"
  | "LEGAL_MANAGER"
  | "LEGAL_READ_ONLY";

export type LgCapability =
  // module / view
  | "viewLegalModule"
  | "viewCase" | "createCase" | "editCase" | "closeCase"
  | "viewConfidentialDocuments" | "exportData"
  // referral
  | "acceptReferral" | "rejectReferral" | "requestInformation"
  // assignment
  | "assignOfficer" | "reassignCase" | "changeStage"
  // notices
  | "prepareNotice" | "approveNotice" | "sendNotice" | "generateNotice"
  // hearings
  | "prepareHearingBundle" | "addHearing" | "recordHearingOutcome" | "confirmHearingOutcome"
  // documents / parties / tasks
  | "uploadDocument" | "linkDocument" | "updateParties" | "draftTask" | "assignTask"
  // settlements
  | "draftSettlement" | "createSettlement" | "addSettlement" | "approveSettlement"
  // payment arrangements
  | "linkPaymentArrangement"
  // fees
  | "draftFee" | "applyFeeBundle" | "addManualFee"
  | "approveFee" | "postFee"
  | "requestWaiver" | "approveWaiver"
  // orders
  | "createOrder" | "addOrder" | "recordOrder"
  // EPIC-06A — recoverable liabilities
  | "viewLiability" | "createLiability" | "editLiability" | "deleteLiability"
  | "mergeLiability" | "splitLiability"
  | "allocatePayment" | "overrideAllocation" | "overrideLimitation" | "overrideAmount"
  | "writeOffLiability"
  | "linkLiabilityHearing" | "linkLiabilityOrder" | "linkLiabilityArrangement"
  | "linkLiabilitySettlement" | "linkLiabilityAppeal" | "linkLiabilityEnforcement"
  // admin
  | "manageTemplates" | "configureFees" | "configurePolicy" | "manageRoleMapping";

export const LG_BASE_MATRIX: Record<LgRoleType, LgCapability[]> = {
  LG_READ_ONLY: ["viewLegalModule", "viewCase", "viewLiability"],
  LG_LEGAL_ASSISTANT: [
    "viewLegalModule", "viewCase",
    "requestInformation",
    "prepareNotice", "generateNotice",
    "prepareHearingBundle",
    "uploadDocument", "linkDocument", "updateParties",
    "draftTask",
    "draftSettlement",
    "draftFee", "applyFeeBundle", "addManualFee", "requestWaiver",
    "recordOrder",
  ],
  LG_CASE_HANDLER: [
    "viewLegalModule", "viewCase", "createCase", "editCase",
    "requestInformation",
    "prepareNotice", "generateNotice",
    "addHearing", "prepareHearingBundle",
    "uploadDocument", "linkDocument", "updateParties",
    "draftTask", "assignTask",
    "draftSettlement", "createSettlement", "addSettlement",
    "linkPaymentArrangement",
    "draftFee", "applyFeeBundle", "addManualFee", "requestWaiver",
    "createOrder", "addOrder", "recordOrder",
    "changeStage",
    "exportData",
  ],
  LG_REVIEWER: [
    "viewLegalModule", "viewCase", "editCase",
    "approveNotice",
    "confirmHearingOutcome",
    "viewConfidentialDocuments",
  ],
  LG_APPROVER: [
    "viewLegalModule", "viewCase", "createCase", "editCase", "closeCase",
    "acceptReferral", "rejectReferral", "requestInformation",
    "assignOfficer", "reassignCase", "changeStage",
    "prepareNotice", "approveNotice", "sendNotice", "generateNotice",
    "addHearing", "prepareHearingBundle", "recordHearingOutcome", "confirmHearingOutcome",
    "uploadDocument", "linkDocument", "updateParties", "draftTask", "assignTask",
    "draftSettlement", "createSettlement", "addSettlement", "approveSettlement",
    "linkPaymentArrangement",
    "draftFee", "applyFeeBundle", "addManualFee", "approveFee", "postFee",
    "requestWaiver", "approveWaiver",
    "createOrder", "addOrder", "recordOrder",
    "viewConfidentialDocuments", "exportData",
  ],
  LG_ADMIN: [
    "viewLegalModule", "viewCase", "createCase", "editCase", "closeCase",
    "acceptReferral", "rejectReferral", "requestInformation",
    "assignOfficer", "reassignCase", "changeStage",
    "prepareNotice", "approveNotice", "sendNotice", "generateNotice",
    "addHearing", "prepareHearingBundle", "recordHearingOutcome", "confirmHearingOutcome",
    "uploadDocument", "linkDocument", "updateParties", "draftTask", "assignTask",
    "draftSettlement", "createSettlement", "addSettlement", "approveSettlement",
    "linkPaymentArrangement",
    "draftFee", "applyFeeBundle", "addManualFee", "approveFee", "postFee",
    "requestWaiver", "approveWaiver",
    "createOrder", "addOrder", "recordOrder",
    "viewConfidentialDocuments", "exportData",
    "manageTemplates", "configureFees", "configurePolicy", "manageRoleMapping",
  ],
};

// Built-in fallback mapping in case the lg_role_type_mapping table is empty
// for a given role.  Keeps the system working out-of-the-box.
const FALLBACK_MAPPING: Record<string, LgRoleType[]> = {
  LEGAL_OFFICER:        ["LG_CASE_HANDLER", "LG_REVIEWER", "LG_APPROVER"],
  SENIOR_LEGAL_OFFICER: ["LG_CASE_HANDLER", "LG_REVIEWER", "LG_APPROVER"],
  LEGAL_MANAGER:        ["LG_ADMIN", "LG_APPROVER", "LG_REVIEWER"],
  LEGAL_ASSISTANT:      ["LG_LEGAL_ASSISTANT"],
  LEGAL_READ_ONLY:      ["LG_READ_ONLY"],
  COMPLIANCELEGALOFFICER:["LG_CASE_HANDLER", "LG_REVIEWER", "LG_APPROVER"],
  COMPLIANCEHEAD:       ["LG_ADMIN", "LG_APPROVER"],
  COMPLIANCEADMIN:      ["LG_ADMIN"],
  COMPLIANCEREPORTSVIEWER: ["LG_READ_ONLY"],
};

const ADMIN_SYSTEM_ROLES = new Set([
  "ADMIN", "SYSTEMADMIN", "SUPERADMIN", "LEGALADMIN",
]);

function normaliseSystemRole(role: string): string {
  return role.replace(/[\s-]/g, "_").toUpperCase();
}

export function useLgAccess() {
  const { user } = useSupabaseAuth();

  const { data: rolesData } = useQuery({
    queryKey: ["lg_access_roles", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_roles").select("role").eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.role as string);
    },
    staleTime: 5 * 60_000,
  });

  const { data: mappingData } = useQuery({
    queryKey: ["lg_role_type_mapping_all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lg_role_type_mapping").select("*").eq("is_active", true);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  return useMemo(() => {
    const roles = rolesData ?? [];
    const mappings = mappingData ?? [];
    const normalisedRoles = roles.map(normaliseSystemRole);
    const isAdmin = normalisedRoles.some((r) => ADMIN_SYSTEM_ROLES.has(r));

    const typeSet = new Set<LgRoleType>();

    for (const sysRole of roles) {
      // 1) database-driven mapping (preferred)
      const dbHits = mappings.filter(
        (m: any) => normaliseSystemRole(m.system_role) === normaliseSystemRole(sysRole),
      );
      if (dbHits.length > 0) {
        dbHits.forEach((m: any) => typeSet.add(m.role_type as LgRoleType));
        continue;
      }
      // 2) built-in fallback
      const fb = FALLBACK_MAPPING[normaliseSystemRole(sysRole)];
      if (fb) fb.forEach((t) => typeSet.add(t));
    }

    if (isAdmin) {
      // System admins get every legal role type (full visibility + every capability)
      (["LG_CASE_HANDLER","LG_LEGAL_ASSISTANT","LG_REVIEWER","LG_APPROVER","LG_ADMIN"] as LgRoleType[])
        .forEach((t) => typeSet.add(t));
    }

    const caps = new Set<LgCapability>();
    typeSet.forEach((t) => LG_BASE_MATRIX[t]?.forEach((c) => caps.add(c)));

    // Map back to legacy LgRole strings for callers that still import them
    const legacyRoles: LgRole[] = [];
    if (typeSet.has("LG_ADMIN")) legacyRoles.push("LEGAL_MANAGER");
    if (typeSet.has("LG_APPROVER") && !legacyRoles.includes("LEGAL_MANAGER"))
      legacyRoles.push("SENIOR_LEGAL_OFFICER");
    if (typeSet.has("LG_CASE_HANDLER")) legacyRoles.push("LEGAL_OFFICER");
    if (typeSet.has("LG_READ_ONLY")) legacyRoles.push("LEGAL_READ_ONLY");

    // System administrators bypass every capability check — they must be
     // able to exercise every Legal workflow action without exception.
     const can = (cap: LgCapability) => (isAdmin ? true : caps.has(cap));

    return {
      // new model
      roleTypes: Array.from(typeSet),
      isAssistant: typeSet.has("LG_LEGAL_ASSISTANT") &&
        !typeSet.has("LG_APPROVER") && !typeSet.has("LG_ADMIN"),
      isLawyer: typeSet.has("LG_APPROVER") || typeSet.has("LG_ADMIN"),
      // legacy
      roles: legacyRoles,
      rawRoles: roles,
      isAdmin: isAdmin || typeSet.has("LG_ADMIN"),
      isReadOnly: typeSet.size > 0 &&
        Array.from(typeSet).every((t) => t === "LG_READ_ONLY") && !isAdmin,
      hasLegalAccess: isAdmin || typeSet.size > 0,
      can,
    };
  }, [rolesData, mappingData]);
}
