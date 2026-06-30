/**
 * Legal Referral Collaboration Engine
 *
 * Single reusable facade used by BOTH Benefits and Compliance for the Legal
 * referral collaboration workflow (info requests, responses, notifications,
 * documents, audit). All write paths go through the atomic Postgres RPC
 * `create_legal_info_request` so info-request + source-task + referral status
 * + audit are committed in one transaction.
 *
 * Rules:
 *  - source_module is BENEFITS or COMPLIANCE
 *  - Legal owns review; source module owns response
 *  - Workbasket routing determines visibility — no hardcoded users
 *  - DMS documents are linked (not duplicated) via legal_referral_document_link
 */

import {
  createInfoRequest,
  respondInfoRequest,
  dispatchInfoRequestNotifications,
  listSourceTasks,
  listInfoRequests,
  listAudit,
  getReferral,
  type CreateInfoRequestInput,
  type RespondInfoRequestInput,
  type SourceModule,
  type InfoRequestRow,
  type SourceTaskRow,
  type LegalReferralRow,
} from "./legalReferralUnifiedService";
import { supabase } from "@/integrations/supabase/client";
import { resolveLegalEnterprise } from "@/lib/enterprise/legalEnterpriseMetadata";

const sb = supabase as any;

// -------------------- Types --------------------

export interface RequestMoreInfoPayload {
  requested_by: string;                         // user_code (no hardcoded users)
  request_reason: string;
  requested_items?: Array<{ key: string; label: string }>;
  due_date?: string | null;
  // Optional routing override; otherwise resolved from the referral's submitter/workbasket
  requested_to_workbasket_code?: string | null;
  requested_to_team_code?: string | null;
  requested_to_user?: string | null;
}

export interface SubmitInfoResponsePayload {
  responded_by: string;
  response_notes: string;
  completion_items?: Array<{ key: string; completed: boolean; note?: string }>;
  document_links?: RespondInfoRequestInput["document_links"];
}

export interface UserContext {
  user_code?: string | null;
  workbasket_codes?: string[];
}

export interface TimelineEntry {
  at: string;
  event_code: string;
  event_module: string;
  actor: string | null;
  notes: string | null;
  info_request_id: string | null;
  metadata?: any;
}

// -------------------- Engine --------------------

