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
  tokensUsed: Record<string, unknown>;
  org: {
    name: string | null;
    primaryLogoUrl: string | null;
    email: string | null;
  };
}

/**
 * Resolve a notification template, expanding {{text_block.*}} markers
 * via TextBlockResolver and {{asset.*}} markers via the asset map
 * surfaced by resolveCommunication.
 */
export async function resolveNotification(
  req: NotificationRequest,
): Promise<ResolvedNotification> {
  // 1. Pull org / dept / asset context through the canonical resolver.
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

  // 2. Load the notification template row.
  const { data: tmpl, error } = await supabase
    .from("notification_templates")
    .select("id, code, subject, body, channel")
    .eq("code", req.templateCode)
    .maybeSingle();

  if (error) throw error;
  if (!tmpl) {
    throw new Error(
      `Notification template not found: ${req.templateCode}`,
    );
  }

  // 3. Expand {{text_block.CODE}} markers from canonical text blocks.
  let body = await expandTextBlockTokens(
    String(tmpl.body ?? ""),
    req.channel === "EMAIL" || req.channel === "PORTAL" ? "html" : "text",
  );

  // 4. Replace {{asset.CODE}} markers with resolved asset URLs.
  const assets = comm.assets ?? {};
  body = body.replace(/\{\{\s*asset\.([A-Z0-9_]+)\s*\}\}/g, (_m, code) => {
    const a = (assets as Record<string, { url?: string | null }>)[code];
    return a?.url ?? "";
  });

  // 5. Replace simple {{org.*}} / {{dept.*}} / caller tokens.
  const org = comm.context?.organization;
  const dept = comm.context?.department;
  const flat: Record<string, unknown> = {
    "org.name": org?.name ?? "",
    "org.email": org?.email ?? "",
    "org.logo": (assets as any)?.PRIMARY_LOGO?.url ?? "",
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

  return {
    templateId: tmpl.id,
    templateCode: tmpl.code,
    channel: req.channel,
    subject,
    body,
    tokensUsed: flat,
    org: {
      name: org?.name ?? null,
      primaryLogoUrl: (assets as any)?.PRIMARY_LOGO?.url ?? null,
      email: org?.email ?? null,
    },
  };
}
