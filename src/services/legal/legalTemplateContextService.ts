/**
 * Central Legal Template Context Builder.
 *
 * One resolver for every Legal letter/notice template. It deliberately returns
 * printable fallback text for optional fields so generated documents never show
 * raw {{tokens}} or blank-looking gaps. Required data is still validated in the
 * generation dialog before dispatch.
 */
import { supabase } from "@/integrations/supabase/client";
import { formatDateForDisplay } from "@/lib/format-config";
import {
  resolveEnterpriseContext,
  type EnterpriseContext,
} from "@/lib/enterprise/enterpriseContextResolver";

const sb = supabase as any;

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
    seal: string;
    letterhead_header: string;
    letterhead_footer: string;
    print_footer: string;
    disclaimer: string;
    email_signature_html: string;
    email_signature_text: string;
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
    regno: string;
    employer_name: string;
    name: string;
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
  finance: {
    amount_due: string;
    period: string;
    due_date: string;
  };
  hearing: {
    date: string;
    time: string;
    venue: string;
  };
  payment_arrangement: {
    reference: string;
    start_date: string;
    outstanding_amount: string;
  };
  appeal: {
    date: string;
  };
  legal_references: {
    list: string;
    act_names: string;
    sections: string;
    formatted_citations: string;
  };
}

export interface BuildContextOptions {
  recipientPartyId?: string | null;
  actionDeadline?: string | null;
  documentType?: string | null;
  templateCode?: string | null;
  referenceNo?: string | null;
  officerOverride?: Partial<OfficerInfo> | null;
}

export interface BuildContextOptions {
  recipientPartyId?: string | null;
  actionDeadline?: string | null;
  documentType?: string | null;
  templateCode?: string | null;
  referenceNo?: string | null;
  officerOverride?: Partial<OfficerInfo> | null;
  locationId?: string | null;
  /**
   * Pre-resolved enterprise context. When provided the resolver is not called
   * again — letter UIs that already loaded context can pass it through.
   */
  enterpriseContext?: EnterpriseContext | null;
}

