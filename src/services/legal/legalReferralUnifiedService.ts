import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type ReferralStatus =
  | "DRAFT" | "SUBMITTED_TO_LEGAL" | "RECEIVED_BY_LEGAL"
  | "INFO_REQUESTED" | "INFO_RESPONDED" | "UNDER_LEGAL_REVIEW"
  | "ACCEPTED" | "LEGAL_CASE_CREATED" | "REJECTED" | "CLOSED";

export type SourceModule = "BENEFITS" | "COMPLIANCE";

export interface LegalReferralRow {
  id: string;
  referral_no: string;
  source_module: SourceModule;
  source_record_type: string | null;
  source_record_id: string | null;
  source_reference_no: string | null;
  primary_entity_type: string | null;
  primary_entity_id: string | null;
  submitted_by: string | null;
  submitted_workbasket_code: string | null;
  submitted_team_code: string | null;
  legal_workbasket_code: string | null;
  legal_team_code: string | null;
  status: ReferralStatus;
  legal_case_id: string | null;
  lg_intake_id: string | null;
  summary: string | null;
  priority_code: string | null;
  exposure_amount: number | null;
  pending_info_request_count: number;
  last_status_at: string;
  created_at: string;
  updated_at: string;
}

export interface InfoRequestRow {
  id: string;
  legal_referral_id: string;
  request_no: string;
  requested_by: string;
  requested_to_module: SourceModule;
  requested_to_workbasket_code: string | null;
  requested_to_team_code: string | null;
  requested_to_user: string | null;
  request_reason: string;
  requested_items: Array<{ key: string; label: string; completed?: boolean }>;
  due_date: string | null;
  status: "PENDING_SOURCE_RESPONSE" | "RESPONDED" | "CANCELLED";
  responded_by: string | null;
  responded_at: string | null;
  response_notes: string | null;
  completion_items: any;
  created_at: string;
  updated_at: string;
}

export interface SourceTaskRow {
  id: string;
  legal_referral_id: string;
  info_request_id: string;
  task_type: string;
  source_module: SourceModule;
  assigned_workbasket_code: string | null;
  assigned_team_code: string | null;
  assigned_user: string | null;
  priority: string | null;
  due_date: string | null;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  claim_id: string | null;
  insured_person_id: string | null;
  employer_id: string | null;
  compliance_case_id: string | null;
  created_at: string;
}

// -------------------- LIST APIS --------------------

export interface ListReferralFilter {
  source_module?: SourceModule;
  statuses?: ReferralStatus[];
  legal_team_code?: string | null;
  legal_workbasket_code?: string | null;
  submitted_by?: string | null;
  has_pending_info_request?: boolean;
  search?: string;
}