export const legalReferralCollaborationService = {
  /**
   * Atomic: create info request + source task + notification + email + referral status + audit.
   * Steps that must succeed together run inside `create_legal_info_request` RPC.
   * Notifications/email run best-effort after commit.
   */
  async requestMoreInformation(
    referralId: string,
    payload: RequestMoreInfoPayload
  ): Promise<InfoRequestRow> {
    if (!referralId) throw new Error("referralId is required");
    if (!payload?.requested_by) throw new Error("requested_by is required");
    if (!payload?.request_reason?.trim()) throw new Error("request_reason is required");

    const input: CreateInfoRequestInput = {
      legal_referral_id: referralId,
      requested_by: payload.requested_by,
      request_reason: payload.request_reason.trim(),
      requested_items: payload.requested_items ?? [],
      due_date: payload.due_date ?? null,
      requested_to_workbasket_code: payload.requested_to_workbasket_code ?? null,
      requested_to_team_code: payload.requested_to_team_code ?? null,
      requested_to_user: payload.requested_to_user ?? null,
    };
    // Atomic RPC + best-effort notification fan-out (handled in unified service)
    return createInfoRequest(input);
  },

  /**
   * Pending info-request tasks visible to the source module user, scoped by
   * assigned_user OR any of the user's workbasket codes.
   */
  async getPendingInfoRequests(
    sourceModule: SourceModule,
    userContext: UserContext = {}
  ) {
    const tasks: Array<SourceTaskRow & { referral: LegalReferralRow; info_request: InfoRequestRow }> = [];
    // By user
    if (userContext.user_code) {
      const own = await listSourceTasks({
        source_module: sourceModule,
        assigned_user: userContext.user_code,
        statuses: ["OPEN", "IN_PROGRESS"],
      });
      tasks.push(...own);
    }
    // By workbasket(s)
    if (userContext.workbasket_codes?.length) {
      const wb = await listSourceTasks({
        source_module: sourceModule,
        workbasket_codes: userContext.workbasket_codes,
        statuses: ["OPEN", "IN_PROGRESS"],
      });
      tasks.push(...wb);
    }
    // Fallback: all pending tasks for the module
    if (!userContext.user_code && !userContext.workbasket_codes?.length) {
      const all = await listSourceTasks({
        source_module: sourceModule,
        statuses: ["OPEN", "IN_PROGRESS"],
      });
      tasks.push(...all);
    }
    // De-dupe by id
    const seen = new Set<string>();
    return tasks.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
  },

  /**
   * Source -> Legal: mark info request RESPONDED, link DMS documents (no copies),
   * complete source task, update referral status, write audit, notify Legal.
   */
  async submitInfoResponse(
    infoRequestId: string,
    payload: SubmitInfoResponsePayload
  ) {
    if (!infoRequestId) throw new Error("infoRequestId is required");
    if (!payload?.responded_by) throw new Error("responded_by is required");
    if (!payload?.response_notes?.trim()) throw new Error("response_notes is required");

    const result = await respondInfoRequest({
      info_request_id: infoRequestId,
      responded_by: payload.responded_by,
      response_notes: payload.response_notes.trim(),
      completion_items: payload.completion_items,
      document_links: payload.document_links,
    });
    // Best-effort confirmation back to Legal (already fired inside respondInfoRequest)
    await this.notifyLegalResponseReceived(infoRequestId).catch(() => null);
    return result;
  },

  /** Combined status/event timeline (audit + info requests) for a referral. */
  async getReferralStatusTimeline(referralId: string): Promise<TimelineEntry[]> {
    if (!referralId) return [];
    const [referral, audit, infoRequests] = await Promise.all([
      getReferral(referralId),
      listAudit(referralId),
      listInfoRequests(referralId),
    ]);
    const entries: TimelineEntry[] = [];
    if (referral) {
      entries.push({
        at: referral.created_at,
        event_code: "REFERRAL_CREATED",
        event_module: referral.source_module,
        actor: referral.submitted_by,
        notes: referral.summary,
        info_request_id: null,
      });
    }
    for (const a of audit as any[]) {
      entries.push({
        at: a.created_at,
        event_code: a.event_code,
        event_module: a.event_module,
        actor: a.actor,
        notes: a.notes,
        info_request_id: a.info_request_id ?? null,
        metadata: a.metadata,
      });
    }
    for (const ir of infoRequests) {
      if (ir.responded_at) {
        entries.push({
          at: ir.responded_at,
          event_code: "INFO_REQUEST_RESPONDED",
          event_module: "SOURCE",
          actor: ir.responded_by,
          notes: ir.response_notes,
          info_request_id: ir.id,
        });
      }
    }
    return entries.sort((a, b) => +new Date(b.at) - +new Date(a.at));
  },

  /** Re-send the source-module notification + email for an info request (best-effort). */
  async notifySourceModule(infoRequestId: string) {
    if (!infoRequestId) return;
    await dispatchInfoRequestNotifications(infoRequestId).catch((e) =>
      console.warn("notifySourceModule failed:", e)
    );
  },

  /** Notify Legal that a response was submitted (in-app + email, best-effort). */
  async notifyLegalResponseReceived(infoRequestId: string) {
    if (!infoRequestId) return;
    try {
      const { data: ir } = await sb
        .from("legal_referral_info_request")
        .select("*, referral:legal_referral(*)")
        .eq("id", infoRequestId)
        .maybeSingle();
      if (!ir?.requested_by) return;
      const { data: prof } = await sb
        .from("profiles")
        .select("user_id,email")
        .eq("user_code", ir.requested_by)
        .maybeSingle();
      const enterprise = await resolveLegalEnterprise({
        matterId: ir.legal_referral_id ?? null,
        matterKind: "LEGAL_REFERRAL",
      });
      const ent = enterprise.notification;
      if (prof?.user_id) {
        await sb.from("in_app_notifications").insert({
          user_id: prof.user_id,
          title: `Response on ${ir.referral?.referral_no ?? "referral"}`,
          body: `${ir.referral?.source_module ?? ""} submitted requested information.`,
          notification_type: "informational",
          module: "LEGAL",
          related_record_id: ir.legal_referral_id,
          link: `/legal/intake/${ir.referral?.lg_intake_id ?? ir.legal_referral_id}`,
          metadata: {
            organization_id: enterprise.metadata.organization_id,
            organization_name: enterprise.metadata.organization_name,
            department_id: enterprise.metadata.department_id,
            department_code: enterprise.metadata.department_code,
            department_name: enterprise.metadata.department_name,
            module_code: enterprise.metadata.module_code,
          },
        });
      }
      if (prof?.email) {
        await sb.functions
          .invoke("send-transactional-email", {
            body: {
              templateName: "legal-info-response",
              recipientEmail: prof.email,
              replyTo: ent.reply_to_email || undefined,
              idempotencyKey: `lir-resp-${infoRequestId}`,
              templateData: {
                referral_no: ir.referral?.referral_no,
                source_module: ir.referral?.source_module,
                response_notes: ir.response_notes,
                review_link: `/legal/intake/${ir.referral?.lg_intake_id ?? ir.legal_referral_id}`,
                organization_name: ent.organization_name,
                department_name: ent.department_name,
                sender_email: ent.sender_email,
                reply_to_email: ent.reply_to_email,
                email_signature_html: ent.email_signature_html,
                email_signature_text: ent.email_signature_text,
                email_footer: ent.email_footer,
                disclaimer: ent.disclaimer,
                logo_url: ent.org_logo_url,
              },
            },
          })
          .catch(() => null);
      }
    } catch (e) {
      console.warn("notifyLegalResponseReceived failed:", e);
    }
  },
};

export type LegalReferralCollaborationService = typeof legalReferralCollaborationService;
