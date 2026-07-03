/**
 * Legal Case Enrichment Service
 * -----------------------------
 * Pulls full source-module data into a Legal Case so parties, financial actions,
 * documents and recipient tokens are always populated. Used by:
 *   - lgIntakeService.acceptAndCreateCase  (one-shot on creation)
 *   - legalCaseIntegrityService.repairCase (re-run on broken / partial cases)
 *
 * Idempotent — safe to call repeatedly. Will not duplicate parties / docs / actions
 * that already exist (matched by external_ref_id / dms_document_id / referral_item_id).
 */
import { supabase } from "@/integrations/supabase/client";
import { resolveLegalEnterprise } from "@/lib/enterprise/legalEnterpriseMetadata";

const sb = supabase as any;

export interface EnrichmentResult {
  parties_added: number;
  parties_updated: number;
  documents_linked: number;
  actions_created: number;
  liabilities_created: number;
  liabilities_updated: number;
  amount_set: number | null;
  notes: string[];
}

const empty = (): EnrichmentResult => ({
  parties_added: 0,
  parties_updated: 0,
  documents_linked: 0,
  actions_created: 0,
  liabilities_created: 0,
  liabilities_updated: 0,
  amount_set: null,
  notes: [],
});

// ----------------------------------------------------------------------------
// Party helpers
// ----------------------------------------------------------------------------
async function upsertParty(
  lgCaseId: string,
  party: {
    party_role: string;
    party_type: string;
    display_name: string;
    external_ref_id?: string | null;
    contact_info?: Record<string, unknown> | null;
    representative_name?: string | null;
    notes?: string | null;
  },
  out: EnrichmentResult,
) {
  // Match existing party by external_ref_id (if provided) else by display_name + role
  let existing: any = null;
  if (party.external_ref_id) {
    const { data } = await sb
      .from("lg_case_party")
      .select("*")
      .eq("lg_case_id", lgCaseId)
      .eq("external_ref_id", party.external_ref_id)
      .maybeSingle();
    existing = data;
  }
  if (!existing) {
    const { data } = await sb
      .from("lg_case_party")
      .select("*")
      .eq("lg_case_id", lgCaseId)
      .eq("party_role", party.party_role)
      .eq("display_name", party.display_name)
      .maybeSingle();
    existing = data;
  }

  if (existing) {
    const mergedContact = { ...(existing.contact_info ?? {}), ...(party.contact_info ?? {}) };
    const patch: any = {
      party_type: party.party_type,
      display_name: party.display_name,
      external_ref_id: party.external_ref_id ?? existing.external_ref_id,
      contact_info: mergedContact,
      representative_name: party.representative_name ?? existing.representative_name,
    };
    const { error } = await sb.from("lg_case_party").update(patch).eq("id", existing.id);
    if (!error) out.parties_updated += 1;
    return;
  }
  const { error } = await sb.from("lg_case_party").insert({
    lg_case_id: lgCaseId,
    party_role: party.party_role,
    party_type: party.party_type,
    display_name: party.display_name,
    external_ref_id: party.external_ref_id ?? null,
    contact_info: party.contact_info ?? null,
    representative_name: party.representative_name ?? null,
    notes: party.notes ?? "Auto-imported by case enrichment",
  });
  if (!error) out.parties_added += 1;
  else out.notes.push(`Party insert failed: ${error.message}`);
}

// ----------------------------------------------------------------------------
// Document helpers
// ----------------------------------------------------------------------------
async function linkDocument(
  lgCaseId: string,
  doc: {
    source_module: string;
    source_entity_type?: string | null;
    source_entity_id?: string | null;
    document_category_code: string;
    document_type_code?: string | null;
    title?: string | null;
    file_name?: string | null;
    dms_document_id?: string | null;
    dms_file_id?: string | null;
    mime_type?: string | null;
    size_bytes?: number | null;
  },
  out: EnrichmentResult,
  userCode?: string | null,
) {
  // De-dupe — same source_entity_id linked once
  if (doc.source_entity_id) {
    const { data: exists } = await sb
      .from("lg_document_link")
      .select("id")
      .eq("lg_case_id", lgCaseId)
      .eq("source_entity_id", doc.source_entity_id)
      .maybeSingle();
    if (exists?.id) return;
  }
  let enterpriseMetadata: any = null;
  try {
    enterpriseMetadata = (await resolveLegalEnterprise({
      matterId: lgCaseId,
      matterKind: "LG_CASE",
      documentType: doc.document_type_code ?? null,
    })).metadata;
  } catch { enterpriseMetadata = null; }

  const { error } = await sb.from("lg_document_link").insert({
    lg_case_id: lgCaseId,
    document_category_code: doc.document_category_code,
    document_type_code: doc.document_type_code ?? null,
    document_source: "SOURCE_DEPARTMENT",
    source_module: doc.source_module,
    source_entity_type: doc.source_entity_type ?? null,
    source_entity_id: doc.source_entity_id ?? null,
    title: doc.title ?? doc.file_name ?? "Source document",
    file_name: doc.file_name ?? null,
    dms_document_id: doc.dms_document_id ?? null,
    dms_file_id: doc.dms_file_id ?? null,
    mime_type: doc.mime_type ?? null,
    size_bytes: doc.size_bytes ?? null,
    is_legally_relevant: true,
    storage_provider: "CENTRAL_DMS",
    upload_status: "COMPLETE",
    linked_by: userCode ?? "SYSTEM",
    uploaded_by: userCode ?? "SYSTEM",
    enterprise_metadata: enterpriseMetadata,
  });
  if (!error) out.documents_linked += 1;
  else out.notes.push(`Document link failed: ${error.message}`);
}