export async function buildContext(
  caseId: string,
  templateId?: string | null,
  options: BuildContextOptions = {},
): Promise<LegalTemplateContext> {
  const { data: lg } = await sb.from("lg_case").select("*").eq("id", caseId).maybeSingle();
  if (!lg) throw new Error("Legal case not found");

  const [
    partiesRes,
    refSnap,
    instRes,
    employerRes,
    ipRes,
    intakeRes,
    paRes,
    actionsRes,
    hearingsRes,
    deadlinesRes,
    referralRes,
    feeRes,
    paLinkRes,
  ] = await Promise.all([
    sb.from("lg_case_party").select("*").eq("lg_case_id", caseId),
    templateId
      ? sb
          .from("core_template_legal_reference")
          .select("legal_reference_id, core_legal_reference(id, ref_code, act_name, short_title, section, full_reference_text)")
          .eq("template_id", templateId)
          .order("display_order", { ascending: true })
      : Promise.resolve({ data: [] }),
    sb.from("system_office_settings").select("*").eq("is_default", true).maybeSingle(),
    lg.employer_id
      ? sb
          .from("au_er_master")
          .select("er_name, er_no, trade_name, phone, email, hq_addr1, hq_addr2, maddr1, maddr2")
          .eq("id", lg.employer_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    lg.person_id
      ? sb
          .from("ip_master")
          .select("ssn, firstname, surname, middle_name, name_prefix, resident_addr1, resident_addr2, mail_addr1, mail_addr2, phone, email_addr")
          .eq("id", lg.person_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    lg.source_intake_id
      ? sb
          .from("lg_case_intake")
          .select("intake_no, source_module, source_reference, source_record_id, submitted_by, submitted_department")
          .eq("id", lg.source_intake_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    lg.payment_arrangement_id
      ? sb
          .from("ce_payment_arrangements")
          .select("arrangement_number, total_debt, total_paid, start_date, next_due_date")
          .eq("id", lg.payment_arrangement_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    sb.from("lg_case_action").select("*").eq("case_id", caseId),
    sb.from("lg_hearing").select("*").eq("lg_case_id", caseId),
    sb.from("lg_case_deadline").select("*").eq("lg_case_id", caseId).eq("is_satisfied", false),
    sb.from("legal_referral").select("*").eq("legal_case_id", caseId).maybeSingle(),
    sb.from("lg_fee_charge").select("*").eq("lg_case_id", caseId),
    sb.from("lg_payment_arrangement_link").select("*").eq("lg_case_id", caseId).eq("active", true).limit(1),
  ]);

  const parties: any[] = partiesRes.data ?? [];
  const inst: any = instRes?.data ?? {};
  const employer: any = employerRes?.data ?? null;
  const ip: any = ipRes?.data ?? null;
  const intake: any = intakeRes?.data ?? null;
  const actions: any[] = actionsRes?.data ?? [];
  const hearings: any[] = hearingsRes?.data ?? [];
  const deadlines: any[] = deadlinesRes?.data ?? [];
  const referral: any = referralRes?.data ?? null;
  const fees: any[] = feeRes?.data ?? [];
  const paLink: any = paLinkRes?.data?.[0] ?? null;
  let pa: any = paRes?.data ?? null;

  if (!pa && paLink?.payment_arrangement_id) {
    const { data } = await sb
      .from("ce_payment_arrangements")
      .select("arrangement_number, total_debt, total_paid, start_date, next_due_date")
      .eq("id", paLink.payment_arrangement_id)
      .maybeSingle();
    pa = data ?? null;
  }

  const recipient = resolveRecipient(parties, lg, employer, ip, options.recipientPartyId);
  const officer = await resolveOfficer(lg, options.officerOverride ?? null);

  const refsArr = (refSnap?.data ?? []).map((r: any) => r.core_legal_reference).filter(Boolean);
  const legalReferences = formatLegalReferences(refsArr);

  const currency = "XCD";
  const actionOutstanding = sumMoney(actions, "outstanding_amount");
  const actionTotal = sumMoney(actions, "total_amount");
  const actionPaid = sumMoney(actions, "amount_paid");
  const actionPrincipal = sumMoney(actions, "principal_amount");
  const actionPenalty = sumMoney(actions, "penalty_amount") + sumMoney(actions, "interest_amount");
  const actionCosts = sumMoney(actions, "cost_amount") + sumMoney(fees, "net_amount") + sumMoney(fees, "amount");
  const total = Number(pa?.total_amount ?? pa?.total_debt ?? paLink?.arranged_amount ?? 0);
  const collected = Number(pa?.collected_amount ?? pa?.total_paid ?? paLink?.paid_amount ?? 0);
  const waived = Number(pa?.waived_amount ?? 0);
  const arrangementOutstanding = paLink?.outstanding_amount != null
    ? Number(paLink.outstanding_amount)
    : pa
      ? Math.max(0, total - collected - waived)
      : 0;
  const outstanding = firstPositive([
    actionOutstanding,
    arrangementOutstanding,
    lg.total_outstanding,
    lg.outstanding_amount_snapshot,
    lg.claim_amount,
    referral?.exposure_amount,
  ]);
  const claimAmount = firstPositive([lg.claim_amount, actionTotal, actionPrincipal, referral?.exposure_amount, outstanding]);
  const paidAmount = firstPositive([actionPaid, collected]);
  const actionDeadline = resolveActionDeadline(options.actionDeadline, lg, deadlines);
  const latestHearing = resolveLatestHearing(hearings, lg);
  const financePeriod = resolveFinancePeriod(actions, referral, intake);
  const sourceModule = intake?.source_module ?? lg.source_module ?? referral?.source_module ?? "";
  const sourceReference = intake?.source_reference ?? referral?.source_reference_no ?? referral?.referral_no ?? "";
  const generatedAt = new Date();

  return {
    document: {
      reference_no: options.referenceNo ?? "",
      generated_date: generatedAt.toLocaleDateString("en-GB"),
      generated_datetime: generatedAt.toLocaleString("en-GB"),
      document_type: options.documentType ?? "",
      template_code: options.templateCode ?? "",
    },
    institution: {
      name: inst.office_name ?? "St. Christopher and Nevis Social Security Board",
      address: compactAddress([inst.address_line_1, inst.address_line_2, inst.city, inst.country], "Bay Road, Basseterre, St. Kitts"),
      phone: inst.phone ?? "+1 (869) 465-2535",
      email: inst.email ?? "legal@socialsecurity.kn",
      website: inst.website ?? "",
      logo: inst.logo_url ?? "",
      letterhead_header: inst.office_name ?? "St. Christopher and Nevis Social Security Board",
      letterhead_footer: inst.signature_block ?? "Legal Department, Social Security Board",
    },
    legal: {
      case_no: lg.lg_case_no ?? "",
      intake_no: intake?.intake_no ?? "Not applicable",
      referral_no: (referral?.referral_no ?? sourceReference) || "Not applicable",
      case_type: lg.case_type_code ?? "Not specified",
      matter_type: lg.case_category_code ?? "Not specified",
      current_stage: lg.current_stage_code ?? "Not specified",
      action_deadline: actionDeadline,
      next_hearing_date: latestHearing.date,
      court_reference_no: lg.court_case_no ?? "Not filed",
      court_name: lg.court_name ?? "Not filed",
      court_venue: latestHearing.venue,
    },
    recipient: {
      party_id: recipient.party_id ?? null,
      name: recipient.name || "",
      salutation: recipient.salutation || "Sir/Madam",
      party_type: recipient.party_type || "Not specified",
      party_role: recipient.party_role || "Not specified",
      address_line1: recipient.address_line1 || "Address not recorded",
      address_line2: recipient.address_line2 || "",
      city: recipient.city || "",
      country: recipient.country || "St. Kitts and Nevis",
      email: recipient.email || "Not provided",
      phone: recipient.phone || "Not provided",
    },
    officer: {
      name: officer.name || "Legal Department",
      title: officer.title || "Legal Officer",
      email: officer.email || "legal@socialsecurity.kn",
      phone: officer.phone || "Not provided",
      department: officer.department || "Legal Department",
    },
    source: {
      module: sourceModule || "Not specified",
      reference_no: sourceReference || "Not specified",
      submitted_by: intake?.submitted_by ?? "Not recorded",
      submitted_department: (intake?.submitted_department ?? sourceModule) || "Not recorded",
      source_case_no: sourceReference || "Not specified",
      claim_no: sourceModule === "BENEFITS" ? sourceReference || "Not specified" : "Not applicable",
      compliance_case_no: sourceModule === "COMPLIANCE" ? sourceReference || "Not specified" : "Not applicable",
    },
    employer: {
      employer_no: employer?.er_no ?? lg.employer_account_no ?? "Not provided",
      regno: employer?.er_no ?? lg.employer_account_no ?? "Not provided",
      employer_name: employer?.er_name ?? lg.legacy_employer_name ?? "Not provided",
      name: employer?.er_name ?? lg.legacy_employer_name ?? "Not provided",
      trading_name: employer?.trade_name ?? "Not provided",
      address: compactAddress([employer?.hq_addr1, employer?.hq_addr2, employer?.maddr1, employer?.maddr2], "Not provided"),
      contact_person: "Not provided",
    },
    insured_person: {
      ssn: ip?.ssn ?? "Not provided",
      name: ip ? [ip.name_prefix, ip.firstname, ip.middle_name, ip.surname].filter(Boolean).join(" ") : (lg.legacy_person_name ?? "Not provided"),
      address: compactAddress([ip?.mail_addr1, ip?.mail_addr2, ip?.resident_addr1, ip?.resident_addr2], "Not provided"),
      claim_no: sourceModule === "BENEFITS" ? sourceReference || "Not specified" : "Not applicable",
      benefit_type: "Not provided",
    },
    financial: {
      claim_amount: formatMoney(claimAmount, currency),
      outstanding_amount: formatMoney(outstanding, currency),
      paid_amount: formatMoney(paidAmount, currency),
      penalty_amount: formatMoney(actionPenalty, currency),
      cost_amount: formatMoney(actionCosts, currency),
      currency,
    },
    finance: {
      amount_due: formatMoney(outstanding, currency),
      period: financePeriod,
      due_date: actionDeadline,
    },
    hearing: latestHearing,
    payment_arrangement: {
      reference: pa?.arrangement_no ?? pa?.arrangement_number ?? paLink?.source_reference_no ?? "No payment arrangement on record",
      start_date: formatDateValue(pa?.start_date) || "Not set",
      outstanding_amount: formatMoney(arrangementOutstanding || outstanding, currency),
    },
    appeal: {
      date: actionDeadline,
    },
    legal_references: legalReferences,
  };
}

function resolveRecipient(
  parties: any[],
  lg: any,
  employer: any,
  ip: any,
  preferredPartyId?: string | null,
): RecipientChoice {
  if (preferredPartyId) {
    const p = parties.find((x) => x.id === preferredPartyId);
    if (p) return partyToRecipient(p);
  }

  const stage = (lg.current_stage_code ?? "").toUpperCase();
  const caseType = (lg.case_type_code ?? "").toUpperCase();
  const enforcement = /DEMAND|ENFORCE|JUDGMENT|EXECUTION|PENALTY|CONTRIBUTION|ARREARS/.test(stage) || /ENFORCEMENT|COLLECTION|DEMAND|CONTRIBUTION|ARREARS/.test(caseType);
  const benefit = /BENEFIT|CLAIM|PENSION|OVERPAYMENT/.test(caseType);
  const referralUpdate = /REFERRAL_UPDATE|INFO_REQUEST|SOURCE_RESPONSE/.test(stage);

  const order: string[] = referralUpdate
    ? ["SOURCE_DEPARTMENT", "RESPONDENT", "EMPLOYER", "CLAIMANT"]
    : enforcement && !benefit
      ? ["RESPONDENT", "DEFENDANT", "EMPLOYER", "CLAIMANT"]
      : benefit
        ? ["CLAIMANT", "SUBJECT", "BENEFICIARY", "RESPONDENT"]
        : ["RESPONDENT", "CLAIMANT", "EMPLOYER", "SUBJECT"];

  for (const role of order) {
    const p = parties.find((x) => (x.party_role ?? "").toUpperCase() === role);
    if (p) return partyToRecipient(p);
  }
  if (parties.length) return partyToRecipient(parties[0]);

  if (employer) {
    return {
      party_role: "RESPONDENT",
      party_type: "EMPLOYER",
      name: employer.er_name ?? "",
      salutation: "Sir/Madam",
      address_line1: employer.hq_addr1 ?? employer.maddr1 ?? "",
      address_line2: employer.hq_addr2 ?? employer.maddr2 ?? "",
      email: employer.email ?? "",
      phone: employer.phone ?? "",
    };
  }
  if (ip) {
    const name = [ip.name_prefix, ip.firstname, ip.middle_name, ip.surname].filter(Boolean).join(" ");
    return {
      party_role: "CLAIMANT",
      party_type: "INSURED_PERSON",
      name,
      salutation: ip.name_prefix ?? "Mr./Ms.",
      address_line1: ip.mail_addr1 ?? ip.resident_addr1 ?? "",
      address_line2: ip.mail_addr2 ?? ip.resident_addr2 ?? "",
      email: ip.email_addr ?? "",
      phone: ip.phone ?? "",
    };
  }
  return { name: "", salutation: "Sir/Madam" };
}

function partyToRecipient(p: any): RecipientChoice {
  const ci = p.contact_info ?? {};
  const possibleCity = ci.city ?? (!ci.address_line2 && ci.address2 ? ci.address2 : null);
  return {
    party_id: p.id,
    party_role: p.party_role,
    party_type: p.party_type,
    name: p.display_name ?? "",
    salutation: ci.salutation ?? "Sir/Madam",
    address_line1: ci.address_line1 ?? ci.address ?? "",
    address_line2: ci.city ? (ci.address_line2 ?? ci.address2 ?? "") : "",
    city: possibleCity ?? ci.address_line2 ?? "",
    country: ci.country ?? "St. Kitts and Nevis",
    email: ci.email ?? "",
    phone: ci.phone ?? "",
  };
}

async function resolveOfficer(lg: any, override: Partial<OfficerInfo> | null): Promise<OfficerInfo> {
  if (override && (override.name || override.email)) {
    return {
      name: override.name ?? "Legal Department",
      title: override.title ?? "Legal Officer",
      email: override.email ?? "legal@socialsecurity.kn",
      phone: override.phone ?? "",
      department: override.department ?? "Legal Department",
    };
  }

  if (lg.assigned_legal_officer_id) {
    const { data } = await sb
      .from("lg_staff")
      .select("full_name, email, role_code")
      .eq("id", lg.assigned_legal_officer_id)
      .maybeSingle();
    if (data) {
      return {
        name: data.full_name ?? "Legal Department",
        title: prettyRole(data.role_code) || "Legal Officer",
        email: data.email ?? "legal@socialsecurity.kn",
        phone: "",
        department: "Legal Department",
      };
    }
  }

  const { data: manager } = await sb
    .from("lg_staff")
    .select("full_name, email, role_code")
    .eq("is_active", true)
    .in("role_code", ["LEGAL_MANAGER", "TEAM_LEAD", "LEGAL_OFFICER"])
    .limit(1);
  if (manager?.[0]) {
    return {
      name: manager[0].full_name ?? "Legal Department",
      title: prettyRole(manager[0].role_code) || "Legal Officer",
      email: manager[0].email ?? "legal@socialsecurity.kn",
      phone: "",
      department: "Legal Department",
    };
  }

  return {
    name: "Legal Department",
    title: "Legal Officer",
    email: "legal@socialsecurity.kn",
    phone: "",
    department: "Legal Department",
  };
}

function prettyRole(code: string | null | undefined): string {
  if (!code) return "";
  return code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatLegalReferences(refs: any[]): LegalTemplateContext["legal_references"] {
  if (!refs.length) {
    const fallback = "Legal reference pending configuration.";
    return { list: fallback, act_names: fallback, sections: fallback, formatted_citations: fallback };
  }
  const lines = refs.map((r) => `• ${r.full_reference_text || `${r.act_name ?? ""} ${r.section ?? ""}`.trim() || r.short_title || r.ref_code}`);
  return {
    list: lines.join("<br/>"),
    act_names: Array.from(new Set(refs.map((r) => r.act_name).filter(Boolean))).join(", ") || "Not specified",
    sections: refs.map((r) => r.section).filter(Boolean).join(", ") || "Not specified",
    formatted_citations: lines.join("<br/>"),
  };
}

function sumMoney(rows: any[], field: string): number {
  return rows.reduce((total, row) => total + Number(row?.[field] ?? 0), 0);
}

function firstPositive(values: any[]): number {
  for (const value of values) {
    const n = Number(value ?? 0);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function formatMoney(value: any, currency = "XCD"): string {
  const n = Number(value ?? 0);
  return `${currency} ${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}

function formatDateValue(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return formatDateForDisplay(String(value).slice(0, 10));
  } catch {
    return String(value);
  }
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function resolveActionDeadline(explicit: string | null | undefined, lg: any, deadlines: any[]): string {
  const deadline = explicit
    || lg.next_action_due_date
    || deadlines.map((d) => d.due_date).filter(Boolean).sort()[0]
    || addDaysIso(14);
  return formatDateValue(deadline);
}

function resolveLatestHearing(hearings: any[], lg: any): { date: string; time: string; venue: string } {
  const sorted = [...hearings].sort((a, b) => String(b.scheduled_at ?? b.hearing_date ?? "").localeCompare(String(a.scheduled_at ?? a.hearing_date ?? "")));
  const h = sorted[0] ?? null;
  const scheduled = h?.scheduled_at ? new Date(h.scheduled_at) : null;
  return {
    date: formatDateValue(h?.hearing_date ?? lg.next_hearing_date ?? (scheduled ? scheduled.toISOString() : "")) || "To be scheduled",
    time: h?.hearing_time ?? (scheduled ? scheduled.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "To be confirmed"),
    venue: [h?.court_name, h?.court_room, h?.location].filter(Boolean).join(", ") || lg.court_venue_code || lg.court_name || "To be confirmed",
  };
}

function resolveFinancePeriod(actions: any[], referral: any, intake: any): string {
  const dates = actions.flatMap((a) => [a.period_from, a.period_to]).filter(Boolean).sort();
  if (dates.length) {
    const start = formatDateValue(dates[0]);
    const end = formatDateValue(dates[dates.length - 1]);
    return start === end ? start : `${start} – ${end}`;
  }
  const payload = referral?.source_payload ?? {};
  const from = payload.period_from ?? payload.periodStart ?? payload.period;
  const to = payload.period_to ?? payload.periodEnd;
  if (from || to) {
    return [from ? formatDateValue(String(from)) || String(from) : null, to ? formatDateValue(String(to)) || String(to) : null].filter(Boolean).join(" – ");
  }
  return referral?.source_reference_no || intake?.source_reference || "the referred period on record";
}

function compactAddress(parts: any[], fallback = "Not provided"): string {
  return parts.filter(Boolean).map(String).join(", ") || fallback;
}

export function flattenContext(ctx: LegalTemplateContext): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [group, vals] of Object.entries(ctx)) {
    if (vals && typeof vals === "object") {
      for (const [k, v] of Object.entries(vals as any)) {
        if (k === "party_id") continue;
        flat[`${group}.${k}`] = v == null || String(v).trim() === "" ? "Not provided" : String(v);
      }
    }
  }
  return flat;
}

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