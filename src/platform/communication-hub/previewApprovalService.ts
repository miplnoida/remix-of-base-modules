/**
 * CH-SIMPLE-P3C — Server-Verifiable Preview & Approval client.
 *
 * READ-ONLY typed wrapper around the canonical preview/approval RPCs.
 * The frontend NEVER computes an authoritative preview or approval —
 * every result is a plain forward of the server's response.
 */
import { supabase } from "@/integrations/supabase/client";

export type PreviewSnapshotStatus = "PREPARED" | "SUPERSEDED" | "EXPIRED" | "REVOKED";
export type PreviewApprovalStatus =
  | "ACTIVE" | "RESERVED" | "CONSUMED" | "REVOKED" | "EXPIRED" | "INVALIDATED" | "MISSING";

export interface PreparePreviewInput {
  moduleCode: string;
  eventCode: string;
  channel?: string;
  sendContext?: string;
  toRecipients?: string[];
  ccRecipients?: string[];
  bccRecipients?: string[];
  senderProfileId?: string | null;
  contextData?: Record<string, unknown>;
}

export interface PreviewSnapshot {
  snapshot_id: string;
  module_code: string;
  event_code: string;
  channel: string;
  send_context: string;
  to_recipients: string[];
  cc_recipients: string[];
  bcc_recipients: string[];
  recipient_set_hash: string;
  template_id: string | null;
  template_version_id: string | null;
  sender_profile_id: string | null;
  rendered_subject: string | null;
  rendered_body_html: string | null;
  rendered_body_text: string | null;
  content_hash: string;
  context_hash: string;
  unresolved_variables: string[];
  configuration_version: number | null;
  recipient_policy_version: number | null;
  expires_at: string;
  status: PreviewSnapshotStatus;
}

export interface PreviewApprovalRecord {
  approval_id: string;
  snapshot_id: string;
  status: PreviewApprovalStatus;
  expires_at: string;
  content_hash: string;
  recipient_set_hash: string;
}

export interface PreviewApprovalValidation {
  valid: boolean;
  approval_id: string | null;
  snapshot_id: string | null;
  status: PreviewApprovalStatus;
  blockers: Array<{ code: string; message?: string; stage?: string }>;
  warnings: Array<{ code: string; message?: string; stage?: string }>;
  approved_by: string | null;
  approved_at: string | null;
  expires_at: string | null;
  configuration_version_at_approval: number | null;
  recipient_policy_version_at_approval: number | null;
  content_hash_at_approval: string | null;
  current_content_hash: string | null;
  recipient_set_hash: string | null;
  validated_at: string;
}

async function rpc<T>(name: string, payload: unknown): Promise<T> {
  const { data, error } = await (supabase as any).rpc(name, { p_payload: payload });
  if (error) throw new Error(error.message ?? `${name} failed`);
  return data as T;
}

function normalizeSnapshot(raw: any): PreviewSnapshot {
  if (!raw || typeof raw !== "object") {
    throw new Error("prepare_comm_hub_preview returned no snapshot");
  }
  // Backend row exposes `id`; the client contract uses `snapshot_id`.
  // Normalize once here so every downstream call (approve, dry run,
  // controlled live) receives a stable identifier.
  const snapshot_id = raw.snapshot_id ?? raw.id ?? null;
  if (!snapshot_id) {
    throw new Error("prepare_comm_hub_preview returned a snapshot without id");
  }
  return { ...raw, snapshot_id } as PreviewSnapshot;
}

export async function preparePreview(input: PreparePreviewInput): Promise<PreviewSnapshot> {
  const raw = await rpc<any>("prepare_comm_hub_preview", {
    module_code: input.moduleCode,
    event_code: input.eventCode,
    channel: input.channel ?? "email",
    send_context: input.sendContext ?? "preview",
    to_recipients: input.toRecipients ?? [],
    cc_recipients: input.ccRecipients ?? [],
    bcc_recipients: input.bccRecipients ?? [],
    sender_profile_id: input.senderProfileId ?? null,
    context_data: input.contextData ?? {},
  });
  return normalizeSnapshot(raw);
}

export async function approvePreview(input: {
  snapshotId: string;
  approvalReason: string;
  expectedContentHash?: string | null;
}): Promise<PreviewApprovalRecord> {
  return rpc<PreviewApprovalRecord>("approve_comm_hub_preview", {
    snapshot_id: input.snapshotId,
    approval_reason: input.approvalReason,
    expected_content_hash: input.expectedContentHash ?? null,
  });
}

export async function revokePreviewApproval(input: {
  approvalId: string;
  revocationReason: string;
}): Promise<{ approval_id: string; status: "REVOKED" }> {
  return rpc("revoke_comm_hub_preview_approval", {
    approval_id: input.approvalId,
    revocation_reason: input.revocationReason,
  });
}

export async function validatePreviewApproval(input: {
  approvalId: string;
  moduleCode: string;
  eventCode: string;
  channel?: string;
  sendContext?: string;
  toRecipients?: string[];
  ccRecipients?: string[];
  bccRecipients?: string[];
  expectedTemplateVersionId?: string | null;
  expectedSenderProfileId?: string | null;
  expectedContentHash?: string | null;
}): Promise<PreviewApprovalValidation> {
  return rpc<PreviewApprovalValidation>("validate_comm_hub_preview_approval", {
    approval_id: input.approvalId,
    module_code: input.moduleCode,
    event_code: input.eventCode,
    channel: input.channel ?? "email",
    send_context: input.sendContext ?? "controlled_live",
    to_recipients: input.toRecipients ?? [],
    cc_recipients: input.ccRecipients ?? [],
    bcc_recipients: input.bccRecipients ?? [],
    expected_template_version_id: input.expectedTemplateVersionId ?? null,
    expected_sender_profile_id: input.expectedSenderProfileId ?? null,
    expected_content_hash: input.expectedContentHash ?? null,
  });
}

export async function fetchPreviewSnapshot(snapshotId: string): Promise<PreviewSnapshot | null> {
  const { data, error } = await (supabase as any)
    .from("communication_preview_snapshot")
    .select("*")
    .eq("id", snapshotId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return normalizeSnapshot(data);
}

export async function reservePreviewApproval(approvalId: string): Promise<{
  approval_id: string; reservation_token: string; status: "RESERVED";
}> {
  return rpc("reserve_comm_hub_preview_approval", { approval_id: approvalId });
}

export async function consumePreviewApproval(input: {
  approvalId: string; reservationToken: string; requestId?: string | null;
}): Promise<{ approval_id: string; status: "CONSUMED"; consumed_at: string }> {
  return rpc("consume_comm_hub_preview_approval", {
    approval_id: input.approvalId,
    reservation_token: input.reservationToken,
    request_id: input.requestId ?? null,
  });
}

export async function releasePreviewReservation(input: {
  approvalId: string; reservationToken: string;
}): Promise<{ approval_id: string; status: "ACTIVE" }> {
  return rpc("release_comm_hub_preview_reservation", {
    approval_id: input.approvalId,
    reservation_token: input.reservationToken,
  });
}
