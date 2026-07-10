/**
 * EPIC L4 — Legal Communication Hub evidence service.
 *
 * Read-only lookup of Communication Hub sent messages for a specific Legal
 * case. Uses ONLY the canonical Communication Hub tables
 * (`communication_request`, `communication_message`, `communication_recipient`).
 * Never touches notification_queue, notification_logs, bn_communication_log,
 * or ce_audit_communications.
 *
 * Match strategy (resilient to L3 legacy data where entity fields were not
 * captured on the request row):
 *   1. entity_type='legal_case' AND entity_id = caseId
 *   2. OR module_code='LEGAL' AND reference_no = caseReference
 *   3. OR module_code='LEGAL' AND payload->>'case_reference' = caseReference
 */
import { supabase } from "@/integrations/supabase/client";

const db: any = supabase;

export interface LegalCaseCommunicationRow {
  request_id: string;
  request_no: string;
  module_code: string;
  event_code: string;
  entity_type: string | null;
  entity_id: string | null;
  reference_no: string | null;
  case_reference: string | null;
  assigned_to: string | null;
  priority: string | null;
  message_id: string | null;
  status: string | null;
  test_mode: boolean | null;
  subject: string | null;
  provider_message_id: string | null;
  template_version_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
  recipient_email: string | null;
  recipient_name: string | null;
  request_detail_url: string;
  delivery_monitor_url: string;
  lifecycle_log_url: string;
}

export function maskEmailForDisplay(email: string | null | undefined): string {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const head = local.slice(0, 2);
  return `${head}${"*".repeat(Math.max(1, local.length - 2))}@${domain}`;
}

export async function fetchLegalCaseCommunications(
  caseId: string | null | undefined,
  caseReference: string | null | undefined,
  opts: { limit?: number } = {},
): Promise<LegalCaseCommunicationRow[]> {
  const limit = opts.limit ?? 50;
  if (!caseId && !caseReference) return [];

  // Build OR filter safely.
  const parts: string[] = [];
  if (caseId) parts.push(`and(entity_type.eq.legal_case,entity_id.eq.${caseId})`);
  if (caseReference) {
    const ref = caseReference.replace(/,/g, ""); // PostgREST OR list separator safety
    parts.push(`and(module_code.eq.LEGAL,reference_no.eq.${ref})`);
    parts.push(`and(module_code.eq.LEGAL,payload->>case_reference.eq.${ref})`);
  }

  const { data: reqs, error } = await db
    .from("communication_request")
    .select("id, request_no, module_code, event_code, entity_type, entity_id, reference_no, payload, context, created_at")
    .or(parts.join(","))
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const requests = (reqs ?? []) as any[];
  if (!requests.length) return [];

  const reqIds = requests.map((r) => r.id);
  const { data: msgs } = await db
    .from("communication_message")
    .select("id, request_id, recipient_id, status, test_mode, subject, provider_message_id, template_version_id, sent_at, delivered_at, created_at")
    .in("request_id", reqIds)
    .order("created_at", { ascending: true });

  const msgList = (msgs ?? []) as any[];
  const firstMsgByReq: Record<string, any> = {};
  for (const m of msgList) if (!firstMsgByReq[m.request_id]) firstMsgByReq[m.request_id] = m;

  const recipientIds = [...new Set(msgList.map((m) => m.recipient_id).filter(Boolean))];
  const recIdx: Record<string, any> = {};
  if (recipientIds.length) {
    const { data: recs } = await db
      .from("communication_recipient")
      .select("id, email, name")
      .in("id", recipientIds);
    for (const r of (recs ?? []) as any[]) recIdx[r.id] = r;
  }

  return requests.map((r) => {
    const m = firstMsgByReq[r.id] ?? null;
    const rec = m?.recipient_id ? recIdx[m.recipient_id] : null;
    const payload = (r.payload ?? {}) as any;
    return {
      request_id: r.id,
      request_no: r.request_no,
      module_code: r.module_code,
      event_code: r.event_code,
      entity_type: r.entity_type ?? null,
      entity_id: r.entity_id ?? null,
      reference_no: r.reference_no ?? null,
      case_reference: payload.case_reference ?? r.reference_no ?? null,
      assigned_to: payload.assigned_to ?? null,
      priority: payload.priority ?? null,
      message_id: m?.id ?? null,
      status: m?.status ?? "pending",
      test_mode: m?.test_mode ?? null,
      subject: m?.subject ?? null,
      provider_message_id: m?.provider_message_id ?? null,
      template_version_id: m?.template_version_id ?? null,
      sent_at: m?.sent_at ?? null,
      delivered_at: m?.delivered_at ?? null,
      created_at: r.created_at,
      recipient_email: rec?.email ?? null,
      recipient_name: rec?.name ?? null,
      request_detail_url: `/admin/communication-hub/requests/${r.id}`,
      delivery_monitor_url: `/admin/communication-hub/delivery-monitor?request_no=${encodeURIComponent(r.request_no)}`,
      lifecycle_log_url: `/admin/communication-hub/lifecycle-log?request_no=${encodeURIComponent(r.request_no)}`,
    };
  });
}