export async function listReferrals(f: ListReferralFilter = {}): Promise<LegalReferralRow[]> {
  let q = sb.from("legal_referral").select("*").order("last_status_at", { ascending: false }).limit(500);
  if (f.source_module) q = q.eq("source_module", f.source_module);
  if (f.statuses?.length) q = q.in("status", f.statuses);
  if (f.legal_team_code) q = q.eq("legal_team_code", f.legal_team_code);
  if (f.legal_workbasket_code) q = q.eq("legal_workbasket_code", f.legal_workbasket_code);
  if (f.submitted_by) q = q.eq("submitted_by", f.submitted_by);
  if (f.has_pending_info_request) q = q.gt("pending_info_request_count", 0);
  if (f.search) q = q.or(`referral_no.ilike.%${f.search}%,source_reference_no.ilike.%${f.search}%,summary.ilike.%${f.search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LegalReferralRow[];
}

export async function getReferral(id: string): Promise<LegalReferralRow | null> {
  const { data, error } = await sb.from("legal_referral").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as LegalReferralRow | null;
}

export async function getReferralBySourceId(
  source_module: SourceModule,
  source_id: string
): Promise<LegalReferralRow | null> {
  const col = source_module === "BENEFITS" ? "source_bn_referral_id" : "source_ce_referral_id";
  const { data, error } = await sb.from("legal_referral").select("*").eq(col, source_id).maybeSingle();
  if (error) throw error;
  return data as LegalReferralRow | null;
}

export async function listInfoRequests(legal_referral_id: string): Promise<InfoRequestRow[]> {
  const { data, error } = await sb
    .from("legal_referral_info_request")
    .select("*")
    .eq("legal_referral_id", legal_referral_id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as InfoRequestRow[];
}

export async function listSourceTasks(opts: {
  source_module: SourceModule;
  assigned_user?: string;
  workbasket_codes?: string[];
  statuses?: SourceTaskRow["status"][];
}): Promise<(SourceTaskRow & { referral: LegalReferralRow; info_request: InfoRequestRow })[]> {
  let q = sb
    .from("legal_referral_source_task")
    .select("*, referral:legal_referral(*), info_request:legal_referral_info_request(*)")
    .eq("source_module", opts.source_module)
    .order("created_at", { ascending: false });
  if (opts.assigned_user) q = q.eq("assigned_user", opts.assigned_user);
  if (opts.workbasket_codes?.length) q = q.in("assigned_workbasket_code", opts.workbasket_codes);
  if (opts.statuses?.length) q = q.in("status", opts.statuses);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as any;
}

export async function listAudit(legal_referral_id: string) {
  const { data, error } = await sb
    .from("legal_referral_audit")
    .select("*")
    .eq("legal_referral_id", legal_referral_id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// -------------------- CREATE INFO REQUEST (Legal -> Source) --------------------

export interface CreateInfoRequestInput {
  legal_referral_id: string;
  requested_by: string;
  request_reason: string;
  requested_items: Array<{ key: string; label: string }>;
  due_date?: string | null;
  requested_to_workbasket_code?: string | null;
  requested_to_team_code?: string | null;
  requested_to_user?: string | null;
}

async function resolveSourceRouting(referral: LegalReferralRow, override?: {
  requested_to_workbasket_code?: string | null;
  requested_to_team_code?: string | null;
  requested_to_user?: string | null;
}) {
  if (override?.requested_to_workbasket_code || override?.requested_to_user) {
    return {
      workbasket_code: override.requested_to_workbasket_code ?? referral.submitted_workbasket_code ?? null,
      team_code: override.requested_to_team_code ?? referral.submitted_team_code ?? null,
      user: override.requested_to_user ?? referral.submitted_by ?? null,
    };
  }
  // Prefer original submitter and their workbasket
  if (referral.source_module === "BENEFITS") {
    // try bn_workbasket lookup by basket_code or fallback to a default
    const { data } = await sb.from("bn_workbasket")
      .select("basket_code")
      .eq("is_active", true)
      .limit(1);
    return {
      workbasket_code: referral.submitted_workbasket_code ?? data?.[0]?.basket_code ?? "BN_LEGAL_FOLLOWUP",
      team_code: referral.submitted_team_code ?? null,
      user: referral.submitted_by ?? null,
    };
  } else {
    const { data } = await sb.from("ce_assignment_routing_rules")
      .select("queue_code")
      .eq("is_active", true)
      .limit(1);
    return {
      workbasket_code: referral.submitted_workbasket_code ?? data?.[0]?.queue_code ?? "CE_LEGAL_FOLLOWUP",
      team_code: referral.submitted_team_code ?? null,
      user: referral.submitted_by ?? null,
    };
  }
}

export async function createInfoRequest(input: CreateInfoRequestInput): Promise<InfoRequestRow> {
  const referral = await getReferral(input.legal_referral_id);
  if (!referral) throw new Error("Referral not found");

  const routing = await resolveSourceRouting(referral, {
    requested_to_workbasket_code: input.requested_to_workbasket_code,
    requested_to_team_code: input.requested_to_team_code,
    requested_to_user: input.requested_to_user,
  });

  const { data: noData } = await sb.rpc("next_info_request_no");
  const request_no = noData ?? `LIR-${Date.now()}`;

  const { data: ir, error: irErr } = await sb
    .from("legal_referral_info_request")
    .insert({
      legal_referral_id: input.legal_referral_id,
      request_no,
      requested_by: input.requested_by,
      requested_to_module: referral.source_module,
      requested_to_workbasket_code: routing.workbasket_code,
      requested_to_team_code: routing.team_code,
      requested_to_user: routing.user,
      request_reason: input.request_reason,
      requested_items: input.requested_items,
      due_date: input.due_date ?? null,
      status: "PENDING_SOURCE_RESPONSE",
    })
    .select()
    .single();
  if (irErr) throw irErr;

  // Update referral status
  await sb.from("legal_referral")
    .update({ status: "INFO_REQUESTED", last_status_at: new Date().toISOString() })
    .eq("id", input.legal_referral_id);

  // Mirror status onto source per-module table
  if (referral.source_bn_referral_id ?? referral.source_module === "BENEFITS") {
    await sb.from("bn_legal_referral").update({ status: "SUBMITTED_TO_LEGAL" }).eq("referral_number", referral.referral_no);
  }

  // Create source task
  const { data: task } = await sb
    .from("legal_referral_source_task")
    .insert({
      legal_referral_id: input.legal_referral_id,
      info_request_id: ir.id,
      task_type: "LEGAL_INFO_REQUEST",
      source_module: referral.source_module,
      assigned_workbasket_code: routing.workbasket_code,
      assigned_team_code: routing.team_code,
      assigned_user: routing.user,
      priority: referral.priority_code ?? "MEDIUM",
      due_date: input.due_date ?? null,
      status: "OPEN",
      employer_id: referral.primary_entity_type === "EMPLOYER" ? referral.primary_entity_id : null,
      insured_person_id: referral.primary_entity_type === "INSURED_PERSON" ? referral.primary_entity_id : null,
    })
    .select()
    .single();

  // Audit
  await sb.from("legal_referral_audit").insert({
    legal_referral_id: input.legal_referral_id,
    info_request_id: ir.id,
    event_code: "INFO_REQUESTED",
    event_module: "LEGAL",
    actor: input.requested_by,
    notes: input.request_reason,
    metadata: { request_no, routing, task_id: task?.id },
  });

  // Notifications (in-app + email - best-effort)
  await dispatchInfoRequestNotifications(referral, ir, routing);

  return ir as InfoRequestRow;
}

async function dispatchInfoRequestNotifications(
  referral: LegalReferralRow,
  ir: InfoRequestRow,
  routing: { user: string | null; workbasket_code: string | null }
) {
  try {
    // Resolve target user_id (auth) by user_code if possible
    let userId: string | null = null;
    if (routing.user) {
      const { data: prof } = await sb.from("profiles")
        .select("user_id")
        .eq("user_code", routing.user)
        .maybeSingle();
      userId = prof?.user_id ?? null;
    }
    if (userId) {
      await sb.from("in_app_notifications").insert({
        user_id: userId,
        title: `Legal info request: ${referral.referral_no}`,
        body: ir.request_reason + (ir.due_date ? ` (due ${ir.due_date})` : ""),
        notification_type: "action_required",
        priority: "high",
        module: referral.source_module,
        related_record_id: referral.id,
        link: referral.source_module === "BENEFITS"
          ? `/bn/legal-referrals/respond/${ir.id}`
          : `/compliance/legal-referrals/respond/${ir.id}`,
        metadata: { referral_no: referral.referral_no, info_request_no: ir.request_no },
      });
    }
    // Best-effort email
    if (routing.user) {
      const { data: prof } = await sb.from("profiles")
        .select("email")
        .eq("user_code", routing.user)
        .maybeSingle();
      const email = prof?.email;
      if (email) {
        await sb.functions.invoke("send-transactional-email", {
          body: {
            templateName: "legal-info-request",
            recipientEmail: email,
            idempotencyKey: `lir-${ir.id}`,
            templateData: {
              referral_no: referral.referral_no,
              source_reference_no: referral.source_reference_no,
              request_reason: ir.request_reason,
              requested_items: ir.requested_items.map((i) => i.label).join(", "),
              due_date: ir.due_date ?? "—",
              response_link: `/${referral.source_module === "BENEFITS" ? "bn" : "compliance"}/legal-referrals/respond/${ir.id}`,
            },
          },
        }).catch(() => null);
      }
    }
  } catch (e) {
    console.warn("Notification dispatch failed (non-blocking):", e);
  }
}

// -------------------- RESPOND TO INFO REQUEST (Source -> Legal) --------------------

export interface RespondInfoRequestInput {
  info_request_id: string;
  responded_by: string;
  response_notes: string;
  completion_items?: Array<{ key: string; completed: boolean; note?: string }>;
  document_links?: Array<{
    dms_document_id?: string | null;
    dms_file_id?: string | null;
    storage_bucket?: string | null;
    storage_path?: string | null;
    file_name?: string | null;
    mime_type?: string | null;
    document_source?: string;
  }>;
}

export async function respondInfoRequest(input: RespondInfoRequestInput) {
  const { data: ir, error: irErr } = await sb
    .from("legal_referral_info_request")
    .select("*, referral:legal_referral(*)")
    .eq("id", input.info_request_id)
    .single();
  if (irErr) throw irErr;
  if (ir.status !== "PENDING_SOURCE_RESPONSE") throw new Error("Info request is not pending");

  await sb.from("legal_referral_info_request")
    .update({
      status: "RESPONDED",
      responded_by: input.responded_by,
      responded_at: new Date().toISOString(),
      response_notes: input.response_notes,
      completion_items: input.completion_items ?? null,
    })
    .eq("id", input.info_request_id);

  if (input.document_links?.length) {
    await sb.from("legal_referral_document_link").insert(
      input.document_links.map((d) => ({
        legal_referral_id: ir.legal_referral_id,
        info_request_id: input.info_request_id,
        dms_document_id: d.dms_document_id ?? null,
        dms_file_id: d.dms_file_id ?? null,
        storage_bucket: d.storage_bucket ?? null,
        storage_path: d.storage_path ?? null,
        file_name: d.file_name ?? null,
        mime_type: d.mime_type ?? null,
        source_module: ir.referral.source_module,
        document_source: d.document_source ?? "NEW_UPLOAD",
        linked_by: input.responded_by,
      }))
    );
  }

  await sb.from("legal_referral")
    .update({ status: "INFO_RESPONDED", last_status_at: new Date().toISOString() })
    .eq("id", ir.legal_referral_id);

  await sb.from("legal_referral_source_task")
    .update({ status: "COMPLETED", completed_by: input.responded_by, completed_at: new Date().toISOString() })
    .eq("info_request_id", input.info_request_id);

  await sb.from("legal_referral_audit").insert({
    legal_referral_id: ir.legal_referral_id,
    info_request_id: input.info_request_id,
    event_code: "INFO_RESPONDED",
    event_module: ir.referral.source_module,
    actor: input.responded_by,
    notes: input.response_notes,
    metadata: { document_count: input.document_links?.length ?? 0 },
  });

  // Notify legal user
  try {
    if (ir.requested_by) {
      const { data: prof } = await sb.from("profiles")
        .select("user_id,email")
        .eq("user_code", ir.requested_by)
        .maybeSingle();
      if (prof?.user_id) {
        await sb.from("in_app_notifications").insert({
          user_id: prof.user_id,
          title: `Response on ${ir.referral.referral_no}`,
          body: `${ir.referral.source_module} submitted requested information.`,
          notification_type: "informational",
          module: "LEGAL",
          related_record_id: ir.legal_referral_id,
          link: `/legal/intake/${ir.referral.lg_intake_id ?? ir.legal_referral_id}`,
        });
      }
      if (prof?.email) {
        await sb.functions.invoke("send-transactional-email", {
          body: {
            templateName: "legal-info-response",
            recipientEmail: prof.email,
            idempotencyKey: `lir-resp-${input.info_request_id}`,
            templateData: {
              referral_no: ir.referral.referral_no,
              source_module: ir.referral.source_module,
              response_notes: input.response_notes,
              review_link: `/legal/intake/${ir.referral.lg_intake_id ?? ir.legal_referral_id}`,
            },
          },
        }).catch(() => null);
      }
    }
  } catch (e) {
    console.warn("Response notification failed:", e);
  }

  return { ok: true };
}

// -------------------- LEGAL DECISIONS --------------------

export async function updateReferralStatus(
  legal_referral_id: string,
  status: ReferralStatus,
  actor: string,
  notes?: string
) {
  await sb.from("legal_referral")
    .update({ status, last_status_at: new Date().toISOString() })
    .eq("id", legal_referral_id);
  await sb.from("legal_referral_audit").insert({
    legal_referral_id,
    event_code: `STATUS_${status}`,
    event_module: "LEGAL",
    actor,
    notes: notes ?? null,
  });
}

export async function listDocumentLinks(legal_referral_id: string) {
  const { data, error } = await sb
    .from("legal_referral_document_link")
    .select("*")
    .eq("legal_referral_id", legal_referral_id)
    .order("linked_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
