/**
 * Central Legal Template Context Builder.
 *
 * Returns one resolved context object for all Legal letter/notice templates.
 * Used by AvailableLettersPanel / GenerateLetterDialog / GenerateNoticeDialog.
 *
 * Goal: every Legal letter must be generated with complete resolved values
 * — recipient, officer, institution, legal references, source module, deadline.
 */
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;
const EMPTY = "";

export type RecipientChoice = {
  party_id?: string | null;
  party_role?: string | null;
  party_type?: string | null;
  name: string;
  salutation?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type OfficerInfo = {
  name: string;
  title: string;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
};

export interface LegalTemplateContext {
  document: {
    reference_no: string;
    generated_date: string;
    generated_datetime: string;
    document_type: string;
    template_code: string;
  };
  institution: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    logo: string;
    letterhead_header: string;
    letterhead_footer: string;
  };
  legal: {
    case_no: string;
    intake_no: string;
    referral_no: string;
    case_type: string;
    matter_type: string;
    current_stage: string;
    action_deadline: string;
    next_hearing_date: string;
    court_reference_no: string;
    court_name: string;
    court_venue: string;
  };
  recipient: RecipientChoice & {
    name: string;
    salutation: string;
    party_type: string;
    party_role: string;
    address_line1: string;
    address_line2: string;
    city: string;
    country: string;
    email: string;
    phone: string;
  };
  officer: OfficerInfo & {
    name: string;
    title: string;
    email: string;
    phone: string;
    department: string;
  };
  source: {
    module: string;
    reference_no: string;
    submitted_by: string;
    submitted_department: string;
    source_case_no: string;
    claim_no: string;
    compliance_case_no: string;
  };
  employer: {
    employer_no: string;
    employer_name: string;
    trading_name: string;
    address: string;
    contact_person: string;
  };
  insured_person: {
    ssn: string;
    name: string;
    address: string;
    claim_no: string;
    benefit_type: string;
  };
  financial: {
    claim_amount: string;
    outstanding_amount: string;
    paid_amount: string;
    penalty_amount: string;
    cost_amount: string;
    currency: string;
  };
  legal_references: {
    list: string;
    act_names: string;
    sections: string;
    formatted_citations: string;
  };
}

export interface BuildContextOptions {
  /** Pre-selected recipient party id (skip auto-pick). */
  recipientPartyId?: string | null;
  /** User-entered action deadline (ISO date). */
  actionDeadline?: string | null;
  /** Document/template type code (for document.document_type). */
  documentType?: string | null;
  /** Template code (for document.template_code). */
  templateCode?: string | null;
  /** Reference number when known (allocated by dispatcher otherwise). */
  referenceNo?: string | null;
  /** Override officer (e.g. current user). */
  officerOverride?: Partial<OfficerInfo> | null;
}

