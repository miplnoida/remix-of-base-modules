/**
 * CH-SIMPLE-P3F-UX.6M — Event Test Context resolver.
 *
 * Read-only projection used by the Go Live "Event test context" summary.
 * Joins the authoritative rows:
 *   communication_hub_event_template_map
 *   → core_template (active_version_id)
 *   → core_template_version (version_no, status)
 *   → communication_hub_sender_profile (from_email, display_name, is_enabled)
 *
 * Never authoritative — the readiness gate remains the send-decision RPC.
 */
import { supabase } from "@/integrations/supabase/client";

export interface EventTestContext {
  mappingActive: boolean;
  templateCode: string | null;
  templateName: string | null;
  templateVersion: string | null;
  templateVersionStatus: string | null;
  senderFromEmail: string | null;
  senderDisplayName: string | null;
  senderEnabled: boolean | null;
}

const db: any = supabase;

export async function fetchEventTestContext(
  moduleCode: string,
  eventCode: string,
  channel: string = "email",
): Promise<EventTestContext | null> {
  if (!moduleCode || !eventCode) return null;

  const { data: mapping } = await db
    .from("communication_hub_event_template_map")
    .select("template_id, template_code, active, sender_profile_id")
    .eq("module_code", moduleCode)
    .eq("event_code", eventCode)
    .eq("channel", channel)
    .maybeSingle();

  if (!mapping) {
    return {
      mappingActive: false,
      templateCode: null,
      templateName: null,
      templateVersion: null,
      templateVersionStatus: null,
      senderFromEmail: null,
      senderDisplayName: null,
      senderEnabled: null,
    };
  }

  let templateName: string | null = null;
  let templateVersion: string | null = null;
  let templateVersionStatus: string | null = null;

  if (mapping.template_id || mapping.template_code) {
    const q = db
      .from("core_template")
      .select("id, code, name, active_version_id, is_active");
    const { data: tpl } = mapping.template_id
      ? await q.eq("id", mapping.template_id).maybeSingle()
      : await q.eq("code", mapping.template_code).maybeSingle();
    if (tpl) {
      templateName = tpl.name ?? tpl.code ?? null;
      if (tpl.active_version_id) {
        const { data: ver } = await db
          .from("core_template_version")
          .select("version_no, status")
          .eq("id", tpl.active_version_id)
          .maybeSingle();
        if (ver) {
          templateVersion =
            ver.version_no != null ? `v${ver.version_no}` : null;
          templateVersionStatus = ver.status ?? null;
        }
      }
    }
  }

  let senderFromEmail: string | null = null;
  let senderDisplayName: string | null = null;
  let senderEnabled: boolean | null = null;

  if (mapping.sender_profile_id) {
    const { data: sp } = await db
      .from("communication_hub_sender_profile")
      .select("from_email, display_name, is_enabled")
      .eq("id", mapping.sender_profile_id)
      .maybeSingle();
    if (sp) {
      senderFromEmail = sp.from_email ?? null;
      senderDisplayName = sp.display_name ?? null;
      senderEnabled = sp.is_enabled ?? null;
    }
  }

  return {
    mappingActive: Boolean(mapping.active),
    templateCode: mapping.template_code ?? null,
    templateName,
    templateVersion,
    templateVersionStatus,
    senderFromEmail,
    senderDisplayName,
    senderEnabled,
  };
}

export function formatSenderForDisplay(ctx: EventTestContext | null): string | null {
  if (!ctx || !ctx.senderFromEmail) return null;
  return ctx.senderDisplayName
    ? `${ctx.senderDisplayName} <${ctx.senderFromEmail}>`
    : ctx.senderFromEmail;
}

export function formatTemplateForDisplay(ctx: EventTestContext | null): string | null {
  if (!ctx || !ctx.templateName) return null;
  return ctx.templateCode
    ? `${ctx.templateName} (${ctx.templateCode})`
    : ctx.templateName;
}

export function formatTemplateVersionForDisplay(ctx: EventTestContext | null): string | null {
  if (!ctx || !ctx.templateVersion) return null;
  return ctx.templateVersionStatus
    ? `${ctx.templateVersion} · ${ctx.templateVersionStatus}`
    : ctx.templateVersion;
}
