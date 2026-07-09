/**
 * Communication Hub — Provider Lookup helper (Phase 1C-B3-A).
 *
 * Reuses `notification_providers` as the single source of truth for channel
 * providers (same table read by send-email-campaign). This module ONLY reads;
 * it never mutates the table, never creates a parallel provider registry, and
 * never exposes provider secrets to callers that don't already have DB access.
 *
 * Not wired into comm-hub-dispatch yet — Phase 1C-B3-B will call this.
 *
 * Usage (future dispatcher):
 *   const p = await lookupActiveEmailProvider(admin);
 *   if (!p.ok) return handleError(p);
 *   await sendEmailViaProvider(p.provider, { to, subject, html, ... });
 *
 * Guardrails:
 *   - Do NOT log `provider.config` — it can contain api_key / smtp_password.
 *   - Do NOT return raw config from any user-facing edge function.
 *   - Do NOT alter schema of notification_providers.
 *   - Module/department override lookup is documented but NOT implemented in
 *     this phase (see `resolveEffectiveSettingsBundle` on the frontend).
 */

// deno-lint-ignore-file no-explicit-any

export type CommHubProviderType = "resend" | "smtp";

export interface CommHubEmailProvider {
  providerId: string;
  type: CommHubProviderType;
  /** Raw provider config — SECRET. Never log, never return to frontend. */
  config: Record<string, any>;
  fromName: string;
  fromEmail: string;
}

export type ProviderLookupResult =
  | { ok: true; provider: CommHubEmailProvider }
  | { ok: false; errorCode: "NO_ACTIVE_PROVIDER" | "DB_ERROR"; errorMessage: string };

/**
 * Redacted summary safe for logs / edge-function responses.
 * Never include api_key, smtp_password, or full config here.
 */
export function redactProviderForLog(p: CommHubEmailProvider) {
  return {
    providerId: p.providerId,
    type: p.type,
    fromEmailDomain: p.fromEmail.split("@")[1] ?? null,
    hasApiKey: !!p.config?.api_key,
    hasSmtpPassword: !!p.config?.smtp_password,
  };
}

/**
 * Look up the active default email provider from `notification_providers`.
 *
 * Matches the query used by `send-email-campaign` so both paths pick the same
 * provider row and can be reconciled during cutover:
 *   channel='email' AND is_default=true AND is_active=true.
 *
 * @param supabase service-role client (RLS must be bypassed to read config).
 * @param opts.providerId when supplied, load that specific provider regardless
 *        of default/active flag (used for admin test sends). Do NOT expose this
 *        parameter to frontend callers.
 */
export async function lookupActiveEmailProvider(
  supabase: any,
  opts: { providerId?: string } = {},
): Promise<ProviderLookupResult> {
  let query = supabase
    .from("notification_providers")
    .select("id, email_provider_type, config, is_default, is_active")
    .eq("channel", "email");

  if (opts.providerId) {
    query = query.eq("id", opts.providerId);
  } else {
    query = query.eq("is_default", true).eq("is_active", true);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    return { ok: false, errorCode: "DB_ERROR", errorMessage: error.message };
  }
  if (!data) {
    return {
      ok: false,
      errorCode: "NO_ACTIVE_PROVIDER",
      errorMessage: "No active default email provider configured",
    };
  }

  const cfg = (data.config ?? {}) as Record<string, any>;
  const type: CommHubProviderType =
    data.email_provider_type === "smtp" ? "smtp" : "resend";

  return {
    ok: true,
    provider: {
      providerId: data.id,
      type,
      config: cfg,
      fromName: cfg.from_name || "SSBM Notifications",
      fromEmail: cfg.from_email || "noreply@notifications.ssbm.gov.kn",
    },
  };
}

/**
 * PLANNED — Phase 1C-B3-B / 1C-B3-C.
 *
 * Module/department-scoped provider override lookup should be added HERE,
 * driven by the existing settings resolver on the frontend
 * (`resolveEffectiveSettingsBundle`). This keeps the "which provider" decision
 * in one place and avoids a parallel override table.
 *
 * Expected shape:
 *   lookupProviderForContext(supabase, { moduleCode, departmentCode, channel })
 *     → falls back to `lookupActiveEmailProvider` when no override is set.
 */
