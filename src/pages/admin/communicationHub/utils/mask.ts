/**
 * Communication Hub — sensitive-value masking helpers for the read-only
 * admin console. Keeps recipient PII partially hidden in list views and
 * scrubs provider secrets from delivery-attempt payloads.
 */

export function maskEmail(email: string | null | undefined): string {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}${"*".repeat(Math.max(1, local.length - head.length))}@${domain}`;
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return "*".repeat(digits.length);
  return `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}

const SECRET_KEYS = new Set([
  "api_key",
  "apikey",
  "authorization",
  "auth",
  "password",
  "smtp_password",
  "smtp_pass",
  "secret",
  "token",
  "access_token",
  "refresh_token",
  "bearer",
  "cookie",
  "set-cookie",
  "headers",
  "config",
  "provider_config",
  "raw_body",
]);

/**
 * Recursively redacts any obviously sensitive fields from an untyped payload
 * so it can be displayed in the admin console without exposing secrets.
 * Never mutates the input.
 */
export function sanitizeProviderResponse(input: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (input == null) return input;
  if (Array.isArray(input)) return input.map((v) => sanitizeProviderResponse(v, depth + 1));
  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (SECRET_KEYS.has(k.toLowerCase())) {
        out[k] = "[redacted]";
      } else {
        out[k] = sanitizeProviderResponse(v, depth + 1);
      }
    }
    return out;
  }
  if (typeof input === "string" && input.length > 500) return `${input.slice(0, 500)}…[truncated]`;
  return input;
}