// ----------------------------------------------------------------------------
// Action helpers (uses relaxed action_kind / liability_head_code check)
// ----------------------------------------------------------------------------
const BENEFIT_ACTION_KIND_MAP: Record<string, { kind: string; bat: string | null }> = {
  OVERPAYMENT:        { kind: "BENEFIT_OVERPAYMENT", bat: "OVERPAYMENT_RECOVERY" },
  APPEAL:             { kind: "BENEFIT_APPEAL",      bat: "BENEFIT_APPEAL" },
  ESTATE_RECOVERY:    { kind: "ESTATE_RECOVERY",     bat: "ESTATE_RECOVERY" },
  PAYMENT_AFTER_DEATH:{ kind: "PAYMENT_AFTER_DEATH", bat: "OVERPAYMENT_RECOVERY" },
  FRAUD:              { kind: "FRAUD_REVIEW",        bat: "FRAUD_REVIEW" },
  CLAIM:              { kind: "ELIGIBILITY_DISPUTE", bat: "ELIGIBILITY_DISPUTE" },
};

function liabilityActionKind(head: string | null | undefined, fundCode: string | null): string {
  const h = (head ?? "").toUpperCase();
  if (h) {
    // honour the explicit head if it is one of the allowed values
    if (
      [
        "SS_CONTRIBUTION", "SS_PENALTY",
        "LV_CONTRIBUTION", "LV_PENALTY",
        "PE_CONTRIBUTION", "PE_PENALTY",
        "HSD_LEVY_CONTRIBUTION", "HSD_LEVY_PENALTY",
        "SEVERANCE_CONTRIBUTION", "SEVERANCE_PENALTY",
      ].includes(h)
    ) {
      return h;
    }
  }
  const f = (fundCode ?? "").toUpperCase();
  return f === "LV" ? "LV_CONTRIBUTION" : f === "PE" ? "PE_CONTRIBUTION" : "SS_CONTRIBUTION";
}