/** Build the full Legal template context for a case. */
export async function buildContext(
  caseId: string,
  templateId?: string | null,
  options: BuildContextOptions = {},
): Promise<LegalTemplateContext> {
  const { data: lg } = await sb.from("lg_case").select("*").eq("id", caseId).maybeSingle();
  if (!lg) throw new Error("Legal case not found");

  // Parallel fetches — independent
  const [partiesRes, refSnap, instRes, employerRes, ipRes, intakeRes, paRes] = await Promise.all([
    sb.from("lg_case_party").select("*").eq("lg_case_id", caseId),
    templateId
      ? sb
          .from("core_template_legal_reference")
          .select("legal_reference_id, core_legal_reference(id, ref_code, act_name, short_title, section, full_reference_text)")
          .eq("template_id", templateId)
      : Promise.resolve({ data: [] }),
    sb.from("system_office_settings").select("*").eq("is_default", true).maybeSingle(),
    lg.employer_id
      ? sb.from("au_er_master").select("er_name, er_no, trade_name, phone, email").eq("id", lg.employer_id).maybeSingle()
      : Promise.resolve({ data: null }),
    lg.person_id
      ? sb.from("ip_master").select("ssn, firstname, surname, middle_name, name_prefix").eq("id", lg.person_id).maybeSingle()
      : Promise.resolve({ data: null }),
    lg.source_intake_id
      ? sb.from("lg_case_intake").select("intake_no, source_module, source_reference, source_record_id, submitted_by, submitted_department").eq("id", lg.source_intake_id).maybeSingle()
      : Promise.resolve({ data: null }),
    lg.payment_arrangement_id
      ? sb
          .from("ce_payment_arrangements")
          .select("arrangement_no, total_amount, collected_amount, waived_amount")
          .eq("id", lg.payment_arrangement_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const parties: any[] = partiesRes.data ?? [];
  const inst: any = instRes?.data ?? {};
  const employer: any = employerRes?.data ?? null;
  const ip: any = ipRes?.data ?? null;
  const intake: any = intakeRes?.data ?? null;
  const pa: any = paRes?.data ?? null;

  // ---- Recipient resolution ----
  const recipient = resolveRecipient(parties, lg, employer, ip, options.recipientPartyId);

  // ---- Officer resolution ----
  const officer = await resolveOfficer(lg, options.officerOverride ?? null);

  // ---- Legal references ----
  const refsArr = (refSnap?.data ?? [])
    .map((r: any) => r.core_legal_reference)
    .filter(Boolean);
  const legalReferences = formatLegalReferences(refsArr);

  // ---- Financials ----
  const total = Number(pa?.total_amount ?? 0);
  const collected = Number(pa?.collected_amount ?? 0);
  const waived = Number(pa?.waived_amount ?? 0);
  const outstanding = pa ? Math.max(0, total - collected - waived) : Number(lg.outstanding_amount_snapshot ?? 0);

  const now = new Date();
  return {
    document: {
      reference_no: options.referenceNo ?? "",
      generated_date: now.toLocaleDateString("en-GB"),
      generated_datetime: now.toLocaleString("en-GB"),
      document_type: options.documentType ?? "",
      template_code: options.templateCode ?? "",
    },
    institution: {
      name: inst.office_name ?? "Social Security Board",
      address: [inst.address_line_1, inst.address_line_2, inst.city, inst.country].filter(Boolean).join(", "),
      phone: inst.phone ?? "",
      email: inst.email ?? "",
      website: inst.website ?? "",
      logo: inst.logo_url ?? "",
      letterhead_header: inst.office_name ?? "",
      letterhead_footer: inst.signature_block ?? "",
    },
    legal: {
      case_no: lg.lg_case_no ?? "",
      intake_no: intake?.intake_no ?? "",
      referral_no: intake?.source_reference ?? "",
      case_type: lg.case_type_code ?? "",
      matter_type: lg.case_category_code ?? "",
      current_stage: lg.current_stage_code ?? "",
      action_deadline: options.actionDeadline ?? (lg.next_action_due_date ?? ""),
      next_hearing_date: lg.next_hearing_date ?? "",
      court_reference_no: lg.court_case_no ?? "",
      court_name: lg.court_name ?? "",
      court_venue: lg.court_venue_code ?? "",
    },
    recipient: {
      party_id: recipient.party_id ?? null,
      name: recipient.name || "",
      salutation: recipient.salutation || "",
      party_type: recipient.party_type || "",
      party_role: recipient.party_role || "",
      address_line1: recipient.address_line1 || "",
      address_line2: recipient.address_line2 || "",
      city: recipient.city || "",
      country: recipient.country || "",
      email: recipient.email || "",
      phone: recipient.phone || "",
    },
    officer: {
      name: officer.name || "",
      title: officer.title || "",
      email: officer.email || "",
      phone: officer.phone || "",
      department: officer.department || "",
    },
    source: {
      module: intake?.source_module ?? lg.source_module ?? "",
      reference_no: intake?.source_reference ?? "",
      submitted_by: intake?.submitted_by ?? "",
      submitted_department: intake?.submitted_department ?? "",
      source_case_no: intake?.source_reference ?? "",
      claim_no: intake?.source_module === "BENEFITS" ? (intake?.source_reference ?? "") : "",
      compliance_case_no: intake?.source_module === "COMPLIANCE" ? (intake?.source_reference ?? "") : "",
    },
    employer: {
      employer_no: employer?.er_no ?? lg.employer_account_no ?? "",
      employer_name: employer?.er_name ?? lg.legacy_employer_name ?? "",
      trading_name: employer?.trade_name ?? "",
      address: employer ? (employer.address ?? "") : "",
      contact_person: "",
    },
    insured_person: {
      ssn: ip?.ssn ?? "",
      name: ip ? [ip.name_prefix, ip.firstname, ip.middle_name, ip.surname].filter(Boolean).join(" ") : (lg.legacy_person_name ?? ""),
      address: "",
      claim_no: intake?.source_module === "BENEFITS" ? (intake?.source_reference ?? "") : "",
      benefit_type: "",
    },
    financial: {
      claim_amount: lg.claim_amount != null ? Number(lg.claim_amount).toFixed(2) : "",
      outstanding_amount: outstanding ? outstanding.toFixed(2) : "",
      paid_amount: collected ? collected.toFixed(2) : "",
      penalty_amount: "",
      cost_amount: "",
      currency: "XCD",
    },
    legal_references: legalReferences,
  };
}

// ---- Recipient resolver ----
function resolveRecipient(
  parties: any[],
  lg: any,
  employer: any,
  ip: any,
  preferredPartyId?: string | null,
): RecipientChoice {
  // Honour explicit selection
  if (preferredPartyId) {
    const p = parties.find((x) => x.id === preferredPartyId);
    if (p) return partyToRecipient(p);
  }

  // Heuristics by case type / stage
  const stage = (lg.current_stage_code ?? "").toUpperCase();
  const caseType = (lg.case_type_code ?? "").toUpperCase();
  const enforcement = /DEMAND|ENFORCE|JUDGMENT|EXECUTION|PENALTY/.test(stage) || /ENFORCEMENT|COLLECTION|DEMAND/.test(caseType);
  const benefit = /BENEFIT|CLAIM|PENSION/.test(caseType);
  const referralUpdate = /REFERRAL_UPDATE|INFO_REQUEST|SOURCE_RESPONSE/.test(stage);

  const order: string[] = referralUpdate
    ? ["SOURCE_DEPARTMENT", "RESPONDENT", "CLAIMANT"]
    : enforcement
    ? ["RESPONDENT", "DEFENDANT", "EMPLOYER"]
    : benefit
    ? ["CLAIMANT", "SUBJECT", "BENEFICIARY"]
    : ["RESPONDENT", "CLAIMANT", "EMPLOYER", "SUBJECT"];

  for (const role of order) {
    const p = parties.find((x) => (x.party_role ?? "").toUpperCase() === role);
    if (p) return partyToRecipient(p);
  }
  // First available party
  if (parties.length) return partyToRecipient(parties[0]);

  // Synthesize from primary entity
  if (employer) {
    return {
      party_role: "RESPONDENT",
      party_type: "EMPLOYER",
      name: employer.er_name ?? "",
      salutation: "Dear Sir/Madam",
      address_line1: employer.address ?? "",
      email: employer.email ?? "",
      phone: employer.phone ?? "",
    };
  }
  if (ip) {
    const name = [ip.name_prefix, ip.firstname, ip.surname].filter(Boolean).join(" ");
    return {
      party_role: "CLAIMANT",
      party_type: "INSURED_PERSON",
      name,
      salutation: name ? `Dear ${name}` : "Dear Sir/Madam",
    };
  }
  return { name: "", salutation: "Dear Sir/Madam" };
}

function partyToRecipient(p: any): RecipientChoice {
  const ci = p.contact_info ?? {};
  return {
    party_id: p.id,
    party_role: p.party_role,
    party_type: p.party_type,
    name: p.display_name ?? "",
    salutation: ci.salutation ?? (p.display_name ? `Dear ${p.display_name}` : "Dear Sir/Madam"),
    address_line1: ci.address_line1 ?? ci.address ?? "",
    address_line2: ci.address_line2 ?? "",
    city: ci.city ?? "",
    country: ci.country ?? "",
    email: ci.email ?? "",
    phone: ci.phone ?? "",
  };
}

// ---- Officer resolver ----
async function resolveOfficer(lg: any, override: Partial<OfficerInfo> | null): Promise<OfficerInfo> {
  if (override && (override.name || override.email)) {
    return {
      name: override.name ?? "",
      title: override.title ?? "Legal Officer",
      email: override.email ?? "",
      phone: override.phone ?? "",
      department: override.department ?? "Legal Department",
    };
  }
  // 1. Assigned legal officer
  if (lg.assigned_legal_officer_id) {
    const { data } = await sb
      .from("lg_staff")
      .select("full_name, email, role_code")
      .eq("id", lg.assigned_legal_officer_id)
      .maybeSingle();
    if (data) {
      return {
        name: data.full_name ?? "",
        title: prettyRole(data.role_code) || "Legal Officer",
        email: data.email ?? "",
        phone: "",
        department: "Legal Department",
      };
    }
  }
  // 2. Team lead / manager fallback
  if (lg.assigned_team_code) {
    const { data } = await sb
      .from("lg_staff")
      .select("full_name, email, role_code")
      .eq("is_active", true)
      .in("role_code", ["LEGAL_MANAGER", "TEAM_LEAD"])
      .limit(1);
    if (data && data[0]) {
      return {
        name: data[0].full_name ?? "",
        title: prettyRole(data[0].role_code) || "Legal Manager",
        email: data[0].email ?? "",
        phone: "",
        department: "Legal Department",
      };
    }
  }
  // 3. System Legal Department fallback
  return {
    name: "Legal Department",
    title: "Legal Department",
    email: "legal@socialsecurity.kn",
    phone: "",
    department: "Legal Department",
  };
}

function prettyRole(code: string | null | undefined): string {
  if (!code) return "";
  return code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---- Legal references formatting ----
function formatLegalReferences(refs: any[]): LegalTemplateContext["legal_references"] {
  if (!refs.length) {
    const fallback = "No specific legal reference linked.";
    return { list: fallback, act_names: "", sections: "", formatted_citations: fallback };
  }
  const lines = refs.map((r) => `• ${r.full_reference_text || `${r.act_name ?? ""} ${r.section ?? ""}`.trim() || r.short_title || r.ref_code}`);
  return {
    list: lines.join("\n"),
    act_names: Array.from(new Set(refs.map((r) => r.act_name).filter(Boolean))).join(", "),
    sections: refs.map((r) => r.section).filter(Boolean).join(", "),
    formatted_citations: lines.join("\n"),
  };
}

// ---- Token utilities ----

/** Flatten the nested context into `{ "group.field": value }` for the dispatcher. */
export function flattenContext(ctx: LegalTemplateContext): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [group, vals] of Object.entries(ctx)) {
    if (vals && typeof vals === "object") {
      for (const [k, v] of Object.entries(vals as any)) {
        if (k === "party_id") continue;
        flat[`${group}.${k}`] = v == null ? "" : String(v);
      }
    }
  }
  return flat;
}

/** Scan template text for `{{token}}` references and return tokens that resolve to empty/missing values. */
export function findUnresolvedTokens(
  texts: (string | null | undefined)[],
  flatCtx: Record<string, string>,
): string[] {
  const seen = new Set<string>();
  const unresolved = new Set<string>();
  for (const t of texts) {
    if (!t) continue;
    const re = /\{\{\s*([\w.]+)\s*\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t)) !== null) {
      const key = m[1];
      if (seen.has(key)) continue;
      seen.add(key);
      const v = flatCtx[key];
      if (v === undefined || v === null || String(v).trim() === "") unresolved.add(key);
    }
  }
  return Array.from(unresolved);
}

/** List all candidate recipients (parties) for user selection. */
export async function listRecipientCandidates(caseId: string): Promise<RecipientChoice[]> {
  const { data } = await sb.from("lg_case_party").select("*").eq("lg_case_id", caseId);
  return (data ?? []).map(partyToRecipient);
}

export const legalTemplateContextService = {
  buildContext,
  flattenContext,
  findUnresolvedTokens,
  listRecipientCandidates,
};

export default legalTemplateContextService;
