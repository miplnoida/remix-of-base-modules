/**
 * SSB Implementation Configuration Service
 *
 * Reads/writes only SSB policy tables (ssb_*). These tables store bindings
 * and implementation-specific policy — NEVER duplicate shared-domain
 * (ssp_*), master (md_*), or legacy (bema/ia/bn/ip/er) values here.
 *
 * The service composes resolved config by combining SSB policy rows with
 * shared-domain/master values read through their canonical services.
 */
import { supabase } from "@/integrations/supabase/client";

const db: any = supabase;

export type SsbSectionKey =
  | "general"
  | "address"
  | "identity"
  | "numbering"
  | "contribution_calendar"
  | "financial"
  | "legal"
  | "documents"
  | "communication"
  | "workflow"
  | "benefits_readiness";

export type SsbReadinessStatus = "ready" | "partial" | "missing";

export interface SsbImplementationProfile {
  id: string;
  country_code: string;
  organization_name: string;
  currency_code: string;
  timezone: string;
  status: string;
  notes: string | null;
}

export async function getKnProfile(): Promise<SsbImplementationProfile | null> {
  const { data, error } = await db
    .from("ssb_implementation_profile")
    .select("*")
    .eq("country_code", "KN")
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function updateProfile(id: string, patch: Partial<SsbImplementationProfile>) {
  const { data, error } = await db
    .from("ssb_implementation_profile")
    .update(patch)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function listBy(table: string, profileId: string) {
  const { data, error } = await db.from(table).select("*").eq("profile_id", profileId);
  if (error) throw error;
  return data ?? [];
}

export const ssbImplementationConfigService = {
  getKnProfile,
  updateProfile,
  listAddressPolicies: (pid: string) => listBy("ssb_address_policy", pid),
  listIdentityPolicies: (pid: string) => listBy("ssb_identity_policy", pid),
  listNumberingPolicies: (pid: string) => listBy("ssb_numbering_policy", pid),
  listContributionCalendarPolicies: (pid: string) =>
    listBy("ssb_contribution_calendar_policy", pid),
  listFinancialPolicies: (pid: string) => listBy("ssb_financial_policy", pid),
  listLegalPolicies: (pid: string) => listBy("ssb_legal_policy", pid),
  listDocumentPolicies: (pid: string) => listBy("ssb_document_policy", pid),
  listCommunicationPolicies: (pid: string) => listBy("ssb_communication_policy", pid),
  listWorkflowPolicies: (pid: string) => listBy("ssb_workflow_policy", pid),
};

export interface SsbSectionReadiness {
  key: SsbSectionKey;
  label: string;
  status: SsbReadinessStatus;
  detail: string;
  engine: string;
  canonicalRoute?: string;
  consumers: string[];
  required: boolean;
}

/**
 * Compute readiness for each section by inspecting SSB policy tables AND
 * the canonical shared-domain tables the section binds to. We never write
 * to shared-domain / legacy tables here.
 */
export async function computeReadiness(profileId: string): Promise<SsbSectionReadiness[]> {
  const [
    address, identity, numbering, calendar, financial,
    legal, documents, communication, workflow,
    countryProfileCount, identityTypeCount, legalActCount,
    numberSeqCount, bankCount, docTypeCount, templateCount,
  ] = await Promise.all([
    listBy("ssb_address_policy", profileId),
    listBy("ssb_identity_policy", profileId),
    listBy("ssb_numbering_policy", profileId),
    listBy("ssb_contribution_calendar_policy", profileId),
    listBy("ssb_financial_policy", profileId),
    listBy("ssb_legal_policy", profileId),
    listBy("ssb_document_policy", profileId),
    listBy("ssb_communication_policy", profileId),
    listBy("ssb_workflow_policy", profileId),
    countRows("ssp_country_profile"),
    countRows("ssp_identity_type"),
    countRows("ssp_legal_act"),
    countRows("core_number_sequence"),
    countRows("ssp_bank"),
    countRows("core_dms_document_type"),
    countRows("core_template"),
  ]);

  const s = (
    key: SsbSectionKey, label: string, engine: string, canonicalRoute: string | undefined,
    ready: boolean, partial: boolean, detail: string,
    consumers: string[], required: boolean,
  ): SsbSectionReadiness => ({
    key, label, engine, canonicalRoute,
    status: ready ? "ready" : partial ? "partial" : "missing",
    detail, consumers, required,
  });

  return [
    s("general", "General / Organisation", "Organisation Engine", "/admin/organization",
      true, false, "Profile seeded (KN / XCD / America/St_Kitts).",
      ["All"], true),
    s("address", "Address & Geography", "Geography Engine", "/admin/master-data/countries",
      address.length > 0 && countryProfileCount > 0, countryProfileCount > 0,
      `${address.length} address policy row(s); shared country profiles: ${countryProfileCount}.`,
      ["Employer","Member","Compliance"], true),
    s("identity", "Identity / NIS", "Identity Engine", "/admin/master-data/identity-types",
      identity.length > 0 && identityTypeCount > 0, identityTypeCount > 0,
      `${identity.length} identity binding(s); shared identity types: ${identityTypeCount}.`,
      ["Member","Employer","Claims"], true),
    s("numbering", "Numbering", "Numbering Engine", "/admin/numbering",
      numbering.length >= 3 && numberSeqCount > 0, numberSeqCount > 0 || numbering.length > 0,
      `${numbering.length} numbering policy row(s); platform sequences: ${numberSeqCount}.`,
      ["Employer","Member","Claims","Finance"], true),
    s("contribution_calendar", "Contribution Calendar",
      "Contribution Engine", "/admin/master-data/remittance-schedule",
      calendar.length > 0, false,
      `${calendar.length} calendar policy row(s).`,
      ["Contributions","Employer","Finance"], true),
    s("financial", "Financial / Payment",
      "Financial Engine", "/admin/master-data/banks",
      financial.length > 0 && bankCount > 0, bankCount > 0,
      `${financial.length} financial binding(s); shared banks: ${bankCount}.`,
      ["Finance","Employer","Benefits"], true),
    s("legal", "Legal", "Legal Reference Engine", "/admin/legal-references",
      legal.length > 0 && legalActCount > 0, legalActCount > 0,
      `${legal.length} legal binding(s); shared legal acts: ${legalActCount}.`,
      ["Compliance","Legal","Benefits"], true),
    s("documents", "Documents", "DMS Engine", "/admin/dms/document-types",
      documents.length > 0 && docTypeCount > 0, docTypeCount > 0,
      `${documents.length} document policy row(s); DMS types: ${docTypeCount}.`,
      ["Benefits","Employer","Claims","Compliance"], true),
    s("communication", "Communication", "Communication Engine", "/admin/templates",
      communication.length > 0 && templateCount > 0, templateCount > 0,
      `${communication.length} communication binding(s); templates: ${templateCount}.`,
      ["All"], false),
    s("workflow", "Workflow / SLA", "Workflow Engine", "/admin/workflows",
      workflow.length > 0, false,
      `${workflow.length} workflow policy row(s).`,
      ["Benefits","Claims","Compliance"], false),
  ];
}

async function countRows(table: string): Promise<number> {
  try {
    const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
    if (error) return 0;
    return count ?? 0;
  } catch { return 0; }
}