async function createActionFromReferralItem(
  lgCaseId: string,
  item: any,
  out: EnrichmentResult,
  userCode?: string | null,
) {
  // Skip if already linked
  if (item.lg_case_action_id) return;
  const { data: dup } = await sb
    .from("lg_case_action")
    .select("id")
    .eq("case_id", lgCaseId)
    .eq("referral_item_id", item.id)
    .maybeSingle();
  if (dup?.id) return;

  let action_kind: string;
  let category: string;
  let benefit_action_type: string | null = null;
  let liability_head_code: string | null = item.liability_head_code ?? null;

  if (item.item_type === "LIABILITY" || item.source_module === "COMPLIANCE") {
    const isPenalty =
      Number(item.penalty_amount ?? 0) > 0 &&
      Number(item.principal_amount ?? 0) === 0 &&
      Number(item.interest_amount ?? 0) === 0;
    if (isPenalty && item.fund_code) {
      action_kind = `${String(item.fund_code).toUpperCase()}_PENALTY`;
      liability_head_code = action_kind;
    } else {
      action_kind = liabilityActionKind(item.liability_head_code, item.fund_code);
      liability_head_code = action_kind;
    }
    category = "DEBT_RECOVERY";
  } else {
    const map = BENEFIT_ACTION_KIND_MAP[item.item_type] ?? { kind: "BENEFIT_OVERPAYMENT", bat: "OVERPAYMENT_RECOVERY" };
    action_kind = map.kind;
    benefit_action_type = map.bat;
    category = "BENEFITS";
    liability_head_code = null; // benefit actions must not set liability head
  }

  const principal = Number(item.principal_amount ?? 0);
  const penalty = Number(item.penalty_amount ?? 0);
  const interest = Number(item.interest_amount ?? 0);
  const cost = Number(item.cost_amount ?? 0);
  const total = Number(item.amount_referred ?? item.total_amount ?? principal + penalty + interest + cost);

  const { data: inserted, error } = await sb
    .from("lg_case_action")
    .insert({
      case_id: lgCaseId,
      action_kind,
      category,
      liability_head_code,
      benefit_action_type,
      referral_item_id: item.id,
      source_module: item.source_module,
      fund_code: item.fund_code,
      period_from: item.period_from,
      period_to: item.period_to,
      principal_amount: principal,
      penalty_amount: penalty,
      interest_amount: interest,
      cost_amount: cost,
      total_amount: total,
      outstanding_amount: total,
      amount_paid: 0,
      overpayment_amount: item.item_type === "OVERPAYMENT" ? total : null,
      insured_person_id: item.debtor_type === "INSURED_PERSON" || item.debtor_type === "BENEFICIARY" ? item.debtor_id : null,
      notes: `Imported from referral item ${item.id}`,
      status: "OPEN",
      stage: "INITIATED",
      created_by: userCode ?? "SYSTEM",
      updated_by: userCode ?? "SYSTEM",
    })
    .select("id")
    .single();
  if (error) {
    out.notes.push(`Action insert failed for item ${item.id}: ${error.message}`);
    return;
  }
  out.actions_created += 1;
  await sb
    .from("core_legal_referral_item")
    .update({ status: "ACCEPTED", lg_case_action_id: inserted.id, updated_by: userCode ?? null })
    .eq("id", item.id);
}

