/**
 * Phase 10 — Notification Resolver
 *
 * Single entry point for resolving notification templates (Email / SMS /
 * In-App / Push) with {{text_block.*}} and {{asset.*}} tokens expanded
 * through the canonical resolvers. Modules MUST NOT read
 * `notification_templates` directly — they call `resolveNotification()`.
 */

import { supabase } from "@/integrations/supabase/client";
import { resolveCommunication } from "./CommunicationResolver";
import { expandTextBlockTokens } from "./textBlockTokenizer";
import type { DeliveryChannel } from "./types";
import {
  resolveEmailBranding,
  composeEmailFromLayout,
  composeChannelBodyFromLayout,
  loadBrandingContent,
  htmlToPlainText,
  type ResolvedEmailBranding,
} from "./resolvers/emailBrandingResolver";
import { renderBlockById } from "./layoutBlockRenderer";

export type NotificationChannel = Extract<
  DeliveryChannel,
  "EMAIL" | "SMS" | "PORTAL" | "MOBILE_PUSH"
> | "IN_APP";

export interface NotificationRequest {
  moduleCode: string;
  templateCode: string;
  channel: NotificationChannel;
  departmentCode?: string | null;
  locationId?: string | null;
  tokens?: Record<string, unknown>;
  actorUserCode?: string | null;
}

export interface ResolvedNotification {
  templateId: string;
  templateCode: string;
  channel: NotificationChannel;
  subject: string | null;
  body: string;
  /** Plain-text fallback (auto-derived for EMAIL). */
  bodyPlainText?: string;
  /** Resolved email branding — only populated for EMAIL channel. */
  emailBranding?: ResolvedEmailBranding;
  tokensUsed: Record<string, unknown>;
  org: {
    name: string | null;
    primaryLogoUrl: string | null;
    email: string | null;
  };
}

export async function resolveNotification(
  req: NotificationRequest,
): Promise<ResolvedNotification> {
  // 1. Canonical org / dept / asset context.
  const comm = await resolveCommunication({
    moduleCode: req.moduleCode,
    departmentCode: req.departmentCode ?? null,
    locationId: req.locationId ?? null,
    channels: [
      req.channel === "IN_APP" ? "PORTAL" : (req.channel as DeliveryChannel),
    ],
    tokens: req.tokens ?? {},
    actorUserCode: req.actorUserCode ?? null,
  });

  // 2. Notification template row — cast to any to keep inference shallow.
  const client = supabase as any;
  const { data: tmpl, error } = await client
    .from("notification_templates")
    .select("id, template_code, subject, body, html_body, channel, default_layout_id")
    .eq("template_code", req.templateCode)
    .maybeSingle();

  if (error) throw error;
  if (!tmpl) {
    throw new Error(`Notification template not found: ${req.templateCode}`);
  }

  const useHtml = req.channel === "EMAIL" || req.channel === "PORTAL";
  let body = await expandTextBlockTokens(
    String((useHtml ? tmpl.html_body : tmpl.body) ?? tmpl.body ?? ""),
  );

  // 3. {{asset.CODE}}
  const assets = (comm.assets ?? {}) as Record<
    string,
    { url?: string | null }
  >;
  body = body.replace(/\{\{\s*asset\.([A-Z0-9_]+)\s*\}\}/g, (_m, code) => {
    return assets[code]?.url ?? "";
  });

  // 4. Simple org/dept/caller tokens.
  const org = (comm.context as any)?.organization;
  const dept = (comm.context as any)?.department;
  const flat: Record<string, unknown> = {
    "org.name": org?.name ?? "",
    "org.email": org?.email ?? org?.mainEmail ?? "",
    "org.logo": assets?.PRIMARY_LOGO?.url ?? org?.primaryLogoUrl ?? "",
    "dept.name": dept?.name ?? "",
    "dept.code": dept?.code ?? "",
    ...(req.tokens ?? {}),
  };
  body = body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, key) => {
    const v = flat[key];
    return v == null ? m : String(v);
  });

  const subject = tmpl.subject
    ? String(tmpl.subject).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) =>
        flat[k] == null ? m : String(flat[k]),
      )
    : null;

  // 5. EMAIL channel: compose through the enterprise email branding pipeline
  //    (Base Layout + Branding + Business Content). This is the only path
  //    that should ever produce an outgoing email HTML.
  let emailBranding: ResolvedEmailBranding | undefined;
  let bodyPlainText: string | undefined;
  if (req.channel === "EMAIL") {
    emailBranding = await resolveEmailBranding({
      moduleCode: req.moduleCode,
      departmentCode: req.departmentCode ?? null,
      templateId: tmpl.id ?? null,
      overrideLayoutId: tmpl.default_layout_id ?? null,
    });
    const { signatureHtml, footerHtml, disclaimerHtml } =
      await loadBrandingContent(emailBranding);
    body = composeEmailFromLayout({
      layout: emailBranding.layout.value,
      bodyHtml: body,
      signatureHtml,
      footerHtml,
      disclaimerHtml,
    });
    bodyPlainText = htmlToPlainText(body);
  } else if (tmpl.default_layout_id) {
    // Non-email channels (SMS / WhatsApp / IN_APP / PORTAL / MOBILE_PUSH) —
    // wrap the body in the assigned base layout using body/signature/footer/
    // disclaimer slots. No HTML shell.
    const { data: layoutRow } = await client
      .from("core_template_layout")
      .select("body_placeholder_html, signature_slot, footer_slot, disclaimer_slot")
      .eq("id", tmpl.default_layout_id)
      .maybeSingle();
    if (layoutRow) {
      body = composeChannelBodyFromLayout({
        layout: layoutRow as any,
        bodyContent: body,
      });
    }
  }

  return {
    templateId: tmpl.id,
    templateCode: tmpl.template_code,
    channel: req.channel,
    subject,
    body,
    bodyPlainText,
    emailBranding,
    tokensUsed: flat,
    org: {
      name: org?.name ?? null,
      primaryLogoUrl:
        assets?.PRIMARY_LOGO?.url ?? org?.primaryLogoUrl ?? null,
      email: org?.email ?? org?.mainEmail ?? null,
    },
  };
}
