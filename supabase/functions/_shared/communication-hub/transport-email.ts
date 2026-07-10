/**
 * Communication Hub — EMAIL transport helper (Phase 1C-B3-A).
 *
 * Wraps the same Resend / SMTP delivery logic used by `send-email-campaign`
 * behind a single normalized API so the future comm-hub-dispatch live adapter
 * (Phase 1C-B3-B) has ONE code path instead of duplicating provider handling.
 *
 * IMPORTANT — this phase does NOT wire this helper into comm-hub-dispatch.
 * Importing this file has no side effects. Calling `sendEmailViaProvider`
 * performs a real network send, so it must remain gated behind
 * COMMUNICATION_HUB_EMAIL_LIVE + test_mode=false checks in the dispatcher.
 *
 * Guardrails:
 *   - Do NOT log provider config, api_key, smtp_password, or full headers.
 *   - Do NOT hardcode SSB sender addresses — use provider.fromEmail.
 *   - Do NOT call this from any frontend/browser code.
 *   - Do NOT call this from comm-hub-dispatch until Phase 1C-B3-B.
 */

// deno-lint-ignore-file no-explicit-any

import type { CommHubEmailProvider } from "./provider-lookup.ts";

const RESEND_API = "https://api.resend.com/emails";

export interface CommHubEmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Override sender name (falls back to provider.fromName). */
  fromName?: string;
  /** Override sender email (falls back to provider.fromEmail). */
  fromEmail?: string;
  /** Optional Reply-To address (EPIC CH-S1). */
  replyTo?: string;
  /** Optional Resend attachments — pass-through, unused for SMTP. */
  attachments?: Array<{ filename: string; content: string; contentType?: string }>;
}

/**
 * Normalized transport response. `providerResponseSafe` MUST NOT contain
 * request headers, api_key, or provider config — only sanitized status/body.
 */
export interface CommHubTransportResult {
  ok: boolean;
  providerCode: "resend" | "smtp";
  providerMessageId: string | null;
  statusCode: number | null;
  rawStatus: string;
  retryable: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  providerResponseSafe: Record<string, unknown> | null;
}

function classifyHttpRetryable(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function classifyErrorMessage(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("timeout") ||
    m.includes("network") ||
    m.includes("econnreset") ||
    m.includes("etimedout") ||
    m.includes("fetch failed")
  );
}

async function sendViaResend(
  apiKey: string,
  payload: CommHubEmailPayload,
  fromName: string,
  fromEmail: string,
): Promise<CommHubTransportResult> {
  const body: Record<string, unknown> = {
    from: `${fromName} <${fromEmail}>`,
    to: [payload.to],
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  };
  if (payload.replyTo) body.reply_to = payload.replyTo;
  if (payload.attachments?.length) {
    body.attachments = payload.attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      content_type: a.contentType || "application/octet-stream",
    }));
  }

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let parsed: any = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { /* keep raw */ }

    if (res.ok) {
      return {
        ok: true,
        providerCode: "resend",
        providerMessageId: parsed?.id ?? null,
        statusCode: res.status,
        rawStatus: "sent",
        retryable: false,
        errorCode: null,
        errorMessage: null,
        providerResponseSafe: { id: parsed?.id ?? null },
      };
    }

    const errMsg = parsed?.message || parsed?.error || `HTTP ${res.status}`;
    return {
      ok: false,
      providerCode: "resend",
      providerMessageId: null,
      statusCode: res.status,
      rawStatus: "failed",
      retryable: classifyHttpRetryable(res.status),
      errorCode: parsed?.name || `http_${res.status}`,
      errorMessage: String(errMsg).slice(0, 500),
      providerResponseSafe: {
        status: res.status,
        name: parsed?.name ?? null,
      },
    };
  } catch (err: any) {
    const msg = err?.message || String(err);
    return {
      ok: false,
      providerCode: "resend",
      providerMessageId: null,
      statusCode: null,
      rawStatus: "failed",
      retryable: classifyErrorMessage(msg),
      errorCode: "network_error",
      errorMessage: msg.slice(0, 500),
      providerResponseSafe: null,
    };
  }
}

async function sendViaSmtp(
  cfg: Record<string, any>,
  payload: CommHubEmailPayload,
  fromName: string,
  fromEmail: string,
): Promise<CommHubTransportResult> {
  try {
    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
    const client = new SMTPClient({
      connection: {
        hostname: cfg.smtp_host,
        port: Number(cfg.smtp_port) || 587,
        tls: !!cfg.smtp_secure,
        auth: { username: cfg.smtp_user, password: cfg.smtp_password },
      },
    });
    await client.send({
      from: `${fromName} <${fromEmail}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
    await client.close();
    return {
      ok: true,
      providerCode: "smtp",
      providerMessageId: `smtp-${Date.now()}`,
      statusCode: 250,
      rawStatus: "sent",
      retryable: false,
      errorCode: null,
      errorMessage: null,
      providerResponseSafe: { smtp_host: cfg.smtp_host },
    };
  } catch (err: any) {
    const msg = err?.message || String(err);
    // SMTP 4xx transient (greylist/rate-limit) treated as retryable via message
    return {
      ok: false,
      providerCode: "smtp",
      providerMessageId: null,
      statusCode: null,
      rawStatus: "failed",
      retryable: classifyErrorMessage(msg) || /\b4\d\d\b/.test(msg),
      errorCode: "smtp_error",
      errorMessage: msg.slice(0, 500),
      providerResponseSafe: { smtp_host: cfg.smtp_host },
    };
  }
}

/**
 * Send one email through the resolved provider.
 * Only Phase 1C-B3-B (comm-hub-dispatch live adapter) may call this,
 * and only when COMMUNICATION_HUB_EMAIL_LIVE=true AND the message is
 * NOT test_mode. All other callers must treat the message as dry-run.
 */
export async function sendEmailViaProvider(
  provider: CommHubEmailProvider,
  payload: CommHubEmailPayload,
  opts: { fallbackResendKey?: string } = {},
): Promise<CommHubTransportResult> {
  const fromName = payload.fromName || provider.fromName;
  const fromEmail = payload.fromEmail || provider.fromEmail;

  if (provider.type === "smtp") {
    if (!provider.config?.smtp_host || !provider.config?.smtp_user) {
      return {
        ok: false,
        providerCode: "smtp",
        providerMessageId: null,
        statusCode: null,
        rawStatus: "failed",
        retryable: false,
        errorCode: "smtp_config_missing",
        errorMessage: "SMTP provider config is incomplete",
        providerResponseSafe: null,
      };
    }
    return sendViaSmtp(provider.config, payload, fromName, fromEmail);
  }

  // Resend
  const apiKey = provider.config?.api_key || opts.fallbackResendKey;
  if (!apiKey) {
    return {
      ok: false,
      providerCode: "resend",
      providerMessageId: null,
      statusCode: null,
      rawStatus: "failed",
      retryable: false,
      errorCode: "resend_key_missing",
      errorMessage: "Resend API key not configured on active provider",
      providerResponseSafe: null,
    };
  }
  return sendViaResend(apiKey, payload, fromName, fromEmail);
}