// ----------------------------------------------------------------------------
// Source-specific enrichment
// ----------------------------------------------------------------------------
async function enrichFromBenefits(
  lgCaseId: string,
  lgCase: any,
  out: EnrichmentResult,
  userCode?: string | null,
) {
  const claimId = lgCase.source_record_id || (lgCase.primary_entity_type === "CLAIM" ? lgCase.primary_entity_id : null);
  if (!claimId) {
    out.notes.push("No source claim id on case");
    return;
  }

  const { data: claim } = await sb.from("bn_claim").select("*").eq("id", claimId).maybeSingle();
  if (!claim) {
    out.notes.push(`bn_claim ${claimId} not found`);
    return;
  }

  // 1) Pull insured person
  let ip: any = null;
  if (claim.ssn) {
    const { data } = await sb.from("ip_master").select("*").eq("ssn", claim.ssn).maybeSingle();
    ip = data;
  }
  const ipName = ip
    ? [ip.name_prefix, ip.firstname, ip.middle_name, ip.surname].filter(Boolean).join(" ").trim()
    : claim.ssn ?? "Insured Person";

  await upsertParty(
    lgCaseId,
    {
      party_role: "CLAIMANT",
      party_type: "INSURED_PERSON",
      display_name: ipName,
      external_ref_id: null, // ssn is not a uuid
      contact_info: ip
        ? {
            ssn: ip.ssn,
            address_line1: ip.mail_addr1 ?? ip.resident_addr1 ?? null,
            address_line2: ip.mail_addr2 ?? ip.resident_addr2 ?? null,
            city: null,
            country: ip.country ?? "St. Kitts and Nevis",
            email: ip.email_addr ?? claim.contact_email ?? null,
            phone: ip.phone ?? ip.telephone ?? claim.contact_phone ?? null,
            salutation: ip.name_prefix ?? (ip.gender === "F" ? "Ms." : "Mr."),
          }
        : { ssn: claim.ssn, phone: claim.contact_phone, email: claim.contact_email },
    },
    out,
  );

  // 2) Ensure SSB complainant party exists
  await upsertParty(
    lgCaseId,
    {
      party_role: "COMPLAINANT",
      party_type: "INTERNAL_DEPARTMENT",
      display_name: "St. Christopher and Nevis Social Security Board",
      contact_info: {
        address_line1: "Social Security Building",
        address_line2: "Bay Road",
        city: "Basseterre",
        country: "St. Kitts and Nevis",
      },
    },
    out,
  );

  // 3) Find linked bn_legal_referral & pull items + docs
  const { data: refs } = await sb
    .from("bn_legal_referral")
    .select("id, exposure_amount, total_referred_amount")
    .or(`lg_case_id.eq.${lgCaseId},source_claim_id.eq.${claimId}`)
    .limit(5);
  const referral = (refs ?? [])[0];

  if (referral?.id) {
    const { data: items } = await sb
      .from("core_legal_referral_item")
      .select("*")
      .eq("referral_id", referral.id);
    for (const it of items ?? []) {
      await createActionFromReferralItem(lgCaseId, it, out, userCode);
    }

    const { data: refDocs } = await sb
      .from("core_legal_referral_document")
      .select("*")
      .eq("referral_id", referral.id);
    for (const d of refDocs ?? []) {
      await linkDocument(
        lgCaseId,
        {
          source_module: "BENEFITS",
          source_entity_type: d.source_entity_type ?? "BN_CLAIM_DOCUMENT",
          source_entity_id: d.source_entity_id ?? d.id,
          document_category_code: d.document_type_code ?? "SOURCE_EVIDENCE",
          document_type_code: d.document_type_code,
          title: d.display_title ?? d.file_name,
          file_name: d.file_name,
          dms_document_id: d.dms_document_id,
          dms_file_id: d.dms_file_id,
          mime_type: d.mime_type,
          size_bytes: d.file_size,
        },
        out,
        userCode,
      );
    }
  }

  // 4) Link the claim's own documents
  const { data: claimDocs } = await sb
    .from("bn_claim_document")
    .select("id, document_type_code, document_name, file_name, file_path, mime_type, file_size")
    .eq("claim_id", claimId);
  for (const d of claimDocs ?? []) {
    await linkDocument(
      lgCaseId,
      {
        source_module: "BENEFITS",
        source_entity_type: "BN_CLAIM_DOCUMENT",
        source_entity_id: d.id,
        document_category_code: d.document_type_code ?? "CLAIM_EVIDENCE",
        document_type_code: d.document_type_code,
        title: d.document_name ?? d.file_name,
        file_name: d.file_name,
        mime_type: d.mime_type,
        size_bytes: d.file_size,
      },
      out,
      userCode,
    );
  }

  // 5) If no actions were created (no referral items), synthesise one from claim+exposure
  const { count: actionCount } = await sb
    .from("lg_case_action")
    .select("id", { count: "exact", head: true })
    .eq("case_id", lgCaseId);
  const exposure = Number(lgCase.claim_amount ?? lgCase.outstanding_amount_snapshot ?? referral?.exposure_amount ?? 0);
  if ((actionCount ?? 0) === 0 && exposure > 0) {
    const { error } = await sb.from("lg_case_action").insert({
      case_id: lgCaseId,
      action_kind: "BENEFIT_OVERPAYMENT",
      category: "BENEFITS",
      benefit_action_type: "OVERPAYMENT_RECOVERY",
      source_module: "BENEFITS",
      principal_amount: exposure,
      penalty_amount: 0,
      interest_amount: 0,
      cost_amount: 0,
      total_amount: exposure,
      outstanding_amount: exposure,
      amount_paid: 0,
      overpayment_amount: exposure,
      claim_id: claimId,
      benefit_type: claim.benefit_type ?? claim.product_code,
      notes: `Auto-imported from claim ${claim.claim_number ?? claimId}`,
      status: "OPEN",
      stage: "INITIATED",
      created_by: userCode ?? "SYSTEM",
      updated_by: userCode ?? "SYSTEM",
    });
    if (!error) out.actions_created += 1;
    else out.notes.push(`Synth action failed: ${error.message}`);
  }
}

async function enrichFromCompliance(
  lgCaseId: string,
  lgCase: any,
  out: EnrichmentResult,
  userCode?: string | null,
) {
  const ceCaseId = lgCase.source_record_id || lgCase.compliance_case_id;
  if (!ceCaseId) {
    out.notes.push("No compliance case id on legal case");
    return;
  }
  const { data: ceCase } = await sb.from("ce_cases").select("*").eq("id", ceCaseId).maybeSingle();
  const employerId = ceCase?.employer_id ?? lgCase.employer_id;
  let er: any = null;
  if (employerId) {
    const { data } = await sb.from("er_master").select("*").eq("regno", employerId).maybeSingle();
    er = data;
  }
  const erName = er?.name ?? er?.trade_name ?? ceCase?.employer_name ?? "Employer";

  // 1) SSB internal complainant
  await upsertParty(
    lgCaseId,
    {
      party_role: "COMPLAINANT",
      party_type: "INTERNAL_DEPARTMENT",
      display_name: "St. Christopher and Nevis Social Security Board",
      contact_info: {
        address_line1: "Social Security Building",
        address_line2: "Bay Road",
        city: "Basseterre",
        country: "St. Kitts and Nevis",
      },
    },
    out,
  );

  // 2) Employer respondent
  await upsertParty(
    lgCaseId,
    {
      party_role: "RESPONDENT",
      party_type: "EMPLOYER",
      display_name: erName,
      external_ref_id: null,
      contact_info: {
        regno: er?.regno ?? employerId,
        trading_name: er?.trade_name,
        address_line1: er?.maddr1 ?? er?.hq_addr1 ?? null,
        address_line2: er?.maddr2 ?? er?.hq_addr2 ?? null,
        city: er?.mailing_city ?? er?.hq_city ?? null,
        country: er?.mailing_country ?? er?.hq_country ?? "St. Kitts and Nevis",
        email: er?.email ?? null,
        phone: er?.phone ?? null,
        salutation: "Dear Sir/Madam",
      },
    },
    out,
  );

  // 3) Referral items + docs (CE side)
  const { data: refs } = await sb
    .from("ce_legal_referrals")
    .select("id")
    .eq("legal_case_id", lgCaseId)
    .limit(5);
  const referral = (refs ?? [])[0];
  if (referral?.id) {
    const { data: items } = await sb
      .from("core_legal_referral_item")
      .select("*")
      .eq("referral_id", referral.id);
    for (const it of items ?? []) {
      await createActionFromReferralItem(lgCaseId, it, out, userCode);
    }
    const { data: refDocs } = await sb
      .from("core_legal_referral_document")
      .select("*")
      .eq("referral_id", referral.id);
    for (const d of refDocs ?? []) {
      await linkDocument(
        lgCaseId,
        {
          source_module: "COMPLIANCE",
          source_entity_type: d.source_entity_type ?? "CE_DOCUMENT",
          source_entity_id: d.source_entity_id ?? d.id,
          document_category_code: d.document_type_code ?? "SOURCE_EVIDENCE",
          document_type_code: d.document_type_code,
          title: d.display_title ?? d.file_name,
          file_name: d.file_name,
          dms_document_id: d.dms_document_id,
          dms_file_id: d.dms_file_id,
          mime_type: d.mime_type,
          size_bytes: d.file_size,
        },
        out,
        userCode,
      );
    }
  }
}

// ----------------------------------------------------------------------------
// Financial snapshot rollup
// ----------------------------------------------------------------------------
export async function refreshFinancialSnapshot(lgCaseId: string): Promise<{
  claim_amount: number;
  outstanding: number;
}> {
  const { data: acts } = await sb
    .from("lg_case_action")
    .select("total_amount, outstanding_amount, amount_paid")
    .eq("case_id", lgCaseId);
  const totals = (acts ?? []).reduce(
    (acc: any, a: any) => {
      acc.claim += Number(a.total_amount ?? 0);
      acc.outstanding += Number(a.outstanding_amount ?? 0);
      acc.paid += Number(a.amount_paid ?? 0);
      return acc;
    },
    { claim: 0, outstanding: 0, paid: 0 },
  );

  // Only overwrite when we have actual values (so we don't clear a manual entry)
  if (totals.claim > 0) {
    await sb
      .from("lg_case")
      .update({
        claim_amount: totals.claim,
        outstanding_amount_snapshot: totals.outstanding,
        total_outstanding: totals.outstanding,
      })
      .eq("id", lgCaseId);
  }
  return { claim_amount: totals.claim, outstanding: totals.outstanding };
}

// ----------------------------------------------------------------------------
// Public entry point
// ----------------------------------------------------------------------------
export async function enrichCaseFromSource(
  lgCaseId: string,
  opts?: { userCode?: string | null },
): Promise<EnrichmentResult> {
  const out = empty();
  const { data: lgCase, error } = await sb.from("lg_case").select("*").eq("id", lgCaseId).maybeSingle();
  if (error || !lgCase) throw new Error(`Legal case ${lgCaseId} not found`);

  const mod = String(lgCase.source_module ?? "").toUpperCase();
  if (mod === "BENEFITS" || mod === "BN_CLAIM") {
    await enrichFromBenefits(lgCaseId, lgCase, out, opts?.userCode);
  } else if (mod === "COMPLIANCE") {
    await enrichFromCompliance(lgCaseId, lgCase, out, opts?.userCode);
  } else {
    out.notes.push(`No source-module enrichment defined for '${mod}'`);
  }

  const snap = await refreshFinancialSnapshot(lgCaseId);
  out.amount_set = snap.claim_amount || null;
  return out;
}
